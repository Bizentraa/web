import type {
  ApiErrorBody,
  BusinessFoundationCreated,
  BusinessFoundationSummary,
  CreateBranchInput,
  CreateBusinessFoundationInput,
  HealthResponse,
  NextDocumentNumberInput,
} from "@bizentra/contracts";

export interface ApiIdentity {
  businessId: string;
  userId: string;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message);
  }
}

export function createApiClient(baseUrl: string, identity?: ApiIdentity) {
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(identity ? { "x-business-id": identity.businessId, "x-user-id": identity.userId } : {}),
        ...init?.headers,
      },
    });

    const body = (await response.json()) as T | ApiErrorBody;
    if (!response.ok) throw new ApiClientError(response.status, body as ApiErrorBody);
    return body as T;
  };

  return {
    health: () => request<HealthResponse>("/health/ready"),
    createBusinessFoundation: (input: CreateBusinessFoundationInput) =>
      request<BusinessFoundationCreated>("/setup/business-foundation", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    getBusinessFoundation: (businessId: string) =>
      request<BusinessFoundationSummary>(`/businesses/${businessId}/foundation`),
    createBranch: (businessId: string, input: CreateBranchInput) =>
      request<{ branchId: string; locationId?: string }>(`/businesses/${businessId}/branches`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    nextDocumentNumber: (businessId: string, input: NextDocumentNumberInput) =>
      request<{ number: string }>(`/businesses/${businessId}/document-numbers/next`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
  };
}
