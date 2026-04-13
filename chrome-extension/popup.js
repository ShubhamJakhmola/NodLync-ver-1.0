document.addEventListener('DOMContentLoaded', () => {
    const captureToggle = document.getElementById('captureToggle');
    const captureStatus = document.getElementById('captureStatus');
    const noData = document.getElementById('noData');
    const requestList = document.getElementById('requestList');
    const clearAllBtn = document.getElementById('clearAll');
    const sendBtn = document.getElementById('sendToNodLync');
    const launchBtn = document.getElementById('launchDashboard');

    let selectedRequestMeta = null;

    launchBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'dashboard.html' });
    });

    // Load initial state
    chrome.storage.local.get(['isCapturing', 'capturedRequests'], (res) => {
        if (res.isCapturing) {
            captureToggle.checked = true;
            captureStatus.textContent = 'ON';
            captureStatus.style.color = '#8b5cf6';
        }

        if (res.capturedRequests && res.capturedRequests.length > 0) {
            renderRequests(res.capturedRequests);
        }
    });

    // Toggle capture
    captureToggle.addEventListener('change', () => {
        const isOn = captureToggle.checked;
        captureStatus.textContent = isOn ? 'ON' : 'OFF';
        captureStatus.style.color = isOn ? '#8b5cf6' : 'inherit';
        chrome.storage.local.set({ isCapturing: isOn });
    });

    // Clear all
    clearAllBtn.addEventListener('click', () => {
        chrome.storage.local.set({ capturedRequests: [] });
        renderRequests([]);
        selectedRequestMeta = null;
        sendBtn.disabled = true;
    });

    // Send to NodLync - this uses the REST API or an Edge function
    sendBtn.addEventListener('click', async () => {
        if (!selectedRequestMeta) return;

        sendBtn.textContent = 'Sending...';
        sendBtn.disabled = true;

        try {
            // Need to get User ID. Best way: Communicate with a NodLync tab
            const tabs = await chrome.tabs.query({ url: '*://localhost/*' }); // or your production domain
            let userId = null;
            let token = null;

            // Simple heuristic to get context
            // In a real app, this would be more robust
            if (tabs.length > 0) {
                const session = await chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => {
                        const s = localStorage.getItem('sb-eataxltmttphievpmwqf-auth-token');
                        return s ? JSON.parse(s) : null;
                    }
                });

                if (session && session[0].result) {
                    userId = session[0].result.user.id;
                    token = session[0].result.access_token;
                }
            }

            if (!userId) {
                alert('Please log in to your NodLync dashboard first.');
                sendBtn.textContent = 'Send to NodLync';
                sendBtn.disabled = false;
                return;
            }

            // POST to Supabase table directly via REST API
            const supabaseUrl = 'https://eataxltmttphievpmwqf.supabase.co';
            const response = await fetch(`${supabaseUrl}/rest/v1/captured_requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhdGF4bHRtdHRwaGlldnBtd3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODE2NjMsImV4cCI6MjA4OTA1NzY2M30.ouhBD89c0_WEPqo41JUKD79Dt4_EMA_28phhHtbLLAc',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    user_id: userId,
                    method: selectedRequestMeta.method,
                    url: selectedRequestMeta.url,
                    headers: selectedRequestMeta.headers,
                    body: selectedRequestMeta.body,
                    status: selectedRequestMeta.status
                })
            });

            if (response.ok) {
                sendBtn.textContent = 'Sent!';
                setTimeout(() => {
                    sendBtn.textContent = 'Send to NodLync';
                    sendBtn.disabled = false;
                }, 2000);
            } else {
                throw new Error('Failed to send');
            }
        } catch (error) {
            console.error(error);
            alert('Error sending request to NodLync.');
            sendBtn.textContent = 'Send to NodLync';
            sendBtn.disabled = false;
        }
    });

    function renderRequests(requests) {
        if (!requests || requests.length === 0) {
            noData.style.display = 'block';
            requestList.style.display = 'none';
            return;
        }

        noData.style.display = 'none';
        requestList.style.display = 'block';
        requestList.innerHTML = '';

        requests.forEach((req, idx) => {
            const li = document.createElement('li');
            li.className = 'request-item';
            li.innerHTML = `
                <div class="request-top">
                    <span class="method badge-method">${req.method}</span>
                    <span class="status ${req.status >= 400 ? 'error' : ''}">${req.status || '---'}</span>
                </div>
                <div class="url" title="${req.url}">${req.url}</div>
                <div class="meta" style="font-size: 9px; color: var(--text-muted); opacity: 0.8; margin-top: 2px;">
                    <span>${req.domain || 'domain.com'}</span>
                </div>
            `;

            li.addEventListener('click', () => {
                document.querySelectorAll('.request-item').forEach(i => i.classList.remove('selected'));
                li.classList.add('selected');
                selectedRequestMeta = req;
                sendBtn.disabled = false;
                sendBtn.title = 'Send selected request to NodLync';
            });

            requestList.appendChild(li);
        });
    }

    // Listen for storage changes from background script
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.capturedRequests) {
            renderRequests(changes.capturedRequests.newValue);
        }
    });
});
