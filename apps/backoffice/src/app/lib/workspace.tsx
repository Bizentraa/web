"use client";

import { ApiClientError, createApiClient, type BizentraApiClient } from "@bizentra/api-client";
import type { BusinessFoundationSummary } from "@bizentra/contracts";
import {
  AppShell,
  Button,
  Card,
  CardDescription,
  CardTitle,
  Kicker,
  SkeletonRows,
  StatePanel,
  StatusChip,
  type ShellNavigationItem,
} from "@bizentra/design-system";
import { useBusinessTheme, type ThemeIdentity } from "@bizentra/design-system/theme";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export const NAVIGATION: ShellNavigationItem[] = [
  {
    href: "/",
    label: "Dashboard",
    description: "today at a glance",
    phase: "P0",
    group: "Run",
    status: "ready",
  },
  {
    href: "/sales",
    label: "Sales",
    description: "sales, shifts, returns",
    phase: "P2",
    group: "Run",
    status: "ready",
  },
  {
    href: "/catalog",
    label: "Catalog",
    description: "items, prices, tax",
    phase: "P1",
    group: "Manage",
    status: "ready",
  },
  {
    href: "/customers",
    label: "Customers",
    description: "contacts and credit",
    phase: "P1",
    group: "Manage",
    status: "ready",
  },
  {
    href: "/suppliers",
    label: "Suppliers",
    description: "terms and item costs",
    phase: "P1",
    group: "Manage",
    status: "ready",
  },
  {
    href: "/import",
    label: "Import",
    description: "CSV validate and apply",
    phase: "P1",
    group: "Manage",
    status: "ready",
  },
  {
    href: "/setup",
    label: "Business setup",
    description: "branches and locations",
    phase: "P0",
    group: "Settings",
    status: "ready",
  },
  {
    href: "/access",
    label: "Users and roles",
    description: "who can do what",
    phase: "P0",
    group: "Settings",
    status: "ready",
  },
  {
    href: "/controls",
    label: "Controls",
    description: "approvals, features, audit",
    phase: "P0",
    group: "Settings",
    status: "ready",
  },
  {
    href: "/appearance",
    label: "Appearance",
    description: "Business theme",
    phase: "P0",
    group: "Settings",
    status: "ready",
  },
];

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

/** Loads any API resource with the loading, permission and error states the UI/UX spec requires. */
export function useResource<T>(
  load: ((api: BizentraApiClient, businessId: string) => Promise<T>) | null,
  dependencies: unknown[] = [],
): {
  data: T | null;
  state: "idle" | "loading" | "ready" | "error" | "permission";
  error: string | null;
  reload: () => Promise<void>;
} {
  const { api, identity } = useApi();
  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error" | "permission">("idle");
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!api || !identity || !load) return;
    setState((current) => (current === "ready" ? "ready" : "loading"));
    try {
      setData(await load(api, identity.businessId));
      setError(null);
      setState("ready");
    } catch (cause) {
      setError(errorMessage(cause));
      setState(isPermissionError(cause) ? "permission" : "error");
    }
  }, [api, identity, ...dependencies]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, state, error, reload };
}

/**
 * One workspace frame for every Back Office screen: shared shell, Business context from the API
 * and the identity guard that local development needs until production sign-in is connected.
 */
export function Workspace({
  activeHref,
  children,
  description,
  eyebrow,
  headerActions,
  title,
}: {
  activeHref: string;
  children: ReactNode;
  description: string;
  eyebrow: string;
  headerActions?: ReactNode;
  title: string;
}) {
  const identity = useIdentity();
  const [foundation, setFoundation] = useState<BusinessFoundationSummary | null>(null);
  const { api } = useApi();

  useEffect(() => {
    if (!api || !identity) return;
    api
      .getBusinessFoundation(identity.businessId)
      .then(setFoundation)
      .catch(() => setFoundation(null));
  }, [api, identity]);

  if (!identity) {
    return (
      <AppShell
        activeHref={activeHref}
        description={description}
        eyebrow={eyebrow}
        navigation={NAVIGATION}
        title={title}
      >
        <Card>
          <Kicker>Local development only</Kicker>
          <CardTitle>Load a Business identity first</CardTitle>
          <CardDescription>
            Open Appearance and enter the Business and owner user IDs returned by the setup
            endpoint. Every screen uses that identity until production sign-in is connected.
          </CardDescription>
          <Link className="ui-button ui-button--primary" href="/appearance">
            Open Appearance
          </Link>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      activeHref={activeHref}
      context={{
        business: foundation?.business.name ?? "Loading Business",
        branch: foundation?.branches[0]?.name ?? "Main Branch",
      }}
      description={description}
      eyebrow={eyebrow}
      headerActions={headerActions}
      navigation={NAVIGATION}
      title={title}
      topbarActions={
        foundation ? (
          <StatusChip tone="success">{foundation.business.defaultCurrency}</StatusChip>
        ) : null
      }
    >
      {children}
    </AppShell>
  );
}

/** Renders the shared loading, permission and error states around any loaded resource. */
export function ResourceState({
  children,
  error,
  onRetry,
  state,
  title,
}: {
  children: ReactNode;
  error: string | null;
  onRetry?: () => unknown;
  state: "idle" | "loading" | "ready" | "error" | "permission";
  title: string;
}) {
  if (state === "loading" || state === "idle") {
    return (
      <Card>
        <CardTitle>{title}</CardTitle>
        <SkeletonRows rows={5} />
      </Card>
    );
  }

  if (state === "permission") {
    return (
      <StatePanel state="permission" title="You do not have access to this screen">
        {error ?? "Ask a Business Administrator to add the missing permission to your Role."}
      </StatePanel>
    );
  }

  if (state === "error") {
    return (
      <StatePanel
        state="error"
        title="This screen could not load"
        action={onRetry ? <Button onClick={() => void onRetry()}>Try again</Button> : undefined}
      >
        {error ?? "The API did not respond. Check that the API service is running."}
      </StatePanel>
    );
  }

  return <>{children}</>;
}
