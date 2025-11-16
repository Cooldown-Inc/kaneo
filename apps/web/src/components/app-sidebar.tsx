import type * as React from "react";

import { ModSwitcher } from "@/components/mod-switcher";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { shortcuts } from "@/constants/shortcuts";
import { useRegisterShortcuts } from "@/hooks/use-keyboard-shortcuts";
import Search from "./search";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { toggleSidebar } = useSidebar();

  useRegisterShortcuts({
    modifierShortcuts: {
      [shortcuts.sidebar.prefix]: {
        [shortcuts.sidebar.toggle]: toggleSidebar,
      },
    },
  });

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-none pt-3"
      {...props}
    >
      <SidebarHeader className="pt-0 gap-2">
        <ModSwitcher />
        <div className="px-2 py-2">
          <Separator className="w-3/4 mx-auto" />
        </div>
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent className="overflow-hidden">
        <Search />
        <NavMain />
        <NavProjects />
      </SidebarContent>
    </Sidebar>
  );
}
