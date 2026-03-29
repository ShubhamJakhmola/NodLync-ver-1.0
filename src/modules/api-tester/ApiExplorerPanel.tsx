import { useMemo, useState } from "react";
import ModuleHeader from "../../components/ModuleHeader";

type ExplorerEndpoint = {
  id: string;
  method: string;
  path: string;
  description: string;
  curl: string;
  body?: string;
};

const PRE_DEFINED_ENDPOINTS: Record<string, ExplorerEndpoint[]> = {
  "sendblue.com": [
    {
      id: "sendblue-list-messages",
      method: "GET",
      path: "/api/v2/messages",
      description: "Retrieve a list of messages for the authenticated account",
      curl:
        'curl https://api.sendblue.co/api/v2/messages \\\n  -H "sb-api-key-id: YOUR_API_KEY" \\\n  -H "sb-api-secret-key: YOUR_API_SECRET"',
      body: '{\n  "is_outbound": false,\n  "limit": 50\n}',
    },
    {
      id: "sendblue-send-message",
      method: "POST",
      path: "/api/send-message",
      description: "Send a new message to a phone number",
      curl:
        'curl -X POST https://api.sendblue.co/api/send-message \\\n  -H "sb-api-key-id: YOUR_API_KEY" \\\n  -H "sb-api-secret-key: YOUR_API_SECRET" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"number": "+15551234567", "content": "Hello World", "send_style": "celebration"}\'',
      body: '{\n  "number": "+15551234567",\n  "content": "Hello World",\n  "send_style": "celebration"\n}',
    },
    {
      id: "sendblue-send-group",
      method: "POST",
      path: "/api/send-group-message",
      description: "Send group message",
      curl:
        'curl -X POST https://api.sendblue.co/api/send-group-message \\\n  -H "sb-api-key-id: YOUR_API_KEY" \\\n  -H "sb-api-secret-key: YOUR_API_SECRET" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"groupId": "group_123", "content": "Hello team"}\'',
      body: '{\n  "groupId": "group_123",\n  "content": "Hello team"\n}',
    },
    {
      id: "sendblue-status",
      method: "GET",
      path: "/api/status",
      description: "Get message status",
      curl:
        'curl https://api.sendblue.co/api/status?message_handle=msg_123 \\\n  -H "sb-api-key-id: YOUR_API_KEY" \\\n  -H "sb-api-secret-key: YOUR_API_SECRET"',
      body: '{\n  "message_handle": "msg_123"\n}',
    },
    {
      id: "sendblue-evaluate",
      method: "GET",
      path: "/api/evaluate-service",
      description: "Check recipient service type (iMessage, SMS)",
      curl:
        'curl https://api.sendblue.co/api/evaluate-service?number=+15551234567 \\\n  -H "sb-api-key-id: YOUR_API_KEY" \\\n  -H "sb-api-secret-key: YOUR_API_SECRET"',
      body: '{\n  "number": "+15551234567"\n}',
    },
  ],
  generic: [
    {
      id: "gen-list",
      method: "GET",
      path: "/api/v1/resources",
      description: "List resources",
      curl:
        'curl https://api.example.com/api/v1/resources \\\n  -H "Authorization: Bearer YOUR_API_KEY"',
      body: '{\n  "limit": 10,\n  "offset": 0\n}',
    },
    {
      id: "gen-create",
      method: "POST",
      path: "/api/v1/resources",
      description: "Create a new resource",
      curl:
        'curl -X POST https://api.example.com/api/v1/resources \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"name": "New Resource"}\'',
      body: '{\n  "name": "New Resource"\n}',
    },
    {
      id: "gen-get",
      method: "GET",
      path: "/api/v1/resources/{id}",
      description: "Get details of a single resource",
      curl:
        'curl https://api.example.com/api/v1/resources/1 \\\n  -H "Authorization: Bearer YOUR_API_KEY"',
      body: '{\n  "id": "1"\n}',
    },
  ],
};

