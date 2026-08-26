import type {
  AccessOverview,
  ApprovalOverview,
  AuditEventRow,
  AuditQuery,
  BusinessFoundationCreated,
  BusinessFoundationSummary,
  BusinessThemeSettings,
  CreateApprovalRequestInput,
  CreateBranchInput,
  CreateBusinessFoundationInput,
  CreateLocationInput,
  CreateRoleInput,
  DecideApprovalRequestInput,
  DocumentSequenceRow,
  FeatureRow,
  InviteUserInput,
  NextDocumentNumberInput,
  Paginated,
  PermissionCatalogEntry,
  SetFeatureInput,
  UpdateBranchInput,
  UpdateBusinessInput,
  UpdateLocationInput,
  UpdateMembershipInput,
  UpdateRoleInput,
  UpsertApprovalPolicyInput,
  UpsertDocumentSequenceInput,
  UpdateBusinessThemeInput,
} from "@bizentra/contracts";
import {
  type DatabaseClient,
  type DatabaseTransaction,
  type Prisma,
  withBusinessContext,
} from "@bizentra/database";
import {
  allocateDocumentNumber,
  asJsonObject,
  BusinessAccessError,
  loadMembershipContext,
  pagination,
  publishEvent,
  recordAudit,
  requirePermission,
  toOptionalNumber,
} from "@bizentra/domain-shared";
import { createId } from "@bizentra/ids";

import {
  APPROVABLE_ACTIONS,
  decisionPermissionForAction,
  FEATURE_DEFINITIONS,
  isPlatformPermissionCode,
  P0_PERMISSIONS,
  P1_PERMISSIONS,
  P2_PERMISSIONS,
  PLATFORM_PERMISSIONS,
  ROLE_TEMPLATES,
} from "../domain/permissions.js";

const PERMISSION_CATALOG: PermissionCatalogEntry[] = [
  ...P0_PERMISSIONS.map((permission) => ({ ...permission, phase: "P0" as const })),
  ...P1_PERMISSIONS.map((permission) => ({ ...permission, phase: "P1" as const })),
  ...P2_PERMISSIONS.map((permission) => ({ ...permission, phase: "P2" as const })),
].map((permission) => ({
  code: permission.code,
  name: permission.name,
  area: permission.area,
  phase: permission.phase,
  sensitive: "sensitive" in permission ? Boolean(permission.sensitive) : false,
}));

export class BusinessAccessService {
  constructor(private readonly database: DatabaseClient) {}

  /* ------------------------------------------------------------------ setup */

  async createBusinessFoundation(
    input: CreateBusinessFoundationInput,
  ): Promise<BusinessFoundationCreated> {
    const businessId = createId();
    const branchId = createId();
    const locationId = createId();
    const ownerRoleId = createId();
    const ownerMembershipId = createId();

    return withBusinessContext(this.database, businessId, async (transaction) => {
      await transaction.business.create({
        data: {
          id: businessId,
          name: input.business.name,
          slug: input.business.slug,
          legalName: input.business.legalName ?? null,
          email: input.business.email ?? null,
          phone: input.business.phone ?? null,
          defaultCurrency: input.business.defaultCurrency.toUpperCase(),
          timeZone: input.business.timeZone,
          countryCode: input.business.countryCode.toUpperCase(),
        },
      });

      await transaction.businessTheme.create({ data: { businessId } });

      const owner = await transaction.user.upsert({
        where: { externalSubject: input.owner.externalSubject },
        update: {
          email: input.owner.email,
          displayName: input.owner.displayName,
          status: "ACTIVE",
        },
        create: {
          externalSubject: input.owner.externalSubject,
          email: input.owner.email,
          displayName: input.owner.displayName,
          status: "ACTIVE",
        },
      });

      await transaction.branch.create({
        data: {
          id: branchId,
          businessId,
          code: input.firstBranch.code.toUpperCase(),
          name: input.firstBranch.name,
          email: input.firstBranch.email ?? null,
          phone: input.firstBranch.phone ?? null,
        },
      });

      await transaction.location.create({
        data: {
          id: locationId,
          businessId,
          branchId,
          code: input.firstLocation.code.toUpperCase(),
          name: input.firstLocation.name,
          type: input.firstLocation.type ?? "SHOP_FLOOR",
        },
      });

      await transaction.businessMembership.create({
        data: {
          id: ownerMembershipId,
          businessId,
          userId: owner.id,
          status: "ACTIVE",
          joinedAt: new Date(),
        },
      });

      await transaction.branchAssignment.create({
        data: { businessId, branchId, membershipId: ownerMembershipId },
      });

      const permissions = await this.ensurePermissionCatalog(transaction);

      await transaction.role.create({
        data: {
          id: ownerRoleId,
          businessId,
          code: "OWNER",
          name: "Business Owner",
          description: "Full access to the Business foundation.",
          isSystem: true,
        },
      });

      await transaction.rolePermission.createMany({
        data: permissions.map((permission) => ({
          businessId,
          roleId: ownerRoleId,
          permissionId: permission.id,
        })),
      });

      await transaction.membershipRole.create({
        data: { businessId, membershipId: ownerMembershipId, roleId: ownerRoleId },
      });

      await this.createRoleTemplates(transaction, businessId, permissions);
      await this.ensureFeatureCatalog(transaction, businessId);

      await transaction.documentSequence.createMany({
        data: [
          {
            businessId,
            scopeKey: "BUSINESS",
            documentType: "BRANCH",
            prefix: "BR",
            nextValue: 2,
            padding: 4,
          },
          ...["SALE", "RECEIPT", "RETURN", "SHIFT"].map((documentType) => ({
            businessId,
            branchId,
            scopeKey: `BRANCH:${branchId}`,
            documentType,
            prefix: `${input.firstBranch.code.toUpperCase()}-${documentType === "RECEIPT" ? "RCPT" : documentType}`,
            padding: 6,
          })),
        ],
      });

      await recordAudit(transaction, {
        businessId,
        branchId,
        actorMembershipId: ownerMembershipId,
        action: "CREATE",
        entityType: "BusinessFoundation",
        entityId: businessId,
        after: {
          businessName: input.business.name,
          branchCode: input.firstBranch.code.toUpperCase(),
          locationCode: input.firstLocation.code.toUpperCase(),
        },
      });

      await publishEvent(transaction, {
        businessId,
        eventType: "BusinessFoundationCreated",
        aggregateType: "Business",
        aggregateId: businessId,
        payload: { businessId, branchId, locationId, ownerUserId: owner.id },
      });

      return {
        businessId,
        branchId,
        locationId,
        ownerUserId: owner.id,
        ownerMembershipId,
        ownerRoleId,
      };
    });
  }

