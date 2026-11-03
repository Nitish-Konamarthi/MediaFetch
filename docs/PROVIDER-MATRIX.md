# MediaFetch Provider Matrix

MediaFetch supports only sources that are explicitly allowlisted and authorized for download. An adapter must return only options and metadata that the source reports through an authorized interface. Unknown values remain unknown. This matrix records source categories; it does not authorize any unlisted hostname.

| Source category | MVP status | Behavior |
| --- | --- | --- |
| Direct HTTPS media file | Candidate for MVP; exact host and file-extension allowlists unresolved | Permit a user-initiated download from an explicitly allowlisted host when the URL path has a configured media extension. Show only verified metadata; the initial provider can offer one “Original file” option without inferred metadata. |
| Explicit creator-provided download link | Candidate for MVP; exact provider/host allowlist unresolved | Support only when the source explicitly authorizes the download and the host is allowlisted. |
| General webpage containing a player | Unsupported by default | Do not inspect the active tab or scrape the page for hidden media URLs. |
| YouTube or another protected/access-controlled source | Unsupported for extraction | Do not extract streams, bypass restrictions, or offer unofficial download paths. The user may use the platform's official download or creator-provided options independently. |
| Undocumented third-party downloader service/API | Not in MVP | Do not reverse-engineer or depend on undocumented endpoints. Reconsider only with documented authorization and explicit approval. |
| Non-HTTPS source | Unsupported | Reject before analysis or download. |

## Adding a source

Before a source is implemented, record its hostname, authorization basis, supported URL types, available metadata/options, required permissions or network access, redirect behavior, error cases, and test coverage. Update this matrix and the relevant architecture/security documents, then add an ADR for any material architectural change. No hostname has been selected for the initial allowlist yet.
