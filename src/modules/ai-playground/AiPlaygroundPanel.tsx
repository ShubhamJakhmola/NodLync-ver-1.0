import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getApiVaultItems, type ApiVaultItem } from "../../api/apiVaultApi";
import {
  detectProvider,
  getDefaultModel,
  getModelOptions,
  sendChatMessage,
  streamChatMessage,
  type ChatMessage,
  type UniversalContentPart,
  type UniversalStreamEvent,
} from "../../api/aiPlaygroundApi";
import {
  deleteLikedIdea,
  getLikedIdeas,
  saveLikedIdea,
  type LikedIdea,
} from "../../api/likedIdeasApi";
import { createUserItem } from "../../api/userItemsApi";
import { submitMediaJob } from "../../ai/media/engine";
import InlineSpinner from "../../components/InlineSpinner";
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
import { ApiSelector, ModelSelector } from "./components/Selector";

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function sanitizeErrorMessage(message: string): string {
  // Remove HTML tags and excessive whitespace
  const withoutHtml = message.replace(/<[^>]*>/g, "").trim();
  // Limit length to prevent UI overflow
  return withoutHtml.length > 200 ? withoutHtml.slice(0, 200) + "..." : withoutHtml;
}

function getProviderDefaultModel(apiId: string, aiItems: ApiVaultItem[]) {
  const item = aiItems.find((entry) => entry.id === apiId);
  const cfg = item ? detectProvider(item) : undefined;
  return getModelOptions(cfg?.id ?? "openai")[0]?.value ?? cfg?.defaultModel ?? getDefaultModel(cfg?.id ?? "openai");
}

function getDefaultApiId(aiItems: ApiVaultItem[], defaultProvider: string) {
  // First, check if defaultProvider is an API key ID (from global settings)
  const byId = aiItems.find((item) => item.id === defaultProvider);
  if (byId) return byId.id;

  // Fallback: match by provider name (backward compatibility)
  const byProvider =
    aiItems.find((item) =>
      item.provider.toLowerCase().includes(defaultProvider.toLowerCase())
    ) ?? aiItems[0];
  return byProvider?.id ?? "";
}

type PendingAttachment = {
  id: string;
  name: string;
  mimeType: string;
  sizeLabel: string;
  kind: "text" | "image" | "file";
  content?: string;
};

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isTextLikeFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return file.type.startsWith("text/") || /\.(txt|md|json|csv|ts|tsx|js|jsx|py|html|css|xml|yml|yaml)$/i.test(lowerName);
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



