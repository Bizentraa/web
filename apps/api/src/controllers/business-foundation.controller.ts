import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { assertDevelopmentAuthMode } from "@bizentra/auth";
import {
  auditQuerySchema,
  createApprovalRequestSchema,
  createBranchSchema,
  createBusinessFoundationSchema,
  createLocationSchema,
  createRoleSchema,
  decideApprovalRequestSchema,
  inviteUserSchema,
  nextDocumentNumberSchema,
  setFeatureSchema,
  updateBranchSchema,
  updateBusinessSchema,
  updateBusinessThemeSchema,
  updateLocationSchema,
  updateMembershipSchema,
  updateRoleSchema,
  upsertApprovalPolicySchema,
  upsertDocumentSequenceSchema,
} from "@bizentra/contracts";
import { BusinessAccessService } from "@bizentra/domain-business-access";

import { identityForBusiness } from "./identity.js";

type RequestHeaders = Record<string, string | string[] | undefined>;

@ApiTags("P0 Business Foundation")
@Controller()
export class BusinessFoundationController {
  constructor(
    @Inject(BusinessAccessService) private readonly businessAccess: BusinessAccessService,
  ) {}

  @Post("setup/business-foundation")
  @ApiOperation({ summary: "Create a Business, first Branch, Location and owner access" })
  createFoundation(@Body() body: unknown) {
    assertDevelopmentAuthMode(process.env.AUTH_MODE);
    return this.businessAccess.createBusinessFoundation(createBusinessFoundationSchema.parse(body));
  }

