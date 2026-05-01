---
title: Performance Metrics (TTFB, DCL, TBT, LCP)
description: Learn what core frontend performance metrics mean, why they matter, and how NodLync captures them in a Chrome extension workflow.
---

# Performance Metrics (TTFB, DCL, TBT, LCP)

NodLync helps you correlate **frontend performance metrics** with **API latency** so you can answer: *“Is this slow because of the backend, the frontend, or both?”*

## What are the metrics?

- **TTFB (Time To First Byte):** time until the first byte of the response arrives.
- **DCL (DOMContentLoaded):** when the HTML document is parsed.
- **TBT (Total Blocking Time):** how long the main thread is blocked by long tasks.
- **LCP (Largest Contentful Paint):** when the largest element becomes visible.

## Why they matter

- They reflect **perceived speed** and **interaction readiness**, not just load time.
- They help you isolate “fast API, slow UI” vs “slow API, slow UI”.

## How NodLync measures them

- Captures timing from the browser (navigation + performance APIs).
- Associates timings with requests and sessions so you can debug regressions.

## How to fix high values (quick checklist)

- High **TTFB**: cache, optimize DB queries, reduce upstream latency, use CDN.
- Slow **DCL**: reduce JS, split bundles, defer non-critical scripts.
- High **TBT**: fix long tasks, remove heavy synchronous work, optimize React render.
- Poor **LCP**: optimize critical images/fonts, reduce render-blocking resources.

