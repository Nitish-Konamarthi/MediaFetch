import { useCallback, useEffect, useRef, useState } from 'react';
import type { DownloadHistoryRecord } from '../shared/domain/download';
import type { ResolutionResult } from '../shared/domain/media';
import { sendExtensionRequest } from '../shared/messaging/messages';
import './App.css';

function unsupportedMessage(result: Extract<ResolutionResult, { kind: 'unsupported' }>): string {
  switch (result.reason) {
    case 'invalid-url':
      return 'Enter a valid URL to continue.';
    case 'unsupported-protocol':
      return 'Only HTTPS URLs are supported.';
    case 'unapproved-host':
      return 'This host is not on MediaFetch’s approved source list.';
    case 'no-provider':
      return 'No MediaFetch provider supports this source.';
    case 'not-direct-media':
      return 'This URL does not identify a supported direct media file.';
  }
}

function formatStatus(record: DownloadHistoryRecord): string {
  switch (record.status) {
    case 'in-progress':
      return 'Downloading';
    case 'completed':
      return record.bytesReceived === 0 ? 'Completed (0 bytes)' : 'Completed';
    case 'interrupted':
      return 'Interrupted';
    case 'cancelled':
      return 'Cancelled';
    case 'unavailable':
      return 'No longer available in Chrome downloads';
  }
}

function downloadFailureMessage(record: DownloadHistoryRecord): string {
  const code = record.errorCode ?? '';
  if (code.startsWith('NETWORK_')) return 'A network problem interrupted this download.';
  if (code.startsWith('SERVER_UNAUTHORIZED') || code.startsWith('SERVER_FORBIDDEN')) {
    return 'The source did not authorize this download.';
  }
  if (code.startsWith('SERVER_')) return 'The source could not provide this file.';
  if (code.startsWith('FILE_')) return 'Chrome could not save this file to disk.';
  if (code === 'DOWNLOAD_NOT_FOUND' || code === 'DOWNLOAD_REMOVED_FROM_CHROME_HISTORY') {
    return 'Chrome no longer has a matching download record.';
  }
  return 'Chrome reported a download interruption.';
}

