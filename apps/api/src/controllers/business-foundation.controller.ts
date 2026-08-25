import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { assertDevelopmentAuthMode, readDevelopmentIdentity } from "@bizentra/auth";
import {
  createBranchSchema,
  createBusinessFoundationSchema,
  nextDocumentNumberSchema,
  updateBusinessThemeSchema,
} from "@bizentra/contracts";
import { BusinessAccessService } from "@bizentra/domain-business-access";

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
  @ApiOperation({ summary: "Read the current P0 Business foundation" })
  getFoundation(
    @Param("businessId") businessId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const identity = this.identityForBusiness(headers, businessId);
    return this.businessAccess.getBusinessFoundation(businessId, identity.userId);
  }

  @Post("businesses/:businessId/branches")
  @ApiOperation({ summary: "Create another Branch and optional first Location" })
  createBranch(
    @Param("businessId") businessId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
  ) {
    const identity = this.identityForBusiness(headers, businessId);
    return this.businessAccess.createBranch(
      businessId,
      identity.userId,
      createBranchSchema.parse(body),
    );
  }

  @Get("businesses/:businessId/theme")
  @ApiOperation({ summary: "Read the saved Business theme" })
  getBusinessTheme(
    @Param("businessId") businessId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const identity = this.identityForBusiness(headers, businessId);
    return this.businessAccess.getBusinessTheme(businessId, identity.userId);
  }

  @Put("businesses/:businessId/theme")
  @ApiOperation({ summary: "Update the Business theme with optimistic concurrency" })
  updateBusinessTheme(
    @Param("businessId") businessId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
  ) {
    const identity = this.identityForBusiness(headers, businessId);
    return this.businessAccess.updateBusinessTheme(
      businessId,
      identity.userId,
      updateBusinessThemeSchema.parse(body),
    );
  }

  @Post("businesses/:businessId/document-numbers/next")
  @ApiOperation({ summary: "Allocate the next readable document number safely" })
  async nextDocumentNumber(
    @Param("businessId") businessId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
  ) {
    const identity = this.identityForBusiness(headers, businessId);
    const number = await this.businessAccess.nextDocumentNumber(
      businessId,
      identity.userId,
      nextDocumentNumberSchema.parse(body),
    );
    return { number };
  }

  private identityForBusiness(
    headers: Record<string, string | string[] | undefined>,
    businessId: string,
  ) {
    assertDevelopmentAuthMode(process.env.AUTH_MODE);
    const identity = readDevelopmentIdentity(headers);
    if (identity.businessId !== businessId) {
      throw new BadRequestException("The path Business and x-business-id must match.");
    }
    return identity;
  }
}
