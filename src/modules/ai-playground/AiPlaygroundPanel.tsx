import { useEffect, useRef, useState } from "react";
import { getApiVaultItems, type ApiVaultItem } from "../../api/apiVaultApi";
import {
  detectProvider,
  fetchNvidiaModels,
  fetchOpenRouterModels,
  getDefaultModel,
  getModelOptions,
  sendChatMessage,
  sortModelsPreferFree,
  type ChatMessage,
  type ModelOption,
} from "../../api/aiPlaygroundApi";
import {
  deleteLikedIdea,
  getLikedIdeas,
  saveLikedIdea,
  type LikedIdea,
} from "../../api/likedIdeasApi";
import { createUserItem } from "../../api/userItemsApi";
import InlineSpinner from "../../components/InlineSpinner";
import ModuleHeader from "../../components/ModuleHeader";
import GeneratedText from "../../components/GeneratedText";
import useAppStore from "../../store/useAppStore";
import usePlaygroundStore, {
  type PlaygroundIdeaItem,
  type PlaygroundResearchColumn,
  type PlaygroundTabId,
} from "../../store/usePlaygroundStore";
import { Link } from "react-router-dom";
import { normalizeGeneratedText } from "../../utils/generatedText";
import { logAppEvent } from "../../utils/appLogger";

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function getModelTagClass(tag: string) {
  switch (tag) {
    case "CHAT":
      return "border-emerald-500/30 bg-emerald-500/12 text-emerald-300";
    case "IMG":
      return "border-sky-500/30 bg-sky-500/12 text-sky-300";
    case "VIDEO":
      return "border-violet-500/30 bg-violet-500/12 text-violet-300";
    case "CODE":
      return "border-amber-500/30 bg-amber-500/12 text-amber-300";
    case "REASON":
      return "border-fuchsia-500/30 bg-fuchsia-500/12 text-fuchsia-300";
    case "FAST":
      return "border-teal-500/30 bg-teal-500/12 text-teal-300";
    case "HEAVY":
      return "border-rose-500/30 bg-rose-500/12 text-rose-300";
    case "FREE":
      return "border-cyan-500/30 bg-cyan-500/12 text-cyan-300";
    case "SAFE":
      return "border-orange-500/30 bg-orange-500/12 text-orange-300";
    default:
      return "border-stroke bg-panel/60 text-fg-muted";
  }
}

function getProviderDefaultModel(apiId: string, aiItems: ApiVaultItem[]) {
  const item = aiItems.find((entry) => entry.id === apiId);
  const cfg = item ? detectProvider(item) : undefined;
  return getModelOptions(cfg?.id ?? "openai")[0]?.value ?? cfg?.defaultModel ?? getDefaultModel(cfg?.id ?? "openai");
}

function getDefaultApiId(aiItems: ApiVaultItem[], defaultProvider: string) {
  const preferred =
    aiItems.find((item) =>
      item.provider.toLowerCase().includes(defaultProvider.toLowerCase())
    ) ?? aiItems[0];
  return preferred?.id ?? "";
}

const NoApiConfigured = () => (
  <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
    <div className="text-4xl opacity-25">AI</div>
    <p className="text-fg-secondary font-semibold">No AI API configured</p>
    <p className="text-fg-muted text-sm max-w-xs">
      Add an AI provider key in <strong className="text-fg-muted">API Vault</strong> to
      unlock the playground.
    </p>
    <Link
      to="/api-vault"
      className="mt-1 inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold hover:brightness-110 transition"
    >
      Open API Vault
    </Link>
  </div>
);

const ApiSelector = ({
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
    <div className={`flex items-center gap-2 ${compact ? "" : "flex-wrap"}`}>
      {label && (
        <span className="text-[10px] text-fg-muted uppercase font-bold tracking-widest whitespace-nowrap">
          {label}
        </span>
      )}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-surface border border-stroke text-fg-secondary text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary min-w-0 max-w-[170px] truncate"
      >
        {aiItems.map((item) => (
          <option key={item.id} value={item.id}>
            {item.key_name} ({item.provider})
          </option>
        ))}
      </select>
      {cfg && (
        <span className="text-[10px] px-2 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full font-bold whitespace-nowrap">
          {cfg.label}
        </span>
      )}
    </div>
  );
};