function getMethodPillClass(method: string) {
  switch (method) {
    case "GET":
      return "bg-emerald-500/12 text-emerald-300 border border-emerald-500/20";
    case "POST":
      return "bg-sky-500/12 text-sky-300 border border-sky-500/20";
    case "PUT":
    case "PATCH":
      return "bg-amber-500/12 text-amber-300 border border-amber-500/20";
    case "DELETE":
      return "bg-rose-500/12 text-rose-300 border border-rose-500/20";
    default:
      return "bg-surface text-fg-secondary border border-stroke";
  }
}

const ApiExplorerPanel = () => {
  const [step, setStep] = useState(1);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [endpoints, setEndpoints] = useState<ExplorerEndpoint[]>([]);
  const [selectedEndpoints, setSelectedEndpoints] = useState<string[]>([]);
  const [activeTestEndpoint, setActiveTestEndpoint] = useState<string | null>(null);

  const selectedEndpointDetails = useMemo(
    () => endpoints.find((endpoint) => endpoint.id === activeTestEndpoint) ?? null,
    [activeTestEndpoint, endpoints],
  );

  const handleFetchEndpoints = () => {
    if (!docUrl.trim()) return;
    setLoading(true);

    window.setTimeout(() => {
      const resolvedEndpoints = docUrl.toLowerCase().includes("sendblue.com")
        ? PRE_DEFINED_ENDPOINTS["sendblue.com"]
        : PRE_DEFINED_ENDPOINTS.generic;

      setEndpoints(resolvedEndpoints);
      setSelectedEndpoints([]);
      setActiveTestEndpoint(null);
      setLoading(false);
      setStep(2);
    }, 900);
  };

  const handleSelectEndpointsSubmit = () => {
    if (selectedEndpoints.length === 0) {
      window.alert("Please select at least one endpoint to proceed.");
      return;
    }
    setStep(3);
    setActiveTestEndpoint(selectedEndpoints[0]);
  };

  const toggleEndpointSelection = (id: string) => {
    setSelectedEndpoints((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  };

  const getInterpolatedCurl = (endpoint: ExplorerEndpoint) => {
    let curl = endpoint.curl;
    if (apiKey) curl = curl.replaceAll("YOUR_API_KEY", apiKey);
    if (apiSecret) curl = curl.replaceAll("YOUR_API_SECRET", apiSecret);
    return curl;
  };

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      window.alert(successMessage);
    } catch {
      window.alert("Clipboard copy failed.");
    }
  };

  return (
    <div className="glass-panel flex flex-col overflow-hidden">
      <ModuleHeader
        title="Explore API"
        description="Import docs, pick endpoints, and generate a quick inspection workspace"
        icon="API"
      />

      <div className="border-b border-stroke px-5 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((item) => (
              <span
                key={item}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  step === item ? "bg-primary shadow-[0_0_0_4px_rgba(14,165,233,0.14)]" : "bg-stroke"
                }`}
              />
            ))}
            <span className="ml-2 text-xs text-fg-muted">Step {step} of 3</span>
          </div>
          <span className="text-xs text-fg-muted">
            Based on your external explorer UI, integrated into NodLync.
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5">
        {step === 1 ? (
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="glass-panel p-6">
              <h2 className="text-2xl font-bold text-fg mb-2">Connect Your API</h2>
              <p className="text-sm text-fg-muted mb-8">
                Enter API credentials and a documentation URL. The explorer will map that input
                to a ready-to-inspect endpoint workspace.
              </p>

              <div className="space-y-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-fg-secondary">API Key / ID</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="Enter your API key or ID"
                    className="w-full px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-fg-secondary">
                    API Secret
                  </label>
                  <input
                    type="password"
                    value={apiSecret}
                    onChange={(event) => setApiSecret(event.target.value)}
                    placeholder="Optional second credential for APIs like Sendblue"
                    className="w-full px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-fg-secondary">
                    Documentation URL
                  </label>
                  <input
                    type="url"
                    value={docUrl}
                    onChange={(event) => setDocUrl(event.target.value)}
                    placeholder="https://docs.example.com/api"
                    className="w-full px-4 py-3 text-sm"
                  />
                  <p className="mt-2 text-xs text-fg-muted">
                    Try:
                    <span className="ml-1 font-mono text-primary">
                      https://docs.sendblue.com/api/resources/messages/methods/list
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleFetchEndpoints}
                  disabled={!docUrl.trim() || loading}
                  className="btn-primary w-full px-6 py-3 text-sm font-semibold"
                >
                  {loading ? "Parsing Documentation..." : "Extract Endpoints"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="glass-panel p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-fg">Select Endpoints to Test</h2>
                  <p className="mt-1 text-sm text-fg-muted">
                    We found {endpoints.length} endpoints. Choose the ones you want to inspect.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-ghost text-sm"
                >
                  Edit Credentials
                </button>
              </div>

              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                {endpoints.map((endpoint) => {
                  const isSelected = selectedEndpoints.includes(endpoint.id);
                  return (
                    <button
                      key={endpoint.id}
                      type="button"
                      onClick={() => toggleEndpointSelection(endpoint.id)}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? "border-primary bg-primary/8"
                          : "border-stroke bg-panel/50 hover:border-stroke-strong"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border text-[10px] font-bold ${
                          isSelected
                            ? "border-primary bg-primary text-on-primary"
                            : "border-stroke bg-surface text-fg-muted"
                        }`}
                      >
                        {isSelected ? "✓" : ""}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${getMethodPillClass(endpoint.method)}`}>
                            {endpoint.method}
                          </span>
                          <span className="truncate font-mono text-sm text-fg-secondary">
                            {endpoint.path}
                          </span>
                        </div>
                        <p className="text-xs text-fg-muted">{endpoint.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 border-t border-stroke pt-4">
                <button
                  type="button"
                  onClick={handleSelectEndpointsSubmit}
                  disabled={selectedEndpoints.length === 0}
                  className="btn-primary w-full px-6 py-3 text-sm font-semibold"
                >
                  Generate Test Workspace
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-2xl font-bold text-fg">API Test Workspace</h2>
                <p className="text-sm text-fg-muted">
                  Generated workspace for your selected endpoints.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-ghost text-sm"
              >
                Back to Selection
              </button>
            </div>

            <div className="glass-panel p-5">
              <label className="mb-2 block text-sm font-medium text-fg-secondary">
                Selected Endpoint to Inspect
              </label>
              <select
                value={activeTestEndpoint ?? ""}
                onChange={(event) => setActiveTestEndpoint(event.target.value)}
                className="w-full px-4 py-3 text-sm"
              >
                {selectedEndpoints.map((id) => {
                  const endpoint = endpoints.find((entry) => entry.id === id);
                  return (
                    <option key={id} value={id}>
                      {endpoint?.method} {endpoint?.path}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedEndpointDetails ? (
              <div className="glass-panel divide-y divide-stroke overflow-hidden">
                <div className="p-6">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded-md px-2.5 py-1 text-[11px] font-bold uppercase ${getMethodPillClass(selectedEndpointDetails.method)}`}>
                      {selectedEndpointDetails.method}
                    </span>
                    <span className="font-mono text-base font-semibold text-fg">
                      {selectedEndpointDetails.path}
                    </span>
                  </div>
                  <p className="text-sm text-fg-muted">{selectedEndpointDetails.description}</p>
                </div>

                <div className="p-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-fg-secondary">Required cURL Command</h3>
                    <button
                      type="button"
                      onClick={() => void copyText(getInterpolatedCurl(selectedEndpointDetails), "Copied cURL to clipboard.")}
                      className="btn-ghost text-xs"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded-xl border border-stroke bg-slate-950/90 px-4 py-4 text-xs text-slate-100">
                    {getInterpolatedCurl(selectedEndpointDetails)}
                  </pre>
                </div>

                {selectedEndpointDetails.body ? (
                  <div className="p-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-fg-secondary">Sample JSON Payload</h3>
                      <button
                        type="button"
                        onClick={() =>
                          void copyText(selectedEndpointDetails.body ?? "", "Copied payload to clipboard.")
                        }
                        className="btn-ghost text-xs"
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="overflow-x-auto rounded-xl border border-stroke bg-slate-950/90 px-4 py-4 text-xs text-slate-100">
                      {selectedEndpointDetails.body}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ApiExplorerPanel;
