chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error: unknown) => {
  console.error('Unable to configure the MediaFetch Side Panel.', error);
});