const ModelSelector = ({
  apiId,
  aiItems,
  value,
  onChange,
  compact = false,
}: {
  apiId: string;
  aiItems: ApiVaultItem[];
  value: string;
  onChange: (model: string) => void;
  compact?: boolean;
}) => {
  const selected = aiItems.find((item) => item.id === apiId);
  const cfg = selected ? detectProvider(selected) : undefined;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [openRouterModels, setOpenRouterModels] = useState<
    ModelOption[]
  >([]);
  const [nvidiaModels, setNvidiaModels] = useState<
    ModelOption[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      if (cfg?.id === "openrouter") {
        setLoading(true);
        try {
          const models = await fetchOpenRouterModels();
          if (!cancelled) {
            setOpenRouterModels(models);
            setNvidiaModels([]);
          }
        } catch (error: any) {
          console.error("Failed to load OpenRouter models", error);
          void logAppEvent({
            type: "error",
            module: "ai-playground.models",
            message: error?.message ?? "Failed to load OpenRouter models.",
          });
          if (!cancelled) setOpenRouterModels([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      if (cfg?.id === "nvidia") {
        setLoading(true);
        try {
          const models = await fetchNvidiaModels();
          if (!cancelled) {
            setNvidiaModels(models);
            setOpenRouterModels([]);
          }
        } catch (error: any) {
          console.error("Failed to load NVIDIA models", error);
          void logAppEvent({
            type: "error",
            module: "ai-playground.models",
            message: error?.message ?? "Failed to load NVIDIA models.",
          });
          if (!cancelled) setNvidiaModels([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setOpenRouterModels([]);
        setNvidiaModels([]);
        setLoading(false);
      }
        return;
    }

    void loadModels();

    return () => {
      cancelled = true;
    };
  }, [cfg?.id]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const baseOptions =
    cfg?.id === "openrouter" && openRouterModels.length > 0
      ? openRouterModels
      : cfg?.id === "nvidia" && nvidiaModels.length > 0
      ? nvidiaModels
      : getModelOptions(cfg?.id ?? "openai");

  const options = sortModelsPreferFree(baseOptions);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "flex-wrap"}`}>
      <span className="text-[10px] text-fg-muted uppercase font-bold tracking-widest whitespace-nowrap">
        Model
      </span>
      <div ref={dropdownRef} className="relative flex flex-col gap-1 min-w-0">
        <button
          type="button"
          onClick={() => !loading && setIsOpen((current) => !current)}
          className={`flex min-w-0 items-center justify-between gap-3 rounded-lg border bg-surface px-2.5 py-1.5 text-xs transition ${
            isOpen ? "border-primary" : "border-stroke"
          } ${loading ? "cursor-wait text-fg-muted" : "text-fg-secondary"}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          disabled={loading}
        >
          <span className="truncate max-w-[220px]">
            {selectedOption?.label ?? "Select model"}
          </span>
          <span className="text-[10px] text-fg-muted">{isOpen ? "▲" : "▼"}</span>
        </button>
        {loading && (
          <div className="absolute right-2 pointer-events-none">
            <InlineSpinner compact />
          </div>
        )}
        {isOpen && !loading ? (
          <div className="absolute left-0 top-full z-30 mt-1 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-stroke-strong bg-panel shadow-2xl">
            <div className="max-h-72 overflow-y-auto custom-scrollbar py-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition ${
                    option.value === value
                      ? "bg-primary/10 text-primary"
                      : "text-fg-secondary hover:bg-surface/70"
                  }`}
                  role="option"
                  aria-selected={option.value === value}
                >
                  <span className="min-w-0 flex-1 truncate text-sm">{option.label}</span>
                  {option.tags?.length ? (
                    <span className="flex flex-shrink-0 flex-wrap justify-end gap-1">
                      {option.tags.map((tag) => (
                        <span
                          key={`${option.value}-${tag}`}
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${getModelTagClass(tag)}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {selectedOption?.tags?.length ? (
          <div className="flex flex-wrap gap-1">
            {selectedOption.tags.map((tag) => (
              <span
                key={`${selectedOption.value}-${tag}`}
                className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] shadow-sm ${getModelTagClass(tag)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const MessageBubble = ({ msg }: { msg: ChatMessage }) => {
  const isUser = msg.role === "user";
  const content = isUser ? msg.content : normalizeGeneratedText(msg.content);
  const isMediaUrl = !isUser && /^(https?:\/\/|data:image\/)/i.test(content.trim());

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2`}>
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs text-primary font-bold mt-0.5">
          AI
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${isUser
            ? "bg-primary text-on-primary font-medium rounded-tr-sm"
            : "bg-surface/80 text-fg-secondary border border-stroke/50 rounded-tl-sm"
          }`}
      >
        {isMediaUrl ? (
          <div className="space-y-3">
            <img src={content.trim()} alt="Generated result" className="max-w-full rounded-xl border border-stroke" />
            <a href={content.trim()} target="_blank" rel="noreferrer" className="block text-xs text-primary hover:underline break-all">
              Open generated media
            </a>
          </div>
        ) : (
          content
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-surface border border-stroke-strong flex items-center justify-center text-xs text-fg-secondary font-bold mt-0.5">
          U
        </div>
      )}
    </div>
  );
};

const TypingDots = () => (
  <div className="flex justify-start gap-2">
    <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs text-primary font-bold">
      AI
    </div>
    <div className="bg-surface/80 border border-stroke/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="w-2 h-2 rounded-full bg-fg-muted animate-bounce"
          style={{ animationDelay: `${index * 0.15}s` }}
        />
      ))}
    </div>
  </div>
);

const AiChatTab = ({
  aiItems,
  defaultProvider,
}: {
  aiItems: ApiVaultItem[];
  defaultProvider: string;
}) => {
  const chat = usePlaygroundStore((state) => state.chat);
  const setChat = usePlaygroundStore((state) => state.setChat);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"chat" | "image" | "video">("chat");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!aiItems.length) return;
    const fallbackApiId = getDefaultApiId(aiItems, defaultProvider);
    if (!chat.apiId || !aiItems.some((item) => item.id === chat.apiId)) {
      setChat({
        apiId: fallbackApiId,
        model: getProviderDefaultModel(fallbackApiId, aiItems),
      });
    }
  }, [aiItems, chat.apiId, defaultProvider, setChat]);

  useEffect(() => {
    if (!chat.apiId || chat.model) return;
    setChat({ model: getProviderDefaultModel(chat.apiId, aiItems) });
  }, [aiItems, chat.apiId, chat.model, setChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages, loading]);

  const selectedApi = aiItems.find((item) => item.id === chat.apiId) ?? null;
  const cfg = selectedApi ? detectProvider(selectedApi) : undefined;
  const lastAssistantMessage =
    [...chat.messages].reverse().find((m) => m.role === "assistant")?.content ?? "";

  function downloadText(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportConversation() {
    const lines: string[] = [];
    lines.push(`# NodLync Chat Export`);
    lines.push(`- Provider: ${cfg?.label ?? "Unknown"}`);
    lines.push(`- Model: ${chat.model || "(unset)"}`);
    lines.push(`- Exported: ${new Date().toISOString()}`);
    lines.push("");
    chat.messages.forEach((m) => {
      lines.push(`## ${m.role.toUpperCase()}`);
      lines.push(m.content);
      lines.push("");
    });
    downloadText(
      `nodlync_chat_${new Date().toISOString().slice(0, 10)}.md`,
      lines.join("\n")
    );
  }

  async function send() {
    if (!chat.input.trim() || !selectedApi || loading) return;

    const userMessage: ChatMessage = {
      id: genId(),
      role: "user",
      content: chat.input.trim(),
      timestamp: new Date(),
    };
    const nextMessages = [...chat.messages, userMessage];

    setChat({
      messages: nextMessages,
      input: "",
      error: null,
    });
    setLoading(true);

    try {
      const reply = await sendChatMessage({
        apiItem: selectedApi,
        model: chat.model,
        messages: nextMessages,
        systemPrompt:
          mode === "chat"
            ? "You are a helpful AI assistant. Be concise and accurate."
            : mode === "image"
            ? "You generate concise image prompts and return only the best prompt or generated media."
            : "You create concise video concepts, storyboards, and shot lists.",
        mode,
      });

      setChat({
        messages: [
          ...nextMessages,
          {
            id: genId(),
            role: "assistant",
            content: normalizeGeneratedText(reply),
            timestamp: new Date(),
          },
        ],
      });

      void logAppEvent({
        type: "success",
        module: "ai-playground.chat",
        message: "Chat response generated.",
        projectId: useAppStore.getState().selectedProject?.id ?? undefined,
        meta: {
          model: chat.model,
          provider: cfg?.id ?? null,
        },
      });
    } catch (error: any) {
      setChat({ error: error?.message ?? "Request failed. Check your API key." });
      void logAppEvent({
        type: "error",
        module: "ai-playground.chat",
        message: error?.message ?? "Chat request failed.",
        projectId: useAppStore.getState().selectedProject?.id ?? undefined,
        meta: {
          model: chat.model,
          provider: cfg?.id ?? null,
        },
      });
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 240px)" }}>
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-stroke bg-panel/30 flex-shrink-0 flex-wrap gap-y-2">
        <div className="flex items-center gap-2 rounded-full border border-stroke bg-surface/50 p-1">
          {[
            { id: "chat", label: "Text" },
            { id: "image", label: "Image" },
            { id: "video", label: "Video" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id as "chat" | "image" | "video")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                mode === option.id
                  ? "bg-primary text-on-primary"
                  : "text-fg-muted hover:text-fg-secondary"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <ApiSelector
          aiItems={aiItems}
          value={chat.apiId}
          onChange={(apiId) =>
            setChat({
              apiId,
              model: getProviderDefaultModel(apiId, aiItems),
            })
          }
        />
        <ModelSelector
          apiId={chat.apiId}
          aiItems={aiItems}
          value={chat.model}
          onChange={(model) => setChat({ model })}
        />
        {cfg?.baseUrl && (
          <span
            className="text-[10px] text-fg-muted font-mono hidden lg:block truncate max-w-[200px]"
            title={cfg.baseUrl}
          >
            {cfg.baseUrl.replace("https://", "")}
          </span>
        )}
        {chat.messages.length > 0 && (
          <button
            onClick={() => setChat({ messages: [], error: null })}
            className="ml-auto text-xs text-fg-muted hover:text-rose-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {chat.error && (
        <div className="mx-4 mt-3 flex-shrink-0 bg-rose-950/40 border border-rose-800/40 rounded-xl px-4 py-3 text-sm text-rose-300 flex items-start gap-3">
          <span className="flex-1">{chat.error}</span>
          <button
            onClick={() => setChat({ error: null })}
            className="text-rose-500 hover:text-rose-400 flex-shrink-0"
          >
            x
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
        {chat.messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30 select-none">
            <div className="text-4xl">Chat</div>
          </div>
        )}
        {chat.messages.map((message) => (
          <MessageBubble key={message.id} msg={message} />
        ))}
        {loading && <TypingDots />}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 border-t border-stroke bg-panel/40 px-4 py-3">
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportConversation}
              disabled={chat.messages.length === 0 || loading}
              className="btn-ghost text-xs disabled:opacity-50"
            >
              Export .md
            </button>
            <button
              type="button"
              onClick={() => downloadText("last_answer.txt", lastAssistantMessage)}
              disabled={!lastAssistantMessage || loading}
              className="btn-ghost text-xs disabled:opacity-50"
            >
              Download last answer
            </button>
          </div>
          <div className="text-[10px] text-fg-muted font-mono">
            {cfg?.label ?? "AI"} • {chat.model || "model"}
          </div>
        </div>
        <div className="flex items-end gap-3 bg-surface/60 border border-stroke rounded-xl px-4 py-3 focus-within:border-primary/60 transition-colors">
          <textarea
            ref={inputRef}
            value={chat.input}
            onChange={(event) => setChat({ input: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder={
              mode === "chat"
                ? "Type a message..."
                : mode === "image"
                ? "Describe the image you want..."
                : "Describe the video scene you want..."
            }
            rows={1}
            disabled={loading}
            className="flex-1 bg-transparent text-sm text-fg resize-none focus:outline-none placeholder:text-fg-muted min-h-[24px] max-h-[160px] leading-relaxed"
            onInput={(event) => {
              const target = event.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
            }}
          />
          <button
            onClick={() => void send()}
            disabled={!chat.input.trim() || loading}
            className="flex-shrink-0 w-9 h-9 bg-primary disabled:opacity-30 rounded-lg flex items-center justify-center hover:brightness-110 active:scale-95 transition"
          >
            {loading ? <InlineSpinner compact /> : "➤"}
          </button>
        </div>
        <p className="text-[10px] text-fg-muted mt-1 text-right">
          {chat.messages.filter((message) => message.role === "user").length} turns ·{" "}
          {chat.model}
        </p>
      </div>
    </div>
  );
};

function parseIdeas(raw: string): PlaygroundIdeaItem[] {
  const items: PlaygroundIdeaItem[] = [];
  const numbered = raw.match(
    /\d+[\.\)]\s+\*{0,2}([^\n*:]+)\*{0,2}\s*[:\-–]\s*([^\n]+(?:\n(?!\d+[\.\)])[^\n]+)*)/g
  );

  if (numbered && numbered.length >= 2) {
    for (const block of numbered) {
      const withoutNumber = block.replace(/^\d+[\.\)]\s+/, "");
      const separatorIndex = withoutNumber.search(/[:\-–]\s*/);
      if (separatorIndex === -1) continue;

      const title = withoutNumber
        .slice(0, separatorIndex)
        .replace(/\*\*/g, "")
        .trim();
      const description = withoutNumber
        .slice(separatorIndex + 1)
        .replace(/\*\*/g, "")
        .trim();

      if (title) {
        items.push({
          id: genId(),
          title,
          description: description || "No description.",
        });
      }
    }
    if (items.length >= 2) return items;
  }

  const blocks = raw.split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.trim().split("\n").filter(Boolean);
    if (!lines.length) continue;

    const title = lines[0]
      .replace(/^[\d\.\)\-\*#]+\s*/, "")
      .replace(/\*\*/g, "")
      .replace(/[:\-–].*/, "")
      .trim();
    const description = lines
      .slice(1)
      .join(" ")
      .replace(/\*\*/g, "")
      .replace(/^[\-:\s]+/, "")
      .trim();

    if (title.length > 3) {
      items.push({
        id: genId(),
        title,
        description: description || "No description.",
      });
    }
  }

  return items.slice(0, 8);
}

const IdeaGeneratorTab = ({
  aiItems,
  defaultProvider,
  userId,
}: {
  aiItems: ApiVaultItem[];
  defaultProvider: string;
  userId: string;
}) => {
  const ideasState = usePlaygroundStore((state) => state.ideas);
  const setIdeas = usePlaygroundStore((state) => state.setIdeas);
  const [loading, setLoading] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [likedIdeas, setLikedIdeas] = useState<LikedIdea[]>([]);
  const [loadingLiked, setLoadingLiked] = useState(false);
  const [viewingLiked, setViewingLiked] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingToStuffId, setSavingToStuffId] = useState<string | null>(null);

  useEffect(() => {
    if (!aiItems.length) return;
    const fallbackApiId = getDefaultApiId(aiItems, defaultProvider);
    if (!ideasState.apiId || !aiItems.some((item) => item.id === ideasState.apiId)) {
      setIdeas({
        apiId: fallbackApiId,
        model: getProviderDefaultModel(fallbackApiId, aiItems),
      });
    }
  }, [aiItems, defaultProvider, ideasState.apiId, setIdeas]);

  useEffect(() => {
    if (!ideasState.apiId || ideasState.model) return;
    setIdeas({ model: getProviderDefaultModel(ideasState.apiId, aiItems) });
  }, [aiItems, ideasState.apiId, ideasState.model, setIdeas]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function loadLikedIdeas() {
      setLoadingLiked(true);
      const { data } = await getLikedIdeas(userId);
      if (!cancelled) {
        setLikedIdeas(data ?? []);
        setLoadingLiked(false);
      }
    }

    void loadLikedIdeas();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const selectedApi =
    aiItems.find((item) => item.id === ideasState.apiId) ?? null;

  async function generate() {
    if (!selectedApi || loading) return;

    setIdeas({ error: null, ideas: [] });
    setLikedIds(new Set());
    setLoading(true);

    const apiList = [...new Set(aiItems.map((item) => `${item.key_name} (${item.provider})`))].join(
      ", "
    );
    const contextNote = ideasState.context.trim()
      ? `\n\nFocus area from user: ${ideasState.context.trim()}`
      : "";

    const prompt = `You have access to these AI capabilities:
${apiList}

Generate 5 UNIQUE and PRACTICAL product/tool ideas that a developer could realistically build using these AI capabilities.${contextNote}

Strict rules:
- No repetition between ideas
- Each idea must combine or use at least one of the listed AI capabilities
- Ideas must be realistic to build in 1-3 weeks
- Be specific, not generic

Output format (EXACTLY):
1. [Title]: [1-2 sentence description]
2. [Title]: [1-2 sentence description]
3. [Title]: [1-2 sentence description]
4. [Title]: [1-2 sentence description]
5. [Title]: [1-2 sentence description]`;

    try {
      const reply = await sendChatMessage({
        apiItem: selectedApi,
        model: ideasState.model,
        messages: [{ id: genId(), role: "user", content: prompt, timestamp: new Date() }],
      });
      const parsed = parseIdeas(reply);
      setIdeas({
        ideas: parsed.length
          ? parsed
          : [{ id: genId(), title: "Raw Output", description: reply }],
      });
      void logAppEvent({
        type: "success",
        module: "ai-playground.ideas",
        message: "Ideas generated.",
        projectId: useAppStore.getState().selectedProject?.id ?? undefined,
        meta: {
          model: ideasState.model,
          provider: detectProvider(selectedApi)?.id ?? null,
        },
      });
    } catch (error: any) {
      setIdeas({ error: error?.message ?? "Failed to generate ideas." });
      void logAppEvent({
        type: "error",
        module: "ai-playground.ideas",
        message: error?.message ?? "Idea generation failed.",
        projectId: useAppStore.getState().selectedProject?.id ?? undefined,
        meta: {
          model: ideasState.model,
          provider: detectProvider(selectedApi)?.id ?? null,
        },
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleLike(idea: PlaygroundIdeaItem) {
    if (likedIds.has(idea.id) || savingId) return;

    setSavingId(idea.id);
    const { data, error } = await saveLikedIdea({
      userId,
      title: idea.title,
      description: idea.description,
    });

    if (!error && data) {
      setLikedIds((current) => new Set([...current, idea.id]));
      setLikedIdeas((current) => [data, ...current]);
    }

    setSavingId(null);
  }

  async function handleDeleteLiked(id: string) {
    setDeletingId(id);
    await deleteLikedIdea(id);
    setLikedIdeas((current) => current.filter((idea) => idea.id !== id));
    setDeletingId(null);
  }

  async function handleSaveToStuff(idea: PlaygroundIdeaItem) {
    if (!userId || savingToStuffId) return;
    setSavingToStuffId(idea.id);
    try {
      const response = await createUserItem({
        user_id: userId,
        type: "template",
        title: idea.title,
        description: idea.description,
        data: {
          route: "/ai-playground",
          source: "ai-playground.idea",
          context: ideasState.context,
          providerApiId: ideasState.apiId,
          model: ideasState.model,
          idea,
        },
        tags: ["idea", "template", "ai-playground"],
      });

      if (response.error) throw new Error(response.error.message);
      window.alert("Idea saved to My Stuff.");
    } catch (error: any) {
      window.alert(error?.message ?? "Failed to save idea.");
    } finally {
      setSavingToStuffId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-0 sm:p-4 max-w-4xl mx-auto w-full">
      <div className="glass-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-fg-muted uppercase tracking-widest">
            Thinking Model
          </h3>
          <span className="text-[10px] text-fg-muted">
            {aiItems.length} API key{aiItems.length !== 1 ? "s" : ""} as context
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <ApiSelector
            aiItems={aiItems}
            value={ideasState.apiId}
            onChange={(apiId) =>
              setIdeas({
                apiId,
                model: getProviderDefaultModel(apiId, aiItems),
              })
            }
            label="Use"
          />
          <ModelSelector
            apiId={ideasState.apiId}
            aiItems={aiItems}
            value={ideasState.model}
            onChange={(model) => setIdeas({ model })}
          />
        </div>
        <input
          type="text"
          value={ideasState.context}
          onChange={(event) => setIdeas({ context: event.target.value })}
          placeholder="Optional focus (for example healthcare, devtools, B2B SaaS)"
          className="w-full bg-surface border border-stroke text-fg-secondary text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary placeholder:text-fg-muted"
        />
        <div className="flex gap-2">
          <button
            onClick={() => void generate()}
            disabled={loading || !selectedApi}
            className="btn-primary flex-1 min-w-0 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            {loading ? (
              <span className="flex min-w-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap">
                <InlineSpinner compact /> <span className="truncate">Generating...</span>
              </span>
            ) : (
              "Generate Ideas"
            )}
          </button>
          <button
            onClick={() => setViewingLiked((current) => !current)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-lg border transition-colors ${viewingLiked
                ? "border-primary text-primary bg-primary/10"
                : "border-stroke text-fg-muted hover:text-fg-secondary bg-surface"
              }`}
          >
            Saved {likedIdeas.length > 0 ? likedIdeas.length : ""}
          </button>
        </div>
      </div>

      {ideasState.error && (
        <div className="glass-panel border-l-4 border-rose-600 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
          {ideasState.error}
        </div>
      )}

      {ideasState.ideas.length > 0 && !viewingLiked && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-fg-muted uppercase tracking-widest">
              {ideasState.ideas.length} ideas generated
            </span>
            <button
              onClick={() => void generate()}
              className="text-xs text-fg-muted hover:text-primary transition-colors"
            >
              Regenerate
            </button>
          </div>
          {ideasState.ideas.map((idea, index) => {
            const isLiked = likedIds.has(idea.id);
            const isSaving = savingId === idea.id;

            return (
              <div
                key={idea.id}
                className="glass-panel p-4 flex gap-4 hover:border-stroke-strong transition-colors group"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-black text-primary">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-fg-secondary text-sm mb-1 group-hover:text-primary transition-colors">
                    {idea.title}
                  </p>
                  <p className="text-fg-muted text-sm leading-relaxed">{idea.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => void handleSaveToStuff(idea)}
                    disabled={savingToStuffId === idea.id}
                    className="rounded-lg border border-stroke px-2.5 py-1.5 text-xs text-fg-muted transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
                  >
                    {savingToStuffId === idea.id ? "Saving..." : "My Stuff"}
                  </button>
                  <button
                    onClick={() => void handleLike(idea)}
                    disabled={isLiked || isSaving}
                    title={isLiked ? "Saved" : "Save idea"}
                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm transition ${isLiked
                        ? "text-rose-400 bg-rose-500/10 border border-rose-500/20"
                        : "text-fg-muted hover:text-rose-400 hover:bg-rose-500/10 border border-transparent"
                      } disabled:opacity-50`}
                  >
                    {isSaving ? <InlineSpinner compact /> : isLiked ? "Saved" : "Save"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && ideasState.ideas.length === 0 && !viewingLiked && (
        <div className="glass-panel p-10 text-center opacity-30">
          <div className="text-4xl mb-3">Ideas</div>
          <p className="text-fg-muted text-sm">
            Click Generate Ideas to get AI-powered project suggestions.
          </p>
        </div>
      )}

      {viewingLiked && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-fg-muted uppercase tracking-widest">
              Saved Ideas
            </span>
            <button
              onClick={() => setViewingLiked(false)}
              className="text-xs text-fg-muted hover:text-fg-secondary transition-colors"
            >
              Back to Generator
            </button>
          </div>
          {loadingLiked && (
            <div className="flex items-center gap-2 text-fg-muted text-sm py-6 justify-center whitespace-nowrap">
              <InlineSpinner compact /> <span>Loading...</span>
            </div>
          )}
          {!loadingLiked && likedIdeas.length === 0 && (
            <div className="glass-panel p-10 text-center opacity-30">
              <div className="text-4xl mb-3">Saved</div>
              <p className="text-fg-muted text-sm">No saved ideas yet.</p>
            </div>
          )}
          {likedIdeas.map((idea) => (
            <div
              key={idea.id}
              className="glass-panel p-4 flex gap-4 hover:border-stroke-strong transition-colors group"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-xs">
                Save
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-fg-secondary text-sm mb-1">{idea.title}</p>
                <p className="text-fg-muted text-sm leading-relaxed">{idea.description}</p>
                <p className="text-[10px] text-fg-muted mt-2 font-mono">
                  {new Date(idea.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => void handleDeleteLiked(idea.id)}
                disabled={deletingId === idea.id}
                className="flex-shrink-0 w-8 h-8 rounded-lg text-fg-muted hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center text-sm transition opacity-0 group-hover:opacity-100"
                title="Remove"
              >
                {deletingId === idea.id ? <InlineSpinner compact /> : "x"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ResearchColumnCard = ({
  col,
  index,
  aiItems,
  totalCols,
  canRun,
  onChangeApi,
  onChangeModel,
  onRemove,
  onGenerate,
  onRetry,
}: {
  col: PlaygroundResearchColumn;
  index: number;
  aiItems: ApiVaultItem[];
  totalCols: number;
  canRun: boolean;
  onChangeApi: (id: string) => void;
  onChangeModel: (model: string) => void;
  onRemove: () => void;
  onGenerate: () => void;
  onRetry: () => void;
}) => {
  const selectedApi = aiItems.find((item) => item.id === col.apiId);
  const cfg = selectedApi ? detectProvider(selectedApi) : undefined;
  const isLoading = col.status === "loading";
  const hasError = col.status === "error";
  const hasResponse = !!col.response;
  const generateLabel = hasResponse ? "Regenerate" : "Generate";

  return (
    <div className="flex flex-col gap-3 min-w-0 flex-1" style={{ minWidth: totalCols > 2 ? 280 : 0 }}>
      <div className="glass-panel p-3 space-y-2 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black text-fg-muted uppercase tracking-widest">
            AI {index + 1}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onGenerate}
              disabled={isLoading || !canRun}
              className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md border border-stroke text-fg-secondary hover:text-primary hover:border-primary/60 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {isLoading ? (
                <span className="inline-flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
                  <InlineSpinner compact /> <span className="truncate">Running</span>
                </span>
              ) : (
                generateLabel
              )}
            </button>
            {hasError && (
              <button
                onClick={onRetry}
                disabled={isLoading || !canRun}
                className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md border border-rose-800/40 text-rose-200 hover:border-rose-500/60 transition-colors disabled:opacity-50"
              >
                Retry
              </button>
            )}
            {totalCols > 1 && (
              <button
                onClick={onRemove}
                disabled={isLoading}
                className="text-fg-muted hover:text-rose-400 text-xs transition-colors"
                title="Remove column"
              >
                x
              </button>
            )}
          </div>
        </div>
        <ApiSelector
          aiItems={aiItems}
          value={col.apiId}
          onChange={onChangeApi}
          label=""
          compact
        />
        <ModelSelector
          apiId={col.apiId}
          aiItems={aiItems}
          value={col.model}
          onChange={onChangeModel}
          compact
        />
        {cfg && (
          <span className="text-[10px] px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-full font-bold">
            {cfg.label}
          </span>
        )}
      </div>

      <div className="glass-panel flex-1 overflow-hidden flex flex-col" style={{ minHeight: 320 }}>
        {hasResponse ? (
          <div className="relative p-4 flex-1 overflow-y-auto custom-scrollbar">
            <GeneratedText text={col.response} className="text-sm text-fg-secondary leading-relaxed" />
            {isLoading && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
                <div className="flex items-center gap-2 text-xs text-fg-muted whitespace-nowrap">
                  <InlineSpinner compact />
                  <span>Updating...</span>
                </div>
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-fg-muted">
            <InlineSpinner compact />
            <p className="text-xs whitespace-nowrap">Asking {cfg?.label ?? "AI"}...</p>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center opacity-20 select-none">
            <div className="text-center">
              <div className="text-3xl mb-2">AI</div>
              <p className="text-fg-muted text-xs">Response will appear here</p>
            </div>
          </div>
        )}

        {hasError && (
          <div className="border-t border-rose-800/30 bg-rose-950/20 px-4 py-3 text-xs text-rose-200">
            <span className="font-bold">Error:</span> {col.error}
          </div>
        )}
      </div>
    </div>
  );
};

const ResearchTab = ({
  aiItems,
  defaultProvider,
}: {
  aiItems: ApiVaultItem[];
  defaultProvider: string;
}) => {
  const userId = useAppStore((state) => state.user?.id ?? null);
  const research = usePlaygroundStore((state) => state.research);
  const setResearch = usePlaygroundStore((state) => state.setResearch);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [savingSummaryToStuff, setSavingSummaryToStuff] = useState(false);

  function createColumn(overrideApiId?: string): PlaygroundResearchColumn {
    const apiId = overrideApiId ?? getDefaultApiId(aiItems, defaultProvider);
    return {
      id: genId(),
      apiId,
      model: getProviderDefaultModel(apiId, aiItems),
      status: "idle",
      response: "",
      error: null,
      runToken: undefined,
    };
  }

  useEffect(() => {
    if (!aiItems.length) return;

    if (research.columns.length === 0) {
      const ids = [...new Set(aiItems.map((item) => item.id))];
      const columns =
        ids.length >= 2 ? [createColumn(ids[0]), createColumn(ids[1])] : [createColumn(), createColumn()];
      setResearch({ columns });
      return;
    }

    const validIds = new Set(aiItems.map((item) => item.id));
    const nextColumns = research.columns.map((column) => {
      if (validIds.has(column.apiId)) return column;
      const apiId = getDefaultApiId(aiItems, defaultProvider);
      return {
        ...column,
        apiId,
        model: getProviderDefaultModel(apiId, aiItems),
      };
    });

    const changed = nextColumns.some((column, index) => column !== research.columns[index]);
    if (changed) {
      setResearch({ columns: nextColumns });
    }
  }, [aiItems, defaultProvider, research.columns, setResearch]);

  useEffect(() => {
    if (!aiItems.length) return;
    const validSummaryApiId =
      research.summaryApiId && aiItems.some((item) => item.id === research.summaryApiId)
        ? research.summaryApiId
        : getDefaultApiId(aiItems, defaultProvider);

    if (validSummaryApiId !== research.summaryApiId) {
      setResearch({
        summaryApiId: validSummaryApiId,
        summaryModel: getProviderDefaultModel(validSummaryApiId, aiItems),
      });
      return;
    }

    if (!research.summaryModel && validSummaryApiId) {
      setResearch({ summaryModel: getProviderDefaultModel(validSummaryApiId, aiItems) });
    }
  }, [
    aiItems,
    defaultProvider,
    research.summaryApiId,
    research.summaryModel,
    setResearch,
  ]);

  function updateColumn(id: string, patch: Partial<PlaygroundResearchColumn>) {
    setResearch({
      columns: usePlaygroundStore
        .getState()
        .research.columns.map((column) => (column.id === id ? { ...column, ...patch } : column)),
    });
  }

  function addColumn() {
    if (research.columns.length >= 4) return;
    const usedIds = new Set(research.columns.map((column) => column.apiId));
    const nextApiId =
      aiItems.find((item) => !usedIds.has(item.id))?.id ??
      getDefaultApiId(aiItems, defaultProvider);
    setResearch({ columns: [...research.columns, createColumn(nextApiId)] });
  }

  function removeColumn(id: string) {
    setResearch({ columns: research.columns.filter((column) => column.id !== id) });
  }

  async function runColumn(id: string) {
    const column = usePlaygroundStore.getState().research.columns.find((entry) => entry.id === id);
    if (!column) return;

    const prompt = usePlaygroundStore.getState().research.prompt.trim();
    if (!prompt) {
      updateColumn(id, { status: "error", error: "Enter a prompt to run this model." });
      return;
    }

    const apiItem = aiItems.find((item) => item.id === column.apiId);
    if (!apiItem) {
      updateColumn(id, { status: "error", error: "API key not found." });
      return;
    }

    const runToken = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : genId();
    updateColumn(id, { status: "loading", error: null, runToken });

    try {
      const response = await sendChatMessage({
        apiItem,
        model: column.model,
        messages: [
          {
            id: genId(),
            role: "user",
            content: prompt,
            timestamp: new Date(),
          },
        ],
        systemPrompt: "You are a research assistant. Provide a clear, well-structured response.",
      });

      const current = usePlaygroundStore.getState().research.columns.find((entry) => entry.id === id);
      if (current?.runToken !== runToken) return;

      updateColumn(id, {
        status: "success",
        response: normalizeGeneratedText(response),
        error: null,
      });

      void logAppEvent({
        type: "success",
        module: "ai-playground.research",
        message: `Research response generated (${apiItem.key_name ?? "AI"}).`,
        projectId: useAppStore.getState().selectedProject?.id ?? undefined,
        meta: {
          apiId: column.apiId,
          model: column.model,
          provider: detectProvider(apiItem)?.id ?? null,
          promptChars: prompt.length,
        },
      });
    } catch (error: any) {
      const current = usePlaygroundStore.getState().research.columns.find((entry) => entry.id === id);
      if (current?.runToken !== runToken) return;

      updateColumn(id, {
        status: "error",
        error: error?.message ?? "Request failed.",
      });
      void logAppEvent({
        type: "error",
        module: "ai-playground.research",
        message: error?.message ?? "Research request failed.",
        projectId: useAppStore.getState().selectedProject?.id ?? undefined,
        meta: {
          apiId: column.apiId,
          model: column.model,
          provider: detectProvider(apiItem)?.id ?? null,
          promptChars: prompt.length,
        },
      });
    }
  }

  function runAllColumns() {
    if (!research.prompt.trim()) {
      research.columns.forEach((column) => {
        updateColumn(column.id, {
          status: "error",
          error: "Enter a prompt to run this model.",
        });
      });
      return;
    }
    research.columns.forEach((column) => {
      void runColumn(column.id);
    });
  }

  async function generateSummary() {
    const responses = research.columns
      .filter((column) => column.response)
      .map((column, index) => {
        const item = aiItems.find((entry) => entry.id === column.apiId);
        return `[AI ${index + 1} - ${item?.key_name ?? "Unknown"}]\n${column.response}`;
      });

    if (!responses.length) return;

    const summaryApiItem = aiItems.find((item) => item.id === research.summaryApiId);
    if (!summaryApiItem) return;

    setSummaryLoading(true);
    setResearch({ summary: "", summaryError: null });

    const summaryPrompt = `You received the following responses from multiple AI models to the same research question:

${responses.join("\n\n---\n\n")}

Synthesize these into ONE clear, comprehensive summary:
- Avoid repeating the same point multiple times
- Highlight the most insightful or unique perspectives from each response
- Resolve any contradictions if present
- Keep the summary factual and well-structured`;

    try {
      const summary = await sendChatMessage({
        apiItem: summaryApiItem,
        model:
          research.summaryModel ||
          getProviderDefaultModel(research.summaryApiId, aiItems),
        messages: [
          {
            id: genId(),
            role: "user",
            content: summaryPrompt,
            timestamp: new Date(),
          },
        ],
      });
      setResearch({ summary: normalizeGeneratedText(summary) });
    } catch (error: any) {
      setResearch({ summaryError: error?.message ?? "Summary generation failed." });
    } finally {
      setSummaryLoading(false);
    }
  }

  async function saveSummaryToStuff() {
    if (!userId || !research.summary.trim()) return;
    setSavingSummaryToStuff(true);
    try {
      const response = await createUserItem({
        user_id: userId,
        type: "note",
        title: research.prompt.trim().slice(0, 72) || "AI research summary",
        description: "Saved research summary from AI Playground.",
        data: {
          route: "/ai-playground",
          source: "ai-playground.research",
          prompt: research.prompt,
          summary: research.summary,
          summaryApiId: research.summaryApiId,
          summaryModel: research.summaryModel,
          columns: research.columns.map((column) => ({
            id: column.id,
            apiId: column.apiId,
            model: column.model,
            response: column.response,
            error: column.error,
          })),
        },
        tags: ["research", "summary", "ai-playground", "note"],
      });
      if (response.error) throw new Error(response.error.message);
      window.alert("Summary saved to My Stuff.");
    } catch (error: any) {
      window.alert(error?.message ?? "Failed to save summary.");
    } finally {
      setSavingSummaryToStuff(false);
    }
  }

  const anyResponse = research.columns.some((column) => !!column.response);
  const anyLoading = research.columns.some((column) => column.status === "loading");
  const promptRows = Math.min(5, Math.max(2, research.prompt.split("\n").length));

  return (
    <div className="flex flex-col gap-4 p-0 sm:p-4" style={{ minHeight: "calc(100vh - 240px)" }}>
      <div className="glass-panel p-4 space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-fg-muted uppercase tracking-widest">
            Research Prompt
          </h3>
          <span className="text-[10px] text-fg-muted">
            {research.columns.length} AI model{research.columns.length !== 1 ? "s" : ""} will
            respond
          </span>
        </div>
        <textarea
          value={research.prompt}
          onChange={(event) => setResearch({ prompt: event.target.value })}
          placeholder="Enter your research question or topic."
          rows={promptRows}
          className="w-full bg-surface/60 border border-stroke text-fg-secondary text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary resize-none placeholder:text-fg-muted leading-relaxed"
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.ctrlKey) {
              event.preventDefault();
              runAllColumns();
            }
          }}
        />
        <div className="flex items-center gap-2">
              <button
                onClick={runAllColumns}
                disabled={!research.prompt.trim() || anyLoading}
                className="btn-primary flex-1 min-w-0 py-2.5 font-bold text-sm disabled:opacity-50"
              >
                {anyLoading ? (
              <span className="flex min-w-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap">
                <InlineSpinner compact /> <span className="truncate">Running...</span>
              </span>
                ) : (
                  `Run Research across ${research.columns.length} AIs`
                )}
              </button>
          <button
            onClick={addColumn}
            disabled={research.columns.length >= 4}
            className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-stroke text-fg-secondary bg-surface hover:bg-surface disabled:opacity-30 transition-colors whitespace-nowrap"
          >
            Add AI
          </button>
        </div>
        <p className="text-[10px] text-fg-muted">Ctrl+Enter to run. Max 4 columns.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 pb-1 lg:overflow-x-auto" style={{ minHeight: 380 }}>
        {research.columns.map((column, index) => (
          <ResearchColumnCard
            key={column.id}
            col={column}
            index={index}
            aiItems={aiItems}
            totalCols={research.columns.length}
            canRun={!!research.prompt.trim()}
            onChangeApi={(apiId) =>
              updateColumn(column.id, {
                apiId,
                model: getProviderDefaultModel(apiId, aiItems),
                status: "idle",
                response: "",
                error: null,
              })
            }
            onChangeModel={(model) =>
              updateColumn(column.id, { model, status: "idle", response: "", error: null })
            }
            onRemove={() => removeColumn(column.id)}
            onGenerate={() => void runColumn(column.id)}
            onRetry={() => void runColumn(column.id)}
          />
        ))}
      </div>

      {anyResponse && !anyLoading && (
        <div className="glass-panel p-4 space-y-3 flex-shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-xs font-bold text-fg-muted uppercase tracking-widest">
              AI Summary
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              <ApiSelector
                aiItems={aiItems}
                value={research.summaryApiId}
                onChange={(apiId) =>
                  setResearch({
                    summaryApiId: apiId,
                    summaryModel: getProviderDefaultModel(apiId, aiItems),
                  })
                }
                label="Summarise with"
              />
              <ModelSelector
                apiId={research.summaryApiId}
                aiItems={aiItems}
                value={research.summaryModel}
                onChange={(model) => setResearch({ summaryModel: model })}
              />
              <button
                onClick={() => void generateSummary()}
                disabled={summaryLoading}
                className="btn-primary min-w-0 text-sm py-2 px-5 font-bold disabled:opacity-50"
              >
                {summaryLoading ? (
                  <span className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap">
                    <InlineSpinner compact /> <span className="truncate">Summarising...</span>
                  </span>
                ) : (
                  "Generate Summary"
                )}
              </button>
              {research.summary ? (
                <button
                  onClick={() => void saveSummaryToStuff()}
                  disabled={savingSummaryToStuff}
                  className="btn-ghost text-sm py-2 px-5 font-bold disabled:opacity-50"
                >
                  {savingSummaryToStuff ? "Saving..." : "Save to My Stuff"}
                </button>
              ) : null}
            </div>
          </div>

          {research.summaryError && (
            <div className="bg-rose-950/40 border border-rose-800/40 rounded-xl px-4 py-3 text-sm text-rose-300">
              <span className="font-bold">Error:</span> {research.summaryError}
            </div>
          )}

          {research.summary && (
            <div className="bg-panel/60 border border-stroke rounded-xl p-5">
              <GeneratedText text={research.summary} className="text-sm text-fg-secondary leading-relaxed" />
            </div>
          )}

          {!research.summary && !summaryLoading && !research.summaryError && (
            <p className="text-xs text-fg-muted text-center py-3">
              Click Generate Summary to synthesise all responses above into one clear answer.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const TABS: { id: PlaygroundTabId; label: string; description: string }[] = [
  { id: "chat", label: "AI Chat", description: "" },
  { id: "ideas", label: "Idea Generator", description: "" },
  { id: "research", label: "Research", description: "" },
];

const AiPlaygroundPanel = () => {
  const user = useAppStore((state) => state.user);
  const appSettings = useAppStore((state) => state.appSettings);
  const selectedProject = useAppStore((state) => state.selectedProject);
  const activeTab = usePlaygroundStore((state) => state.activeTab);
  const setActiveTab = usePlaygroundStore((state) => state.setActiveTab);
  const hydrateForUser = usePlaygroundStore((state) => state.hydrateForUser);
  const [apiItems, setApiItems] = useState<ApiVaultItem[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);

  const aiItems = apiItems;
  const defaultProvider = appSettings?.default_ai_provider ?? "openai";
  const userId = user?.id ?? null;

  useEffect(() => {
    hydrateForUser(userId);
  }, [hydrateForUser, userId]);

  useEffect(() => {
    if (!userId) return;
    const currentUserId = userId;

    let cancelled = false;

    async function loadApiItems() {
      setLoadingKeys(true);
      const { data } = await getApiVaultItems(currentUserId);
      if (!cancelled) {
        setApiItems(data ?? []);
        setLoadingKeys(false);
      }
    }

    void loadApiItems();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="flex flex-col gap-0" style={{ minHeight: "calc(100vh - 80px)" }}>
      <ModuleHeader title="AI Playground" description="Powered by your API vault" icon="AI">
        <div className="flex items-center gap-2">
          {selectedProject ? (
            <Link
              to={`/projects/${selectedProject.id}`}
              className="inline-flex max-w-full min-w-0 items-center rounded-full border border-stroke bg-surface px-3 py-1.5 text-xs text-fg-muted transition hover:border-primary/40 hover:text-primary"
              title="Open active project"
            >
              <span className="truncate">Project: {selectedProject.name}</span>
            </Link>
          ) : (
            <span className="px-3 py-1.5 rounded-full bg-surface border border-stroke text-xs text-fg-muted">
              Project: none
            </span>
          )}
          {loadingKeys ? (
            <span className="flex max-w-full items-center gap-2 text-xs text-fg-muted whitespace-nowrap">
              <InlineSpinner compact /> <span className="truncate">Loading keys...</span>
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-full bg-surface border border-stroke text-xs text-fg-muted">
              {aiItems.length} AI key{aiItems.length !== 1 ? "s" : ""} available
            </span>
          )}
        </div>
      </ModuleHeader>

      <div className="glass-panel flex flex-col flex-1 overflow-hidden border border-stroke/50">
        <div className="flex items-center gap-0 border-b border-stroke px-4 pt-3 flex-shrink-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition whitespace-nowrap ${activeTab === tab.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-fg-muted hover:text-fg-secondary hover:bg-surface/30"
                }`}
            >
              {tab.label}
              {activeTab !== tab.id && tab.description ? (
                <span className="hidden sm:block text-[10px] text-fg-muted font-normal">
                  {tab.description}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingKeys ? (
            <div className="flex items-center justify-center py-24 gap-3 whitespace-nowrap">
              <InlineSpinner compact />
              <span className="min-w-0 truncate text-fg-muted text-sm">Loading API keys...</span>
            </div>
          ) : aiItems.length === 0 ? (
            <NoApiConfigured />
          ) : (
            <>
              {activeTab === "chat" && (
                <AiChatTab aiItems={aiItems} defaultProvider={defaultProvider} />
              )}
              {activeTab === "ideas" && (
                <IdeaGeneratorTab
                  aiItems={aiItems}
                  defaultProvider={defaultProvider}
                  userId={userId ?? ""}
                />
              )}
              {activeTab === "research" && (
                <ResearchTab aiItems={aiItems} defaultProvider={defaultProvider} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiPlaygroundPanel;
