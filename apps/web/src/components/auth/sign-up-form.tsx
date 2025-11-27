import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
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
import { authClient } from "@/lib/auth-client";
import { client } from "@/lib/client";

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

export function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const navigate = useNavigate();
  const form = useForm<SignUpFormValues>({
    resolver: standardSchemaResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  const onSubmit = async (data: SignUpFormValues) => {
    setIsPending(true);
    try {
      const result = await authClient.signUp.email({
        email: data.email,
        name: data.name,
        password: data.password,
      });

      if (result.error) {
        toast.error(result.error.message || "Failed to sign up");
        setIsPending(false);
        return;
      }

      // Initialize Else extension synchronously (skip in Else dev environment)
      if (!ElseSDK.inElseDevEnvironment()) {
        try {
          await client.else.user.extension.initialize.$post();
        } catch (error) {
          // Silently handle errors - don't block the sign-up flow
        }
      }

      toast.success("Account created successfully");
      // Navigate to workspace creation - component will unmount, no need to clear isPending
      navigate({
        to: "/dashboard/workspace/create",
        replace: true,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign up");
      setIsPending(false);
    }
  };

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
                    disabled={isPending}
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
                    disabled={isPending}
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
                <FormMessage>{fieldState.error?.message}</FormMessage>
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full mt-4 text-white"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? "Creating Account..." : "Create Account"}
        </Button>
      </form>
    </Form>
  );
}
