"use client";

import type {
  CatalogReferenceData,
  CustomerListRow,
  PosCatalogEntry,
  ReceiptDocument,
  RefundMethod,
  SaleCartInput,
  SaleDetail,
  SaleListRow,
  SaleQuote,
  StockDisposition,
} from "@bizentra/contracts";
import { useDebouncedValue, useOnlineState } from "@bizentra/design-system/client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import type { Tender } from "@/components/payment-drawer";

import {
  errorMessage,
  useCurrentShift,
  useOfflineQueue,
  usePosApi,
  useRegister,
} from "./pos-session";

export interface CartLine {
  itemId: string;
  code: string;
  name: string;
  unitCode: string;
  unitPrice: number;
  quantity: number;
}

/**
 * Everything the till knows, held above the routes.
 *
 * Selling and returns are two routes, and a route change unmounts the page component. With the
 * state inside the pages, stepping across to check a refund threw away the open ticket, emptied
 * the product grid and re-ran every request - the terminal appeared to reboot each time a cashier
 * touched the navigation, and the header flashed "Register not set" on the way back.
 *
 * A layout is not unmounted when its children change, so this provider is rendered there and the
 * pages read from it. Nothing here refetches on navigation: the reference data, the catalogue
 * search, the current shift, the offline queue and the ticket itself all outlive the screens that
 * display them. The requests that do run are keyed to what they actually depend on - the signed-in
 * Business, the bound register, the search term - so they fire when that changes and not before.
 */
interface PosWorkspaceValue {
  /* terminal */
  api: ReturnType<typeof usePosApi>["api"];
  identity: ReturnType<typeof usePosApi>["identity"];
  online: boolean;
  register: ReturnType<typeof useRegister>["register"];
  setRegister: ReturnType<typeof useRegister>["setRegister"];
  shift: ReturnType<typeof useCurrentShift>["shift"];
  shiftLoading: boolean;
  refreshShift: () => Promise<void>;
  queue: ReturnType<typeof useOfflineQueue>;

  /* reference */
  reference: CatalogReferenceData | null;
  customers: CustomerListRow[];

  /* catalogue */
  term: string;
  setTerm: Dispatch<SetStateAction<string>>;
  categoryId: string;
  setCategoryId: Dispatch<SetStateAction<string>>;
  results: PosCatalogEntry[];
  resultsLoading: boolean;

  /* ticket */
  lines: CartLine[];
  setLines: Dispatch<SetStateAction<CartLine[]>>;
  customerId: string;
  setCustomerId: Dispatch<SetStateAction<string>>;
  saleDiscount: string;
  setSaleDiscount: Dispatch<SetStateAction<string>>;
  coupon: string;
  setCoupon: Dispatch<SetStateAction<string>>;
  quote: SaleQuote | null;
  quoteError: string | null;
  quoting: boolean;
  cart: SaleCartInput | null;
  tenders: Tender[];
  setTenders: Dispatch<SetStateAction<Tender[]>>;
  resumedSaleId: string | null;
  setResumedSaleId: Dispatch<SetStateAction<string | null>>;
  clearCart: () => void;

  /*
   * The tickets that are still open on the current shift - the exact set the server counts when
   * it refuses to close one. Kept here so the close-shift drawer can state the blockage before a
   * cashier fills in the count, and so the header can carry the number.
   */
  openHolds: SaleListRow[];
  holdsLoading: boolean;
  refreshHolds: () => Promise<void>;

  /* selling surfaces */
  payOpen: boolean;
  setPayOpen: Dispatch<SetStateAction<boolean>>;
  heldOpen: boolean;
  setHeldOpen: Dispatch<SetStateAction<boolean>>;
  held: SaleListRow[];
  setHeld: Dispatch<SetStateAction<SaleListRow[]>>;
  heldLoading: boolean;
  setHeldLoading: Dispatch<SetStateAction<boolean>>;
  receipt: ReceiptDocument | null;
  setReceipt: Dispatch<SetStateAction<ReceiptDocument | null>>;
  closeOpen: boolean;
  setCloseOpen: Dispatch<SetStateAction<boolean>>;
  cartOpen: boolean;
  setCartOpen: Dispatch<SetStateAction<boolean>>;
  busy: boolean;
  setBusy: Dispatch<SetStateAction<boolean>>;

  /* terminal-wide view mode */
  focusMode: boolean;
  setFocusMode: Dispatch<SetStateAction<boolean>>;

