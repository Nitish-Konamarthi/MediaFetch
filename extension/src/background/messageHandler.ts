import type { MediaFetchService } from '../application/MediaFetchService';
import type { DownloadManager } from '../downloads/DownloadManager';
import type { DownloadHistoryRepository } from '../storage/DownloadHistoryRepository';
import type { ExtensionRequest, ExtensionResponse } from '../shared/messaging/messages';
import { MediaFetchOperationError } from '../shared/errors';

export function createMessageHandler(
  app: MediaFetchService,
  downloads: DownloadManager,
  history: DownloadHistoryRepository,
): (request: ExtensionRequest) => Promise<ExtensionResponse> {
  return async (request) => {
    try {
      switch (request.type) {
        case 'ANALYZE_URL':
          return { ok: true, type: 'ANALYSIS_RESULT', result: await app.analyze(request.url) };
        case 'START_DOWNLOAD': {
          const option = await app.getDownloadOption(request.url, request.optionId);
          const record = await downloads.start(option);
          return { ok: true, type: 'DOWNLOAD_STARTED', record };
        }
        case 'CANCEL_DOWNLOAD': {
          const record = await downloads.cancel(request.chromeDownloadId);
          return { ok: true, type: 'DOWNLOAD_UPDATED', record };
        }
        case 'GET_HISTORY':
          return { ok: true, type: 'HISTORY_UPDATED', records: await downloads.reconcile() };
        case 'CLEAR_HISTORY':
          await history.clear();
          return { ok: true, type: 'HISTORY_CLEARED' };
      }
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof MediaFetchOperationError
            ? error.message
            : 'MediaFetch could not complete that request because a browser or local storage operation failed.',
      };
    }
  };
}
