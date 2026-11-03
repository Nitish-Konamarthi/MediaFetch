import { createDefaultMediaFetchService } from '../application/MediaFetchService';
import { DownloadManager } from '../downloads/DownloadManager';
import { DownloadHistoryRepository } from '../storage/DownloadHistoryRepository';
import { APPROVED_HOSTNAMES } from '../shared/config/approvedSources';
import { isExtensionRequest } from '../shared/messaging/messages';
import { createMessageHandler } from './messageHandler';

const history = new DownloadHistoryRepository(chrome.storage.local);
const downloadManager = new DownloadManager(chrome.downloads, history, APPROVED_HOSTNAMES);
const handleMessage = createMessageHandler(
  createDefaultMediaFetchService(),
  downloadManager,
  history,
);

// Chrome requires extension service-worker event listeners to be registered at top level.
chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isExtensionRequest(message)) return false;
  void handleMessage(message)
    .then(sendResponse)
    .catch(() => {
      sendResponse({ ok: false, error: 'MediaFetch encountered an unexpected background error.' });
    });
  return true;
});

chrome.downloads.onChanged.addListener((delta) => {
  void downloadManager.handleChanged(delta.id).catch((error: unknown) => {
    console.error('MediaFetch could not update download history.', error);
  });
});

chrome.downloads.onErased.addListener((downloadId) => {
  void downloadManager.handleErased(downloadId).catch((error: unknown) => {
    console.error('MediaFetch could not reconcile removed Chrome download history.', error);
  });
});

chrome.runtime.onStartup.addListener(() => {
  void downloadManager.reconcile().catch((error: unknown) => {
    console.error('MediaFetch could not reconcile downloads at browser startup.', error);
  });
});

chrome.runtime.onInstalled.addListener(() => {
  void downloadManager.reconcile().catch((error: unknown) => {
    console.error('MediaFetch could not reconcile downloads after installation.', error);
  });
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error: unknown) => {
  console.error('Unable to configure the MediaFetch Side Panel.', error);
});
