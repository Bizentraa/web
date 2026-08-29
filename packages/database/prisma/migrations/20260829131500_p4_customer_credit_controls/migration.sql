-- CC-P4-002: explicit customer credit controls.
ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "creditLimit" DECIMAL(19,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "creditTermsDays" INTEGER,
  ADD COLUMN IF NOT EXISTS "creditHold" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "customers_businessId_creditHold_idx"
  ON "customers"("businessId", "creditHold");
