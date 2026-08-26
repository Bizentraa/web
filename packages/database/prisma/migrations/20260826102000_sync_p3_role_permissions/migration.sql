-- Keep existing Businesses aligned with the P3 implementation permissions.
-- This is additive: it creates missing permission rows, grants missing permissions to
-- owner/template roles, and creates the new P3 role templates where they do not exist.

INSERT INTO "permissions" ("id", "code", "name", "description", "createdAt")
VALUES
  (gen_random_uuid(), 'INVENTORY_VIEW', 'View inventory', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'INVENTORY_MOVE', 'Receive, transfer and reserve stock', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'INVENTORY_ADJUST', 'Adjust stock', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'REORDER_MANAGE', 'Manage reorder levels', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'PURCHASE_VIEW', 'View purchasing', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'PURCHASE_MANAGE', 'Create purchase requests and orders', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'PURCHASE_RECEIVE', 'Receive purchase orders', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'FULFILLMENT_VIEW', 'View fulfillment', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'FULFILLMENT_MANAGE', 'Pick, pack and dispatch orders', NULL, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name";

INSERT INTO "roles" ("id", "businessId", "code", "name", "description", "isSystem", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid(), b."id", template."code", template."name", template."description", false, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "businesses" b
CROSS JOIN (
  VALUES
    ('INVENTORY_USER', 'Inventory User', 'Receives, transfers, counts and adjusts stock.'),
    ('PURCHASING_USER', 'Purchasing User', 'Creates purchase requests, orders and goods receipts.')
) AS template("code", "name", "description")
ON CONFLICT ("businessId", "code") DO NOTHING;

-- Existing owner roles keep full access when phases add new permissions.
INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r."businessId", r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."isSystem" = true
  AND r."code" = 'OWNER'
  AND p."code" IN (
    'INVENTORY_VIEW',
    'INVENTORY_MOVE',
    'INVENTORY_ADJUST',
    'REORDER_MANAGE',
    'PURCHASE_VIEW',
    'PURCHASE_MANAGE',
    'PURCHASE_RECEIVE',
    'FULFILLMENT_VIEW',
    'FULFILLMENT_MANAGE'
  )
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;

-- Existing Business Administrator template roles keep full access to the implemented platform scope.
INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r."businessId", r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."isSystem" = false
  AND r."code" = 'ADMINISTRATOR'
  AND p."code" IN (
    'INVENTORY_VIEW',
    'INVENTORY_MOVE',
    'INVENTORY_ADJUST',
    'REORDER_MANAGE',
    'PURCHASE_VIEW',
    'PURCHASE_MANAGE',
    'PURCHASE_RECEIVE',
    'FULFILLMENT_VIEW',
    'FULFILLMENT_MANAGE'
  )
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r."businessId", r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
JOIN "permissions" p ON p."code" IN (
  'INVENTORY_VIEW',
  'INVENTORY_MOVE',
  'INVENTORY_ADJUST',
  'REORDER_MANAGE',
  'PURCHASE_VIEW',
  'PURCHASE_MANAGE',
  'PURCHASE_RECEIVE',
  'FULFILLMENT_VIEW',
  'FULFILLMENT_MANAGE',
  'PURCHASE_APPROVE'
)
WHERE r."isSystem" = false
  AND r."code" = 'BRANCH_MANAGER'
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r."businessId", r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
JOIN "permissions" p ON p."code" IN (
  'BUSINESS_VIEW',
  'BRANCH_VIEW',
  'LOCATION_VIEW',
  'INVENTORY_VIEW',
  'INVENTORY_MOVE',
  'INVENTORY_ADJUST',
  'REORDER_MANAGE',
  'PURCHASE_VIEW',
  'PURCHASE_RECEIVE',
  'FULFILLMENT_VIEW',
  'FULFILLMENT_MANAGE'
)
WHERE r."isSystem" = false
  AND r."code" = 'INVENTORY_USER'
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r."businessId", r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
JOIN "permissions" p ON p."code" IN (
  'BUSINESS_VIEW',
  'BRANCH_VIEW',
  'LOCATION_VIEW',
  'CATALOG_VIEW',
  'SUPPLIER_VIEW',
  'INVENTORY_VIEW',
  'REORDER_MANAGE',
  'PURCHASE_VIEW',
  'PURCHASE_MANAGE',
  'PURCHASE_RECEIVE'
)
WHERE r."isSystem" = false
  AND r."code" = 'PURCHASING_USER'
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;
