import { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  ConnectionMode,
} from "reactflow";
import "reactflow/dist/style.css";
import type { WorkflowDefinition, WorkflowNode } from "../domain";
import { validateWorkflow } from "../validation";
import { runWorkflow } from "../engine/executor";
import { vaultHttpRequest } from "../../../api/workflowRuntimeApi";

type Props = {
  mode: "draft" | "record";
  record: { id: string; name: string; source_type: string } | null;
  initialDefinition: WorkflowDefinition;
  onChangeDefinition: (def: WorkflowDefinition) => void;
  onSave: (def: WorkflowDefinition) => void;
  onSaveExisting: (def: WorkflowDefinition) => void;
  onClose?: () => void;
  presentation?: "inline" | "overlay";
};

const nodeTypeLabel: Record<string, string> = {
  trigger: "Trigger",
  api: "API",
  logic: "Logic",
  delay: "Delay",
  output: "Output",
};

const WorkflowWorkspace = ({
  mode,
  record,
  initialDefinition,
  onChangeDefinition,
  onSaveExisting,
  onClose,
  presentation,
}: Props) => {
  const [activeTab, setActiveTab] = useState<"visual" | "json">("visual");
  const [def, setDef] = useState<WorkflowDefinition>(initialDefinition);
  const [jsonText, setJsonText] = useState<string>(() => JSON.stringify(initialDefinition, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [issues, setIssues] = useState(() => validateWorkflow(initialDefinition));

  const [nodes, setNodes] = useState<Node[]>(() => toReactFlowNodes(initialDefinition));
  const [edges, setEdges] = useState<Edge[]>(() => toReactFlowEdges(initialDefinition));

  const [runInput, setRunInput] = useState<string>('{"sample":"input"}');
  const [running, setRunning] = useState(false);
  const [runLogs, setRunLogs] = useState<string[]>([]);

  useEffect(() => {
    setDef(initialDefinition);
    setJsonText(JSON.stringify(initialDefinition, null, 2));
    setNodes(toReactFlowNodes(initialDefinition));
    setEdges(toReactFlowEdges(initialDefinition));
    setIssues(validateWorkflow(initialDefinition));
  }, [initialDefinition]);

  const headerTitle = mode === "record" ? record?.name ?? "Workflow" : "Draft Workflow";
  const layout: "inline" | "overlay" = presentation ?? (mode === "record" ? "overlay" : "inline");

  const addNode = (type: WorkflowNode["type"]) => {
    const id = `${type}_${crypto.randomUUID().slice(0, 8)}`;
    const position = { x: 120 + nodes.length * 40, y: 120 + nodes.length * 20 };
    const next: Node = {
      id,
      type: "default",
      position,
      data: { label: nodeTypeLabel[type] ?? type, type, config: defaultConfig(type) },
    };
    const nextNodes = [...nodes, next];
    setNodes(nextNodes);
    syncFromGraph(nextNodes, edges);
  };

  const onNodesChange: OnNodesChange = (changes) => {
    const next = applyNodeChanges(changes, nodes);
    setNodes(next);
    syncFromGraph(next, edges);
  };

  const onEdgesChange: OnEdgesChange = (changes) => {
    const next = applyEdgeChanges(changes, edges);
    setEdges(next);
    syncFromGraph(nodes, next);
  };

  const onConnect: OnConnect = (params) => {
    const next = addEdge(
      {
        ...params,
        id: `e_${crypto.randomUUID().slice(0, 8)}`,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#60a5fa" },
        style: { stroke: "#60a5fa", strokeWidth: 2 },
      },
      edges
    );
    setEdges(next);
    syncFromGraph(nodes, next);
  };

  const syncFromGraph = (nextNodes: Node[], nextEdges: Edge[]) => {
    const nextDef = fromReactFlow(nextNodes, nextEdges, def);
    setDef(nextDef);
    setJsonText(JSON.stringify(nextDef, null, 2));
    setIssues(validateWorkflow(nextDef));
    onChangeDefinition(nextDef);
  };

  const applyJsonToGraph = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON.");
      if (parsed.version !== 1 || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        throw new Error("JSON does not match workflow schema.");
      }
      const nextDef = parsed as WorkflowDefinition;
      setJsonError(null);
      setDef(nextDef);
      setNodes(toReactFlowNodes(nextDef));
      setEdges(toReactFlowEdges(nextDef));
      setIssues(validateWorkflow(nextDef));
      onChangeDefinition(nextDef);
    } catch (e: any) {
      setJsonError(e?.message ?? "Invalid JSON.");
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setRunLogs([]);
    let parsedInput: unknown = runInput;
    try {
      parsedInput = JSON.parse(runInput);
    } catch {
      // allow plain text
    }

    const result = await runWorkflow(def, parsedInput, {
      handlers: {
        api: async ({ node, input, log }) => {
          const apiKeyId = (node.config as any)?.apiKeyId;
          const request = (node.config as any)?.request;
          if (!apiKeyId) throw new Error("API node missing config.apiKeyId");
          if (!request?.url) throw new Error("API node missing config.request.url");
          log({ level: "info", message: `HTTP ${request.method || "GET"} ${request.url}` });
          const { data, error } = await vaultHttpRequest(apiKeyId, {
            url: String(request.url),
            method: request.method,
            headers: request.headers,
            body: request.body ?? input,
            auth: request.auth,
          });
          if (error) throw new Error(error.message ?? "HTTP request failed");
          return data?.body ?? null;
        },
      },
    });

    setRunLogs(result.logs.map((l) => `${l.ts} [${l.nodeId}] ${l.level.toUpperCase()}: ${l.message}`));
    setRunning(false);
  };

  const canSave = useMemo(() => issues.every((i) => i.level !== "error"), [issues]);

  const saveLabel = mode === "record" ? "Save Changes" : "Save Draft";

  const save = () => {
    if (!canSave) return;
    onSaveExisting(def);
  };

  return (
    <div className={layout === "overlay" ? "fixed inset-0 z-[100] bg-black/60 backdrop-blur-3xl p-6" : "h-full"}>
      <div
        className={
          layout === "overlay"
            ? "mx-auto h-[90vh] max-w-7xl rounded-[2.5rem] border border-stroke bg-panel/70 overflow-hidden flex flex-col"
            : "h-full flex flex-col"
        }
      >
        <div className="p-6 border-b border-stroke flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xl font-black tracking-tight truncate">{headerTitle}</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-fg-muted">
              Visual + JSON editor · Execution-ready DAG
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("visual")}
              className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${
                activeTab === "visual"
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-panel border-stroke text-fg-muted hover:text-fg"
              }`}
            >
              Visual
            </button>
            <button
              onClick={() => setActiveTab("json")}
              className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${
                activeTab === "json"
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-panel border-stroke text-fg-muted hover:text-fg"
              }`}
            >
              JSON
            </button>
            <button
              onClick={save}
              disabled={!canSave}
              className="px-3 py-2 rounded-xl border border-stroke bg-panel text-[10px] font-black uppercase tracking-widest text-fg-muted hover:text-primary hover:border-primary/40 disabled:opacity-50"
            >
              {saveLabel}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-xl border border-stroke bg-panel text-[10px] font-black uppercase tracking-widest text-fg-muted hover:text-fg"
              >
                Close
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_380px] overflow-hidden">
          <div className="relative border-r border-stroke bg-panel/20">
            {activeTab === "visual" ? (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                connectionMode={ConnectionMode.Loose}
                fitView
              >
                <Background />
                <Controls />
              </ReactFlow>
            ) : (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-stroke flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase tracking-widest text-fg-muted">Workflow JSON</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(jsonText)}
                      className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                    >
                      Copy
                    </button>
                    <button
                      onClick={applyJsonToGraph}
                      className="text-[10px] font-black uppercase tracking-widest text-fg-muted hover:text-fg"
                    >
                      Apply
                    </button>
                  </div>
                </div>
                {jsonError && (
                  <div className="p-3 text-xs text-rose-200 border-b border-rose-500/30 bg-rose-500/10">{jsonError}</div>
                )}
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="flex-1 w-full bg-panel/50 p-6 font-mono text-[12px] text-fg outline-none custom-scrollbar"
                />
              </div>
            )}
          </div>

          <aside className="bg-panel/40 p-5 overflow-auto custom-scrollbar">
            <div className="flex flex-wrap gap-2">
              {(["trigger", "api", "logic", "delay", "output"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => addNode(t)}
                  className="px-3 py-2 rounded-xl border border-stroke bg-panel text-[10px] font-black uppercase tracking-widest text-fg-muted hover:text-primary hover:border-primary/40"
                >
                  + {nodeTypeLabel[t]}
                </button>
              ))}
            </div>

            <div className="mt-6">
              <div className="text-[10px] font-black uppercase tracking-widest text-fg-muted">Validation</div>
              {issues.length === 0 ? (
                <div className="mt-2 text-xs text-emerald-300">Looks good.</div>
              ) : (
                <ul className="mt-2 space-y-2">
                  {issues.slice(0, 8).map((i, idx) => (
                    <li
                      key={idx}
                      className={`rounded-xl border p-3 text-xs ${
                        i.level === "error"
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                      }`}
                    >
                      {i.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-8">
              <div className="text-[10px] font-black uppercase tracking-widest text-fg-muted">Run</div>
              <textarea
                value={runInput}
                onChange={(e) => setRunInput(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-xl border border-stroke bg-panel px-4 py-3 text-xs font-mono text-fg outline-none"
              />
              <button
                onClick={() => void handleRun()}
                disabled={running || !canSave}
                className="mt-2 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-50"
              >
                {running ? "Running..." : "Run Workflow"}
              </button>

              <div className="mt-4 text-[10px] font-black uppercase tracking-widest text-fg-muted">Logs</div>
              <div className="mt-2 rounded-2xl border border-stroke bg-panel/30 p-3 text-[11px] text-fg-muted font-mono whitespace-pre-wrap">
                {runLogs.length ? runLogs.slice(-16).join("\n") : "No logs yet."}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

function defaultConfig(type: WorkflowNode["type"]): Record<string, unknown> {
  if (type === "delay") return { ms: 500 };
  if (type === "logic") return { op: "passthrough" };
  if (type === "api") return { apiKeyId: "", request: { url: "", method: "GET", headers: {}, auth: { scheme: "bearer" } } };
  if (type === "trigger") return { kind: "manual" };
  if (type === "output") return { format: "json" };
  return {};
}

function toReactFlowNodes(def: WorkflowDefinition): Node[] {
  return def.nodes.map((n) => ({
    id: n.id,
    type: "default",
    position: n.position ?? { x: 100, y: 100 },
    data: { label: nodeTypeLabel[n.type] ?? n.type, type: n.type, config: n.config },
  }));
}

function toReactFlowEdges(def: WorkflowDefinition): Edge[] {
  return def.edges.map((e, idx) => ({
    id: e.id || `e_${idx}`,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#60a5fa" },
    style: { stroke: "#60a5fa", strokeWidth: 2 },
  }));
}

function fromReactFlow(nodes: Node[], edges: Edge[], prev: WorkflowDefinition): WorkflowDefinition {
  return {
    ...prev,
    version: 1,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: ((n.data as any)?.type ?? "logic") as any,
      config: ((n.data as any)?.config ?? {}) as any,
      position: n.position,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
    })),
  };
}

export default WorkflowWorkspace;
