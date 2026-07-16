import type { Express, Request, Response, NextFunction } from "express";

export const CLERK_ENABLED = Boolean(
  process.env.CLERK_SECRET_KEY && process.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// @clerk/express exposes a standalone getAuth(req) helper (not req.auth()
// like the Next.js SDK). We cache it here after the one-time dynamic import
// in setupAuth() (awaited at startup before any request is handled), so the
// many synchronous getUserId(req) call sites throughout routes.ts keep working
// without needing to be made async. This project runs as an ESM module
// ("type": "module"), so a top-level `require()` isn't available here.
let cachedGetAuth: ((req: Request) => { userId: string | null }) | null = null;

/**
 * Mounts Clerk's request-auth middleware when configured. When Clerk isn't
 * set up (no secret key), this is a no-op so the app keeps running with the
 * API fully open — same "empty key = feature off" pattern as Shoonya/AI.
 */
export async function setupAuth(app: Express) {
  if (!CLERK_ENABLED) {
    console.log("[auth] Clerk not configured — API routes are unauthenticated.");
    return;
  }
  const { clerkMiddleware, getAuth } = await import("@clerk/express");
  cachedGetAuth = getAuth;
  app.use(
    clerkMiddleware({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
    }),
  );
  console.log("[auth] Clerk middleware enabled.");
}

/**
 * Route guard for user-scoped endpoints (watchlist, portfolio, saved AI
 * analyses). When Clerk is disabled, requests pass through with a shared
 * "local" userId so the app still functions for solo/demo use.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!CLERK_ENABLED || !cachedGetAuth) {
    (req as any).userId = "local";
    return next();
  }
  const auth = cachedGetAuth(req);
  if (!auth?.userId) {
    return res.status(401).json({ message: "Sign in required" });
  }
  (req as any).userId = auth.userId;
  next();
}

/** Reads the current userId without enforcing auth (falls back to "local"). */
export function getUserId(req: Request): string {
  if (!CLERK_ENABLED || !cachedGetAuth) return "local";
  const auth = cachedGetAuth(req);
  return auth?.userId || "local";
}
