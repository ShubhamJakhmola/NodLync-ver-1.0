// Content script: Inject Interceptor if enabled
(async () => {
    document.documentElement.setAttribute('data-nodlync-ext', 'true');
    try {
        const response = await chrome.runtime.sendMessage({ type: 'NODLYNC_CAPTURE_READY' });
        
        if (response && response.capture) {
            const s = document.createElement('script');
            s.src = chrome.runtime.getURL('interceptor.js');
            s.onload = function() { this.remove(); };
            (document.head || document.documentElement).appendChild(s);
        }

        // Always inject page-context performance probe (independent of API capture toggle)
        try {
            const p = document.createElement('script');
            p.src = chrome.runtime.getURL('perf-probe.js');
            p.onload = function() { this.remove(); };
            (document.head || document.documentElement).appendChild(p);
        } catch (e) {
            // ignore
        }

        // Listen for messages from the interceptor in the page context
        window.addEventListener('message', (event) => {
            // Strict security: ensure sender is the current window and origin matches
            if (event.source !== window || event.origin !== window.location.origin) {
                return;
            }

            if (!event.data || typeof event.data.type !== 'string') {
                return;
            }

            if (event.data.type === 'NODLYNC_INTERCEPTED') {
                // Protect against malformed payload injection
                const payload = event.data.payload;
                if (!payload || typeof payload !== 'object' || !payload.url || !payload.method) {
                    return;
                }

                // Forward it to background script
                chrome.runtime.sendMessage({ 
                    type: 'CAPTURED_REQUEST', 
                    data: payload 
                });
                return;
            }

            if (event.data.type === 'NODLYNC_PERF_METRICS') {
                const payload = event.data.payload;
                if (!payload || typeof payload !== 'object' || !payload.metrics || typeof payload.metrics !== 'object') {
                    return;
                }
                chrome.runtime.sendMessage({
                    type: 'PERF_METRICS',
                    data: payload
                });
                return;
            }
        });
    } catch (e) {
        // Silently fail if extension context is lost
    }
})();