  async getBusinessFoundation(
    businessId: string,
    actorUserId: string,
  ): Promise<BusinessFoundationSummary> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await requirePermission(transaction, businessId, actorUserId, "BUSINESS_VIEW");

      const business = await transaction.business.findUnique({
        where: { id: businessId },
        include: {
          branches: {
            orderBy: { code: "asc" },
            include: { locations: { orderBy: { code: "asc" } } },
          },
          features: { where: { enabled: true }, include: { feature: true } },
          _count: { select: { memberships: true, roles: true } },
        },
      });

      if (!business) throw new BusinessAccessError("NOT_FOUND", "Business was not found.");

      const [customRoles, approvalPolicies, priceLists, sellableItems, openShifts, sales] =
        await Promise.all([
          transaction.role.count({ where: { businessId, isSystem: false } }),
          transaction.approvalPolicy.count({ where: { businessId, enabled: true } }),
          transaction.priceList.count({ where: { businessId, isDefault: true } }),
          transaction.item.count({ where: { businessId, sellable: true, status: "ACTIVE" } }),
          transaction.posShift.count({ where: { businessId, status: "OPEN" } }),
          transaction.sale.count({ where: { businessId, status: { not: "DRAFT" } } }),
        ]);

      return {
        business: {
          id: business.id,
          name: business.name,
          legalName: business.legalName,
          slug: business.slug,
          email: business.email,
          phone: business.phone,
          defaultCurrency: business.defaultCurrency,
          timeZone: business.timeZone,
          countryCode: business.countryCode,
          status: business.status,
        },
        branches: business.branches.map((branch) => ({
          id: branch.id,
          code: branch.code,
          name: branch.name,
          email: branch.email,
          phone: branch.phone,
          status: branch.status,
          locations: branch.locations.map((location) => ({
            id: location.id,
            code: location.code,
            name: location.name,
            type: location.type,
            status: location.status,
          })),
        })),
        enabledFeatures: business.features.map((feature) => feature.feature.key),
        memberships: business._count.memberships,
        roles: business._count.roles,
        setup: {
          hasSecondBranch: business.branches.length > 1,
          hasAdditionalUsers: business._count.memberships > 1,
          hasCustomRoles: customRoles > 0,
          hasApprovalPolicies: approvalPolicies > 0,
          hasCatalogDefaults: priceLists > 0,
          hasSellableItems: sellableItems > 0,
          hasOpenShift: openShifts > 0,
          hasConfirmedSale: sales > 0,
        },
      };
    });
  }

  async updateBusiness(
    businessId: string,
    actorUserId: string,
    input: UpdateBusinessInput,
  ): Promise<{ id: string }> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const membership = await requirePermission(
        transaction,
        businessId,
        actorUserId,
        "BUSINESS_UPDATE",
      );
      const before = await transaction.business.findUnique({ where: { id: businessId } });
      if (!before) throw new BusinessAccessError("NOT_FOUND", "Business was not found.");

      const after = await transaction.business.update({
        where: { id: businessId },
        data: {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.legalName === undefined ? {} : { legalName: input.legalName }),
          ...(input.email === undefined ? {} : { email: input.email }),
          ...(input.phone === undefined ? {} : { phone: input.phone }),
          ...(input.defaultCurrency === undefined
            ? {}
            : { defaultCurrency: input.defaultCurrency }),
          ...(input.timeZone === undefined ? {} : { timeZone: input.timeZone }),
          ...(input.countryCode === undefined ? {} : { countryCode: input.countryCode }),
        },
      });

      await recordAudit(transaction, {
        businessId,
        actorMembershipId: membership.membershipId,
        action: "UPDATE",
        entityType: "Business",
        entityId: businessId,
        before: {
          name: before.name,
          defaultCurrency: before.defaultCurrency,
          timeZone: before.timeZone,
          countryCode: before.countryCode,
        },
        after: {
          name: after.name,
          defaultCurrency: after.defaultCurrency,
          timeZone: after.timeZone,
          countryCode: after.countryCode,
        },
      });

      return { id: businessId };
    });
  }

  /* --------------------------------------------------------- branch and site */

  async createBranch(
    businessId: string,
    actorUserId: string,
    input: CreateBranchInput,
  ): Promise<{ branchId: string; locationId?: string }> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const membership = await requirePermission(
        transaction,
        businessId,
        actorUserId,
        "BRANCH_CREATE",
      );
      const branchId = createId();
      const locationId = input.firstLocation ? createId() : undefined;
      const code = input.code.toUpperCase();

      await this.assertBranchCodeAvailable(transaction, businessId, code);

      await transaction.branch.create({
        data: {
          id: branchId,
          businessId,
          code,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
        },
      });

      if (input.firstLocation && locationId) {
        await transaction.location.create({
          data: {
            id: locationId,
            businessId,
            branchId,
            code: input.firstLocation.code.toUpperCase(),
            name: input.firstLocation.name,
            type: input.firstLocation.type ?? "SHOP_FLOOR",
          },
        });
      }

      await transaction.branchAssignment.create({
        data: { businessId, membershipId: membership.membershipId, branchId },
      });

      await transaction.documentSequence.createMany({
        data: ["SALE", "RECEIPT", "RETURN", "SHIFT"].map((documentType) => ({
          businessId,
          branchId,
          scopeKey: `BRANCH:${branchId}`,
          documentType,
          prefix: `${code}-${documentType === "RECEIPT" ? "RCPT" : documentType}`,
          padding: 6,
        })),
        skipDuplicates: true,
      });

      await recordAudit(transaction, {
        businessId,
        branchId,
        actorMembershipId: membership.membershipId,
        action: "CREATE",
        entityType: "Branch",
        entityId: branchId,
        after: { code, name: input.name },
      });

      return locationId ? { branchId, locationId } : { branchId };
    });
  }

  async updateBranch(
    businessId: string,
    actorUserId: string,
    branchId: string,
    input: UpdateBranchInput,
  ): Promise<{ id: string }> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const membership = await requirePermission(
        transaction,
        businessId,
        actorUserId,
        "BRANCH_UPDATE",
      );
      const before = await transaction.branch.findFirst({ where: { id: branchId, businessId } });
      if (!before) throw new BusinessAccessError("NOT_FOUND", "Branch was not found.");

      if (input.status === "INACTIVE" && before.status === "ACTIVE") {
        const openShifts = await transaction.posShift.count({
          where: { businessId, branchId, status: "OPEN" },
        });
        if (openShifts > 0) {
          throw new BusinessAccessError(
            "CONFLICT",
            "Close every open POS shift in this Branch before deactivating it.",
          );
        }
        const activeBranches = await transaction.branch.count({
          where: { businessId, status: "ACTIVE" },
        });
        if (activeBranches <= 1) {
          throw new BusinessAccessError(
            "CONFLICT",
            "A Business must keep at least one active Branch.",
          );
        }
      }

      const after = await transaction.branch.update({
        where: { id: branchId },
        data: {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.email === undefined ? {} : { email: input.email }),
          ...(input.phone === undefined ? {} : { phone: input.phone }),
          ...(input.status === undefined ? {} : { status: input.status }),
        },
      });

      await recordAudit(transaction, {
        businessId,
        branchId,
        actorMembershipId: membership.membershipId,
        action: statusAction(before.status, after.status),
        entityType: "Branch",
        entityId: branchId,
        before: { name: before.name, status: before.status },
        after: { name: after.name, status: after.status },
      });

      return { id: branchId };
    });
  }

  async createLocation(
    businessId: string,
    actorUserId: string,
    input: CreateLocationInput,
  ): Promise<{ id: string }> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const membership = await requirePermission(
        transaction,
        businessId,
        actorUserId,
        "LOCATION_CREATE",
      );
      const branch = await transaction.branch.findFirst({
        where: { id: input.branchId, businessId },
      });
      if (!branch) throw new BusinessAccessError("NOT_FOUND", "Branch was not found.");

      const location = await transaction.location.create({
        data: {
          businessId,
          branchId: input.branchId,
          code: input.code.toUpperCase(),
          name: input.name,
          type: input.type,
        },
      });

      await recordAudit(transaction, {
        businessId,
        branchId: input.branchId,
        actorMembershipId: membership.membershipId,
        action: "CREATE",
        entityType: "Location",
        entityId: location.id,
        after: { code: location.code, name: location.name, type: location.type },
      });

      return { id: location.id };
    });
  }

  async updateLocation(
    businessId: string,
    actorUserId: string,
    locationId: string,
    input: UpdateLocationInput,
  ): Promise<{ id: string }> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const membership = await requirePermission(
        transaction,
        businessId,
        actorUserId,
        "LOCATION_UPDATE",
      );
      const before = await transaction.location.findFirst({
        where: { id: locationId, businessId },
      });
      if (!before) throw new BusinessAccessError("NOT_FOUND", "Location was not found.");

      const after = await transaction.location.update({
        where: { id: locationId },
        data: {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.type === undefined ? {} : { type: input.type }),
          ...(input.status === undefined ? {} : { status: input.status }),
        },
      });

      await recordAudit(transaction, {
        businessId,
        branchId: before.branchId,
        actorMembershipId: membership.membershipId,
        action: statusAction(before.status, after.status),
        entityType: "Location",
        entityId: locationId,
        before: { name: before.name, type: before.type, status: before.status },
        after: { name: after.name, type: after.type, status: after.status },
      });

      return { id: locationId };
    });
  }

  /* --------------------------------------------------------- users and roles */

  async getAccessOverview(businessId: string, actorUserId: string): Promise<AccessOverview> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const membership = await loadMembershipContext(transaction, businessId, actorUserId);
      membership.requireAny(["USER_VIEW", "ROLE_VIEW"]);

      const [memberships, roles] = await Promise.all([
        transaction.businessMembership.findMany({
          where: { businessId },
          orderBy: { createdAt: "asc" },
          include: {
            user: true,
            roleAssignments: { include: { role: true } },
            branchAssignments: { include: { branch: true } },
          },
        }),
        transaction.role.findMany({
          where: { businessId },
          orderBy: [{ isSystem: "desc" }, { code: "asc" }],
          include: {
            permissions: { include: { permission: true } },
            _count: { select: { userAssignments: true } },
          },
        }),
      ]);

      return {
        memberships: memberships.map((record) => ({
          membershipId: record.id,
          userId: record.userId,
          displayName: record.user.displayName,
          email: record.user.email,
          status: record.status,
          joinedAt: record.joinedAt?.toISOString() ?? null,
          roles: record.roleAssignments.map((assignment) => ({
            id: assignment.role.id,
            code: assignment.role.code,
            name: assignment.role.name,
          })),
          branches: record.branchAssignments.map((assignment) => ({
            id: assignment.branch.id,
            code: assignment.branch.code,
            name: assignment.branch.name,
          })),
        })),
        roles: roles.map((role) => ({
          id: role.id,
          code: role.code,
          name: role.name,
          description: role.description,
          isSystem: role.isSystem,
          status: role.status,
          memberCount: role._count.userAssignments,
          permissions: role.permissions.map((entry) => entry.permission.code),
        })),
        permissionCatalog: PERMISSION_CATALOG,
        roleTemplates: ROLE_TEMPLATES.map((template) => ({
          code: template.code,
          name: template.name,
          description: template.description,
          permissions: [...template.permissions],
        })),
      };
    });
  }

  async inviteUser(
    businessId: string,
    actorUserId: string,
    input: InviteUserInput,
  ): Promise<{ membershipId: string; userId: string }> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const membership = await requirePermission(
        transaction,
        businessId,
        actorUserId,
        "USER_CREATE",
      );

      const externalSubject = input.externalSubject ?? `invite:${input.email.toLowerCase()}`;
      const user = await transaction.user.upsert({
        where: { email: input.email },
        update: { displayName: input.displayName },
        create: {
          email: input.email,
          displayName: input.displayName,
          externalSubject,
          status: "ACTIVE",
        },
      });

      const existing = await transaction.businessMembership.findUnique({
        where: { businessId_userId: { businessId, userId: user.id } },
      });
      if (existing) {
        throw new BusinessAccessError(
          "CONFLICT",
          "This person is already a member of the Business.",
        );
      }

      const created = await transaction.businessMembership.create({
        data: { businessId, userId: user.id, status: "INVITED" },
      });

      await this.replaceRoleAssignments(transaction, businessId, created.id, input.roleIds);
      await this.replaceBranchAssignments(transaction, businessId, created.id, input.branchIds);

      await recordAudit(transaction, {
        businessId,
        actorMembershipId: membership.membershipId,
        action: "CREATE",
        entityType: "BusinessMembership",
        entityId: created.id,
        after: {
          email: input.email,
          displayName: input.displayName,
          roles: input.roleIds.length,
          branches: input.branchIds.length,
        },
      });

      await publishEvent(transaction, {
        businessId,
        eventType: "UserInvited",
        aggregateType: "BusinessMembership",
        aggregateId: created.id,
        payload: { businessId, membershipId: created.id, email: input.email },
      });

      return { membershipId: created.id, userId: user.id };
    });
  }

  async updateMembership(
    businessId: string,
    actorUserId: string,
    membershipId: string,
    input: UpdateMembershipInput,
  ): Promise<{ id: string }> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await loadMembershipContext(transaction, businessId, actorUserId);
      if (input.roleIds || input.branchIds) actor.require("USER_ASSIGN");
      if (input.status || input.displayName) actor.require("USER_UPDATE");

      const before = await transaction.businessMembership.findFirst({
        where: { id: membershipId, businessId },
        include: { user: true, roleAssignments: true },
      });
      if (!before) throw new BusinessAccessError("NOT_FOUND", "The user was not found.");

      if (input.status === "SUSPENDED" && membershipId === actor.membershipId) {
        throw new BusinessAccessError("CONFLICT", "You cannot suspend your own access.");
      }
      if (input.status === "SUSPENDED") {
        await this.assertNotLastOwner(transaction, businessId, membershipId);
      }

      if (input.displayName) {
        await transaction.user.update({
          where: { id: before.userId },
          data: { displayName: input.displayName },
        });
      }

      const updated = await transaction.businessMembership.update({
        where: { id: membershipId },
        data: {
          ...(input.status === undefined ? {} : { status: input.status }),
          ...(input.status === "ACTIVE" && !before.joinedAt ? { joinedAt: new Date() } : {}),
        },
      });

      if (input.roleIds) {
        await this.replaceRoleAssignments(transaction, businessId, membershipId, input.roleIds);
      }
      if (input.branchIds) {
        await this.replaceBranchAssignments(transaction, businessId, membershipId, input.branchIds);
      }

      await recordAudit(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: input.status === "SUSPENDED" ? "DEACTIVATE" : "UPDATE",
        entityType: "BusinessMembership",
        entityId: membershipId,
        before: { status: before.status, displayName: before.user.displayName },
        after: {
          status: updated.status,
          displayName: input.displayName ?? before.user.displayName,
          roles: input.roleIds?.length ?? before.roleAssignments.length,
        },
      });

      return { id: membershipId };
    });
  }

  async createRole(
    businessId: string,
    actorUserId: string,
    input: CreateRoleInput,
  ): Promise<{ id: string }> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "ROLE_MANAGE");

      const template = input.templateCode
        ? ROLE_TEMPLATES.find((candidate) => candidate.code === input.templateCode)
        : undefined;
      const requested = input.permissions.length
        ? input.permissions
        : [...(template?.permissions ?? [])];
      const permissionCodes = this.validatePermissionCodes(requested);

      const existing = await transaction.role.findFirst({
        where: { businessId, code: input.code },
      });
      if (existing) {
        throw new BusinessAccessError("CONFLICT", "A Role with this code already exists.");
      }

      const role = await transaction.role.create({
        data: {
          businessId,
          code: input.code,
          name: input.name,
          description: input.description ?? template?.description ?? null,
          isSystem: false,
        },
      });

      await this.replaceRolePermissions(transaction, businessId, role.id, permissionCodes);

      await recordAudit(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: "CREATE",
        entityType: "Role",
        entityId: role.id,
        after: { code: role.code, name: role.name, permissions: permissionCodes },
      });

      return { id: role.id };
    });
  }

  async updateRole(
    businessId: string,
    actorUserId: string,
    roleId: string,
    input: UpdateRoleInput,
  ): Promise<{ id: string }> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "ROLE_MANAGE");
      const before = await transaction.role.findFirst({
        where: { id: roleId, businessId },
        include: { permissions: { include: { permission: true } } },
      });
      if (!before) throw new BusinessAccessError("NOT_FOUND", "Role was not found.");
      if (before.isSystem && (input.permissions || input.status)) {
        throw new BusinessAccessError(
          "CONFLICT",
          "The system Owner Role always keeps full access. Create a custom Role instead.",
        );
      }

      const permissionCodes = input.permissions
        ? this.validatePermissionCodes(input.permissions)
        : null;

      const after = await transaction.role.update({
        where: { id: roleId },
        data: {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.description === undefined ? {} : { description: input.description }),
          ...(input.status === undefined ? {} : { status: input.status }),
        },
      });

      if (permissionCodes) {
        await this.replaceRolePermissions(transaction, businessId, roleId, permissionCodes);
      }

      await recordAudit(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: statusAction(before.status, after.status),
        entityType: "Role",
        entityId: roleId,
        before: {
          name: before.name,
          status: before.status,
          permissions: before.permissions.map((entry) => entry.permission.code),
        },
        after: {
          name: after.name,
          status: after.status,
          ...(permissionCodes ? { permissions: permissionCodes } : {}),
        },
      });

      return { id: roleId };
    });
  }

  /* -------------------------------------------------------------- approvals */

  async getApprovalOverview(businessId: string, actorUserId: string): Promise<ApprovalOverview> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await loadMembershipContext(transaction, businessId, actorUserId);
      actor.requireAny(["APPROVAL_VIEW", "APPROVAL_MANAGE", "APPROVAL_DECIDE"]);

      const [policies, requests] = await Promise.all([
        transaction.approvalPolicy.findMany({
          where: { businessId },
          orderBy: { actionCode: "asc" },
        }),
        transaction.approvalRequest.findMany({
          where: { businessId },
          orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
          take: 100,
          include: {
            branch: true,
            requestedBy: { include: { user: { select: { displayName: true } } } },
            decidedBy: { include: { user: { select: { displayName: true } } } },
          },
        }),
      ]);

      return {
        policies: policies.map((policy) => ({
          id: policy.id,
          actionCode: policy.actionCode,
          name: policy.name,
          strategy: policy.strategy,
          minimumApprovers: policy.minimumApprovers,
          thresholdAmount: toOptionalNumber(policy.thresholdAmount),
          currencyCode: policy.currencyCode,
          enabled: policy.enabled,
          conditions: asJsonObject(policy.conditions),
        })),
        requests: requests.map((request) => ({
          id: request.id,
          actionCode: request.actionCode,
          actionName:
            APPROVABLE_ACTIONS.find((action) => action.code === request.actionCode)?.name ??
            request.actionCode,
          entityType: request.entityType,
          entityId: request.entityId,
          status: request.status,
          amount: toOptionalNumber(request.amount),
          currencyCode: request.currencyCode,
          reason: request.reason,
          requestedBy: request.requestedBy.user.displayName,
          requestedAt: request.requestedAt.toISOString(),
          decidedBy: request.decidedBy?.user.displayName ?? null,
          decidedAt: request.decidedAt?.toISOString() ?? null,
          decisionNote: request.decisionNote,
          branchName: request.branch?.name ?? null,
          context: asJsonObject(request.context),
        })),
        approvableActions: APPROVABLE_ACTIONS.map((action) => ({ ...action })),
      };
    });
  }

  async upsertApprovalPolicy(
    businessId: string,
    actorUserId: string,
    input: UpsertApprovalPolicyInput,
  ): Promise<{ id: string }> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(
        transaction,
        businessId,
        actorUserId,
        "APPROVAL_MANAGE",
      );
      const before = await transaction.approvalPolicy.findFirst({
        where: { businessId, actionCode: input.actionCode },
      });

      const data = {
        name: input.name,
        strategy: input.strategy,
        minimumApprovers: input.minimumApprovers,
        thresholdAmount:
          input.thresholdAmount === undefined || input.thresholdAmount === null
            ? null
            : input.thresholdAmount.toString(),
        currencyCode: input.currencyCode ?? null,
        enabled: input.enabled,
        ...(input.conditions ? { conditions: input.conditions as Prisma.InputJsonObject } : {}),
      };

      const policy = await transaction.approvalPolicy.upsert({
        where: { businessId_actionCode: { businessId, actionCode: input.actionCode } },
        update: data,
        create: { businessId, actionCode: input.actionCode, ...data },
      });

      await recordAudit(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: before ? "UPDATE" : "CREATE",
        entityType: "ApprovalPolicy",
        entityId: policy.id,
        before: before
          ? {
              name: before.name,
              enabled: before.enabled,
              thresholdAmount: toOptionalNumber(before.thresholdAmount),
            }
          : undefined,
        after: {
          name: policy.name,
          enabled: policy.enabled,
          thresholdAmount: toOptionalNumber(policy.thresholdAmount),
        },
      });

      return { id: policy.id };
    });
  }

  async createApprovalRequest(
    businessId: string,
    actorUserId: string,
    input: CreateApprovalRequestInput,
  ): Promise<{ id: string; status: string }> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await loadMembershipContext(transaction, businessId, actorUserId);
      const policy = await transaction.approvalPolicy.findFirst({
        where: { businessId, actionCode: input.actionCode, enabled: true },
      });

      const request = await transaction.approvalRequest.create({
        data: {
          businessId,
          branchId: input.branchId ?? null,
          policyId: policy?.id ?? null,
          actionCode: input.actionCode,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          amount: input.amount === undefined ? null : input.amount.toString(),
          currencyCode: input.currencyCode ?? null,
          reason: input.reason,
          requestedByMembershipId: actor.membershipId,
          ...(input.context ? { context: input.context as Prisma.InputJsonObject } : {}),
        },
      });

      await recordAudit(transaction, {
        businessId,
        branchId: input.branchId ?? null,
        actorMembershipId: actor.membershipId,
        action: "CREATE",
        entityType: "ApprovalRequest",
        entityId: request.id,
        after: { actionCode: input.actionCode, amount: input.amount ?? null, reason: input.reason },
      });

      await publishEvent(transaction, {
        businessId,
        eventType: "ApprovalRequested",
        aggregateType: "ApprovalRequest",
        aggregateId: request.id,
        payload: { businessId, actionCode: input.actionCode, amount: input.amount ?? null },
      });

      return { id: request.id, status: request.status };
    });
  }

  async decideApprovalRequest(
    businessId: string,
    actorUserId: string,
    requestId: string,
    input: DecideApprovalRequestInput,
  ): Promise<{ id: string; status: string }> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await loadMembershipContext(transaction, businessId, actorUserId);
      const request = await transaction.approvalRequest.findFirst({
        where: { id: requestId, businessId },
      });
      if (!request) throw new BusinessAccessError("NOT_FOUND", "Approval request was not found.");
      if (request.status !== "PENDING") {
        throw new BusinessAccessError(
          "CONFLICT",
          "This approval request has already been decided.",
        );
      }

      actor.require(decisionPermissionForAction(request.actionCode));
      if (request.requestedByMembershipId === actor.membershipId) {
        throw new BusinessAccessError(
          "CONFLICT",
          "A different user must approve this request. Manager override never means sharing a login.",
        );
      }

      const updated = await transaction.approvalRequest.update({
        where: { id: requestId },
        data: {
          status: input.decision,
          decidedByMembershipId: actor.membershipId,
          decidedAt: new Date(),
          decisionNote: input.note ?? null,
        },
      });

      await recordAudit(transaction, {
        businessId,
        branchId: request.branchId,
        actorMembershipId: actor.membershipId,
        action: input.decision === "APPROVED" ? "APPROVE" : "REJECT",
        entityType: "ApprovalRequest",
        entityId: requestId,
        before: { status: request.status },
        after: { status: updated.status, note: input.note ?? null },
      });

      await publishEvent(transaction, {
        businessId,
        eventType: input.decision === "APPROVED" ? "ApprovalGranted" : "ApprovalRejected",
        aggregateType: "ApprovalRequest",
        aggregateId: requestId,
        payload: { businessId, actionCode: request.actionCode, decidedBy: actor.membershipId },
      });

      return { id: requestId, status: updated.status };
    });
  }

  /* ------------------------------------------------------------- feature access */

  async listFeatures(businessId: string, actorUserId: string): Promise<FeatureRow[]> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await loadMembershipContext(transaction, businessId, actorUserId);
      actor.requireAny(["FEATURE_VIEW", "FEATURE_MANAGE"]);
      await this.ensureFeatureCatalog(transaction, businessId);

      const assignments = await transaction.businessFeature.findMany({
        where: { businessId },
        include: { feature: true },
      });
      const enabled = new Map(
        assignments.map((assignment) => [assignment.feature.key, assignment]),
      );

      return FEATURE_DEFINITIONS.map((definition) => {
        const assignment = enabled.get(definition.key);
        const blockedBy = definition.dependsOn.filter(
          (dependency) => !enabled.get(dependency)?.enabled,
        );
        return {
          key: definition.key,
          name: definition.name,
          description: definition.description,
          kind: definition.kind,
          enabled: assignment?.enabled ?? false,
          dependsOn: [...definition.dependsOn],
          blockedBy,
          settings: asJsonObject(assignment?.settings),
        };
      });
    });
  }

  async setFeature(
    businessId: string,
    actorUserId: string,
    input: SetFeatureInput,
  ): Promise<{ key: string; enabled: boolean }> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "FEATURE_MANAGE");
      const definition = FEATURE_DEFINITIONS.find(
        (candidate) => candidate.key === input.featureKey,
      );
      if (!definition) throw new BusinessAccessError("NOT_FOUND", "Feature was not found.");

      await this.ensureFeatureCatalog(transaction, businessId);

      const assignments = await transaction.businessFeature.findMany({
        where: { businessId },
        include: { feature: true },
      });
      const byKey = new Map(assignments.map((assignment) => [assignment.feature.key, assignment]));

      if (input.enabled) {
        const missing = definition.dependsOn.filter(
          (dependency) => !byKey.get(dependency)?.enabled,
        );
        if (missing.length) {
          throw new BusinessAccessError(
            "CONFLICT",
            `Enable ${missing.join(", ")} before enabling ${definition.name}.`,
          );
        }
      } else {
        const dependants = FEATURE_DEFINITIONS.filter(
          (candidate) =>
            candidate.dependsOn.some((dependency) => dependency === definition.key) &&
            byKey.get(candidate.key)?.enabled,
        );
        if (dependants.length) {
          throw new BusinessAccessError(
            "CONFLICT",
            `Disable ${dependants.map((entry) => entry.name).join(", ")} first.`,
          );
        }
        if (definition.kind === "CORE" && definition.key === "COMMON_CORE") {
          throw new BusinessAccessError("CONFLICT", "The Common Core cannot be disabled.");
        }
      }

      const feature = await transaction.featureDefinition.findUniqueOrThrow({
        where: { key: definition.key },
      });
      const saved = await transaction.businessFeature.upsert({
        where: { businessId_featureId: { businessId, featureId: feature.id } },
        update: {
          enabled: input.enabled,
          ...(input.settings ? { settings: input.settings as Prisma.InputJsonObject } : {}),
        },
        create: {
          businessId,
          featureId: feature.id,
          enabled: input.enabled,
          ...(input.settings ? { settings: input.settings as Prisma.InputJsonObject } : {}),
        },
      });

      await recordAudit(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: input.enabled ? "ENABLE" : "DISABLE",
        entityType: "BusinessFeature",
        entityId: saved.id,
        after: { featureKey: definition.key, enabled: input.enabled },
      });

      await publishEvent(transaction, {
        businessId,
        eventType: input.enabled ? "FeatureEnabled" : "FeatureDisabled",
        aggregateType: "BusinessFeature",
        aggregateId: saved.id,
        payload: { businessId, featureKey: definition.key },
      });

      return { key: definition.key, enabled: input.enabled };
    });
  }

  /* ------------------------------------------------------------------- audit */

  async listAuditEvents(
    businessId: string,
    actorUserId: string,
    query: AuditQuery,
  ): Promise<Paginated<AuditEventRow>> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await requirePermission(transaction, businessId, actorUserId, "AUDIT_VIEW");

      const where = {
        businessId,
        ...(query.entityType ? { entityType: query.entityType } : {}),
        ...(query.entityId ? { entityId: query.entityId } : {}),
        ...(query.action ? { action: query.action } : {}),
        ...(query.actorMembershipId ? { actorMembershipId: query.actorMembershipId } : {}),
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.from || query.to
          ? {
              occurredAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      };

      const { skip, take } = pagination(query);
      const [total, events] = await Promise.all([
        transaction.auditEvent.count({ where }),
        transaction.auditEvent.findMany({
          where,
          orderBy: { occurredAt: "desc" },
          skip,
          take,
          include: {
            branch: true,
            actorMembership: { include: { user: { select: { displayName: true } } } },
          },
        }),
      ]);

      return {
        rows: events.map((event) => ({
          id: event.id,
          action: event.action,
          entityType: event.entityType,
          entityId: event.entityId,
          actor: event.actorMembership?.user.displayName ?? "System",
          branchName: event.branch?.name ?? null,
          occurredAt: event.occurredAt.toISOString(),
          before: asJsonObject(event.before),
          after: asJsonObject(event.after),
          metadata: asJsonObject(event.metadata),
        })),
        total,
        page: query.page,
        pageSize: query.pageSize,
      };
    });
  }

  /* --------------------------------------------------------------- numbering */

  async listDocumentSequences(
    businessId: string,
    actorUserId: string,
  ): Promise<DocumentSequenceRow[]> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await loadMembershipContext(transaction, businessId, actorUserId);
      actor.requireAny(["NUMBERING_VIEW", "NUMBERING_MANAGE"]);

      const sequences = await transaction.documentSequence.findMany({
        where: { businessId },
        orderBy: [{ documentType: "asc" }, { scopeKey: "asc" }],
        include: { branch: true },
      });

      return sequences.map((sequence) => ({
        id: sequence.id,
        documentType: sequence.documentType,
        branchId: sequence.branchId,
        branchName: sequence.branch?.name ?? null,
        scopeKey: sequence.scopeKey,
        prefix: sequence.prefix,
        padding: sequence.padding,
        nextValue: Number(sequence.nextValue),
        nextNumberPreview: `${sequence.prefix}-${sequence.nextValue.toString().padStart(sequence.padding, "0")}`,
      }));
    });
  }

  async upsertDocumentSequence(
    businessId: string,
    actorUserId: string,
    input: UpsertDocumentSequenceInput,
  ): Promise<{ id: string; nextNumberPreview: string }> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(
        transaction,
        businessId,
        actorUserId,
        "NUMBERING_MANAGE",
      );
      const branchId = input.branchId ?? null;
      const scopeKey = branchId ? `BRANCH:${branchId}` : "BUSINESS";
      const documentType = input.documentType.toUpperCase();

      const before = await transaction.documentSequence.findFirst({
        where: { businessId, scopeKey, documentType },
      });
      if (before && input.nextValue !== undefined && input.nextValue < Number(before.nextValue)) {
        throw new BusinessAccessError(
          "CONFLICT",
          "A document number sequence can only move forward. Lowering it would repeat numbers.",
        );
      }

      const sequence = await transaction.documentSequence.upsert({
        where: { businessId_scopeKey_documentType: { businessId, scopeKey, documentType } },
        update: {
          prefix: input.prefix,
          padding: input.padding,
          ...(input.nextValue === undefined ? {} : { nextValue: BigInt(input.nextValue) }),
        },
        create: {
          businessId,
          branchId,
          scopeKey,
          documentType,
          prefix: input.prefix,
          padding: input.padding,
          nextValue: BigInt(input.nextValue ?? 1),
        },
      });

      await recordAudit(transaction, {
        businessId,
        branchId,
        actorMembershipId: actor.membershipId,
        action: before ? "UPDATE" : "CREATE",
        entityType: "DocumentSequence",
        entityId: sequence.id,
        before: before
          ? { prefix: before.prefix, padding: before.padding, nextValue: Number(before.nextValue) }
          : undefined,
        after: {
          prefix: sequence.prefix,
          padding: sequence.padding,
          nextValue: Number(sequence.nextValue),
        },
      });

      return {
        id: sequence.id,
        nextNumberPreview: `${sequence.prefix}-${sequence.nextValue.toString().padStart(sequence.padding, "0")}`,
      };
    });
  }

  async nextDocumentNumber(
    businessId: string,
    actorUserId: string,
    input: NextDocumentNumberInput,
  ): Promise<string> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "NUMBERING_VIEW");
      let branchCode: string | undefined;
      if (input.branchId) {
        const branch = await transaction.branch.findFirst({
          where: { id: input.branchId, businessId },
          select: { code: true },
        });
        if (!branch) throw new BusinessAccessError("NOT_FOUND", "Branch was not found.");
        branchCode = branch.code;
      }

      const number = await allocateDocumentNumber(transaction, {
        businessId,
        documentType: input.documentType,
        branchId: input.branchId ?? null,
        ...(branchCode ? { branchCode } : {}),
      });

      await recordAudit(transaction, {
        businessId,
        branchId: input.branchId ?? null,
        actorMembershipId: actor.membershipId,
        action: "GENERATE",
        entityType: "DocumentNumber",
        entityId: number,
        metadata: { documentType: input.documentType.toUpperCase() },
      });

      return number;
    });
  }

  /* ------------------------------------------------------------- appearance */

  async getBusinessTheme(businessId: string, actorUserId: string): Promise<BusinessThemeSettings> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await requirePermission(transaction, businessId, actorUserId, "BUSINESS_VIEW");

      const theme = await transaction.businessTheme.findUnique({ where: { businessId } });
      if (!theme) throw new BusinessAccessError("NOT_FOUND", "Business theme was not found.");

      return themeToSettings(theme);
    });
  }

  async updateBusinessTheme(
    businessId: string,
    actorUserId: string,
    input: UpdateBusinessThemeInput,
  ): Promise<BusinessThemeSettings> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(
        transaction,
        businessId,
        actorUserId,
        "BUSINESS_UPDATE",
      );
      const before = await transaction.businessTheme.findUnique({ where: { businessId } });
      if (!before) throw new BusinessAccessError("NOT_FOUND", "Business theme was not found.");

      const result = await transaction.businessTheme.updateMany({
        where: { businessId, revision: input.expectedRevision },
        data: {
          preset: input.preset,
          defaultMode: input.defaultMode,
          allowUserModeChange: input.allowUserModeChange,
          brandPrimary: input.brandPrimary,
          brandAccent: input.brandAccent,
          revision: { increment: 1 },
        },
      });
      if (result.count !== 1) {
        throw new BusinessAccessError(
          "CONFLICT",
          "The Business theme changed in another session. Refresh it and try again.",
        );
      }

      const theme = await transaction.businessTheme.findUniqueOrThrow({ where: { businessId } });
      const after = {
        preset: theme.preset,
        defaultMode: theme.defaultMode,
        allowUserModeChange: theme.allowUserModeChange,
        brandPrimary: theme.brandPrimary,
        brandAccent: theme.brandAccent,
        revision: theme.revision,
      };

      await recordAudit(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: "UPDATE",
        entityType: "BusinessTheme",
        entityId: businessId,
        before: {
          preset: before.preset,
          defaultMode: before.defaultMode,
          allowUserModeChange: before.allowUserModeChange,
          brandPrimary: before.brandPrimary,
          brandAccent: before.brandAccent,
          revision: before.revision,
        },
        after,
      });

      await publishEvent(transaction, {
        businessId,
        eventType: "BusinessThemeUpdated",
        aggregateType: "BusinessTheme",
        aggregateId: businessId,
        payload: { businessId, ...after },
      });

      return themeToSettings(theme);
    });
  }

  /* --------------------------------------------------------------- internals */

  private async ensurePermissionCatalog(
    transaction: DatabaseTransaction,
  ): Promise<Array<{ id: string; code: string }>> {
    return Promise.all(
      PLATFORM_PERMISSIONS.map((permission) =>
        transaction.permission.upsert({
          where: { code: permission.code },
          update: { name: permission.name },
          create: { code: permission.code, name: permission.name },
          select: { id: true, code: true },
        }),
      ),
    );
  }

  private async createRoleTemplates(
    transaction: DatabaseTransaction,
    businessId: string,
    permissions: Array<{ id: string; code: string }>,
  ): Promise<void> {
    const permissionIdByCode = new Map(
      permissions.map((permission) => [permission.code, permission.id]),
    );

    for (const template of ROLE_TEMPLATES) {
      const role = await transaction.role.create({
        data: {
          businessId,
          code: template.code,
          name: template.name,
          description: template.description,
          isSystem: false,
        },
      });
      const rows = template.permissions
        .map((code) => permissionIdByCode.get(code))
        .filter((permissionId): permissionId is string => Boolean(permissionId))
        .map((permissionId) => ({ businessId, roleId: role.id, permissionId }));
      if (rows.length) {
        await transaction.rolePermission.createMany({ data: rows, skipDuplicates: true });
      }
    }
  }

  private async ensureFeatureCatalog(
    transaction: DatabaseTransaction,
    businessId: string,
  ): Promise<void> {
    for (const definition of FEATURE_DEFINITIONS) {
      const feature = await transaction.featureDefinition.upsert({
        where: { key: definition.key },
        update: { name: definition.name, description: definition.description },
        create: {
          key: definition.key,
          name: definition.name,
          description: definition.description,
          kind: definition.kind,
        },
      });

      const existing = await transaction.businessFeature.findUnique({
        where: { businessId_featureId: { businessId, featureId: feature.id } },
      });
      if (!existing) {
        await transaction.businessFeature.create({
          data: { businessId, featureId: feature.id, enabled: definition.kind === "CORE" },
        });
      }
    }
  }

  private validatePermissionCodes(codes: readonly string[]): string[] {
    const unique = [...new Set(codes)];
    const unknown = unique.filter((code) => !isPlatformPermissionCode(code));
    if (unknown.length) {
      throw new BusinessAccessError(
        "INVALID_INPUT",
        `These permissions do not exist: ${unknown.join(", ")}.`,
      );
    }
    return unique;
  }

  private async replaceRolePermissions(
    transaction: DatabaseTransaction,
    businessId: string,
    roleId: string,
    permissionCodes: readonly string[],
  ): Promise<void> {
    const permissions = await transaction.permission.findMany({
      where: { code: { in: [...permissionCodes] } },
      select: { id: true },
    });
    await transaction.rolePermission.deleteMany({ where: { businessId, roleId } });
    if (permissions.length) {
      await transaction.rolePermission.createMany({
        data: permissions.map((permission) => ({
          businessId,
          roleId,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  private async replaceRoleAssignments(
    transaction: DatabaseTransaction,
    businessId: string,
    membershipId: string,
    roleIds: readonly string[],
  ): Promise<void> {
    if (roleIds.length) {
      const roles = await transaction.role.findMany({
        where: { businessId, id: { in: [...roleIds] } },
        select: { id: true },
      });
      if (roles.length !== new Set(roleIds).size) {
        throw new BusinessAccessError("NOT_FOUND", "One or more Roles were not found.");
      }
    }
    await transaction.membershipRole.deleteMany({ where: { businessId, membershipId } });
    if (roleIds.length) {
      await transaction.membershipRole.createMany({
        data: [...new Set(roleIds)].map((roleId) => ({ businessId, membershipId, roleId })),
        skipDuplicates: true,
      });
    }
  }

  private async replaceBranchAssignments(
    transaction: DatabaseTransaction,
    businessId: string,
    membershipId: string,
    branchIds: readonly string[],
  ): Promise<void> {
    if (branchIds.length) {
      const branches = await transaction.branch.findMany({
        where: { businessId, id: { in: [...branchIds] } },
        select: { id: true },
      });
      if (branches.length !== new Set(branchIds).size) {
        throw new BusinessAccessError("NOT_FOUND", "One or more Branches were not found.");
      }
    }
    await transaction.branchAssignment.deleteMany({ where: { businessId, membershipId } });
    if (branchIds.length) {
      await transaction.branchAssignment.createMany({
        data: [...new Set(branchIds)].map((branchId) => ({ businessId, membershipId, branchId })),
        skipDuplicates: true,
      });
    }
  }

  private async assertBranchCodeAvailable(
    transaction: DatabaseTransaction,
    businessId: string,
    code: string,
  ): Promise<void> {
    const existing = await transaction.branch.findFirst({ where: { businessId, code } });
    if (existing) {
      throw new BusinessAccessError("CONFLICT", "A Branch with this code already exists.");
    }
  }

  private async assertNotLastOwner(
    transaction: DatabaseTransaction,
    businessId: string,
    membershipId: string,
  ): Promise<void> {
    const ownerRole = await transaction.role.findFirst({
      where: { businessId, code: "OWNER", isSystem: true },
      select: { id: true },
    });
    if (!ownerRole) return;

    const isOwner = await transaction.membershipRole.findFirst({
      where: { businessId, membershipId, roleId: ownerRole.id },
    });
    if (!isOwner) return;

    const activeOwners = await transaction.membershipRole.count({
      where: {
        businessId,
        roleId: ownerRole.id,
        membership: { status: "ACTIVE" },
      },
    });
    if (activeOwners <= 1) {
      throw new BusinessAccessError(
        "CONFLICT",
        "A Business must keep at least one active Business Owner.",
      );
    }
  }
}

function statusAction(
  before: "ACTIVE" | "INACTIVE",
  after: "ACTIVE" | "INACTIVE",
): "UPDATE" | "ACTIVATE" | "DEACTIVATE" {
  if (before === after) return "UPDATE";
  return after === "ACTIVE" ? "ACTIVATE" : "DEACTIVATE";
}

function themeToSettings(theme: {
  businessId: string;
  preset: BusinessThemeSettings["preset"];
  defaultMode: BusinessThemeSettings["defaultMode"];
  allowUserModeChange: boolean;
  brandPrimary: string | null;
  brandAccent: string | null;
  revision: number;
  updatedAt: Date;
}): BusinessThemeSettings {
  return {
    businessId: theme.businessId,
    preset: theme.preset,
    defaultMode: theme.defaultMode,
    allowUserModeChange: theme.allowUserModeChange,
    brandPrimary: theme.brandPrimary,
    brandAccent: theme.brandAccent,
    revision: theme.revision,
    updatedAt: theme.updatedAt.toISOString(),
  };
}
