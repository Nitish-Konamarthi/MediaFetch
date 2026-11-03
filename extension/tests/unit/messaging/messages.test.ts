import { describe, expect, it, vi } from 'vitest';
import {
  ExtensionMessageError,
  isExtensionRequest,
  sendExtensionRequest,
} from '../../../src/shared/messaging/messages';

describe('extension message contracts', () => {
  it('accepts expected request shapes and rejects incomplete or unknown messages', () => {
    expect(isExtensionRequest({ type: 'ANALYZE_URL', url: 'https://source.example/a.mp4' })).toBe(
      true,
    );
    expect(
      isExtensionRequest({
        type: 'START_DOWNLOAD',
        url: 'https://source.example/a.mp4',
        optionId: 'original',
      }),
    ).toBe(true);
    expect(isExtensionRequest({ type: 'CANCEL_DOWNLOAD', chromeDownloadId: 2 })).toBe(true);
    expect(isExtensionRequest({ type: 'START_DOWNLOAD', url: 'javascript:alert(1)' })).toBe(false);
    expect(isExtensionRequest({ type: 'UNKNOWN' })).toBe(false);
  });

  it('constructs typed messages and rejects malformed background responses', async () => {
    const transport = vi.fn().mockResolvedValue({ ok: true, type: 'HISTORY_CLEARED' });
    const response = await sendExtensionRequest({ type: 'CLEAR_HISTORY' }, transport);
    expect(transport).toHaveBeenCalledWith({ type: 'CLEAR_HISTORY' });
    expect(response).toEqual({ ok: true, type: 'HISTORY_CLEARED' });
    await expect(
      sendExtensionRequest({ type: 'GET_HISTORY' }, async () => ({ result: 'unexpected' })),
    ).rejects.toBeInstanceOf(ExtensionMessageError);
  });

  it('normalizes rejected transport promises into an actionable communication error', async () => {
    await expect(
      sendExtensionRequest({ type: 'GET_HISTORY' }, async () => {
        throw new Error('secret');
      }),
    ).rejects.toThrow('could not reach its background service');
  });
});
