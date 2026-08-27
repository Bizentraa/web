"use client";

import { Building2, ChevronsUpDown, Plus, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useActiveBranch } from "@/app/lib/active-branch";

/**
 * Business identity plus the Branch switcher, in the position sidebar-07 gives its team switcher.
 * Switching a Branch is saved per Business and re-scopes every Branch-aware screen.
 */
export function BranchSwitcher() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { activeBranch, branches, businessName, selectBranch, status } = useActiveBranch();

  const switchable = useMemo(
    () => branches.filter((branch) => branch.status === "ACTIVE"),
    [branches],
  );

  /** Meta/Ctrl + 1-9 switches Branch, matching the shortcuts shown in the menu. */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!event.metaKey && !event.ctrlKey) return;
      const position = Number.parseInt(event.key, 10);
      if (!Number.isInteger(position) || position < 1 || position > 9) return;
      const branch = switchable[position - 1];
      if (!branch) return;
      event.preventDefault();
      selectBranch(branch.id);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectBranch, switchable]);

  const heading = businessName ?? "Bizentra";
  const subheading =
    status === "loading" || status === "idle"
      ? "Loading branches…"
      : status === "error"
        ? "Branches unavailable"
        : (activeBranch?.name ?? "No branch yet");

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Building2 className="size-4" aria-hidden="true" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{heading}</span>
                <span className="truncate text-xs">{subheading}</span>
              </div>
              <ChevronsUpDown className="ml-auto" aria-hidden="true" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Branches
            </DropdownMenuLabel>

            {branches.length === 0 ? (
              <DropdownMenuItem disabled className="gap-2 p-2">
                {status === "error" ? "Branches could not load" : "No branch created yet"}
              </DropdownMenuItem>
            ) : (
              branches.map((branch) => {
                const position = switchable.indexOf(branch);
                const inactive = branch.status !== "ACTIVE";
                return (
                  <DropdownMenuItem
                    key={branch.id}
                    onClick={() => selectBranch(branch.id)}
                    disabled={inactive}
                    className="gap-2 p-2"
                    aria-current={branch.id === activeBranch?.id ? "true" : undefined}
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border">
                      <Store className="size-3.5 shrink-0" aria-hidden="true" />
                    </div>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{branch.name}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {branch.code}
                        {inactive ? " · Inactive" : null}
                        {branch.id === activeBranch?.id ? " · Current" : null}
                      </span>
                    </span>
                    {position >= 0 && position < 9 ? (
                      <DropdownMenuShortcut>⌘{position + 1}</DropdownMenuShortcut>
                    ) : null}
                  </DropdownMenuItem>
                );
              })
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" onClick={() => router.push("/setup")}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" aria-hidden="true" />
              </div>
              <div className="text-muted-foreground font-medium">Add branch</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
