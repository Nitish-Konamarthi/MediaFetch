import type { DownloadOption } from '../shared/domain/media';
import type { DownloadHistoryRecord } from '../shared/domain/download';
import { validateMediaUrl } from '../shared/validation/validateMediaUrl';
import { MediaFetchOperationError } from '../shared/errors';
import type { DownloadHistoryRepository } from '../storage/DownloadHistoryRepository';
import { createHistoryRecord, filenameFromUrl } from './downloadMapping';

export interface DownloadsPort {
  download(options: chrome.downloads.DownloadOptions): Promise<number>;
  search(query: chrome.downloads.DownloadQuery): Promise<chrome.downloads.DownloadItem[]>;
  cancel(downloadId: number): Promise<void>;
}

export class DownloadManager {
  constructor(
    private readonly downloads: DownloadsPort,
    private readonly history: DownloadHistoryRepository,
    private readonly allowedHostnames: readonly string[],
  ) {}

  async start(option: DownloadOption): Promise<DownloadHistoryRecord> {
    const validation = validateMediaUrl(option.url, this.allowedHostnames);
    if (!validation.ok)
      throw new MediaFetchOperationError('This download URL is not an approved HTTPS source.');

    let chromeDownloadId: number;
    try {
      chromeDownloadId = await this.downloads.download({
        url: validation.value,
        filename: filenameFromUrl(validation.value),
        conflictAction: 'uniquify',
      });
    } catch {
      throw new MediaFetchOperationError(
        'Chrome could not start this download. Check the source and try again.',
      );
    }
    if (!Number.isSafeInteger(chromeDownloadId) || chromeDownloadId < 0) {
      throw new MediaFetchOperationError('Chrome did not return a valid download ID.');
    }

    const now = new Date().toISOString();
    let record: DownloadHistoryRecord = {
      id: `chrome-download-${chromeDownloadId}`,
      chromeDownloadId,
      filename: filenameFromUrl(validation.value),
      status: 'in-progress',
      createdAt: now,
      updatedAt: now,
      bytesReceived: 0,
    };
    await this.history.upsert(record);

    // A fast or empty-file download may have finished before Chrome returned the ID.
    try {
      const [item] = await this.downloads.search({ id: chromeDownloadId });
      if (item) {
        record = createHistoryRecord(item);
        await this.history.upsert(record);
      }
    } catch {
      // Chrome can continue a successfully started download even if its immediate lookup fails.
    }
    return record;
  }

  async cancel(chromeDownloadId: number): Promise<DownloadHistoryRecord> {
    if (!Number.isSafeInteger(chromeDownloadId) || chromeDownloadId < 0) {
      throw new MediaFetchOperationError('Invalid download ID.');
    }
    const record = await this.history.getByDownloadId(chromeDownloadId);
    if (!record || record.status !== 'in-progress') {
      throw new MediaFetchOperationError('This download is no longer active.');
    }

    try {
      await this.downloads.cancel(chromeDownloadId);
    } catch {
      throw new MediaFetchOperationError(
        'Chrome could not cancel this download. It may have already finished.',
      );
    }
    const [item] = await this.downloads.search({ id: chromeDownloadId });
    if (!item) return (await this.history.getByDownloadId(chromeDownloadId)) ?? record;
    const updated = createHistoryRecord(item);
    await this.history.upsert(updated);
    return updated;
  }

  async handleChanged(downloadId: number): Promise<void> {
    const existing = await this.history.getByDownloadId(downloadId);
    if (!existing) return;
    const [item] = await this.downloads.search({ id: downloadId });
    if (item) await this.history.upsert(createHistoryRecord(item, existing.createdAt));
  }

  async handleErased(downloadId: number): Promise<void> {
    const existing = await this.history.getByDownloadId(downloadId);
    if (!existing) return;
    await this.history.upsert({
      ...existing,
      status: 'unavailable',
      updatedAt: new Date().toISOString(),
      errorCode: 'DOWNLOAD_REMOVED_FROM_CHROME_HISTORY',
    });
  }

  async reconcile(): Promise<DownloadHistoryRecord[]> {
    const records = await this.history.list();
    for (const record of records) {
      if (record.status !== 'in-progress') continue;
      const [item] = await this.downloads.search({ id: record.chromeDownloadId });
      if (item) {
        await this.history.upsert(createHistoryRecord(item, record.createdAt));
      } else {
        await this.history.upsert({
          ...record,
          status: 'unavailable',
          updatedAt: new Date().toISOString(),
          errorCode: 'DOWNLOAD_NOT_FOUND',
        });
      }
    }
    return this.history.list();
  }
}
