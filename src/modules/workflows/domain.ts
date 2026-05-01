export type WorkflowSourceType = "manual" | "imported" | "ai_generated";

export type WorkflowNodeKind = "trigger" | "api" | "logic" | "delay" | "output";

export type WorkflowEdge = {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

export type WorkflowNode<TConfig = Record<string, unknown>> = {
  id: string;
  type: WorkflowNodeKind;
  config: TConfig;
  position?: { x: number; y: number };
};

export type WorkflowDefinition = {
  version: 1;
  name?: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  meta?: {
    source_type?: WorkflowSourceType;
    imported_from?: "n8n" | "custom";
    created_by_model?: string;
  };
};

export function isWorkflowDefinition(value: unknown): value is WorkflowDefinition {
  if (!value || typeof value !== "object") return false;
  const v = value as any;
  return v.version === 1 && Array.isArray(v.nodes) && Array.isArray(v.edges);
}

export function createEmptyWorkflowDefinition(
  name = "New Workflow",
  sourceType: WorkflowSourceType = "manual"
): WorkflowDefinition {
  return {
    version: 1,
    name,
    nodes: [
      {
        id: "trigger_1",
        type: "trigger",
        config: { kind: "manual" },
        position: { x: 80, y: 80 },
      },
      {
        id: "output_1",
        type: "output",
        config: { format: "json" },
        position: { x: 380, y: 80 },
      },
    ],
    edges: [{ id: "e_trigger_1_output_1", source: "trigger_1", target: "output_1" }],
    meta: { source_type: sourceType },
  };
}

