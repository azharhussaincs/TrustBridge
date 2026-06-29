/**
 * Central API URL configuration.
 * In the browser, URLs follow window.location.hostname so the same build works at
 * http://localhost:3000 and http://192.168.x.x:3000 without changing env vars.
 */
const DEFAULT_API_BASE = 'http://localhost:5000/api';
const DEFAULT_TIMEOUT_MS = 8000;
const BACKEND_PORT = process.env.NEXT_PUBLIC_BACKEND_PORT || '5000';

/** Hostnames served through NGINX (API at /api on same port). Empty = IP:3000 → API on IP:5000. */
const PROXY_HOSTNAMES = (process.env.NEXT_PUBLIC_PROXY_HOSTNAME || '')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

function getPageHostname(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  return host || null;
}

/** True when the page is served on port 80/443 or a known proxy hostname. */
function isBehindReverseProxy(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  if (PROXY_HOSTNAMES.includes(host)) return true;
  const port = window.location.port;
  return port === '' || port === '80' || port === '443';
}

export function getApiBaseUrl(): string {
  const pageHost = getPageHostname();
  if (pageHost) {
    if (isBehindReverseProxy()) {
      return `${window.location.protocol}//${pageHost}/api`;
    }
    return `http://${pageHost}:${BACKEND_PORT}/api`;
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

/** Socket.io origin — matches page hostname in the browser */
export function getWebSocketUrl(): string {
  const pageHost = getPageHostname();
  if (pageHost) {
    if (isBehindReverseProxy()) {
      return `${window.location.protocol}//${pageHost}`;
    }
    return `http://${pageHost}:${BACKEND_PORT}`;
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
