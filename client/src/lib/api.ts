// Base URL for all API calls. In development (local), this is empty (same origin).
// In production with a split deployment (frontend on Vercel, backend on Render),
// this points to the Render backend URL.
//
// Set via VITE_API_URL in your .env or Vercel's environment variables:
//   VITE_API_URL=https://ai-stock-nyj7.onrender.com
//
// Leave empty for same-origin deployment (e.g. both served from Render).
export const API_BASE = (import.meta.env.VITE_API_URL as string) || "";

/** Prefix a relative API path with the backend base URL. */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
