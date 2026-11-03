# ADR-0002: User-Submitted URLs and Side Panel Workflow

- **Status:** Accepted
- **Date:** 2026-11-03

## Context

The desired workflow is a convenient paste-and-download experience. Automatic capture of the current playing video is not part of the product.

## Decision

Use the Chrome Side Panel as the primary interface. The user opens it from the toolbar action, pastes a URL, reviews the available source-reported options, and explicitly starts a download. Do not read the active tab, add content scripts for media detection, or auto-capture playback.

## Consequences

The user supplies the source URL directly. URL validation and provider selection happen after submission. The MVP avoids broad tab and host access that would otherwise be associated with automatic detection.

See [product requirements](../PRD.md), [architecture](../ARCHITECTURE.md), and [security](../SECURITY.md).
