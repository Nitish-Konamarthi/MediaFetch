import { describe, expect, it } from 'vitest';
import {
  DownloadHistoryRepository,
  DOWNLOAD_HISTORY_KEY,
  type StorageAreaPort,
} from '../../../src/storage/DownloadHistoryRepository';
import type { DownloadHistoryRecord } from '../../../src/shared/domain/download';

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

function record(id = 7): DownloadHistoryRecord {
  return {
    id: `chrome-download-${id}`,
    chromeDownloadId: id,
    filename: 'clip.mp4',
    status: 'in-progress',
    createdAt: '2026-11-03T10:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    bytesReceived: 0,
  };
}

describe('DownloadHistoryRepository', () => {
  it('saves and updates records without duplicating Chrome IDs', async () => {
    const storage = new MemoryStorage();
    const repository = new DownloadHistoryRepository(storage);
    await repository.upsert(record());
    await repository.upsert({ ...record(), status: 'completed', bytesReceived: 10 });
    await repository.upsert(record());
    expect(await repository.list()).toHaveLength(1);
    expect((await repository.getByDownloadId(7))?.status).toBe('completed');
  });

  it('handles missing or corrupted storage data by returning an empty valid history', async () => {
    const storage = new MemoryStorage();
    const repository = new DownloadHistoryRepository(storage);
    expect(await repository.list()).toEqual([]);
    storage.values[DOWNLOAD_HISTORY_KEY] = [
      { arbitrary: 'invalid' },
      { ...record(), filename: 'C:\\Users\\private\\clip.mp4' },
      { ...record(), updatedAt: 'not-a-date' },
      record(),
    ];
    expect(await repository.list()).toEqual([record()]);
    expect(storage.values[DOWNLOAD_HISTORY_KEY]).toEqual([record()]);
    storage.values[DOWNLOAD_HISTORY_KEY] = { invalid: true };
    expect(await repository.list()).toEqual([]);
  });

  it('clears only MediaFetch history', async () => {
    const storage = new MemoryStorage();
    const repository = new DownloadHistoryRepository(storage);
    await repository.upsert(record());
    await repository.clear();
    expect(storage.values).not.toHaveProperty(DOWNLOAD_HISTORY_KEY);
    expect(await repository.list()).toEqual([]);
    expect(storage.values).not.toHaveProperty(DOWNLOAD_HISTORY_KEY);
  });

  it('continues after a failed storage operation', async () => {
    const storage = new MemoryStorage();
    const repository = new DownloadHistoryRepository(storage);
    const originalSet = storage.set.bind(storage);
    let fail = true;
    storage.set = async (items) => {
      if (fail) {
        fail = false;
        throw new Error('storage unavailable');
      }
      await originalSet(items);
    };
    await expect(repository.upsert(record())).rejects.toThrow('storage unavailable');
    await expect(repository.upsert(record())).resolves.toBeUndefined();
    expect(await repository.list()).toHaveLength(1);
  });
});
