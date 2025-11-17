import { ChevronDown, Hammer } from "lucide-react";
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
import { WorkspaceLoadingModal } from "@/components/workspace-loading-modal";
import getModBundle from "@/fetchers/mods/get-mod-bundle";
import useGetAvailableMods from "@/hooks/queries/mods/use-get-available-mods";
import { isTutorialCompleted, startTutorial } from "@/lib/tutorials";
import { client } from "@/lib/client";

// Declare the global Else SDK interface
declare global {
  interface Window {
    else?: {
      bundleLoaderVersion: string;
      inElseDevEnvironment: () => boolean;
      setCustomBundle: (bundleUrl: string | undefined, reload?: boolean) => void;
      getCustomBundle: () => string | null;
      clearCustomBundle: (reload?: boolean) => void;
      reloadWithBundle: (bundleUrl?: string | undefined) => void;
      setDebug: (debug: boolean) => void;
    };
  }
}

export function ModSwitcher() {
  const { data: mods } = useGetAvailableMods();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSdkReady, setIsSdkReady] = React.useState(false);
  const [currentBundleUrl, setCurrentBundleUrl] = React.useState<string | null>(null);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = React.useState(false);
  const [isInElseDevEnv, setIsInElseDevEnv] = React.useState(false);

  // Handle workspace modal open - initialize, start, and poll workspace
  React.useEffect(() => {
    if (!isWorkspaceModalOpen) return;

    const openWorkspace = async () => {
      try {
        console.log("🚀 Initializing user extension...");
        
        // Initialize extension (create tenant and extension if needed)
        const initResponse = await client.else.user.extension.initialize.$post();
        if (!initResponse.ok) {
          throw new Error("Failed to initialize extension");
        }
        const initData = await initResponse.json();
        console.log("✅ Extension initialized:", initData);

        // Start workspace
        console.log("🏁 Starting workspace...");
        const startResponse = await client.else.user.workspace.start.$post();
        if (!startResponse.ok) {
          throw new Error("Failed to start workspace");
        }
        console.log("✅ Workspace start requested");

        // Poll for workspace status
        const pollWorkspace = async () => {
          const maxAttempts = 60; // Poll for up to 5 minutes (60 * 5 seconds)
          let attempts = 0;

          const poll = async (): Promise<void> => {
            if (attempts >= maxAttempts) {
              throw new Error("Workspace did not become ready in time");
            }

            attempts++;
            console.log(`📊 Polling workspace status (attempt ${attempts})...`);

            const statusResponse = await client.else.user.workspace.status.$get();
            if (!statusResponse.ok) {
              throw new Error("Failed to get workspace status");
            }

            const statusData = await statusResponse.json();
            console.log("📊 Workspace status:", statusData);

            if (statusData.isRunning && statusData.workspaceUrl) {
              console.log("✅ Workspace is ready!");
              setIsWorkspaceModalOpen(false);
              
              // Add url_on_done parameter so workspace can redirect back
              const workspaceUrl = new URL(statusData.workspaceUrl);
              workspaceUrl.searchParams.set('url_on_done', window.location.href);
              
              // Open workspace in new tab
              window.open(workspaceUrl.toString(), "_blank");
              return;
            }

            // Not ready yet, poll again after 5 seconds
            await new Promise((resolve) => setTimeout(resolve, 5000));
            return poll();
          };

          return poll();
        };

        await pollWorkspace();
      } catch (error) {
        console.error("❌ Error opening workspace:", error);
        setIsWorkspaceModalOpen(false);
        toast.error(
          error instanceof Error ? error.message : "Failed to open workspace",
        );
      }
    };

    openWorkspace();
  }, [isWorkspaceModalOpen]);

  // Check if Else SDK is loaded
  React.useEffect(() => {
    // Debug: Log what's on the window object
    console.log("🔍 Checking for Else SDK...");
    console.log("window.else:", window.else);
    
    const checkSdk = () => {
      if (window.else && typeof window.else.setCustomBundle === 'function' && typeof window.else.reloadWithBundle === 'function') {
        console.log("✅ Else SDK loaded successfully");
        console.log("SDK Version:", window.else.bundleLoaderVersion);
        
        // Check if we're in an Else dev environment
        const inDevEnv = window.else.inElseDevEnvironment();
        console.log("🔧 In Else Dev Environment:", inDevEnv);
        setIsInElseDevEnv(inDevEnv);
        
        setIsSdkReady(true);
        return true;
      }
      
      return false;
    };

    // Check immediately
    if (checkSdk()) return;

    console.log("⏳ Waiting for Else SDK to load...");

    // Poll for SDK availability
    const interval = setInterval(() => {
      if (checkSdk()) {
        clearInterval(interval);
      }
    }, 100);

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      console.error("❌ Else SDK failed to load within 10 seconds");
      console.log("Final check - window.else:", window.else);
      toast.error("Failed to initialize mod system. Please refresh the page.");
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Auto-start welcome tutorial when component mounts
  React.useEffect(() => {
    if (!isTutorialCompleted("welcome")) {
      startTutorial("welcome");
      window.dispatchEvent(new CustomEvent("tutorial-state-changed"));
    }
  }, []);

  // Get the current bundle URL from Else SDK when SDK is ready
  React.useEffect(() => {
    if (!isSdkReady) return;

    const bundleUrl = window.else?.getCustomBundle() || null;
    setCurrentBundleUrl(bundleUrl);
    console.log("📦 Current bundle from Else SDK:", bundleUrl);
  }, [isSdkReady]);

  const handleModSelect = async (modId: string | null) => {
    console.log("🎯 handleModSelect called with:", modId);
    console.log("Current bundle URL:", currentBundleUrl);
    
    if (!isSdkReady) {
      toast.error("Else SDK is still loading. Please wait...");
      return;
    }
    
    if (isInElseDevEnv) {
      console.log("🔧 In Else dev environment, mod loading disabled");
      toast.error("Mod loading is disabled in Else dev environment");
      return;
    }

    if (modId === null) {
      // "Original Site" selected - only clear if there's actually a bundle loaded
      if (!currentBundleUrl) {
        console.log("✅ Already on Original Site, no action needed");
        return;
      }
      
      console.log("🗑️ Clearing bundle and reloading to Original Site");
      try {
        if (window.else) {
          // clearCustomBundle automatically reloads by default
          window.else.clearCustomBundle();
        }
      } catch (error) {
        console.error("Failed to unload mod:", error);
        toast.error("Failed to switch to Original Site");
      }
      return;
    }

    // Check if we're trying to load a mod that's already loaded
    const targetBundleUrl = modBundleUrls[modId];
    if (targetBundleUrl && targetBundleUrl === currentBundleUrl) {
      console.log("✅ Mod already loaded, no action needed");
      return;
    }

    console.log("📥 Loading mod:", modId);
    setIsLoading(true);
    try {
      // Fetch the bundle URL from the backend
      const response = await getModBundle(modId);
      
      if (!response.bundleUrl) {
        throw new Error("No bundle URL returned");
      }

      // Load the extension using the Else SDK
      if (window.else) {
        // reloadWithBundle sets the bundle AND reloads in one call
        window.else.reloadWithBundle(response.bundleUrl);
      } else {
        throw new Error("Else SDK not loaded");
      }
    } catch (error) {
      console.error("Failed to load mod:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load mod"
      );
      setIsLoading(false);
    }
    // Note: isLoading will be reset after page reload, no finally needed
  };

  // Store bundle URLs for each mod to match against current bundle
  const [modBundleUrls, setModBundleUrls] = React.useState<Record<string, string>>({});

  // Fetch bundle URLs for all mods when they load
  React.useEffect(() => {
    if (!mods || mods.length === 0) return;

    const fetchBundleUrls = async () => {
      const urls: Record<string, string> = {};
      for (const mod of mods) {
        try {
          const response = await getModBundle(mod.id);
          if (response.bundleUrl) {
            urls[mod.id] = response.bundleUrl;
          }
        } catch (error) {
          console.error(`Failed to fetch bundle URL for ${mod.id}:`, error);
        }
      }
      console.log("📋 All fetched mod bundle URLs:", urls);
      setModBundleUrls(urls);
    };

    fetchBundleUrls();
  }, [mods]);

  const getSelectedModTitle = () => {
    if (!currentBundleUrl) {
      return "Original Site";
    }
    
    // Find which mod matches the current bundle URL
    const matchingModId = Object.entries(modBundleUrls).find(
      ([, url]) => url === currentBundleUrl
    )?.[0];
    
    if (matchingModId) {
      const mod = mods?.find((m) => m.id === matchingModId);
      return mod?.title || "Loaded Mod";
    }
    
    return "Loaded Mod";
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
                disabled={isLoading || !isSdkReady || isInElseDevEnv}
              >
                <div className="flex items-center gap-2 min-w-0 w-full">
                  <img 
                    src="/else-icon.png" 
                    alt="Else" 
                    className="size-5 rounded-sm"
                  />
                  <span className="truncate text-sm text-foreground/90 font-medium">
                    {isLoading 
                      ? "Loading..." 
                      : !isSdkReady 
                        ? "Initializing..." 
                        : isInElseDevEnv 
                          ? "Disabled" 
                          : getSelectedModTitle()}
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
              <div className="text-muted-foreground/60 text-xs">EXAMPLES</div>
            </div>

            <Separator />

            <div className="p-1">
              <button
                type="button"
                onClick={() => handleModSelect(null)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 hover:bg-secondary/80 focus:bg-secondary/80 rounded-sm transition-colors text-sm font-normal ${
                  !currentBundleUrl ? "bg-secondary/50" : ""
                }`}
              >
                <img 
                  src="/else-icon.png" 
                  alt="Else" 
                  className="size-5 rounded-sm"
                />
                <span className="text-foreground/90 flex-1 text-left">
                  Original Site
                </span>
              </button>

              {mods?.map((mod) => {
                // Check if this mod's bundle URL matches the current bundle
                const isActive = currentBundleUrl && modBundleUrls[mod.id] === currentBundleUrl;
                return (
                  <button
                    type="button"
                    key={mod.id}
                    onClick={() => handleModSelect(mod.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 hover:bg-secondary/80 focus:bg-secondary/80 rounded-sm transition-colors text-sm font-normal ${
                      isActive ? "bg-secondary/50" : ""
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
                );
              })}

              <Separator className="my-1" />

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsWorkspaceModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-secondary/80 focus:bg-secondary/80 rounded-sm transition-colors text-sm font-normal"
              >
                <div className="bg-blue-600/20 border border-blue-600/30 flex size-5 items-center justify-center rounded-sm">
                  <Hammer className="size-3 text-blue-600" />
                </div>
                <span className="text-foreground/90 flex-1 text-left">
                  Build your own
                </span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
    <div className="relative">
      <InfoPopover title="Toggle between prototypes" side="right" align="start">
        <p>
          These were built with Else. Once you have tried the examples select <b>Build your own</b> to try out the Else development environment.
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

    <WorkspaceLoadingModal
      isOpen={isWorkspaceModalOpen}
      onOpenChange={setIsWorkspaceModalOpen}
    />
  </div>
  );
}


