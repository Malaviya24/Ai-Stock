import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { API_BASE } from "./api";

/**
 * Resolve a URL: if it starts with `/api` and we have an API_BASE configured
 * (split deployment), prefix it with the backend origin. Otherwise keep as-is.
 */
function resolveUrl(url: string): string {
  if (API_BASE && url.startsWith("/api")) return `${API_BASE}${url}`;
  return url;
}

/**
 * Extracts a clean, human-readable message from a failed response instead of
 * throwing the raw response body. The backend consistently returns JSON
 * shaped like { message: "..." } on errors — previously this function threw
 * `Error(status + rawBodyText)`, which meant every toast/error surface in the
 * app showed something like `401: {"message":"Sign in required"}` instead of
 * just "Sign in required".
 */
async function throwIfResNotOk(res: Response) {
  if (res.ok) return;

  let message = res.statusText || `Request failed (${res.status})`;
  try {
    const text = await res.text();
    if (text) {
      try {
        const parsed = JSON.parse(text);
        message = parsed?.message || parsed?.error || text;
      } catch {
        // Response wasn't JSON — fall back to the raw text if it's short/plain.
        message = text.length < 200 ? text : message;
      }
    }
  } catch {
    // Reading the body failed; keep the statusText fallback.
  }

  const error = new Error(message) as Error & { status?: number };
  error.status = res.status;
  throw error;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(resolveUrl(url), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(resolveUrl(queryKey.join("/") as string), {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
