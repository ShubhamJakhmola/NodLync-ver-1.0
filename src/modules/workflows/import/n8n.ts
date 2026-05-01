import type { WorkflowDefinition } from "../domain";

type N8nWorkflow = {
  name?: string;
  nodes?: Array<{ id?: string; name?: string; type?: string; position?: [number, number]; parameters?: any }>;
  connections?: Record<string, any>;
};

export function parseN8nJson(raw: unknown): { name: string; definition: WorkflowDefinition } {
  if (!raw || typeof raw !== "object") throw new Error("Invalid JSON.");
  const wf = raw as N8nWorkflow;
  const name = String(wf.name || "Imported Workflow").trim() || "Imported Workflow";
  const nodes = Array.isArray(wf.nodes) ? wf.nodes : [];

  const mappedNodes = nodes.map((n, idx) => ({
    id: String(n.id || n.name || `node_${idx + 1}`),
    type: "logic" as const,
    config: {
      op: "passthrough",
      imported: { n8n_type: n.type, parameters: n.parameters },
      label: n.name || n.type || "Node",
    },
    position: n.position ? { x: Number(n.position[0] ?? 0), y: Number(n.position[1] ?? 0) } : { x: 80 + idx * 220, y: 120 },
  }));

  const definition: WorkflowDefinition = {
    version: 1,
    name,
    nodes: [
      { id: "trigger_1", type: "trigger", config: { kind: "manual" }, position: { x: 80, y: 80 } },
      ...mappedNodes,
      { id: "output_1", type: "output", config: { format: "json" }, position: { x: 80 + (mappedNodes.length + 1) * 220, y: 80 } },
    ],
    edges: [
      ...(mappedNodes.length > 0
        ? [{ id: "e_trigger_1_first", source: "trigger_1", target: mappedNodes[0].id }]
        : [{ id: "e_trigger_1_output_1", source: "trigger_1", target: "output_1" }]),
      ...mappedNodes.map((n, idx) =>
        idx < mappedNodes.length - 1
          ? ({ id: `e_${n.id}_${mappedNodes[idx + 1].id}`, source: n.id, target: mappedNodes[idx + 1].id } as const)
          : ({ id: `e_${n.id}_output_1`, source: n.id, target: "output_1" } as const)
      ),
    ],
    meta: { source_type: "imported", imported_from: "n8n" },
  };

  return { name, definition };
}

