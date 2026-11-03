# MediaFetch Architecture

## Principles

MediaFetch is a local first Chrome Manifest V3 extension with the Side Panel as its primary interface. Users submit URLs manually. Provider logic is isolated behind adapters, browser downloads remain browser-managed, and no backend is part of Phase 1.

## Components

| Component | Responsibility |
| --- | --- |
| Side Panel UI | Accept a pasted URL, present the analysis result and source-reported options, start a selected download, and display persisted download state. |
| Application service | Apply HTTPS and host validation, resolve providers, and re-resolve a user-selected option before download initiation. |
| Extension service worker | Register typed message and Downloads API listeners at top level, coordinate source analysis and downloads, and reconcile state after worker restarts. |
| Provider registry and adapters | Match an allowlisted source and return only its authorized, source-reported media information and download options. Unsupported sources return an explicit unsupported result. |
| Download manager | Start, monitor, and cancel downloads through `chrome.downloads`; translate browser events into user-facing state. |
| Storage layer | Persist minimal user-visible download metadata in `chrome.storage.local`; do not store media bytes or submitted URLs. |
| Shared contracts | Define URL analysis results, media options, download history, requests, and typed errors shared by the UI and worker. |

## Data flow

1. The UI sends a typed analysis request containing the pasted URL to the service worker.
2. The worker validates the URL and selects a registered adapter using the explicit hostname allowlist.
3. The adapter returns supported metadata and authorized download options, or a typed unsupported/error result. It must not invent options or scrape arbitrary pages.
4. The UI displays the result. The user explicitly selects an option and asks to download it.
5. The worker re-validates the source and selected option, then starts it with `chrome.downloads`; the returned Chrome ID is persisted with the initial in-progress record.
6. Top-level download listeners update terminal state; while the panel is open it polls `downloads.search` for byte counts and reconciles persisted records on open.

No content script, active-tab URL read, or automatic media detection is in the MVP.

## Core provider contract

Provider resolution uses a discriminated result: `ready` contains one or more validated download options, `unsupported` carries a reason, and `official-action` represents a provider-approved action URL. Metadata fields are optional and must be populated only when verified by the provider. The direct-media provider identifies a configured file extension in the URL path and may return one `Original file` option pointing to the validated input URL; it does not infer MIME type, title, size, quality, or resolution. The exact production hostname and extension allowlists remain unselected, so the provider is not wired to live sources yet.

## Messaging and errors

Use the dedicated typed message module for analysis, download start, cancellation, history refresh, and history clear. Keep Chrome API calls in worker-facing services rather than UI components. Return actionable errors for invalid input, unsupported source, browser API failure, download failure, and cancellation. Do not expose raw internal exceptions as user-facing text.

## Service worker lifecycle and storage

Manifest V3 service workers are event-driven and may stop while idle. Treat the worker as restartable: do not rely on in-memory globals for durable download state. Persist the minimum state needed to restore the panel's view in `chrome.storage.local`, and use Chrome download events and state to reconcile active downloads. Chrome does not emit `onChanged` events for `bytesReceived`, so the open panel periodically queries tracked Chrome IDs for progress ([Downloads API](https://developer.chrome.com/docs/extensions/reference/api/downloads)). Register event listeners at service-worker top level and persist state for recovery ([service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)). Storage holds sanitized filenames, Chrome IDs, timestamps, state, and byte counts only; it omits submitted URLs and absolute local paths. History remains until the user clears MediaFetch history.

## Permissions and platform

Target Chrome 114 or later. Use the Side Panel API and toolbar action to open the panel. The baseline permissions are `sidePanel`, `downloads`, and `storage`. Do not request broad host permissions by default; any source-specific permission must be justified, documented, and approved before implementation. See [SECURITY.md](SECURITY.md).

## Proposed code organization

```text
extension/
  manifest.json
  index.html
  src/
    sidepanel/       # React UI and application state
    background/      # MV3 service worker and message routing
    application/     # URL analysis and option selection orchestration
    providers/       # registry, adapters, source contracts
    downloads/       # chrome.downloads coordination and state mapping
    storage/         # validated local history persistence
    shared/          # common types, messages, configuration, and validation
  tests/
    unit/
    browser/
scripts/
  copy-manifest.mjs
```

The Side Panel, typed messaging, download manager, progress/status display, and local history/recovery are implemented. No production source is enabled while the approved host and extension allowlists remain empty.

## Future backend boundary

Phase 1 provider and download contracts should not depend on a server. Any later backend must be an explicitly approved architectural change, recorded in an ADR, and introduced only after the standalone extension is successfully developed, tested, and released. The extension should call a future analysis service only through a separately reviewed adapter boundary; no such service exists in Phase 1.

## Related decisions

See [the ADR index](adr/README.md) for the rationale and consequences of the initial decisions.
