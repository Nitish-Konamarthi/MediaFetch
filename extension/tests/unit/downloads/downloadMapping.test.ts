import { describe, expect, it } from 'vitest';
import {
  createHistoryRecord,
  filenameFromUrl,
  mapChromeDownloadState,
  sanitizeFilename,
} from '../../../src/downloads/downloadMapping';

describe('download mapping', () => {
  it('sanitizes path separators, control characters, reserved names, and unsafe dot sequences', () => {
    expect(sanitizeFilename('../CON?.mp4')).toBe('_CON_.mp4');
    expect(sanitizeFilename('folder\\video.mp4')).toBe('folder_video.mp4');
    expect(sanitizeFilename('\u0000')).toBe('_');
    expect(filenameFromUrl('https://source.example/path/hello%20world.mp4?token=private')).toBe(
      'hello world.mp4',
    );
  });

  it('calculates bounded progress only for known positive totals', () => {
    expect(
      mapChromeDownloadState({
        state: 'in_progress',
        error: undefined,
        bytesReceived: 25,
        totalBytes: 100,
      }),
    ).toMatchObject({ status: 'in-progress', progressPercent: 25 });
    expect(
      mapChromeDownloadState({
        state: 'in_progress',
        error: undefined,
        bytesReceived: 10,
        totalBytes: -1,
      }),
    ).not.toHaveProperty('progressPercent');
    expect(
      mapChromeDownloadState({
        state: 'in_progress',
        error: undefined,
        bytesReceived: 0,
        totalBytes: 0,
      }),
    ).not.toHaveProperty('progressPercent');
    expect(
      mapChromeDownloadState({
        state: 'complete',
        error: undefined,
        bytesReceived: 200,
        totalBytes: 100,
      }).progressPercent,
    ).toBe(100);
  });

  it('distinguishes completed empty files, user cancellation, and interrupted failures', () => {
    expect(
      mapChromeDownloadState({
        state: 'complete',
        error: undefined,
        bytesReceived: 0,
        totalBytes: 0,
      }).status,
    ).toBe('completed');
    expect(
      mapChromeDownloadState({
        state: 'interrupted',
        error: 'USER_CANCELED',
        bytesReceived: 0,
        totalBytes: -1,
      }).status,
    ).toBe('cancelled');
    expect(
      mapChromeDownloadState({
        state: 'interrupted',
        error: 'NETWORK_FAILED',
        bytesReceived: 3,
        totalBytes: 10,
      }),
    ).toMatchObject({ status: 'interrupted', errorCode: 'NETWORK_FAILED' });
  });

  it('stores only a basename and maps the real Chrome ID', () => {
    const record = createHistoryRecord({
      id: 44,
      filename: 'C:\\Users\\User\\Downloads\\a.mp4',
      state: 'complete',
      error: undefined,
      bytesReceived: 0,
      totalBytes: 0,
      startTime: '2026-11-03T10:00:00.000Z',
    });
    expect(record).toMatchObject({
      id: 'chrome-download-44',
      chromeDownloadId: 44,
      filename: 'a.mp4',
      status: 'completed',
    });
    expect(JSON.stringify(record)).not.toContain('C:\\Users');
  });
});
