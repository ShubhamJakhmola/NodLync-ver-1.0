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

        // Listen for messages from the interceptor in the page context
        window.addEventListener('message', (event) => {
            // Strict security: ensure sender is the current window and origin matches
            if (event.source !== window || event.origin !== window.location.origin) {
                return;
            }

            if (!event.data || event.data.type !== 'NODLYNC_INTERCEPTED') {
                return;
            }

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
        });
    } catch (e) {
        // Silently fail if extension context is lost
    }
})();
