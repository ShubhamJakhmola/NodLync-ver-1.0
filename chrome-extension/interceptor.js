// Interceptor script to hook into browser networking
(function() {
    const originalFetch = window.fetch;
    const originalXHR = window.XMLHttpRequest;

    function postCapturedRequest(payload) {
        window.postMessage({
            type: 'NODLYNC_INTERCEPTED',
            payload
        }, window.location.origin);
    }

    // Intercept Fetch
    window.fetch = async function(...args) {
        const url = args[0] instanceof Request ? args[0].url : args[0];
        const method = (args[1] && args[1].method) || (args[0] instanceof Request ? args[0].method : 'GET');
        const headers = (args[1] && args[1].headers) || (args[0] instanceof Request ? Object.fromEntries([...args[0].headers]) : {});
        const body = (args[1] && args[1].body) || (args[0] instanceof Request ? args[0].body : null);

        // Call original fetch
        const response = await originalFetch(...args);
        
        // Capture relevant requests (XHR/fetch only)
        if (typeof url === 'string' && (url.startsWith('http') || url.startsWith('/'))) {
            // Check if it's a NodLync system request to avoid infinite loops or noise
            if (!url.includes('supabase.co') && !url.includes('nodlync.com')) {
                postCapturedRequest({
                    method: method.toUpperCase(),
                    url: url,
                    headers: headers,
                    body: body,
                    status: response.status
                });
            }
        }

        return response;
    };

    // Intercept XHR
    function NodLyncXHR() {
        const xhr = new originalXHR();
        const open = xhr.open;
        let method, url;

        xhr.open = function(m, u, ...args) {
            method = m;
            url = u;
            return open.apply(this, [m, u, ...args]);
        };

        const send = xhr.send;
        xhr.send = function(data) {
            this.addEventListener('load', () => {
                if (!url.includes('supabase.co') && !url.includes('nodlync.com')) {
                    postCapturedRequest({
                        method: method.toUpperCase(),
                        url: url,
                        headers: {}, // XHR headers are harder to get after send
                        body: data,
                        status: this.status
                    });
                }
            });
            return send.apply(this, [data]);
        };

        return xhr;
    }
    
    // Commented out setting window.XMLHttpRequest for now to avoid side effects on complex sites
    // window.XMLHttpRequest = NodLyncXHR;

    console.log('[NodLync] Live API Capture Interceptor active.');
})();