const MessageBubble = ({ msg, isStreaming }: { msg: ChatMessage; isStreaming?: boolean }) => {
  const isUser = msg.role === "user";
  const content = isUser ? msg.content : normalizeGeneratedText(msg.content);
  const allParts: UniversalContentPart[] =
    !isUser && msg.parts?.length ? msg.parts : [{ type: "markdown", text: content }];
  const parts = allParts.filter((part) => part.type !== "reasoning");
  const timestamp =
    msg.timestamp instanceof Date
      ? msg.timestamp
      : msg.timestamp
        ? new Date(msg.timestamp)
        : null;
  const timeLabel = timestamp && !Number.isNaN(timestamp.getTime())
    ? timestamp.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "";

  const renderPart = (part: UniversalContentPart, index: number) => {
    if ((part.type === "markdown" || part.type === "text") && part.text) {
      return (
        <div key={`${part.type}-${index}`} className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-pre:my-3 prose-code:text-[0.9em]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
        </div>
      );
    }
    if (part.type === "code" && part.text) {
      return (
        <pre key={`${part.type}-${index}`} className="overflow-x-auto rounded-lg border border-stroke bg-background/70 p-3 text-xs">
          <code>{part.text}</code>
        </pre>
      );
    }
    if (part.type === "image" && (part.url || part.data)) {
      const src = part.url ?? `data:${part.mimeType ?? "image/png"};base64,${part.data}`;
      return <img key={`${part.type}-${index}`} src={src} alt="Generated result" className="max-w-full rounded-xl border border-stroke" />;
    }
    if (part.type === "video" && part.url) {
      return <video key={`${part.type}-${index}`} controls className="max-w-full rounded-xl border border-stroke" src={part.url} />;
    }
    if (part.type === "audio" && part.url) {
      return <audio key={`${part.type}-${index}`} controls className="w-full" src={part.url} />;
    }
    if (part.url) {
      return (
        <a key={`${part.type}-${index}`} href={part.url} target="_blank" rel="noreferrer" className="block text-xs text-primary hover:underline break-all">
          {part.url}
        </a>
      );
    }
    return null;
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[92%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words transition-all ${isUser
          ? "bg-primary text-on-primary font-medium rounded-[22px] rounded-br-md shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
          : "bg-surface/50 backdrop-blur-sm text-fg-secondary border border-white/[0.06] rounded-[22px] rounded-bl-md"
          }`}
      >
        <div className={`mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] ${isUser ? "justify-end text-on-primary/60" : "text-fg-muted"}`}>
          <span>{isUser ? "You" : "AI"}</span>
          {timeLabel ? <span>{timeLabel}</span> : null}
        </div>
        {isUser ? (
          content
        ) : isStreaming && !parts.some(part => part.text?.trim()) ? (
          <div className="flex items-center gap-1.5 py-1">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="w-2 h-2 rounded-full bg-primary/50 animate-bounce"
                style={{ animationDelay: `${index * 0.15}s` }}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">{parts.map(renderPart)}</div>
        )}
      </div>
    </div>
  );
};

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
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);

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
  async function convertFileToAttachment(file: File): Promise<PendingAttachment> {
    const base: PendingAttachment = {
      id: genId(),
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeLabel: formatBytes(file.size),
      kind: file.type.startsWith("image/") ? "image" : isTextLikeFile(file) ? "text" : "file",
    };

    if (base.kind === "text") {
      const text = await file.text();
      return {
        ...base,
        content: text.slice(0, 5000),
      };
    }

    return base;
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const nextAttachments = await Promise.all(Array.from(fileList).slice(0, 5).map(convertFileToAttachment));
    setAttachments((current) => [...current, ...nextAttachments].slice(-5));
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }

  function buildUserContent() {
    const prompt = chat.input.trim();
    if (attachments.length === 0) return prompt;

    const attachmentContext = attachments.map((attachment) => {
      if (attachment.kind === "text" && attachment.content) {
        return `[Attachment: ${attachment.name} | ${attachment.sizeLabel}]\n${attachment.content}`;
      }
      return `[Attachment: ${attachment.name} | ${attachment.mimeType} | ${attachment.sizeLabel}]`;
    });

    return `${prompt}\n\n${attachmentContext.join("\n\n")}`;
  }

  async function send() {
    if ((!chat.input.trim() && attachments.length === 0) || !selectedApi || loading) return;

    const userContent = buildUserContent();
    const displayContent = chat.input.trim() || attachments.map((attachment) => attachment.name).join(", ");

    const userMessage: ChatMessage = {
      id: genId(),
      role: "user",
      content: displayContent,
      timestamp: new Date(),
    };
    const nextMessages = [...chat.messages, userMessage];
    const requestMessages = [
      ...chat.messages,
      {
        ...userMessage,
        content: userContent,
      },
    ];

    setChat({
      messages: nextMessages,
      input: "",
      error: null,
      lastDebug: null,
    });
    setAttachments([]);
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const assistantId = genId();
      setChat({
        messages: [
          ...nextMessages,
          {
            id: assistantId,
            role: "assistant",
            content: "",
            parts: [{ type: "markdown", text: "" }],
            raw: null,
            timestamp: new Date(),
          },
        ],
      });

      if (chat.mode === "image" || chat.mode === "video" || chat.mode === "audio") {
        let finalJob: any = null;
        await submitMediaJob(
          {
            apiItem: selectedApi,
            providerId: cfg?.id ?? "openai",
            model: chat.model,
            modality: chat.mode,
            prompt: userMessage.content,
          },
          (job) => {
            finalJob = job;
            const statusLine = `**${job.status.toUpperCase()}** (${job.provider} • ${job.model})`;
            const parts: UniversalContentPart[] = [{ type: "markdown", text: statusLine }];

            if (job.status === "completed" && job.result) {
              if (job.modality === "image") {
                if (job.result.url) parts.push({ type: "image", url: job.result.url });
                else if (job.result.base64) parts.push({ type: "image", data: job.result.base64, mimeType: job.result.mimeType ?? "image/png" });
              } else if (job.modality === "video" && job.result.url) {
                parts.push({ type: "video", url: job.result.url });
              } else if (job.modality === "audio" && job.result.url) {
                parts.push({ type: "audio", url: job.result.url });
              } else if (job.result.url) {
                parts.push({ type: "file", url: job.result.url });
              }
            }

            if (job.status === "failed" && job.error?.message) {
              parts.push({ type: "markdown", text: `\n\n**Error:** ${sanitizeErrorMessage(job.error.message)}` });
            }

            const next = usePlaygroundStore.getState().chat.messages.map((m) =>
              m.id === assistantId ? { ...m, content: statusLine, parts, raw: job } : m,
            );
            setChat({ messages: next, lastDebug: (job as any)?.debug ?? null });
          },
        );

        if (finalJob?.status === "failed") {
          throw Object.assign(new Error(sanitizeErrorMessage(finalJob?.error?.message ?? "Media generation failed.")), {
            universalError: { kind: "provider", message: sanitizeErrorMessage(finalJob?.error?.message ?? "Media generation failed."), raw: finalJob },
          });
        }

        void logAppEvent({
          type: "success",
          module: `ai-playground.chat.${chat.mode}`,
          message: "Media generation completed.",
          projectId: useAppStore.getState().selectedProject?.id ?? undefined,
          meta: { model: chat.model, provider: cfg?.id ?? null, mode: chat.mode },
        });
        return;
      }

      // Streaming is an optional enhancement. If the provider doesn't support it,
      // transparently fall back to the non-stream orchestration path.
      try {
        const { debug, stream } = await streamChatMessage(
          {
            apiItem: selectedApi,
            model: chat.model,
            messages: requestMessages,
            mode: "chat",
          },
          { signal: abortRef.current.signal },
        );

        let visibleAcc = "";
        let lastMeta: UniversalStreamEvent | null = null;
        for await (const event of stream) {
          if (event.type === "delta") {
            visibleAcc += event.textDelta;
          } else if (event.type === "meta") {
            lastMeta = event;
          } else if (event.type === "error") {
            throw Object.assign(new Error(event.message), {
              universalError: {
                kind: "provider",
                message: event.message,
                provider: cfg?.id ?? null,
                raw: event.raw,
                debug,
              },
            });
          } else if (event.type === "done") {
            break;
          }

          const next = usePlaygroundStore.getState().chat.messages.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: visibleAcc,
                  parts: [{ type: "markdown", text: visibleAcc } as UniversalContentPart],
                }
              : m,
          );
          setChat({ messages: next });
        }

        const finalMessages = usePlaygroundStore.getState().chat.messages.map((m) =>
          m.id === assistantId ? { ...m, raw: { debug, lastMeta, mode: "stream" } } : m,
        );
        setChat({ messages: finalMessages, lastDebug: { ...debug, streamMode: "stream" } });
      } catch (streamError: any) {
        const kind = streamError?.universalError?.kind;
        if (kind !== "unsupported") throw streamError;

        const response = await sendChatMessage({
          apiItem: selectedApi,
          model: chat.model,
          messages: requestMessages,
          mode: "chat",
          systemPrompt:
            chat.mode === "research"
              ? "You are a research assistant. Provide a clear, well-structured response with actionable bullets."
              : undefined,
        });
        const visibleParts = (response.parts ?? []).filter((part) => part.type !== "reasoning");
        const visibleText = visibleParts
          .map((part) => part.text ?? "")
          .filter(Boolean)
          .join("\n")
          .trim() || response.text;

        const next = usePlaygroundStore.getState().chat.messages.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: visibleText,
                parts: visibleParts.length > 0 ? visibleParts as UniversalContentPart[] : [{ type: "markdown", text: visibleText }] as UniversalContentPart[],
                raw: { raw: response.raw, debug: response.debug, mode: "non-stream", fallbackFrom: "unsupported-stream" },
              }
            : m,
        );
        setChat({
          messages: next,
          lastDebug: {
            ...(response.debug ?? {}),
            streamMode: "non-stream",
            fallbackFrom: "unsupported-stream",
          },
        });
      }

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
      const detail = error?.universalError;
      const errorText = detail ? `[${detail.kind}] ${sanitizeErrorMessage(detail.message)}` : sanitizeErrorMessage(error?.message ?? "Request failed. Check your API key.");
      setChat({ error: errorText, lastDebug: detail?.debug ?? null });
      void logAppEvent({
        type: "error",
        module: "ai-playground.chat",
        message: errorText,
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

  function cancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }

  return (
    <div className="flex h-full flex-col">
      {/* ===== Chat header removed by request ===== */}

      {/* ── Error Banner ── */}
      {chat.error && (
        <div className="mx-3 mt-2 flex-shrink-0 bg-rose-950/30 border border-rose-800/30 rounded-xl px-4 py-2.5 text-sm text-rose-300 flex items-start gap-3">
          <span className="flex-1">{chat.error}</span>
          <button
            onClick={() => setChat({ error: null })}
            className="text-rose-500 hover:text-rose-400 flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Chat Viewport (Maximized) ── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar lg:px-6">
        <div className="mx-auto flex min-h-full max-w-5xl flex-col">
          {chat.messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-4 select-none">
              <div className="text-5xl opacity-10">✦</div>
              <p className="text-fg-muted/40 text-sm font-medium">Start a conversation</p>
            </div>
          )}
          {chat.messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              msg={message}
              isStreaming={loading && message.role === "assistant" && index === chat.messages.length - 1}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Modern Composer ── */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
      <div className="sticky bottom-0 z-20 overflow-visible flex-shrink-0 border-t border-white/[0.04] bg-panel/30 backdrop-blur-md px-3 lg:px-6 pb-3 pt-2">
        <div className="mx-auto w-full max-w-[1600px] overflow-visible">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <select
                  value={chat.mode === "image" || chat.mode === "video" || chat.mode === "audio" ? chat.mode : "chat"}
                  onChange={(e) => setChat({ mode: e.target.value as any })}
                  className="bg-surface border border-stroke text-fg-secondary text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary min-w-[100px]"
                  title="Mode"
                >
                  <option value="chat">Chat</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                </select>
                <ApiSelector
                  aiItems={aiItems}
                  value={chat.apiId}
                  onChange={(apiId) =>
                    setChat({
                      apiId,
                      model: getProviderDefaultModel(apiId, aiItems),
                    })
                  }
                  label=""
                  compact
                />
                <ModelSelector
                  apiId={chat.apiId}
                  aiItems={aiItems}
                  value={chat.model}
                  onChange={(model) => setChat({ model })}
                  mode={chat.mode === "image" || chat.mode === "video" ? chat.mode : "chat"}
                  compact
                />
              </div>
              <div className="flex items-center gap-1.5">
                {loading && (
                  <button
                    onClick={cancel}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-stroke/60 text-xs text-fg-muted transition hover:border-rose-500/40 hover:text-rose-300"
                    title="Cancel"
                    type="button"
                  >
                    ■
                  </button>
                )}
                <button
                  onClick={() => void send()}
                  disabled={(!chat.input.trim() && attachments.length === 0) || loading}
                  className="flex h-8 min-w-[72px] flex-shrink-0 items-center justify-center rounded-lg bg-primary px-3 text-xs font-bold text-on-primary transition hover:brightness-110 active:scale-95 disabled:opacity-20"
                >
                  {loading ? <InlineSpinner compact /> : "Send"}
                </button>
              </div>
            </div>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                void handleFiles(event.dataTransfer.files);
              }}
              className={`flex min-h-[48px] min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 shadow-sm transition-all ${
                isDragging ? "border-primary/60 bg-primary/5" : "border-white/[0.08] bg-surface/30"
              } focus-within:border-primary/40 w-full`}
            >
              <div className="flex flex-shrink-0 items-center">
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-panel/40 text-sm text-fg-muted transition hover:bg-panel/60 hover:text-fg-secondary"
                  title="Add files"
                  onClick={() => fileInputRef.current?.click()}
                >
                  +
                </button>
              </div>
              {attachments.length > 0 ? (
                <div className="mb-auto flex max-w-[200px] flex-wrap gap-1.5 self-start pt-0.5">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-panel/60 px-2 py-0.5 text-[10px] text-fg-secondary"
                    >
                      <span className="max-w-[80px] truncate">{attachment.name}</span>
                      <span className="text-fg-muted">{attachment.sizeLabel}</span>
                      <button type="button" onClick={() => removeAttachment(attachment.id)} className="text-fg-muted hover:text-rose-300 ml-0.5">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
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
                  chat.mode === "image"
                      ? "Describe the image you want..."
                      : chat.mode === "video"
                        ? "Describe the video concept you want..."
                        : chat.mode === "audio"
                          ? "Describe the audio you want..."
                          : attachments.length > 0
                            ? "Add instructions for the attached files..."
                            : "Message..."
                }
                rows={1}
                disabled={loading}
                className="flex-1 min-w-0 w-full bg-transparent text-sm text-fg resize-none focus:outline-none placeholder:text-fg-muted/50 min-h-[32px] max-h-[120px] leading-relaxed px-3 py-2"
                onInput={(event) => {
                  const target = event.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
              />
            </div>
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-2" />
              <span className="text-[9px] text-fg-muted/40 font-mono">
                {chat.messages.filter((message) => message.role === "user").length} turns · {cfg?.label ?? "AI"} · {chat.model || "model"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function parseIdeas(raw: string): PlaygroundIdeaItem[] {
  const items: PlaygroundIdeaItem[] = [];
  const numbered = raw.match(
    /\d+[.)]\s+\*{0,2}([^\n*:]+)\*{0,2}\s*[:\-–]\s*([^\n]+(?:\n(?!\d+[.)])[^\n]+)*)/g
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
      .replace(/^[\d.)\-*#]+\s*/, "")
      .replace(/\*\*/g, "")
      .replace(/[:\-–].*/, "")
      .trim();
    const description = lines
      .slice(1)
      .join(" ")
      .replace(/\*\*/g, "")
      .replace(/^[-:\s]+/, "")
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

    setIdeas({ error: null, ideas: [], lastDebug: null });
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
      const response = await sendChatMessage({
        apiItem: selectedApi,
        model: ideasState.model,
        messages: [{ id: genId(), role: "user", content: prompt, timestamp: new Date() }],
      });
      const parsed = parseIdeas(response.text);
      setIdeas({
        ideas: parsed.length
          ? parsed
          : [{ id: genId(), title: "Raw Output", description: response.text }],
        lastDebug: response.debug ?? null,
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
      setIdeas({ error: sanitizeErrorMessage(error?.message ?? "Failed to generate ideas."), lastDebug: error?.universalError?.debug ?? null });
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
            Explore Model
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
              "Generate Explore Ideas"
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

      {ideasState.lastDebug && (
        <details className="glass-panel px-4 py-3 text-xs text-fg-muted">
          <summary className="cursor-pointer select-none">Debug (last run)</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
            {JSON.stringify(ideasState.lastDebug, null, 2)}
          </pre>
        </details>
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
          <div className="text-4xl mb-3">Explore</div>
          <p className="text-fg-muted text-sm">
            Generate AI-powered prompts, workflows, and product inspiration.
          </p>
        </div>
      )}

      {viewingLiked && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-fg-muted uppercase tracking-widest">
              Saved Explore Ideas
            </span>
            <button
              onClick={() => setViewingLiked(false)}
              className="text-xs text-fg-muted hover:text-fg-secondary transition-colors"
            >
              Back to Explore
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

      <div className="glass-panel flex-1 overflow-visible flex flex-col" style={{ minHeight: 320 }}>
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
      debug: null,
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
    updateColumn(id, { status: "loading", error: null, runToken, debug: null });

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
        response: normalizeGeneratedText(response.text),
        error: null,
        debug: response.debug ?? null,
      });
      setResearch({ lastDebug: response.debug ?? null });

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
        error: sanitizeErrorMessage(error?.message ?? "Request failed."),
        debug: error?.universalError?.debug ?? null,
      });
      setResearch({ lastDebug: error?.universalError?.debug ?? null });
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
    setResearch({ summary: "", summaryError: null, lastDebug: null });

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
      setResearch({ summary: normalizeGeneratedText(summary.text), lastDebug: summary.debug ?? null });
    } catch (error: any) {
      setResearch({
        summaryError: error?.message ?? "Summary generation failed.",
        lastDebug: error?.universalError?.debug ?? null,
      });
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

      {/* Always-visible Summary Section at Bottom */}
      <div className="glass-panel p-4 space-y-3 flex-shrink-0 border-t-2 border-primary/20 bg-primary/5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-primary uppercase tracking-widest">
              🤖 AI Research Summary
            </h3>
            {anyResponse && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-bold">
                {research.columns.filter(col => col.response).length} responses ready
              </span>
            )}
          </div>
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
              label=""
              compact
            />
            <ModelSelector
              apiId={research.summaryApiId}
              aiItems={aiItems}
              value={research.summaryModel}
              onChange={(model) => setResearch({ summaryModel: model })}
              compact
            />
            <button
              onClick={() => void generateSummary()}
              disabled={summaryLoading || !anyResponse}
              className="btn-primary min-w-0 text-sm py-3 px-6 font-bold disabled:opacity-50 shadow-lg hover:shadow-xl transition-all"
            >
              {summaryLoading ? (
                <span className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap">
                  <InlineSpinner compact /> <span className="truncate">Generating Summary...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>📋</span>
                  <span>Summarize All Results</span>
                </span>
              )}
            </button>
            {research.summary && (
              <button
                onClick={() => void saveSummaryToStuff()}
                disabled={savingSummaryToStuff}
                className="btn-ghost text-sm py-3 px-4 font-bold disabled:opacity-50 border-2 border-primary/30 hover:border-primary/60"
              >
                {savingSummaryToStuff ? (
                  <span className="flex items-center gap-2">
                    <InlineSpinner compact /> <span>Saving...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>💾</span>
                    <span>Save Summary</span>
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {research.summaryError && (
          <div className="bg-rose-950/40 border border-rose-800/40 rounded-xl px-4 py-3 text-sm text-rose-300">
            <span className="font-bold">❌ Summary Error:</span> {research.summaryError}
          </div>
        )}

        {research.summary && (
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 rounded-xl p-6 shadow-inner">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📄</span>
              <h4 className="text-lg font-bold text-primary">Consolidated Summary</h4>
            </div>
            <GeneratedText text={research.summary} className="text-sm text-fg-secondary leading-relaxed" />
          </div>
        )}

        {!research.summary && !summaryLoading && !research.summaryError && anyResponse && (
          <div className="text-center py-6">
            <div className="text-4xl mb-3 opacity-50">📋</div>
            <p className="text-sm text-fg-muted mb-4">
              Ready to synthesize {research.columns.filter(col => col.response).length} AI responses into one comprehensive summary?
            </p>
            <p className="text-xs text-fg-muted/70">
              Click "Summarize All Results" to get a unified answer from all your AI researchers.
            </p>
          </div>
        )}

        {!anyResponse && !summaryLoading && (
          <div className="text-center py-6">
            <div className="text-4xl mb-3 opacity-30">⏳</div>
            <p className="text-sm text-fg-muted">
              Run your research prompt across multiple AIs first, then generate a summary here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const AiPlaygroundPanel = () => {
  const user = useAppStore((state) => state.user);
  const appSettings = useAppStore((state) => state.appSettings);
  const hydrateForUser = usePlaygroundStore((state) => state.hydrateForUser);
  const activeTab = usePlaygroundStore((state) => state.activeTab);
  const setActiveTab = usePlaygroundStore((state) => state.setActiveTab);
  const chat = usePlaygroundStore((state) => state.chat);
  const setChat = usePlaygroundStore((state) => state.setChat);
  const [apiItems, setApiItems] = useState<ApiVaultItem[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);

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
    <div className="flex flex-col min-h-[calc(100vh-56px)]">
      <div className="sticky top-[15px] z-30 grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 border-b border-white/[0.04] bg-panel/10 backdrop-blur-sm">
        <div className="min-w-0 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary">
            AI
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black tracking-tight text-fg truncate sm:text-2xl">AI Playground</div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="hidden sm:flex items-center gap-1 rounded-full border border-white/[0.06] bg-surface/30 p-1.5">
            {(["chat", "ideas", "research"] as PlaygroundTabId[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`px-5 py-2 text-sm font-extrabold rounded-full transition ${
                  activeTab === key
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-fg-muted hover:text-fg-secondary"
                }`}
              >
                {key === "chat" ? "Chat" : key === "ideas" ? "Explore" : "Research"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          {loadingKeys ? (
            <span className="flex items-center gap-2 text-[11px] text-fg-muted whitespace-nowrap">
              <InlineSpinner compact /> <span className="truncate">Loading keys...</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-surface border border-stroke text-[11px] text-fg-muted">
              {apiItems.length} key{apiItems.length !== 1 ? "s" : ""}
            </span>
          )}
          {activeTab === "chat" && chat.messages.length > 0 ? (
            <button
              type="button"
              onClick={() => setChat({ messages: [], error: null, lastDebug: null })}
              className="rounded-xl border border-white/[0.08] bg-surface/40 px-3 py-2 text-xs font-semibold text-fg-muted transition hover:text-rose-300"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-visible">
        {loadingKeys ? (
          <div className="h-full flex items-center justify-center gap-3 whitespace-nowrap">
            <InlineSpinner compact />
            <span className="min-w-0 truncate text-fg-muted text-sm">Loading AI workspace...</span>
          </div>
        ) : apiItems.length === 0 ? (
          <NoApiConfigured />
        ) : (
          activeTab === "chat" ? (
            <AiChatTab aiItems={apiItems} defaultProvider={defaultProvider} />
          ) : !userId ? (
            <div className="h-full flex items-center justify-center text-sm text-fg-muted">
              Sign in to use this workspace.
            </div>
          ) : activeTab === "ideas" ? (
            <IdeaGeneratorTab aiItems={apiItems} defaultProvider={defaultProvider} userId={userId} />
          ) : (
            <ResearchTab aiItems={apiItems} defaultProvider={defaultProvider} />
          )
        )}
      </div>
    </div>
  );
};

export default AiPlaygroundPanel;

