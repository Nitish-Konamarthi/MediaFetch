# ADR-0004: Browser-Managed Downloads and Local State

- **Status:** Accepted
- **Date:** 2026-11-03

## Context

The MVP downloads authorized media to the user's computer and needs to display progress while remaining resilient to Manifest V3 service-worker suspension.

## Decision

Use Chrome's Downloads API to start, monitor, and cancel downloads. Store only minimal user-visible download metadata in `chrome.storage.local`; do not store file contents or depend on worker globals for durable state. Reconcile the panel with browser download events and state after worker restarts.

## Consequences

Chrome remains responsible for saving files and reporting download status. Local history retention and URL persistence must be decided before implementing persistent history.

See [architecture](../ARCHITECTURE.md), [security](../SECURITY.md), and [test plan](../TEST-PLAN.md).
