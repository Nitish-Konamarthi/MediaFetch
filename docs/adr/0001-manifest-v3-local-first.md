# ADR-0001: Manifest V3 and Local-First Extension

- **Status:** Accepted
- **Date:** 2026-11-03

## Context

The MVP is a personal Chrome desktop extension. A backend would add operational cost and complexity before the extension's core flow is proven.

## Decision

Build Phase 1 as a local-first Chrome Manifest V3 extension using React, TypeScript, and Vite. Target Chrome 114 or later for the Side Panel API. Defer backend and cloud infrastructure until the standalone extension has been developed, tested, and released.

## Consequences

The extension owns its UI, source coordination, download interaction, and minimal local state. Service-worker logic must tolerate worker suspension. Any backend proposal is a later, separately reviewed architecture change.

See [architecture](../ARCHITECTURE.md) and [roadmap](../ROADMAP.md).
