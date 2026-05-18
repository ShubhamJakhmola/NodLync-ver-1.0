import type { ApiVaultItem } from "../../api/apiVaultApi";
import IndeterminateCheckbox from "../../components/IndeterminateCheckbox";
import ApiVaultRow from "./ApiVaultRow";

interface ApiVaultTableProps {
  items: ApiVaultItem[];
  decryptedKeys: Record<string, string>;
  visibleIds: Set<string>;
  selectedIds: Set<string>;
  allSelected: boolean;
  indeterminate: boolean;
  copiedId: string | null;
  onToggleAll: () => void;
  onToggleSelect: (id: string) => void;
  onToggleReveal: (id: string) => void;
  onCopy: (item: ApiVaultItem) => void;
  onDelete: (item: ApiVaultItem) => void;
  onIntrospect: (item: ApiVaultItem) => void;
  probingIds: Set<string>;
}

const ApiVaultTable = ({
  items,
  decryptedKeys,
  visibleIds,
  selectedIds,
  allSelected,
  indeterminate,
  copiedId,
  onToggleAll,
  onToggleSelect,
  onToggleReveal,
  onCopy,
  onDelete,
  onIntrospect,
  probingIds,
}: ApiVaultTableProps) => {
  return (
    <div className="overflow-hidden rounded-xl border border-stroke">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-panel/80">
            <tr className="text-left text-xs uppercase tracking-[0.18em] text-fg-muted">
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
              <th className="px-4 py-3 font-medium">Created At</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-surface/60">
            {items.map((item) => (
              <ApiVaultRow
                key={item.id}
                item={item}
                decryptedKey={decryptedKeys[item.id]}
                isSelected={selectedIds.has(item.id)}
                isVisible={visibleIds.has(item.id)}
                copyFeedback={copiedId === item.id ? "Copied" : null}
                onToggleSelect={() => onToggleSelect(item.id)}
                onToggleReveal={() => onToggleReveal(item.id)}
                onCopy={() => onCopy(item)}
                onDelete={() => onDelete(item)}
                onIntrospect={() => onIntrospect(item)}
                isProbing={probingIds.has(item.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ApiVaultTable;
