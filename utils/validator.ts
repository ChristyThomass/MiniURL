/**
 * URL and Input Validation Utilities
 */

/**
 * Validates and normalizes a long URL.
 * Ensures the URL uses http or https protocol and is structurally valid.
 */
export function validateUrl(rawUrl: string): { valid: boolean; normalized?: string; error?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL is required and must be a string.' };
  }

  let trimmed = rawUrl.trim();

  // Basic length constraint
  if (trimmed.length > 2048) {
    return { valid: false, error: 'URL is too long (maximum 2048 characters).' };
  }

  // Prepend https:// if user omitted protocol for convenience, e.g. "github.com/foo"
  if (!/^https?:\/\//i.test(trimmed)) {
    // Check if it's a dangerous protocol like javascript:, data:, file:
    if (/^(javascript|data|file|vbscript|blob):/i.test(trimmed)) {
      return { valid: false, error: 'Invalid or prohibited URL protocol.' };
    }
    trimmed = 'https://' + trimmed;
  }

  try {
    const parsed = new URL(trimmed);

    // Protocol check: only http and https allowed
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are supported.' };
    }

    // Hostname check
    if (!parsed.hostname || parsed.hostname.length === 0) {
      return { valid: false, error: 'URL must contain a valid domain name or IP address.' };
    }

    // Prevent loopback/localhost malicious redirect loops if desired, but allow for local testing
    // Normalize href
    return { valid: true, normalized: parsed.href };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid URL structure.';
    return { valid: false, error: `Invalid URL format: ${message}` };
  }
}

/**
 * Validates an optional ISO date string for expiration.
 */
export function validateExpiresAt(expiresAt?: string | null): { valid: boolean; date?: string | null; error?: string } {
  if (!expiresAt) {
    return { valid: true, date: null };
  }

  const date = new Date(expiresAt);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid expiration date format. Must be an ISO timestamp.' };
  }

  // Must be in the future
  if (date.getTime() <= Date.now()) {
    return { valid: false, error: 'Expiration date must be in the future.' };
  }

  return { valid: true, date: date.toISOString() };
}