  /* returns */
  saleSearch: string;
  setSaleSearch: Dispatch<SetStateAction<string>>;
  sales: SaleListRow[];
  salesLoading: boolean;
  loadSales: (term: string) => Promise<void>;
  sale: SaleDetail | null;
  saleLoading: boolean;
  openSale: (saleId: string) => Promise<void>;
  closeSale: () => void;
  returnQuantities: Record<string, number>;
  setReturnQuantities: Dispatch<SetStateAction<Record<string, number>>>;
  dispositions: Record<string, StockDisposition>;
  setDispositions: Dispatch<SetStateAction<Record<string, StockDisposition>>>;
  refundMethod: RefundMethod;
  setRefundMethod: Dispatch<SetStateAction<RefundMethod>>;
  returnReason: string;
  setReturnReason: Dispatch<SetStateAction<string>>;
}

const PosWorkspaceContext = createContext<PosWorkspaceValue | null>(null);

export function usePosWorkspace(): PosWorkspaceValue {
  const value = useContext(PosWorkspaceContext);
  if (!value) throw new Error("usePosWorkspace must be used inside PosWorkspaceProvider");
  return value;
}

export function PosWorkspaceProvider({ children }: { children: ReactNode }) {
  const { api, identity } = usePosApi();
  const online = useOnlineState();
  const { register, setRegister } = useRegister();
  const {
    shift,
    loading: shiftLoading,
    refresh: refreshShift,
  } = useCurrentShift(api, identity?.businessId, register);
  const queue = useOfflineQueue(api, identity?.businessId);

  const [reference, setReference] = useState<CatalogReferenceData | null>(null);
  const [customers, setCustomers] = useState<CustomerListRow[]>([]);

  const [term, setTerm] = useState("");
  const debouncedTerm = useDebouncedValue(term, 200);
  const [categoryId, setCategoryId] = useState("");
  const [results, setResults] = useState<PosCatalogEntry[]>([]);
  /* True only until the grid has something to show; a refine must not blank what is on screen. */
  const [resultsLoading, setResultsLoading] = useState(true);

  const [lines, setLines] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [saleDiscount, setSaleDiscount] = useState("");
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState<SaleQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [resumedSaleId, setResumedSaleId] = useState<string | null>(null);

  const [openHolds, setOpenHolds] = useState<SaleListRow[]>([]);
  const [holdsLoading, setHoldsLoading] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [held, setHeld] = useState<SaleListRow[]>([]);
  const [heldLoading, setHeldLoading] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptDocument | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const [saleSearch, setSaleSearch] = useState("");
  const [sales, setSales] = useState<SaleListRow[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [saleLoading, setSaleLoading] = useState(false);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [dispositions, setDispositions] = useState<Record<string, StockDisposition>>({});
  const [refundMethod, setRefundMethod] = useState<RefundMethod>("ORIGINAL_METHOD");
  const [returnReason, setReturnReason] = useState("");

  /* ------------------------------------------------------------- reference */

  useEffect(() => {
    if (!api || !identity) return;
    let cancelled = false;
    void api
      .getCatalogReference(identity.businessId)
      .then((next) => {
        if (!cancelled) setReference(next);
      })
      .catch(() => {
        if (!cancelled) setReference(null);
      });
    void api
      .listCustomers(identity.businessId, { pageSize: 50, status: "ACTIVE" })
      .then((page) => {
        if (!cancelled) setCustomers(page.rows);
      })
      .catch(() => {
        if (!cancelled) setCustomers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [api, identity]);

  /* ------------------------------------------------------------- catalogue */

  useEffect(() => {
    if (!api || !identity || !register) return;
    let cancelled = false;
    void api
      .searchPosCatalog(identity.businessId, {
        term: debouncedTerm,
        branchId: register.branchId,
        limit: 50,
        ...(categoryId ? { categoryId } : {}),
        ...(customerId ? { customerId } : {}),
      })
      .then((rows) => {
        if (!cancelled) setResults(rows);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setResultsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, identity, register, debouncedTerm, categoryId, customerId]);

  /* ----------------------------------------------------------------- quote */

  const cart: SaleCartInput | null = useMemo(() => {
    if (!register || !lines.length) return null;
    const discountValue = Number(saleDiscount);
    return {
      branchId: register.branchId,
      lines: lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity })),
      ...(customerId ? { customerId } : {}),
      ...(coupon ? { couponCode: coupon } : {}),
      ...(Number.isFinite(discountValue) && discountValue > 0
        ? { saleDiscountKind: "FIXED_AMOUNT" as const, saleDiscountValue: discountValue }
        : {}),
    };
  }, [coupon, customerId, lines, register, saleDiscount]);

  useEffect(() => {
    if (!api || !identity || !cart) {
      setQuote(null);
      setQuoteError(null);
      setQuoting(false);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    void api
      .quoteSale(identity.businessId, cart)
      .then((result) => {
        if (cancelled) return;
        setQuote(result);
        setQuoteError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setQuote(null);
        setQuoteError(errorMessage(cause));
      })
      .finally(() => {
        if (!cancelled) setQuoting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, identity, cart]);

  /* ----------------------------------------------------------- open tickets */

  /*
   * Mirrors the server rule exactly: a sale on this shift that is DRAFT or HELD blocks the close.
   * Asking by shift rather than by status alone matters - a hold carried over from an earlier
   * shift is somebody else's problem, and must not block this one.
   */
  const shiftId = shift?.id ?? null;

  const refreshHolds = useCallback(async () => {
    if (!api || !identity || !shiftId) {
      setOpenHolds([]);
      return;
    }
    setHoldsLoading(true);
    try {
      const page = await api.listSales(identity.businessId, { shiftId, pageSize: 50 });
      setOpenHolds(page.rows.filter((row) => row.status === "HELD" || row.status === "DRAFT"));
    } catch {
      setOpenHolds([]);
    } finally {
      setHoldsLoading(false);
    }
  }, [api, identity, shiftId]);

  useEffect(() => {
    void refreshHolds();
  }, [refreshHolds]);

  /* --------------------------------------------------------------- returns */

  const loadSales = useCallback(
    async (search: string) => {
      if (!api || !identity) return;
      setSalesLoading(true);
      try {
        const page = await api.listSales(identity.businessId, {
          pageSize: 15,
          ...(search ? { search } : {}),
        });
        setSales(page.rows.filter((row) => row.status !== "HELD" && row.status !== "VOIDED"));
      } catch {
        setSales([]);
      } finally {
        setSalesLoading(false);
      }
    },
    [api, identity],
  );

  /* Once per signed-in Business, not once per visit to the returns screen. */
  useEffect(() => {
    void loadSales("");
  }, [loadSales]);

  const openSale = useCallback(
    async (saleId: string) => {
      if (!api || !identity) return;
      setSaleLoading(true);
      try {
        const detail = await api.getSale(identity.businessId, saleId);
        setSale(detail);
        setReturnQuantities({});
        setDispositions({});
        setReturnReason("");
        setRefundMethod("ORIGINAL_METHOD");
      } catch {
        setSale(null);
      } finally {
        setSaleLoading(false);
      }
    },
    [api, identity],
  );

  const closeSale = useCallback(() => setSale(null), []);

  const clearCart = useCallback(() => {
    setLines([]);
    setTenders([]);
    setCustomerId("");
    setSaleDiscount("");
    setCoupon("");
    setQuote(null);
    setResumedSaleId(null);
    setCartOpen(false);
  }, []);

  const value = useMemo<PosWorkspaceValue>(
    () => ({
      api,
      identity,
      online,
      register,
      setRegister,
      shift,
      shiftLoading,
      refreshShift,
      queue,
      reference,
      customers,
      term,
      setTerm,
      categoryId,
      setCategoryId,
      results,
      resultsLoading,
      lines,
      setLines,
      customerId,
      setCustomerId,
      saleDiscount,
      setSaleDiscount,
      coupon,
      setCoupon,
      quote,
      quoteError,
      quoting,
      cart,
      tenders,
      setTenders,
      resumedSaleId,
      setResumedSaleId,
      clearCart,
      openHolds,
      holdsLoading,
      refreshHolds,
      payOpen,
      setPayOpen,
      heldOpen,
      setHeldOpen,
      held,
      setHeld,
      heldLoading,
      setHeldLoading,
      receipt,
      setReceipt,
      closeOpen,
      setCloseOpen,
      cartOpen,
      setCartOpen,
      busy,
      setBusy,
      focusMode,
      setFocusMode,
      saleSearch,
      setSaleSearch,
      sales,
      salesLoading,
      loadSales,
      sale,
      saleLoading,
      openSale,
      closeSale,
      returnQuantities,
      setReturnQuantities,
      dispositions,
      setDispositions,
      refundMethod,
      setRefundMethod,
      returnReason,
      setReturnReason,
    }),
    [
      api,
      busy,
      cart,
      cartOpen,
      categoryId,
      clearCart,
      closeOpen,
      closeSale,
      coupon,
      customerId,
      customers,
      dispositions,
      focusMode,
      held,
      heldLoading,
      heldOpen,
      holdsLoading,
      identity,
      lines,
      loadSales,
      online,
      openHolds,
      openSale,
      payOpen,
      refreshHolds,
      quote,
      quoteError,
      quoting,
      queue,
      receipt,
      reference,
      refreshShift,
      refundMethod,
      register,
      results,
      resultsLoading,
      resumedSaleId,
      returnQuantities,
      returnReason,
      sale,
      saleDiscount,
      saleLoading,
      saleSearch,
      sales,
      salesLoading,
      setRegister,
      shift,
      shiftLoading,
      tenders,
      term,
    ],
  );

  return <PosWorkspaceContext.Provider value={value}>{children}</PosWorkspaceContext.Provider>;
}
