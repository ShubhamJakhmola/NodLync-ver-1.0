import { useState } from "react";
import type { Project } from "../../../types";
import { formatDateTime } from "../../../utils/format";

interface Props {
  project: Project;
  onGenerateReport: (type: "today" | "full") => Promise<string>;
}

const ReportsCard = ({ project, onGenerateReport }: Props) => {
  const [generating, setGenerating] = useState<"today" | "full" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleGenerate = async (type: "today" | "full") => {
    setGenerating(type);
    const content = await onGenerateReport(type);
    setPreview(content);
    setGenerating(null);
  };

  const handleExport = () => {
    if (!preview) return;
    const blob = new Blob([preview], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "_")}_report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-panel p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-base">📄</span>
        <h3 className="font-semibold text-slate-200 text-sm">Quick Reports</h3>
      </div>

      {/* Report options */}
      <div className="space-y-2">
        <button
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-700 hover:border-primary/50 hover:bg-slate-800/50 transition group"
          onClick={() => handleGenerate("today")}
          disabled={!!generating}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <span className="text-xs">📅</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-slate-200 group-hover:text-primary transition">
                Today's Report
              </p>
              <p className="text-xs text-slate-500">
                Daily work log summary
              </p>
            </div>
          </div>
          {generating === "today" ? (
            <span className="text-xs text-slate-500 animate-pulse">Generating…</span>
          ) : (
            <svg className="w-4 h-4 text-slate-500 group-hover:text-primary transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>

        <button
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-700 hover:border-primary/50 hover:bg-slate-800/50 transition group"
          onClick={() => handleGenerate("full")}
          disabled={!!generating}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center">
              <span className="text-xs">📊</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-slate-200 group-hover:text-accent transition">
                Full Project Report
              </p>
              <p className="text-xs text-slate-500">
                Complete project overview
              </p>
            </div>
          </div>
          {generating === "full" ? (
            <span className="text-xs text-slate-500 animate-pulse">Generating…</span>
          ) : (
            <svg className="w-4 h-4 text-slate-500 group-hover:text-accent transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Preview */}
      {preview ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Preview
          </p>
          <div className="rounded-lg border border-slate-700 bg-surface p-3 max-h-36 overflow-y-auto">
            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
              {preview}
            </pre>
          </div>
          <button
            className="w-full btn-ghost text-sm flex items-center justify-center gap-1.5"
            onClick={handleExport}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export as TXT
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-700 p-4 text-center">
          <p className="text-xs text-slate-600">
            Select a report type above to preview
          </p>
        </div>
      )}

      <p className="text-[10px] text-slate-600 text-center">
        Generated: {formatDateTime(project.updated_at ?? project.created_at ?? "")}
      </p>
    </div>
  );
};

export default ReportsCard;
