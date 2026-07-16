import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { setClerkTokenGetter } from "@/lib/api";

/**
 * Invisible component that wires Clerk's session token getter into the
 * global fetch interceptor. Must be rendered inside <ClerkProvider>.
 * In split-deployment mode (frontend on Vercel, backend on Render), every
 * cross-origin API call needs a Bearer token since cookies don't travel
 * between domains. This bridge makes that work automatically.
 */
export function ClerkTokenProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    setClerkTokenGetter(() => getToken());
  }, [getToken]);

  return <>{children}</>;
}
