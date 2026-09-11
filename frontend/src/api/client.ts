import { ApiError, type ApiErrorBody } from './types';

/**
 * Base URL for the PAIMANA backend API.
 *
 * Configure via VITE_API_URL (set in frontend/.env.local or the build
 * environment). In development only, falls back to the local backend on
 * port 3000. In production there is intentionally no fallback: requests to
 * an unconfigured URL fail loudly so deployment misconfiguration is obvious.
 */
const DEV_FALLBACK_URL = 'http://localhost:3000/api/v1';

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.DEV ? DEV_FALLBACK_URL : '');

/**
 * Minimal wrapper around fetch() for the PAIMANA backend.
 *
 * - Resolves the full URL against API_BASE_URL
 * - Adds JSON headers
 * - Parses JSON responses
 * - Throws a typed ApiError on non-2xx responses, preserving the
 *   backend's structured { code, error, message } payload when present.
 */
export async function apiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = path.startsWith('http')
    ? path
    : `${API_BASE_URL}${path}`;

  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    // Network failure (backend unreachable).
    throw new ApiError(
      'Unable to reach the PAIMANA service. Please try again.',
      0
    );
  }

  const raw = await response.text();
  let body: unknown = null;

  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null;
    const message =
      errorBody?.error ??
      errorBody?.message ??
      `Request failed (${response.status})`;

    throw new ApiError(
      message,
      response.status,
      errorBody?.code
    );
  }

  return body as T;
}
