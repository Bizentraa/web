import type { DatabaseTransaction } from "@bizentra/database";

import { BusinessAccessError } from "./errors.js";

/**
 * CC-P0-006: the resolved access context for one request.
 *
 * Services load it once per transaction so a screen can ask for several permissions
 * without repeating the membership query, and so denied actions can explain what is missing.
 */
export interface MembershipContext {
  membershipId: string;
  userId: string;
  displayName: string;
  permissions: ReadonlySet<string>;
  branchIds: ReadonlySet<string>;
  has: (permissionCode: string) => boolean;
  require: (permissionCode: string) => void;
  requireAny: (permissionCodes: readonly string[]) => void;
}

export async function loadMembershipContext(
  transaction: DatabaseTransaction,
  businessId: string,
  userId: string,
): Promise<MembershipContext> {
  const membership = await transaction.businessMembership.findUnique({
    where: { businessId_userId: { businessId, userId } },
    include: {
      user: { select: { displayName: true } },
      branchAssignments: { select: { branchId: true } },
      roleAssignments: {
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
        },
      },
    },
  });

  if (!membership || membership.status !== "ACTIVE") {
    throw new BusinessAccessError("FORBIDDEN", "The user is not active in this Business.");
  }

  const permissions = new Set<string>();
  for (const assignment of membership.roleAssignments) {
    if (assignment.role.status !== "ACTIVE") continue;
    for (const rolePermission of assignment.role.permissions) {
      permissions.add(rolePermission.permission.code);
    }
  }

  const branchIds = new Set(membership.branchAssignments.map((branch) => branch.branchId));

  const has = (permissionCode: string) => permissions.has(permissionCode);
  const require = (permissionCode: string) => {
    if (!permissions.has(permissionCode)) {
      throw new BusinessAccessError(
        "FORBIDDEN",
        `This action needs the ${permissionCode} permission. Ask a Business Administrator to add it to your Role.`,
      );
    }
  };
  const requireAny = (permissionCodes: readonly string[]) => {
    if (!permissionCodes.some((code) => permissions.has(code))) {
      throw new BusinessAccessError(
        "FORBIDDEN",
        `This action needs one of these permissions: ${permissionCodes.join(", ")}.`,
      );
    }
  };

  return {
    membershipId: membership.id,
    userId,
    displayName: membership.user.displayName,
    permissions,
    branchIds,
    has,
    require,
    requireAny,
  };
}

/** Convenience wrapper for the common "load context and require one permission" case. */
export async function requirePermission(
  transaction: DatabaseTransaction,
  businessId: string,
  userId: string,
  permissionCode: string,
): Promise<MembershipContext> {
  const context = await loadMembershipContext(transaction, businessId, userId);
  context.require(permissionCode);
  return context;
}