  @Get("businesses/:businessId/foundation")
  @ApiOperation({ summary: "Read the current Business foundation and setup progress" })
  getFoundation(@Param("businessId") businessId: string, @Headers() headers: RequestHeaders) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.getBusinessFoundation(businessId, identity.userId);
  }

  @Patch("businesses/:businessId")
  @ApiOperation({ summary: "Update Business details, currency, time zone and country" })
  updateBusiness(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.updateBusiness(
      businessId,
      identity.userId,
      updateBusinessSchema.parse(body),
    );
  }

  @Post("businesses/:businessId/branches")
  @ApiOperation({ summary: "Create another Branch and optional first Location" })
  createBranch(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.createBranch(
      businessId,
      identity.userId,
      createBranchSchema.parse(body),
    );
  }

  @Patch("businesses/:businessId/branches/:branchId")
  @ApiOperation({ summary: "Update, activate or deactivate a Branch" })
  updateBranch(
    @Param("businessId") businessId: string,
    @Param("branchId") branchId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.updateBranch(
      businessId,
      identity.userId,
      branchId,
      updateBranchSchema.parse(body),
    );
  }

  @Post("businesses/:businessId/locations")
  @ApiOperation({ summary: "Create a stock or work Location under a Branch" })
  createLocation(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.createLocation(
      businessId,
      identity.userId,
      createLocationSchema.parse(body),
    );
  }

  @Patch("businesses/:businessId/locations/:locationId")
  @ApiOperation({ summary: "Update, activate or deactivate a Location" })
  updateLocation(
    @Param("businessId") businessId: string,
    @Param("locationId") locationId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.updateLocation(
      businessId,
      identity.userId,
      locationId,
      updateLocationSchema.parse(body),
    );
  }

  @Get("businesses/:businessId/access")
  @ApiOperation({ summary: "Read users, Roles and the permission catalogue" })
  getAccess(@Param("businessId") businessId: string, @Headers() headers: RequestHeaders) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.getAccessOverview(businessId, identity.userId);
  }

  @Post("businesses/:businessId/users")
  @ApiOperation({ summary: "Invite a user and assign Roles and Branches" })
  inviteUser(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.inviteUser(
      businessId,
      identity.userId,
      inviteUserSchema.parse(body),
    );
  }

  @Patch("businesses/:businessId/users/:membershipId")
  @ApiOperation({ summary: "Update a user's status, Roles or Branch access" })
  updateMembership(
    @Param("businessId") businessId: string,
    @Param("membershipId") membershipId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.updateMembership(
      businessId,
      identity.userId,
      membershipId,
      updateMembershipSchema.parse(body),
    );
  }

  @Post("businesses/:businessId/roles")
  @ApiOperation({ summary: "Create a custom Role from a template or a permission list" })
  createRole(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.createRole(
      businessId,
      identity.userId,
      createRoleSchema.parse(body),
    );
  }

  @Patch("businesses/:businessId/roles/:roleId")
  @ApiOperation({ summary: "Update a Role's name, status or permissions" })
  updateRole(
    @Param("businessId") businessId: string,
    @Param("roleId") roleId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.updateRole(
      businessId,
      identity.userId,
      roleId,
      updateRoleSchema.parse(body),
    );
  }

  @Get("businesses/:businessId/approvals")
  @ApiOperation({ summary: "Read approval rules and approval requests" })
  getApprovals(@Param("businessId") businessId: string, @Headers() headers: RequestHeaders) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.getApprovalOverview(businessId, identity.userId);
  }

  @Put("businesses/:businessId/approvals/policies")
  @ApiOperation({ summary: "Create or update the approval rule for one sensitive action" })
  upsertApprovalPolicy(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.upsertApprovalPolicy(
      businessId,
      identity.userId,
      upsertApprovalPolicySchema.parse(body),
    );
  }

  @Post("businesses/:businessId/approvals/requests")
  @ApiOperation({ summary: "Ask for approval before posting a sensitive action" })
  createApprovalRequest(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.createApprovalRequest(
      businessId,
      identity.userId,
      createApprovalRequestSchema.parse(body),
    );
  }

  @Post("businesses/:businessId/approvals/requests/:requestId/decision")
  @ApiOperation({ summary: "Approve or reject an approval request" })
  decideApprovalRequest(
    @Param("businessId") businessId: string,
    @Param("requestId") requestId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.decideApprovalRequest(
      businessId,
      identity.userId,
      requestId,
      decideApprovalRequestSchema.parse(body),
    );
  }

  @Get("businesses/:businessId/features")
  @ApiOperation({ summary: "Read feature packs and their dependencies" })
  listFeatures(@Param("businessId") businessId: string, @Headers() headers: RequestHeaders) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.listFeatures(businessId, identity.userId);
  }

  @Put("businesses/:businessId/features")
  @ApiOperation({ summary: "Enable or disable a feature pack for this Business" })
  setFeature(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.setFeature(
      businessId,
      identity.userId,
      setFeatureSchema.parse(body),
    );
  }

  @Get("businesses/:businessId/audit")
  @ApiOperation({ summary: "Search the append-only audit history" })
  listAuditEvents(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Query() query: Record<string, string>,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.listAuditEvents(
      businessId,
      identity.userId,
      auditQuerySchema.parse(query),
    );
  }

  @Get("businesses/:businessId/document-numbers")
  @ApiOperation({ summary: "Read document number settings and the next number preview" })
  listDocumentSequences(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.listDocumentSequences(businessId, identity.userId);
  }

  @Put("businesses/:businessId/document-numbers")
  @ApiOperation({ summary: "Create or update one document number sequence" })
  upsertDocumentSequence(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.upsertDocumentSequence(
      businessId,
      identity.userId,
      upsertDocumentSequenceSchema.parse(body),
    );
  }

  @Post("businesses/:businessId/document-numbers/next")
  @ApiOperation({ summary: "Allocate the next readable document number safely" })
  async nextDocumentNumber(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    const number = await this.businessAccess.nextDocumentNumber(
      businessId,
      identity.userId,
      nextDocumentNumberSchema.parse(body),
    );
    return { number };
  }

  @Get("businesses/:businessId/theme")
  @ApiOperation({ summary: "Read the saved Business theme" })
  getBusinessTheme(@Param("businessId") businessId: string, @Headers() headers: RequestHeaders) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.getBusinessTheme(businessId, identity.userId);
  }

  @Put("businesses/:businessId/theme")
  @ApiOperation({ summary: "Update the Business theme with optimistic concurrency" })
  updateBusinessTheme(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.businessAccess.updateBusinessTheme(
      businessId,
      identity.userId,
      updateBusinessThemeSchema.parse(body),
    );
  }
}
