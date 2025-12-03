import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";
import * as ElseSDK from "@elsedev/react-csr-sdk";
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
import { TutorialPopover } from "@/components/ui/tutorial-popover";
import { authClient } from "@/lib/auth-client";
import { client } from "@/lib/client";
import { isTutorialCompleted, startTutorial } from "@/lib/tutorials";

export type SignInFormValues = {
  email: string;
  password: string;
};

const signInSchema = z.object({
  email: z.email(),
  password: z.string(),
});

export function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const navigate = useNavigate();
  const form = useForm<SignInFormValues>({
    resolver: standardSchemaResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Auto-start Else welcome tutorial when in Else dev environment
  useEffect(() => {
    if (ElseSDK.inElseDevEnvironment() && !isTutorialCompleted("else-welcome")) {
      startTutorial("else-welcome");
      window.dispatchEvent(new CustomEvent("tutorial-state-changed"));
    }
  }, []);

  const onSubmit = async (data: SignInFormValues) => {
    setIsPending(true);
    try {
      const result = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        toast.error(result.error.message || "Failed to sign in");
        setIsPending(false);
        return;
      }

      // Initialize Else extension synchronously (skip in Else dev environment)
      if (!ElseSDK.inElseDevEnvironment()) {
        try {
          await client.else.user.extension.initialize.$post();
        } catch (error) {
          // Silently handle errors - don't block the sign-in flow
        }
      }

      toast.success("Signed in successfully");
      // Navigate to dashboard - component will unmount, no need to clear isPending
      navigate({
        to: "/dashboard",
        replace: true,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign in");
      setIsPending(false);
    }
  };

  return (
    <div className="relative">
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
                      disabled={isPending}
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
                        disabled={isPending}
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isPending}
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
            disabled={isPending}
            size="sm"
            className="w-full mt-4 text-white"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "Signing In..." : "Sign In"}
          </Button>
        </form>
      </Form>

      <TutorialPopover
        tutorial="else-welcome"
        step="intro"
        centerOnViewport={true}
        showArrow={false}
      />
    </div>
  );
}
