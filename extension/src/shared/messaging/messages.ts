import type { ResolutionResult } from '../domain/media';
import type { DownloadHistoryRecord } from '../domain/download';
import { isDownloadHistoryRecord } from '../validation/downloadHistoryRecord';

export type ExtensionRequest =
  | { readonly type: 'ANALYZE_URL'; readonly url: string }
  | { readonly type: 'START_DOWNLOAD'; readonly url: string; readonly optionId: string }
  | { readonly type: 'CANCEL_DOWNLOAD'; readonly chromeDownloadId: number }
  | { readonly type: 'GET_HISTORY' }
  | { readonly type: 'CLEAR_HISTORY' };

export type ExtensionResponse =
  | { readonly ok: true; readonly type: 'ANALYSIS_RESULT'; readonly result: ResolutionResult }
  | { readonly ok: true; readonly type: 'DOWNLOAD_STARTED'; readonly record: DownloadHistoryRecord }
  | { readonly ok: true; readonly type: 'DOWNLOAD_UPDATED'; readonly record: DownloadHistoryRecord }
  | {
      readonly ok: true;
      readonly type: 'HISTORY_UPDATED';
      readonly records: readonly DownloadHistoryRecord[];
    }
  | { readonly ok: true; readonly type: 'HISTORY_CLEARED' }
  | { readonly ok: false; readonly error: string };

export class ExtensionMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtensionMessageError';
  }
}

export function isExtensionRequest(value: unknown): value is ExtensionRequest {
  if (typeof value !== 'object' || value === null || !('type' in value)) return false;
  const request = value as Record<string, unknown>;

  switch (request.type) {
    case 'ANALYZE_URL':
      return typeof request.url === 'string';
    case 'START_DOWNLOAD':
      return typeof request.url === 'string' && typeof request.optionId === 'string';
    case 'CANCEL_DOWNLOAD':
      return (
        typeof request.chromeDownloadId === 'number' &&
        Number.isSafeInteger(request.chromeDownloadId)
      );
    case 'GET_HISTORY':
    case 'CLEAR_HISTORY':
      return true;
    default:
      return false;
  }
}

export function isExtensionResponse(value: unknown): value is ExtensionResponse {
  if (typeof value !== 'object' || value === null || !('ok' in value)) return false;
  const response = value as Record<string, unknown>;
  if (response.ok === false) return typeof response.error === 'string';
  if (response.ok !== true || typeof response.type !== 'string') return false;

  switch (response.type) {
    case 'ANALYSIS_RESULT':
      return isResolutionResult(response.result);
    case 'DOWNLOAD_STARTED':
    case 'DOWNLOAD_UPDATED':
      return isDownloadHistoryRecord(response.record);
    case 'HISTORY_UPDATED':
      return Array.isArray(response.records) && response.records.every(isDownloadHistoryRecord);
    case 'HISTORY_CLEARED':
      return true;
    default:
      return false;
  }
}

function isResolutionResult(value: unknown): value is ResolutionResult {
  if (typeof value !== 'object' || value === null || !('kind' in value)) return false;
  const result = value as Record<string, unknown>;
  if (result.kind === 'unsupported') {
    return [
      'invalid-url',
      'unsupported-protocol',
      'unapproved-host',
      'no-provider',
      'not-direct-media',
    ].includes(String(result.reason));
  }
  if (result.kind === 'official-action') {
    return (
      typeof result.providerId === 'string' &&
      typeof result.label === 'string' &&
      typeof result.url === 'string'
    );
  }
  if (result.metadata !== undefined && !isMediaMetadata(result.metadata)) return false;
  if (
    result.kind !== 'ready' ||
    typeof result.providerId !== 'string' ||
    !Array.isArray(result.options) ||
    result.options.length === 0
  ) {
    return false;
  }
  return result.options.every((option) => {
    if (typeof option !== 'object' || option === null) return false;
    const candidate = option as Record<string, unknown>;
    if (
      typeof candidate.id !== 'string' ||
      typeof candidate.label !== 'string' ||
      typeof candidate.url !== 'string'
    )
      return false;
    return candidate.metadata === undefined || isMediaMetadata(candidate.metadata);
  });
}

function isMediaMetadata(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const metadata = value as Record<string, unknown>;
  return (
    (metadata.title === undefined || typeof metadata.title === 'string') &&
    (metadata.mimeType === undefined || typeof metadata.mimeType === 'string') &&
    (metadata.quality === undefined || typeof metadata.quality === 'string') &&
    (metadata.sizeBytes === undefined ||
      (typeof metadata.sizeBytes === 'number' && metadata.sizeBytes >= 0)) &&
    (metadata.thumbnailUrl === undefined || typeof metadata.thumbnailUrl === 'string')
  );
}

export type MessageTransport = (request: ExtensionRequest) => Promise<unknown>;

export async function sendExtensionRequest(
  request: ExtensionRequest,
  transport: MessageTransport = (message) => chrome.runtime.sendMessage(message),
): Promise<ExtensionResponse> {
  let response: unknown;
  try {
    response = await transport(request);
  } catch {
    throw new ExtensionMessageError(
      'MediaFetch could not reach its background service. Reopen the panel and try again.',
    );
  }

  if (!isExtensionResponse(response)) {
    throw new ExtensionMessageError(
      'MediaFetch received an unexpected response from its background service.',
    );
  }
  return response;
}
