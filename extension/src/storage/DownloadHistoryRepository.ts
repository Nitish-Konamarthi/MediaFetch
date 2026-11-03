import type { DownloadHistoryRecord } from '../shared/domain/download';
import { isDownloadHistoryRecord } from '../shared/validation/downloadHistoryRecord';

export const DOWNLOAD_HISTORY_KEY = 'mediafetch.downloadHistory';

export interface StorageAreaPort {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
}

export class DownloadHistoryRepository {
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(private readonly storage: StorageAreaPort) {}

  list(): Promise<DownloadHistoryRecord[]> {
    return this.enqueue(async () => {
      const stored = await this.storage.get(DOWNLOAD_HISTORY_KEY);
      const value = stored[DOWNLOAD_HISTORY_KEY];
      if (value === undefined) return [];
      const valid = Array.isArray(value) ? value.filter(isDownloadHistoryRecord) : [];
      if (!Array.isArray(value) || valid.length !== value.length) {
        await this.write(valid);
      }
      return valid.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }

  getByDownloadId(chromeDownloadId: number): Promise<DownloadHistoryRecord | undefined> {
    return this.list().then((records) =>
      records.find((record) => record.chromeDownloadId === chromeDownloadId),
    );
  }

  upsert(record: DownloadHistoryRecord): Promise<void> {
    return this.enqueue(async () => {
      const stored = await this.storage.get(DOWNLOAD_HISTORY_KEY);
      const value = stored[DOWNLOAD_HISTORY_KEY];
      const records = Array.isArray(value) ? value.filter(isDownloadHistoryRecord) : [];
      const index = records.findIndex(
        (candidate) => candidate.chromeDownloadId === record.chromeDownloadId,
      );
      if (index === -1) records.unshift(record);
      else if (!(records[index]?.status !== 'in-progress' && record.status === 'in-progress')) {
        records[index] = record;
      }
      await this.write(records);
    });
  }

  clear(): Promise<void> {
    return this.enqueue(() => this.storage.remove(DOWNLOAD_HISTORY_KEY));
  }

  private async write(records: readonly DownloadHistoryRecord[]): Promise<void> {
    await this.storage.set({ [DOWNLOAD_HISTORY_KEY]: records });
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operationQueue.then(operation);
    this.operationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
