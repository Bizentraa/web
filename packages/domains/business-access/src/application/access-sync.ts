import type { DatabaseTransaction } from "@bizentra/database";

import { PLATFORM_PERMISSIONS, ROLE_TEMPLATES } from "../domain/permissions.js";

/**
 * Keeps existing Businesses aligned when a new implementation phase adds permissions.
 *
 * This is additive. It creates missing permission catalogue rows, creates missing default role
 * templates, and grants missing template permissions to matching default roles. It does not remove
 * permissions from custom Roles.
 */
export async function ensureAccessCatalogSync(
  transaction: DatabaseTransaction,
  businessId: string,
): Promise<void> {
  if (await accessCatalogIsCurrent(transaction, businessId)) return;

  const permissions = await Promise.all(
    PLATFORM_PERMISSIONS.map((permission) =>
      transaction.permission.upsert({
        where: { code: permission.code },
        update: { name: permission.name },
        create: { code: permission.code, name: permission.name },
        select: { id: true, code: true },
      }),
    ),
  );
  const permissionIdByCode = new Map(
    permissions.map((permission) => [permission.code, permission.id]),
  );

  await grantRolePermissions(
    transaction,
    businessId,
    { code: "OWNER", isSystem: true },
    PLATFORM_PERMISSIONS.map((permission) => permission.code),
    permissionIdByCode,
  );

  for (const template of ROLE_TEMPLATES) {
    await transaction.role.upsert({
      where: { businessId_code: { businessId, code: template.code } },
      update: {
        name: template.name,
        description: template.description,
      },
      create: {
        businessId,
        code: template.code,
        name: template.name,
        description: template.description,
        isSystem: false,
      },
    });

    await grantRolePermissions(
      transaction,
      businessId,
      { code: template.code, isSystem: false },
      template.permissions,
      permissionIdByCode,
    );
  }
}

async function accessCatalogIsCurrent(
  transaction: DatabaseTransaction,
  businessId: string,
): Promise<boolean> {
  const requiredRolePermissionCount =
    PLATFORM_PERMISSIONS.length +
    ROLE_TEMPLATES.reduce((total, template) => total + template.permissions.length, 0);

  const [permissionCount, roleCount, rolePermissionCount] = await Promise.all([
    transaction.permission.count({
      where: { code: { in: PLATFORM_PERMISSIONS.map((permission) => permission.code) } },
    }),
    transaction.role.count({
      where: {
        businessId,
        OR: [
          { code: "OWNER", isSystem: true },
          { code: { in: ROLE_TEMPLATES.map((template) => template.code) }, isSystem: false },
        ],
      },
    }),
    transaction.rolePermission.count({
      where: {
        businessId,
        role: {
          OR: [
            { code: "OWNER", isSystem: true },
            { code: { in: ROLE_TEMPLATES.map((template) => template.code) }, isSystem: false },
          ],
        },
      },
    }),
  ]);

  return (
    permissionCount === PLATFORM_PERMISSIONS.length &&
    roleCount === ROLE_TEMPLATES.length + 1 &&
    rolePermissionCount >= requiredRolePermissionCount
  );
}

async function grantRolePermissions(
  transaction: DatabaseTransaction,
  businessId: string,
  roleFilter: { code: string; isSystem: boolean },
  permissionCodes: readonly string[],
  permissionIdByCode: Map<string, string>,
): Promise<void> {
  const role = await transaction.role.findFirst({
    where: { businessId, code: roleFilter.code, isSystem: roleFilter.isSystem },
    select: { id: true },
  });
  if (!role) return;

  const rows = permissionCodes
    .map((code) => permissionIdByCode.get(code))
    .filter((permissionId): permissionId is string => Boolean(permissionId))
    .map((permissionId) => ({ businessId, roleId: role.id, permissionId }));

  if (rows.length) {
    await transaction.rolePermission.createMany({ data: rows, skipDuplicates: true });
  }
}
