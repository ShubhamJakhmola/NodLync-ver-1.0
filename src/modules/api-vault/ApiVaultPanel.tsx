  import { useEffect, useMemo, useState } from "react";
import {
  createApiVaultItem,
  deleteApiVaultItem,
  getApiVaultItems,
  revealApiVaultItem,
  updateApiVaultMetadata,
  type ApiVaultItem,
} from "../../api/apiVaultApi";
import { introspectProvider } from "../../api/aiProviderIntrospector";
import { logAppEvent } from "../../utils/appLogger";
import BulkDeleteBar from "../../components/BulkDeleteBar";
import InlineSpinner from "../../components/InlineSpinner";
import PaginationControls from "../../components/PaginationControls";
import ModuleHeader from "../../components/ModuleHeader";
import { useBulkSelection } from "../../hooks/useBulkSelection";
import { usePagination } from "../../hooks/usePagination";
import useAppStore from "../../store/useAppStore";
import ApiVaultModal, { type ApiVaultFormValues } from "./ApiVaultModal";
import ApiVaultPopup from "./ApiVaultPopup";
import ApiVaultTable from "./ApiVaultTable";

const ApiVaultPanel = () => {
  const user = useAppStore((s) => s.user);

  const [items, setItems] = useState<ApiVaultItem[]>([]);
  const [decryptedKeys, setDecryptedKeys] = useState<Record<string, string>>({});
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savePopupMessage, setSavePopupMessage] = useState<string | null>(null);
  const [probingIds, setProbingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    const loadItems = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      const { data, error } = await getApiVaultItems(user.id);
      if (error) setErrorMessage(error.message ?? "Unable to load API keys.");
      else setItems(data ?? []);
      setIsLoading(false);
    };

    loadItems();
  }, [user?.id]);

  // Log API vault view
  useEffect(() => {
    if (user && items.length > 0) {
      void logAppEvent({
        type: "info",
        module: "api-vault",
        message: `Viewed API vault with ${items.length} items`,
        meta: { itemCount: items.length },
      });
    }
  }, [user, items.length]);

  useEffect(() => {
    if (!copiedId) return;
    const timeout = window.setTimeout(() => setCopiedId(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [copiedId]);

  const filteredItems = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const tagQuery = tagFilter.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !search || item.key_name.toLowerCase().includes(search) || item.provider.toLowerCase().includes(search);
      const matchesTag = !tagQuery || (item.tags ?? "").toLowerCase().includes(tagQuery);
      return matchesSearch && matchesTag;
    });
  }, [items, searchTerm, tagFilter]);

  const pagination = usePagination(filteredItems);
  const selection = useBulkSelection(filteredItems, (item) => item.id);
  const pageState = selection.getPageState(pagination.paginatedItems);

  const handleCreate = async (values: ApiVaultFormValues): Promise<boolean> => {
    if (!user) return false;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { data, error } = await createApiVaultItem({
        key_name: values.name,
        provider: values.provider,
        apiKey: values.apiKey,
        baseUrl: values.baseUrl,
        description: values.description,
        tags: values.tags,
      });

      if (error) {
        setErrorMessage(error.message ?? "Failed to save API key.");
        setIsSubmitting(false);
        return false;
      } else if (data) {
        setItems((current) => [data, ...current]);
        setSavePopupMessage(`"${values.name}" saved to secure vault.`);
        setIsModalOpen(false);
        setIsSubmitting(false);
        return true;
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Request failed.");
    }

    setIsSubmitting(false);
    return false;
  };

  const handleToggleReveal = async (id: string) => {
    const isVisible = visibleIds.includes(id);
    if (isVisible) {
      setVisibleIds((current) => current.filter((entry) => entry !== id));
    } else {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      
      try {
        const { data, error } = await revealApiVaultItem(id);
        if (error) {
          setErrorMessage(error.message || "Reveal failed.");
        } else if (data) {
          setDecryptedKeys((prev) => ({ ...prev, [id]: data }));
          setVisibleIds((current) => [...current, id]);
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Reveal request failed.");
      }
    }
  };

  const handleCopy = async (item: ApiVaultItem) => {
    try {
      let value = decryptedKeys[item.id];
      if (!value) {
        const { data, error } = await revealApiVaultItem(item.id);
        if (error) throw new Error(error.message || "Fetch for copy failed.");
        value = data!;
        setDecryptedKeys((prev) => ({ ...prev, [item.id]: value }));
      }
      await navigator.clipboard.writeText(value);
      setCopiedId(item.id);
    } catch (err: any) {
      setErrorMessage(err.message || "Copy failed.");
    }
  };

  const handleDelete = async (item: ApiVaultItem) => {
    if (!window.confirm(`Delete key "${item.key_name}"?`)) return;
    setErrorMessage(null);
    const { error } = await deleteApiVaultItem(item.id);
    if (error) {
      setErrorMessage(error.message ?? "Failed to delete API key.");
      return;
    }
    setItems((current) => current.filter((i) => i.id !== item.id));
    setVisibleIds((current) => current.filter((id) => id !== item.id));
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selection.selectedCount} selected API keys?`)) return;
    setErrorMessage(null);
    setBulkDeleting(true);
    const ids = Array.from(selection.selectedIds);
    const results = await Promise.all(ids.map((id) => deleteApiVaultItem(id)));
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      setErrorMessage(failed.error.message ?? "Unable to delete selected API keys.");
      setBulkDeleting(false);
      return;
    }

    setItems((current) => current.filter((item) => !selection.selectedIds.has(item.id)));
    selection.clearSelection();
    setBulkDeleting(false);
  };

  const handleIntrospect = async (item: ApiVaultItem) => {
    if (probingIds.has(item.id)) return;
    
    setProbingIds((prev) => new Set(prev).add(item.id));
    setErrorMessage(null);
    
    try {
      const result = await introspectProvider(item, item.baseUrl);
      
      // Update local state and DB
      const updatedMetadata = {
        ...item.metadata,
        baseUrl: result.baseUrl,
        isOpenAiCompatible: result.isOpenAiCompatible,
        capabilities: result.capabilities,
        discoveredModels: result.discoveredModels,
        discoveredAt: new Date().toISOString(),
      };

      const { error } = await updateApiVaultMetadata(item.id, updatedMetadata);
      if (error) throw error;

      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, metadata: updatedMetadata, baseUrl: result.baseUrl } : i));
      setSavePopupMessage(`Introspection complete for "${item.key_name}". Found ${result.capabilities.length} capabilities.`);
    } catch (err: any) {
      setErrorMessage(`Introspection failed: ${err.message || "Unknown error"}`);
    } finally {
      setProbingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  return (
    <>
      <div className="space-y-6">
        <ModuleHeader
          title="API Vault"
          description="PRODUCTION-GRADE SECURE VAULT WITH REVEAL & COPY"
          icon="🛡️"
        >
          <span className="text-xs text-fg-muted mr-2">Keys are server-side encrypted.</span>
          <button type="button" className="btn-primary py-2 text-sm font-bold" onClick={() => setIsModalOpen(true)}>
            Add API Key
          </button>
        </ModuleHeader>

        <div className="glass-panel p-6 space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid flex-1 gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-fg-muted">Search</span>
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    pagination.setCurrentPage(1);
                  }}
                  placeholder="Search by name or provider"
                  className="w-full rounded-lg border border-stroke bg-surface px-3 py-2.5 text-sm text-fg focus:border-primary focus:outline-none"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-fg-muted">Tag Filter</span>
                <input
                  value={tagFilter}
                  onChange={(e) => {
                    setTagFilter(e.target.value);
                    pagination.setCurrentPage(1);
                  }}
                  placeholder="Filter by tag text"
                  className="w-full rounded-lg border border-stroke bg-surface px-3 py-2.5 text-sm text-fg focus:border-primary focus:outline-none"
                />
              </label>
            </div>

            <div className="text-sm text-fg-muted">{filteredItems.length} of {items.length} keys shown</div>
          </div>

          <BulkDeleteBar
            count={selection.selectedCount}
            label="keys"
            onDelete={handleBulkDelete}
            onClear={selection.clearSelection}
            busy={bulkDeleting}
          />

          {errorMessage ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 flex justify-between items-center group">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="opacity-0 group-hover:opacity-100 hover:text-fg transition">x</button>
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex min-h-56 items-center justify-center">
              <InlineSpinner />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-stroke bg-panel/30 px-6 text-center">
              <p className="text-lg font-medium text-fg-secondary">{items.length === 0 ? "No API keys saved yet." : "No keys match your filters."}</p>
              <p className="mt-2 max-w-md text-sm text-fg-muted">
                {items.length === 0
                  ? "Add your first provider credential to start managing keys here."
                  : "Try a broader search or clear the tag filter to see more results."}
              </p>
            </div>
          ) : (
              <ApiVaultTable
                items={pagination.paginatedItems}
                decryptedKeys={decryptedKeys}
                visibleIds={new Set(visibleIds)}
                selectedIds={selection.selectedIds}
                probingIds={probingIds}
                allSelected={pageState.checked}
                indeterminate={pageState.indeterminate}
                copiedId={copiedId}
                onToggleAll={() => selection.togglePage(pagination.paginatedItems)}
                onToggleSelect={selection.toggleOne}
                onToggleReveal={handleToggleReveal}
                onCopy={handleCopy}
                onDelete={handleDelete}
                onIntrospect={handleIntrospect}
              />
          )}

          {filteredItems.length > 0 ? (
            <PaginationControls
              currentPage={pagination.currentPage}
              pageSize={pagination.pageSize}
              totalItems={pagination.totalItems}
              totalPages={pagination.totalPages}
              startItem={pagination.startItem}
              endItem={pagination.endItem}
              onPageChange={pagination.setCurrentPage}
              onPageSizeChange={pagination.setPageSize}
              itemLabel="keys"
            />
          ) : null}
        </div>
      </div>

      <ApiVaultModal isOpen={isModalOpen} isSubmitting={isSubmitting} onClose={() => setIsModalOpen(false)} onSubmit={handleCreate} />

      {savePopupMessage ? <ApiVaultPopup message={savePopupMessage} onClose={() => setSavePopupMessage(null)} /> : null}
    </>
  );
};

export default ApiVaultPanel;
