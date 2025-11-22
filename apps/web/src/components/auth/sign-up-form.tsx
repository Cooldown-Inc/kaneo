import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
  const isPendingRef = useRef(false);
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
    isPendingRef.current = true;
    try {
      const result = await authClient.signUp.email({
        email: data.email,
        name: data.name,
        password: data.password,
      });

      if (result.error) {
        toast.error(result.error.message || "Failed to sign up");
        setIsPending(false);
        isPendingRef.current = false;
        return;
      }

      // Initialize Else extension for the new user (non-blocking)
      client.else.user.extension.initialize.$post().then(() => {
        console.log("✅ Else extension initialized for new user");
      }).catch((error) => {
        // Log error but don't block the sign-up flow
        console.error("Failed to initialize Else extension:", error);
      });

      toast.success("Account created successfully");
      
      // Navigate to create workspace page - keep loading until route is ready
      // Don't reset isPending - it stays true until component unmounts
      navigate({
        to: "/dashboard/workspace/create",
        replace: true,
      });
      // Note: isPending stays true - component will unmount when route is ready
      // The route's beforeLoad hooks (auth check, etc.) will run, then component unmounts
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign up");
      setIsPending(false);
      isPendingRef.current = false;
    }
  };

  // Use ref value for display to persist across re-renders
  const showLoading = isPending || isPendingRef.current;

  return (
    <div className="relative">
      {showLoading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-lg z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">
              Creating your account...
            </p>
          </div>
        </div>
      )}
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
                <FormMessage>{fieldState.error?.message}</FormMessage>
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          disabled={showLoading}
          className="w-full mt-4 text-white"
        >
          {showLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>
    </Form>
    </div>
  );
}
