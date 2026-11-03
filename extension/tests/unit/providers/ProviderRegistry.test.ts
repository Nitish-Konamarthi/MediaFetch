import { describe, expect, it, vi } from 'vitest';
import type { ResolutionResult, ValidatedMediaUrl } from '../../../src/shared/domain/media';
import type { MediaProvider } from '../../../src/providers/MediaProvider';
import { ProviderRegistry } from '../../../src/providers/ProviderRegistry';
import { DirectMediaProvider } from '../../../src/providers/direct/DirectMediaProvider';
import { validateMediaUrl } from '../../../src/shared/validation/validateMediaUrl';

function validatedUrl(input: string): ValidatedMediaUrl {
  const result = validateMediaUrl(input, ['media.example.test']);
  if (!result.ok) throw new Error(`Test URL was rejected: ${result.reason}`);
  return result.value;
}

function provider(
  id: string,
  canHandle: MediaProvider['canHandle'],
  result: ResolutionResult,
): MediaProvider {
  return { id, canHandle, resolve: vi.fn(async () => result) };
}

describe('ProviderRegistry', () => {
  it('selects the first registered provider that can handle a URL', async () => {
    const url = validatedUrl('https://media.example.test/clip.mp4');
    const first = provider('first', () => true, {
      kind: 'official-action',
      providerId: 'first',
      label: 'Open official page',
      url,
    });
    const second = provider('second', () => true, {
      kind: 'unsupported',
      reason: 'no-provider',
    });
    const registry = new ProviderRegistry([first, second]);

    await expect(registry.resolve(url)).resolves.toMatchObject({
      kind: 'official-action',
      providerId: 'first',
    });
    expect(first.resolve).toHaveBeenCalledWith(url);
    expect(second.resolve).not.toHaveBeenCalled();
  });

  it('returns unsupported when no provider matches', async () => {
    const registry = new ProviderRegistry([]);

    await expect(
      registry.resolve(validatedUrl('https://media.example.test/page')),
    ).resolves.toEqual({ kind: 'unsupported', reason: 'no-provider' });
  });

  it('rejects duplicate provider identifiers', () => {
    const match = () => false;
    const result: ResolutionResult = { kind: 'unsupported', reason: 'no-provider' };

    expect(
      () =>
        new ProviderRegistry([
          provider('duplicate', match, result),
          provider('duplicate', match, result),
        ]),
    ).toThrow('Duplicate media provider id: duplicate');
  });
});

describe('DirectMediaProvider', () => {
  const direct = new DirectMediaProvider(['mp4', '.webm', 'mp3']);

  it('returns one original-file option for an identifiable direct media URL', async () => {
    const url = validatedUrl('https://media.example.test/clip.mp4?token=abc');

    await expect(direct.resolve(url)).resolves.toEqual({
      kind: 'ready',
      providerId: 'direct-media',
      options: [{ id: 'original', label: 'Original file', url }],
    });
  });

  it('matches a media extension before query parameters', () => {
    expect(
      direct.canHandle(validatedUrl('https://media.example.test/clip.webm?quality=unknown')),
    ).toBe(true);
  });

  it('returns unsupported for a URL without a recognized media extension', async () => {
    const url = validatedUrl('https://media.example.test/watch?id=123');

    await expect(direct.resolve(url)).resolves.toEqual({
      kind: 'unsupported',
      reason: 'not-direct-media',
    });
  });

  it('does not add unverified optional metadata to a ready result', async () => {
    const result = await direct.resolve(validatedUrl('https://media.example.test/audio.mp3'));

    expect(result.kind).toBe('ready');
    if (result.kind === 'ready') {
      expect(result.metadata).toBeUndefined();
      expect(result.options[0]?.metadata).toBeUndefined();
    }
  });
});
