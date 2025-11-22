import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
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
import { WorkspaceLoadingModal } from "@/components/workspace-loading-modal";
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
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const navigate = useNavigate();
  const form = useForm<SignUpFormValues>({
    resolver: standardSchemaResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  // Monitor session and navigate when ready
  useEffect(() => {
    if (!showLoadingModal) return;

    const checkSessionAndNavigate = async () => {
      let attempts = 0;
      const maxAttempts = 50; // Wait up to 5 seconds (50 * 100ms)
      
      while (attempts < maxAttempts) {
        const { data: session } = await authClient.getSession();
        if (session) {
          // Session is available, navigate to create workspace page
          navigate({
            to: "/dashboard/workspace/create",
            replace: true,
          });
          // Modal will close when component unmounts
          return;
        }
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      
      // If we get here, session never became available
      toast.error("Failed to establish session. Please try again.");
      setShowLoadingModal(false);
      setIsPending(false);
    };

    checkSessionAndNavigate();
  }, [showLoadingModal, navigate]);

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

      // Initialize Else extension for the new user (non-blocking)
      client.else.user.extension.initialize.$post().then(() => {
        console.log("✅ Else extension initialized for new user");
      }).catch((error) => {
        // Log error but don't block the sign-up flow
        console.error("Failed to initialize Else extension:", error);
      });

      toast.success("Account created successfully");
      
      // Show loading modal - it will handle waiting for session and navigation
      setShowLoadingModal(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign up");
      setIsPending(false);
    }
  };

  return (
    <>
      <WorkspaceLoadingModal
        isOpen={showLoadingModal}
        title="Creating your account"
        description="Please wait while we set up your account..."
        statusText="Setting up your account..."
      />
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
          disabled={isPending}
          className="w-full mt-4 text-white"
        >
          {isPending ? "Creating Account..." : "Create Account"}
        </Button>
      </form>
    </Form>
    </>
  );
}
