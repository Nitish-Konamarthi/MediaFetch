import type { ResolutionResult, ValidatedMediaUrl } from '../shared/domain/media';
import type { MediaProvider } from './MediaProvider';

export class ProviderRegistry {
  private readonly providers: readonly MediaProvider[];

  constructor(providers: readonly MediaProvider[]) {
    const ids = new Set<string>();

    for (const provider of providers) {
      if (ids.has(provider.id)) {
        throw new Error(`Duplicate media provider id: ${provider.id}`);
      }
      ids.add(provider.id);
    }

    this.providers = [...providers];
  }

  async resolve(url: ValidatedMediaUrl): Promise<ResolutionResult> {
    const provider = this.providers.find((candidate) => candidate.canHandle(url));

    if (!provider) {
      return { kind: 'unsupported', reason: 'no-provider' };
    }

    return provider.resolve(url);
  }
}
