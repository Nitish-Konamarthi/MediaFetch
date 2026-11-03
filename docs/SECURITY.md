# MediaFetch Security

## Security goals

- Download only from approved HTTPS sources and explicit authorized download links.
- Do not bypass DRM, access controls, or source restrictions.
- Minimize browser permissions and locally retained data.
- Do not inspect unrelated browsing activity or execute remote code.

## URL and source handling

- Parse user input with the platform URL parser; reject malformed URLs and schemes other than HTTPS.
- Reject URL user information (embedded username or password) so credentials cannot be smuggled in the submitted address.
- Match normalized hostnames against explicit entries in the provider allowlist. Do not use wildcard host matching as a substitute for review.
- Treat arbitrary web pages, protected streams, unsupported URLs, and undocumented extraction endpoints as unsupported.
- Do not fetch or scrape arbitrary pages to discover media. Provider-specific network access requires a documented, authorized interface, a permission review, an updated provider matrix, and user approval before implementation.
- Never invent metadata, quality, format, or authorization based on a URL's appearance.

## Permissions and data

The approved baseline is `sidePanel`, `downloads`, and `storage`. Avoid `tabs`, `activeTab`, content scripts, and broad `host_permissions` for the paste-only workflow. Add a permission only when a specific approved feature needs it and document the reason.

Keep state in `chrome.storage.local` only when needed for the download experience. Do not store media bytes, submitted URLs, credentials, absolute local paths, or unrelated browsing data. MediaFetch history persists until the user clears it; clearing MediaFetch history does not delete files or alter Chrome's download history.

Chrome documents that [`downloads.download()` includes cookies already set for the requested hostname](https://developer.chrome.com/docs/extensions/reference/api/downloads). Keep the approved source list explicit and empty until each source and its redirect behavior are reviewed. Do not add host permissions or use download initiation to test unapproved hosts.

## Runtime and dependency safety

- Use Manifest V3 and package all executable extension code locally; never load remotely hosted executable code.
- Treat provider responses and browser messages as untrusted input; validate their shape before display or use.
- Keep downloads user-initiated and use Chrome's Downloads API.
- Review dependencies for necessity and security before adding them, and keep resolved versions in the npm lockfile.

## Threats and mitigations

| Threat | Mitigation |
| --- | --- |
| Malformed or deceptive URL | Parse and validate scheme, hostname, and allowlist membership before analysis or download. |
| Unsupported or protected source | Return unsupported status; do not attempt extraction, DRM bypass, or access-control circumvention. |
| Spoofed or incomplete metadata | Display only validated, source-reported fields; leave unavailable values unknown. |
| Excessive browser access | Start with the approved narrow permission set and review every proposed addition. |
| Service worker restart loses state | Persist minimal state and reconcile with Chrome download events. |
| Sensitive URL retained in local history | Minimize stored fields; determine URL retention and history clearing policy before implementation. |

## Security review checklist

Before accepting a source or permission change, document the source's authorization basis, required origins and permissions, data sent or stored, redirect behavior, error handling, and test coverage. Record material architecture changes in an ADR.
