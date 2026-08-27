"use client";

import {
  BadgeDollarSign,
  Boxes,
  Building2,
  ClipboardCheck,
  FileInput,
  Gauge,
  KeyRound,
  PackageSearch,
  ReceiptText,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Truck,
  UsersRound,
} from "lucide-react";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

import { BranchSwitcher } from "@/components/branch-switcher";
import { NavMain, type NavGroup, type NavItem } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

/** The Back Office navigation, grouped the way the Common Core phases are delivered. */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Operate",
    items: [
      { title: "Dashboard", href: "/", icon: Gauge },
      { title: "Sales", href: "/sales", icon: ReceiptText, badge: "P2" },
      { title: "Catalog", href: "/catalog", icon: Boxes, badge: "P1" },
      { title: "Customers", href: "/customers", icon: UsersRound },
      { title: "Suppliers", href: "/suppliers", icon: Truck },
    ],
  },
  {
    title: "Control",
    items: [
      { title: "Setup", href: "/setup", icon: Building2, badge: "P0" },
      { title: "Access", href: "/access", icon: KeyRound },
      { title: "Controls", href: "/controls", icon: SlidersHorizontal },
      { title: "Inventory", href: "/inventory", icon: PackageSearch, badge: "P3" },
      { title: "Finance", href: "/finance", icon: BadgeDollarSign, badge: "P4" },
    ],
  },
  {
    title: "Extend",
    items: [
      { title: "Business engines", href: "/business-engines", icon: Store, badge: "P5" },
      { title: "Store reliability", href: "/store-reliability", icon: ClipboardCheck, badge: "P6" },
      { title: "Reports", href: "/reporting-operations", icon: ShieldCheck, badge: "P7" },
      { title: "Production", href: "/production-readiness", icon: ShieldCheck, badge: "P8" },
      { title: "Import", href: "/import", icon: FileInput },
      { title: "Appearance", href: "/appearance", icon: Settings2 },
    ],
  },
];

/** Resolves the group and item a path belongs to, so the header breadcrumb matches the sidebar. */
export function findNavTrail(pathname: string): { group: NavGroup; item: NavItem } | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      const match =
        item.href === "/"
          ? pathname === "/"
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (match) return { group, item };
    }
  }
  return null;
}

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <BranchSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={NAV_GROUPS} pathname={pathname} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
