# ADR-0003: Authorized Sources and Provider Adapters

- **Status:** Accepted
- **Date:** 2026-11-03

## Context

MediaFetch should be provider-independent, but source authorization, available metadata, and download options vary. Undocumented extraction risks breaking source restrictions and inventing capabilities.

## Decision

Limit the MVP to direct HTTPS media and explicit authorized download links on explicitly allowlisted hosts. Isolate supported source behavior behind provider adapters. Adapters report only available, authorized options and source-reported metadata; they do not scrape arbitrary pages, bypass access controls, or invent formats or quality. Exact initial hostnames remain undecided.

## Consequences

Unsupported or unlisted hosts fail closed with an explanatory result. Adding a source requires a documented authorization basis, an allowlist update, security and permission review, and tests. No undocumented downloader-service integration is included.

See [provider matrix](../PROVIDER-MATRIX.md), [architecture](../ARCHITECTURE.md), and [security](../SECURITY.md).
