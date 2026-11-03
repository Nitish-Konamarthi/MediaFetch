import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExtensionResponse } from '../../../src/shared/messaging/messages';
import { App } from '../../../src/sidepanel/App';
import { sendExtensionRequest } from '../../../src/shared/messaging/messages';

vi.mock('../../../src/shared/messaging/messages', () => ({ sendExtensionRequest: vi.fn() }));
const send = vi.mocked(sendExtensionRequest);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('App', () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ ok: true, type: 'HISTORY_UPDATED', records: [] });
  });

  it('renders branded URL controls and requests persistent history', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'MediaFetch' })).toBeTruthy();
    expect(screen.getByLabelText('Media URL')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Paste' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Analyze URL' })).toBeTruthy();
    await waitFor(() => expect(send).toHaveBeenCalledWith({ type: 'GET_HISTORY' }));
  });

  it('reads a user-triggered clipboard paste into the URL field', async () => {
    const readText = vi.fn().mockResolvedValue('https://approved.example/clip.mp4');
    vi.stubGlobal('navigator', { clipboard: { readText } });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Paste' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Media URL')).toHaveProperty(
        'value',
        'https://approved.example/clip.mp4',
      ),
    );
    expect(readText).toHaveBeenCalledOnce();
  });

  it('constructs the URL analysis message and renders actual available options', async () => {
    send.mockImplementation(async (request) =>
      request.type === 'ANALYZE_URL'
        ? ({
            ok: true,
            type: 'ANALYSIS_RESULT',
            result: {
              kind: 'ready',
              providerId: 'direct-media',
              options: [{ id: 'original', label: 'Original file', url: request.url as never }],
            },
          } satisfies ExtensionResponse)
        : { ok: true, type: 'HISTORY_UPDATED', records: [] },
    );
    render(<App />);
    fireEvent.change(screen.getByLabelText('Media URL'), {
      target: { value: 'https://approved.example/video.mp4' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze URL' }));
    expect(await screen.findByText('Available download options')).toBeTruthy();
    expect(screen.getByText('Original file')).toBeTruthy();
    expect(send).toHaveBeenCalledWith({
      type: 'ANALYZE_URL',
      url: 'https://approved.example/video.mp4',
    });
  });

  it('shows an unsupported result without fake download controls', async () => {
    send.mockImplementation(async (request) =>
      request.type === 'ANALYZE_URL'
        ? {
            ok: true,
            type: 'ANALYSIS_RESULT',
            result: { kind: 'unsupported', reason: 'unapproved-host' },
          }
        : { ok: true, type: 'HISTORY_UPDATED', records: [] },
    );
    render(<App />);
    fireEvent.change(screen.getByLabelText('Media URL'), {
      target: { value: 'https://unknown.example/file.mp4' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze URL' }));
    expect(await screen.findByText(/not on MediaFetch’s approved source list/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Download' })).toBeNull();
  });

  it('clears stale options when the URL changes and ignores late analysis responses', async () => {
    let resolveAnalysis: ((response: ExtensionResponse) => void) | undefined;
    send.mockImplementation((request) =>
      request.type === 'ANALYZE_URL'
        ? new Promise((resolve) => {
            resolveAnalysis = resolve;
          })
        : Promise.resolve({ ok: true, type: 'HISTORY_UPDATED', records: [] }),
    );
    render(<App />);
    const input = screen.getByLabelText('Media URL');
    fireEvent.change(input, { target: { value: 'https://approved.example/first.mp4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze URL' }));
    fireEvent.change(input, { target: { value: 'https://unknown.example/second.mp4' } });
    resolveAnalysis?.({
      ok: true,
      type: 'ANALYSIS_RESULT',
      result: {
        kind: 'ready',
        providerId: 'direct-media',
        options: [
          {
            id: 'original',
            label: 'Original file',
            url: 'https://approved.example/first.mp4' as never,
          },
        ],
      },
    });
    await waitFor(() => expect(screen.queryByText('Available download options')).toBeNull());
    expect(screen.queryByRole('button', { name: 'Download' })).toBeNull();
  });

  it('starts only the selected option and restores history in the panel', async () => {
    const savedRecord = {
      id: 'chrome-download-19',
      chromeDownloadId: 19,
      filename: 'clip.mp4',
      status: 'completed' as const,
      createdAt: '2026-11-03T10:00:00.000Z',
      updatedAt: '2026-11-03T10:00:02.000Z',
      bytesReceived: 128,
      totalBytes: 128,
      progressPercent: 100,
    };
    send.mockImplementation(async (request) => {
      if (request.type === 'ANALYZE_URL')
        return {
          ok: true,
          type: 'ANALYSIS_RESULT',
          result: {
            kind: 'ready',
            providerId: 'direct-media',
            options: [{ id: 'original', label: 'Original file', url: request.url as never }],
          },
        };
      if (request.type === 'START_DOWNLOAD')
        return { ok: true, type: 'DOWNLOAD_STARTED', record: savedRecord };
      return { ok: true, type: 'HISTORY_UPDATED', records: [savedRecord] };
    });
    render(<App />);
    expect(await screen.findByText('clip.mp4')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Media URL'), {
      target: { value: 'https://approved.example/clip.mp4' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze URL' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Download' }));
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith({
        type: 'START_DOWNLOAD',
        url: 'https://approved.example/clip.mp4',
        optionId: 'original',
      }),
    );
    expect(await screen.findByText('Download started: clip.mp4')).toBeTruthy();
  });

  it('clears only MediaFetch history from the Side Panel', async () => {
    const savedRecord = {
      id: 'chrome-download-19',
      chromeDownloadId: 19,
      filename: 'clip.mp4',
      status: 'completed' as const,
      createdAt: '2026-11-03T10:00:00.000Z',
      updatedAt: '2026-11-03T10:00:02.000Z',
      bytesReceived: 128,
    };
    send.mockImplementation(async (request) => {
      if (request.type === 'CLEAR_HISTORY') return { ok: true, type: 'HISTORY_CLEARED' };
      return { ok: true, type: 'HISTORY_UPDATED', records: [savedRecord] };
    });
    render(<App />);
    expect(await screen.findByText('clip.mp4')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(
      await screen.findByText(
        'MediaFetch history cleared. Chrome download files were not changed.',
      ),
    ).toBeTruthy();
    expect(send).toHaveBeenCalledWith({ type: 'CLEAR_HISTORY' });
  });

  it('shows browser progress and sends cancellation with the saved Chrome ID', async () => {
    const activeRecord = {
      id: 'chrome-download-23',
      chromeDownloadId: 23,
      filename: 'large.mp4',
      status: 'in-progress' as const,
      createdAt: '2026-11-03T10:00:00.000Z',
      updatedAt: '2026-11-03T10:00:02.000Z',
      bytesReceived: 420,
      totalBytes: 1000,
      progressPercent: 42,
    };
    send.mockImplementation(async (request) => {
      if (request.type === 'CANCEL_DOWNLOAD')
        return {
          ok: true,
          type: 'DOWNLOAD_UPDATED',
          record: { ...activeRecord, status: 'cancelled' },
        };
      return { ok: true, type: 'HISTORY_UPDATED', records: [activeRecord] };
    });
    render(<App />);
    expect(await screen.findByText('42%')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith({ type: 'CANCEL_DOWNLOAD', chromeDownloadId: 23 }),
    );
  });

  it('shows loading during resolution and service-worker errors', async () => {
    let resolveAnalysis: ((response: ExtensionResponse) => void) | undefined;
    send.mockImplementation((request) =>
      request.type === 'ANALYZE_URL'
        ? new Promise((resolve) => {
            resolveAnalysis = resolve;
          })
        : Promise.resolve({ ok: true, type: 'HISTORY_UPDATED', records: [] }),
    );
    const { unmount } = render(<App />);
    fireEvent.change(screen.getByLabelText('Media URL'), {
      target: { value: 'https://approved.example/video.mp4' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze URL' }));
    expect(screen.getByRole('status').textContent).toContain('Checking the URL');
    resolveAnalysis?.({
      ok: true,
      type: 'ANALYSIS_RESULT',
      result: { kind: 'unsupported', reason: 'no-provider' },
    });
    expect(await screen.findByText(/No MediaFetch provider supports/)).toBeTruthy();
    unmount();

    send.mockImplementation(async (request) =>
      request.type === 'ANALYZE_URL'
        ? { ok: false, error: 'Background unavailable.' }
        : { ok: true, type: 'HISTORY_UPDATED', records: [] },
    );
    render(<App />);
    fireEvent.change(screen.getByLabelText('Media URL'), {
      target: { value: 'https://approved.example/video.mp4' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze URL' }));
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Background unavailable.',
    );
  });

  it('displays a safe communication error after a service-worker failure', async () => {
    send.mockImplementation(async (request) => {
      if (request.type === 'ANALYZE_URL')
        throw new Error(
          'MediaFetch could not reach its background service. Reopen the panel and try again.',
        );
      return { ok: true, type: 'HISTORY_UPDATED', records: [] };
    });
    render(<App />);
    fireEvent.change(screen.getByLabelText('Media URL'), {
      target: { value: 'https://approved.example/video.mp4' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze URL' }));
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'MediaFetch could not reach its background service. Reopen the panel and try again.',
    );
  });
});
