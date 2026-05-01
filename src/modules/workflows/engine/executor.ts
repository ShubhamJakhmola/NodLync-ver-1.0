import type { WorkflowDefinition, WorkflowNode } from "../domain";

export type WorkflowRunStatus = "idle" | "running" | "success" | "failed";

export type NodeLog = {
  nodeId: string;
  ts: string;
  level: "info" | "error";
  message: string;
  data?: unknown;
};

export type NodeRunState = {
  status: WorkflowRunStatus;
  output?: unknown;
  error?: string | null;
};

export type WorkflowRunResult = {
  order: string[];
  outputs: Record<string, unknown>;
  nodeStates: Record<string, NodeRunState>;
  logs: NodeLog[];
};

export type WorkflowNodeHandler = (args: {
  node: WorkflowNode;
  input: unknown;
  outputs: Record<string, unknown>;
  log: (entry: Omit<NodeLog, "ts" | "nodeId"> & { data?: unknown }) => void;
}) => Promise<unknown>;

export type WorkflowExecutorOptions = {
  handlers: Partial<Record<WorkflowNode["type"], WorkflowNodeHandler>>;
  onNodeStateChange?: (nodeId: string, state: NodeRunState) => void;
};

function topoSort(def: WorkflowDefinition): { order: string[]; incoming: Map<string, string[]> } {
  const nodeMap = new Map(def.nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  const indegree = new Map<string, number>();

  for (const node of def.nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
    indegree.set(node.id, 0);
  }

  for (const edge of def.edges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) continue;
    outgoing.get(edge.source)!.push(edge.target);
    incoming.get(edge.target)!.push(edge.source);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of indegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of outgoing.get(id) ?? []) {
      indegree.set(next, (indegree.get(next) ?? 0) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }

  if (order.length !== def.nodes.length) throw new Error("Workflow contains a cycle. DAG execution required.");
  return { order, incoming };
}

const builtInHandlers: Record<string, WorkflowNodeHandler> = {
  trigger: async ({ input, log }) => {
    log({ level: "info", message: "Trigger fired", data: input });
    return input;
  },
  delay: async ({ input, node, log }) => {
    const ms = Number((node.config as any)?.ms ?? 500);
    log({ level: "info", message: `Delay ${ms}ms` });
    await new Promise((resolve) => setTimeout(resolve, ms));
    return input;
  },
  logic: async ({ input, node, log }) => {
    const op = String((node.config as any)?.op ?? "passthrough");
    if (op === "if_equals") {
      const equals = (node.config as any)?.equals;
      const ok = input === equals;
      log({ level: "info", message: `if_equals: ${ok ? "true" : "false"}`, data: { equals } });
      return ok ? input : null;
    }
    return input;
  },
  output: async ({ input, log }) => {
    log({ level: "info", message: "Output", data: input });
    return input;
  },
};

export async function runWorkflow(
  def: WorkflowDefinition,
  input: unknown,
  opts: WorkflowExecutorOptions
): Promise<WorkflowRunResult> {
  const nodeMap = new Map(def.nodes.map((n) => [n.id, n]));
  const { order, incoming } = topoSort(def);

  const logs: NodeLog[] = [];
  const outputs: Record<string, unknown> = {};
  const nodeStates: Record<string, NodeRunState> = Object.fromEntries(
    def.nodes.map((n) => [n.id, { status: "idle", error: null }])
  );

  const pushLog = (nodeId: string, entry: Omit<NodeLog, "ts" | "nodeId">) => {
    logs.push({ ...entry, nodeId, ts: new Date().toISOString() });
  };

  const handlers = { ...builtInHandlers, ...(opts.handlers as any) };

  for (const nodeId of order) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;
    const deps = incoming.get(nodeId) ?? [];
    let nodeInput: unknown = input;
    if (deps.length === 1) nodeInput = outputs[deps[0]];
    if (deps.length > 1) nodeInput = Object.fromEntries(deps.map((id) => [id, outputs[id]]));

    nodeStates[nodeId] = { status: "running", error: null };
    opts.onNodeStateChange?.(nodeId, nodeStates[nodeId]);

    const log = (entry: Omit<NodeLog, "ts" | "nodeId">) => pushLog(nodeId, entry);

    try {
      const handler = handlers[node.type];
      if (!handler) {
        log({ level: "info", message: `No handler for node type "${node.type}" (passthrough)` });
        outputs[nodeId] = nodeInput;
      } else {
        outputs[nodeId] = await handler({ node, input: nodeInput, outputs, log });
      }
      nodeStates[nodeId] = { status: "success", output: outputs[nodeId], error: null };
      opts.onNodeStateChange?.(nodeId, nodeStates[nodeId]);
    } catch (err: any) {
      const message = err?.message ?? "Node execution failed.";
      log({ level: "error", message, data: err });
      nodeStates[nodeId] = { status: "failed", error: message };
      opts.onNodeStateChange?.(nodeId, nodeStates[nodeId]);
      return { order, outputs, nodeStates, logs };
    }
  }

  return { order, outputs, nodeStates, logs };
}

