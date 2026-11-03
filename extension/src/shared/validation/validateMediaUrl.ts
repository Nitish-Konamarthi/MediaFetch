import type { ValidatedMediaUrl } from '../domain/media';

export type UrlValidationFailure = 'invalid-url' | 'unsupported-protocol' | 'unapproved-host';

export type UrlValidationResult =
  | { readonly ok: true; readonly value: ValidatedMediaUrl }
  | { readonly ok: false; readonly reason: UrlValidationFailure };

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, '');
}

export function validateMediaUrl(
  input: string,
  allowedHostnames: readonly string[],
): UrlValidationResult {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, reason: 'invalid-url' };
  }

  if (url.protocol !== 'https:') {
    return { ok: false, reason: 'unsupported-protocol' };
  }

  if (!url.hostname || url.username || url.password) {
    return { ok: false, reason: 'invalid-url' };
  }

  const allowed = new Set(allowedHostnames.map(normalizeHostname));
  if (!allowed.has(normalizeHostname(url.hostname))) {
    return { ok: false, reason: 'unapproved-host' };
  }

  return { ok: true, value: url.href as ValidatedMediaUrl };
}
