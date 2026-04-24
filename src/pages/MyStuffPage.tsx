import { useState, useEffect } from "react";
import ModuleHeader from "../components/ModuleHeader";
import InlineSpinner from "../components/InlineSpinner";
import useAppStore from "../store/useAppStore";
import { useMyStuff, useMyStuffItems } from "../hooks/useMyStuff";
import { logAppEvent } from "../utils/appLogger";
import type { MyStuffItem } from "../api/myStuffApi";

const MyStuffPage = () => {
  const user = useAppStore((state) => state.user);
  const userId = user?.id ?? null;

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [itemTitle, setItemTitle] = useState("");
  const [itemUrl, setItemUrl] = useState("");
  const [itemDescription, setItemDescription] = useState("");

  const {
    categories,
    loadingCategories,
    createCategory,
    deleteCategory,
    busyCreatingCategory,
    createItem,
    updateItem,
    deleteItem,
    busyCreatingItem,
    busyUpdatingItem,
  } = useMyStuff(userId);

  const { data: items = [], isLoading: loadingItems } = useMyStuffItems(selectedCategoryId);

  // Auto-select first category if none selected
  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // Log My Stuff view
  useEffect(() => {
    if (userId && categories.length > 0) {
      void logAppEvent({
        type: "info",
        module: "my-stuff",
        message: `Viewed My Stuff with ${categories.length} categories`,
        meta: { categoryCount: categories.length, itemCount: items.length },
      });
    }
  }, [userId, categories.length, items.length]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !categoryName.trim()) return;
    try {
      await createCategory({ user_id: userId, name: categoryName.trim() });
      setCategoryName("");
      setShowCategoryForm(false);
    } catch (err) {
      console.error("Failed to create category", err);
    }
  };

  const handleCreateOrUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !selectedCategoryId || !itemTitle.trim()) return;
    try {
      const payload = {
        title: itemTitle.trim(),
        url: itemUrl.trim() || undefined,
        description: itemDescription.trim() || undefined,
      };

      if (editingItemId) {
        await updateItem({ id: editingItemId, payload });
      } else {
        await createItem({
          user_id: userId,
          category_id: selectedCategoryId,
          ...payload,
        });
      }
      
      setItemTitle("");
      setItemUrl("");
      setItemDescription("");
      setEditingItemId(null);
      setShowItemForm(false);
    } catch (err) {
      console.error("Failed to save item", err);
    }
  };

  const openEditModal = (item: MyStuffItem) => {
    setEditingItemId(item.id);
    setItemTitle(item.title);
    setItemUrl(item.url || "");
    setItemDescription(item.description || "");
    setShowItemForm(true);
  };

  const openCreateModal = () => {
    setEditingItemId(null);
    setItemTitle("");
    setItemUrl("");
    setItemDescription("");
    setShowItemForm(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("Delete this category and all its items?")) return;
    try {
      await deleteCategory(id);
      if (selectedCategoryId === id) {
        setSelectedCategoryId(categories[0]?.id || null);
      }
    } catch (err) {
      console.error("Failed to delete category", err);
    }
  };

  const handleDeleteItem = async (id: string, categoryId: string) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await deleteItem({ id, categoryId });
    } catch (err) {
      console.error("Failed to delete item", err);
    }
  };

  if (loadingCategories) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.16))] items-center justify-center">
        <InlineSpinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col gap-4 lg:gap-6 pb-4">
      <ModuleHeader 
        title="My Stuff" 
        description="ORGANIZE YOUR PERSONAL LINKS AND NOTES" 
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        }
      >
        <div className="flex gap-3">
          <button
            type="button"
            disabled={!selectedCategoryId}
            onClick={openCreateModal}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            New Item
          </button>
        </div>
      </ModuleHeader>

      <div className="flex flex-1 flex-col lg:flex-row gap-4 lg:gap-6 overflow-hidden">
        {/* Categories Sidebar — horizontal strip on mobile, vertical on desktop */}
        <aside className="glass-panel w-full lg:w-72 flex flex-col overflow-hidden bg-surface/20 shrink-0 max-h-[180px] lg:max-h-none">
          <div className="border-b border-stroke px-6 py-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-fg-muted">Categories</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto lg:overflow-y-auto overflow-x-auto p-3 lg:p-4 flex lg:flex-col gap-1 lg:gap-1">
            {categories.length === 0 ? (
              <p className="p-4 text-center text-sm text-fg-muted">No categories yet.</p>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className={`group relative flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-all whitespace-nowrap lg:whitespace-normal shrink-0 lg:shrink ${
                    selectedCategoryId === category.id
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-fg-muted hover:bg-surface/50 border border-transparent"
                  }`}
                  onClick={() => setSelectedCategoryId(category.id)}
                >
                  <span className="text-sm font-semibold truncate pr-6">{category.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(category.id);
                    }}
                    className="absolute right-2 text-fg-muted hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Category"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-stroke bg-surface/10">
            <button
              type="button"
              onClick={() => setShowCategoryForm(true)}
              className="w-full btn-ghost py-2.5 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 group"
            >
              <span className="text-lg group-hover:scale-125 transition-transform">+</span>
              New Category
            </button>
          </div>
        </aside>

        {/* Items Grid */}
        <main className="glass-panel flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-stroke px-8 py-5 flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-fg truncate">
              {selectedCategory?.name || "Select Category"}
            </h2>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-stroke bg-surface px-3 py-1 text-xs text-fg-muted">
                {items.length} items
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {loadingItems ? (
              <div className="flex h-full items-center justify-center">
                <InlineSpinner />
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-3xl bg-surface flex items-center justify-center mb-6 border border-stroke">
                   <span className="text-2xl">📁</span>
                </div>
                <h3 className="text-lg font-bold text-fg-secondary">Empty Category</h3>
                <p className="mt-2 max-w-sm text-sm text-fg-muted leading-relaxed">
                  There are no items in this category yet. Click "New Item" above to add your first link or note.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="group relative flex flex-col justify-between rounded-3xl border border-stroke bg-panel/40 p-6 shadow-sm hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all"
                  >
                    <div>
                      <h4 className="text-lg font-bold text-fg mb-2 truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-sm text-fg-muted line-clamp-3 leading-relaxed mb-4">
                        {item.description || "No description provided."}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-stroke/60 pt-4 gap-2">
                       <div className="flex gap-2">
                          {item.url && (
                             <a
                               href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="btn-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                             >
                               Launch
                             </a>
                          )}
                          <button
                            onClick={() => openEditModal(item)}
                            className="btn-ghost px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-stroke/50"
                          >
                            Edit
                          </button>
                       </div>
                      <button
                        onClick={() => handleDeleteItem(item.id, item.category_id)}
                        className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Category Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="glass-panel w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-fg">New Category</h3>
              <button
                onClick={() => setShowCategoryForm(false)}
                className="rounded-lg p-2 text-fg-muted hover:bg-surface/50 hover:text-fg"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-fg-muted">Name</label>
                <input
                  autoFocus
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Design Inspiration"
                  className="w-full rounded-2xl border border-stroke bg-surface px-4 py-3 text-sm text-fg outline-none focus:border-primary transition"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={busyCreatingCategory}
                  className="btn-primary flex-1 py-3 text-sm font-bold shadow-lg shadow-primary/20"
                >
                  {busyCreatingCategory ? "Creating..." : "Create Category"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCategoryForm(false)}
                  className="btn-ghost flex-1 py-3 text-sm font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="glass-panel w-full max-w-lg p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">In {selectedCategory?.name}</p>
                <h3 className="text-xl font-bold text-fg">{editingItemId ? "Edit Item" : "Add New Item"}</h3>
              </div>
              <button
                onClick={() => {
                  setShowItemForm(false);
                  setEditingItemId(null);
                }}
                className="rounded-lg p-2 text-fg-muted hover:bg-surface/50 hover:text-fg"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateOrUpdateItem} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-fg-muted">Title</label>
                <input
                  autoFocus
                  required
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="e.g. Awesome Article"
                  className="w-full rounded-2xl border border-stroke bg-surface px-4 py-3 text-sm text-fg outline-none focus:border-primary transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-fg-muted">URL (optional)</label>
                <input
                  value={itemUrl}
                  onChange={(e) => setItemUrl(e.target.value)}
                  placeholder="e.g. https://example.com"
                  className="w-full rounded-2xl border border-stroke bg-surface px-4 py-3 text-sm text-fg outline-none focus:border-primary transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-fg-muted">Description (optional)</label>
                <textarea
                  rows={4}
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="What is this about?"
                  className="w-full rounded-2xl border border-stroke bg-surface px-4 py-3 text-sm text-fg outline-none focus:border-primary transition resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={busyCreatingItem || busyUpdatingItem}
                  className="btn-primary flex-1 py-3 text-sm font-bold shadow-lg shadow-primary/20"
                >
                  {busyCreatingItem || busyUpdatingItem ? "Saving..." : editingItemId ? "Update Item" : "Save Item"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowItemForm(false);
                    setEditingItemId(null);
                  }}
                  className="btn-ghost flex-1 py-3 text-sm font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyStuffPage;
