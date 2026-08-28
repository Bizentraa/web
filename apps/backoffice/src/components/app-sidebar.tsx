"use client";

import {
  Boxes,
  Building2,
  CircleDollarSign,
  FileInput,
  Gauge,
  KeyRound,
  ListOrdered,
  MonitorSmartphone,
  PackageSearch,
  Palette,
  ReceiptText,
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

/** The Back Office navigation, grouped by the way operators use the product. */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Operate",
    items: [
      { title: "Dashboard", href: "/", icon: Gauge },
      { title: "Sales", href: "/sales", icon: ReceiptText },
      { title: "Catalog", href: "/catalog", icon: Boxes },
      { title: "Customers", href: "/customers", icon: UsersRound },
      { title: "Suppliers", href: "/suppliers", icon: Truck },
    ],
  },
  {
    title: "Control",
    items: [
      { title: "Setup", href: "/setup", icon: Building2 },
      { title: "Access", href: "/access", icon: KeyRound },
      { title: "Controls", href: "/controls", icon: SlidersHorizontal },
      { title: "Inventory", href: "/inventory", icon: PackageSearch },
      { title: "Finance", href: "/finance", icon: CircleDollarSign },
    ],
  },
  {
    title: "Extend",
    items: [
      { title: "Business engines", href: "/business-engines", icon: Store },
      {
        title: "Store reliability",
        href: "/store-reliability",
        icon: MonitorSmartphone,
      },
      { title: "Reports", href: "/reporting-operations", icon: ListOrdered },
      { title: "Production", href: "/production-readiness", icon: ShieldCheck },
      { title: "Import", href: "/import", icon: FileInput },
      { title: "Appearance", href: "/appearance", icon: Palette },
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
