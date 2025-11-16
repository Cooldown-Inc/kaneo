import { ChevronDown, Sparkles } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

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
import { TutorialPopover } from "@/components/ui/tutorial-popover";
import getModBundle from "@/fetchers/mods/get-mod-bundle";
import useGetAvailableMods from "@/hooks/queries/mods/use-get-available-mods";
import { isTutorialCompleted, startTutorial } from "@/lib/tutorials";

// Declare the global Else SDK interface
declare global {
  interface Window {
    Else?: {
      loadExtension: (bundleUrl: string) => Promise<void>;
      unloadExtension: () => Promise<void>;
    };
  }
}

const SELECTED_MOD_KEY = "kaneo_selected_mod";

export function ModSwitcher() {
  const { data: mods } = useGetAvailableMods();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedMod, setSelectedMod] = React.useState<string | null>(() => {
    // Initialize from localStorage if available
    try {
      return localStorage.getItem(SELECTED_MOD_KEY);
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = React.useState(false);

  // Auto-start welcome tutorial when component mounts
  React.useEffect(() => {
    if (!isTutorialCompleted("welcome")) {
      startTutorial("welcome");
      window.dispatchEvent(new CustomEvent("tutorial-state-changed"));
    }
  }, []);

  // Auto-load the previously selected mod on mount
  React.useEffect(() => {
    const loadSavedMod = async () => {
      if (selectedMod && window.Else?.loadExtension) {
        try {
          const response = await getModBundle(selectedMod);
          if (response.bundleUrl) {
            await window.Else.loadExtension(response.bundleUrl);
          }
        } catch (error) {
          console.error("Failed to auto-load saved mod:", error);
          // Clear the saved mod if it fails to load
          localStorage.removeItem(SELECTED_MOD_KEY);
          setSelectedMod(null);
        }
      }
    };

    loadSavedMod();
  }, []); // Only run on mount

  const handleModSelect = async (modId: string | null) => {
    if (modId === null) {
      // "Original Site" selected - unload any active mod
      setIsLoading(true);
      try {
        if (window.Else?.unloadExtension) {
          await window.Else.unloadExtension();
          toast.success("Switched to Original Site");
        }
        setSelectedMod(null);
        localStorage.removeItem(SELECTED_MOD_KEY);
        setIsOpen(false);
      } catch (error) {
        console.error("Failed to unload mod:", error);
        toast.error("Failed to switch to Original Site");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      // Fetch the bundle URL from the backend
      const response = await getModBundle(modId);
      
      if (!response.bundleUrl) {
        throw new Error("No bundle URL returned");
      }

      // Load the extension using the Else SDK
      if (window.Else?.loadExtension) {
        await window.Else.loadExtension(response.bundleUrl);
        setSelectedMod(modId);
        localStorage.setItem(SELECTED_MOD_KEY, modId);
        setIsOpen(false);
        
        const modTitle = mods?.find((m) => m.id === modId)?.title;
        toast.success(`Loaded ${modTitle || "mod"}`);
      } else {
        throw new Error("Else SDK not loaded");
      }
    } catch (error) {
      console.error("Failed to load mod:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load mod"
      );
    } finally {
      setIsLoading(false);
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
                disabled={isLoading}
              >
                <div className="flex items-center gap-2 min-w-0 w-full">
                  <div className="bg-purple-600 flex aspect-square size-5 items-center justify-center rounded-sm">
                    <Sparkles className="size-3 text-white" />
                  </div>
                  <span className="truncate text-sm text-foreground/90 font-medium">
                    {isLoading ? "Loading..." : getSelectedModTitle()}
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
    <div className="relative">
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
      
      <TutorialPopover 
        tutorial="welcome" 
        step="intro"
        side="right"
        align="start"
        showArrow={true}
        arrowPosition="top-left"
        className="-translate-y-2"
      >
        <p>
          Use this dropdown to explore prototypes created with Else. 
          When you're ready, try building your own.
        </p>
      </TutorialPopover>
    </div>
  </div>
  );
}

