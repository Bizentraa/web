import type {
  BusinessFoundationCreated,
  BusinessFoundationSummary,
  CreateBranchInput,
  CreateBusinessFoundationInput,
  NextDocumentNumberInput,
} from "@bizentra/contracts";
import {
  type DatabaseClient,
  type DatabaseTransaction,
  withBusinessContext,
} from "@bizentra/database";
import { createId } from "@bizentra/ids";

import { P0_PERMISSIONS, type P0PermissionCode } from "../domain/permissions.js";
import { BusinessAccessError } from "./errors.js";

export class BusinessAccessService {
  constructor(private readonly database: DatabaseClient) {}

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

      const permissions = await Promise.all(
        P0_PERMISSIONS.map((permission) =>
          transaction.permission.upsert({
            where: { code: permission.code },
            update: { name: permission.name },
            create: permission,
          }),
        ),
      );

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

      const coreFeature = await transaction.featureDefinition.upsert({
        where: { key: "COMMON_CORE" },
        update: { name: "Common Core" },
        create: {
          key: "COMMON_CORE",
          name: "Common Core",
          description: "Shared Bizentra platform capabilities.",
          kind: "CORE",
        },
      });

      await transaction.businessFeature.create({
        data: { businessId, featureId: coreFeature.id, enabled: true },
      });

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
          {
            businessId,
            branchId,
            scopeKey: `BRANCH:${branchId}`,
            documentType: "SALE",
            prefix: `${input.firstBranch.code.toUpperCase()}-SALE`,
            padding: 6,
          },
          {
            businessId,
            branchId,
            scopeKey: `BRANCH:${branchId}`,
            documentType: "RECEIPT",
            prefix: `${input.firstBranch.code.toUpperCase()}-RCPT`,
            padding: 6,
          },
        ],
      });

      await transaction.auditEvent.create({
        data: {
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
        },
      });

      await transaction.outboxEvent.create({
        data: {
          businessId,
          eventType: "BusinessFoundationCreated",
          aggregateType: "Business",
          aggregateId: businessId,
          payload: { businessId, branchId, locationId, ownerUserId: owner.id },
        },
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
      await this.requirePermission(transaction, businessId, actorUserId, "BUSINESS_VIEW");

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

      return {
        business: {
          id: business.id,
          name: business.name,
          slug: business.slug,
          defaultCurrency: business.defaultCurrency,
          timeZone: business.timeZone,
          countryCode: business.countryCode,
          status: business.status,
        },
        branches: business.branches.map((branch) => ({
          id: branch.id,
          code: branch.code,
          name: branch.name,
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
      };
    });
  }

  async createBranch(
    businessId: string,
    actorUserId: string,
    input: CreateBranchInput,
  ): Promise<{ branchId: string; locationId?: string }> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const membershipId = await this.requirePermission(
        transaction,
        businessId,
        actorUserId,
        "BRANCH_CREATE",
      );
      const branchId = createId();
      const locationId = input.firstLocation ? createId() : undefined;

      await transaction.branch.create({
        data: {
          id: branchId,
          businessId,
          code: input.code.toUpperCase(),
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
        data: { businessId, membershipId, branchId },
      });

      await transaction.auditEvent.create({
        data: {
          businessId,
          branchId,
          actorMembershipId: membershipId,
          action: "CREATE",
          entityType: "Branch",
          entityId: branchId,
          after: { code: input.code.toUpperCase(), name: input.name },
        },
      });

      return locationId ? { branchId, locationId } : { branchId };
    });
  }

  async nextDocumentNumber(
    businessId: string,
    actorUserId: string,
    input: NextDocumentNumberInput,
  ): Promise<string> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const membershipId = await this.requirePermission(
        transaction,
        businessId,
        actorUserId,
        "NUMBERING_VIEW",
      );
      const documentType = input.documentType.toUpperCase();
      const scopeKey = input.branchId ? `BRANCH:${input.branchId}` : "BUSINESS";
      let branchCode: string | undefined;

      if (input.branchId) {
        const branch = await transaction.branch.findFirst({
          where: { id: input.branchId, businessId },
          select: { code: true },
        });
        if (!branch) throw new BusinessAccessError("NOT_FOUND", "Branch was not found.");
        branchCode = branch.code;
      }

      const sequence = await transaction.documentSequence.upsert({
        where: { businessId_scopeKey_documentType: { businessId, scopeKey, documentType } },
        update: { nextValue: { increment: 1 } },
        create: {
          businessId,
          branchId: input.branchId ?? null,
          scopeKey,
          documentType,
          prefix: branchCode ? `${branchCode}-${documentType}` : documentType,
          nextValue: 2,
          padding: 6,
        },
      });

      const allocatedValue = sequence.nextValue - 1n;
      const number = `${sequence.prefix}-${allocatedValue.toString().padStart(sequence.padding, "0")}`;

      await transaction.auditEvent.create({
        data: {
          businessId,
          branchId: input.branchId ?? null,
          actorMembershipId: membershipId,
          action: "GENERATE",
          entityType: "DocumentNumber",
          entityId: number,
          metadata: { documentType, scopeKey },
        },
      });

      return number;
    });
  }

  private async requirePermission(
    transaction: DatabaseTransaction,
    businessId: string,
    userId: string,
    permissionCode: P0PermissionCode,
  ): Promise<string> {
    const membership = await transaction.businessMembership.findUnique({
      where: { businessId_userId: { businessId, userId } },
      include: {
        roleAssignments: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!membership || membership.status !== "ACTIVE") {
      throw new BusinessAccessError("FORBIDDEN", "The user is not active in this Business.");
    }

    const hasPermission = membership.roleAssignments.some((assignment) =>
      assignment.role.permissions.some(({ permission }) => permission.code === permissionCode),
    );
    if (!hasPermission) {
      throw new BusinessAccessError(
        "FORBIDDEN",
        `The user does not have the ${permissionCode} permission.`,
      );
    }

    return membership.id;
  }
}
