export type DownloadStatus =
  'in-progress' | 'completed' | 'interrupted' | 'cancelled' | 'unavailable';

export interface DownloadHistoryRecord {
  readonly id: string;
  readonly chromeDownloadId: number;
  readonly filename: string;
  readonly status: DownloadStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly bytesReceived: number;
  readonly totalBytes?: number;
  readonly progressPercent?: number;
  readonly errorCode?: string;
}
