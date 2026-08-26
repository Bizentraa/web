import type { DatabaseTransaction } from "@bizentra/database";

import type { MembershipContext } from "./access.js";
import { BusinessAccessError } from "./errors.js";
import { toNumber } from "./money.js";

export interface ApprovalCheck {
  businessId: string;
  actionCode: string;
  amount?: number;
  approvalRequestId?: string | undefined;
  membership: MembershipContext;
  entityType: string;
  entityId?: string | undefined;
}

export interface ApprovalOutcome {
  required: boolean;
  approvalRequestId: string | null;
  policyId: string | null;
}

/**
 * CC-P0-007: enforces the Business approval rule for one sensitive action.
 *
 * The rule is checked at the moment the action is posted, not when the screen is opened, so a
 * cashier cannot bypass it by keeping a stale page. When a rule applies, the caller must pass an
 * approval request that is already `APPROVED` for the same action and at least the same amount.
 */
export async function enforceApproval(
  transaction: DatabaseTransaction,
  check: ApprovalCheck,
): Promise<ApprovalOutcome> {
  const policy = await transaction.approvalPolicy.findFirst({
    where: { businessId: check.businessId, actionCode: check.actionCode, enabled: true },
  });

  if (!policy) return { required: false, approvalRequestId: null, policyId: null };

  const threshold = policy.thresholdAmount === null ? null : toNumber(policy.thresholdAmount);
  const amount = check.amount ?? 0;
  if (threshold !== null && amount < threshold) {
    return { required: false, approvalRequestId: null, policyId: policy.id };
  }

  if (!check.approvalRequestId) {
    throw new BusinessAccessError(
      "CONFLICT",
      `${policy.name} needs manager approval before it can be posted. Request approval, then try again.`,
    );
  }

  const request = await transaction.approvalRequest.findFirst({
    where: {
      id: check.approvalRequestId,
      businessId: check.businessId,
      actionCode: check.actionCode,
    },
  });

  if (!request) {
    throw new BusinessAccessError("NOT_FOUND", "The approval request was not found.");
  }
  if (request.status !== "APPROVED") {
    throw new BusinessAccessError(
      "CONFLICT",
      `The approval request is ${request.status.toLowerCase()}. Only an approved request can release this action.`,
    );
  }
  if (request.decidedByMembershipId === check.membership.membershipId) {
    throw new BusinessAccessError(
      "CONFLICT",
      "The approver must be a different user than the person performing the action.",
    );
  }
  const approvedAmount = request.amount === null ? null : toNumber(request.amount);
  if (approvedAmount !== null && amount > approvedAmount + 0.0001) {
    throw new BusinessAccessError(
      "CONFLICT",
      "The approved amount is lower than the amount being posted. Request approval for the new amount.",
    );
  }

  return { required: true, approvalRequestId: request.id, policyId: policy.id };
}
