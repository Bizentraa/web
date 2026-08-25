import { developmentIdentitySchema } from "@bizentra/contracts";

export interface RequestIdentity {
  userId: string;
  businessId: string;
  mode: "development" | "oidc";
}

export function readDevelopmentIdentity(
  headers: Record<string, string | string[] | undefined>,
): RequestIdentity {
  const parsed = developmentIdentitySchema.parse({
    userId: firstHeader(headers["x-user-id"]),
    businessId: firstHeader(headers["x-business-id"]),
  });

  return { ...parsed, mode: "development" };
}

export function assertDevelopmentAuthMode(mode: string | undefined): void {
  if ((mode ?? "development") !== "development") {
    throw new Error(
      "OIDC authentication is not connected yet. Set AUTH_MODE=development only for local P0 work.",
    );
  }
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
