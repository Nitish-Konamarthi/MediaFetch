import { describe, expect, it } from 'vitest';
import { validateMediaUrl } from '../../../src/shared/validation/validateMediaUrl';

const allowedHosts = ['media.example.test'];

describe('validateMediaUrl', () => {
  it('accepts allowlisted HTTPS media URLs and preserves query parameters', () => {
    const result = validateMediaUrl(
      'https://media.example.test/video.mp4?token=abc&download=1',
      allowedHosts,
    );

    expect(result).toEqual({
      ok: true,
      value: 'https://media.example.test/video.mp4?token=abc&download=1',
    });
  });

  it('rejects malformed URLs', () => {
    expect(validateMediaUrl('not a URL', allowedHosts)).toEqual({
      ok: false,
      reason: 'invalid-url',
    });
  });

  it.each(['javascript:alert(1)', 'file:///video.mp4', 'data:video/mp4;base64,AAAA'])(
    'rejects the dangerous protocol in %s',
    (input) => {
      expect(validateMediaUrl(input, allowedHosts)).toEqual({
        ok: false,
        reason: 'unsupported-protocol',
      });
    },
  );

  it('rejects HTTPS URLs outside the explicit hostname allowlist', () => {
    expect(validateMediaUrl('https://other.example.test/video.mp4', allowedHosts)).toEqual({
      ok: false,
      reason: 'unapproved-host',
    });
  });

  it('rejects URLs containing user information', () => {
    expect(
      validateMediaUrl('https://user:secret@media.example.test/video.mp4', allowedHosts),
    ).toEqual({
      ok: false,
      reason: 'invalid-url',
    });
  });
});
