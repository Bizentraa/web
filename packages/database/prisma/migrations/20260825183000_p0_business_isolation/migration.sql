-- CC-P0-002: every Business-scoped table is protected by PostgreSQL row-level security.
-- The API sets app.current_business_id locally inside each scoped transaction.

ALTER TABLE "businesses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "businesses" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "businesses"
  USING ("id"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("id"::text = current_setting('app.current_business_id', true));

ALTER TABLE "branches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "branches" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "branches"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "locations" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "locations"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "business_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_memberships" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "business_memberships"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "branch_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "branch_assignments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "branch_assignments"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "roles"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role_permissions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "role_permissions"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "membership_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "membership_roles" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "membership_roles"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "approval_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "approval_policies" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "approval_policies"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "business_features" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_features" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "business_features"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "audit_events"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "document_sequences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_sequences" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "document_sequences"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "outbox_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outbox_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "outbox_events"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

-- CC-P0-009: normal data operations cannot rewrite or delete audit evidence.
CREATE OR REPLACE FUNCTION prevent_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are append-only';
END;
$$;

CREATE TRIGGER audit_events_append_only
BEFORE UPDATE OR DELETE ON "audit_events"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_event_mutation();

