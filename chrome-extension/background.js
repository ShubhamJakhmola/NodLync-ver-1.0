// NodLync Extension Background Service Worker
let isCapturing = false;
let showAnalytics = false;

// Initialize state
chrome.storage.local.get(['isCapturing', 'showAnalytics'], (res) => {
    isCapturing = !!res.isCapturing;
    showAnalytics = !!res.showAnalytics;
});

// Broadcast state changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes.isCapturing) {
        isCapturing = changes.isCapturing.newValue;
    }
    if (changes.showAnalytics) {
        showAnalytics = changes.showAnalytics.newValue;
    }
});

// Listener for messages from popup or content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'NODLYNC_CAPTURE_READY' && isCapturing) {
        // Content script is asking if it should start intercepting
        sendResponse({ capture: true });
        return true;
    }

    if (msg.type === 'CAPTURED_REQUEST' && isCapturing) {
        // Record the request
        const urlToCapture = msg.data.url;
        
        // Background filtering for noise
        const noisy = ['google-analytics', 'googleads', 'doubleclick', 'googletagmanager', 'facebook', 'hotjar', 'pixel', 'analytics.google'];
        const isNoisy = noisy.some(n => urlToCapture.includes(n));
        
        if (isNoisy && !showAnalytics) return;

        chrome.storage.local.get(['capturedRequests'], (res) => {
            const list = res.capturedRequests || [];
            // De-duplicate slightly or limit
            const alreadyExists = list.some(r => r.url === msg.data.url && r.method === msg.data.method && Date.now() - r.id < 5000);
            if (!alreadyExists) {
                const newReq = { 
                    ...msg.data, 
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    domain: new URL(msg.data.url).hostname
                };
                list.unshift(newReq);
                chrome.storage.local.set({ capturedRequests: list.slice(0, 150) });
            }
        });
    }
});
