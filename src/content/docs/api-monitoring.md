---
title: API Monitoring
description: Monitor API latency, errors, and slow endpoints, and tie them to frontend sessions to understand real user impact.
---

# API Monitoring

NodLync focuses on **developer-first API monitoring**: you see latency, errors, and slow endpoints, and connect them to **frontend sessions** and **UX metrics**.

## What you can track

- Endpoint latency (p50/p95/p99)
- Error rates (4xx/5xx)
- Slowest routes and regressions over time

## How NodLync helps

- Identifies which API calls correlate with poor TTFB/DCL/TBT/LCP.
- Gives actionable context: route, timing breakdown, and session impact.

## Common fixes

- Reduce N+1 queries and optimize indexes
- Add caching (server + CDN)
- Use compression and keep payloads small

