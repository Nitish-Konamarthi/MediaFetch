import { describe, expect, it, vi } from 'vitest';
import { DownloadManager, type DownloadsPort } from '../../../src/downloads/DownloadManager';
import {
  DownloadHistoryRepository,
  type StorageAreaPort,
} from '../../../src/storage/DownloadHistoryRepository';
import type { DownloadOption, ValidatedMediaUrl } from '../../../src/shared/domain/media';

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

function chromeItem(
  id: number,
  state = 'in_progress',
  error?: string,
  bytesReceived = 0,
  totalBytes = -1,
): chrome.downloads.DownloadItem {
  return {
    id,
    url: 'https://media.example/clip.mp4',
    finalUrl: 'https://media.example/clip.mp4',
    referrer: '',
    filename: `C:\\Downloads\\clip-${id}.mp4`,
    danger: 'safe',
    mime: 'video/mp4',
    startTime: '2026-11-03T10:00:00.000Z',
    state: state as 'complete' | 'interrupted' | 'in_progress',
    paused: false,
    canResume: false,
    error: error as chrome.downloads.InterruptReason | undefined,
    bytesReceived,
    totalBytes,
    fileSize: totalBytes,
    exists: true,
    incognito: false,
  } as unknown as chrome.downloads.DownloadItem;
}

function setup(items: Map<number, chrome.downloads.DownloadItem> = new Map()) {
  const storage = new MemoryStorage();
  const history = new DownloadHistoryRepository(storage);
  const downloads: DownloadsPort = {
    download: vi.fn(async () => 51),
    search: vi.fn(async (query) => {
      const item = items.get(query.id ?? -1);
      return item ? [item] : [];
    }),
    cancel: vi.fn(async () => undefined),
  };
  const manager = new DownloadManager(downloads, history, ['media.example']);
  const option: DownloadOption = {
    id: 'original',
    label: 'Original file',
    url: 'https://media.example/clip.mp4' as ValidatedMediaUrl,
  };
  return { storage, history, downloads, manager, option, items };
}

describe('DownloadManager', () => {
  it('starts a real Chrome download with a sanitized filename and persists the returned ID', async () => {
    const { manager, downloads, option, history } = setup();
    const record = await manager.start(option);
    expect(downloads.download).toHaveBeenCalledWith({
      url: option.url,
      filename: 'clip.mp4',
      conflictAction: 'uniquify',
    });
    expect(record.chromeDownloadId).toBe(51);
    expect((await history.list())[0]?.id).toBe('chrome-download-51');
  });

  it('rejects invalid or unapproved request URLs before invoking Chrome', async () => {
    const { manager, downloads } = setup();
    await expect(
      manager.start({ id: 'evil', label: 'bad', url: 'javascript:alert(1)' as ValidatedMediaUrl }),
    ).rejects.toThrow('not an approved HTTPS source');
    expect(downloads.download).not.toHaveBeenCalled();
  });

  it('reports initiation failure and does not mistake the request for a completed download', async () => {
    const { manager, downloads, option, history } = setup();
    vi.mocked(downloads.download).mockRejectedValueOnce(new Error('internal Chrome detail'));
    await expect(manager.start(option)).rejects.toThrow('Chrome could not start this download');
    expect(await history.list()).toEqual([]);
  });

  it('updates persisted records from browser state events and tolerates duplicate events', async () => {
    const items = new Map<number, chrome.downloads.DownloadItem>();
    const { manager, option, history } = setup(items);
    await manager.start(option);
    items.set(51, chromeItem(51, 'complete', undefined, 100, 100));
    await manager.handleChanged(51);
    await manager.handleChanged(51);
    const records = await history.list();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      status: 'completed',
      progressPercent: 100,
      chromeDownloadId: 51,
    });
  });

  it('cancels an active download and maps Chrome user-cancellation state', async () => {
    const items = new Map<number, chrome.downloads.DownloadItem>();
    const { manager, downloads, option } = setup(items);
    await manager.start(option);
    items.set(51, chromeItem(51, 'interrupted', 'USER_CANCELED'));
    const record = await manager.cancel(51);
    expect(downloads.cancel).toHaveBeenCalledWith(51);
    expect(record.status).toBe('cancelled');
  });

  it('reconciles completed and interrupted states, and marks missing Chrome records unavailable', async () => {
    const items = new Map<number, chrome.downloads.DownloadItem>();
    const { manager, option, history, downloads } = setup(items);
    await manager.start(option);
    vi.mocked(downloads.download).mockResolvedValueOnce(52);
    await manager.start(option);
    items.set(51, chromeItem(51, 'complete', undefined, 1, 1));
    items.set(52, chromeItem(52, 'interrupted', 'NETWORK_FAILED', 0, 3));
    const updated = await manager.reconcile();
    expect(updated.find((record) => record.chromeDownloadId === 51)?.status).toBe('completed');
    expect(updated.find((record) => record.chromeDownloadId === 52)?.status).toBe('interrupted');
    expect(await history.list()).toHaveLength(2);

    const missing = new Map<number, chrome.downloads.DownloadItem>();
    const {
      manager: missingManager,
      history: missingHistory,
      option: missingOption,
    } = setup(missing);
    await missingManager.start(missingOption);
    expect((await missingManager.reconcile())[0]?.status).toBe('unavailable');
    expect(await missingHistory.list()).toHaveLength(1);
  });
});
