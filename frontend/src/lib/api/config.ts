/**
 * Central API URL configuration.
 * Browser traffic uses same-origin /api (proxied by Next.js to localhost:5000).
 * Backend binds to 127.0.0.1 only — port 5000 is not exposed on the LAN.
 */
const DEFAULT_API_BASE = 'http://127.0.0.1:5000/api';
const DEFAULT_TIMEOUT_MS = 8000;
const BACKEND_PORT = process.env.NEXT_PUBLIC_BACKEND_PORT || '5000';

function getPageHostname(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  return host || null;
}

function getPageOrigin(): string | null {
  if (typeof window === 'undefined') return null;
  const host = getPageHostname();
  if (!host) return null;
  const port = window.location.port;
  return `${window.location.protocol}//${host}${port ? `:${port}` : ''}`;
}

export function getApiBaseUrl(): string {
  const origin = getPageOrigin();
  if (origin) {
    return `${origin}/api`;
  }
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE).replace(/\/$/, '');
}

/** Build a full API path, e.g. apiUrl('/users') → http://host:5000/api/users */
export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalized}`;
}

/** Server origin without /api — for WebSocket */
export function getServerOrigin(): string {
  return getApiBaseUrl().replace(/\/api\/?$/, '');
}

/** Socket.io origin — same host as the page (proxied by Next.js to localhost:5000) */
export function getWebSocketUrl(): string {
  const origin = getPageOrigin();
  if (origin) {
    return origin;
  }
  return (process.env.NEXT_PUBLIC_WEBSOCKET_URL || getServerOrigin()).replace(/\/$/, '');
}

/**
 * Fetch with timeout so unreachable servers fail fast instead of hanging 30+ seconds.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(apiUrl(path), {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Server did not respond within ${timeoutMs / 1000}s. Check that the backend is running on port ${BACKEND_PORT} and reachable at ${getApiBaseUrl()}.`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/** Attach JWT from the browser session */
export function authHeaders(token: string, extra: HeadersInit = {}): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}
