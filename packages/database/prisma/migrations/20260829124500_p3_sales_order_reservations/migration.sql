-- CC-P3-003 and CC-P3-012: fulfillment reservations need the source stock Location.
ALTER TABLE "fulfillment_orders" ADD COLUMN IF NOT EXISTS "locationId" UUID;

CREATE INDEX IF NOT EXISTS "fulfillment_orders_businessId_locationId_status_idx"
  ON "fulfillment_orders"("businessId", "locationId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fulfillment_orders_locationId_businessId_fkey'
  ) THEN
    ALTER TABLE "fulfillment_orders"
      ADD CONSTRAINT "fulfillment_orders_locationId_businessId_fkey"
      FOREIGN KEY ("locationId", "businessId")
      REFERENCES "locations"("id", "businessId")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END $$;
