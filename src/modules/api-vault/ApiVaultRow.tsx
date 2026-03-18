import type { ApiVaultItem } from "../../api/apiVaultApi";
import { formatDateTime } from "../../utils/format";
import ApiVaultActions from "./ApiVaultActions";
import { maskApiKey, normalizeTagList } from "./apiVaultUtils";

interface ApiVaultRowProps {
  item: ApiVaultItem;
  isSelected: boolean;
  isVisible: boolean;
  isDeleting: boolean;
  copyFeedback: string | null;
  onToggleSelect: () => void;
  onToggleReveal: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

const ApiVaultRow = ({
  item,
  isSelected,
  isVisible,
  isDeleting,
  copyFeedback,
  onToggleSelect,
  onToggleReveal,
  onCopy,
  onDelete,
}: ApiVaultRowProps) => {
  const tags = normalizeTagList(item.tags);

  return (
    <tr className="border-t border-slate-800 align-top">
      <td className="px-4 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="h-4 w-4 accent-primary"
          aria-label={`Select ${item.key_name}`}
        />
      </td>
      <td className="px-4 py-4 text-sm font-medium text-slate-100">{item.key_name}</td>
      <td className="px-4 py-4 text-sm text-slate-300">{item.provider}</td>
      <td className="px-4 py-4 text-sm text-slate-400">
        <div className="max-w-xs">
          <p>{item.description?.trim() || "No description provided."}</p>
          <p className="mt-2 font-mono text-xs text-slate-500 break-all">
            {isVisible ? item.api_key : maskApiKey(item.api_key)}
          </p>
          {copyFeedback ? <p className="mt-2 text-xs text-emerald-400">{copyFeedback}</p> : null}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-2">
          {tags.length === 0 ? (
            <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-500">
              No tags
            </span>
          ) : (
            tags.map((tag) => (
              <span
                key={`${item.id}-${tag}`}
                className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-xs text-primary"
              >
                {tag}
              </span>
            ))
          )}
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-slate-400">{formatDateTime(item.created_at ?? undefined)}</td>
      <td className="px-4 py-4">
        <ApiVaultActions
          isVisible={isVisible}
          isDeleting={isDeleting}
          onToggleReveal={onToggleReveal}
          onCopy={onCopy}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
};

export default ApiVaultRow;

