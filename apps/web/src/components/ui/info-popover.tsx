import { Info } from "lucide-react";
import * as React from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/cn";

interface InfoPopoverProps {
  children: React.ReactNode;
  title?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
  iconClassName?: string;
}

export function InfoPopover({
  children,
  title,
  side = "right",
  align = "start",
  className,
  iconClassName,
}: InfoPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full hover:bg-secondary/80 transition-colors",
            "size-5 shrink-0",
            iconClassName,
          )}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          <Info className="size-3.5 text-muted-foreground/70 hover:text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-80 p-4", className)}
        align={align}
        side={side}
        sideOffset={8}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="font-semibold text-sm mb-2 text-foreground">
            {title}
          </div>
        )}
        <div className="text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}

