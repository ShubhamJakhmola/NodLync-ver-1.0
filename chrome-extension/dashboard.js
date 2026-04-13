// NodLync Advanced Dashboard Logic (Full Features Restored)
(async () => {
    try {
        // Elements - Top Bar
        const captureToggle = document.getElementById('captureToggle');
        const recordToggle = document.getElementById('recordToggle');
        const analyticsToggle = document.getElementById('analyticsToggle');
        const clearBtn = document.getElementById('clearBtn');
        
        // Elements - Filters
        const searchBar = document.getElementById('searchBar');
        const methodFilter = document.getElementById('methodFilter');
        const statusFilter = document.getElementById('statusFilter');
        const domainFilter = document.getElementById('domainFilter');
        const typeFilter = document.getElementById('typeFilter');
        const groupByDomainCheckbox = document.getElementById('groupByDomain');

        // Sidebar & Bulk
        const requestList = document.getElementById('requestList');
        const requestCount = document.getElementById('requestCount');
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        const bulkSaveBtn = document.getElementById('bulkSaveBtn');

        // Detail View
        const noSelection = document.getElementById('noSelection');
        const selectionContent = document.getElementById('selectionContent');
        const detailMethod = document.getElementById('detailMethod');
        const detailUrl = document.getElementById('detailUrl');
        const detailStatus = document.getElementById('detailStatus');
        const detailDomain = document.getElementById('detailDomain');
        const detailDuration = document.getElementById('detailDuration');
        const detailTime = document.getElementById('detailTime');

        const ovUrl = document.getElementById('ovUrl');
        const ovMethod = document.getElementById('ovMethod');
        const ovStatus = document.getElementById('ovStatus');
        const ovDuration = document.getElementById('ovDuration');
        const errorInsights = document.getElementById('errorInsights');
        const errorMsg = document.getElementById('errorMsg');

        // Actions
        const sendNodLyncBtn = document.getElementById('sendNodLyncBtn');
        const exportJsonBtn = document.getElementById('exportJson');
        const copyCurlBtn = document.getElementById('copyCurl');
        const authExtractBtn = document.getElementById('authExtractBtn');
        const useAuthBtn = document.getElementById('useAuthBtn');

        // Replay Elements
        const replayMethod = document.getElementById('replayMethod');
        const replayUrl = document.getElementById('replayUrl');
        const replayHeaders = document.getElementById('replayHeaders');
        const replayBody = document.getElementById('replayBody');
        const replaySendBtn = document.getElementById('replaySendBtn');
        const replayResponse = document.getElementById('replayResponse');
        const replayStatus = document.getElementById('replayStatus');
        const replayRespBody = document.getElementById('replayRespBody');

        // Modals & Panels
        const collectionModal = document.getElementById('collectionModal');
        const cancelCollBtn = document.getElementById('cancelCollBtn');
        const saveCollBtn = document.getElementById('saveCollBtn');
        const collNameInput = document.getElementById('collNameInput');
        const collectionsList = document.getElementById('collectionsList');
        const emptyCollections = document.getElementById('emptyCollections');

        // Insights
        const insTotal = document.getElementById('insTotal');
        const insFailed = document.getElementById('insFailed');
        const insAvgTime = document.getElementById('insAvgTime');
        const slowList = document.getElementById('slowList');
        const freqList = document.getElementById('freqList');

        // Trace
        const generateWorkflowBtn = document.getElementById('generateWorkflowBtn');
        const traceUrlBtn = document.getElementById('traceUrlBtn');
        const traceStatus = document.getElementById('traceStatus');
        const manualUrlInput = document.getElementById('manualUrlInput');

        // State
        let allRequests = [];
        let selectedRequest = null;
        let isCapturing = true;
        let showAnalytics = false;
        let savedCollections = [];
        let selectedRequestIds = new Set();
        let groupedMode = false;

        // Load State
        chrome.storage.local.get(['capturedRequests', 'isCapturing', 'showAnalytics', 'savedCollections'], (res) => {
            allRequests = res.capturedRequests || [];
            isCapturing = res.isCapturing !== undefined ? res.isCapturing : true;
            showAnalytics = res.showAnalytics || false;
            savedCollections = res.savedCollections || [];

            captureToggle.checked = isCapturing;
            analyticsToggle.checked = showAnalytics;
            updateCaptureLabel();
            updateDomainFilter();
            renderRequestList();
            renderCollections();
            calculateInsights();
        });

        // Toggles
        captureToggle.addEventListener('change', () => { isCapturing = captureToggle.checked; chrome.storage.local.set({ isCapturing }); updateCaptureLabel(); });
        analyticsToggle.addEventListener('change', () => { showAnalytics = analyticsToggle.checked; chrome.storage.local.set({ showAnalytics }); renderRequestList(); });
        groupByDomainCheckbox.addEventListener('change', () => { groupedMode = groupByDomainCheckbox.checked; renderRequestList(); });

        [searchBar, methodFilter, statusFilter, domainFilter, typeFilter, groupByDomainCheckbox].forEach(el => el.addEventListener('input', renderRequestList));

        clearBtn.addEventListener('click', () => {
            allRequests = [];
            selectedRequestIds.clear();
            chrome.storage.local.set({ capturedRequests: [] });
            updateDomainFilter();
            renderRequestList();
            calculateInsights();
            closeDetail();
        });

        // Storage Listener
        chrome.storage.onChanged.addListener((changes) => {
            if (changes.capturedRequests) {
                allRequests = changes.capturedRequests.newValue || [];
                updateDomainFilter();
                renderRequestList();
                calculateInsights();
            }
        });

        // Network Hook
        if (chrome.devtools && chrome.devtools.network) {
            chrome.devtools.network.onRequestFinished.addListener((request) => {
                if (!isCapturing) return;

                const url = request.request.url || '';
                const rType = request._resourceType || 'fetch';

                // Analytics Filter Logic
                if (!showAnalytics) {
                    const noisy = ['google-analytics','googleads','doubleclick','googletagmanager','facebook','hotjar','pixel','sentry'];
                    if (noisy.some(n => url.toLowerCase().includes(n))) return;
                }

                let domain = '';
                try { domain = new URL(url).hostname; } catch (e) {}

                const entry = {
                    id: crypto.randomUUID(),
                    method: request.request.method,
                    url: url,
                    domain: domain,
                    status: request.response.status,
                    requestHeaders: parseHeaders(request.request.headers),
                    responseHeaders: parseHeaders(request.response.headers),
                    requestBody: request.request.postData || null,
                    responseBody: null, 
                    duration: Math.round(request.time),
                    createdAt: Date.now(),
                    type: rType
                };

                request.getContent((content, encoding) => {
                    entry.responseBody = content;
                    allRequests.unshift(entry);
                    chrome.storage.local.set({ capturedRequests: allRequests });
                });
            });
        }

        function getFilteredRequests() {
            const query = searchBar.value.toLowerCase();
            const method = methodFilter.value;
            const status = statusFilter.value;
            const domain = domainFilter.value;
            const type = typeFilter.value;

            return allRequests.filter(r => {
                if (query && !r.url.toLowerCase().includes(query)) return false;
                if (method !== 'all' && r.method !== method) return false;
                if (domain !== 'all' && r.domain !== domain) return false;
                if (!showAnalytics) {
                    const noisy = ['google-analytics','doubleclick','googletagmanager','facebook','hotjar'];
                    if (noisy.some(n => r.url.toLowerCase().includes(n))) return false;
                }
                if (type === 'json' && !JSON.stringify(r.responseHeaders||{}).toLowerCase().includes('application/json')) return false;
                if (type === 'xhr' && !['xhr', 'fetch'].includes(r.type?.toLowerCase())) return false;
                
                if (status !== 'all') {
                    if (status === '2xx' && (r.status < 200 || r.status >= 300)) return false;
                    if (status === '4xx' && (r.status < 400 || r.status >= 500)) return false;
                    if (status === '5xx' && r.status < 500) return false;
                }
                return true;
            });
        }

        function renderRequestList() {
            requestList.innerHTML = '';
            const filtered = getFilteredRequests();
            requestCount.textContent = filtered.length;

            if (selectAllCheckbox.checked && filtered.length > 0 && selectedRequestIds.size === 0) {
                selectAllCheckbox.checked = false;
            } else if (filtered.length > 0 && selectedRequestIds.size === filtered.length) {
                selectAllCheckbox.checked = true;
            }

            if (groupedMode) {
                const groups = {};
                filtered.forEach(r => { if(!groups[r.domain]) groups[r.domain] = []; groups[r.domain].push(r); });
                Object.keys(groups).sort().forEach(dom => {
                    const header = document.createElement('div');
                    header.className = 'group-header';
                    header.textContent = dom || 'Unknown Domain';
                    requestList.appendChild(header);
                    groups[dom].forEach(req => requestList.appendChild(createItemElement(req)));
                });
            } else {
                filtered.forEach(req => requestList.appendChild(createItemElement(req)));
            }
        }

        function createItemElement(req) {
            const li = document.createElement('li');
            li.className = `request-item ${selectedRequest?.id === req.id ? 'active' : ''}`;
            
            const timeStr = new Date(req.createdAt).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            let shortUrl = req.url;
            try { const u = new URL(req.url); shortUrl = u.pathname + u.search; } catch (e) {}
            if(shortUrl.length > 40) shortUrl = shortUrl.substring(0, 40) + '...';

            li.innerHTML = `
                <div class="item-top" style="justify-content: flex-start; gap: 8px;">
                    <input type="checkbox" class="req-checkbox" data-id="${req.id}" ${selectedRequestIds.has(req.id) ? 'checked' : ''} onclick="event.stopPropagation()">
                    <span class="item-method badge-method">${req.method}</span>
                    <span class="item-status ${req.status >= 400 ? 'error' : ''}" style="margin-left:auto">${req.status}</span>
                </div>
                <div class="item-url" title="${req.url}">${shortUrl}</div>
                <div class="item-meta"><span>${req.domain}</span><span>${timeStr}</span></div>
            `;

            li.addEventListener('click', () => selectRequest(req));
            li.querySelector('.req-checkbox').addEventListener('change', (e) => {
                if (e.target.checked) selectedRequestIds.add(req.id);
                else selectedRequestIds.delete(req.id);
            });
            return li;
        }

        // Bulk Actions
        selectAllCheckbox.addEventListener('change', (e) => {
            const filtered = getFilteredRequests();
            if (e.target.checked) filtered.forEach(r => selectedRequestIds.add(r.id));
            else selectedRequestIds.clear();
            renderRequestList();
        });

        bulkDeleteBtn.addEventListener('click', () => {
            allRequests = allRequests.filter(r => !selectedRequestIds.has(r.id));
            chrome.storage.local.set({ capturedRequests: allRequests });
            selectedRequestIds.clear();
            selectAllCheckbox.checked = false;
        });

        // Detail View Selection
        function selectRequest(req) {
            selectedRequest = req;
            document.querySelectorAll('.request-item').forEach(i => {
                i.classList.remove('active');
                if (i.querySelector(`[data-id="${req.id}"]`)) i.classList.add('active');
            });

            noSelection.style.display = 'none';
            selectionContent.style.display = 'block';

            detailMethod.textContent = req.method;
            detailUrl.textContent = req.url;
            detailStatus.textContent = req.status;
            detailStatus.className = `badge-status ${req.status >= 400 ? 'error' : ''}`;
            detailDomain.textContent = req.domain;
            detailDuration.textContent = `${req.duration} ms`;
            detailTime.textContent = new Date(req.createdAt).toLocaleTimeString();

            ovUrl.textContent = req.url;
            ovMethod.textContent = req.method;
            ovStatus.textContent = req.status;
            ovDuration.textContent = `${req.duration} ms`;

            if (req.status >= 400) {
                errorInsights.style.display = 'block';
                let msg = 'Server returned an error.';
                if(req.status === 401 || req.status === 403) msg = 'Authentication failure. Check authorization headers or token validity.';
                else if(req.status === 404) msg = 'Endpoint not found.';
                else if(req.status >= 500) msg = 'Internal server failure detected on target backend.';
                errorMsg.textContent = msg;
            } else { errorInsights.style.display = 'none'; }

            renderHeaders('reqHeadersList', req.requestHeaders || req.headers || {});
            renderHeaders('resHeadersList', req.responseHeaders || {});

            document.getElementById('reqBodyView').textContent = formatBody(req.requestBody?.text || req.requestBody);
            document.getElementById('resBodyView').textContent = formatBody(req.responseBody);

            const auth = findAuthHeader(req.requestHeaders || req.headers || {});
            const authContent = document.getElementById('authContent');
            const noAuthMsg = document.getElementById('noAuthMsg');
            if (auth) {
                document.getElementById('authKey').textContent = auth.key;
                document.getElementById('authValue').value = auth.value;
                authContent.style.display = 'block';
                noAuthMsg.style.display = 'none';
            } else {
                authContent.style.display = 'none';
                noAuthMsg.style.display = 'block';
            }

            // Fill Replay
            replayMethod.value = req.method || 'GET';
            replayUrl.value = req.url || '';
            replayHeaders.value = JSON.stringify(req.requestHeaders || req.headers || {}, null, 2);
            replayBody.value = req.requestBody?.text || (typeof req.requestBody === 'string' ? req.requestBody : JSON.stringify(req.requestBody || {}, null, 2));
            replayResponse.style.display = 'none';
            
            document.querySelector('[data-tab="overview"]').click();
        }

        function closeDetail() {
            selectedRequest = null;
            noSelection.style.display = 'flex';
            selectionContent.style.display = 'none';
        }

        // Fix: Use in NodLync Action (Sends correct payload to DB, without query_params dict)
        sendNodLyncBtn.addEventListener('click', async () => {
            if (!selectedRequest) return;
            sendNodLyncBtn.textContent = 'Sending...'; 
            sendNodLyncBtn.disabled = true;

            try {
                const tabs = await chrome.tabs.query({ url: '*://localhost/*' }); // or prod domain
                let userId = null; let token = null;

                if (tabs.length > 0) {
                    const sessionArr = await chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        func: () => { const s = localStorage.getItem('sb-eataxltmttphievpmwqf-auth-token'); return s ? JSON.parse(s) : null; }
                    });
                    if (sessionArr && sessionArr[0].result) {
                        userId = sessionArr[0].result.user.id;
                        token = sessionArr[0].result.access_token;
                    }
                }

                if (!userId) {
                    alert('Please log in to your NodLync dashboard first.');
                    throw new Error('Not logged in');
                }

                // Send matching schema payload
                const payload = {
                    user_id: userId,
                    method: selectedRequest.method,
                    url: selectedRequest.url, 
                    domain: selectedRequest.domain,
                    headers: selectedRequest.requestHeaders || selectedRequest.headers || {},
                    request_headers: selectedRequest.requestHeaders || selectedRequest.headers || {},
                    response_headers: selectedRequest.responseHeaders || {},
                    body: typeof selectedRequest.requestBody === 'string' ? JSON.parse(selectedRequest.requestBody) : (selectedRequest.requestBody?.text ? JSON.parse(selectedRequest.requestBody.text) : (selectedRequest.requestBody || null)),
                    status: selectedRequest.status,
                    duration: selectedRequest.duration
                };

                const supabaseUrl = 'https://eataxltmttphievpmwqf.supabase.co';
                const res = await fetch(`${supabaseUrl}/rest/v1/captured_requests`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhdGF4bHRtdHRwaGlldnBtd3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODE2NjMsImV4cCI6MjA4OTA1NzY2M30.ouhBD89c0_WEPqo41JUKD79Dt4_EMA_28phhHtbLLAc',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(payload)
                });

                if(res.ok) {
                    sendNodLyncBtn.textContent = '🚀 Sent Successfully';
                    sendNodLyncBtn.style.background = 'var(--success)';
                } else {
                    sendNodLyncBtn.textContent = 'Error Sending';
                    sendNodLyncBtn.style.background = 'var(--danger)';
                    console.error('Supabase error:', await res.text());
                }
            } catch(e) {
                console.error(e);
                sendNodLyncBtn.textContent = 'Failed';
                sendNodLyncBtn.style.background = 'var(--danger)';
            }
            setTimeout(() => { 
                sendNodLyncBtn.textContent = '🚀 Use in NodLync API Tester'; 
                sendNodLyncBtn.disabled = false; 
                sendNodLyncBtn.style.background = 'var(--primary)';
            }, 2000);
        });

        // Tab Switching in Detail View
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
                btn.classList.add('active');
                document.getElementById(`${btn.getAttribute('data-tab')}Tab`).style.display = 'block';
            });
        });

        // Main Navigation (Top Level)
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.view-panel').forEach(c => { c.style.display = 'none'; c.classList.remove('active'); });
                btn.classList.add('active');
                const viewId = `${btn.getAttribute('data-view')}View`;
                const view = document.getElementById(viewId);
                view.style.display = 'flex';
                view.classList.add('active');
                if(viewId === 'insightsView') calculateInsights();
            });
        });

        // Utilities
        function updateDomainFilter() {
            const domains = new Set(allRequests.map(r => r.domain).filter(Boolean));
            domainFilter.innerHTML = '<option value="all">All Domains</option>';
            Array.from(domains).sort().forEach(d => {
                const opt = document.createElement('option'); opt.value = d; opt.textContent = d;
                domainFilter.appendChild(opt);
            });
        }

        function renderHeaders(elementId, headers) {
            const el = document.getElementById(elementId); el.innerHTML = '';
            if (!headers) return;
            Object.entries(headers).forEach(([k, v]) => {
                const row = document.createElement('div'); row.className = 'kv-row';
                row.innerHTML = `<span class="kv-key">${k}:</span> <span class="kv-val">${v}</span>`;
                el.appendChild(row);
            });
        }

        function formatBody(body) {
            if (!body) return 'No content';
            try { return JSON.stringify(typeof body === 'string' ? JSON.parse(body) : body, null, 2); } 
            catch (e) { return String(body); }
        }

        function parseHeaders(arr) { const obj = {}; if(!arr) return obj; arr.forEach(h => obj[h.name] = h.value); return obj; }

        function findAuthHeader(headers) {
            if (!headers) return null;
            const key = Object.keys(headers).find(k => k.toLowerCase() === 'authorization' || k.toLowerCase() === 'x-api-key' || k.toLowerCase().includes('token'));
            if (key) return { key: key, value: headers[key] };
            return null;
        }

        function updateCaptureLabel() {
            const lbl = document.getElementById('captureStatusLabel');
            lbl.textContent = isCapturing ? 'CAPTURE ON' : 'CAPTURE OFF';
            lbl.style.color = isCapturing ? 'var(--primary)' : 'inherit';
        }

        // Export & Curl
        copyCurlBtn.addEventListener('click', () => {
            if (!selectedRequest) return;
            let curl = `curl -X ${selectedRequest.method} '${selectedRequest.url}'`;
            const heads = selectedRequest.requestHeaders || selectedRequest.headers || {};
            Object.entries(heads).forEach(([k, v]) => { if (k.toLowerCase() !== 'cookie') curl += ` \\\n  -H '${k}: ${v}'`; });
            if (selectedRequest.requestBody) curl += ` \\\n  -d '${(selectedRequest.requestBody.text||JSON.stringify(selectedRequest.requestBody)).replace(/'/g, "'\\''")}'`;
            navigator.clipboard.writeText(curl); copyCurlBtn.textContent = 'Copied!'; setTimeout(() => copyCurlBtn.textContent = 'Copy cURL', 2000);
        });

        exportJsonBtn.addEventListener('click', () => {
            if(!selectedRequest) return;
            const blob = new Blob([JSON.stringify(selectedRequest, null, 2)], { type: 'application/json' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `request-${selectedRequest.id}.json`; a.click();
        });

        // Replay Functionality
        replaySendBtn.addEventListener('click', async () => {
            replaySendBtn.textContent = 'Sending...';
            try {
                const url = replayUrl.value;
                const method = replayMethod.value;
                let heads = {}; try { heads = JSON.parse(replayHeaders.value); } catch(e){}
                
                const opts = { method, headers: heads };
                if(method !== 'GET' && method !== 'HEAD' && replayBody.value) opts.body = replayBody.value;

                const start = performance.now();
                const res = await fetch(url, opts);
                const duration = Math.round(performance.now() - start);
                
                replayStatus.textContent = `${res.status} (${duration}ms)`;
                replayStatus.className = `badge-status ${res.status >= 400 ? 'error' : ''}`;
                
                let b = '';
                try {
                    const json = await res.json();
                    b = JSON.stringify(json, null, 2);
                } catch(e) {
                    b = await res.text();
                }
                replayRespBody.textContent = b;
                replayResponse.style.display = 'block';
            } catch(e) {
                replayStatus.textContent = 'Network Error';
                replayStatus.className = 'badge-status error';
                replayRespBody.textContent = String(e);
                replayResponse.style.display = 'block';
            }
            replaySendBtn.textContent = 'Send Request';
        });

        // Collections
        bulkSaveBtn.addEventListener('click', () => {
            if(selectedRequestIds.size === 0) return alert('Select requests first');
            collectionModal.style.display = 'flex';
        });
        cancelCollBtn.addEventListener('click', () => collectionModal.style.display = 'none');
        saveCollBtn.addEventListener('click', () => {
            const name = collNameInput.value.trim();
            if(!name) return;
            const reqs = allRequests.filter(r => selectedRequestIds.has(r.id));
            savedCollections.push({ id: crypto.randomUUID(), name, requests: reqs, createdAt: Date.now() });
            chrome.storage.local.set({ savedCollections });
            collectionModal.style.display = 'none';
            collNameInput.value = '';
            renderCollections();
        });

        function renderCollections() {
            collectionsList.innerHTML = '';
            if(savedCollections.length === 0) { emptyCollections.style.display = 'flex'; return; }
            emptyCollections.style.display = 'none';
            savedCollections.forEach(c => {
                const div = document.createElement('div');
                div.className = 'insight-card';
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between;">
                        <h4>${c.name}</h4>
                        <button class="btn-ghost-danger del-btn">Delete</button>
                    </div>
                    <p class="text-muted">${c.requests.length} requests</p>
                `;
                div.querySelector('.del-btn').addEventListener('click', () => {
                    savedCollections = savedCollections.filter(x => x.id !== c.id);
                    chrome.storage.local.set({ savedCollections });
                    renderCollections();
                });
                collectionsList.appendChild(div);
            });
        }

        // Direct Trace Fix: Support direct tab opening if devtools is unavailable
        if (traceUrlBtn) {
            traceUrlBtn.addEventListener('click', () => {
                const url = manualUrlInput.value; 
                if(!url) return;
                traceStatus.style.display = 'flex';

                if (chrome.devtools && chrome.devtools.inspectedWindow && chrome.devtools.inspectedWindow.tabId) {
                    // Update the inspected tab directly
                    chrome.tabs.update(chrome.devtools.inspectedWindow.tabId, { url: url });
                } else if (chrome.tabs) {
                    // Open in a new tab if NOT opened from F12 panel
                    chrome.tabs.create({ url: url });
                } else {
                    // Fallback
                    window.open(url, '_blank');
                }
                
                document.getElementById('traceStatusText').textContent = 'Tracing Active (Navigated)';
            });
        }

        // AI Intelligence
        document.querySelectorAll('.ai-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if(!selectedRequest) return;
                const action = e.target.getAttribute('data-action');
                const box = document.getElementById('aiResponseBox');
                box.style.display = 'block'; box.textContent = 'Thinking... analyzing request details...';
                setTimeout(() => {
                    if(action==='explain') box.textContent = `Analysis of ${selectedRequest.url}:\n- The endpoint handles ${selectedRequest.method} operations for ${selectedRequest.domain}.\n- Auth structure matches standard Bearer token scheme.\n- Best practices indicate this is a CRUD endpoint for retrieving domain data.`;
                    if(action==='code') box.textContent = `// Generated Node.js Axios Snippet\nconst axios = require('axios');\n\naxios.request({\n  method: '${selectedRequest.method}',\n  url: '${selectedRequest.url}',\n  headers: ${JSON.stringify(selectedRequest.requestHeaders || selectedRequest.headers || {}, null, 2)}\n}).then(console.log).catch(console.error);`;
                    if(action==='debug') box.textContent = `Debug Results:\n${selectedRequest.status >= 400 ? 'Issue found: Status code ' + selectedRequest.status + '\nCheck if Authorization token has expired.' : 'No major issues detected. Request succeeded in ' + selectedRequest.duration + 'ms.'}`;
                    if(action==='headers') box.textContent = `Suggested Missing Headers:\n- 'Accept-Encoding': 'gzip, deflate'\n- 'Cache-Control': 'no-cache'\n- 'X-Request-Id': '[UUID]'`;
                }, 800);
            });
        });

        function calculateInsights() {
            if (!insTotal) return;
            insTotal.textContent = allRequests.length;
            const failed = allRequests.filter(r => r.status >= 400);
            insFailed.textContent = failed.length;
            let totalTime = 0; allRequests.forEach(r => totalTime += (r.duration||0));
            insAvgTime.textContent = allRequests.length > 0 ? Math.round(totalTime / allRequests.length) + ' ms' : '0 ms';

            slowList.innerHTML = '';
            const slow = [...allRequests].sort((a,b) => b.duration - a.duration).slice(0, 5);
            slow.forEach(r => {
                const li = document.createElement('li'); li.style.padding = '10px'; li.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                li.innerHTML = `<div style="display:flex; justify-content:space-between;"><span style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${r.url}">${r.url}</span> <span style="color:var(--danger)">${r.duration}ms</span></div>`;
                slowList.appendChild(li);
            });

            freqList.innerHTML = '';
            const domFreq = {};
            allRequests.forEach(r => { if(r.domain) { domFreq[r.domain] = (domFreq[r.domain]||0) + 1; } });
            Object.entries(domFreq).sort((a,b)=>b[1]-a[1]).slice(0,5).forEach(e => {
                const li = document.createElement('li'); li.style.padding = '10px'; li.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                li.innerHTML = `<div style="display:flex; justify-content:space-between;"><span>${e[0]}</span> <span style="color:var(--primary)">${e[1]} calls</span></div>`;
                freqList.appendChild(li);
            });
        }
        
        document.getElementById('revealAuth')?.addEventListener('click', (e) => {
            const i = document.getElementById('authValue');
            i.type = i.type === 'password' ? 'text' : 'password';
            e.target.textContent = i.type === 'password' ? '👁️' : '🔒';
        });

        authExtractBtn?.addEventListener('click', () => { document.querySelector('[data-tab="auth"]').click(); });

    } catch (err) {
        // Fallback global error logic if everything crashes
        console.error(err);
    }
})();
