// Whether Clerk auth is configured. When the publishable key is absent (e.g.
// local dev before signing up for Clerk), the app runs with the dashboard
// fully open instead of crashing — same "empty key = feature off" pattern
// used for Shoonya/AI elsewhere in this project.
export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined;

export const CLERK_ENABLED = Boolean(CLERK_PUBLISHABLE_KEY);
