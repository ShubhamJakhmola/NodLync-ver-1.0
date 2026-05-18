import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ApiVaultItem } from "../../../api/apiVaultApi";
import {
  detectProvider,
  fetchNvidiaModels,
  fetchOpenRouterModels,
  fetchProviderModelsFromEndpoint,
  getModelOptions,
  sortModelsPreferFree,
} from "../../../api/aiPlaygroundApi";
import type { PlaygroundMode } from "../../../api/aiPlaygroundApi";

const MODEL_FAVORITES_KEY = "nodlync:model-favorites";
const MODEL_RECENTS_KEY = "nodlync:model-recents";

function readStoredList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function writeStoredList(key: string, values: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(values));
}

export const getModelTagClass = (tag: string) => {
  switch (tag) {
    case "CHAT": return "border-emerald-500/30 bg-emerald-500/12 text-emerald-300";
    case "IMG": return "border-sky-500/30 bg-sky-500/12 text-sky-300";
    case "VIDEO": return "border-violet-500/30 bg-violet-500/12 text-violet-300";
    case "CODE": return "border-amber-500/30 bg-amber-500/12 text-amber-300";
    case "REASON": return "border-fuchsia-500/30 bg-fuchsia-500/12 text-fuchsia-300";
    case "FAST": return "border-teal-500/30 bg-teal-500/12 text-teal-300";
    case "HEAVY": return "border-rose-500/30 bg-rose-500/12 text-rose-300";
    case "FREE": return "border-cyan-500/30 bg-cyan-500/12 text-cyan-300";
    case "SAFE": return "border-orange-500/30 bg-orange-500/12 text-orange-300";
    default: return "border-stroke bg-panel/60 text-fg-muted";
  }
};

export const ApiSelector = ({
  aiItems,
  value,
  onChange,
  label = "API Key",
  compact = false,
}: {
  aiItems: ApiVaultItem[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  compact?: boolean;
}) => {
  const selected = aiItems.find((item) => item.id === value);
  const cfg = selected ? detectProvider(selected) : undefined;

  return (
    <div className={`flex items-center gap-2 min-w-0 ${compact ? "" : "flex-wrap"}`}>
      {label && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-fg-muted whitespace-nowrap">
          {label}
        </span>
      )}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 w-full max-w-[260px] truncate rounded-xl border border-stroke bg-surface px-3 py-2 text-xs text-fg-secondary focus:border-primary focus:outline-none"
      >
        {aiItems.map((item) => (
          <option key={item.id} value={item.id}>
            {item.key_name} ({item.provider})
          </option>
        ))}
      </select>
      {cfg && !compact && (
        <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary whitespace-nowrap">
          {cfg.label}
        </span>
      )}
    </div>
  );
};

