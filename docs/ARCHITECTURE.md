# MediaFetch Architecture

## Principles

MediaFetch is a local first Chrome Manifest V3 extension with the Side Panel as its primary interface. Users submit URLs manually. Provider logic is isolated behind adapters, browser downloads remain browser-managed, and no backend is part of Phase 1.

## Components

| Component | Responsibility |
| --- | --- |
| Side Panel UI | Accept a pasted URL, present validation and source-reported options, start a selected download, and display its state. |
| Extension service worker | Handle typed extension messages, coordinate source analysis and downloads, subscribe to Chrome download events, and recover state after worker restarts. |
| Provider registry and adapters | Match an allowlisted source and return only its authorized, source-reported media information and download options. Unsupported sources return an explicit unsupported result. |
| Download manager | Start, monitor, and cancel downloads through `chrome.downloads`; translate browser events into user-facing state. |
| Storage layer | Persist minimal user-visible download metadata in `chrome.storage.local`; do not store media bytes. |
| Shared contracts | Define the conceptual URL analysis result, media option, download state, request, and error shapes shared by the UI and worker. |

## Data flow

1. The UI sends a typed analysis request containing the pasted URL to the service worker.
2. The worker validates the URL and selects a registered adapter using the explicit hostname allowlist.
3. The adapter returns supported metadata and authorized download options, or a typed unsupported/error result. It must not invent options or scrape arbitrary pages.
4. The UI displays the result. The user explicitly selects an option and asks to download it.
5. The worker starts the chosen URL with `chrome.downloads`; browser events update the local state and UI.

No content script, active-tab URL read, or automatic media detection is in the MVP.

## Core provider contract

Provider resolution uses a discriminated result: `ready` contains one or more validated download options, `unsupported` carries a reason, and `official-action` represents a provider-approved action URL. Metadata fields are optional and must be populated only when verified by the provider. The direct-media provider identifies a configured file extension in the URL path and may return one `Original file` option pointing to the validated input URL; it does not infer MIME type, title, size, quality, or resolution. The exact production hostname and extension allowlists remain unselected, so the provider is not wired to live sources yet.

## Messaging and errors

Use a typed request/response boundary between the Side Panel and service worker. Messages cover analysis, download start, cancellation, and state updates. Keep Chrome API calls in the worker-facing services rather than in UI components. Return actionable errors for invalid input, unsupported source, unavailable source metadata, permission/API failure, download failure, and cancellation. Do not expose raw internal exceptions as user-facing text.

## Service worker lifecycle and storage

Manifest V3 service workers are event-driven and may stop while idle. Treat the worker as restartable: do not rely on in-memory globals for durable download state. Persist the minimum state needed to restore the panel's view in `chrome.storage.local`, and use Chrome download events and state to reconcile active downloads. Storage holds metadata only, never downloaded file contents. Retention policy remains an open product question.

## Permissions and platform

Target Chrome 114 or later. Use the Side Panel API and toolbar action to open the panel. The baseline permissions are `sidePanel`, `downloads`, and `storage`. Do not request broad host permissions by default; any source-specific permission must be justified, documented, and approved before implementation. See [SECURITY.md](SECURITY.md).

## Proposed code organization

```text
extension/
  manifest.json
  index.html
  src/
    sidepanel/       # React UI
    background/      # MV3 service worker and message routing
    providers/       # registry, adapters, source contracts
    downloads/       # chrome.downloads coordination
    storage/         # local persistence
    shared/          # common types and validation
  tests/
    unit/
    browser/
scripts/
  copy-manifest.mjs
```

The configuration and core provider foundation are now present. UI analysis flow, service-worker messaging, downloads, and history remain future milestones.

## Future backend boundary

Phase 1 provider and download contracts should not depend on a server. Any later backend must be an explicitly approved architectural change, recorded in an ADR, and introduced only after the standalone extension is successfully developed, tested, and released. The extension should call a future analysis service only through a separately reviewed adapter boundary; no such service exists in Phase 1.

## Related decisions

See [the ADR index](adr/README.md) for the rationale and consequences of the initial decisions.
