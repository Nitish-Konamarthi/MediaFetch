import type { DownloadHistoryRecord } from '../domain/download';
import { sanitizeFilename } from './sanitizeFilename';

export function isDownloadHistoryRecord(value: unknown): value is DownloadHistoryRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  const statuses = ['in-progress', 'completed', 'interrupted', 'cancelled', 'unavailable'];
  const validError = (error: unknown): boolean =>
    error === undefined ||
    (typeof error === 'string' &&
      error.length <= 80 &&
      /^(?:FILE|NETWORK|SERVER|USER|CRASH)_[A-Z0-9_]+$|^DOWNLOAD_(?:NOT_FOUND|REMOVED_FROM_CHROME_HISTORY)$/.test(
        error,
      ));
  return (
    typeof record.id === 'string' &&
    Number.isSafeInteger(record.chromeDownloadId) &&
    Number(record.chromeDownloadId) >= 0 &&
    record.id === `chrome-download-${record.chromeDownloadId}` &&
    typeof record.filename === 'string' &&
    record.filename === sanitizeFilename(record.filename) &&
    typeof record.status === 'string' &&
    statuses.includes(record.status) &&
    typeof record.createdAt === 'string' &&
    Number.isFinite(Date.parse(record.createdAt)) &&
    typeof record.updatedAt === 'string' &&
    Number.isFinite(Date.parse(record.updatedAt)) &&
    typeof record.bytesReceived === 'number' &&
    Number.isFinite(record.bytesReceived) &&
    record.bytesReceived >= 0 &&
    (record.totalBytes === undefined ||
      (typeof record.totalBytes === 'number' &&
        Number.isFinite(record.totalBytes) &&
        record.totalBytes > 0)) &&
    (record.progressPercent === undefined ||
      (typeof record.progressPercent === 'number' &&
        record.progressPercent >= 0 &&
        record.progressPercent <= 100)) &&
    validError(record.errorCode)
  );
}
