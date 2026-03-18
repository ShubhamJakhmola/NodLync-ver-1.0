import { useEffect, useMemo, useState } from "react";
import {
  createApiVaultItem,
  deleteApiVaultItem,
  getApiVaultItems,
  type ApiVaultItem,
} from "../../api/apiVaultApi";
import BulkDeleteBar from "../../components/BulkDeleteBar";
import InlineSpinner from "../../components/InlineSpinner";
import PaginationControls from "../../components/PaginationControls";
import { useBulkSelection } from "../../hooks/useBulkSelection";
import { usePagination } from "../../hooks/usePagination";
import useAppStore from "../../store/useAppStore";
import ApiVaultModal, { type ApiVaultFormValues } from "./ApiVaultModal";
import ApiVaultPopup from "./ApiVaultPopup";
import ApiVaultTable from "./ApiVaultTable";

function mapSaveErrorMessage(message?: string) {
  if (!message) return "Please review the form and try again.";

  const requiredFieldMatch = message.match(/null value in column "([^"]+)"/i);
  if (requiredFieldMatch) {
    const column = requiredFieldMatch[1];
    const labelMap: Record<string, string> = {
      Name: "Name",
      Provider: "Provider",
      EncryptedValue: "API Key",
      InitializationVector: "Initialization Vector",
      Description: "Description",
      Tags: "Tags",
      UserId: "User",
    };
    const fieldName = labelMap[column] ?? column;
    return `${fieldName} is required. Please fill in this field and try again.`;
  }

  return "We couldn't save this API key. Please review the form and try again.";
}

const ApiVaultPanel = () => {
  const user = useAppStore((s) => s.user);
  const projectName =
    useAppStore((s) => s.selectedProject?.name) ?? useAppStore((s) => s.projects[0]?.name);

  const [items, setItems] = useState<ApiVaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savePopupMessage, setSavePopupMessage] = useState<string | null>(null);

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
      else setItems(data);
      setIsLoading(false);
    };

    loadItems();
  }, [user]);

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

  const handleCreate = async (values: ApiVaultFormValues) => {
    if (!user) return false;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSavePopupMessage(null);
    const { data, error } = await createApiVaultItem({
      userId: user.id,
      name: values.name,
      provider: values.provider,
      apiKey: values.apiKey,
      description: values.description,
      tags: values.tags,
    });

    if (error || !data) {
      setSavePopupMessage(mapSaveErrorMessage(error?.message));
      setIsSubmitting(false);
      return false;
    }

    setItems((current) => [data, ...current]);
    setIsSubmitting(false);
    return true;
  };

  const handleDelete = async (item: ApiVaultItem) => {
    const confirmed = window.confirm(`Delete "${item.key_name}" from API Vault?`);
    if (!confirmed) return;

    setDeletingId(item.id);
    setErrorMessage(null);
    const { error } = await deleteApiVaultItem(item.id);
    if (error) {
      setErrorMessage(error.message ?? "Unable to delete API key.");
      setDeletingId(null);
      return;
    }

    setItems((current) => current.filter((entry) => entry.id !== item.id));
    setVisibleIds((current) => current.filter((id) => id !== item.id));
    selection.clearSelection();
    setDeletingId(null);
  };

  const handleBulkDelete = async () => {
    if (selection.selectedCount === 0) return;
    const confirmed = window.confirm(`Delete ${selection.selectedCount} selected API key(s)?`);
    if (!confirmed) return;

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
    setVisibleIds((current) => current.filter((id) => !selection.selectedIds.has(id)));
    selection.clearSelection();
    setBulkDeleting(false);
  };

  const handleToggleReveal = (id: string) => {
    setVisibleIds((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  };

  const handleCopy = async (item: ApiVaultItem) => {
    try {
      await navigator.clipboard.writeText(item.api_key);
      setCopiedId(item.id);
    } catch {
      setErrorMessage("Clipboard access failed. Try revealing and copying manually.");
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="glass-panel p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-[0.18em] text-slate-100 uppercase">API Vault</h1>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Internal key manager
                </span>
              </div>
              <p className="max-w-2xl text-sm text-slate-400">
                Store, search, reveal, copy, and remove provider keys without changing your existing table shape.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-500">Project context: {projectName ?? "Pick a project"}</span>
              <button type="button" className="btn-primary" onClick={() => setIsModalOpen(true)}>
                Add API Key
              </button>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid flex-1 gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Search</span>
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    pagination.setCurrentPage(1);
                  }}
                  placeholder="Search by name or provider"
                  className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2.5 text-sm text-slate-100 focus:border-primary focus:outline-none"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Tag Filter</span>
                <input
                  value={tagFilter}
                  onChange={(e) => {
                    setTagFilter(e.target.value);
                    pagination.setCurrentPage(1);
                  }}
                  placeholder="Filter by tag text"
                  className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2.5 text-sm text-slate-100 focus:border-primary focus:outline-none"
                />
              </label>
            </div>

            <div className="text-sm text-slate-500">{filteredItems.length} of {items.length} keys shown</div>
          </div>

          <BulkDeleteBar
            count={selection.selectedCount}
            label="keys"
            onDelete={handleBulkDelete}
            onClear={selection.clearSelection}
            busy={bulkDeleting}
          />

          {errorMessage ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {errorMessage}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex min-h-56 items-center justify-center">
              <InlineSpinner />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-6 text-center">
              <p className="text-lg font-medium text-slate-200">{items.length === 0 ? "No API keys saved yet." : "No keys match your filters."}</p>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                {items.length === 0
                  ? "Add your first provider credential to start managing keys here."
                  : "Try a broader search or clear the tag filter to see more results."}
              </p>
            </div>
          ) : (
            <ApiVaultTable
              items={pagination.paginatedItems}
              visibleIds={new Set(visibleIds)}
              selectedIds={selection.selectedIds}
              allSelected={pageState.checked}
              indeterminate={pageState.indeterminate}
              deletingId={deletingId}
              copiedId={copiedId}
              onToggleAll={() => selection.togglePage(pagination.paginatedItems)}
              onToggleSelect={selection.toggleOne}
              onToggleReveal={handleToggleReveal}
              onCopy={handleCopy}
              onDelete={handleDelete}
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

