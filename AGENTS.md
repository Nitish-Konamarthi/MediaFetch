# MediaFetch Agent Instructions

## Before changing the project

- Read this file and the relevant documents under `docs/` before planning a change.
- Explore the current implementation first. For meaningful changes, present a plan and wait for user approval before editing.
- Keep changes within the approved scope. Do not add backend services, permissions, providers, or infrastructure without explicit approval and an architecture update.

## Engineering rules

- Preserve the local first Chrome Manifest V3 architecture and the user-pasted URL workflow. Do not inspect the active tab or capture currently playing media.
- Support only approved HTTPS sources and explicit authorized download links. Do not bypass DRM or access controls, use undocumented extraction, or invent formats or quality values.
- Request the minimum Chrome permissions. Never execute remotely hosted code or collect unrelated browsing data.
- Add appropriate tests for meaningful application changes. Run relevant checks and review the complete diff before reporting results.
- Keep each verified logical change atomic and use a Conventional Commit message. Do not commit or push without the user's approval.
- Update architecture documentation and add an ADR when an approved change materially alters an architectural decision.

## Source of truth

Use [README.md](README.md) for project orientation, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design, [docs/SECURITY.md](docs/SECURITY.md) for security boundaries, and [docs/adr/](docs/adr/) for recorded decisions. When documents disagree, stop and resolve the inconsistency before implementation.
