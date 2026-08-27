"use client";

import { ApiClientError, createApiClient, type BizentraApiClient } from "@bizentra/api-client";
import { useBusinessTheme, type ThemeIdentity } from "@bizentra/design-system/theme";
import { useMemo } from "react";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export function useIdentity(): ThemeIdentity | null {
  return useBusinessTheme().identity;
}

export function useApi(): { api: BizentraApiClient | null; identity: ThemeIdentity | null } {
  const identity = useIdentity();
  const api = useMemo(
    () => (identity ? createApiClient(API_BASE_URL, identity) : null),
    [identity],
  );
  return { api, identity };
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.body.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Try again in a moment.";
}

export function isPermissionError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 403;
}
