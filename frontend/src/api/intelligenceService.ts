import { apiRequest } from './client';
import type { ProjectIntelligence } from './types';

/**
 * Generates predictive intelligence for a project using the backend's
 * orchestrating endpoint. This returns the model prediction, contextual
 * metrics, explanatory reasons, external evidence, and LLM recommendation
 * in a single request.
 *
 * The predictionMonth must correspond to an exact PAIMANA observation
 * for the project.
 */
export function fetchProjectIntelligence(
  projectCode: string,
  predictionMonth: string
): Promise<ProjectIntelligence> {
  return apiRequest<ProjectIntelligence>(
    `/projects/${encodeURIComponent(projectCode)}/intelligence`,
    {
      method: 'POST',
      body: JSON.stringify({ predictionMonth }),
    }
  );
}
