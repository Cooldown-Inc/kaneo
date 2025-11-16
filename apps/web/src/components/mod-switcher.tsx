import { ChevronDown, Sparkles } from "lucide-react";
import * as React from "react";

import { InfoPopover } from "@/components/ui/info-popover";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import getModBundle from "@/fetchers/mods/get-mod-bundle";
import useGetAvailableMods from "@/hooks/queries/mods/use-get-available-mods";

export function ModSwitcher() {
  const { data: mods } = useGetAvailableMods();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedMod, setSelectedMod] = React.useState<string | null>(null);

  const handleModSelect = async (modId: string | null) => {
    if (modId === null) {
      // "Original Site" selected
      setSelectedMod(null);
      setIsOpen(false);
      return;
    }

    try {
      const response = await getModBundle(modId);
      console.log("Bundle URL:", response.bundleUrl);
      setSelectedMod(modId);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to fetch bundle URL:", error);
    }
  };

  const getSelectedModTitle = () => {
    if (selectedMod === null) {
      return "Original Site";
    }
    const mod = mods?.find((m) => m.id === selectedMod);
    return mod?.title || "Original Site";
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <SidebarMenu className="flex-1">
        <SidebarMenuItem>
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <SidebarMenuButton
                size="sm"
                className="h-8 py-0 w-auto w-full group/mod"
              >
                <div className="flex items-center gap-2 min-w-0 w-full">
                  <div className="bg-purple-600 flex aspect-square size-5 items-center justify-center rounded-sm">
                    <Sparkles className="size-3 text-white" />
                  </div>
                  <span className="truncate text-sm text-foreground/90 font-medium">
                    {getSelectedModTitle()}
                  </span>
                </div>
                <ChevronDown
                  className="ml-1 size-3 text-muted-foreground/50 opacity-0 group-hover/mod:opacity-100 data-[state=open]:opacity-100 data-[state=open]:rotate-180 transition-all duration-500 ease-out"
                  data-state={isOpen ? "open" : "closed"}
                />
              </SidebarMenuButton>
            </PopoverTrigger>
          <PopoverContent
            className="w-fit min-w-48 p-0 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <div className="p-3">
              <div className="text-muted-foreground/60 text-xs">Mods</div>
            </div>

            <Separator />

            <div className="p-1">
              <button
                type="button"
                onClick={() => handleModSelect(null)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 hover:bg-secondary/80 focus:bg-secondary/80 rounded-sm transition-colors text-sm font-normal ${
                  selectedMod === null ? "bg-secondary/50" : ""
                }`}
              >
                <div className="bg-muted/20 border border-border/30 flex size-5 items-center justify-center rounded-sm">
                  <Sparkles className="size-3 text-muted-foreground" />
                </div>
                <span className="text-foreground/90 flex-1 text-left">
                  Original Site
                </span>
              </button>

              {mods?.map((mod) => (
                <button
                  type="button"
                  key={mod.id}
                  onClick={() => handleModSelect(mod.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 hover:bg-secondary/80 focus:bg-secondary/80 rounded-sm transition-colors text-sm font-normal ${
                    selectedMod === mod.id ? "bg-secondary/50" : ""
                  }`}
                >
                  <div className="bg-purple-600/20 border border-purple-600/30 flex size-5 items-center justify-center rounded-sm">
                    <span className="text-xs font-medium text-purple-600">
                      {mod.title.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-foreground/90 flex-1 text-left">
                    {mod.title}
                  </span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
    <InfoPopover title="What are Mods?" side="right" align="start">
      <p className="mb-2">
        Mods allow you to customize and extend the functionality of your
        workspace with different themes, layouts, and features.
      </p>
      <p>
        Select <strong>Original Site</strong> for the default experience, or
        choose from available mods to transform your interface.
      </p>
    </InfoPopover>
  </div>
  );
}