export const ModelSelector = ({
  apiId,
  aiItems,
  value,
  onChange,
  mode,
  compact = false,
}: {
  apiId: string;
  aiItems: ApiVaultItem[];
  value: string;
  onChange: (model: string) => void;
  mode?: PlaygroundMode;
  compact?: boolean;
}) => {
  const selected = aiItems.find((item) => item.id === apiId);
  const cfg = selected ? detectProvider(selected) : undefined;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [openRouterModels, setOpenRouterModels] = useState<any[]>([]);
  const [nvidiaModels, setNvidiaModels] = useState<any[]>([]);
  const [endpointModels, setEndpointModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() => readStoredList(MODEL_FAVORITES_KEY));
  const [recentModels, setRecentModels] = useState<string[]>(() => readStoredList(MODEL_RECENTS_KEY));

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      if (!selected || !cfg?.baseUrl) {
        if (!cancelled) {
          setOpenRouterModels([]);
          setNvidiaModels([]);
          setEndpointModels([]);
          setLoading(false);
        }
        return;
      }

      if (cfg.id === "openrouter") {
        setLoading(true);
        try {
          const models = await fetchOpenRouterModels();
          if (!cancelled) {
            setOpenRouterModels(models);
            setNvidiaModels([]);
            setEndpointModels([]);
          }
        } catch (error: any) {
          console.error("Failed to load OpenRouter models", error);
          if (!cancelled) setOpenRouterModels([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      if (cfg.id === "nvidia") {
        setLoading(true);
        try {
          const models = await fetchNvidiaModels();
          if (!cancelled) {
            setNvidiaModels(models);
            setOpenRouterModels([]);
            setEndpointModels([]);
          }
        } catch (error: any) {
          console.error("Failed to load NVIDIA models", error);
          if (!cancelled) setNvidiaModels([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const models = await fetchProviderModelsFromEndpoint({ apiItem: selected, baseUrl: cfg.baseUrl });
        if (!cancelled) {
          setEndpointModels(models);
          setOpenRouterModels([]);
          setNvidiaModels([]);
        }
      } catch (error: any) {
        console.error("Failed to load provider models", error);
        if (!cancelled) setEndpointModels([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadModels();
    return () => {
      cancelled = true;
    };
  }, [cfg?.baseUrl, cfg?.id, selected]);

  useEffect(() => {
    if (!isOpen) {
      setDropdownPosition(null);
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node) && !buttonRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    // Calculate dropdown position
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.min(620, window.innerWidth - 32),
      });
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const baseOptions =
    cfg?.id === "openrouter" && openRouterModels.length > 0
      ? openRouterModels
      : cfg?.id === "nvidia" && nvidiaModels.length > 0
        ? nvidiaModels
        : endpointModels.length > 0
          ? endpointModels
          : getModelOptions(cfg?.id ?? "openai");

  const modeFilteredOptions = sortModelsPreferFree(baseOptions).filter((option) => {
    if (!mode) return true;
    const tags = option.tags ?? [];
    if (mode === "image") return tags.includes("IMG");
    if (mode === "video") return tags.includes("VIDEO");
    if (mode === "code") return tags.includes("CODE") || tags.includes("CHAT");
    if (mode === "research") return tags.includes("REASON") || tags.includes("CHAT");
    return true;
  });

  const searchTerm = search.trim().toLowerCase();
  const searchableOptions = (modeFilteredOptions.length > 0 ? modeFilteredOptions : sortModelsPreferFree(baseOptions)).filter((option) => {
    if (!searchTerm) return true;
    return `${option.label} ${option.value} ${(option.tags ?? []).join(" ")}`.toLowerCase().includes(searchTerm);
  });

  const options = [...searchableOptions].sort((left, right) => {
    const leftFavorite = favorites.includes(left.value) ? 1 : 0;
    const rightFavorite = favorites.includes(right.value) ? 1 : 0;
    if (leftFavorite !== rightFavorite) return rightFavorite - leftFavorite;

    const leftRecent = recentModels.indexOf(left.value);
    const rightRecent = recentModels.indexOf(right.value);
    if (leftRecent !== -1 || rightRecent !== -1) {
      if (leftRecent === -1) return 1;
      if (rightRecent === -1) return -1;
      return leftRecent - rightRecent;
    }

    return 0;
  });

  const selectedOption = (modeFilteredOptions.length > 0 ? modeFilteredOptions : sortModelsPreferFree(baseOptions)).find(
    (option) => option.value === value,
  );

  function toggleFavorite(modelValue: string) {
    const next = favorites.includes(modelValue)
      ? favorites.filter((entry) => entry !== modelValue)
      : [modelValue, ...favorites].slice(0, 12);
    setFavorites(next);
    writeStoredList(MODEL_FAVORITES_KEY, next);
  }

  function selectModel(modelValue: string) {
    onChange(modelValue);
    setIsOpen(false);
    const nextRecents = [modelValue, ...recentModels.filter((entry) => entry !== modelValue)].slice(0, 8);
    setRecentModels(nextRecents);
    writeStoredList(MODEL_RECENTS_KEY, nextRecents);
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "flex-wrap"}`}>
      {!compact && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-fg-muted whitespace-nowrap">
          Model
        </span>
      )}
      <div ref={dropdownRef} className="relative flex min-w-0 flex-col gap-1 overflow-visible">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => !loading && setIsOpen((current) => !current)}
          className={`flex min-w-0 w-full items-center justify-between gap-3 rounded-xl border bg-surface px-3 py-2 text-sm transition ${
            isOpen ? "border-primary" : "border-stroke"
          } ${loading ? "cursor-wait text-fg-muted" : "text-fg-secondary"}`}
          disabled={loading}
        >
          <span className="max-w-[260px] truncate text-left">
            {selectedOption?.label ?? "Select model"}
          </span>
          <span className="text-[10px] text-fg-muted">{isOpen ? "^" : "v"}</span>
        </button>
      </div>

      {isOpen && !loading && dropdownPosition && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[10000] rounded-2xl border border-stroke-strong bg-panel shadow-2xl"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
        >
          <div className="border-b border-white/[0.06] p-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search models"
              className="w-full rounded-xl border border-white/[0.08] bg-surface/80 px-3 py-2.5 text-sm text-fg-secondary outline-none transition placeholder:text-fg-muted focus:border-primary"
            />
          </div>
          <div className="max-h-72 overflow-y-auto custom-scrollbar py-1">
            {options.length === 0 ? (
              <div className="px-3 py-5 text-center text-xs text-fg-muted">
                No models match this search.
              </div>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectModel(option.value)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition ${
                    option.value === value ? "bg-primary/10 text-primary" : "text-fg-secondary hover:bg-surface/70"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-sm">{option.label}</span>
                  <span className="flex flex-shrink-0 flex-wrap justify-end gap-1">
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavorite(option.value);
                      }}
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${
                        favorites.includes(option.value)
                          ? "border-primary/20 bg-primary/10 text-primary"
                          : "border-white/[0.08] bg-surface/70 text-fg-muted"
                      }`}
                    >
                      {favorites.includes(option.value) ? "Fav" : "Star"}
                    </span>
                    {recentModels.includes(option.value) && (
                      <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-surface/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-fg-muted">
                        Recent
                      </span>
                    )}
                    {option.tags?.map((tag: string) => (
                      <span
                        key={`${option.value}-${tag}`}
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${getModelTagClass(tag)}`}
                      >
                        {tag}
                      </span>
                    ))}
                    {option.capabilities?.map((cap: string) => (
                      <span
                        key={`${option.value}-${cap}`}
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${
                          cap.includes("generation")
                            ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-300"
                            : cap === "async_job" || cap === "polling_required"
                              ? "border-amber-500/30 bg-amber-500/12 text-amber-300"
                              : cap === "experimental"
                                ? "border-rose-500/30 bg-rose-500/12 text-rose-300"
                                : cap === "vision" || cap === "image_understanding"
                                  ? "border-sky-500/30 bg-sky-500/12 text-sky-300"
                                  : "border-stroke bg-panel/60 text-fg-muted"
                        }`}
                      >
                        {cap.replace("_", " ")}
                      </span>
                    ))}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
