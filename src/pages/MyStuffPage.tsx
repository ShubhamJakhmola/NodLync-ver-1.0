import { useEffect, useState } from "react";
import useAppStore from "../store/useAppStore";
import {
  getCategories,
  createCategory,
  deleteCategory,
  getItems,
  createItem,
  deleteItem,
  type MyStuffCategory,
  type MyStuffItem,
} from "../api/myStuffApi";
import BulkDeleteBar from "../components/BulkDeleteBar";
import IndeterminateCheckbox from "../components/IndeterminateCheckbox";
import InlineSpinner from "../components/InlineSpinner";
import PaginationControls from "../components/PaginationControls";
import { useBulkSelection } from "../hooks/useBulkSelection";
import { usePagination } from "../hooks/usePagination";

const MyStuffPage = () => {
  const user = useAppStore((s) => s.user);
  const [categories, setCategories] = useState<MyStuffCategory[]>([]);
  const [items, setItems] = useState<MyStuffItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MyStuffCategory | null>(null);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catAdding, setCatAdding] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemAdding, setItemAdding] = useState(false);
  const [deletingCategories, setDeletingCategories] = useState(false);
  const [deletingItems, setDeletingItems] = useState(false);
  const [itemForm, setItemForm] = useState({ title: "", url: "", description: "" });

  const categoriesPagination = usePagination(categories);
  const itemsPagination = usePagination(items);
  const categorySelection = useBulkSelection(categories, (category) => category.id);
  const itemSelection = useBulkSelection(items, (item) => item.id);
  const categoryPageState = categorySelection.getPageState(categoriesPagination.paginatedItems);
  const itemPageState = itemSelection.getPageState(itemsPagination.paginatedItems);

  useEffect(() => {
    if (!user) return;
    const fetchCats = async () => {
      setLoadingCats(true);
      const { data } = await getCategories(user.id);
      setCategories(data);
      if (data.length > 0) setSelectedCategory(data[0]);
      setLoadingCats(false);
    };
    fetchCats();
  }, [user]);

  useEffect(() => {
    if (!selectedCategory) {
      setItems([]);
      return;
    }
    const fetchCatItems = async () => {
      setLoadingItems(true);
      const { data } = await getItems(selectedCategory.id);
      setItems(data);
      itemsPagination.setCurrentPage(1);
      itemSelection.clearSelection();
      setLoadingItems(false);
    };
    fetchCatItems();
  }, [selectedCategory]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !user) return;
    setCatAdding(true);
    const { data } = await createCategory({ user_id: user.id, name: newCatName.trim() });
    if (data) {
      setCategories((prev) => [...prev, data]);
      setNewCatName("");
      if (!selectedCategory) setSelectedCategory(data);
      categoriesPagination.setCurrentPage(1);
    }
    setCatAdding(false);
  };

  const handleDeleteCategory = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm("Delete this category? All items inside will be lost.")) return;
    await deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    if (selectedCategory?.id === id) setSelectedCategory(null);
    categorySelection.clearSelection();
  };

  const handleDeleteSelectedCategories = async () => {
    if (categorySelection.selectedCount === 0) return;
    if (!window.confirm(`Delete ${categorySelection.selectedCount} selected category(s)? All items inside will be lost.`)) return;
    setDeletingCategories(true);
    const ids = Array.from(categorySelection.selectedIds);
    await Promise.all(ids.map((id) => deleteCategory(id)));
    setCategories((prev) => prev.filter((category) => !categorySelection.selectedIds.has(category.id)));
    if (selectedCategory && categorySelection.selectedIds.has(selectedCategory.id)) {
      const remaining = categories.filter((category) => !categorySelection.selectedIds.has(category.id));
      setSelectedCategory(remaining[0] ?? null);
    }
    categorySelection.clearSelection();
    setDeletingCategories(false);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !user || !itemForm.title.trim()) return;
    setItemAdding(true);
    const { data } = await createItem({
      user_id: user.id,
      category_id: selectedCategory.id,
      title: itemForm.title.trim(),
      url: itemForm.url.trim(),
      description: itemForm.description.trim(),
    });
    if (data) {
      setItems((prev) => [data, ...prev]);
      setItemForm({ title: "", url: "", description: "" });
      setShowItemForm(false);
      itemsPagination.setCurrentPage(1);
    }
    setItemAdding(false);
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("Remove this item?")) return;
    await deleteItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    itemSelection.clearSelection();
  };

  const handleDeleteSelectedItems = async () => {
    if (itemSelection.selectedCount === 0) return;
    if (!window.confirm(`Delete ${itemSelection.selectedCount} selected item(s)?`)) return;
    setDeletingItems(true);
    await Promise.all(Array.from(itemSelection.selectedIds).map((id) => deleteItem(id)));
    setItems((prev) => prev.filter((item) => !itemSelection.selectedIds.has(item.id)));
    itemSelection.clearSelection();
    setDeletingItems(false);
  };

  const launchUrl = (url: string) => {
    let finalUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) finalUrl = `https://${url}`;
    window.open(finalUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col xl:flex-row gap-6">
      <div className="xl:w-80 flex flex-col gap-4">
        <div className="flex items-center gap-2 px-1">
          <span className="text-xl">Folder</span>
          <h2 className="text-lg font-bold text-slate-100 uppercase tracking-widest">My Stuff</h2>
        </div>

        <div className="glass-panel flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-slate-300">Categories</h3>
            <span className="text-xs text-slate-500">{categories.length}</span>
          </div>

          <div className="p-3 pb-0">
            <BulkDeleteBar
              count={categorySelection.selectedCount}
              label="categories"
              onDelete={handleDeleteSelectedCategories}
              onClear={categorySelection.clearSelection}
              busy={deletingCategories}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 mt-2">
            {loadingCats ? (
              <div className="p-4 text-center"><InlineSpinner /></div>
            ) : categories.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 italic">No categories. Create one below!</div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 px-2 py-2 text-sm text-slate-400">
                  <div className="flex items-center gap-3">
                    <IndeterminateCheckbox
                      checked={categoryPageState.checked}
                      indeterminate={categoryPageState.indeterminate}
                      onChange={() => categorySelection.togglePage(categoriesPagination.paginatedItems)}
                      ariaLabel="Select all visible categories"
                    />
                    <span>Select visible categories</span>
                  </div>
                </div>
                {categoriesPagination.paginatedItems.map((c) => {
                  const isSelectedCategory = selectedCategory?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCategory(c)}
                      className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition ${
                        isSelectedCategory ? "bg-primary/20 text-primary border border-primary/30" : "text-slate-300 hover:bg-slate-800 border border-transparent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={categorySelection.isSelected(c.id)}
                        onChange={() => categorySelection.toggleOne(c.id)}
                        onClick={(event) => event.stopPropagation()}
                        className="h-4 w-4 accent-primary"
                        aria-label={`Select ${c.name}`}
                      />
                      <span className="font-medium truncate pr-2 flex-1">{c.name}</span>
                      <button
                        onClick={(e) => handleDeleteCategory(c.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition"
                        title="Delete Category"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {categories.length > 0 ? (
            <PaginationControls
              currentPage={categoriesPagination.currentPage}
              pageSize={categoriesPagination.pageSize}
              totalItems={categoriesPagination.totalItems}
              totalPages={categoriesPagination.totalPages}
              startItem={categoriesPagination.startItem}
              endItem={categoriesPagination.endItem}
              onPageChange={categoriesPagination.setCurrentPage}
              onPageSizeChange={categoriesPagination.setPageSize}
              itemLabel="categories"
            />
          ) : null}

          <form onSubmit={handleAddCategory} className="p-3 border-t border-slate-800 bg-slate-900/50 flex gap-2">
            <input
              className="flex-1 bg-surface border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-600"
              placeholder="New category..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              disabled={catAdding}
            />
            <button type="submit" disabled={!newCatName.trim() || catAdding} className="btn-primary px-3 py-1.5 text-sm">
              Add
            </button>
          </form>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {!selectedCategory ? (
          <div className="flex-1 glass-panel flex flex-col items-center justify-center p-8 text-center">
            <span className="text-6xl mb-4 opacity-50">Card</span>
            <p className="text-lg font-medium text-slate-300">No Category Selected</p>
            <p className="text-sm text-slate-500 mt-2">Select a category on the left, or create a new one to store your links and notes.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="glass-panel p-5 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-slate-100">{selectedCategory.name}</h2>
                <p className="text-sm text-slate-400 mt-1">Manage your saved tools, websites, and resources.</p>
              </div>
              <button className="btn-primary flex items-center gap-2" onClick={() => setShowItemForm(!showItemForm)}>
                <span>{showItemForm ? "Cancel" : "Add New Stuff"}</span>
              </button>
            </div>

            {showItemForm ? (
              <form onSubmit={handleAddItem} className="glass-panel p-5 shrink-0 bg-primary/5 border-primary/20 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block space-y-1">
                    <span className="text-sm text-slate-300">Title <span className="text-rose-500">*</span></span>
                    <input
                      className="w-full bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="e.g. ChatGPT, Node.js Docs..."
                      required
                      value={itemForm.title}
                      onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-slate-300">URL / Link</span>
                    <input
                      className="w-full bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
                      placeholder="chatgpt.com"
                      value={itemForm.url}
                      onChange={(e) => setItemForm({ ...itemForm, url: e.target.value })}
                    />
                  </label>
                </div>
                <label className="block space-y-1">
                  <span className="text-sm text-slate-300">Description / Notes</span>
                  <textarea
                    rows={2}
                    className="w-full bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    placeholder="Brief note about this resource..."
                    value={itemForm.description}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  />
                </label>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowItemForm(false)} className="btn-ghost text-sm">Cancel</button>
                  <button type="submit" disabled={!itemForm.title.trim() || itemAdding} className="btn-primary text-sm min-w-[100px]">
                    {itemAdding ? "Saving..." : "Save Item"}
                  </button>
                </div>
              </form>
            ) : null}

            <div className="glass-panel p-5 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <IndeterminateCheckbox
                    checked={itemPageState.checked}
                    indeterminate={itemPageState.indeterminate}
                    onChange={() => itemSelection.togglePage(itemsPagination.paginatedItems)}
                    ariaLabel="Select all visible items"
                  />
                  <p className="text-sm text-slate-400">Select visible items</p>
                </div>
                <span className="text-xs text-slate-500">{items.length} total</span>
              </div>

              <BulkDeleteBar
                count={itemSelection.selectedCount}
                label="items"
                onDelete={handleDeleteSelectedItems}
                onClear={itemSelection.clearSelection}
                busy={deletingItems}
              />

              {loadingItems ? (
                <div className="flex justify-center p-8"><InlineSpinner /></div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                  <span className="text-4xl mb-3 opacity-30">Note</span>
                  <p className="text-slate-400">This category is empty.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {itemsPagination.paginatedItems.map((item) => {
                    const hasUrl = !!item.url?.trim();
                    return (
                      <div key={item.id} className="bg-surface border border-slate-800 rounded-xl p-4 flex flex-col gap-3 group relative transition hover:border-slate-600 hover:shadow-lg">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={itemSelection.isSelected(item.id)}
                              onChange={() => itemSelection.toggleOne(item.id)}
                              className="h-4 w-4 accent-primary mt-1"
                              aria-label={`Select ${item.title}`}
                            />
                            <h3 className="font-bold text-slate-200 line-clamp-1 flex-1" title={item.title}>{item.title}</h3>
                          </div>
                          <button className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition" onClick={() => handleDeleteItem(item.id)} title="Delete">
                            ×
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 flex-1 min-h-[2rem]">{item.description || "No description provided."}</p>
                        {hasUrl ? (
                          <div className="pt-3 border-t border-slate-800 mt-auto flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono text-slate-500 truncate flex-1" title={item.url}>{item.url}</span>
                            <button onClick={() => launchUrl(item.url as string)} className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-md font-semibold transition shrink-0 flex items-center gap-1.5">
                              <span>Launch</span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {items.length > 0 ? (
              <div className="glass-panel">
                <PaginationControls
                  currentPage={itemsPagination.currentPage}
                  pageSize={itemsPagination.pageSize}
                  totalItems={itemsPagination.totalItems}
                  totalPages={itemsPagination.totalPages}
                  startItem={itemsPagination.startItem}
                  endItem={itemsPagination.endItem}
                  onPageChange={itemsPagination.setCurrentPage}
                  onPageSizeChange={itemsPagination.setPageSize}
                  itemLabel="items"
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyStuffPage;

