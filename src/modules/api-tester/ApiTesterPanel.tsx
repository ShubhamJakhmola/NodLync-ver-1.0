import { useEffect, useMemo, useState } from "react";
import ApiExplorerPanel from "./ApiExplorerPanel";
import { supabase } from "../../api/supabaseClient";
import useAppStore from "../../store/useAppStore";
import { logAppEvent } from "../../utils/appLogger";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type KeyValueRow = {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
};

type AuthMode = "none" | "bearer";
type ApiTesterMainTab = "tester" | "explore" | "capture";

type SavedRequest = {
  method: HttpMethod;
  url: string;
  params: KeyValueRow[];
  headers: KeyValueRow[];
  authMode: AuthMode;
  bearerToken: string;
  body: string;
};

type SavedResponse = {
  status?: number;
  statusText?: string;
  durationMs?: number;
  headers?: Record<string, string>;
  bodyPreview?: string;
  errorMessage?: string;
};

type ApiHistoryItem = {
  id: string;
  name?: string;
  method: HttpMethod;
  url: string;
  domain?: string;
  headers: Record<string, string>;
  params?: Record<string, string>;
  body: any;
  response_preview?: string;
  status_code?: number;
  is_favorite: boolean;
  created_at: string;
};

type CapturedRequest = {
  id: string;
  method: string;
  url: string;
  domain?: string;
  headers: Record<string, string>;
  params?: Record<string, string>;
  body: any;
  response_body?: any;
  status: number;
  created_at: string;
};

const STORAGE_KEY_REQUEST = "nodlync.apiTester.lastRequest";
const STORAGE_KEY_RESPONSE = "nodlync.apiTester.lastResponse";

const emptyRow = (): KeyValueRow => ({
  id: crypto.randomUUID(),
  enabled: true,
  key: "",
  value: "",
});

const makeRow = (key: string, value: string, enabled = true): KeyValueRow => ({
  id: crypto.randomUUID(),
  enabled,
  key,
  value,
});

const normalizeUrlWithProtocol = (rawUrl: string) => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  const hasProtocol = /^https?:\/\//i.test(trimmed);
  return hasProtocol ? trimmed : `https://${trimmed}`;
};

const parseUrlParts = (fullUrl: string) => {
  try {
    const normalized = normalizeUrlWithProtocol(fullUrl);
    const urlObj = new URL(normalized);
    const baseUrl = `${urlObj.origin}${urlObj.pathname}`;
    const params: KeyValueRow[] = [];
    urlObj.searchParams.forEach((value, key) => {
      params.push(makeRow(key, value, true));
    });
    return { baseUrl, params: params.length ? params : [emptyRow()] };
  } catch {
    return { baseUrl: fullUrl, params: [emptyRow()] };
  }
};

const parseCurlCommand = (input: string) => {
  const cleanInput = input.replace(/\\\n/g, " ").trim();
  if (!cleanInput.toLowerCase().startsWith("curl")) return null;

  // Robust tokenization: split by spaces but preserve quoted strings
  const tokens: string[] = [];
  let currentToken = "";
  let inQuote = false;
  let quoteChar = "";

  for (let i = 0; i < cleanInput.length; i++) {
    const char = cleanInput[i];
    if ((char === '"' || char === "'") && (i === 0 || cleanInput[i - 1] !== "\\")) {
      if (inQuote && char === quoteChar) {
        inQuote = false;
      } else if (!inQuote) {
        inQuote = true;
        quoteChar = char;
      } else {
        currentToken += char;
      }
    } else if (char === " " && !inQuote) {
      if (currentToken) tokens.push(currentToken);
      currentToken = "";
    } else {
      currentToken += char;
    }
  }
  if (currentToken) tokens.push(currentToken);

  const result = {
    method: "GET" as HttpMethod,
    url: "",
    headers: [] as KeyValueRow[],
    body: "",
    authMode: "none" as AuthMode,
    bearerToken: "",
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const next = tokens[i + 1];

    if (t === "-X" || t === "--request") {
      if (next) {
        result.method = next.toUpperCase() as HttpMethod;
        i++;
      }
    } else if (t === "-H" || t === "--header") {
      if (next) {
        const colonIndex = next.indexOf(":");
        if (colonIndex !== -1) {
          const key = next.substring(0, colonIndex).trim();
          const value = next.substring(colonIndex + 1).trim();
          if (key.toLowerCase() === "authorization" && value.startsWith("Bearer ")) {
            result.authMode = "bearer";
            result.bearerToken = value.substring(7);
          } else {
            result.headers.push(makeRow(key, value));
          }
        }
        i++;
      }
    } else if (["-d", "--data", "--data-raw", "--data-binary"].includes(t)) {
      if (next) {
        result.body = next;
        if (result.method === "GET") result.method = "POST";
        i++;
      }
    } else if (t.includes(".") && !t.startsWith("-") && t.toLowerCase() !== "curl") {
      // Very simple URL detection
      if (!result.url) result.url = t;
    }
  }

  return result;
};