export function App() {
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState<ResolutionResult | null>(null);
  const [history, setHistory] = useState<readonly DownloadHistoryRecord[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyDownloadId, setBusyDownloadId] = useState<number | null>(null);
  const analysisSequence = useRef(0);

  const refreshHistory = useCallback(async () => {
    const response = await sendExtensionRequest({ type: 'GET_HISTORY' });
    if (!response.ok) throw new Error(response.error);
    if (response.type !== 'HISTORY_UPDATED')
      throw new Error('Unexpected download history response.');
    setHistory(response.records);
  }, []);

  useEffect(() => {
    void refreshHistory().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'Download history could not be loaded.');
    });
  }, [refreshHistory]);

  useEffect(() => {
    if (!history.some((record) => record.status === 'in-progress')) return;
    const interval = window.setInterval(() => {
      void refreshHistory().catch(() => undefined);
    }, 1200);
    return () => window.clearInterval(interval);
  }, [history, refreshHistory]);

  async function pasteFromClipboard() {
    setError(null);
    try {
      setUrl(await navigator.clipboard.readText());
    } catch {
      setNotice('Clipboard access is unavailable. Paste into the field manually.');
    }
  }

  async function analyzeUrl(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sequence = ++analysisSequence.current;
    const submittedUrl = url;
    setIsAnalyzing(true);
    setAnalysis(null);
    setError(null);
    setNotice(null);
    try {
      const response = await sendExtensionRequest({ type: 'ANALYZE_URL', url: submittedUrl });
      if (!response.ok) throw new Error(response.error);
      if (response.type !== 'ANALYSIS_RESULT') throw new Error('Unexpected analysis response.');
      if (analysisSequence.current === sequence) setAnalysis(response.result);
    } catch (caught) {
      if (analysisSequence.current === sequence) {
        setError(caught instanceof Error ? caught.message : 'The URL could not be analyzed.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function startDownload(optionId: string) {
    setBusyDownloadId(-1);
    setError(null);
    setNotice(null);
    try {
      const response = await sendExtensionRequest({ type: 'START_DOWNLOAD', url, optionId });
      if (!response.ok) throw new Error(response.error);
      if (response.type !== 'DOWNLOAD_STARTED') throw new Error('Unexpected download response.');
      setNotice(`Download started: ${response.record.filename}`);
      await refreshHistory();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Chrome could not start the download.');
    } finally {
      setBusyDownloadId(null);
    }
  }

  async function cancelDownload(chromeDownloadId: number) {
    setBusyDownloadId(chromeDownloadId);
    setError(null);
    try {
      const response = await sendExtensionRequest({ type: 'CANCEL_DOWNLOAD', chromeDownloadId });
      if (!response.ok) throw new Error(response.error);
      await refreshHistory();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Chrome could not cancel the download.');
    } finally {
      setBusyDownloadId(null);
    }
  }

  async function clearHistory() {
    setError(null);
    try {
      const response = await sendExtensionRequest({ type: 'CLEAR_HISTORY' });
      if (!response.ok) throw new Error(response.error);
      if (response.type !== 'HISTORY_CLEARED')
        throw new Error('Unexpected clear history response.');
      setHistory([]);
      setNotice('MediaFetch history cleared. Chrome download files were not changed.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Download history could not be cleared.');
    }
  }

  return (
    <main className="app-shell">
      <header className="brand-header">
        <div className="brand-mark" aria-hidden="true">
          MF
        </div>
        <div>
          <p className="eyebrow">LOCAL MEDIA TOOL</p>
          <h1>MediaFetch</h1>
        </div>
      </header>
      <section className="card" aria-labelledby="analyze-heading">
        <h2 id="analyze-heading">Analyze a media URL</h2>
        <p className="muted">
          Paste an authorized HTTPS media link. MediaFetch checks approved sources only.
        </p>
        <p className="setup-notice">
          No source hosts are enabled yet. URLs will remain unsupported until an authorized source
          is approved.
        </p>
        <form onSubmit={(event) => void analyzeUrl(event)}>
          <label htmlFor="media-url">Media URL</label>
          <div className="input-row">
            <input
              id="media-url"
              name="url"
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="https://example.com/media.mp4"
              value={url}
              onChange={(event) => {
                analysisSequence.current += 1;
                setAnalysis(null);
                setError(null);
                setUrl(event.currentTarget.value);
              }}
            />
            <button
              className="secondary-button paste-button"
              type="button"
              onClick={() => void pasteFromClipboard()}
            >
              Paste
            </button>
          </div>
          <button
            className="primary-button analyze-button"
            type="submit"
            disabled={isAnalyzing || !url.trim()}
          >
            {isAnalyzing ? 'Analyzing…' : 'Analyze URL'}
          </button>
        </form>
        {isAnalyzing && (
          <p role="status" className="inline-status">
            Checking the URL and approved providers…
          </p>
        )}
        {error && (
          <p role="alert" className="feedback error-feedback">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="feedback notice-feedback">
            {notice}
          </p>
        )}
      </section>
      {analysis && (
        <section className="card result-card" aria-live="polite" aria-labelledby="result-heading">
          <h2 id="result-heading">Resolution result</h2>
          {analysis.kind === 'ready' && (
            <>
              <p className="status-pill success-pill">Supported source</p>
              {analysis.metadata?.title && (
                <p className="resolution-title">{analysis.metadata.title}</p>
              )}
              {analysis.metadata?.mimeType && (
                <p className="option-detail">Format: {analysis.metadata.mimeType}</p>
              )}
              <div className="options-section">
                <h3>Available download options</h3>
                {analysis.options.map((option) => (
                  <div className="option-row" key={option.id}>
                    <div>
                      <strong>{option.label}</strong>
                      {option.metadata?.quality && (
                        <span className="option-detail">Quality: {option.metadata.quality}</span>
                      )}
                      {option.metadata?.sizeBytes !== undefined && (
                        <span className="option-detail">
                          Size: {option.metadata.sizeBytes} bytes
                        </span>
                      )}
                      {option.metadata?.title && (
                        <span className="option-detail">{option.metadata.title}</span>
                      )}
                      {option.metadata?.mimeType && (
                        <span className="option-detail">Format: {option.metadata.mimeType}</span>
                      )}
                    </div>
                    <button
                      className="primary-button"
                      type="button"
                      disabled={busyDownloadId !== null}
                      onClick={() => void startDownload(option.id)}
                    >
                      {busyDownloadId === -1 ? 'Starting…' : 'Download'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {analysis.kind === 'unsupported' && (
            <p className="feedback warning-feedback">{unsupportedMessage(analysis)}</p>
          )}
          {analysis.kind === 'official-action' && (
            <p className="feedback notice-feedback">
              {analysis.label} is available through the source’s official action.
            </p>
          )}
        </section>
      )}
      <section className="card history-card" aria-labelledby="history-heading">
        <div className="section-heading-row">
          <div>
            <h2 id="history-heading">Download history</h2>
            <p className="muted">Saved on this device until you clear it.</p>
          </div>
          <button
            className="text-button"
            type="button"
            onClick={() => void clearHistory()}
            disabled={history.length === 0}
          >
            Clear
          </button>
        </div>
        {history.length === 0 ? (
          <p className="empty-state">Your MediaFetch downloads will appear here.</p>
        ) : (
          <ul className="history-list">
            {history.map((record) => (
              <li className="history-item" key={record.id}>
                <div className="history-main">
                  <strong className="filename" title={record.filename}>
                    {record.filename}
                  </strong>
                  <span className={`status-pill status-${record.status}`}>
                    {formatStatus(record)}
                  </span>
                </div>
                {(record.status === 'interrupted' || record.status === 'unavailable') && (
                  <p className="download-error-detail">{downloadFailureMessage(record)}</p>
                )}
                {record.status === 'in-progress' && (
                  <div className="progress-row">
                    {record.progressPercent === undefined ? (
                      <progress aria-label={`Download progress for ${record.filename}`} />
                    ) : (
                      <progress
                        aria-label={`Download progress for ${record.filename}`}
                        max={100}
                        value={record.progressPercent}
                      />
                    )}
                    <span>
                      {record.progressPercent === undefined
                        ? 'Progress unavailable'
                        : `${record.progressPercent}%`}
                    </span>
                    <button
                      className="text-button cancel-button"
                      type="button"
                      disabled={busyDownloadId === record.chromeDownloadId}
                      onClick={() => void cancelDownload(record.chromeDownloadId)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <footer>Only user-submitted links are analyzed. No active-tab capture.</footer>
    </main>
  );
}
