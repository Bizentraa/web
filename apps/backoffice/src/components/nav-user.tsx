"use client";

import { useBusinessTheme } from "@bizentra/design-system/theme";
import type { DeviceThemeMode } from "@bizentra/themes";
import { ChevronsUpDown, KeyRound, Monitor, Moon, Palette, Sun } from "lucide-react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useActiveBranch } from "@/app/lib/active-branch";

const MODE_LABELS: Record<DeviceThemeMode, string> = {
  BUSINESS_DEFAULT: "Business default",
  LIGHT: "Light",
  DARK: "Dark",
  SYSTEM: "Match system",
};

/**
 * The sidebar footer menu from sidebar-07, carrying the workspace identity and the settings a
 * Back Office user reaches most often.
 */
export function NavUser() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { deviceMode, identity, setDeviceMode } = useBusinessTheme();
  const { activeBranch } = useActiveBranch();

  const context = activeBranch
    ? `${activeBranch.code} · ${activeBranch.name}`
    : "Common Core workspace";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg">BO</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Back Office</span>
                <span className="truncate text-xs">{context}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">BO</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Back Office</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {identity ? `User ${identity.userId.slice(0, 8)}` : "Not signed in"}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Appearance
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={deviceMode}
              onValueChange={(value) => setDeviceMode(value as DeviceThemeMode)}
            >
              <DropdownMenuRadioItem value="BUSINESS_DEFAULT">
                {MODE_LABELS.BUSINESS_DEFAULT}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="LIGHT">
                <Sun className="size-4" aria-hidden="true" />
                {MODE_LABELS.LIGHT}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="DARK">
                <Moon className="size-4" aria-hidden="true" />
                {MODE_LABELS.DARK}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="SYSTEM">
                <Monitor className="size-4" aria-hidden="true" />
                {MODE_LABELS.SYSTEM}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/appearance")}>
                <Palette aria-hidden="true" />
                Business theme
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/access")}>
                <KeyRound aria-hidden="true" />
                Users and roles
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
