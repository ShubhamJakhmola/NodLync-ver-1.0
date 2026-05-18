/**
 * NodLync Media Studio Tab
 *
 * Dedicated workspace for image/video/audio generation.
 * Replaces the old chat-based image/video mode with a proper
 * job-oriented media generation interface.
 */

import { useEffect, useRef } from "react";
import type { ApiVaultItem } from "../../api/apiVaultApi";
import { detectProvider } from "../../api/aiPlaygroundApi";
import { submitMediaJob } from "../../ai/media/engine";
import { resolveMediaAdapter } from "../../ai/media/providers";
import type { MediaJob, MediaModality, MediaModel } from "../../ai/media/types";
import useMediaStore from "../../ai/media/store";
import InlineSpinner from "../../components/InlineSpinner";
import { ApiSelector } from "./components/Selector";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDefaultApiId(aiItems: ApiVaultItem[], defaultProvider: string) {
  const preferred =
    aiItems.find((item) =>
      item.provider.toLowerCase().includes(defaultProvider.toLowerCase()),
    ) ?? aiItems[0];
  return preferred?.id ?? "";
}

// ─── Job Card ────────────────────────────────────────────────────────────────

const MediaJobCard = ({ job }: { job: MediaJob }) => {
  const removeJob = useMediaStore((state) => state.removeJob);
  const timeStr = job.createdAt instanceof Date ? job.createdAt.toLocaleTimeString() : new Date(job.createdAt).toLocaleTimeString();
  
  const mediaSrc = job.result?.url || (job.result?.base64 ? `data:${job.result.mimeType || "image/png"};base64,${job.result.base64}` : null);

  return (
    <div className="glass-panel p-4 flex flex-col gap-3 group relative overflow-visible">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />

      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
              job.status === "completed" ? "bg-emerald-500/20 text-emerald-400" :
              job.status === "failed" ? "bg-rose-500/20 text-rose-400" :
              "bg-primary/20 text-primary animate-pulse"
            }`}>
              {job.status}
            </span>
            <span className="text-[10px] text-fg-muted font-mono">{job.id}</span>
            <span className="text-[10px] text-fg-muted/50">•</span>
            <span className="text-[10px] text-fg-muted">{timeStr}</span>
          </div>
          <p className="text-sm text-fg-secondary font-medium line-clamp-2 leading-relaxed" title={job.prompt}>
            {job.prompt}
          </p>
        </div>
        <button
          onClick={() => removeJob(job.id)}
          className="text-fg-muted hover:text-rose-400 transition-colors p-1"
        >
          ✕
        </button>
      </div>

      {job.status === "completed" && mediaSrc && (
        <div className="relative group/media mt-1">
          {job.modality === "video" ? (
            <video
              src={mediaSrc}
              controls
              className="w-full rounded-xl border border-white/[0.06] shadow-2xl bg-black"
            />
          ) : job.modality === "audio" ? (
            <audio src={mediaSrc} controls className="w-full mt-2" />
          ) : (
            <img
              src={mediaSrc}
              alt={job.prompt}
              className="w-full rounded-xl border border-white/[0.06] shadow-2xl transition-transform group-hover/media:scale-[1.01]"
              loading="lazy"
            />
          )}
          
          <div className="absolute top-3 right-3 opacity-0 group-hover/media:opacity-100 transition-opacity">
            <a
              href={mediaSrc}
              download={`nodlync-${job.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[11px] font-bold text-white hover:bg-black/80 transition shadow-xl"
            >
              <span>Download</span>
            </a>
          </div>
        </div>
      )}

      {job.status === "failed" && (
        <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-3">
          <div className="text-xs text-rose-300 font-bold mb-1 flex items-center gap-2">
            <span>⚠️ Generation Failed</span>
            <span className="text-[10px] opacity-60 font-mono">[{job.error?.kind}]</span>
          </div>
          <p className="text-xs text-rose-400/80 leading-relaxed">{job.error?.message}</p>
          {!!job.error?.raw && (
            <details className="mt-2">
              <summary className="text-[10px] text-rose-500/60 cursor-pointer hover:text-rose-500 transition-colors uppercase font-bold tracking-widest">
                Raw Error Details
              </summary>
              <pre className="mt-2 text-[10px] bg-black/40 p-2 rounded border border-rose-500/10 overflow-x-auto custom-scrollbar text-rose-300/60">
                {JSON.stringify(job.error.raw, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {job.status === "polling" && (
        <div className="flex flex-col gap-2 py-4 items-center justify-center bg-primary/5 rounded-xl border border-primary/10">
          <InlineSpinner />
          <span className="text-xs text-primary font-medium">
            Waiting for {job.provider}... (Attempt {job.pollAttempts})
          </span>
          <p className="text-[10px] text-fg-muted max-w-[200px] text-center">
            Long-running job detected. We are polling the provider for results.
          </p>
        </div>
      )}

      {/* Diagnostics */}
      <details className="group/diag mt-1">
        <summary className="text-[9px] text-fg-muted/40 cursor-pointer hover:text-fg-muted transition-colors uppercase font-bold tracking-widest list-none flex items-center gap-1">
          <span className="group-open/diag:rotate-90 transition-transform">▶</span> Diagnostics
        </summary>
        <div className="mt-2 p-3 bg-black/20 rounded-lg border border-white/[0.04] space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] font-mono">
            <span className="text-fg-muted">Adapter:</span>
            <span className="text-fg-secondary text-right">{job.debug?.adapterId}</span>
            <span className="text-fg-muted">Model:</span>
            <span className="text-fg-secondary text-right">{job.model}</span>
            <span className="text-fg-muted">Endpoint:</span>
            <span className="text-primary/70 text-right truncate" title={job.debug?.resolvedEndpoint}>
              {job.debug?.resolvedEndpoint?.split("/").slice(-1)[0] || "native"}
            </span>
            {job.debug?.contentType && (
              <>
                <span className="text-fg-muted">Content-Type:</span>
                <span className="text-fg-secondary text-right">{job.debug.contentType}</span>
              </>
            )}
          </div>
        </div>
      </details>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const MediaStudioTab = ({
  aiItems,
  defaultProvider,
}: {
  aiItems: ApiVaultItem[];
  defaultProvider: string;
}) => {
  const {
    jobs,
    activeModality,
    prompt,
    apiId,
    model,
    setActiveModality,
    setPrompt,
    setApiId,
    setModel,
    upsertJob,
  } = useMediaStore();

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Init defaults
  useEffect(() => {
    if (!aiItems.length) return;
    if (!apiId || !aiItems.some((item) => item.id === apiId)) {
      const fallback = getDefaultApiId(aiItems, defaultProvider);
      setApiId(fallback);
      const cfg = aiItems.find((i) => i.id === fallback);
      if (cfg) {
        const adapter = resolveMediaAdapter(detectProvider(cfg)?.id ?? "openai");
        const models = adapter.getModels(activeModality);
        if (models[0]) setModel(models[0].value);
      }
    }
  }, [aiItems, apiId, defaultProvider, activeModality, setApiId, setModel]);

  const selectedApi = aiItems.find((item) => item.id === apiId) ?? null;
  const cfg = selectedApi ? detectProvider(selectedApi) : undefined;
  const adapter = resolveMediaAdapter(cfg?.id ?? "openai");
  const availableModels = adapter.getModels(activeModality);
  const selectedModelData = availableModels.find(m => m.value === model);
  
  const isModalitySupported = availableModels.length > 0;
  const canGenerate = !!selectedModelData && (
    (activeModality === 'image' && selectedModelData.capabilities.includes('image_generation')) ||
    (activeModality === 'video' && selectedModelData.capabilities.includes('video_generation')) ||
    (activeModality === 'audio' && selectedModelData.capabilities.includes('audio_generation'))
  );

  // Update model when modality or provider changes
  useEffect(() => {
    const models = adapter.getModels(activeModality);
    if (models.length && !models.some((m: { value: string }) => m.value === model)) {
      setModel(models[0].value);
    } else if (models.length === 0) {
      setModel("");
    }
  }, [activeModality, adapter, model, setModel]);

  const isGenerating = jobs.some(
    (j) => ["queued", "generating", "polling"].includes(j.status),
  );

  async function generate() {
    if (!prompt.trim() || !selectedApi || isGenerating || !canGenerate || !model) return;

    await submitMediaJob(
      {
        apiItem: selectedApi,
        providerId: cfg?.id ?? "openai",
        model,
        modality: activeModality,
        prompt: prompt.trim(),
      },
      (job) => upsertJob(job),
    );
  }

  const modalityJobs = jobs.filter((j) => j.modality === activeModality);

  return (
    <div className="flex flex-col h-full">
      {/* ── Studio Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.04] bg-panel/20 flex-shrink-0 flex-wrap gap-y-1.5">
        {/* Modality Switch */}
        <div className="flex items-center gap-0.5 rounded-full border border-stroke/60 bg-surface/30 p-0.5">
          {(["image", "video", "audio"] as MediaModality[]).map((mod) => (
            <button
              key={mod}
              type="button"
              onClick={() => setActiveModality(mod)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition ${
                activeModality === mod
                  ? "bg-primary text-on-primary"
                  : "text-fg-muted hover:text-fg-secondary"
              }`}
            >
              {mod}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-white/[0.06] mx-1" />

        {/* API Selector */}
        <ApiSelector
          aiItems={aiItems}
          value={apiId}
          onChange={(id) => {
            setApiId(id);
            const item = aiItems.find((i) => i.id === id);
            if (item) {
              const a = resolveMediaAdapter(detectProvider(item)?.id ?? "openai");
              const models = a.getModels(activeModality);
              setModel(models[0]?.value ?? "");
            }
          }}
          compact
          label=""
        />

        {/* Model Selector */}
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={!isModalitySupported || availableModels.length === 0}
          className="bg-surface border border-stroke text-fg-secondary text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary max-w-[200px] truncate disabled:opacity-40"
        >
          {availableModels.map((m: MediaModel) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
          {availableModels.length === 0 && (
            <option value="">No compatible models</option>
          )}
        </select>

        {/* Capability Badges */}
        {selectedModelData?.capabilities && (
          <div className="flex items-center gap-1.5 ml-1">
            {selectedModelData.capabilities.map(cap => (
              <span 
                key={cap} 
                className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border transition-all hover:scale-105 select-none
                  ${cap.includes('generation') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    cap === 'async_job' || cap === 'polling_required' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                    cap === 'experimental' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                    cap === 'vision' || cap === 'image_understanding' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' :
                    'bg-white/5 border-white/10 text-fg-muted'}`}
              >
                {cap.replace('_', ' ')}
              </span>
            ))}
          </div>
        )}

        {cfg && (
          <span className="text-[10px] px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-full font-bold">
            {cfg.label}
          </span>
        )}

        {!isModalitySupported && (
          <span className="text-[10px] text-rose-400 font-bold ml-2">
            ⚠️ No compatible {activeModality} generation models currently available for this provider.
          </span>
        )}
      </div>

      {/* ── Content Area ── */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Generation Results */}
          {modalityJobs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 select-none">
              <div className="text-5xl opacity-10">
                {activeModality === "image" ? "🎨" : activeModality === "video" ? "🎬" : "🎵"}
              </div>
              <p className="text-fg-muted/40 text-sm font-medium">
                {activeModality === "image"
                  ? "Describe an image to generate"
                  : activeModality === "video"
                    ? "Describe a video scene"
                    : "Describe the audio you want"}
              </p>
              {!isModalitySupported && (
                <p className="text-rose-400/60 text-xs text-center max-w-xs">
                  No compatible {activeModality} generation models currently available for {adapter.label}. 
                  Try selecting a different provider like Fal.ai, Replicate, or Stability.
                </p>
              )}
            </div>
          )}

          {modalityJobs.map((job) => (
            <MediaJobCard key={job.id} job={job} />
          ))}
        </div>
      </div>

      {/* ── Generation Composer ── */}
      <div className="flex-shrink-0 border-t border-white/[0.04] bg-panel/30 backdrop-blur-md px-4 lg:px-8 py-3">
        <div className="max-w-3xl mx-auto">
          <div className={`flex items-end gap-2 bg-surface/40 border border-white/[0.06] rounded-2xl px-4 py-2.5 focus-within:border-primary/40 transition-all shadow-lg shadow-black/10 ${!canGenerate ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void generate();
                }
              }}
              placeholder={
                !isModalitySupported 
                  ? "Provider does not support this modality"
                  : activeModality === "image"
                    ? "A futuristic city at sunset, cyberpunk style..."
                    : activeModality === "video"
                      ? "A drone flying over mountains at golden hour..."
                      : "Ambient background music for a sci-fi scene..."
              }
              rows={1}
              disabled={isGenerating || !isModalitySupported}
              className="flex-1 bg-transparent text-sm text-fg resize-none focus:outline-none placeholder:text-fg-muted/40 min-h-[24px] max-h-[120px] leading-relaxed"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
            <button
              onClick={() => void generate()}
              disabled={!prompt.trim() || isGenerating || !isModalitySupported || !model}
              className="flex-shrink-0 h-9 px-4 bg-primary disabled:opacity-20 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition text-sm font-semibold text-on-primary"
            >
              {isGenerating ? (
                <>
                  <InlineSpinner compact />
                  <span>Generating</span>
                </>
              ) : (
                `Generate ${activeModality.charAt(0).toUpperCase() + activeModality.slice(1)}`
              )}
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1">
            <span className="text-[10px] text-fg-muted/40">
              {modalityJobs.filter((j) => j.status === "completed").length} generated
            </span>
            <span className="text-[10px] text-fg-muted/40 font-mono">
              {adapter.label} · {model || "No model selected"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaStudioTab;
