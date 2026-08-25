import type {
  ApiErrorBody,
  BusinessFoundationCreated,
  BusinessFoundationSummary,
  BusinessThemeSettings,
  CatalogRecordCreated,
  CatalogSummary,
  CreateBranchInput,
  CreateBrandInput,
  CreateBusinessFoundationInput,
  CreateCategoryInput,
  CreateCustomerGroupInput,
  CreateCustomerInput,
  CreateImportBatchInput,
  CreateItemInput,
  CreatePriceListInput,
  CreatePromotionInput,
  CreateSupplierInput,
  CreateTaxCategoryInput,
  CreateUnitInput,
  HealthResponse,
  ItemCreated,
  NextDocumentNumberInput,
  P1DefaultsCreated,
  UpdateBusinessThemeInput,
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
    getBusinessTheme: (businessId: string) =>
      request<BusinessThemeSettings>(`/businesses/${businessId}/theme`),
    updateBusinessTheme: (businessId: string, input: UpdateBusinessThemeInput) =>
      request<BusinessThemeSettings>(`/businesses/${businessId}/theme`, {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    nextDocumentNumber: (businessId: string, input: NextDocumentNumberInput) =>
      request<{ number: string }>(`/businesses/${businessId}/document-numbers/next`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    ensureP1Defaults: (businessId: string) =>
      request<P1DefaultsCreated>(`/businesses/${businessId}/catalog/defaults`, {
        method: "POST",
      }),
    getCatalogSummary: (businessId: string) =>
      request<CatalogSummary>(`/businesses/${businessId}/catalog/summary`),
    createUnit: (businessId: string, input: CreateUnitInput) =>
      request<CatalogRecordCreated>(`/businesses/${businessId}/catalog/units`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    createCategory: (businessId: string, input: CreateCategoryInput) =>
      request<CatalogRecordCreated>(`/businesses/${businessId}/catalog/categories`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    createBrand: (businessId: string, input: CreateBrandInput) =>
      request<CatalogRecordCreated>(`/businesses/${businessId}/catalog/brands`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    createTaxCategory: (businessId: string, input: CreateTaxCategoryInput) =>
      request<CatalogRecordCreated>(`/businesses/${businessId}/catalog/tax-categories`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    createPriceList: (businessId: string, input: CreatePriceListInput) =>
      request<CatalogRecordCreated>(`/businesses/${businessId}/catalog/price-lists`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    createItem: (businessId: string, input: CreateItemInput) =>
      request<ItemCreated>(`/businesses/${businessId}/catalog/items`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    createPromotion: (businessId: string, input: CreatePromotionInput) =>
      request<CatalogRecordCreated>(`/businesses/${businessId}/catalog/promotions`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    createCustomerGroup: (businessId: string, input: CreateCustomerGroupInput) =>
      request<CatalogRecordCreated>(`/businesses/${businessId}/catalog/customer-groups`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    createCustomer: (businessId: string, input: CreateCustomerInput) =>
      request<CatalogRecordCreated>(`/businesses/${businessId}/catalog/customers`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    createSupplier: (businessId: string, input: CreateSupplierInput) =>
      request<CatalogRecordCreated>(`/businesses/${businessId}/catalog/suppliers`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    createImportBatch: (businessId: string, input: CreateImportBatchInput) =>
      request<CatalogRecordCreated>(`/businesses/${businessId}/catalog/import-batches`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
  };
}
