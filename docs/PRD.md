# Product Requirements: MediaFetch

## Product

MediaFetch is a lightweight Chrome desktop extension for a user to submit a media URL, inspect the authorized media information available for that source, choose an available option, and download it locally. The primary interface is the Chrome Side Panel. The initial product is local first and has no application backend.

## Intended user and problem

The initial audience is the project owner using Chrome desktop. MediaFetch should make saving media convenient when the source explicitly permits downloading, without requiring an account or collecting unrelated browsing information.

## MVP workflow

1. The user opens the extension Side Panel from the toolbar action.
2. The user pastes a URL and requests analysis.
3. MediaFetch validates the HTTPS URL and checks whether its host and source are supported.
4. The panel shows only information and download options available from the supported source. Unknown metadata remains unknown.
5. The user selects an available option and starts the download.
6. The panel shows the browser-reported download state and outcome.

There is no automatic active-tab inspection or media capture.

## Requirements

### Must have

- Accept a URL pasted by the user in the Side Panel.
- Reject malformed, non-HTTPS, unsupported, or non-allowlisted sources with a clear explanation.
- Identify supported source types through a provider-independent adapter boundary.
- Display source-reported title, format, quality, and size when available; never fabricate values.
- Let the user choose from authorized download options returned by a supported source.
- Start and monitor a download through Chrome's Downloads API.
- Keep only the minimal local state required for the extension's user-visible download experience.
- Work without an application backend or user account.

### Out of scope

- Reading the active tab, content scripts for video detection, or automatic capture of playing media.
- DRM circumvention, bypassing access controls, undocumented extraction, or invented media variants.
- General web page scraping or integration with an undocumented third-party downloader service.
- Backend, cloud processing, accounts, remote storage, analytics, or advertising.

## Acceptance criteria

- A user can paste a supported HTTPS media URL and start its authorized download from the Side Panel.
- Invalid and unsupported URLs are not downloaded and receive actionable feedback.
- Metadata and choices shown are limited to values reported by the supported source; absent values are clearly omitted or unknown.
- Download progress, completion, failure, and cancellation are reflected from Chrome's download state.
- The extension does not require broad browsing access or send submitted URLs to an application backend.
- Unsupported or protected sources do not trigger an extraction attempt.

## Constraints and dependencies

The extension targets Chrome 114 or later for the Side Panel API. MVP capabilities use Manifest V3, React, TypeScript, Vite, Chrome Side Panel, Downloads and Storage APIs, Vitest, Playwright, and GitHub Actions. Permission details and source eligibility are defined in [SECURITY.md](SECURITY.md) and [PROVIDER-MATRIX.md](PROVIDER-MATRIX.md).

## Open product questions

- Which exact hostnames/providers should be allowlisted for the initial release?
- How should an approved download link that redirects to a different hostname be handled?
- Which source-reported metadata fields are essential when a source supplies only partial information?
