import { BadRequestException } from "@nestjs/common";
import { assertDevelopmentAuthMode, readDevelopmentIdentity } from "@bizentra/auth";

export function identityForBusiness(
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
