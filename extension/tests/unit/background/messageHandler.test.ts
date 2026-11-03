import { describe, expect, it, vi } from 'vitest';
import { MediaFetchService } from '../../../src/application/MediaFetchService';
import { DownloadManager, type DownloadsPort } from '../../../src/downloads/DownloadManager';
import { DirectMediaProvider } from '../../../src/providers/direct/DirectMediaProvider';
import { ProviderRegistry } from '../../../src/providers/ProviderRegistry';
import {
  DownloadHistoryRepository,
  type StorageAreaPort,
} from '../../../src/storage/DownloadHistoryRepository';
import { createMessageHandler } from '../../../src/background/messageHandler';

class MemoryStorage implements StorageAreaPort {
  readonly values: Record<string, unknown> = {};
  async get(key: string): Promise<Record<string, unknown>> {
    return Object.hasOwn(this.values, key) ? { [key]: this.values[key] } : {};
  }
  async set(items: Record<string, unknown>): Promise<void> {
    Object.assign(this.values, items);
  }
  async remove(key: string): Promise<void> {
    delete this.values[key];
  }
}

describe('background message handler', () => {
  it('resolves supported URLs through the provider registry and returns unsupported results safely', async () => {
    const history = new DownloadHistoryRepository(new MemoryStorage());
    const downloads: DownloadsPort = {
      download: vi.fn(async () => 1),
      search: vi.fn(async () => []),
      cancel: vi.fn(async () => undefined),
    };
    const app = new MediaFetchService(
      ['media.example'],
      new ProviderRegistry([new DirectMediaProvider(['mp4'])]),
    );
    const handler = createMessageHandler(
      app,
      new DownloadManager(downloads, history, ['media.example']),
      history,
    );
    const supported = await handler({
      type: 'ANALYZE_URL',
      url: 'https://media.example/clip.mp4?quality=source',
    });
    expect(supported).toMatchObject({
      ok: true,
      type: 'ANALYSIS_RESULT',
      result: { kind: 'ready', options: [{ id: 'original' }] },
    });
    const unsafe = await handler({ type: 'ANALYZE_URL', url: 'javascript:alert(1)' });
    expect(unsafe).toMatchObject({
      ok: true,
      type: 'ANALYSIS_RESULT',
      result: { kind: 'unsupported', reason: 'unsupported-protocol' },
    });
  });

  it('rejects a forged option ID before starting any Chrome download', async () => {
    const history = new DownloadHistoryRepository(new MemoryStorage());
    const downloads: DownloadsPort = {
      download: vi.fn(async () => 1),
      search: vi.fn(async () => []),
      cancel: vi.fn(async () => undefined),
    };
    const app = new MediaFetchService(
      ['media.example'],
      new ProviderRegistry([new DirectMediaProvider(['mp4'])]),
    );
    const handler = createMessageHandler(
      app,
      new DownloadManager(downloads, history, ['media.example']),
      history,
    );
    const response = await handler({
      type: 'START_DOWNLOAD',
      url: 'https://media.example/clip.mp4',
      optionId: 'forged',
    });
    expect(response.ok).toBe(false);
    expect(downloads.download).not.toHaveBeenCalled();
  });
});
