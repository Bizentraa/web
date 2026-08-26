"use client";

import { ApiClientError, createApiClient, type BizentraApiClient } from "@bizentra/api-client";
import type { CreateSaleInput, ShiftSummary } from "@bizentra/contracts";
import { useBusinessTheme, type ThemeIdentity } from "@bizentra/design-system/theme";
import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const REGISTER_KEY = "bizentra.pos.register";
const QUEUE_KEY = "bizentra.pos.queue";

export interface RegisterSelection {
  branchId: string;
  branchName: string;
  registerCode: string;
}

export interface QueuedSale {
  clientRef: string;
  payload: CreateSaleInput;
  queuedAt: string;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.body.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Try again in a moment.";
}

export function usePosApi(): { api: BizentraApiClient | null; identity: ThemeIdentity | null } {
  const identity = useBusinessTheme().identity;
  const api = useMemo(
    () => (identity ? createApiClient(API_BASE_URL, identity) : null),
    [identity],
  );
  return { api, identity };
}

/** Remembers which Branch and register this terminal is, the way a real till would. */
export function useRegister(): {
  register: RegisterSelection | null;
  setRegister: (selection: RegisterSelection | null) => void;
} {
  const [register, setRegisterState] = useState<RegisterSelection | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(REGISTER_KEY);
      if (raw) setRegisterState(JSON.parse(raw) as RegisterSelection);
    } catch {
      setRegisterState(null);
    }
  }, []);

  const setRegister = useCallback((selection: RegisterSelection | null) => {
    try {
      if (selection) window.localStorage.setItem(REGISTER_KEY, JSON.stringify(selection));
      else window.localStorage.removeItem(REGISTER_KEY);
    } catch {
      /* a terminal with storage disabled still works for this session */
    }
    setRegisterState(selection);
  }, []);

  return { register, setRegister };
}

/**
 * CC-P6-005 in POS form: sales taken while the connection is down are queued locally with their
 * own idempotency key and replayed through the sync endpoint, so a replay can never post twice.
 */
export function useOfflineQueue(api: BizentraApiClient | null, businessId: string | undefined) {
  const [queue, setQueue] = useState<QueuedSale[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [needsReview, setNeedsReview] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(QUEUE_KEY);
      if (raw) setQueue(JSON.parse(raw) as QueuedSale[]);
    } catch {
      setQueue([]);
    }
  }, []);

  const persist = useCallback((next: QueuedSale[]) => {
    setQueue(next);
    try {
      window.localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
    } catch {
      /* keep going in memory */
    }
  }, []);

  const enqueue = useCallback(
    (payload: CreateSaleInput) => {
      const entry: QueuedSale = {
        clientRef: payload.idempotencyKey,
        payload,
        queuedAt: new Date().toISOString(),
      };
      persist([...queue, entry]);
    },
    [persist, queue],
  );

  const sync = useCallback(async () => {
    if (!api || !businessId || !queue.length) return;
    setSyncing(true);
    try {
      const results = await api.syncQueue(businessId, {
        operations: queue.map((entry) => ({
          kind: "SALE" as const,
          clientRef: entry.clientRef,
          payload: entry.payload,
        })),
      });
      const failed = results.filter((result) => result.status === "FAILED");
      setNeedsReview(failed.map((result) => result.message ?? result.clientRef));
      persist(
        queue.filter((entry) => failed.some((result) => result.clientRef === entry.clientRef)),
      );
    } finally {
      setSyncing(false);
    }
  }, [api, businessId, persist, queue]);

  return { queue, enqueue, sync, syncing, needsReview };
}

export function useCurrentShift(
  api: BizentraApiClient | null,
  businessId: string | undefined,
  register: RegisterSelection | null,
): { shift: ShiftSummary | null; loading: boolean; refresh: () => Promise<void> } {
  const [shift, setShift] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!api || !businessId || !register) {
      setShift(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setShift(await api.getCurrentShift(businessId, register.branchId, register.registerCode));
    } catch {
      setShift(null);
    } finally {
      setLoading(false);
    }
  }, [api, businessId, register]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { shift, loading, refresh };
}
