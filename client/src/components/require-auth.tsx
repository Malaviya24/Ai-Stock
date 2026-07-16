import { useEffect } from "react";
import { useLocation } from "wouter";
import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { CLERK_ENABLED } from "@/lib/clerk";

/**
 * Wraps a route's content so it only renders for signed-in users.
 * When Clerk isn't configured (no publishable key), auth is a no-op and the
 * route stays open — same "empty key = feature off" behavior as the rest of
 * this project's optional integrations.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!CLERK_ENABLED) return <>{children}</>;

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

function RedirectToSignIn() {
  const [, navigate] = useLocation();
  const { isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded) navigate("/sign-in");
  }, [isLoaded, navigate]);

  return null;
}
