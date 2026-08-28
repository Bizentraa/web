"use client";

import type { BizentraApiClient } from "@bizentra/api-client";
import { Button, SkeletonScreen, StatePanel } from "@bizentra/design-system";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { findNavTrail } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

import { errorMessage, isPermissionError, useApi, useIdentity } from "./api";
import { useActiveBranch } from "./active-branch";

export { errorMessage, isPermissionError, useApi, useIdentity } from "./api";
export { useActiveBranch } from "./active-branch";

/**
 * Loads any API resource with the loading, permission and error states the UI/UX spec requires.
 *
 * The loader also receives the active Branch id, and every resource re-loads when the Branch is
 * switched, so a Branch-scoped screen never shows another Branch's data.
 */
export function useResource<T>(
  load:
    ((api: BizentraApiClient, businessId: string, branchId: string | null) => Promise<T>) | null,
  dependencies: unknown[] = [],
): {
  data: T | null;
  state: "idle" | "loading" | "ready" | "error" | "permission";
  error: string | null;
  reload: () => Promise<void>;
} {
  const { api, identity } = useApi();
  const { activeBranchId } = useActiveBranch();
  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error" | "permission">("idle");
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!api || !identity || !load) return;
    setState((current) => (current === "ready" ? "ready" : "loading"));
    try {
      setData(await load(api, identity.businessId, activeBranchId));
      setError(null);
      setState("ready");
    } catch (cause) {
      setError(errorMessage(cause));
      setState(isPermissionError(cause) ? "permission" : "error");
    }
  }, [activeBranchId, api, identity, ...dependencies]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, state, error, reload };
}

/** One workspace frame for every Back Office screen. */
export function Workspace({
  children,
  description,
  headerActions,
  status,
  title,
}: {
  children: ReactNode;
  description: string;
  headerActions?: ReactNode;
  /** Live state of the screen, shown beside the title. */
  status?: ReactNode;
  title: string;
}) {
  const identity = useIdentity();

  return (
    <BackOfficeShell
      description={description}
      headerActions={headerActions}
      status={status}
      title={title}
    >
      {identity ? children : <SkeletonScreen />}
    </BackOfficeShell>
  );
}

function BackOfficeShell({
  children,
  description,
  headerActions,
  status,
  title,
}: {
  children: ReactNode;
  description: string;
  headerActions?: ReactNode;
  status?: ReactNode;
  title: string;
}) {
  const pathname = usePathname();
  const { activeBranch } = useActiveBranch();
  const trail = findNavTrail(pathname);
  const section = trail?.group.title ?? "Back Office";

  return (
    <SidebarInset>
      <header className="bg-background/85 sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b backdrop-blur transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-14">
        <div className="flex w-full items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/">{section}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{trail?.item.title ?? title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {activeBranch ? (
            <span className="text-muted-foreground ml-auto hidden shrink-0 truncate text-xs sm:inline">
              {activeBranch.code} · {activeBranch.name}
            </span>
          ) : null}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* The one header a screen gets; actions belong beside the title, not in the breadcrumb. */}
        <header className="bo-screen-header">
          <div>
            <div className="ui-page-header-title-row">
              <h1>{title}</h1>
              {status}
            </div>
            <p>{description}</p>
          </div>
          {headerActions ? <div className="ui-page-header-actions">{headerActions}</div> : null}
        </header>
        {children}
      </div>
    </SidebarInset>
  );
}

/** Renders the shared loading, permission and error states around any loaded resource. */
export function ResourceState({
  children,
  error,
  onRetry,
  state,
}: {
  children: ReactNode;
  error: string | null;
  onRetry?: () => unknown;
  state: "idle" | "loading" | "ready" | "error" | "permission";
  title: string;
}) {
  if (state === "loading" || state === "idle") {
    /* Deliberately not varied by screen: the loading state should not change shape between them. */
    return <SkeletonScreen />;
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
