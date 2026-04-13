// Create a panel in Chrome DevTools
chrome.devtools.panels.create(
    "NodLync Capture", 
    "icons/icon16.png", 
    "dashboard.html", 
    (panel) => {
        panel.onShown.addListener((window) => {
            // Panel logic...
        });
    }
);
