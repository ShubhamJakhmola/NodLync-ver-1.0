import { useEffect, useMemo, useRef, useState } from "react";

export function useBulkSelection<T>(
  items: T[],
  getId: (item: T) => string
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Callers often pass `getId` inline (new function each render). If we include `getId`
  // in memo deps, `itemIds` changes every render which can cascade into infinite updates.
  // Keep the latest `getId` in a ref and only recompute ids when `items` change.
  const getIdRef = useRef(getId);
  useEffect(() => {
    getIdRef.current = getId;
  }, [getId]);

  const itemIds = useMemo(() => new Set(items.map((item) => getIdRef.current(item))), [items]);

  useEffect(() => {
    setSelectedIds((current) => {
      const next = new Set<string>();
      current.forEach((id) => {
        if (itemIds.has(id)) next.add(id);
      });
      // Avoid rerenders when nothing changed
      if (next.size === current.size) {
        let same = true;
        current.forEach((id) => {
          if (!next.has(id)) same = false;
        });
        if (same) return current;
      }
      return next;
    });
  }, [itemIds]);

  const selectedCount = selectedIds.size;

  const isSelected = (id: string) => selectedIds.has(id);

  const toggleOne = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const togglePage = (pageItems: T[]) => {
    const pageIds = pageItems.map(getId);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

    setSelectedIds((current) => {
      const next = new Set(current);
      pageIds.forEach((id) => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  const getPageState = (pageItems: T[]) => {
    const pageIds = pageItems.map(getId);
    const selectedOnPage = pageIds.filter((id) => selectedIds.has(id)).length;
    return {
      checked: pageIds.length > 0 && selectedOnPage === pageIds.length,
      indeterminate: selectedOnPage > 0 && selectedOnPage < pageIds.length,
    };
  };

  return {
    selectedIds,
    selectedCount,
    isSelected,
    toggleOne,
    clearSelection,
    togglePage,
    getPageState,
  };
}

