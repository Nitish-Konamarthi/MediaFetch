# MediaFetch

MediaFetch is a local first Chrome extension foundation for downloading authorized media from user-submitted URLs. Its planned primary interface is the Chrome Side Panel. The MVP targets direct HTTPS media links and explicit authorized download links; it does not capture the active tab or extract media from protected services.

## Project documents

- [Product requirements](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security boundaries](docs/SECURITY.md)
- [Test plan](docs/TEST-PLAN.md)
- [Roadmap](docs/ROADMAP.md)
- [Provider matrix](docs/PROVIDER-MATRIX.md)
- [Architecture decisions](docs/adr/)
- [Agent instructions](AGENTS.md) and [reusable prompts](PROMPTS.md)

## Development setup

Use Node.js 22.13 or later in the 22.x line, or Node.js 24 or later, with npm. Install the locked dependencies with `npm ci`.

- `npm run dev` — start the Side Panel shell in Vite.
- `npm test` — run unit tests once; use `npm run test:watch` during development.
- `npm run typecheck` — run strict TypeScript checks.
- `npm run lint` — run ESLint.
- `npm run format:check` — verify formatting.
- `npm run build` — build the unpacked Chrome extension in `dist/`.
- `npm run check` — run formatting, lint, type checks, unit tests, and build.

The current implementation is the toolchain and core provider foundation. It does not yet connect the provider registry to the Side Panel or implement downloads. See the [roadmap](docs/ROADMAP.md) for the feature sequence.
