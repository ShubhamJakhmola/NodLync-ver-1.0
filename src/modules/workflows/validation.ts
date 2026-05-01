import type { WorkflowDefinition, WorkflowNode } from "./domain";

export type WorkflowValidationIssue = { level: "error" | "warning"; message: string };

export function validateWorkflow(def: WorkflowDefinition): WorkflowValidationIssue[] {
  const issues: WorkflowValidationIssue[] = [];
  const nodeIds = new Set(def.nodes.map((n) => n.id));

  if (def.nodes.length === 0) issues.push({ level: "error", message: "Workflow has no nodes." });

  for (const edge of def.edges) {
    if (!nodeIds.has(edge.source)) issues.push({ level: "error", message: `Edge source missing: ${edge.source}` });
    if (!nodeIds.has(edge.target)) issues.push({ level: "error", message: `Edge target missing: ${edge.target}` });
  }

  const triggers = def.nodes.filter((n) => n.type === "trigger");
  if (triggers.length === 0) issues.push({ level: "warning", message: "No trigger node found." });

  const cycle = findCycle(def.nodes, def.edges);
  if (cycle) issues.push({ level: "error", message: `Cycle detected: ${cycle.join(" → ")}` });

  for (const node of def.nodes) {
    issues.push(...validateNode(node));
  }

  return issues;
}

function validateNode(node: WorkflowNode): WorkflowValidationIssue[] {
  const issues: WorkflowValidationIssue[] = [];
  if (!node.id) issues.push({ level: "error", message: "Node is missing id." });
  if (!node.type) issues.push({ level: "error", message: `Node ${node.id || "(unknown)"} is missing type.` });

  if (node.type === "api") {
    const apiKeyId = (node.config as any)?.apiKeyId;
    const request = (node.config as any)?.request;
    if (!apiKeyId) issues.push({ level: "error", message: `API node ${node.id} missing apiKeyId.` });
    if (!request || typeof request !== "object") issues.push({ level: "error", message: `API node ${node.id} missing request config.` });
  }

  return issues;
}

function findCycle(nodes: WorkflowNode[], edges: { source: string; target: string }[]): string[] | null {
  const outgoing = new Map<string, string[]>();
  for (const node of nodes) outgoing.set(node.id, []);
  for (const e of edges) outgoing.get(e.source)?.push(e.target);

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const dfs = (id: string): string[] | null => {
    if (visiting.has(id)) {
      const idx = stack.indexOf(id);
      return idx >= 0 ? [...stack.slice(idx), id] : [id, id];
    }
    if (visited.has(id)) return null;
    visiting.add(id);
    stack.push(id);
    for (const next of outgoing.get(id) ?? []) {
      const found = dfs(next);
      if (found) return found;
    }
    stack.pop();
    visiting.delete(id);
    visited.add(id);
    return null;
  };

  for (const node of nodes) {
    const found = dfs(node.id);
    if (found) return found;
  }
  return null;
}

