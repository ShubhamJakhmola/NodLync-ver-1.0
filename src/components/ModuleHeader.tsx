import type { ReactNode } from "react";

export interface ModuleHeaderProps {
  title: string;
  description: string;
  icon: ReactNode;
  children?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  refreshLabel?: string;
  hideRefreshButton?: boolean;
}

export default function ModuleHeader({
  title,
  description,
  icon,
  children,
  onRefresh,
  refreshing = false,
  refreshLabel = "Refresh module",
  hideRefreshButton = false,
}: ModuleHeaderProps) {

  const handleRefreshClick = () => {
    if (onRefresh) {
      onRefresh();
      return;
    }

    window.location.reload();
  };

  return (
    <div className="glass-panel px-6 py-5 flex items-center justify-between border border-stroke/50 mb-6 flex-shrink-0 flex-wrap gap-4">
      <div className="flex items-center gap-4">
        {icon && (
          <div className="text-2xl flex items-center justify-center w-11 h-11 rounded-xl bg-surface border border-stroke-strong text-primary shadow-sm">
            {icon}
          </div>
        )}
        <div className="flex flex-col">
          <h1 className="text-2xl font-black text-fg tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-[10px] text-fg-muted font-bold uppercase tracking-[0.18em] mt-1 max-w-lg truncate">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {!hideRefreshButton && (
          <button
            type="button"
            onClick={handleRefreshClick}
            disabled={refreshing}
            title={refreshLabel}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stroke bg-panel/60 text-fg-secondary transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className={`text-lg leading-none ${refreshing ? "animate-spin" : ""}`}>
              ⭮
            </span>
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
