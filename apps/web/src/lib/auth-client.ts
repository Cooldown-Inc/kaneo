import {
  anonymousClient,
  lastLoginMethodClient,
  magicLinkClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, admin, member, owner } from "./permissions";

// Parse VITE_API_URL to separate base URL from path
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:1337";
const url = new URL(apiUrl);
const baseURL = `${url.protocol}//${url.host}`;
const pathPrefix = url.pathname.replace(/\/$/, ""); // Remove trailing slash
const basePath = pathPrefix ? `${pathPrefix}/api/auth` : "/api/auth";

export const authClient = createAuthClient({
  baseURL,
  basePath,
  plugins: [
    anonymousClient(),
    lastLoginMethodClient(),
    magicLinkClient(),
    organizationClient({
      ac,
      roles: {
        member,
        admin,
        owner,
      },
    }),
  ],
});
