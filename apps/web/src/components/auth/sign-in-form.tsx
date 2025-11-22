import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import * as React from "react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { client } from "@/lib/client";

export type SignInFormValues = {
  email: string;
  password: string;
};

const signInSchema = z.object({
  email: z.email(),
  password: z.string(),
});

const PENDING_STORAGE_KEY = "sign-in-pending";
const PENDING_TIMESTAMP_KEY = "sign-in-pending-timestamp";
const PENDING_TIMEOUT_MS = 5000; // 5 seconds - if older than this, consider it stale

export function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const navigate = useNavigate();
  const delayCompleteRef = useRef(false);
  const form = useForm<SignInFormValues>({
    resolver: standardSchemaResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignInFormValues) => {
    const timestamp = Date.now().toString();
    sessionStorage.setItem(PENDING_STORAGE_KEY, "true");
    sessionStorage.setItem(PENDING_TIMESTAMP_KEY, timestamp);
    setIsPending(true);
    try {
      const result = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        toast.error(result.error.message || "Failed to sign in");
        sessionStorage.removeItem(PENDING_STORAGE_KEY);
        sessionStorage.removeItem(PENDING_TIMESTAMP_KEY);
        setIsPending(false);
        return;
      }

      // Initialize Else extension synchronously
      try {
        await client.else.user.extension.initialize.$post();
      } catch (error) {
        // Log error but don't block the sign-in flow
        // Error is silently handled to not interrupt sign-in flow
      }

      toast.success("Signed in successfully");
      delayCompleteRef.current = true;
      // Navigate to dashboard - loading state will clear when component unmounts
      navigate({
        to: "/dashboard",
        replace: true,
      });
      // It will be cleared when the component unmounts after navigation
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign in");
      sessionStorage.removeItem(PENDING_STORAGE_KEY);
      sessionStorage.removeItem(PENDING_TIMESTAMP_KEY);
      setIsPending(false);
    }
  };

  // Check sessionStorage on mount - clear if stale (likely from page refresh)
  React.useEffect(() => {
    const stored = sessionStorage.getItem(PENDING_STORAGE_KEY);
    const timestamp = sessionStorage.getItem(PENDING_TIMESTAMP_KEY);
    
    if (stored === "true" && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      // If older than timeout, it's likely from a page refresh, so clear it
      if (age > PENDING_TIMEOUT_MS) {
        sessionStorage.removeItem(PENDING_STORAGE_KEY);
        sessionStorage.removeItem(PENDING_TIMESTAMP_KEY);
      } else {
        // Still fresh, restore pending state
        setIsPending(true);
      }
    }
  }, []);

  // Use sessionStorage to persist pending state across remounts
  const displayPending = sessionStorage.getItem(PENDING_STORAGE_KEY) === "true" || isPending;

  // Clean up sessionStorage when component unmounts (after navigation)
  React.useEffect(() => {
    return () => {
      // Only clear if we're navigating away (not on error)
      if (delayCompleteRef.current) {
        sessionStorage.removeItem(PENDING_STORAGE_KEY);
        sessionStorage.removeItem(PENDING_TIMESTAMP_KEY);
      }
    };
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-3">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="me@example.com"
                    type="email"
                    autoComplete="email"
                    disabled={displayPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      disabled={displayPending}
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={displayPending}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          disabled={displayPending}
          size="sm"
          className="w-full mt-4 text-white"
        >
          {displayPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {displayPending ? "Signing In..." : "Sign In"}
        </Button>
      </form>
    </Form>
  );
}
