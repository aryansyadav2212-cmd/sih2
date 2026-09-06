import { useEffect, useState } from 'react';
import { fetchProjectIntelligence } from '../api/intelligenceService';
import { ApiError, type ProjectIntelligence } from '../api/types';

// ============================================================================
// In-flight request deduplication + caching
//
// Opening a project mounts non-trivial React component trees that fetch
// intelligence. In development, React StrictMode runs effects twice, which
// would otherwise trigger duplicate prediction requests. We cache results
// by key and share in-flight promises so concurrent/near-simultaneous calls
// reuse a single backend request.
// ============================================================================

const inFlight = new Map<string, Promise<ProjectIntelligence>>();
const resultCache = new Map<string, ProjectIntelligence>();

function getKey(projectCode: string, predictionMonth: string): string {
  return `${projectCode}::${predictionMonth}`;
}

function loadIntelligence(
  projectCode: string,
  predictionMonth: string
): Promise<ProjectIntelligence> {
  const key = getKey(projectCode, predictionMonth);

  const cached = resultCache.get(key);
  if (cached) return Promise.resolve(cached);

  const existing = inFlight.get(key);
  if (existing) return existing;

  const request = fetchProjectIntelligence(
    projectCode,
    predictionMonth
  )
    .then((data) => {
      resultCache.set(key, data);
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);

  return request;
}

interface UseIntelligenceState {
  data: ProjectIntelligence | null;
  loading: boolean;
  error: string | null;
  /**
   * Backend error code when available (e.g. MISSING_COMPLETION_DEADLINE,
   * SERVICE_UNAVAILABLE, RATE_LIMIT_EXCEEDED, RECOMMENDATION_UNAVAILABLE).
   * Lets callers surface the correct, honest failure category instead of a
   * generic 500 message.
   */
  errorCode: string | null;
  /** True when loading is complete and no data is available. */
  unavailable: boolean;
}

/**
 * Loads predictive intelligence for a project/month.
 *
 * Predictions/LLM recommendations can fail independently of the rest of the
 * page (missing deadline data, ML service down, rate limits). This hook keeps
 * those failures isolated so the project detail page stays usable and the
 * caller decides how prominently to surface the error.
 */
export function useIntelligence(
  projectCode: string | undefined,
  predictionMonth: string | undefined
): UseIntelligenceState {
  const [data, setData] = useState<ProjectIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    if (!projectCode || !predictionMonth) {
      setData(null);
      setLoading(false);
      setError(null);
      setErrorCode(null);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);
    setErrorCode(null);

    loadIntelligence(projectCode, predictionMonth)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setLoading(false);

        if (err instanceof ApiError) {
          setError(err.message);
          setErrorCode(err.code ?? null);
        } else if (err instanceof Error) {
          setError(err.message);
          setErrorCode(null);
        } else {
          setError('Unable to generate project intelligence');
          setErrorCode(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectCode, predictionMonth]);

  const unavailable = !loading && !data && error !== null;

  return { data, loading, error, errorCode, unavailable };
}
