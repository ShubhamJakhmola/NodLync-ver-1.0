import type { ApiVaultItem } from "../../api/apiVaultApi";
import IndeterminateCheckbox from "../../components/IndeterminateCheckbox";
import ApiVaultRow from "./ApiVaultRow";

interface ApiVaultTableProps {
  items: ApiVaultItem[];
  visibleIds: Set<string>;
  selectedIds: Set<string>;
  allSelected: boolean;
  indeterminate: boolean;
  deletingId: string | null;
  copiedId: string | null;
  onToggleAll: () => void;
  onToggleSelect: (id: string) => void;
  onToggleReveal: (id: string) => void;
  onCopy: (item: ApiVaultItem) => void;
  onDelete: (item: ApiVaultItem) => void;
}

const ApiVaultTable = ({
  items,
  visibleIds,
  selectedIds,
  allSelected,
  indeterminate,
  deletingId,
  copiedId,
  onToggleAll,
  onToggleSelect,
  onToggleReveal,
  onCopy,
  onDelete,
}: ApiVaultTableProps) => {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
              <th className="px-4 py-3 font-medium w-10">
                <IndeterminateCheckbox
                  checked={allSelected}
                  indeterminate={indeterminate}
                  onChange={onToggleAll}
                  ariaLabel="Select all visible API keys"
                />
              </th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Tags</th>
              <th className="px-4 py-3 font-medium">Created At</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-surface/60">
            {items.map((item) => (
              <ApiVaultRow
                key={item.id}
                item={item}
                isSelected={selectedIds.has(item.id)}
                isVisible={visibleIds.has(item.id)}
                isDeleting={deletingId === item.id}
                copyFeedback={copiedId === item.id ? "Copied to clipboard." : null}
                onToggleSelect={() => onToggleSelect(item.id)}
                onToggleReveal={() => onToggleReveal(item.id)}
                onCopy={() => onCopy(item)}
                onDelete={() => onDelete(item)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ApiVaultTable;

