import type {
  AccessOverview,
  AddPaymentInput,
  AdjustLoyaltyInput,
  ApiErrorBody,
  ApprovalOverview,
  AuditEventRow,
  AuditQuery,
  BusinessFoundationCreated,
  BusinessFoundationSummary,
  BusinessEnginesOverview,
  BusinessThemeSettings,
  CashMovementInput,
  CatalogRecordCreated,
  CatalogReferenceData,
  CatalogSearchQuery,
  CatalogSummary,
  CloseShiftInput,
  CollectCustomerPaymentInput,
  CreateApprovalRequestInput,
  CreateAttributeDefinitionInput,
  AttachBusinessDocumentInput,
  CreateBankAccountInput,
  CreateBomInput,
  CreateBookingInput,
  CreateBranchInput,
  CreateBrandInput,
  CreateBusinessFoundationInput,
  CreateCategoryInput,
  CreateCustomerAssetInput,
  CreateCustomerGroupInput,
  CreateCustomerInvoiceInput,
  CreateCustomerInput,
  CreateDeliveryRouteInput,
  CreateExpenseCategoryInput,
  CreateExpenseInput,
  CreateExchangeInput,
  CreateFulfillmentOrderInput,
  CreateImportBatchInput,
  CreateItemIdentifierInput,
  CreateItemInput,
  CreateItemTagInput,
  CreateItemVariantInput,
  CreateLocationInput,
  CreateMigrationValidationInput,
  CreateNotificationEventInput,
  CreatePriceListInput,
  CreatePrivacyRequestInput,
  CreatePromotionInput,
  CreatePurchaseOrderInput,
  CreatePurchaseRequestInput,
  CreateReleaseReadinessInput,
  CreateReturnInput,
  CreateRoleInput,
  CreateSaleInput,
  CreateSavedReportViewInput,
  CreateSupplierBillInput,
  CreateSupplierInput,
  CreateTaxCategoryInput,
  CreateTaxRateInput,
  CreateTraceableUnitInput,
  CreateUnitConversionInput,
  CreateUnitInput,
  CreateWarrantyClaimInput,
  CreateWebhookSubscriptionInput,
  CreateStockCountInput,
  CreateWorkflowStatusInput,
  CreateWorkflowTransitionInput,
  CreateWorkTicketInput,
  CustomerDetail,
  CustomerListRow,
  DecideApprovalRequestInput,
  DecidePurchaseRequestInput,
  DocumentSequenceRow,
  ExchangeResult,
  FeatureRow,
  FinanceOverview,
  HeartbeatDeviceInput,
  HealthResponse,
  ImportApplied,
  ImportBatchSummary,
  ImportEntityKind,
  ImportPreview,
  InventoryOverview,
  InviteUserInput,
  ItemCreated,
  ItemDetail,
  ItemListRow,
  ListQuery,
  NextDocumentNumberInput,
  OpenShiftInput,
  P1DefaultsCreated,
  Paginated,
  PaySupplierBillInput,
  PosCatalogEntry,
  PostBankTransferInput,
  PostBankTransactionInput,
  PostMaterialConsumptionInput,
  PostStockCountInput,
  QueueOfflineOperationInput,
  PromotionRow,
  ProductionReadinessOverview,
  QuoteSaleInput,
  ReceiptDocument,
  RegisterDeviceInput,
  ReceivePurchaseOrderInput,
  RecordBackupRunInput,
  RecordSecurityEventInput,
  RecordWebhookDeliveryInput,
  ReportingOperationsOverview,
  RequestDataExportInput,
  ReorderSettingInput,
  ResolvePaymentInput,
  ResolvePrivacyRequestInput,
  ResolveSyncConflictInput,
  ReturnResult,
  SaleDetail,
  SaleListRow,
  SaleQuery,
  SaleQuote,
  SetFeatureInput,
  SetItemAttributeValuesInput,
  ShiftSummary,
  StoreReliabilityOverview,
  StockAdjustmentInput,
  StockTransferInput,
  SupplierDetail,
  SupplierListRow,
  SyncQueueInput,
  SyncResultEntry,
  MarkOfflineQueueItemInput,
  UpdateBranchInput,
  UpdateBrandInput,
  UpdateBusinessInput,
  UpdateBusinessThemeInput,
  UpdateCategoryInput,
  UpdateCustomerInput,
  UpdateDeliveryStopInput,
  UpdateFulfillmentStatusInput,
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
  UpdateWorkTicketStatusInput,
  UpsertReadinessCheckInput,
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

    /* ------------------------------------------- P3 inventory/purchasing */
    getInventoryOverview: (businessId: string) =>
      request<InventoryOverview>(`/businesses/${businessId}/inventory/overview`),
    adjustStock: (businessId: string, input: StockAdjustmentInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/inventory/adjustments`, input),
    transferStock: (businessId: string, input: StockTransferInput) =>
      post<{ outMovementId: string; inMovementId: string }>(
        `/businesses/${businessId}/inventory/transfers`,
        input,
      ),
    createStockCount: (businessId: string, input: CreateStockCountInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/inventory/stock-counts`, input),
    postStockCount: (businessId: string, stockCountId: string, input: PostStockCountInput) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/inventory/stock-counts/${stockCountId}/post`,
        input,
      ),
    upsertReorderSetting: (businessId: string, input: ReorderSettingInput) =>
      put<CatalogRecordCreated>(`/businesses/${businessId}/inventory/reorder-settings`, input),
    createPurchaseRequest: (businessId: string, input: CreatePurchaseRequestInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/inventory/purchase-requests`, input),
    decidePurchaseRequest: (
      businessId: string,
      requestId: string,
      input: DecidePurchaseRequestInput,
    ) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/inventory/purchase-requests/${requestId}/decision`,
        input,
      ),
    createPurchaseOrder: (businessId: string, input: CreatePurchaseOrderInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/inventory/purchase-orders`, input),
    receivePurchaseOrder: (
      businessId: string,
      purchaseOrderId: string,
      input: ReceivePurchaseOrderInput,
    ) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/inventory/purchase-orders/${purchaseOrderId}/receipts`,
        input,
      ),
    createFulfillmentOrder: (businessId: string, input: CreateFulfillmentOrderInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/inventory/fulfillment-orders`, input),
    updateFulfillmentStatus: (
      businessId: string,
      fulfillmentOrderId: string,
      input: UpdateFulfillmentStatusInput,
    ) =>
      put<CatalogRecordCreated>(
        `/businesses/${businessId}/inventory/fulfillment-orders/${fulfillmentOrderId}/status`,
        input,
      ),

    /* ------------------------------------------- P4 finance foundation */
    getFinanceOverview: (businessId: string) =>
      request<FinanceOverview>(`/businesses/${businessId}/finance/overview`),
    createCustomerInvoice: (businessId: string, input: CreateCustomerInvoiceInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/finance/customer-invoices`, input),
    collectCustomerPayment: (businessId: string, input: CollectCustomerPaymentInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/finance/customer-collections`, input),
    createSupplierBill: (businessId: string, input: CreateSupplierBillInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/finance/supplier-bills`, input),
    paySupplierBill: (businessId: string, input: PaySupplierBillInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/finance/supplier-payments`, input),
    createExpenseCategory: (businessId: string, input: CreateExpenseCategoryInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/finance/expense-categories`, input),
    createExpense: (businessId: string, input: CreateExpenseInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/finance/expenses`, input),
    createBankAccount: (businessId: string, input: CreateBankAccountInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/finance/bank-accounts`, input),
    postBankTransaction: (businessId: string, input: PostBankTransactionInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/finance/bank-transactions`, input),
    postBankTransfer: (businessId: string, input: PostBankTransferInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/finance/bank-transfers`, input),
    adjustLoyalty: (businessId: string, input: AdjustLoyaltyInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/finance/loyalty-adjustments`, input),

    /* ------------------------------------------- P5 reusable business engines */
    getBusinessEnginesOverview: (businessId: string) =>
      request<BusinessEnginesOverview>(`/businesses/${businessId}/business-engines/overview`),
    createWorkflowStatus: (businessId: string, input: CreateWorkflowStatusInput) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/business-engines/workflow-statuses`,
        input,
      ),
    createWorkflowTransition: (businessId: string, input: CreateWorkflowTransitionInput) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/business-engines/workflow-transitions`,
        input,
      ),
    createWorkTicket: (businessId: string, input: CreateWorkTicketInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/business-engines/work-tickets`, input),
    updateWorkTicketStatus: (
      businessId: string,
      ticketId: string,
      input: UpdateWorkTicketStatusInput,
    ) =>
      patch<CatalogRecordCreated>(
        `/businesses/${businessId}/business-engines/work-tickets/${ticketId}/status`,
        input,
      ),
    createBooking: (businessId: string, input: CreateBookingInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/business-engines/bookings`, input),
    createCustomerAsset: (businessId: string, input: CreateCustomerAssetInput) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/business-engines/customer-assets`,
        input,
      ),
    createTraceableUnit: (businessId: string, input: CreateTraceableUnitInput) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/business-engines/traceable-units`,
        input,
      ),
    createWarrantyClaim: (businessId: string, input: CreateWarrantyClaimInput) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/business-engines/warranty-claims`,
        input,
      ),
    createBom: (businessId: string, input: CreateBomInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/business-engines/boms`, input),
    postMaterialConsumption: (businessId: string, input: PostMaterialConsumptionInput) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/business-engines/material-consumptions`,
        input,
      ),
    createDeliveryRoute: (businessId: string, input: CreateDeliveryRouteInput) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/business-engines/delivery-routes`,
        input,
      ),
    updateDeliveryStop: (businessId: string, stopId: string, input: UpdateDeliveryStopInput) =>
      patch<CatalogRecordCreated>(
        `/businesses/${businessId}/business-engines/delivery-stops/${stopId}`,
        input,
      ),
    createNotificationEvent: (businessId: string, input: CreateNotificationEventInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/business-engines/notifications`, input),
    attachBusinessDocument: (businessId: string, input: AttachBusinessDocumentInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/business-engines/documents`, input),

    /* ------------------------------------------- P6 store reliability */
    getStoreReliabilityOverview: (businessId: string) =>
      request<StoreReliabilityOverview>(`/businesses/${businessId}/store-reliability/overview`),
    registerDevice: (businessId: string, input: RegisterDeviceInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/store-reliability/devices`, input),
    heartbeatDevice: (businessId: string, deviceId: string, input: HeartbeatDeviceInput) =>
      patch<CatalogRecordCreated>(
        `/businesses/${businessId}/store-reliability/devices/${deviceId}/heartbeat`,
        input,
      ),
    queueOfflineOperation: (businessId: string, input: QueueOfflineOperationInput) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/store-reliability/offline-queue`,
        input,
      ),
    markOfflineQueueItem: (
      businessId: string,
      queueItemId: string,
      input: MarkOfflineQueueItemInput,
    ) =>
      patch<CatalogRecordCreated>(
        `/businesses/${businessId}/store-reliability/offline-queue/${queueItemId}`,
        input,
      ),
    resolveSyncConflict: (
      businessId: string,
      conflictId: string,
      input: ResolveSyncConflictInput,
    ) =>
      patch<CatalogRecordCreated>(
        `/businesses/${businessId}/store-reliability/sync-conflicts/${conflictId}`,
        input,
      ),

    /* -------------------------------- P7 reporting, integrations and migration */
    getReportingOperationsOverview: (businessId: string) =>
      request<ReportingOperationsOverview>(
        `/businesses/${businessId}/reporting-operations/overview`,
      ),
    createSavedReportView: (businessId: string, input: CreateSavedReportViewInput) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/reporting-operations/report-views`,
        input,
      ),
    requestDataExport: (businessId: string, input: RequestDataExportInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/reporting-operations/exports`, input),
    createWebhookSubscription: (businessId: string, input: CreateWebhookSubscriptionInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/reporting-operations/webhooks`, input),
    recordWebhookDelivery: (businessId: string, input: RecordWebhookDeliveryInput) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/reporting-operations/webhook-deliveries`,
        input,
      ),
    createMigrationValidation: (businessId: string, input: CreateMigrationValidationInput) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/reporting-operations/migration-validations`,
        input,
      ),

    /* ------------------------------- P8 security and production readiness */
    getProductionReadinessOverview: (businessId: string) =>
      request<ProductionReadinessOverview>(
        `/businesses/${businessId}/production-readiness/overview`,
      ),
    recordSecurityEvent: (businessId: string, input: RecordSecurityEventInput) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/production-readiness/security-events`,
        input,
      ),
    recordBackupRun: (businessId: string, input: RecordBackupRunInput) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/production-readiness/backup-runs`,
        input,
      ),
    upsertReadinessCheck: (businessId: string, input: UpsertReadinessCheckInput) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/production-readiness/readiness-checks`,
        input,
      ),
    createPrivacyRequest: (businessId: string, input: CreatePrivacyRequestInput) =>
      post<CatalogRecordCreated>(
        `/businesses/${businessId}/production-readiness/privacy-requests`,
        input,
      ),
    resolvePrivacyRequest: (
      businessId: string,
      privacyRequestId: string,
      input: ResolvePrivacyRequestInput,
    ) =>
      patch<CatalogRecordCreated>(
        `/businesses/${businessId}/production-readiness/privacy-requests/${privacyRequestId}`,
        input,
      ),
    createReleaseReadiness: (businessId: string, input: CreateReleaseReadinessInput) =>
      post<CatalogRecordCreated>(`/businesses/${businessId}/production-readiness/releases`, input),

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
