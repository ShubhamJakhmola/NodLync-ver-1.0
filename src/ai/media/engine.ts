/**
 * NodLync Media Generation Engine
 *
 * Manages the async lifecycle of media generation jobs.
 * Routes requests through provider-specific adapters and handles
 * the async polling/queue flow for long-running jobs.
 */

import type { ApiVaultItem } from "../../api/apiVaultApi";
        import { invokeAiProxyStream } from "../../api/aiProxyStream";
        import type {
          MediaGenerationOptions,
          MediaJob,
          MediaModality,
          MediaProviderRequest,
        } from "./types";
        import { resolveMediaAdapter } from "./providers";

        const MAX_POLL_ATTEMPTS = 50;
        const POLL_INTERVAL_MS = 3000;

        function genJobId() {
          return `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        }

        export type MediaJobUpdateCallback = (job: MediaJob) => void;

        function sleep(ms: number) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }

        /**
         * Execute a media request via the edge function transport layer.
         * Strictly validates Content-Type and HTTP status to detect routing errors.
         */
        function summarizeHtmlError(html: string): string {
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
          const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);

          const candidate =
            (preMatch?.[1] ? preMatch[1] : null) ??
            (h1Match?.[1] ? h1Match[1] : null) ??
            (titleMatch?.[1] ? titleMatch[1] : null) ??
            "Upstream returned HTML error page.";

          return candidate
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 240);
        }

        async function executeMediaRequest(
          payload: MediaProviderRequest
        ): Promise<{ data: unknown; contentType: string; statusCode: number }> {
          // Use 'unknown' as intermediate step to avoid index signature error
          const res = await invokeAiProxyStream(payload as unknown as Record<string, unknown>);
          const contentType = res.headers.get("content-type") || "";
          const statusCode = res.status;

          // HARDENING: Detect HTML responses (usually 404s or edge function errors)
          if (contentType.includes("text/html")) {
            const text = await res.text();
            const summary = summarizeHtmlError(text);
            const hint =
              statusCode === 404
                ? " (404 Not Found — check the selected provider supports this endpoint/model.)"
                : "";
            throw Object.assign(new Error(`${summary}${hint}`), {
              kind: "routing",
              statusCode,
              contentType,
              raw: text,
            });
          }

          const text = await res.text();
          let data: unknown;
          try {
            data = JSON.parse(text);
          } catch {
            data = { rawText: text };
          }

          if (!res.ok) {
            const messageFromBody =
              typeof (data as any)?.error === "string"
                ? String((data as any).error)
                : typeof (data as any)?.error?.message === "string"
                  ? String((data as any).error.message)
                  : typeof (data as any)?.message === "string"
                    ? String((data as any).message)
                    : "";
            const hint =
              statusCode === 404
                ? " (404 Not Found — check the model/endpoint selection.)"
                : statusCode === 400
                  ? " (400 Bad Request — check model id and required fields for this provider.)"
                  : statusCode === 401 || statusCode === 403
                    ? " (Auth error — check API key / permissions.)"
                    : "";
            throw Object.assign(new Error(`${messageFromBody || `Provider returned error status ${statusCode}`}${hint}`), {
              kind: "provider",
              statusCode,
              contentType,
              data,
            });
          }

          return { data, contentType, statusCode };
        }

        /**
         * Submit a media generation job.
         * Performs capability validation BEFORE execution.
         */
        export async function submitMediaJob(
          opts: {
            apiItem: ApiVaultItem;
            providerId: string;
            model: string;
            modality: MediaModality;
            prompt: string;
            options?: MediaGenerationOptions;
          },
          onUpdate: MediaJobUpdateCallback,
        ): Promise<MediaJob> {
          const adapter = resolveMediaAdapter(opts.providerId);

          const job: MediaJob = {
            id: genJobId(),
            status: "queued",
            modality: opts.modality,
            provider: opts.providerId,
            model: opts.model,
            prompt: opts.prompt,
            options: opts.options,
            pollAttempts: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            debug: { adapterId: adapter.id },
          };

          onUpdate({ ...job });

          // 1. CAPABILITY VALIDATION (Model Level)
          const availableModels = adapter.getModels(opts.modality);
          const modelData = availableModels.find(m => m.value === opts.model);
          const capabilityKey = `${opts.modality}_generation` as any;

          if (modelData && !modelData.capabilities.includes(capabilityKey)) {
            job.status = "failed";
            job.error = {
              kind: "validation",
              message: `Model "${modelData.label}" does not support ${opts.modality} generation.`,
            };
            onUpdate({ ...job });
            return job;
          }

          // Fallback check if model isn't in static list but provider is marked as modality-unsupported
          if (adapter.supportedModalities.length > 0 && !adapter.supportedModalities.includes(opts.modality)) {
            job.status = "failed";
            job.error = {
              kind: "validation",
              message: `${adapter.label} does not support ${opts.modality} modality.`,
            };
            onUpdate({ ...job });
            return job;
          }

          try {
            const request = adapter.buildRequest(
              opts.apiItem.id,
              opts.prompt,
              opts.model,
              opts.modality,
              opts.options,
            );

            job.debug!.resolvedEndpoint = request.request.url;
            job.status = "generating";
            job.updatedAt = new Date();
            onUpdate({ ...job });

            const { data, contentType, statusCode } = await executeMediaRequest(request);
            job.debug!.contentType = contentType;
            job.debug!.rawResponse = data;

            const parsed = adapter.parseResponse(data);

            if (parsed.error) {
              job.status = "failed";
              job.error = {
                kind: "provider",
                message: parsed.error,
                provider: opts.providerId,
                raw: data,
                statusCode,
              };
              job.updatedAt = new Date();
              onUpdate({ ...job });
              return job;
            }

            if (parsed.done && parsed.result) {
              job.status = "completed";
              job.result = parsed.result;
              job.completedAt = new Date();
              job.updatedAt = new Date();
              onUpdate({ ...job });
              return job;
            }

            if (!parsed.done && parsed.pollUrl) {
              job.status = "polling";
              job.pollUrl = parsed.pollUrl;
              job.debug!.didPoll = true;
              job.updatedAt = new Date();
              onUpdate({ ...job });

              return await pollMediaJob(job, adapter, opts.apiItem.id, onUpdate);
            }

            job.status = "failed";
            job.error = {
              kind: "provider",
              message: "Provider returned a successful response but no media or poll URL was found.",
              statusCode
            };
            onUpdate({ ...job });
            return job;
          } catch (err: any) {
            job.status = "failed";
            job.error = {
              kind: err.kind || "transport",
              message: err.message,
              statusCode: err.statusCode,
              contentType: err.contentType,
              raw: err.data || err.raw,
            };
            onUpdate({ ...job });
            return job;
          }
        }

        /**
         * Poll an async media job until completion, failure, or timeout.
         * Uses provider-specific poll parsing to handle heterogeneous status shapes.
         */
        async function pollMediaJob(
          job: MediaJob,
          adapter: ReturnType<typeof resolveMediaAdapter>,
          keyId: string,
          onUpdate: MediaJobUpdateCallback,
        ): Promise<MediaJob> {
          const parsePoll = adapter.parsePollResponse ?? adapter.parseResponse;

          for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
            await sleep(POLL_INTERVAL_MS);

            job.pollAttempts = attempt + 1;
            job.updatedAt = new Date();
            onUpdate({ ...job });

            try {
              const pollRequest: MediaProviderRequest = {
                action: "http",
                keyId,
                request: { url: job.pollUrl!, method: "GET" },
              };

              const { data, statusCode } = await executeMediaRequest(pollRequest);
              const parsed = parsePoll.call(adapter, data);

              if (parsed.error) {
                job.status = "failed";
                job.error = {
                  kind: "provider",
                  message: parsed.error,
                  raw: data,
                  statusCode
                };
                onUpdate({ ...job });
                return job;
              }

              if (parsed.done && parsed.result) {
                job.status = "completed";
                job.result = parsed.result;
                job.completedAt = new Date();
                onUpdate({ ...job });
                return job;
              }

              if (parsed.pollUrl) {
                job.pollUrl = parsed.pollUrl;
              }

              // If done is false and no new pollUrl, we just continue polling the same URL
            } catch (err: any) {
              // Don't fail immediately on a single poll transport error, unless it's a 4xx/5xx
              if (err.statusCode && err.statusCode >= 400) {
                job.status = "failed";
                job.error = {
                  kind: "provider",
                  message: `Polling failed with status ${err.statusCode}: ${err.message}`,
                  statusCode: err.statusCode,
                  raw: err.data
                };
                onUpdate({ ...job });
                return job;
              }

              // For generic network errors during polling, we can retry a few times
              if (attempt > MAX_POLL_ATTEMPTS - 5) {
                job.status = "failed";
                job.error = { kind: "transport", message: "Multiple transport errors during polling." };
                onUpdate({ ...job });
                return job;
              }
            }
          }

          job.status = "timeout";
          job.error = { kind: "timeout", message: "Generation timed out after maximum polling attempts." };
          onUpdate({ ...job });
          return job;
        }
