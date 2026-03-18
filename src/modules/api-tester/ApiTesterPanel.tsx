import { useEffect, useMemo, useState } from "react";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type KeyValueRow = {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
};

type AuthMode = "none" | "bearer";
type CodeLanguage = "curl" | "node" | "python" | "php";
type RightTab = "response" | "code";

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

const splitCurlArgs = (input: string) => {
  // Lightweight shell-like tokenizer supporting quotes and backslashes.
  const args: string[] = [];
  let cur = "";
  let quote: "'" | '"' | null = null;
  let escape = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (escape) {
      cur += ch;
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur) {
        args.push(cur);
        cur = "";
      }
      continue;
    }
    cur += ch;
  }
  if (cur) args.push(cur);
  return args;
};

const parseCurl = (curlCommand: string) => {
  const args = splitCurlArgs(curlCommand.trim());
  if (args.length === 0 || args[0].toLowerCase() !== "curl") {
    throw new Error("Not a cURL command");
  }

  let method: HttpMethod = "GET";
  const headers: Record<string, string> = {};
  const dataParts: string[] = [];
  let urlStr = "";

  const takeValue = (i: number) => {
    if (i + 1 >= args.length) return null;
    return args[i + 1];
  };

  for (let i = 1; i < args.length; i++) {
    const a = args[i];

    if (a === "-X" || a === "--request") {
      const v = takeValue(i);
      if (v) {
        const up = v.toUpperCase();
        if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(up)) {
          method = up as HttpMethod;
        }
      }
      i++;
      continue;
    }

    if (a === "-H" || a === "--header") {
      const v = takeValue(i);
      if (v) {
        const idx = v.indexOf(":");
        if (idx > -1) {
          const k = v.slice(0, idx).trim();
          const val = v.slice(idx + 1).trim();
          if (k) headers[k] = val;
        }
      }
      i++;
      continue;
    }

    if (
      a === "-d" ||
      a === "--data" ||
      a === "--data-raw" ||
      a === "--data-binary" ||
      a === "--data-ascii"
    ) {
      const v = takeValue(i);
      if (v != null) {
        dataParts.push(v);
        // cURL implies POST when data is present unless overridden
        if (method === "GET") method = "POST";
      }
      i++;
      continue;
    }

    if (a === "-G" || a === "--get") {
      method = "GET";
      continue;
    }

    // ignore common flags with no value
    if (a.startsWith("-")) {
      continue;
    }

    // First non-flag arg is usually URL
    if (!urlStr) urlStr = a;
  }

  const body = dataParts.length ? dataParts.join("&") : "";
  return { method, url: urlStr, headers, body };
};

const headersToRows = (obj: Record<string, string>) => {
  const rows = Object.entries(obj).map(([k, v]) => makeRow(k, v, true));
  return rows.length ? rows : [emptyRow()];
};

