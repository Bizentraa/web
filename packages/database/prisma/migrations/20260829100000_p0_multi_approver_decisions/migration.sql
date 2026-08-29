-- CC-P0-007: retain individual approver decisions for ALL_APPROVERS and MINIMUM_APPROVERS.
CREATE TABLE "approval_decisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "businessId" UUID NOT NULL,
    "approvalRequestId" UUID NOT NULL,
    "decidedByMembershipId" UUID NOT NULL,
    "decision" "ApprovalRequestStatus" NOT NULL,
    "note" VARCHAR(500),
    "decidedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_decisions_pkey" PRIMARY KEY ("id")
);

INSERT INTO "approval_decisions" (
    "businessId",
    "approvalRequestId",
    "decidedByMembershipId",
    "decision",
    "note",
    "decidedAt"
)
SELECT
    "businessId",
    "id",
    "decidedByMembershipId",
    "status",
    "decisionNote",
    COALESCE("decidedAt", "updatedAt")
FROM "approval_requests"
WHERE "decidedByMembershipId" IS NOT NULL
  AND "status" IN ('APPROVED', 'REJECTED')
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX "approval_decisions_businessId_approvalRequestId_decidedByMembershipId_key"
    ON "approval_decisions"("businessId", "approvalRequestId", "decidedByMembershipId");
CREATE INDEX "approval_decisions_businessId_approvalRequestId_decision_idx"
    ON "approval_decisions"("businessId", "approvalRequestId", "decision");

ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_approvalRequestId_businessId_fkey"
    FOREIGN KEY ("approvalRequestId", "businessId") REFERENCES "approval_requests"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_decidedByMembershipId_businessId_fkey"
    FOREIGN KEY ("decidedByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "approval_decisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "approval_decisions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "approval_decisions"
    USING ("businessId" = NULLIF(current_setting('app.current_business_id', true), '')::uuid)
    WITH CHECK ("businessId" = NULLIF(current_setting('app.current_business_id', true), '')::uuid);
