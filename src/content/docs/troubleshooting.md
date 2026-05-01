---
title: Troubleshooting
description: Fix common NodLync setup issues, missing metrics, and API capture problems. Includes quick checks and solutions.
---

# Troubleshooting

## Metrics not showing up

- Ensure the extension has permission for your site.
- Hard refresh and retry the flow.
- Make sure you are not blocking third-party scripts or storage.

## API calls not captured

- Confirm requests are made by the page (not a native wrapper).
- Check that your endpoints are not being served from a service worker cache.

## Data looks inconsistent

- Compare staging vs production builds (bundles differ).
- Verify network conditions and CPU throttling settings.

