import { ApiError, type ApiErrorBody } from './types';

/**
 * Base URL for the PAIMANA backend API.
 *
 * Configure via VITE_API_BASE_URL. Falls back to the local development
 * backend on port 3000.
 */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:3000/api/v1';

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
