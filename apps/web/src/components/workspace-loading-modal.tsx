import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface WorkspaceLoadingModalProps {
  isOpen: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  statusText?: string;
}

export function WorkspaceLoadingModal({
  isOpen,
  onOpenChange,
  title = "Opening Else Workspace",
  description = "We're setting up your development workspace. This may take a moment...",
  statusText = "Preparing your workspace",
}: WorkspaceLoadingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/50">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-base">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-12 space-y-6">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground/80 text-center font-medium">
            {statusText}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

