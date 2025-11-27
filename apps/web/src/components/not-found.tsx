import { Link } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { Home, FileQuestion } from "lucide-react";

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-background text-foreground p-8">
      <div className="flex flex-col items-center max-w-md space-y-6 text-center">
        <div className="flex items-center justify-center w-24 h-24 rounded-full bg-muted">
          <FileQuestion className="w-12 h-12 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">404</h1>
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
          <p className="text-muted-foreground">
            Sorry, the page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <Button asChild size="default" className="mt-4">
          <Link to="/dashboard">
            <Home className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}

