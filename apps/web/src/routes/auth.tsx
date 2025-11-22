import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    const { data: session } = await authClient.getSession();
    // Don't redirect if we're on sign-in or sign-up pages - let forms handle navigation
    const isSignInOrSignUp = location.pathname === "/auth/sign-in" || location.pathname === "/auth/sign-up";
    if (session && !isSignInOrSignUp) {
      throw redirect({
        to: "/dashboard",
      });
    }
    return { session };
  },
});
