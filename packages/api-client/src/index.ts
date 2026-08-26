import type {
  AccessOverview,
  AddPaymentInput,
  ApiErrorBody,
  ApprovalOverview,
  AuditEventRow,
  AuditQuery,
  BusinessFoundationCreated,
  BusinessFoundationSummary,
  BusinessThemeSettings,
  CashMovementInput,
  CatalogRecordCreated,
  CatalogReferenceData,
  CatalogSearchQuery,
  CatalogSummary,
  CloseShiftInput,
  CreateApprovalRequestInput,
  CreateAttributeDefinitionInput,
  CreateBranchInput,
  CreateBrandInput,
  CreateBusinessFoundationInput,
  CreateCategoryInput,
  CreateCustomerGroupInput,
  CreateCustomerInput,
  CreateExchangeInput,
  CreateImportBatchInput,
  CreateItemIdentifierInput,
  CreateItemInput,
  CreateItemTagInput,
  CreateItemVariantInput,
  CreateLocationInput,
  CreatePriceListInput,
  CreatePromotionInput,
  CreateReturnInput,
  CreateRoleInput,
  CreateSaleInput,
  CreateSupplierInput,
  CreateTaxCategoryInput,
  CreateTaxRateInput,
  CreateUnitConversionInput,
  CreateUnitInput,
  CustomerDetail,
  CustomerListRow,
  DecideApprovalRequestInput,
  DocumentSequenceRow,
  ExchangeResult,
  FeatureRow,
  HealthResponse,
  ImportApplied,
  ImportBatchSummary,
  ImportEntityKind,
  ImportPreview,
  InviteUserInput,
  ItemCreated,
  ItemDetail,
  ItemListRow,
  ListQuery,
  NextDocumentNumberInput,
  OpenShiftInput,
  P1DefaultsCreated,
  Paginated,
  PosCatalogEntry,
  PromotionRow,
  QuoteSaleInput,
  ReceiptDocument,
  ResolvePaymentInput,
  ReturnResult,
  SaleDetail,
  SaleListRow,
  SaleQuery,
  SaleQuote,
  SetFeatureInput,
  SetItemAttributeValuesInput,
  ShiftSummary,
  SupplierDetail,
  SupplierListRow,
  SyncQueueInput,
  SyncResultEntry,
  UpdateBranchInput,
  UpdateBrandInput,
  UpdateBusinessInput,
  UpdateBusinessThemeInput,
  UpdateCategoryInput,
  UpdateCustomerInput,
  UpdateHeldSaleInput,
  UpdateItemInput,
  UpdateLocationInput,
  UpdateMembershipInput,
  UpdatePriceListInput,
  UpdatePromotionInput,
  UpdateRoleInput,
  UpdateSupplierInput,
  UpdateTaxCategoryInput,
  UpdateTaxRateInput,
  UpdateUnitInput,
  UpsertApprovalPolicyInput,
  UpsertDocumentSequenceInput,
  UpsertItemPriceInput,
  UpsertSupplierItemInput,
  ValidateImportInput,
  VoidSaleInput,
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

type QueryValue = string | number | boolean | undefined | null;

function toQuery(params: Record<string, QueryValue> | undefined): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, typeof value === "string" ? value : String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
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

  const post = <T>(path: string, input?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(input ?? {}) });
  const put = <T>(path: string, input?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(input ?? {}) });
  const patch = <T>(path: string, input?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(input ?? {}) });

  return {
    health: () => request<HealthResponse>("/health/ready"),

    /* ------------------------------------------------------ P0 foundation */
    createBusinessFoundation: (input: CreateBusinessFoundationInput) =>
      post<BusinessFoundationCreated>("/setup/business-foundation", input),
    getBusinessFoundation: (businessId: string) =>
      request<BusinessFoundationSummary>(`/businesses/${businessId}/foundation`),
    updateBusiness: (businessId: string, input: UpdateBusinessInput) =>
      patch<{ id: string }>(`/businesses/${businessId}`, input),
    createBranch: (businessId: string, input: CreateBranchInput) =>
      post<{ branchId: string; locationId?: string }>(`/businesses/${businessId}/branches`, input),
    updateBranch: (businessId: string, branchId: string, input: UpdateBranchInput) =>
      patch<{ id: string }>(`/businesses/${businessId}/branches/${branchId}`, input),
    createLocation: (businessId: string, input: CreateLocationInput) =>
      post<{ id: string }>(`/businesses/${businessId}/locations`, input),
    updateLocation: (businessId: string, locationId: string, input: UpdateLocationInput) =>
      patch<{ id: string }>(`/businesses/${businessId}/locations/${locationId}`, input),

    getAccessOverview: (businessId: string) =>
      request<AccessOverview>(`/businesses/${businessId}/access`),
    inviteUser: (businessId: string, input: InviteUserInput) =>
      post<{ membershipId: string; userId: string }>(`/businesses/${businessId}/users`, input),
    updateMembership: (businessId: string, membershipId: string, input: UpdateMembershipInput) =>
      patch<{ id: string }>(`/businesses/${businessId}/users/${membershipId}`, input),
    createRole: (businessId: string, input: CreateRoleInput) =>
      post<{ id: string }>(`/businesses/${businessId}/roles`, input),
    updateRole: (businessId: string, roleId: string, input: UpdateRoleInput) =>
      patch<{ id: string }>(`/businesses/${businessId}/roles/${roleId}`, input),

    getApprovals: (businessId: string) =>
      request<ApprovalOverview>(`/businesses/${businessId}/approvals`),
    upsertApprovalPolicy: (businessId: string, input: UpsertApprovalPolicyInput) =>
      put<{ id: string }>(`/businesses/${businessId}/approvals/policies`, input),
    createApprovalRequest: (businessId: string, input: CreateApprovalRequestInput) =>
      post<{ id: string; status: string }>(`/businesses/${businessId}/approvals/requests`, input),
    decideApprovalRequest: (
      businessId: string,
      requestId: string,
      input: DecideApprovalRequestInput,
    ) =>
      post<{ id: string; status: string }>(
        `/businesses/${businessId}/approvals/requests/${requestId}/decision`,
        input,
      ),

    listFeatures: (businessId: string) =>
      request<FeatureRow[]>(`/businesses/${businessId}/features`),
    setFeature: (businessId: string, input: SetFeatureInput) =>
      put<{ key: string; enabled: boolean }>(`/businesses/${businessId}/features`, input),

    listAuditEvents: (businessId: string, query: Partial<AuditQuery> = {}) =>
      request<Paginated<AuditEventRow>>(`/businesses/${businessId}/audit${toQuery(query)}`),

    listDocumentSequences: (businessId: string) =>
      request<DocumentSequenceRow[]>(`/businesses/${businessId}/document-numbers`),
    upsertDocumentSequence: (businessId: string, input: UpsertDocumentSequenceInput) =>
      put<{ id: string; nextNumberPreview: string }>(
        `/businesses/${businessId}/document-numbers`,
        input,
      ),
    nextDocumentNumber: (businessId: string, input: NextDocumentNumberInput) =>
      post<{ number: string }>(`/businesses/${businessId}/document-numbers/next`, input),

    getBusinessTheme: (businessId: string) =>
      request<BusinessThemeSettings>(`/businesses/${businessId}/theme`),
    updateBusinessTheme: (businessId: string, input: UpdateBusinessThemeInput) =>
      put<BusinessThemeSettings>(`/businesses/${businessId}/theme`, input),

    /* ----------------------------------------------------- P1 master data */
    ensureP1Defaults: (businessId: string) =>
      post<P1DefaultsCreated>(`/businesses/${businessId}/catalog/defaults`),
    getCatalogSummary: (businessId: string) =>
      request<CatalogSummary>(`/businesses/${businessId}/catalog/summary`),
    getCatalogReference: (businessId: string) =>
      request<CatalogReferenceData>(`/businesses/${businessId}/catalog/reference`),

    createUnit: (businessId: string, input: CreateUnitInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/catalog/units`, input),
    updateUnit: (businessId: string, unitId: string, input: UpdateUnitInput) =>
      patch<CatalogRecordCreated>(`/businesses/${businessId}/catalog/units/${unitId}`, input),
    createUnitConversion: (businessId: string, input: CreateUnitConversionInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/catalog/unit-conversions`, input),

    createCategory: (businessId: string, input: CreateCategoryInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/catalog/categories`, input),
    updateCategory: (businessId: string, categoryId: string, input: UpdateCategoryInput) =>
      patch<CatalogRecordCreated>(
        `/businesses/${businessId}/catalog/categories/${categoryId}`,
        input,
      ),
    createBrand: (businessId: string, input: CreateBrandInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/catalog/brands`, input),
    updateBrand: (businessId: string, brandId: string, input: UpdateBrandInput) =>
      patch<CatalogRecordCreated>(`/businesses/${businessId}/catalog/brands/${brandId}`, input),
    createItemTag: (businessId: string, input: CreateItemTagInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/catalog/tags`, input),
    createAttribute: (businessId: string, input: CreateAttributeDefinitionInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/catalog/attributes`, input),

    createTaxCategory: (businessId: string, input: CreateTaxCategoryInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/catalog/tax-categories`, input),
    updateTaxCategory: (businessId: string, taxCategoryId: string, input: UpdateTaxCategoryInput) =>
      patch<CatalogRecordCreated>(
        `/businesses/${businessId}/catalog/tax-categories/${taxCategoryId}`,
        input,
      ),
    createTaxRate: (businessId: string, input: CreateTaxRateInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/catalog/tax-rates`, input),
    updateTaxRate: (businessId: string, taxRateId: string, input: UpdateTaxRateInput) =>
      patch<CatalogRecordCreated>(
        `/businesses/${businessId}/catalog/tax-rates/${taxRateId}`,
        input,
      ),

    createPriceList: (businessId: string, input: CreatePriceListInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/catalog/price-lists`, input),
    updatePriceList: (businessId: string, priceListId: string, input: UpdatePriceListInput) =>
      patch<CatalogRecordCreated>(
        `/businesses/${businessId}/catalog/price-lists/${priceListId}`,
        input,
      ),

    listItems: (businessId: string, query: Partial<ListQuery> = {}) =>
      request<Paginated<ItemListRow>>(`/businesses/${businessId}/catalog/items${toQuery(query)}`),
    getItem: (businessId: string, itemId: string) =>
      request<ItemDetail>(`/businesses/${businessId}/catalog/items/${itemId}`),
    createItem: (businessId: string, input: CreateItemInput) =>
      post<ItemCreated>(`/businesses/${businessId}/catalog/items`, input),
    updateItem: (businessId: string, itemId: string, input: UpdateItemInput) =>
      patch<CatalogRecordCreated>(`/businesses/${businessId}/catalog/items/${itemId}`, input),
    createItemVariant: (businessId: string, itemId: string, input: CreateItemVariantInput) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/catalog/items/${itemId}/variants`,
        input,
      ),
    createItemIdentifier: (businessId: string, itemId: string, input: CreateItemIdentifierInput) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/catalog/items/${itemId}/identifiers`,
        input,
      ),
    upsertItemPrice: (businessId: string, itemId: string, input: UpsertItemPriceInput) =>
      put<CatalogRecordCreated>(`/businesses/${businessId}/catalog/items/${itemId}/prices`, input),
    assignItemTags: (businessId: string, itemId: string, tagIds: string[]) =>
      put<CatalogRecordCreated>(`/businesses/${businessId}/catalog/items/${itemId}/tags`, {
        tagIds,
      }),
    setItemAttributes: (businessId: string, itemId: string, input: SetItemAttributeValuesInput) =>
      put<CatalogRecordCreated>(
        `/businesses/${businessId}/catalog/items/${itemId}/attributes`,
        input,
      ),

    listPromotions: (businessId: string) =>
      request<PromotionRow[]>(`/businesses/${businessId}/catalog/promotions`),
    createPromotion: (businessId: string, input: CreatePromotionInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/catalog/promotions`, input),
    updatePromotion: (businessId: string, promotionId: string, input: UpdatePromotionInput) =>
      patch<CatalogRecordCreated>(
        `/businesses/${businessId}/catalog/promotions/${promotionId}`,
        input,
      ),

    listCustomers: (businessId: string, query: Partial<ListQuery> = {}) =>
      request<Paginated<CustomerListRow>>(
        `/businesses/${businessId}/catalog/customers${toQuery(query)}`,
      ),
    getCustomer: (businessId: string, customerId: string) =>
      request<CustomerDetail>(`/businesses/${businessId}/catalog/customers/${customerId}`),
    createCustomerGroup: (businessId: string, input: CreateCustomerGroupInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/catalog/customer-groups`, input),
    createCustomer: (businessId: string, input: CreateCustomerInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/catalog/customers`, input),
    updateCustomer: (businessId: string, customerId: string, input: UpdateCustomerInput) =>
      patch<CatalogRecordCreated>(
        `/businesses/${businessId}/catalog/customers/${customerId}`,
        input,
      ),

    listSuppliers: (businessId: string, query: Partial<ListQuery> = {}) =>
      request<Paginated<SupplierListRow>>(
        `/businesses/${businessId}/catalog/suppliers${toQuery(query)}`,
      ),
    getSupplier: (businessId: string, supplierId: string) =>
      request<SupplierDetail>(`/businesses/${businessId}/catalog/suppliers/${supplierId}`),
    createSupplier: (businessId: string, input: CreateSupplierInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/catalog/suppliers`, input),
    updateSupplier: (businessId: string, supplierId: string, input: UpdateSupplierInput) =>
      patch<CatalogRecordCreated>(
        `/businesses/${businessId}/catalog/suppliers/${supplierId}`,
        input,
      ),
    upsertSupplierItem: (businessId: string, supplierId: string, input: UpsertSupplierItemInput) =>
      put<CatalogRecordCreated>(
        `/businesses/${businessId}/catalog/suppliers/${supplierId}/items`,
        input,
      ),

    createImportBatch: (businessId: string, input: CreateImportBatchInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/catalog/import-batches`, input),
    getImportTemplate: (businessId: string, entityKind: ImportEntityKind) =>
      request<{
        fileName: string;
        content: string;
        columns: Array<{ name: string; required: boolean; hint: string }>;
      }>(`/businesses/${businessId}/imports/template${toQuery({ entityKind })}`),
    listImportBatches: (businessId: string) =>
      request<ImportBatchSummary[]>(`/businesses/${businessId}/imports`),
    validateImport: (businessId: string, input: ValidateImportInput) =>
      post<ImportPreview>(`/businesses/${businessId}/imports/validate`, input),
    getImportPreview: (businessId: string, batchId: string) =>
      request<ImportPreview>(`/businesses/${businessId}/imports/${batchId}`),
    applyImport: (businessId: string, batchId: string) =>
      post<ImportApplied>(`/businesses/${businessId}/imports/${batchId}/apply`),
    rollbackImport: (businessId: string, batchId: string) =>
      post<ImportBatchSummary>(`/businesses/${businessId}/imports/${batchId}/rollback`),

    /* ------------------------------------------------------------- P2 POS */
    openShift: (businessId: string, input: OpenShiftInput) =>
      post<ShiftSummary>(`/businesses/${businessId}/pos/shifts`, input),
    listShifts: (businessId: string) =>
      request<ShiftSummary[]>(`/businesses/${businessId}/pos/shifts`),
    getCurrentShift: (businessId: string, branchId: string, registerCode: string) =>
      request<ShiftSummary | null>(
        `/businesses/${businessId}/pos/shifts/current${toQuery({ branchId, registerCode })}`,
      ),
    addCashMovement: (businessId: string, shiftId: string, input: CashMovementInput) =>
      post<ShiftSummary>(`/businesses/${businessId}/pos/shifts/${shiftId}/cash-movements`, input),
    closeShift: (businessId: string, shiftId: string, input: CloseShiftInput) =>
      post<ShiftSummary>(`/businesses/${businessId}/pos/shifts/${shiftId}/close`, input),

    searchPosCatalog: (businessId: string, query: Partial<CatalogSearchQuery> = {}) =>
      request<PosCatalogEntry[]>(`/businesses/${businessId}/pos/catalog${toQuery(query)}`),
    quoteSale: (businessId: string, input: QuoteSaleInput) =>
      post<SaleQuote>(`/businesses/${businessId}/pos/quote`, input),
    createSale: (businessId: string, input: CreateSaleInput) =>
      post<SaleDetail>(`/businesses/${businessId}/pos/sales`, input),
    listSales: (businessId: string, query: Partial<SaleQuery> = {}) =>
      request<Paginated<SaleListRow>>(`/businesses/${businessId}/pos/sales${toQuery(query)}`),
    getSale: (businessId: string, saleId: string) =>
      request<SaleDetail>(`/businesses/${businessId}/pos/sales/${saleId}`),
    updateHeldSale: (businessId: string, saleId: string, input: UpdateHeldSaleInput) =>
      put<SaleDetail>(`/businesses/${businessId}/pos/sales/${saleId}`, input),
    confirmSale: (businessId: string, saleId: string, input: { shiftId?: string } = {}) =>
      post<SaleDetail>(`/businesses/${businessId}/pos/sales/${saleId}/confirm`, input),
    voidSale: (businessId: string, saleId: string, input: VoidSaleInput) =>
      post<SaleDetail>(`/businesses/${businessId}/pos/sales/${saleId}/void`, input),
    addPayment: (businessId: string, saleId: string, input: AddPaymentInput) =>
      post<SaleDetail>(`/businesses/${businessId}/pos/sales/${saleId}/payments`, input),
    resolvePayment: (businessId: string, paymentId: string, input: ResolvePaymentInput) =>
      post<SaleDetail>(`/businesses/${businessId}/pos/payments/${paymentId}/resolve`, input),
    getReceipt: (businessId: string, saleId: string) =>
      request<ReceiptDocument>(`/businesses/${businessId}/pos/sales/${saleId}/receipt`),
    createReturn: (businessId: string, saleId: string, input: CreateReturnInput) =>
      post<ReturnResult>(`/businesses/${businessId}/pos/sales/${saleId}/returns`, input),
    createExchange: (businessId: string, saleId: string, input: CreateExchangeInput) =>
      post<ExchangeResult>(`/businesses/${businessId}/pos/sales/${saleId}/exchange`, input),
    syncQueue: (businessId: string, input: SyncQueueInput) =>
      post<SyncResultEntry[]>(`/businesses/${businessId}/pos/sync`, input),
  };
}

export type BizentraApiClient = ReturnType<typeof createApiClient>;
