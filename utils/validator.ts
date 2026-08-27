/**
 * URL and Input Validation Utilities
 */

/**
 * Validates and normalizes a long URL.
 * Ensures the URL uses http or https protocol and is structurally valid.
 */
export function validateUrl(rawUrl: string): { valid: boolean; normalized?: string; error?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL is required and cannot be empty.' };
  }

  let trimmed = rawUrl.trim();

  if (!trimmed) {
    return { valid: false, error: 'URL is required and cannot be empty.' };
  }

  // Basic length constraint
  if (trimmed.length > 2048) {
    return { valid: false, error: 'URL is too long (maximum 2048 characters).' };
  }

  // Check for prohibited dangerous script protocols
  if (/^(javascript|data|file|vbscript|blob):/i.test(trimmed)) {
    return { valid: false, error: 'Prohibited URL protocol (javascript:, data:, file: are not allowed).' };
  }

  // Prepend protocol if user omitted protocol for convenience, e.g. "google.com" or "localhost:3000"
  if (!/^https?:\/\//i.test(trimmed)) {
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/.*)?$/i.test(trimmed)) {
      trimmed = 'http://' + trimmed;
    } else {
      trimmed = 'https://' + trimmed;
    }
  }

  try {
    const parsed = new URL(trimmed);

    // Protocol check: only http and https allowed
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only standard HTTP and HTTPS web URLs are supported.' };
    }

    // Hostname check
    if (!parsed.hostname || parsed.hostname.length === 0) {
      return { valid: false, error: 'URL must contain a valid domain name, host, or IP address.' };
    }

    return { valid: true, normalized: parsed.href };
  } catch {
    // If standard URL constructor failed, try encoding spaces/special characters
    try {
      const encoded = encodeURI(trimmed);
      const parsed = new URL(encoded);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { valid: false, error: 'Only standard HTTP and HTTPS web URLs are supported.' };
      }
      return { valid: true, normalized: parsed.href };
    } catch {
      return { valid: false, error: 'Invalid URL format. Please enter a valid address like https://example.com' };
    }
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
