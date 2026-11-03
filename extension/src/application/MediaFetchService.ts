import type { ResolutionResult } from '../shared/domain/media';
import { validateMediaUrl } from '../shared/validation/validateMediaUrl';
import { ProviderRegistry } from '../providers/ProviderRegistry';
import { DirectMediaProvider } from '../providers/direct/DirectMediaProvider';
import { APPROVED_HOSTNAMES, DIRECT_MEDIA_EXTENSIONS } from '../shared/config/approvedSources';
import { MediaFetchOperationError } from '../shared/errors';

export class MediaFetchService {
  constructor(
    private readonly allowedHostnames: readonly string[],
    private readonly providers: ProviderRegistry,
  ) {}

  async analyze(input: string): Promise<ResolutionResult> {
    const validation = validateMediaUrl(input, this.allowedHostnames);
    if (!validation.ok) return { kind: 'unsupported', reason: validation.reason };
    return this.providers.resolve(validation.value);
  }

  async getDownloadOption(input: string, optionId: string) {
    const result = await this.analyze(input);
    if (result.kind !== 'ready')
      throw new MediaFetchOperationError('This source does not have an available download option.');
    const option = result.options.find((candidate) => candidate.id === optionId);
    if (!option)
      throw new MediaFetchOperationError(
        'The selected download option is no longer available. Analyze the URL again.',
      );
    return option;
  }
}

export function createDefaultMediaFetchService(): MediaFetchService {
  return new MediaFetchService(
    APPROVED_HOSTNAMES,
    new ProviderRegistry([new DirectMediaProvider(DIRECT_MEDIA_EXTENSIONS)]),
  );
}
