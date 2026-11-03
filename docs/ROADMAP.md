# MediaFetch Roadmap

This roadmap separates the standalone extension from any later backend work. Each feature follows Explore → Plan → approval → Implement → Verify.

## Foundation — completed

- Establish requirements, architecture, security boundaries, provider scope, test strategy, roadmap, agent guidance, and ADRs.
- Set up the React, TypeScript, Vite, Manifest V3, lint, format, unit-test, and CI foundation.
- Define core media types, provider contract/registry, HTTPS URL validation, and a direct-media provider with no production host allowlist.
- Implement Side Panel URL analysis, typed service-worker messaging, Chrome Downloads API initiation/events/cancellation, local download history, and restart reconciliation.

Before enabling any real source, resolve the initial hostname and file-extension allowlists and review redirect behavior. Local history retention is user-controlled: records remain until the user clears MediaFetch history.

## Phase 1 — standalone extension

1. Select an authorized direct-media host and extension allowlist; review redirect handling before enabling downloads.
2. Complete controlled-source Chrome testing, accessibility review, and release-readiness security review.
3. Document and release the standalone extension.

## Phase 2 — backend and cloud (deferred)

Consider backend services only after Phase 1 has been successfully developed, tested, and released, and only when a validated product need justifies them. Candidate technologies in the project brief include Node.js/Fastify, PostgreSQL, Redis, FFmpeg for authorized processing, AWS, Docker, CI/CD, and infrastructure as code. None are approved or required for Phase 1. Any proposal requires exploration, an approved plan, a security review, and ADRs before implementation.
