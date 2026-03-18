import { useEffect, useState } from "react";

export interface ApiVaultFormValues {
  name: string;
  provider: string;
  apiKey: string;
  description: string;
  tags: string;
}

interface ApiVaultModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: ApiVaultFormValues) => Promise<boolean>;
}

const emptyForm: ApiVaultFormValues = {
  name: "",
  provider: "",
  apiKey: "",
  description: "",
  tags: "",
};

const ApiVaultModal = ({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: ApiVaultModalProps) => {
  const [form, setForm] = useState<ApiVaultFormValues>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ApiVaultFormValues, string>>>({});

  useEffect(() => {
    if (!isOpen) {
      setForm(emptyForm);
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const nextErrors: Partial<Record<keyof ApiVaultFormValues, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Name is required.";
    if (!form.provider.trim()) nextErrors.provider = "Provider is required.";
    if (!form.apiKey.trim()) nextErrors.apiKey = "API key is required.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    const didSave = await onSubmit({
      name: form.name.trim(),
      provider: form.provider.trim(),
      apiKey: form.apiKey.trim(),
      description: form.description.trim(),
      tags: form.tags.trim(),
    });

    if (didSave) {
      setForm(emptyForm);
      setErrors({});
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-2xl p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Add API key</h2>
            <p className="mt-1 text-sm text-slate-400">
              Save provider credentials using your existing vault fields.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost px-3 py-2 text-sm"
            disabled={isSubmitting}
          >
            Close
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-300">Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2.5 text-sm text-slate-100 focus:border-primary focus:outline-none"
                placeholder="Primary OpenAI Key"
              />
              {errors.name ? <p className="text-xs text-rose-400">{errors.name}</p> : null}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-300">Provider</span>
              <input
                value={form.provider}
                onChange={(e) => setForm((current) => ({ ...current, provider: e.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2.5 text-sm text-slate-100 focus:border-primary focus:outline-none"
                placeholder="OpenAI"
              />
              {errors.provider ? <p className="text-xs text-rose-400">{errors.provider}</p> : null}
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-300">API Key</span>
            <input
              value={form.apiKey}
              onChange={(e) => setForm((current) => ({ ...current, apiKey: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2.5 font-mono text-sm text-slate-100 focus:border-primary focus:outline-none"
              placeholder="sk-..."
            />
            {errors.apiKey ? <p className="text-xs text-rose-400">{errors.apiKey}</p> : null}
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-300">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
              className="min-h-24 w-full rounded-lg border border-slate-700 bg-surface px-3 py-2.5 text-sm text-slate-100 focus:border-primary focus:outline-none"
              placeholder="Optional notes about usage or scope"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-300">Tags</span>
            <input
              value={form.tags}
              onChange={(e) => setForm((current) => ({ ...current, tags: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2.5 text-sm text-slate-100 focus:border-primary focus:outline-none"
              placeholder="prod, billing, internal"
            />
            <p className="text-xs text-slate-500">Comma-separated tags, stored as entered.</p>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApiVaultModal;
