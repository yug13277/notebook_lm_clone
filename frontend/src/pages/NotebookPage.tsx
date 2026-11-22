import { lazy, Suspense, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../services/documentsService";
import { notebooksApi } from "../services/notebooksService";
import { useDialog } from "../hooks/useDialog";
import { useAuth } from "../hooks/useAuth";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ApiError } from "../types/auth";
import type { Document } from "../types/documents";
import { StatusBadge } from "../components/StatusBadge";
import { ChatPanel } from "../components/ChatPanel";
import { NotebookOverviewPanel } from "../components/NotebookOverviewPanel";
import { ShareNotebookDialog } from "../components/ShareNotebookDialog";
import { RenameDialog } from "../components/RenameDialog";
const PdfReader = lazy(() => import("../components/PdfReader").then(module => ({ default: module.PdfReader })));
import { WebResearchPanel } from "../components/WebResearchPanel";
import { X } from "react-feather";

export function NotebookPage() {
  const { notebookId } = useParams<{ notebookId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const { user } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "web" | "overview">("chat");
  const [openDocument, setOpenDocument] = useState<Document | null>(null);
  const [selectedPdfQuery, setSelectedPdfQuery] = useState("");

  const notebookQuery = useQuery({
    queryKey: ["notebooks", notebookId],
    queryFn: () => notebooksApi.get(notebookId!),
    enabled: !!notebookId,
  });

  useDocumentTitle(notebookQuery.data?.name ?? "Notebook");

  const isOwner = !!user && notebookQuery.data?.created_by === user.id;

  const nbDocsQuery = useQuery({
    queryKey: ["notebooks", notebookId, "documents"],
    queryFn: () => notebooksApi.listDocuments(notebookId!),
    enabled: !!notebookId,
  });

  const allDocsQuery = useQuery({
    queryKey: ["documents"],
    queryFn: () => documentsApi.listDocuments(),
  });

  const invalidateDocs = () =>
    queryClient.invalidateQueries({ queryKey: ["notebooks", notebookId, "documents"] });

  const attachMutation = useMutation({
    mutationFn: (documentId: string) => notebooksApi.attachDocument(notebookId!, documentId),
    onSuccess: invalidateDocs,
    onError: (err) =>
      void dialog.alert(err instanceof ApiError ? err.message : "Failed to add document"),
  });

  const detachMutation = useMutation({
    mutationFn: (documentId: string) => notebooksApi.detachDocument(notebookId!, documentId),
    onSuccess: invalidateDocs,
    onError: (err) =>
      void dialog.alert(err instanceof ApiError ? err.message : "Failed to remove document"),
  });

  const renameMutation = useMutation({
    mutationFn: (name: string) => notebooksApi.update(notebookId!, { name }),
    onSuccess: () => {
      setRenameOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
    onError: (err) =>
      void dialog.alert(err instanceof ApiError ? err.message : "Failed to rename notebook"),
  });

  const nbDocIds = new Set((nbDocsQuery.data ?? []).map((d: Document) => d.id));
  const addableDocs = (allDocsQuery.data ?? []).filter((d: Document) => !nbDocIds.has(d.id));

  if (!notebookId) return null;

  // U5: a private notebook you weren't shared on (403) or a bad id (404) gets a real
  // error state — never the endless "Loading…" + empty chat it used to fall through to.
  if (notebookQuery.isError) {
    const status = notebookQuery.error instanceof ApiError ? notebookQuery.error.status : 0;
    const [heading, body] =
      status === 403
        ? [
            "You don't have access to this notebook",
            "This notebook is private. Ask its owner to share it with you.",
          ]
        : status === 404
          ? ["Notebook not found", "It may have been deleted, or the link is incorrect."]
          : ["Couldn't load this notebook", "Something went wrong. Please try again."];
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        <main className="p-6 max-w-md mx-auto w-full mt-12 text-center space-y-3" role="alert">
          <h1 className="text-lg font-semibold">{heading}</h1>
          <p className="text-sm text-muted">{body}</p>
          <Link to="/app/notebooks" className="inline-block text-sm text-accent hover:underline">
            ← Back to Notebooks
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0">
      {/* Left: document membership panel */}
      <aside className="w-full max-h-56 border-b lg:max-h-none lg:w-[296px] lg:border-b-0 lg:border-r shrink-0 border-border bg-background flex flex-col overflow-hidden">
        <div className="shrink-0 px-5 py-5 border-b border-border">
          <button
            type="button"
            onClick={() => navigate("/app/notebooks")}
            className="text-xs font-medium text-accent hover:underline transition mb-3"
          >
            ← Notebooks
          </button>
          {notebookQuery.isLoading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (
            <div className="flex flex-col items-start gap-2">
              <h1 className="text-lg font-semibold tracking-tight break-words w-full" title={notebookQuery.data?.name}>
                {notebookQuery.data?.name ?? "Notebook"}
              </h1>
              {isOwner ? (
                <div className="shrink-0 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRenameOpen(true)}
                    className="text-xs text-muted hover:text-text transition"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareOpen(true)}
                    className="text-xs text-accent hover:underline"
                  >
                    Share
                  </button>
                </div>
              ) : (
                <span className="shrink-0 text-xs text-muted">Shared with you</span>
              )}
            </div>
          )}
        </div>
        {isOwner && notebookQuery.data && (
          <RenameDialog
            open={renameOpen}
            title="Rename notebook"
            label="Notebook name"
            initialValue={notebookQuery.data.name}
            pending={renameMutation.isPending}
            onClose={() => setRenameOpen(false)}
            onSubmit={(name) => renameMutation.mutate(name)}
          />
        )}
        {isOwner && notebookQuery.data && (
          <ShareNotebookDialog
            open={shareOpen}
            notebookId={notebookQuery.data.id}
            notebookName={notebookQuery.data.name}
            onClose={() => setShareOpen(false)}
          />
        )}

        <div className="flex-1 overflow-y-auto">
          {/* Documents in this notebook */}
          <div className="px-4 pt-5 pb-2">
            <div className="flex items-center justify-between mb-3"><h2 className="text-xs font-semibold text-muted">Sources</h2>{nbDocsQuery.data && <span className="text-[11px] text-muted">{nbDocsQuery.data.length}</span>}</div>
            {nbDocsQuery.isLoading && <p className="text-xs text-muted px-1">Loading…</p>}
            {nbDocsQuery.data && nbDocsQuery.data.length === 0 && (
              <div className="rounded-xl border border-border bg-surface p-3">
                <p className="text-xs text-muted leading-relaxed">No documents yet. {addableDocs.length > 0 ? "Add one from the repository below." : "Upload a PDF to get started."}</p>
                {allDocsQuery.data?.length === 0 && <Link to="/app/repository" className="mt-2 inline-block text-xs font-medium text-accent hover:underline">Go to Repository →</Link>}
              </div>
            )}
            {nbDocsQuery.data && nbDocsQuery.data.length > 0 && (
              <div className="space-y-1">
                {nbDocsQuery.data.map((doc: Document) => (
                  <div
                    key={doc.id}
                    className="group flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface border border-border hover:bg-elevated transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <button type="button" onClick={() => setOpenDocument(doc)} className="text-left text-sm font-medium truncate max-w-full hover:text-accent" title={`Open ${doc.title}`}>
                        {doc.title}
                      </button>
                      <StatusBadge status={doc.status} failedStage={doc.failed_stage} />
                    </div>
                    {isOwner && (
                      <button
                        type="button"
                        aria-label={`Remove ${doc.title} from notebook`}
                        onClick={() => detachMutation.mutate(doc.id)}
                        disabled={detachMutation.isPending}
                        className="button-press text-muted hover:text-danger hover:bg-elevated rounded-lg p-1.5"
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add from repository */}
          {isOwner && addableDocs.length > 0 && (
            <div className="px-4 pt-5 pb-4 border-t border-border mt-4">
              <p className="text-xs font-semibold text-muted mb-3">
                Add from repository
              </p>
              <div className="space-y-1">
                {addableDocs.map((doc: Document) => (
                  <div
                    key={doc.id}
                    className="group flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-elevated transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" title={doc.title}>
                        {doc.title}
                      </p>
                      <StatusBadge status={doc.status} failedStage={doc.failed_stage} />
                    </div>
                    <button
                      type="button"
                      aria-label={`Add ${doc.title} to notebook`}
                      onClick={() => attachMutation.mutate(doc.id)}
                      disabled={attachMutation.isPending || doc.status !== "READY"}
                      className="button-press text-accent text-xs font-medium hover:underline rounded-lg px-1.5 py-1 disabled:opacity-30"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Right: chat / overview tabs */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="shrink-0 border-b border-border flex items-center gap-1 px-5 py-3 bg-panel" role="tablist" aria-label="Notebook view">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "web"}
            onClick={() => setActiveTab("web")}
            className={`text-sm font-medium px-4 py-2 rounded-full transition ${
              activeTab === "web" ? "bg-accent-soft text-accent" : "text-muted hover:text-text hover:bg-secondary"
            }`}
          >Ask Web</button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "chat"}
            onClick={() => setActiveTab("chat")}
            className={`text-sm font-medium px-4 py-2 rounded-full transition ${
              activeTab === "chat"
                ? "bg-accent-soft text-accent"
                : "text-muted hover:text-text hover:bg-secondary"
            }`}
          >
            Chat
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
            className={`text-sm font-medium px-4 py-2 rounded-full transition ${
              activeTab === "overview"
                ? "bg-accent-soft text-accent"
                : "text-muted hover:text-text hover:bg-secondary"
            }`}
          >
            Overview
          </button>
        </div>
        {/* Don't mount chat (and fire its history request) until the notebook itself
            has loaded — a 403/404 renders the error state above instead. */}
        {!notebookQuery.data ? (
          <p className="p-6 text-sm text-muted">Loading…</p>
        ) : activeTab === "chat" ? (
          <ChatPanel notebookId={notebookId} documents={nbDocsQuery.data ?? []}
            initialQuery={selectedPdfQuery} onInitialQueryConsumed={() => setSelectedPdfQuery("")} />
        ) : activeTab === "web" ? (
          <WebResearchPanel />
        ) : (
          <NotebookOverviewPanel notebookId={notebookId} documents={nbDocsQuery.data ?? []} />
        )}
      </div>
      {openDocument && <Suspense fallback={<p role="status">Opening PDF…</p>}><PdfReader document={openDocument} onClose={() => setOpenDocument(null)}
        onAskPdf={(query) => { setSelectedPdfQuery(query); setActiveTab("chat"); setOpenDocument(null); }} /></Suspense>}
    </div>
  );
}
