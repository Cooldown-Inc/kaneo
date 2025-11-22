import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
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

      // Initialize Else extension if not already done (non-blocking)
      client.else.user.extension.initialize.$post().then(() => {
        console.log("✅ Else extension initialized for user");
      }).catch((error) => {
        // Log error but don't block the sign-in flow
        console.error("Failed to initialize Else extension:", error);
      });

      toast.success("Signed in successfully");
      
      // Navigate to dashboard - keep loading until navigation completes
      await navigate({
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
      {isPending && (
        <div className="absolute inset-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-lg z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">
              Signing you in...
            </p>
          </div>
        </div>
      )}
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
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
          {isPending ? "Signing In..." : "Sign In"}
        </Button>
      </form>
    </Form>
    </div>
  );
}
