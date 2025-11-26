import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { createPortal } from "react-dom";

import { useTutorialStep } from "@/hooks/use-tutorial";
import { cn } from "@/lib/cn";
import { Button } from "./button";

interface TutorialPopoverProps {
  tutorial: string;
  step: string;
  children: React.ReactNode;
  title?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
  buttonText?: string;
  showArrow?: boolean;
  arrowPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  centerOnViewport?: boolean;
  onComplete?: () => void;
}

export function TutorialPopover({
  tutorial,
  step,
  children,
  title,
  side = "right",
  align = "start",
  className,
  buttonText = "Got it",
  showArrow = false,
  arrowPosition = "top-left",
  centerOnViewport = false,
  onComplete,
}: TutorialPopoverProps) {
  const { shouldShow, complete } = useTutorialStep(tutorial, step);

  const handleComplete = () => {
    complete();
    onComplete?.();
  };

  if (!shouldShow) {
    return null;
  }

  const getArrowStyles = () => {
    switch (arrowPosition) {
      case "top-left":
        return {
          container: "absolute top-2 -left-2",
          border: cn(
            "absolute w-0 h-0 border-solid",
            "border-t-[8px] border-t-transparent",
            "border-r-[8px] border-r-border",
            "border-b-[8px] border-b-transparent"
          ),
          fill: cn(
            "absolute w-0 h-0 border-solid left-[1px]",
            "border-t-[8px] border-t-transparent",
            "border-r-[8px] border-r-popover",
            "border-b-[8px] border-b-transparent"
          ),
        };
      case "top-right":
        return {
          container: "absolute top-2 -right-2",
          border: cn(
            "absolute w-0 h-0 border-solid",
            "border-t-[8px] border-t-transparent",
            "border-l-[8px] border-l-border",
            "border-b-[8px] border-b-transparent"
          ),
          fill: cn(
            "absolute w-0 h-0 border-solid right-[1px]",
            "border-t-[8px] border-t-transparent",
            "border-l-[8px] border-l-popover",
            "border-b-[8px] border-b-transparent"
          ),
        };
      case "bottom-left":
        return {
          container: "absolute bottom-4 -left-2",
          border: cn(
            "absolute w-0 h-0 border-solid",
            "border-t-[8px] border-t-transparent",
            "border-r-[8px] border-r-border",
            "border-b-[8px] border-b-transparent"
          ),
          fill: cn(
            "absolute w-0 h-0 border-solid left-[1px]",
            "border-t-[8px] border-t-transparent",
            "border-r-[8px] border-r-popover",
            "border-b-[8px] border-b-transparent"
          ),
        };
      case "bottom-right":
        return {
          container: "absolute bottom-4 -right-2",
          border: cn(
            "absolute w-0 h-0 border-solid",
            "border-t-[8px] border-t-transparent",
            "border-l-[8px] border-l-border",
            "border-b-[8px] border-b-transparent"
          ),
          fill: cn(
            "absolute w-0 h-0 border-solid right-[1px]",
            "border-t-[8px] border-t-transparent",
            "border-l-[8px] border-l-popover",
            "border-b-[8px] border-b-transparent"
          ),
        };
      default:
        return {
          container: "",
          border: "",
          fill: "",
        };
    }
  };

  if (centerOnViewport) {
    if (!shouldShow) return null;
    
    return createPortal(
      <>
        {/* Backdrop overlay */}
        <div className="fixed inset-0 z-50 bg-black/60 animate-in fade-in-0 duration-200" />
        {/* Modal container */}
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className={cn(
              "w-80 rounded-md border bg-popover p-4 text-sm text-popover-foreground shadow-xl outline-none",
              "animate-in fade-in-0 zoom-in-95 duration-200",
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="font-semibold text-sm mb-2 text-foreground">
                {title}
              </div>
            )}
            <div className="text-sm text-muted-foreground leading-relaxed mb-4">
              {children}
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleComplete}>
                {buttonText}
              </Button>
            </div>
          </div>
        </div>
      </>,
      document.body
    );
  }

  return (
    <PopoverPrimitive.Root open={shouldShow}>
      <PopoverPrimitive.Anchor className="absolute inset-0 pointer-events-none" />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={side}
          align={align}
          sideOffset={8}
          className={cn(
            "z-50 w-80 rounded-md border bg-popover p-4 text-sm text-popover-foreground shadow-md outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            "origin-[--radix-popover-content-transform-origin]",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {showArrow && (
            <div className={getArrowStyles().container}>
              <div className={getArrowStyles().border} />
              <div className={getArrowStyles().fill} />
            </div>
          )}
          {title && (
            <div className="font-semibold text-sm mb-2 text-foreground">
              {title}
            </div>
          )}
          <div className="text-sm text-muted-foreground leading-relaxed mb-4">
            {children}
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleComplete}>
              {buttonText}
            </Button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