const KeyValueEditor = ({
  label,
  rows,
  setRows,
}: {
  label: string;
  rows: KeyValueRow[];
  setRows: (rows: KeyValueRow[]) => void;
}) => {
  const handleRowChange = (id: string, patch: Partial<KeyValueRow>) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const handleAddRow = () => setRows([...rows, emptyRow()]);
  const handleDeleteRow = (id: string) => {
    const next = rows.filter((row) => row.id !== id);
    setRows(next.length ? next : [emptyRow()]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-stroke pb-2">
        <h3 className="text-[10px] font-black text-fg-muted uppercase tracking-[0.2em]">{label}</h3>
        <button onClick={handleAddRow} className="text-[10px] text-primary hover:text-primary-hover font-bold transition-all">+ ADD NEW ROW</button>
      </div>
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
        {rows.length === 0 ? (
           <div className="p-10 text-center text-fg-muted italic text-[11px]">No data defined.</div>
        ) : rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2 group p-1 hover:bg-white/5 rounded-lg transition-all">
            <input type="checkbox" checked={row.enabled} onChange={(e) => handleRowChange(row.id, { enabled: e.target.checked })} className="rounded border-stroke bg-panel/50 h-3.5 w-3.5" />
            <input className="w-1/3 bg-panel border-0 rounded px-3 py-1.5 text-[11px] text-fg focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-sm" placeholder="Key" value={row.key} onChange={(e) => handleRowChange(row.id, { key: e.target.value })} />
            <input className="flex-1 bg-surface border-0 rounded px-3 py-1.5 text-[11px] text-fg focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-sm" placeholder="Value" value={row.value} onChange={(e) => handleRowChange(row.id, { value: e.target.value })} />
            <button onClick={() => handleDeleteRow(row.id)} className="p-1.5 text-fg-muted hover:text-rose-400 group-hover:opacity-100 transition-opacity">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const ApiTesterPanel = () => {
  const user = useAppStore((s) => s.user);
  const [mainTab, setMainTab] = useState<ApiTesterMainTab>("tester");

  // Log API tester view
  useEffect(() => {
    if (user) {
      void logAppEvent({
        type: "info",
        module: "api-tester",
        message: "Viewed API tester",
        meta: { tab: mainTab },
      });
    }
  }, [user, mainTab]);
  
  // Tester State
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("");
  const [params, setParams] = useState<KeyValueRow[]>([emptyRow()]);
  const [headers, setHeaders] = useState<KeyValueRow[]>([emptyRow()]);
  const [authMode, setAuthMode] = useState<AuthMode>("none");
  const [bearerToken, setBearerToken] = useState("");
  const [body, setBody] = useState("{\n  \n}");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SavedResponse | null>(null);
  const [testerTab, setTesterTab] = useState<"params" | "auth" | "headers" | "body">("params");
  const [useProxy, setUseProxy] = useState(false);
  
  // Lists State
  const [apiHistory, setApiHistory] = useState<ApiHistoryItem[]>([]);
  const [capturedRequests, setCapturedRequests] = useState<CapturedRequest[]>([]);
  
  // Capture Config
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [captureFilter, setCaptureFilter] = useState<"all" | "json">("all");
  const [selectedCaptureIds, setSelectedCaptureIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const rawReq = localStorage.getItem(STORAGE_KEY_REQUEST);
      if (rawReq) {
        const parsed: SavedRequest = JSON.parse(rawReq);
        setMethod(parsed.method); setUrl(parsed.url);
        setParams(parsed.params.length ? parsed.params : [emptyRow()]);
        setHeaders(parsed.headers.length ? parsed.headers : [emptyRow()]);
        setAuthMode(parsed.authMode); setBearerToken(parsed.bearerToken);
        setBody(parsed.body || "{\n  \n}");
      }
      const rawRes = localStorage.getItem(STORAGE_KEY_RESPONSE);
      if (rawRes) setResponse(JSON.parse(rawRes));
    } catch { }
  }, []);

  useEffect(() => {
    const payload: SavedRequest = { method, url, params, headers, authMode, bearerToken, body };
    localStorage.setItem(STORAGE_KEY_REQUEST, JSON.stringify(payload));
  }, [method, url, params, headers, authMode, bearerToken, body, mainTab === "tester"]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: history } = await supabase.from("api_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (history) setApiHistory(history as any);
      const { data: captured } = await supabase.from("captured_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
      if (captured) setCapturedRequests(captured as any);
    };
    fetchData();
    const ch = supabase.channel("realtime_reqs").on("postgres_changes", { event: "INSERT", schema: "public", table: "captured_requests", filter: `user_id=eq.${user.id}` }, (p: any) => {
      setCapturedRequests(prev => [p.new as CapturedRequest, ...prev].slice(0, 100));
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const requestUrlWithProtocol = useMemo(() => {
    if (!url.trim()) return "";
    try {
      const uObj = new URL(normalizeUrlWithProtocol(url));
      params.filter(p => p.enabled && p.key).forEach(p => uObj.searchParams.append(p.key, p.value));
      return uObj.toString();
    } catch { return normalizeUrlWithProtocol(url); }
  }, [url, params]);

  const generatedCurl = useMemo(() => {
    if (!url.trim()) return "";
    let c = `curl -X ${method} "${requestUrlWithProtocol}"`;
    headers.filter(h => h.enabled && h.key).forEach(h => {
      c += ` \\\n  -H "${h.key}: ${h.value}"`;
    });
    if (authMode === "bearer" && bearerToken.trim()) {
      c += ` \\\n  -H "Authorization: Bearer ${bearerToken.trim()}"`;
    }
    if (["POST", "PUT", "PATCH"].includes(method) && body.trim() && body !== "{\n  \n}") {
      try {
        const minified = JSON.stringify(JSON.parse(body));
        c += ` \\\n  -d '${minified.replace(/'/g, "'\\''")}'`;
      } catch {
        c += ` \\\n  -d '${body.replace(/'/g, "'\\''")}'`;
      }
    }
    return c;
  }, [method, requestUrlWithProtocol, headers, authMode, bearerToken, body]);

  const handleUrlChange = (value: string) => {
    const curlData = parseCurlCommand(value);
    if (curlData) {
      setMethod(curlData.method);
      const { baseUrl, params: p } = parseUrlParts(curlData.url);
      setUrl(baseUrl);
      setParams(p.length ? p : [emptyRow()]);
      setHeaders(curlData.headers.length ? curlData.headers : [emptyRow()]);
      setAuthMode(curlData.authMode);
      setBearerToken(curlData.bearerToken);
      if (curlData.body) {
        try {
          // Try to format if it's JSON
          const formatted = JSON.stringify(JSON.parse(curlData.body), null, 2);
          setBody(formatted);
        } catch {
          setBody(curlData.body);
        }
      }
      return;
    }
    setUrl(value);
  };

  const handleClearRequest = () => {
    setMethod("GET");
    setUrl("");
    setParams([emptyRow()]);
    setHeaders([emptyRow()]);
    setAuthMode("none");
    setBearerToken("");
    setBody("{\n  \n}");
    setResponse(null);
    localStorage.removeItem(STORAGE_KEY_REQUEST);
    localStorage.removeItem(STORAGE_KEY_RESPONSE);
  };

  const sendRequest = async () => {
    if (!url.trim() || loading) return;
    setLoading(true); setResponse(null);
    const start = performance.now();
    try {
      const hdrs: Record<string, string> = {};
      headers.filter(h => h.enabled && h.key).forEach(h => hdrs[h.key] = h.value);
      if (authMode === "bearer" && bearerToken.trim()) hdrs["Authorization"] = `Bearer ${bearerToken.trim()}`;
      if (["POST", "PUT", "PATCH"].includes(method) && !hdrs["Content-Type"]) hdrs["Content-Type"] = "application/json";

      const res = await fetch(useProxy ? `https://corsproxy.io/?${encodeURIComponent(requestUrlWithProtocol)}` : requestUrlWithProtocol, { method, headers: hdrs, body: ["POST", "PUT", "PATCH"].includes(method) ? body : undefined });
      const durationMs = performance.now() - start;
      const resH: Record<string, string> = {}; res.headers.forEach((v, k) => resH[k] = v);
      const txt = await res.text();
      let pretty = txt; try { pretty = JSON.stringify(JSON.parse(txt), null, 2); } catch { }
      const payload = { status: res.status, statusText: res.statusText, durationMs, headers: resH, bodyPreview: pretty };
      setResponse(payload);
      localStorage.setItem(STORAGE_KEY_RESPONSE, JSON.stringify(payload));
      if (user) {
        await supabase.from("api_history").insert({ user_id: user.id, method, url: requestUrlWithProtocol, headers: hdrs, body: body.trim() && body !== "{\n  \n}" ? JSON.parse(body) : null, status_code: res.status, response_preview: pretty.slice(0, 1000) });
        const { data: upHistory } = await supabase.from("api_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        if (upHistory) setApiHistory(upHistory as any);
      }
    } catch (err: any) {
      let msg = err.message;
      if (msg === "Failed to fetch") {
        msg = "CORS_ERROR / NETWORK_FAILURE: The browser was unable to complete the request. This usually means the remote server doesn't allow cross-origin requests from this domain or the endpoint is unreachable. Ensure the server includes 'Access-Control-Allow-Origin: *' (or your domain) in its headers.";
      }
      setResponse({ errorMessage: msg, durationMs: performance.now() - start });
    }
    finally { setLoading(false); }
  };

  const useImportedRequest = (req: any) => {
    setMethod(req.method as HttpMethod);
    const { baseUrl, params: p } = parseUrlParts(req.url);
    setUrl(baseUrl); setParams(p);
    const hdrs = req.headers ? Object.entries(req.headers).filter(([k]) => k.toLowerCase() !== "authorization").map(([k, v]) => makeRow(k, String(v))) : [emptyRow()];
    setHeaders(hdrs.length ? hdrs : [emptyRow()]);
    const auth = req.headers ? Object.entries(req.headers).find(([k]) => k.toLowerCase() === "authorization") : null;
    if (auth && String(auth[1]).startsWith("Bearer ")) {
       setAuthMode("bearer"); setBearerToken(String(auth[1]).substring(7));
    } else { setAuthMode("none"); setBearerToken(""); }
    setBody(typeof req.body === "object" ? JSON.stringify(req.body, null, 2) : String(req.body || "{\n  \n}"));
    setMainTab("tester");
  };

  const filteredCaptures = useMemo(() => {
    return capturedRequests.filter(r => {
      const isAnalytics = ["google-analytics", "doubleclick", "googletagmanager", "facebook", "hotjar"].some(n => r.url.includes(n));
      if (!showAnalytics && isAnalytics) return false;
      if (captureFilter === "json") return JSON.stringify(r.headers).toLowerCase().includes("application/json");
      return true;
    });
  }, [capturedRequests, showAnalytics, captureFilter]);

  const deleteCaptured = async () => {
    if (selectedCaptureIds.length === 0) return;
    await supabase.from("captured_requests").delete().in("id", selectedCaptureIds);
    setCapturedRequests(prev => prev.filter(r => !selectedCaptureIds.includes(r.id)));
    setSelectedCaptureIds([]);
  };

  const clearCaptured = async () => {
    if (user) await supabase.from("captured_requests").delete().eq("user_id", user.id);
    setCapturedRequests([]);
  };

  const handleClearHistory = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to permanently clear all API transaction logs?")) return;
    await supabase.from("api_history").delete().eq("user_id", user.id);
    setApiHistory([]);
  };

  const handleExportHistory = () => {
    if (apiHistory.length === 0) return;
    let content = "NODLYNC API TESTER HISTORY (cURL EXPORT)\n";
    content += `Generated: ${new Date().toLocaleString()}\n`;
    content += "=".repeat(60) + "\n\n";

    apiHistory.forEach((item, idx) => {
      let curl = `curl -X ${item.method} "${item.url}"`;
      if (item.headers) {
        Object.entries(item.headers).forEach(([k, v]) => {
          curl += ` \\\n  -H "${k}: ${v}"`;
        });
      }
      if (item.body) {
        const b = typeof item.body === 'string' ? item.body : JSON.stringify(item.body);
        if (b && b !== '{}' && b !== '"{}"') {
           curl += ` \\\n  -d '${b.replace(/'/g, "'\\''")}'`;
        }
      }

      content += `ENTRY #${apiHistory.length - idx} [${new Date(item.created_at).toLocaleTimeString()}]\n`;
      content += `${curl}\n`;
      content += "-".repeat(40) + "\n\n";
    });

    const blob = new Blob([content], { type: "text/plain" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = `nodlync_curl_logs_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(u);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] space-y-4">
      {/* Primary Module Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex bg-panel/70 border border-stroke rounded-xl overflow-hidden p-1 gap-1 shadow-lg">
          {(["tester", "explore", "capture"] as const).map(tab => (
            <button key={tab} onClick={() => setMainTab(tab)} className={`px-6 py-2.5 text-xs font-black rounded-lg transition-all uppercase tracking-widest ${mainTab === tab ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-fg-muted hover:text-fg hover:bg-white/5"}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-[10px] font-black tracking-widest text-fg-muted">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> NETWORK ACTIVE</span>
            <span className="opacity-20">|</span>
            <span className="uppercase">{new Date().toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {mainTab === "explore" ? (
          <div className="h-full glass-panel overflow-y-auto custom-scrollbar p-1 border-stroke/50">
            <ApiExplorerPanel />
          </div>
        ) : mainTab === "capture" ? (
          <div className="h-full flex flex-col space-y-4">
            <div className="glass-panel flex-1 flex flex-col overflow-hidden p-6 border-stroke/50 bg-panel/20">
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                     <label className="flex items-center gap-2 text-xs font-black text-fg-muted cursor-pointer hover:text-fg transition-colors">
                        <input type="checkbox" checked={showAnalytics} onChange={e => setShowAnalytics(e.target.checked)} className="rounded border-stroke bg-panel" />
                        ANALYTICS TRAFFIC
                     </label>
                     <select value={captureFilter} onChange={e => setCaptureFilter(e.target.value as any)} className="bg-panel border border-stroke rounded-xl px-4 py-2 text-[10px] font-black uppercase text-primary outline-none focus:ring-1 focus:ring-primary">
                        <option value="all">ALL TRAFFIC</option>
                        <option value="json">JSON SAMPLES</option>
                     </select>
                  </div>
                  <div className="flex gap-3">
                     {selectedCaptureIds.length > 0 && (
                        <button onClick={deleteCaptured} className="px-4 py-2 bg-rose-500/10 text-rose-400 text-[10px] font-black rounded-xl border border-rose-500/20 hover:bg-rose-500/20 transition-all uppercase tracking-widest">
                          Delete ({selectedCaptureIds.length})
                        </button>
                     )}
                     <button onClick={clearCaptured} className="px-4 py-2 bg-panel border border-stroke text-[10px] font-black text-fg-muted rounded-xl hover:bg-white/5 transition-all uppercase tracking-widest">
                       Purge Activity
                     </button>
                  </div>
               </div>
               <div className="flex-1 overflow-auto border border-stroke/30 rounded-2xl bg-black/20 shadow-inner">
                  <table className="w-full text-left text-[11px] font-mono border-separate border-spacing-0">
                    <thead className="sticky top-0 bg-[#0f172a] border-b border-stroke text-[9px] font-black uppercase text-fg-muted tracking-[0.2em] z-10 shadow-md">
                        <tr>
                            <th className="px-6 py-4 w-12 text-center"><input type="checkbox" checked={selectedCaptureIds.length > 0 && selectedCaptureIds.length === filteredCaptures.length} onChange={() => setSelectedCaptureIds(selectedCaptureIds.length === filteredCaptures.length ? [] : filteredCaptures.map(r => r.id))} className="rounded bg-panel border-stroke" /></th>
                            <th className="px-6 py-4 w-24">Method</th>
                            <th className="px-6 py-4">Endpoint</th>
                            <th className="px-6 py-4 w-32">Hostname</th>
                            <th className="px-6 py-4 w-20">Status</th>
                            <th className="px-6 py-4 text-right pr-8">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stroke/10">
                        {filteredCaptures.length === 0 ? (
                           <tr><td colSpan={6} className="px-6 py-32 text-center italic text-fg-muted uppercase tracking-[0.2em] opacity-30 text-xs">Waiting for incoming traffic hooks...</td></tr>
                        ) : filteredCaptures.map(req => (
                           <tr key={req.id} className={`hover:bg-primary/5 transition-colors group ${selectedCaptureIds.includes(req.id) ? 'bg-primary/10' : ''}`}>
                               <td className="px-6 py-4 text-center"><input type="checkbox" checked={selectedCaptureIds.includes(req.id)} onChange={() => setSelectedCaptureIds(prev => prev.includes(req.id) ? prev.filter(i => i !== req.id) : [...prev, req.id])} className="rounded bg-panel border-stroke" /></td>
                               <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[10px] font-black border tracking-tighter ${req.method === 'GET' ? 'text-emerald-400 bg-emerald-400/5 border-emerald-400/20' : 'text-primary bg-primary/5 border-primary/20'}`}>{req.method}</span></td>
                               <td className="px-6 py-4 truncate max-w-sm text-fg-secondary" title={req.url}>{req.url}</td>
                               <td className="px-6 py-4 text-fg-muted truncate max-w-[140px]">{req.domain || '---'}</td>
                               <td className="px-6 py-4"><span className={`font-black ${req.status >= 400 ? 'text-rose-400' : 'text-emerald-400'}`}>{req.status || '---'}</span></td>
                               <td className="px-6 py-4 text-right pr-8"><button onClick={() => useImportedRequest(req)} className="px-3 py-1 bg-primary text-white rounded-lg text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:scale-105">Import</button></td>
                           </tr>
                        ))}
                    </tbody>
                  </table>
               </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col space-y-4">
            {/* Split View: Request Details | Response Terminal */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
               {/* Left: Request Configuration */}
               <div className="glass-panel flex flex-col overflow-hidden border-stroke/50 bg-panel/10 shadow-2xl">
                  <div className="p-5 border-b border-stroke bg-panel/30">
                     <div className="flex gap-3">
                        <select value={method} onChange={e => setMethod(e.target.value as any)} className="bg-panel border border-stroke rounded-2xl px-5 py-3 text-sm font-black w-36 focus:ring-2 focus:ring-primary/40 outline-none transition-all shadow-lg">
                           <option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option>
                        </select>
                        <input value={url} onChange={e => handleUrlChange(e.target.value)} placeholder="API ENDPOINT URL..." className="flex-1 bg-surface border border-stroke rounded-2xl px-6 py-3 text-xs font-mono focus:ring-2 focus:ring-primary/40 outline-none shadow-inner tracking-tight placeholder:italic" />
                        <div className="flex gap-2">
                           <button onClick={() => setUseProxy(!useProxy)} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl border transition-all ${useProxy ? 'bg-emerald-400/20 border-emerald-400 text-emerald-400 shadow-lg shadow-emerald-400/10' : 'bg-panel border-stroke text-fg-muted hover:text-fg'}`} title="Bypass CORS restrictions using a proxy">
                             Proxy: {useProxy ? 'ON' : 'OFF'}
                           </button>
                           <button onClick={handleClearRequest} className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-fg-muted hover:text-fg transition-all">
                              Clear
                           </button>
                           <button onClick={sendRequest} disabled={loading} className="btn-primary px-10 font-black tracking-[0.2em] text-xs h-[46px] shadow-xl shadow-primary/20 animate-none transform active:scale-95 transition-all">
                              {loading ? "SENDING..." : "TEST"}
                           </button>
                        </div>
                     </div>
                  </div>
                  <div className="flex-1 flex flex-col overflow-hidden">
                     <div className="px-6 h-12 border-b border-stroke bg-panel/10 flex gap-8">
                        {(["params", "auth", "headers", "body"] as const).map(tab => (
                           <button key={tab} onClick={() => setTesterTab(tab)} className={`h-full text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${testerTab === tab ? "border-primary text-fg" : "border-transparent text-fg-muted hover:text-fg"}`}>{tab}</button>
                        ))}
                     </div>
                     <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/5">
                        {testerTab === "params" && <KeyValueEditor label="Query Parameters" rows={params} setRows={setParams} />}
                        {testerTab === "headers" && <KeyValueEditor label="HTTP Headers" rows={headers} setRows={setHeaders} />}
                        {testerTab === "auth" && (
                           <div className="space-y-6">
                              <h3 className="text-[10px] font-black text-fg-muted uppercase tracking-[0.2em]">Security Protocol</h3>
                              <div className="flex gap-2 p-1.5 bg-panel border border-stroke rounded-2xl w-fit shadow-lg">
                                 <button onClick={() => setAuthMode("none")} className={`px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${authMode === "none" ? "bg-primary text-white shadow-md" : "text-fg-muted hover:bg-white/5"}`}>Cleartext</button>
                                 <button onClick={() => setAuthMode("bearer")} className={`px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${authMode === "bearer" ? "bg-primary text-white shadow-md" : "text-fg-muted hover:bg-white/5"}`}>Bearer Token</button>
                              </div>
                              {authMode === "bearer" && (
                                 <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="text-[9px] font-black text-primary uppercase ml-1">Access Token</label>
                                    <input value={bearerToken} onChange={e => setBearerToken(e.target.value)} placeholder="Enter authorization token..." className="w-full bg-panel border border-stroke rounded-2xl px-5 py-3 text-[11px] font-mono focus:ring-1 focus:ring-primary outline-none shadow-inner" />
                                 </div>
                              )}
                           </div>
                        )}
                        {testerTab === "body" && (
                           <div className="space-y-4 h-full flex flex-col">
                              <h3 className="text-[10px] font-black text-fg-muted uppercase tracking-[0.2em]">Payload Configuration (JSON)</h3>
                              <textarea value={body} onChange={e => setBody(e.target.value)} className="flex-1 bg-[#020617] text-emerald-400 border border-stroke/50 rounded-2xl p-5 text-xs font-mono focus:ring-2 focus:ring-primary/20 outline-none resize-none custom-scrollbar min-h-[250px] shadow-2xl leading-relaxed" />
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               {/* Right: Response Terminal */}
               <div className="glass-panel flex flex-col overflow-hidden bg-[#020617]/40 border-stroke/50 group shadow-2xl">
                  <div className="px-6 h-14 border-b border-stroke bg-panel/30 flex items-center justify-between">
                     <span className="text-[10px] font-black text-fg-muted uppercase tracking-[0.3em]">Console Output</span>
                     {response && (
                        <div className="flex items-center gap-6">
                           <div className="flex flex-col items-end">
                              <span className={`text-[12px] font-black leading-none ${(response?.status ?? 0) >= 400 ? "text-rose-400" : "text-emerald-400"}`}>{response?.status ?? "---"}</span>
                              <span className="text-[8px] font-black text-fg-muted uppercase mt-0.5">{response.statusText}</span>
                           </div>
                           <div className="w-px h-8 bg-stroke/50" />
                           <div className="flex flex-col items-end">
                              <span className="text-[12px] font-black text-fg leading-none">{response.durationMs?.toFixed(0)}</span>
                              <span className="text-[8px] font-black text-fg-muted uppercase mt-0.5">MILLISEC</span>
                           </div>
                        </div>
                     )}
                  </div>
                  <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-black/20">
                     {response ? (
                        <div className="font-mono text-[11px] h-full">
                           {response.errorMessage ? (
                              <div className="text-rose-400 bg-rose-400/5 p-6 rounded-2xl border border-rose-400/20 shadow-inner leading-relaxed">
                                <span className="font-black">FATAL_ERROR:</span> {response.errorMessage}
                              </div>
                           ) : (
                              <pre className="text-emerald-400/90 leading-relaxed whitespace-pre-wrap">{response.bodyPreview}</pre>
                           )}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col space-y-6">
                           <div className="flex-1 flex flex-col items-center justify-center text-fg-muted space-y-4 opacity-40 py-10 transition-opacity duration-700">
                             <div className="p-8 rounded-full border-2 border-dashed border-fg-muted text-5xl animate-spin-slow">📡</div>
                             <div className="text-[11px] font-black uppercase tracking-[0.5em] text-center">Awaiting Transmission...</div>
                           </div>
                           
                           {generatedCurl && (
                             <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                               <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Outgoing Request (cURL)</span>
                                  <button onClick={() => { navigator.clipboard.writeText(generatedCurl); }} className="text-[8px] font-black text-fg-muted hover:text-emerald-400 uppercase transition-colors tracking-widest">Copy to Clipboard</button>
                               </div>
                               <pre className="text-[10px] text-emerald-400/80 leading-relaxed font-mono whitespace-pre-wrap break-all border-l-2 border-emerald-500/20 pl-4">{generatedCurl}</pre>
                             </div>
                           )}
                        </div>
                      )}
                  </div>
               </div>
            </div>

            {/* Bottom Panel: Global Request History */}
            <div className="h-1/4 min-h-[160px] glass-panel flex flex-col overflow-hidden border-stroke/50 bg-surface/30 shadow-2xl">
                <div className="px-6 h-10 border-b border-stroke bg-panel/40 flex items-center justify-between">
                   <h3 className="text-[10px] font-black text-fg-muted uppercase tracking-[0.2em] flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                     Archive & Session Logs
                   </h3>
                   <div className="flex items-center gap-6">
                      <div className="text-[8px] font-black text-fg-muted uppercase tracking-widest">{apiHistory.length} ENTRIES RECORDED</div>
                      <div className="flex gap-4">
                         <button onClick={handleExportHistory} className="text-[9px] font-black text-primary hover:text-primary-hover uppercase tracking-widest transition-colors flex items-center gap-1.5">
                            <span className="text-xs">↓</span> Download Logs
                         </button>
                         <button onClick={handleClearHistory} className="text-[9px] font-black text-rose-400 hover:text-rose-300 uppercase tracking-widest transition-colors">
                            Clear Archive
                         </button>
                      </div>
                   </div>
                </div>
               <div className="flex-1 overflow-auto p-3 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                     {apiHistory.length === 0 ? (
                        <div className="col-span-full py-10 text-center text-[10px] text-fg-muted italic uppercase tracking-widest opacity-30">No transaction logs available.</div>
                     ) : apiHistory.map(item => (
                        <div key={item.id} onClick={() => useImportedRequest(item)} className="p-4 bg-panel/40 border border-stroke/30 rounded-2xl hover:border-primary/50 hover:bg-primary/5 cursor-pointer group transition-all transform active:scale-95 shadow-sm">
                           <div className="flex items-center justify-between mb-3">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border tracking-tighter ${item.method === 'GET' ? 'text-emerald-400 border-emerald-400/30' : 'text-primary border-primary/30'}`}>{item.method}</span>
                              <span className="text-[8px] font-black text-fg-muted uppercase">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                           </div>
                           <div className="text-[11px] font-mono text-fg-secondary truncate mb-2 group-hover:text-fg">{item.url}</div>
                           <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${item.status_code && item.status_code >= 400 ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                              <span className="text-[9px] font-black text-fg-muted uppercase tracking-tighter">Status: {item.status_code || '---'}</span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiTesterPanel;
