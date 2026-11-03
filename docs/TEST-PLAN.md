# MediaFetch Test Plan

This document defines planned verification for application implementation. The toolchain and core provider tests are now established; UI-to-worker communication and browser-level scenarios remain future milestones.

## Test layers

- **Unit — Vitest:** URL parsing and validation, hostname allowlisting, provider matching, metadata normalization, typed message validation, storage behavior, download state translation, and error mapping.
- **Integration — Vitest with Chrome API fakes:** service-worker message routing, provider registry selection, download start/cancel/event handling, persistence, and recovery after simulated worker restart.
- **Browser — Playwright with Chrome:** load the unpacked MV3 extension, open the Side Panel, paste URLs, view supported/unsupported states, initiate a controlled test download, and observe progress and terminal states.
- **Static and packaging checks:** TypeScript typecheck, lint, production build, manifest validation, and a review that packaged extension code contains no remote executable code.

## Core scenarios

| Area | Scenarios and expected result |
| --- | --- |
| Input validation | Valid allowlisted HTTPS URL proceeds; malformed, non-HTTPS, or non-allowlisted URL is rejected without a download. |
| Source support | Supported direct media/authorized link returns only known options; arbitrary page, protected source, and unknown provider return a clear unsupported result. |
| Metadata | Missing title, format, quality, or size remains unknown; no value is fabricated. |
| Messaging | Valid requests receive typed results; malformed or unexpected messages fail safely. |
| Downloads | Start, progress, completion, failure, and cancellation are reflected from Chrome download events. |
| Worker lifecycle | Worker restart does not lose recoverable state; UI reconciles persisted metadata with Chrome download state. |
| Permissions | The built extension requests only the approved permissions and no blanket host access. |
| UI | Side Panel supports manual URL entry and clear status/error presentation without reading the current tab. |

## CI expectations

GitHub Actions should run the relevant unit/integration checks, typecheck, lint, and production build on each proposed change. Browser tests should run in CI when the extension test harness supports stable headless Chrome execution; otherwise document the local browser test command and run it before release.

## Acceptance gate

A feature is ready for review when its acceptance criteria are covered by appropriate tests, relevant checks pass, the full diff has been reviewed, and documentation reflects any approved behavior or architecture change. Do not commit unverified code; commits require user approval.
