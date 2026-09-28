import { UpstreamError } from './credit-rating-api';

/**
 * Pulls a clean user-facing message out of an upstream error.
 *
 * Backend `BusinessRuleException`s are returned as `{"message":"..."}` JSON
 * with a 4xx status. The fetch wrapper in `credit-rating-api.ts` packs that
 * raw body into `UpstreamError.body` (and prepends "Upstream {status}: " to
 * the .message for logging). For the toast we want only the inner message.
 */
export function extractUpstreamMessage(error: unknown): string {
  if (error instanceof UpstreamError) {
    const body = error.body?.trim();
    if (body && body.startsWith('{')) {
      try {
        const parsed = JSON.parse(body) as { message?: unknown };
        if (typeof parsed.message === 'string' && parsed.message.length > 0) {
          return parsed.message;
        }
      } catch {
        // Fall through to body text.
      }
    }
    return body || 'Failed.';
  }
  if (error instanceof Error) return error.message;
  return 'Failed.';
}
