import { z } from "zod";

export const recordStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const locationTypeSchema = z.enum([
  "SHOP_FLOOR",
  "WAREHOUSE",
  "KITCHEN",
  "VAN",
  "SERVICE_BAY",
  "QUARANTINE",
  "OTHER",
]);

const currencyCodeSchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());

const countryCodeSchema = z
  .string()
  .trim()
  .length(2)
  .transform((value) => value.toUpperCase());

const codeSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(/^[A-Za-z0-9_-]+$/)
  .transform((value) => value.toUpperCase());

export const createBusinessFoundationSchema = z.object({
  business: z.object({
    name: z.string().trim().min(2).max(160),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    legalName: z.string().trim().max(200).optional(),
    email: z.email().optional(),
    phone: z.string().trim().max(40).optional(),
    defaultCurrency: currencyCodeSchema,
    timeZone: z.string().trim().min(3).max(80),
    countryCode: countryCodeSchema,
  }),
  firstBranch: z.object({
    code: codeSchema,
    name: z.string().trim().min(2).max(120),
    email: z.email().optional(),
    phone: z.string().trim().max(40).optional(),
  }),
  firstLocation: z.object({
    code: codeSchema,
    name: z.string().trim().min(2).max(120),
    type: locationTypeSchema.default("SHOP_FLOOR"),
  }),
  owner: z.object({
    externalSubject: z.string().trim().min(3).max(200),
    email: z.email(),
    displayName: z.string().trim().min(2).max(160),
  }),
});

export const createBranchSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(2).max(120),
  email: z.email().optional(),
  phone: z.string().trim().max(40).optional(),
  firstLocation: z
    .object({
      code: codeSchema,
      name: z.string().trim().min(2).max(120),
      type: locationTypeSchema.default("SHOP_FLOOR"),
    })
    .optional(),
});

export const nextDocumentNumberSchema = z.object({
  documentType: codeSchema,
  branchId: z.uuid().optional(),
});

export const developmentIdentitySchema = z.object({
  userId: z.uuid(),
  businessId: z.uuid(),
});

export type CreateBusinessFoundationInput = z.input<typeof createBusinessFoundationSchema>;
export type CreateBranchInput = z.input<typeof createBranchSchema>;
export type NextDocumentNumberInput = z.input<typeof nextDocumentNumberSchema>;

export interface BusinessFoundationCreated {
  businessId: string;
  branchId: string;
  locationId: string;
  ownerUserId: string;
  ownerMembershipId: string;
  ownerRoleId: string;
}

export interface BusinessFoundationSummary {
  business: {
    id: string;
    name: string;
    slug: string;
    defaultCurrency: string;
    timeZone: string;
    countryCode: string;
    status: "ACTIVE" | "INACTIVE";
  };
  branches: Array<{
    id: string;
    code: string;
    name: string;
    status: "ACTIVE" | "INACTIVE";
    locations: Array<{
      id: string;
      code: string;
      name: string;
      type: z.infer<typeof locationTypeSchema>;
      status: "ACTIVE" | "INACTIVE";
    }>;
  }>;
  enabledFeatures: string[];
  memberships: number;
  roles: number;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  service: string;
  version: string;
  checks?: Record<string, "up" | "down">;
  timestamp: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  requestId?: string;
  details?: unknown;
}
