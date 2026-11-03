import type {
  DownloadOption,
  ResolutionResult,
  ValidatedMediaUrl,
} from '../../shared/domain/media';
import type { MediaProvider } from '../MediaProvider';

export class DirectMediaProvider implements MediaProvider {
  readonly id = 'direct-media';
  private readonly extensions: ReadonlySet<string>;

  constructor(extensions: readonly string[]) {
    this.extensions = new Set(
      extensions.map((extension) => extension.toLowerCase().replace(/^\./, '')),
    );
  }

  canHandle(url: ValidatedMediaUrl): boolean {
    const pathname = new URL(url).pathname;
    const filename = pathname.slice(pathname.lastIndexOf('/') + 1);
    const extensionSeparator = filename.lastIndexOf('.');

    if (extensionSeparator <= 0 || extensionSeparator === filename.length - 1) {
      return false;
    }

    return this.extensions.has(filename.slice(extensionSeparator + 1).toLowerCase());
  }

  async resolve(url: ValidatedMediaUrl): Promise<ResolutionResult> {
    if (!this.canHandle(url)) {
      return { kind: 'unsupported', reason: 'not-direct-media' };
    }

    const option: DownloadOption = {
      id: 'original',
      label: 'Original file',
      url,
    };

    return {
      kind: 'ready',
      providerId: this.id,
      options: [option],
    };
  }
}
