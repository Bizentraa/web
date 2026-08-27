"use client";

import type { RecordStatus } from "@bizentra/contracts";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { errorMessage, useApi } from "./api";

/** One switchable Branch of the signed-in Business. */
export interface BranchOption {
  id: string;
  code: string;
  name: string;
  status: RecordStatus;
  locationCount: number;
}

export type ActiveBranchStatus = "idle" | "loading" | "ready" | "error";

interface ActiveBranchContextValue {
  businessName: string | null;
  branches: BranchOption[];
  activeBranch: BranchOption | null;
  /** Pass to every branch-scoped request. `null` until the Business foundation has loaded. */
  activeBranchId: string | null;
  status: ActiveBranchStatus;
  error: string | null;
  selectBranch: (branchId: string) => void;
  reload: () => Promise<void>;
}

const ActiveBranchContext = createContext<ActiveBranchContextValue | null>(null);

/**
 * The saved Branch is per Business, so signing into a different Business never inherits a Branch
 * the user cannot see.
 */
function storageKey(businessId: string): string {
  return `bizentra.backoffice.active-branch.${businessId}`;
}

function readSavedBranchId(businessId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(storageKey(businessId));
  } catch {
    return null;
  }
}

function saveBranchId(businessId: string, branchId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(businessId), branchId);
  } catch {
    /* Private browsing and blocked storage must not break Branch switching. */
  }
}

/** Prefers the saved Branch, then the first active Branch, then whatever exists. */
function resolveInitialBranch(
  branches: BranchOption[],
  savedId: string | null,
): BranchOption | null {
  const saved = savedId ? branches.find((branch) => branch.id === savedId) : undefined;
  if (saved && saved.status === "ACTIVE") return saved;
  return branches.find((branch) => branch.status === "ACTIVE") ?? branches[0] ?? null;
}

export function ActiveBranchProvider({ children }: { children: ReactNode }) {
  const { api, identity } = useApi();
  const businessId = identity?.businessId ?? null;

  const [businessName, setBusinessName] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [status, setStatus] = useState<ActiveBranchStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!api || !businessId) return;
    setStatus((current) => (current === "ready" ? "ready" : "loading"));
    try {
      const foundation = await api.getBusinessFoundation(businessId);
      const loaded: BranchOption[] = foundation.branches.map((branch) => ({
        id: branch.id,
        code: branch.code,
        name: branch.name,
        status: branch.status,
        locationCount: branch.locations.length,
      }));

      setBusinessName(foundation.business.name);
      setBranches(loaded);
      setActiveBranchId((current) => {
        const stillPresent = current && loaded.some((branch) => branch.id === current);
        if (stillPresent) return current;
        return resolveInitialBranch(loaded, readSavedBranchId(businessId))?.id ?? null;
      });
      setError(null);
      setStatus("ready");
    } catch (cause) {
      setError(errorMessage(cause));
      setStatus("error");
    }
  }, [api, businessId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selectBranch = useCallback(
    (branchId: string) => {
      if (!businessId) return;
      if (!branches.some((branch) => branch.id === branchId)) return;
      saveBranchId(businessId, branchId);
      setActiveBranchId(branchId);
    },
    [branches, businessId],
  );

  const value = useMemo<ActiveBranchContextValue>(() => {
    const activeBranch = branches.find((branch) => branch.id === activeBranchId) ?? null;
    return {
      businessName,
      branches,
      activeBranch,
      activeBranchId,
      status,
      error,
      selectBranch,
      reload,
    };
  }, [activeBranchId, branches, businessName, error, reload, selectBranch, status]);

  return <ActiveBranchContext.Provider value={value}>{children}</ActiveBranchContext.Provider>;
}

export function useActiveBranch(): ActiveBranchContextValue {
  const value = useContext(ActiveBranchContext);
  if (!value) throw new Error("useActiveBranch must be used inside ActiveBranchProvider");
  return value;
}
