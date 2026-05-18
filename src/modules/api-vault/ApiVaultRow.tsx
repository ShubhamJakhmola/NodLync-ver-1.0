import type { ApiVaultItem } from "../../api/apiVaultApi";
import { formatDateTime } from "../../utils/format";
import ApiVaultActions from "./ApiVaultActions";

interface ApiVaultRowProps {
  item: ApiVaultItem;
  decryptedKey?: string;
  isSelected: boolean;
  isVisible: boolean;
  copyFeedback: string | null;
  onToggleSelect: () => void;
  onToggleReveal: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onIntrospect: () => void;
  isProbing?: boolean;
}

const ApiVaultRow = ({
  item,
  decryptedKey,
  isSelected,
  isVisible,
  copyFeedback,
  onToggleSelect,
  onToggleReveal,
  onCopy,
  onDelete,
  onIntrospect,
  isProbing,
}: ApiVaultRowProps) => {
  return (
    <tr className="border-t border-stroke align-top group hover:bg-surface/40 transition-colors">
      <td className="px-4 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="h-4 w-4 accent-primary"
          aria-label={`Select ${item.key_name}`}
        />
      </td>
      <td className="px-4 py-4 text-sm font-semibold text-fg-secondary">{item.key_name}</td>
      <td className="px-4 py-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] w-fit px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-full font-bold uppercase tracking-wider">
            {item.provider}
          </span>
          {item.baseUrl && (
            <span className="text-[9px] text-fg-muted font-mono truncate max-w-[120px]" title={item.baseUrl}>
              {item.baseUrl.replace(/^https?:\/\//, '')}
            </span>
          )}
          {item.metadata?.capabilities && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {item.metadata.capabilities.map((cap: string) => (
                <span 
                  key={cap} 
                  className="text-[8px] px-1 bg-white/5 border border-white/10 text-fg-muted rounded-sm uppercase font-bold"
                >
                  {cap.replace('_generation', '')}
                </span>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-fg-muted">
        <div className="max-w-xs overflow-hidden">
          <p className="line-clamp-1 opacity-70 mb-2">{item.description || "No description."}</p>
          <div className="font-mono text-xs break-all flex items-center gap-2">
            {isVisible ? (
              <span className="text-emerald-400">{decryptedKey || "Decrypting..."}</span>
            ) : (
              <span className="tracking-widest opacity-40">••••••••••••••••</span>
            )}
            {copyFeedback ? (
               <span className="text-[10px] text-emerald-500 font-bold uppercase">{copyFeedback}</span>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-xs font-mono text-fg-muted">
        {formatDateTime(item.created_at ?? undefined)}
      </td>
      <td className="px-4 py-4">
        <ApiVaultActions
          isVisible={isVisible}
          onToggleReveal={onToggleReveal}
          onCopy={onCopy}
          onDelete={onDelete}
          onIntrospect={onIntrospect}
          isProbing={isProbing}
        />
      </td>
    </tr>
  );
};

export default ApiVaultRow;
