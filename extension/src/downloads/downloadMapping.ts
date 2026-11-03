import type { DownloadHistoryRecord, DownloadStatus } from '../shared/domain/download';
import { sanitizeFilename } from '../shared/validation/sanitizeFilename';
export { sanitizeFilename } from '../shared/validation/sanitizeFilename';

export function filenameFromUrl(value: string): string {
  try {
    const pathname = new URL(value).pathname;
    const segment = pathname.slice(pathname.lastIndexOf('/') + 1);
    let decoded = segment;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      // Keep the URL-encoded filename when its escape sequence is malformed.
    }
    return sanitizeFilename(decoded);
  } catch {
    return 'media-download';
  }
}

export function mapChromeDownloadState(
  item: Pick<chrome.downloads.DownloadItem, 'state' | 'error' | 'bytesReceived' | 'totalBytes'>,
): Pick<
  DownloadHistoryRecord,
  'status' | 'bytesReceived' | 'totalBytes' | 'progressPercent' | 'errorCode'
> {
  const received =
    Number.isFinite(item.bytesReceived) && item.bytesReceived > 0 ? item.bytesReceived : 0;
  const total =
    Number.isFinite(item.totalBytes) && item.totalBytes > 0 ? item.totalBytes : undefined;
  let status: DownloadStatus;

  if (item.state === 'complete') status = 'completed';
  else if (item.state === 'in_progress') status = 'in-progress';
  else if (item.error === 'USER_CANCELED') status = 'cancelled';
  else status = 'interrupted';

  const progressPercent =
    total === undefined ? undefined : Math.min(100, Math.floor((received / total) * 100));
  return {
    status,
    bytesReceived: received,
    ...(total === undefined ? {} : { totalBytes: total }),
    ...(progressPercent === undefined ? {} : { progressPercent }),
    ...(item.error ? { errorCode: item.error } : {}),
  };
}

export function createHistoryRecord(
  item: Pick<
    chrome.downloads.DownloadItem,
    'id' | 'filename' | 'state' | 'error' | 'bytesReceived' | 'totalBytes' | 'startTime'
  >,
  now: string = new Date().toISOString(),
): DownloadHistoryRecord {
  const mapped = mapChromeDownloadState(item);
  const actualName = item.filename
    ? (item.filename.split(/[\\/]/).pop() ?? item.filename)
    : 'media-download';
  const createdAt = Number.isNaN(Date.parse(item.startTime))
    ? now
    : new Date(item.startTime).toISOString();
  return {
    id: `chrome-download-${item.id}`,
    chromeDownloadId: item.id,
    filename: sanitizeFilename(actualName),
    createdAt,
    updatedAt: now,
    ...mapped,
  };
}
