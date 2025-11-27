import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import * as ElseSDK from "@elsedev/react-csr-sdk";
import { authClient } from "@/lib/auth-client";

function useSignOut() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      // Clear Else bundle before signing out (don't reload, we'll navigate)
      try {
        ElseSDK.clearCustomBundle(false);
      } catch (error) {
        // Silently handle errors - don't block logout
      }

      const result = await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            navigate({ to: "/auth/sign-up" });
          },
        },
      });
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export default useSignOut;
