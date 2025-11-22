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

declare global {
  interface Window {
    else?: {
      inElseDevEnvironment: () => boolean;
    };
  }
}

export type SignUpFormValues = {
  email: string;
  password: string;
  name: string;
};

const signUpSchema = z.object({
  email: z.email(),
  password: z.string().min(8, { message: "Password is too short" }),
  name: z.string(),
});

const SIGN_UP_PENDING_STORAGE_KEY = "sign-up-pending";
const SIGN_UP_PENDING_TIMESTAMP_KEY = "sign-up-pending-timestamp";
const PENDING_TIMEOUT_MS = 5000; // 5 seconds - if older than this, consider it stale

export function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const navigate = useNavigate();
  const delayCompleteRef = useRef(false);
  const form = useForm<SignUpFormValues>({
    resolver: standardSchemaResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  const onSubmit = async (data: SignUpFormValues) => {
    const timestamp = Date.now().toString();
    sessionStorage.setItem(SIGN_UP_PENDING_STORAGE_KEY, "true");
    sessionStorage.setItem(SIGN_UP_PENDING_TIMESTAMP_KEY, timestamp);
    setIsPending(true);
    try {
      const result = await authClient.signUp.email({
        email: data.email,
        name: data.name,
        password: data.password,
      });

      if (result.error) {
        toast.error(result.error.message || "Failed to sign up");
        sessionStorage.removeItem(SIGN_UP_PENDING_STORAGE_KEY);
        sessionStorage.removeItem(SIGN_UP_PENDING_TIMESTAMP_KEY);
        setIsPending(false);
        return;
      }

      // Initialize Else extension synchronously (skip in Else dev environment)
      if (!window.else?.inElseDevEnvironment()) {
        try {
          await client.else.user.extension.initialize.$post();
        } catch (error) {
          // Silently handle errors - don't block the sign-up flow
        }
      }

      toast.success("Account created successfully");
      delayCompleteRef.current = true;
      // Navigate to workspace creation - loading state will clear when component unmounts
      navigate({
        to: "/dashboard/workspace/create",
        replace: true,
      });
      // Don't clear isPending or sessionStorage - let it stay visible during navigation
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign up");
      sessionStorage.removeItem(SIGN_UP_PENDING_STORAGE_KEY);
      sessionStorage.removeItem(SIGN_UP_PENDING_TIMESTAMP_KEY);
      setIsPending(false);
    }
  };

  // Check sessionStorage on mount - clear if stale (likely from page refresh)
  React.useEffect(() => {
    const stored = sessionStorage.getItem(SIGN_UP_PENDING_STORAGE_KEY);
    const timestamp = sessionStorage.getItem(SIGN_UP_PENDING_TIMESTAMP_KEY);
    
    if (stored === "true" && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      // If older than timeout, it's likely from a page refresh, so clear it
      if (age > PENDING_TIMEOUT_MS) {
        sessionStorage.removeItem(SIGN_UP_PENDING_STORAGE_KEY);
        sessionStorage.removeItem(SIGN_UP_PENDING_TIMESTAMP_KEY);
      } else {
        // Still fresh, restore pending state
        setIsPending(true);
      }
    }
  }, []);

  // Use sessionStorage to persist pending state across remounts
  const displayPending = sessionStorage.getItem(SIGN_UP_PENDING_STORAGE_KEY) === "true" || isPending;

  // Clean up sessionStorage when component unmounts (after navigation)
  React.useEffect(() => {
    return () => {
      // Only clear if we're navigating away (not on error)
      if (delayCompleteRef.current) {
        sessionStorage.removeItem(SIGN_UP_PENDING_STORAGE_KEY);
        sessionStorage.removeItem(SIGN_UP_PENDING_TIMESTAMP_KEY);
      }
    };
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Full Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="John Doe"
                    type="text"
                    autoComplete="name"
                    disabled={displayPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage>{fieldState.error?.message}</FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
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
                <FormMessage>{fieldState.error?.message}</FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
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
                <FormMessage>{fieldState.error?.message}</FormMessage>
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          disabled={displayPending}
          className="w-full mt-4 text-white"
        >
          {displayPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {displayPending ? "Creating Account..." : "Create Account"}
        </Button>
      </form>
    </Form>
  );
}