const stripQueryToParams = (rawUrl: string) => {
  const normalized = normalizeUrlWithProtocol(rawUrl);
  const u = new URL(normalized);
  const paramsRows: KeyValueRow[] = [];
  u.searchParams.forEach((value, key) => {
    paramsRows.push(makeRow(key, value, true));
  });
  u.search = "";
  // Keep original protocol omission behavior for UI input: if user didn't type protocol, remove it
  const hadProtocol = /^https?:\/\//i.test(rawUrl.trim());
  const base = hadProtocol ? u.toString() : u.toString().replace(/^https?:\/\//i, "");
  return {
    baseUrl: base,
    params: paramsRows.length ? paramsRows : [emptyRow()],
  };
};

const escapeSingleQuotes = (s: string) => s.replace(/'/g, `'\\''`);

const ApiTesterPanel = () => {
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("");
  const [params, setParams] = useState<KeyValueRow[]>([emptyRow()]);
  const [headers, setHeaders] = useState<KeyValueRow[]>([emptyRow()]);
  const [authMode, setAuthMode] = useState<AuthMode>("none");
  const [bearerToken, setBearerToken] = useState("");
  const [body, setBody] = useState("{\n  \n}");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SavedResponse | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>("response");
  const [codeLang, setCodeLang] = useState<CodeLanguage>("curl");
  const [curlImportError, setCurlImportError] = useState<string | null>(null);

  // Restore last request/response from localStorage
  useEffect(() => {
    try {
      const rawReq = localStorage.getItem(STORAGE_KEY_REQUEST);
      if (rawReq) {
        const parsed: SavedRequest = JSON.parse(rawReq);
        setMethod(parsed.method);
        setUrl(parsed.url);
        setParams(parsed.params.length ? parsed.params : [emptyRow()]);
        setHeaders(parsed.headers.length ? parsed.headers : [emptyRow()]);
        setAuthMode(parsed.authMode);
        setBearerToken(parsed.bearerToken);
        setBody(parsed.body || "{\n  \n}");
      }
      const rawRes = localStorage.getItem(STORAGE_KEY_RESPONSE);
      if (rawRes) {
        const parsedRes: SavedResponse = JSON.parse(rawRes);
        setResponse(parsedRes);
      }
    } catch {
      // ignore corrupted storage
    }
  }, []);

  // Persist request whenever core inputs change
  useEffect(() => {
    const payload: SavedRequest = {
      method,
      url,
      params,
      headers,
      authMode,
      bearerToken,
      body,
    };
    try {
      localStorage.setItem(STORAGE_KEY_REQUEST, JSON.stringify(payload));
    } catch {
      // ignore quota/storage errors
    }
  }, [method, url, params, headers, authMode, bearerToken, body]);

  const activeParams = useMemo(
    () => params.filter((p) => p.enabled && p.key.trim() !== ""),
    [params]
  );

  const activeHeaders = useMemo(
    () => headers.filter((h) => h.enabled && h.key.trim() !== ""),
    [headers]
  );

  const requestUrlWithProtocol = useMemo(() => {
    if (!url.trim()) return "";
    try {
      const urlObj = new URL(normalizeUrlWithProtocol(url));
      activeParams.forEach((p) => {
        urlObj.searchParams.append(p.key, p.value);
      });
      return urlObj.toString();
    } catch {
      return normalizeUrlWithProtocol(url);
    }
  }, [url, activeParams]);

  const finalUrl = useMemo(() => {
    if (!url.trim()) return "";
    try {
      const base = url.trim();
      const hasProtocol = /^https?:\/\//i.test(base);
      const urlObj = new URL(hasProtocol ? base : `https://${base}`);
      activeParams.forEach((p) => {
        urlObj.searchParams.append(p.key, p.value);
      });
      // Show without auto-injecting protocol if user omitted it
      return hasProtocol ? urlObj.toString() : urlObj.toString().replace(/^https?:\/\//i, "");
    } catch {
      return url;
    }
  }, [url, activeParams]);

  const requestHeadersObj = useMemo(() => {
    const headersObj: Record<string, string> = {};
    activeHeaders.forEach((h) => {
      headersObj[h.key] = h.value;
    });
    if (authMode === "bearer" && bearerToken.trim()) {
      headersObj["Authorization"] = `Bearer ${bearerToken.trim()}`;
    }
    if (["POST", "PUT", "PATCH"].includes(method) && !headersObj["Content-Type"]) {
      headersObj["Content-Type"] = "application/json";
    }
    return headersObj;
  }, [activeHeaders, authMode, bearerToken, method]);

  const handleRowChange = (
    rows: KeyValueRow[],
    setRows: (rows: KeyValueRow[]) => void,
    id: string,
    patch: Partial<KeyValueRow>
  ) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const handleAddRow = (
    rows: KeyValueRow[],
    setRows: (rows: KeyValueRow[]) => void
  ) => {
    setRows([...rows, emptyRow()]);
  };

  const handleDeleteRow = (
    rows: KeyValueRow[],
    setRows: (rows: KeyValueRow[]) => void,
    id: string
  ) => {
    const next = rows.filter((row) => row.id !== id);
    setRows(next.length ? next : [emptyRow()]);
  };

  const validateJsonBody = (): string | null => {
    if (!["POST", "PUT", "PATCH"].includes(method)) return null;
    const trimmed = body.trim();
    if (!trimmed) return null;
    try {
      JSON.parse(trimmed);
      return null;
    } catch (err: any) {
      return err?.message || "Invalid JSON";
    }
  };

  const handleUrlChange = (val: string) => {
    setCurlImportError(null);

    const trimmed = val.trimStart();
    if (/^curl(\s|$)/i.test(trimmed)) {
      try {
        const parsed = parseCurl(trimmed);
        if (!parsed.url) throw new Error("cURL command missing URL");

        const { baseUrl, params: parsedParams } = stripQueryToParams(parsed.url);

        setMethod(parsed.method);
        setUrl(baseUrl);
        setParams(parsedParams);

        // Pull Authorization into auth section when it's a Bearer token
        const hdrs = { ...parsed.headers };
        const authHeaderKey =
          Object.keys(hdrs).find((k) => k.toLowerCase() === "authorization") ?? null;
        if (authHeaderKey) {
          const v = hdrs[authHeaderKey];
          const m = v.match(/^Bearer\s+(.+)$/i);
          if (m) {
            setAuthMode("bearer");
            setBearerToken(m[1]);
            delete hdrs[authHeaderKey];
          } else {
            setAuthMode("none");
            setBearerToken("");
          }
        }
        setHeaders(headersToRows(hdrs));

        if (parsed.body) {
          // Prefer pretty JSON if it's JSON
          const rawBody = parsed.body;
          try {
            const json = JSON.parse(rawBody);
            setBody(JSON.stringify(json, null, 2));
          } catch {
            setBody(rawBody);
          }
        }

        setRightTab("code"); // nice UX: show generated code after import
        return;
      } catch (e: any) {
        setCurlImportError(e?.message || "Failed to import cURL");
        // Fall through: still set URL text so user can edit
      }
    }

    setUrl(val);
  };

  const sendRequest = async () => {
    if (!url.trim() || loading) return;

    const validationError = validateJsonBody();
    if (validationError) {
      setJsonError(validationError);
      return;
    }
    setJsonError(null);

    let requestUrl = url.trim();
    requestUrl = normalizeUrlWithProtocol(requestUrl);

    const urlObj = new URL(requestUrl);
    activeParams.forEach((p) => {
      urlObj.searchParams.append(p.key, p.value);
    });

    const init: RequestInit = {
      method,
      headers: requestHeadersObj,
    };

    if (["POST", "PUT", "PATCH"].includes(method)) {
      const trimmed = body.trim();
      init.body = trimmed ? body : undefined;
    }

    const start = performance.now();
    setLoading(true);

    try {
      const res = await fetch(urlObj.toString(), init);
      const durationMs = performance.now() - start;

      const resHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        resHeaders[key] = value;
      });

      let text: string;
      try {
        text = await res.text();
      } catch {
        text = "";
      }

      let prettyBody = text;
      if (text) {
        try {
          const json = JSON.parse(text);
          prettyBody = JSON.stringify(json, null, 2);
        } catch {
          // keep raw text
        }
      }

      const payload: SavedResponse = {
        status: res.status,
        statusText: res.statusText,
        durationMs,
        headers: resHeaders,
        bodyPreview: prettyBody,
      };
      setResponse(payload);
      try {
        localStorage.setItem(STORAGE_KEY_RESPONSE, JSON.stringify(payload));
      } catch {
        // ignore
      }
    } catch (err: any) {
      const durationMs = performance.now() - start;
      const message =
        err?.message ||
        "Network error. Check the URL, CORS restrictions, or your connection.";
      const payload: SavedResponse = {
        errorMessage: message,
        durationMs,
      };
      setResponse(payload);
      try {
        localStorage.setItem(STORAGE_KEY_RESPONSE, JSON.stringify(payload));
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  };

  const canSend = !!url.trim() && (!["POST", "PUT", "PATCH"].includes(method) || !validateJsonBody());

  const generatedCode = useMemo(() => {
    const u = requestUrlWithProtocol;
    const hdrs = requestHeadersObj;
    const hasBody = ["POST", "PUT", "PATCH"].includes(method) && body.trim().length > 0;

    const jsonBodyPretty = (() => {
      const trimmed = body.trim();
      if (!trimmed) return "";
      try {
        const j = JSON.parse(trimmed);
        return JSON.stringify(j, null, 2);
      } catch {
        return body;
      }
    })();

    if (!u) return "";

    if (codeLang === "curl") {
      // Deduplicate headers case-insensitively for clean output
      const deduped: Record<string, { key: string; value: string }> = {};
      Object.entries(hdrs).forEach(([k, v]) => {
        const lk = k.toLowerCase();
        deduped[lk] = { key: k, value: v };
      });

      // Stable, human-friendly ordering (similar to Postman)
      const preferredOrder = ["accept", "authorization", "content-type"];
      const orderedKeys = [
        ...preferredOrder.filter((k) => !!deduped[k]),
        ...Object.keys(deduped)
          .filter((k) => !preferredOrder.includes(k))
          .sort(),
      ];

      const lines: string[] = [];
      lines.push("curl \\");
      if (method !== "GET") {
        lines.push(`  -X ${method} \\`);
      }

      orderedKeys.forEach((lk) => {
        const { key, value } = deduped[lk];
        lines.push(`  -H '${escapeSingleQuotes(`${key}: ${value}`)}' \\`);
      });

      if (hasBody) {
        // Use --data-raw for cleaner multi-line JSON payloads
        lines.push(`  --data-raw '${escapeSingleQuotes(jsonBodyPretty)}' \\`);
      }

      lines.push(`  '${escapeSingleQuotes(u)}'`);
      return lines.join("\n");
    }

    if (codeLang === "node") {
      const headersLiteral = JSON.stringify(hdrs, null, 2);
      const bodyLine = hasBody
        ? `  body: JSON.stringify(${jsonBodyPretty.trim() ? jsonBodyPretty : "{}"}),\n`
        : "";
      return `const url = ${JSON.stringify(u)};\n\nconst options = {\n  method: ${JSON.stringify(method)},\n  headers: ${headersLiteral},\n${bodyLine}};\n\ntry {\n  const res = await fetch(url, options);\n  const text = await res.text();\n  try {\n    console.log(JSON.parse(text));\n  } catch {\n    console.log(text);\n  }\n} catch (err) {\n  console.error(err);\n}\n`;
    }

    if (codeLang === "python") {
      const headersLiteral = JSON.stringify(hdrs, null, 2);
      const trimmed = body.trim();
      let bodyBlock = "";
      if (hasBody) {
        try {
          JSON.parse(trimmed);
          bodyBlock = `payload = ${jsonBodyPretty}\n\n`;
        } catch {
          bodyBlock = `payload = ${JSON.stringify(trimmed)}\n\n`;
        }
      }
      const dataArg = hasBody
        ? (() => {
            try {
              JSON.parse(trimmed);
              return "json=payload";
            } catch {
              return "data=payload";
            }
          })()
        : "";
      const args = [`method=${JSON.stringify(method)}`, `url=${JSON.stringify(u)}`, `headers=headers`]
        .concat(dataArg ? [dataArg] : [])
        .join(", ");
      return `import requests\n\nheaders = ${headersLiteral}\n\n${bodyBlock}response = requests.request(${args})\nprint(response.status_code)\nprint(response.text)\n`;
    }

    // php
    const hdrList = Object.entries(hdrs).map(([k, v]) => `${k}: ${v}`);
    const hdrPhp = hdrList.length
      ? `[\n${hdrList.map((h) => `  ${JSON.stringify(h)},`).join("\n")}\n]`
      : "[]";
    const bodyPhp = hasBody ? JSON.stringify(jsonBodyPretty) : "null";
    const bodyOpt = hasBody
      ? `curl_setopt($ch, CURLOPT_POSTFIELDS, ${bodyPhp});\n`
      : "";
    return `<?php\n$ch = curl_init();\n\ncurl_setopt($ch, CURLOPT_URL, ${JSON.stringify(u)});\ncurl_setopt($ch, CURLOPT_CUSTOMREQUEST, ${JSON.stringify(method)});\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ${hdrPhp});\n${bodyOpt}curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n\n$response = curl_exec($ch);\n$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);\n$error = curl_error($ch);\n\ncurl_close($ch);\n\necho \"Status: $httpCode\\n\";\nif ($error) {\n  echo \"Error: $error\\n\";\n}\necho $response;\n`;
  }, [codeLang, requestUrlWithProtocol, requestHeadersObj, method, body]);

  const copyCode = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
    } catch {
      // ignore (clipboard might be blocked); user can still select manually
    }
  };

  const clearAll = () => {
    if (loading) return;
    setMethod("GET");
    setUrl("");
    setParams([emptyRow()]);
    setHeaders([emptyRow()]);
    setAuthMode("none");
    setBearerToken("");
    setBody("{\n  \n}");
    setJsonError(null);
    setCurlImportError(null);
    setResponse(null);
    setRightTab("response");
    setCodeLang("curl");
    try {
      localStorage.removeItem(STORAGE_KEY_REQUEST);
      localStorage.removeItem(STORAGE_KEY_RESPONSE);
    } catch {
      // ignore
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6 h-[calc(100vh-theme(spacing.16))]">
      {/* Request builder */}
      <div className="glass-panel flex flex-col overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">HTTP</span>
            <h1 className="text-lg font-bold text-slate-100 uppercase tracking-widest">
              API Tester
            </h1>
          </div>
        </div>

        <div className="px-5 pt-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <select
              className="w-full md:w-32 rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
            <input
              className="flex-1 rounded-md border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              placeholder="https://api.example.com/resource"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
            <button
              className={`btn-primary px-6 py-2 text-sm font-semibold flex items-center justify-center gap-2 ${
                (!canSend || loading) ? "opacity-60 cursor-not-allowed" : ""
              }`}
              onClick={sendRequest}
              disabled={!canSend || loading}
            >
              {loading ? "Sending..." : "Send"}
            </button>
            <button
              type="button"
              className={`btn-ghost px-5 py-2 text-sm font-semibold ${
                loading ? "opacity-60 cursor-not-allowed" : ""
              }`}
              onClick={clearAll}
              disabled={loading}
              title="Clear request and response"
            >
              Clear
            </button>
          </div>
          {finalUrl && finalUrl !== url && (
            <p className="text-[11px] text-slate-500 font-mono truncate">
              Final URL: {finalUrl}
            </p>
          )}
          {curlImportError ? (
            <p className="text-[11px] text-rose-400">
              cURL import error: {curlImportError}
            </p>
          ) : null}
        </div>

        <div className="px-5 pt-3 pb-5 flex-1 flex flex-col overflow-hidden">
          {/* Simple tab implementation without external libs */}
          <Tabs
            params={params}
            setParams={setParams}
            headers={headers}
            setHeaders={setHeaders}
            authMode={authMode}
            setAuthMode={setAuthMode}
            bearerToken={bearerToken}
            setBearerToken={setBearerToken}
            method={method}
            body={body}
            setBody={setBody}
            jsonError={jsonError}
            handleRowChange={handleRowChange}
            handleAddRow={handleAddRow}
            handleDeleteRow={handleDeleteRow}
          />
        </div>
      </div>

      {/* Response viewer */}
      <div className="glass-panel flex flex-col overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-slate-900/70 border border-slate-800 text-xs overflow-hidden">
            <button
              type="button"
              className={`px-4 py-2 border-r border-slate-800 ${
                rightTab === "response"
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-400 hover:text-slate-100"
              }`}
              onClick={() => setRightTab("response")}
            >
              Response
            </button>
            <button
              type="button"
              className={`px-4 py-2 ${
                rightTab === "code"
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-400 hover:text-slate-100"
              }`}
              onClick={() => setRightTab("code")}
            >
              Code
            </button>
          </div>
          {rightTab === "code" ? (
            <button
              type="button"
              onClick={copyCode}
              className={`text-xs text-primary hover:text-sky-300 ${
                !generatedCode ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={!generatedCode}
              title="Copy generated code"
            >
              Copy Code
            </button>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {rightTab === "response" ? (
            !response ? (
              <p className="text-sm text-slate-500">
                Send a request to see the response here.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {typeof response.status === "number" ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-medium">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Status:{" "}
                      <span className="font-mono">
                        {response.status} {response.statusText ?? ""}
                      </span>
                    </span>
                  ) : null}
                  {typeof response.durationMs === "number" ? (
                    <span className="text-xs text-slate-400">
                      Time:{" "}
                      <span className="font-mono">
                        {Math.round(response.durationMs)} ms
                      </span>
                    </span>
                  ) : null}
                </div>

                {response.errorMessage ? (
                  <div className="rounded-md border border-rose-700 bg-rose-900/40 px-3 py-2 text-xs text-rose-100">
                    {response.errorMessage}
                  </div>
                ) : null}

                {response.headers ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-300 mb-1">
                      Headers
                    </p>
                    <div className="rounded-md border border-slate-800 bg-slate-950/60 max-h-40 overflow-auto text-[11px] font-mono text-slate-300 px-3 py-2 space-y-0.5">
                      {Object.entries(response.headers).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <span className="text-slate-500 min-w-[140px]">{k}:</span>
                          <span className="flex-1 break-all">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <p className="text-xs font-semibold text-slate-300 mb-1">
                    Body
                  </p>
                  <pre className="rounded-md border border-slate-800 bg-slate-950/70 max-h-[320px] overflow-auto text-xs font-mono text-slate-100 px-3 py-2 whitespace-pre-wrap break-words">
                    {response.bodyPreview || "<empty>"}
                  </pre>
                </div>
              </>
            )
          ) : (
            <div className="space-y-3">
              <div className="inline-flex rounded-lg bg-slate-900/70 border border-slate-800 text-xs overflow-hidden">
                <button
                  type="button"
                  className={`px-4 py-2 border-r border-slate-800 ${
                    codeLang === "curl"
                      ? "bg-slate-800 text-slate-100"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                  onClick={() => setCodeLang("curl")}
                >
                  cURL
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 border-r border-slate-800 ${
                    codeLang === "node"
                      ? "bg-slate-800 text-slate-100"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                  onClick={() => setCodeLang("node")}
                >
                  Node (fetch)
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 border-r border-slate-800 ${
                    codeLang === "python"
                      ? "bg-slate-800 text-slate-100"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                  onClick={() => setCodeLang("python")}
                >
                  Python (requests)
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 ${
                    codeLang === "php"
                      ? "bg-slate-800 text-slate-100"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                  onClick={() => setCodeLang("php")}
                >
                  PHP (cURL)
                </button>
              </div>

              {!url.trim() ? (
                <p className="text-sm text-slate-500">
                  Enter a URL to generate code.
                </p>
              ) : (
                <pre className="rounded-md border border-slate-800 bg-slate-950/70 max-h-[520px] overflow-auto text-xs font-mono text-slate-100 px-3 py-2 whitespace-pre-wrap break-words">
                  {generatedCode || "// Unable to generate code for this input"}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

type TabsProps = {
  params: KeyValueRow[];
  setParams: (rows: KeyValueRow[]) => void;
  headers: KeyValueRow[];
  setHeaders: (rows: KeyValueRow[]) => void;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  bearerToken: string;
  setBearerToken: (val: string) => void;
  method: HttpMethod;
  body: string;
  setBody: (val: string) => void;
  jsonError: string | null;
  handleRowChange: (
    rows: KeyValueRow[],
    setRows: (rows: KeyValueRow[]) => void,
    id: string,
    patch: Partial<KeyValueRow>
  ) => void;
  handleAddRow: (
    rows: KeyValueRow[],
    setRows: (rows: KeyValueRow[]) => void
  ) => void;
  handleDeleteRow: (
    rows: KeyValueRow[],
    setRows: (rows: KeyValueRow[]) => void,
    id: string
  ) => void;
};

const Tabs = ({
  params,
  setParams,
  headers,
  setHeaders,
  authMode,
  setAuthMode,
  bearerToken,
  setBearerToken,
  method,
  body,
  setBody,
  jsonError,
  handleRowChange,
  handleAddRow,
  handleDeleteRow,
}: TabsProps) => {
  const [activeTab, setActiveTab] = useState<"params" | "headers" | "auth" | "body">(
    "params"
  );

  return (
    <>
      <div className="inline-flex rounded-lg bg-slate-900/70 border border-slate-800 text-xs mb-3 overflow-hidden">
        <button
          className={`px-4 py-2 border-r border-slate-800 ${
            activeTab === "params"
              ? "bg-slate-800 text-slate-100"
              : "text-slate-400 hover:text-slate-100"
          }`}
          onClick={() => setActiveTab("params")}
        >
          Params
        </button>
        <button
          className={`px-4 py-2 border-r border-slate-800 ${
            activeTab === "headers"
              ? "bg-slate-800 text-slate-100"
              : "text-slate-400 hover:text-slate-100"
          }`}
          onClick={() => setActiveTab("headers")}
        >
          Headers
        </button>
        <button
          className={`px-4 py-2 border-r border-slate-800 ${
            activeTab === "auth"
              ? "bg-slate-800 text-slate-100"
              : "text-slate-400 hover:text-slate-100"
          }`}
          onClick={() => setActiveTab("auth")}
        >
          Authorization
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === "body"
              ? "bg-slate-800 text-slate-100"
              : "text-slate-400 hover:text-slate-100"
          }`}
          onClick={() => setActiveTab("body")}
        >
          Body
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "params" && (
          <KeyValueEditor
            label="Query Params"
            rows={params}
            setRows={setParams}
            handleRowChange={handleRowChange}
            handleAddRow={handleAddRow}
            handleDeleteRow={handleDeleteRow}
          />
        )}
        {activeTab === "headers" && (
          <KeyValueEditor
            label="Headers"
            rows={headers}
            setRows={setHeaders}
            handleRowChange={handleRowChange}
            handleAddRow={handleAddRow}
            handleDeleteRow={handleDeleteRow}
          />
        )}
        {activeTab === "auth" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 text-sm">
              <label className="font-medium text-slate-200">Auth Type</label>
              <div className="inline-flex rounded-md bg-slate-900/70 border border-slate-800 overflow-hidden text-xs">
                <button
                  className={`px-4 py-2 border-r border-slate-800 ${
                    authMode === "none"
                      ? "bg-slate-800 text-slate-100"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                  onClick={() => setAuthMode("none")}
                  type="button"
                >
                  No Auth
                </button>
                <button
                  className={`px-4 py-2 ${
                    authMode === "bearer"
                      ? "bg-slate-800 text-slate-100"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                  onClick={() => setAuthMode("bearer")}
                  type="button"
                >
                  Bearer Token
                </button>
              </div>
            </div>
            {authMode === "bearer" && (
              <div className="space-y-1 text-sm">
                <label className="text-slate-300">Token</label>
                <input
                  className="w-full rounded-md border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={bearerToken}
                  onChange={(e) => setBearerToken(e.target.value)}
                />
                <p className="text-[11px] text-slate-500">
                  Will be sent as <span className="font-mono">Authorization: Bearer &lt;token&gt;</span>.
                </p>
              </div>
            )}
          </div>
        )}
        {activeTab === "body" && (
          <div className="flex flex-col h-full gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200">JSON Body</span>
              {!["POST", "PUT", "PATCH"].includes(method) && (
                <span className="text-[11px] text-amber-400">
                  Only used for POST, PUT, PATCH
                </span>
              )}
            </div>
            <textarea
              className="flex-1 min-h-[160px] rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              spellCheck={false}
            />
            {jsonError ? (
              <p className="text-[11px] text-rose-400">JSON error: {jsonError}</p>
            ) : (
              <p className="text-[11px] text-slate-500">
                Paste raw JSON here. It will be validated before sending.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
};

type KeyValueEditorProps = {
  label: string;
  rows: KeyValueRow[];
  setRows: (rows: KeyValueRow[]) => void;
  handleRowChange: (
    rows: KeyValueRow[],
    setRows: (rows: KeyValueRow[]) => void,
    id: string,
    patch: Partial<KeyValueRow>
  ) => void;
  handleAddRow: (
    rows: KeyValueRow[],
    setRows: (rows: KeyValueRow[]) => void
  ) => void;
  handleDeleteRow: (
    rows: KeyValueRow[],
    setRows: (rows: KeyValueRow[]) => void,
    id: string
  ) => void;
};

const KeyValueEditor = ({
  label,
  rows,
  setRows,
  handleRowChange,
  handleAddRow,
  handleDeleteRow,
}: KeyValueEditorProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-200">{label}</span>
        <button
          type="button"
          className="text-xs text-primary hover:text-sky-300"
          onClick={() => handleAddRow(rows, setRows)}
        >
          + Add row
        </button>
      </div>
      <div className="rounded-md border border-slate-800 bg-slate-950/40 overflow-hidden">
        <div className="grid grid-cols-[32px,1.5fr,1.5fr,40px] text-[11px] uppercase tracking-[0.16em] text-slate-500 border-b border-slate-800 px-3 py-2">
          <span>On</span>
          <span>Key</span>
          <span>Value</span>
          <span />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[32px,1.5fr,1.5fr,40px] items-center gap-2 px-3 py-1.5 border-b border-slate-900/60 last:border-b-0 text-xs"
            >
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={(e) =>
                  handleRowChange(rows, setRows, row.id, { enabled: e.target.checked })
                }
                className="h-3.5 w-3.5 accent-primary justify-self-center"
              />
              <input
                className="w-full bg-transparent border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-600"
                placeholder="key"
                value={row.key}
                onChange={(e) =>
                  handleRowChange(rows, setRows, row.id, { key: e.target.value })
                }
              />
              <input
                className="w-full bg-transparent border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-600"
                placeholder="value"
                value={row.value}
                onChange={(e) =>
                  handleRowChange(rows, setRows, row.id, { value: e.target.value })
                }
              />
              <button
                type="button"
                className="text-slate-600 hover:text-rose-400 text-base leading-none justify-self-center"
                onClick={() => handleDeleteRow(rows, setRows, row.id)}
                title="Delete row"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ApiTesterPanel;
