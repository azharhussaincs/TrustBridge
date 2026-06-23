/**
 * Central API URL configuration.
 * Always use these helpers instead of hardcoded localhost or LAN IPs
 * so the app works from any subnet/machine when NEXT_PUBLIC_API_URL is set.
 */
const DEFAULT_API_BASE = 'http://localhost:5000/api';
const DEFAULT_TIMEOUT_MS = 8000;

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE).replace(/\/$/, '');
}

/** Build a full API path, e.g. apiUrl('/users') → http://host:5000/api/users */
export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalized}`;
}

/** Server origin without /api — for WebSocket fallbacks */
export function getServerOrigin(): string {
  return getApiBaseUrl().replace(/\/api\/?$/, '');
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
        `Server did not respond within ${timeoutMs / 1000}s. Check that the backend is running and NEXT_PUBLIC_API_URL (${getApiBaseUrl()}) is reachable from this machine.`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/** Attach JWT from localStorage */
export function authHeaders(token: string, extra: HeadersInit = {}): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}
