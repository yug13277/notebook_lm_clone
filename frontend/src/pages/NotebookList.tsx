import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notebooksApi } from "../services/notebooksService";
import { useDialog } from "../hooks/useDialog";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../types/auth";
import type { Notebook } from "../types/knowledge";
import { ArrowUpRight, BookOpen, Edit2, Plus, Trash2 } from "react-feather";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { RenameDialog } from "../components/RenameDialog";

export function NotebookList() {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<Notebook | null>(null);

  const notebooksQuery = useQuery({
    queryKey: ["notebooks"],
    queryFn: notebooksApi.list,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notebooks"] });

  const createMutation = useMutation({
    mutationFn: (name: string) => notebooksApi.create(name, null),
    onSuccess: invalidate,
    onError: (err) =>
      void dialog.alert(err instanceof ApiError ? err.message : "Failed to create notebook"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notebooksApi.delete(id),
    onSuccess: invalidate,
    onError: (err) =>
      void dialog.alert(err instanceof ApiError ? err.message : "Failed to delete notebook"),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => notebooksApi.update(id, { name }),
    onSuccess: () => {
      setRenaming(null);
      void invalidate();
    },
    onError: (err) =>
      void dialog.alert(err instanceof ApiError ? err.message : "Failed to rename notebook"),
  });

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate(name);
    setNewName("");
    setCreating(false);
  }

  async function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation();
    const ok = await dialog.confirm(`Delete notebook "${name}"?`, {
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    deleteMutation.mutate(id);
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <main className="page-enter p-6 sm:p-10 max-w-6xl mx-auto w-full">
        <div className="flex items-start justify-between gap-4 mb-9">
          <div><h1 className="text-3xl font-semibold tracking-tight">Notebooks</h1>
          <p className="mt-2 text-sm text-muted">Keep documents and conversations together.</p></div>
          <Button
            type="button"
            onClick={() => setCreating(true)}
            size="sm"
            className="button-press shrink-0 text-sm font-medium"
          >
            <Plus size={15} aria-hidden="true" /> New notebook
          </Button>
        </div>

        {creating && (
          <div className="mb-6 flex flex-wrap gap-2 rounded-[18px] border border-border bg-surface p-4">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") { setCreating(false); setNewName(""); }
              }}
              placeholder="Notebook name"
              className="flex-1 bg-bg border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={createMutation.isPending || !newName.trim()}
              className="text-sm bg-accent text-white rounded-md px-3 py-1.5 hover:opacity-90 disabled:opacity-50"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => { setCreating(false); setNewName(""); }}
              className="text-sm border border-border rounded-md px-3 py-1.5 text-muted hover:text-text hover:bg-surface"
            >
              Cancel
            </button>
          </div>
        )}

        {notebooksQuery.isLoading && <p className="text-muted text-sm">Loading…</p>}
        {notebooksQuery.isError && (
          <p className="text-danger text-sm">Failed to load notebooks.</p>
        )}

        {notebooksQuery.data && notebooksQuery.data.length === 0 && !creating && (
          <Card className="border border-border p-10 text-center shadow-none bg-surface">
            <span className="w-12 h-12 rounded-[16px] bg-accent-soft text-accent flex items-center justify-center mx-auto mb-5"><BookOpen size={22} aria-hidden="true" /></span>
            <p className="text-muted text-sm max-w-sm mx-auto">
              No notebooks yet. Create one to start asking questions about your documents.
            </p>
          </Card>
        )}

        {notebooksQuery.data && notebooksQuery.data.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notebooksQuery.data.map((nb) => {
              const isOwner = !!user && nb.created_by === user.id;
              return (
                <Card key={nb.id} className="surface-lift flex flex-col min-h-48 border border-border bg-surface shadow-none overflow-hidden">
                  <Link to={`/app/notebooks/${nb.id}`} className="flex-1 flex flex-col p-5 focus-visible:outline-offset-[-3px]">
                    <span className="w-10 h-10 rounded-[13px] bg-accent-soft text-accent flex items-center justify-center"><BookOpen size={19} aria-hidden="true" /></span>
                    <div className="mt-auto pt-7 min-w-0 flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2"><h2 className="text-base font-semibold truncate">{nb.name}</h2>
                          {!isOwner && <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted border border-border rounded px-1.5 py-0.5">Shared</span>}
                        </div>
                        {nb.description && <p className="text-xs text-muted truncate mt-1">{nb.description}</p>}
                      </div>
                      <ArrowUpRight size={17} className="text-accent shrink-0" aria-hidden="true" />
                    </div>
                  </Link>
                  {isOwner && <div className="flex items-center gap-1 border-t border-border px-3 py-2">
                    <button type="button" aria-label={`Rename ${nb.name}`} onClick={() => setRenaming(nb)} className="button-press inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted hover:bg-elevated hover:text-text"><Edit2 size={13} aria-hidden="true" /> Rename</button>
                    <button type="button" aria-label={`Delete ${nb.name}`} onClick={(e) => void handleDelete(e, nb.id, nb.name)} className="button-press ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted hover:bg-elevated hover:text-danger"><Trash2 size={13} aria-hidden="true" /> Delete</button>
                  </div>}
                </Card>
              );
            })}
          </div>
        )}
        <RenameDialog
          open={renaming !== null}
          title="Rename notebook"
          label="Notebook name"
          initialValue={renaming?.name ?? ""}
          pending={renameMutation.isPending}
          onClose={() => setRenaming(null)}
          onSubmit={(name) => renaming && renameMutation.mutate({ id: renaming.id, name })}
        />
      </main>
    </div>
  );
}
