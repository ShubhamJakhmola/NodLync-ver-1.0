(function () {
  const EXT_EVENT_TYPE = 'NODLYNC_PERF_METRICS';

  const SUPPORTS_PO = typeof PerformanceObserver !== 'undefined';

  const state = {
    sessionId: null,
    sessionType: 'navigation', // navigation | spa
    sessionUrl: location.href,
    startedAt: performance.now(),
    finalized: false,

    // Navigation timing (hard navigations)
    ttfb: null,
    dcl: null,
    load: null,

    // Observed metrics
    tbt: 0,
    fcp: null,
    lcp: null,
    cls: 0,

    // internals
    _lcpEntry: null,
    _hadFcp: false,
    _observers: [],
    _longtaskTotal: 0,
  };

  function nowIso() {
    try {
      return new Date().toISOString();
    } catch {
      return '';
    }
  }

  function genSessionId(prefix) {
    const rand = Math.random().toString(16).slice(2);
    return `${prefix}-${Date.now()}-${rand}`;
  }

  function safeDisconnect(observer) {
    try {
      observer.disconnect();
    } catch {
      // ignore
    }
  }

  function postToContent(payload) {
    try {
      window.postMessage(
        {
          type: EXT_EVENT_TYPE,
          payload,
        },
        window.location.origin
      );
    } catch {
      // ignore
    }
  }

  function readNavigationTimings() {
    try {
      const nav = performance.getEntriesByType('navigation')?.[0];
      if (!nav) return;

      // Avoid returning zeros too early
      const loadEventEnd = nav.loadEventEnd;
      const dclEnd = nav.domContentLoadedEventEnd;
      const responseStart = nav.responseStart;

      if (typeof responseStart === 'number' && responseStart > 0) state.ttfb = responseStart;
      if (typeof dclEnd === 'number' && dclEnd > 0) state.dcl = dclEnd;
      if (typeof loadEventEnd === 'number' && loadEventEnd > 0) state.load = loadEventEnd;
    } catch {
      // ignore
    }
  }

  function startObservers() {
    if (!SUPPORTS_PO) return;

    // Long Tasks -> TBT
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const duration = entry.duration || 0;
          if (duration > 50) state._longtaskTotal += duration - 50;
        }
        state.tbt = Math.round(state._longtaskTotal);
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true });
      state._observers.push(longTaskObserver);
    } catch {
      // ignore
    }

    // Paint -> FCP
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint' && !state._hadFcp) {
            state._hadFcp = true;
            state.fcp = Math.round(entry.startTime);
          }
        }
      });
      paintObserver.observe({ type: 'paint', buffered: true });
      state._observers.push(paintObserver);
    } catch {
      // ignore
    }

    // LCP
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (!entries || entries.length === 0) return;
        const last = entries[entries.length - 1];
        state._lcpEntry = last;
        state.lcp = Math.round(last.startTime);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      state._observers.push(lcpObserver);
    } catch {
      // ignore
    }

    // CLS
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) continue;
          state.cls += entry.value || 0;
        }
        // keep 3 decimals for readability
        state.cls = Math.round(state.cls * 1000) / 1000;
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      state._observers.push(clsObserver);
    } catch {
      // ignore
    }
  }

  function stopObservers() {
    for (const obs of state._observers) safeDisconnect(obs);
    state._observers = [];
  }

  function buildPayload(finalized) {
    readNavigationTimings();

    return {
      version: 1,
      finalized: !!finalized,
      observedAt: nowIso(),
      url: state.sessionUrl,
      sessionId: state.sessionId,
      sessionType: state.sessionType,

      metrics: {
        ttfb: state.ttfb, // ms from nav start
        dcl: state.dcl, // ms from nav start
        load: state.load, // ms from nav start
        tbt: state.tbt, // ms total
        fcp: state.fcp, // ms from nav start
        lcp: state.lcp, // ms from nav start / route start (best effort)
        cls: state.cls, // score
      },
    };
  }

  function finalize(reason) {
    if (state.finalized) return;
    state.finalized = true;

    // Ensure we get latest LCP before disconnect when page is backgrounded
    try {
      if (state._lcpEntry && typeof state._lcpEntry.startTime === 'number') {
        state.lcp = Math.round(state._lcpEntry.startTime);
      }
    } catch {
      // ignore
    }

    stopObservers();
    const payload = buildPayload(true);
    payload.finalizeReason = reason || 'unknown';
    postToContent(payload);
  }

  function scheduleFinalizeAfterLoad() {
    const doFinalize = () => {
      // Allow delayed metrics (LCP/CLS/longtasks) to flush/buffer
      setTimeout(() => finalize('load+delay'), 1500);
      // A second later snapshot for stragglers; still finalized once.
      setTimeout(() => finalize('load+delay2'), 3500);
    };

    if (document.readyState === 'complete') {
      setTimeout(doFinalize, 0);
      return;
    }

    window.addEventListener('load', doFinalize, { once: true });
  }

  function startNewSession(type) {
    // finalize prior session (SPA transition)
    if (state.sessionId && !state.finalized) finalize('session-replaced');

    // Reset state
    state.sessionId = genSessionId(type === 'spa' ? 'spa' : 'nav');
    state.sessionType = type;
    state.sessionUrl = location.href;
    state.startedAt = performance.now();
    state.finalized = false;

    state.ttfb = null;
    state.dcl = null;
    state.load = null;

    state.tbt = 0;
    state.fcp = null;
    state.lcp = null;
    state.cls = 0;

    state._lcpEntry = null;
    state._hadFcp = false;
    state._observers = [];
    state._longtaskTotal = 0;

    startObservers();

    // For SPA sessions we can't rely on navigation timing; still send a snapshot later.
    if (type === 'spa') {
      setTimeout(() => {
        if (!state.finalized) {
          const payload = buildPayload(false);
          payload.note = 'spa-session-snapshot';
          postToContent(payload);
        }
      }, 1500);

      setTimeout(() => finalize('spa-timeout'), 6000);
    }
  }

  function hookSpaNavigation() {
    const origPushState = history.pushState;
    const origReplaceState = history.replaceState;

    function onSoftNav() {
      // Defer until URL updates settle
      setTimeout(() => startNewSession('spa'), 0);
    }

    history.pushState = function () {
      const ret = origPushState.apply(this, arguments);
      onSoftNav();
      return ret;
    };
    history.replaceState = function () {
      const ret = origReplaceState.apply(this, arguments);
      onSoftNav();
      return ret;
    };

    window.addEventListener('popstate', onSoftNav);
  }

  // Finalize quickly when tab is backgrounded; important for LCP.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') finalize('hidden');
  });

  // Start hard navigation session
  startNewSession('navigation');
  scheduleFinalizeAfterLoad();
  hookSpaNavigation();
})();

