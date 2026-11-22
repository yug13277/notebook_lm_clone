import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions, TextLayer, type PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "pdfjs-dist/web/pdf_viewer.css";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search } from "react-feather";
import type { Document } from "../types/documents";
import { apiFetchBlob } from "../services/http";
import { annotationsApi, type PdfAnnotation, type Rect } from "../services/annotationsService";
import { WebResearchPanel } from "./WebResearchPanel";

GlobalWorkerOptions.workerSrc = workerUrl;

type Selection = { quote: string; rectangles: Rect[]; top: number; left: number };

export function PdfReader({ document, onClose, onAskPdf }: { document: Document; onClose: () => void; onAskPdf?: (query: string) => void }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [webQuery, setWebQuery] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    apiFetchBlob(`/documents/${document.id}/file`).then(async blob => {
      const task = getDocument({ data: await blob.arrayBuffer() });
      loaded = await task.promise;
      if (!cancelled) setPdf(loaded);
      else await loaded.destroy();
    }).catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : "Cannot open PDF"); });
    annotationsApi.list(document.id).then(rows => { if (!cancelled) setAnnotations(rows); })
      .catch(() => { if (!cancelled) setError("Could not load annotations"); });
    return () => { cancelled = true; void loaded?.destroy(); };
  }, [document.id]);

  useEffect(() => {
    if (!pdf || !canvasRef.current || !textRef.current) return;
    let cancelled = false;
    let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | null = null;
    let textLayer: TextLayer | null = null;
    async function render() {
      const pdfPage = await pdf!.getPage(page);
      if (cancelled) return;
      const viewport = pdfPage.getViewport({ scale: 1.22 * zoom });
      const canvas = canvasRef.current!;
      const layer = textRef.current!;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.ceil(viewport.width * ratio);
      canvas.height = Math.ceil(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      layer.style.width = `${viewport.width}px`;
      layer.style.height = `${viewport.height}px`;
      layer.replaceChildren();
      renderTask = pdfPage.render({ canvasContext: canvas.getContext("2d")!, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
      await renderTask.promise;
      if (cancelled) return;
      textLayer = new TextLayer({ textContentSource: await pdfPage.getTextContent(), container: layer, viewport });
      await textLayer.render();
    }
    void render().catch(err => { if (!cancelled && err?.name !== "RenderingCancelledException") setError("Could not render this PDF page"); });
    return () => { cancelled = true; renderTask?.cancel(); textLayer?.cancel(); };
  }, [pdf, page, zoom]);

  function captureSelection() {
    const selected = window.getSelection();
    const layer = textRef.current;
    if (!selected || selected.isCollapsed || !layer || !selected.rangeCount || !pageRef.current) return;
    const range = selected.getRangeAt(0);
    if (!layer.contains(range.commonAncestorContainer)) return;
    const quote = selected.toString().trim();
    if (!quote) return;
    const pageRect = pageRef.current.getBoundingClientRect();
    const rectangles = Array.from(range.getClientRects()).filter(rect => rect.width > 1 && rect.height > 1)
      .map(rect => ({
        x: Math.max(0, (rect.left - pageRect.left) / pageRect.width),
        y: Math.max(0, (rect.top - pageRect.top) / pageRect.height),
        width: Math.min(1, rect.width / pageRect.width),
        height: Math.min(1, rect.height / pageRect.height),
      })).filter(rect => rect.x + rect.width <= 1.001 && rect.y + rect.height <= 1.001);
    if (!rectangles.length) return;
    const last = range.getBoundingClientRect();
    setSelection({ quote, rectangles, top: Math.max(12, last.bottom + 8), left: Math.max(12, Math.min(last.left, window.innerWidth - 330)) });
    setNoteOpen(false);
  }

  async function saveAnnotation(withNote: boolean) {
    if (!selection || saving) return;
    setSaving(true);
    setError(null);
    try {
      const row = await annotationsApi.create(document.id, {
        page, quote: selection.quote, rectangles: selection.rectangles,
        note: withNote ? note.trim() || null : null,
      });
      setAnnotations(rows => [...rows, row]);
      setSelection(null);
      setNote("");
      window.getSelection()?.removeAllRanges();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save annotation");
    } finally { setSaving(false); }
  }

  async function removeAnnotation(id: string) {
    try {
      await annotationsApi.remove(document.id, id);
      setAnnotations(rows => rows.filter(row => row.id !== id));
    } catch { setError("Could not remove annotation"); }
  }

  return <div className="fixed inset-0 z-50 bg-background text-text flex flex-col" role="dialog" aria-modal="true" aria-label={`PDF reader: ${document.title}`}>
    <header className="shrink-0 h-16 border-b border-border bg-panel flex items-center gap-3 px-4 sm:px-6">
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{document.title}</p><p className="text-xs text-muted">PDF reader · Select text to take action</p></div>
      {pdf && <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
        <button aria-label="Previous page" disabled={page === 1} onClick={() => { setPage(page - 1); setSelection(null); }} className="p-2 disabled:opacity-30"><ChevronLeft size={16}/></button>
        <span>{page} / {pdf.numPages}</span>
        <button aria-label="Next page" disabled={page === pdf.numPages} onClick={() => { setPage(page + 1); setSelection(null); }} className="p-2 disabled:opacity-30"><ChevronRight size={16}/></button>
        <span className="mx-2 text-border">|</span>
        <button aria-label="Zoom out" disabled={zoom <= 0.65} onClick={() => setZoom(z => Math.max(0.65, +(z - 0.15).toFixed(2)))} className="p-2 disabled:opacity-30"><ZoomOut size={16}/></button>
        <span>{Math.round(zoom * 100)}%</span>
        <button aria-label="Zoom in" disabled={zoom >= 1.6} onClick={() => setZoom(z => Math.min(1.6, +(z + 0.15).toFixed(2)))} className="p-2 disabled:opacity-30"><ZoomIn size={16}/></button>
      </div>}
      <button type="button" onClick={() => setShowNotes(open => !open)} aria-expanded={showNotes}
        className="lg:hidden rounded-xl px-3 py-2 text-xs text-accent bg-accent-soft">Notes ({annotations.length})</button>
      <button aria-label="Close PDF reader" onClick={onClose} className="rounded-xl p-2 text-muted hover:text-text hover:bg-secondary"><X size={19}/></button>
    </header>
    {error && <p role="alert" className="shrink-0 px-5 py-2 text-sm text-danger bg-danger/10">{error}</p>}
    <div className="sm:hidden shrink-0 flex items-center justify-center gap-4 border-b border-border py-2 text-sm">
      <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>{page} / {pdf?.numPages ?? "…"}</span><button disabled={!pdf || page === pdf.numPages} onClick={() => setPage(p => p + 1)}>Next</button>
    </div>
    <div className="flex-1 min-h-0 flex overflow-hidden">
      <main className="flex-1 min-w-0 overflow-auto bg-[#171a22] p-4 sm:p-8" onMouseUp={captureSelection} onKeyUp={captureSelection} onTouchEnd={() => setTimeout(captureSelection, 150)}>
        {!pdf && !error && <p className="text-sm text-muted text-center mt-20">Opening PDF…</p>}
        <div ref={pageRef} className="relative w-fit mx-auto shadow-2xl bg-white">
          <canvas ref={canvasRef} className="block" />
          <div ref={textRef} className="textLayer absolute inset-0" />
          {annotations.filter(row => row.page === page).flatMap(row => row.rectangles.map((rect, i) =>
            <div key={`${row.id}-${i}`} title={row.note ? `${row.quote}\n${row.note}` : row.quote}
              className="absolute bg-amber-300/35 pointer-events-none"
              style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` }} />))}
        </div>
      </main>
      <aside className={`${showNotes ? "fixed inset-y-16 right-0 z-[55] shadow-2xl block" : "hidden"} lg:static lg:block w-72 max-w-full shrink-0 overflow-y-auto border-l border-border bg-panel p-4 space-y-3`}>
        <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Your notes</h2><button className="lg:hidden text-muted" aria-label="Close notes" onClick={() => setShowNotes(false)}><X size={16}/></button></div>
        {annotations.length === 0 && <p className="text-xs text-muted">Select text in the PDF to highlight it or add a note.</p>}
        {annotations.map(row => <div key={row.id} className="border border-border rounded-xl p-3 text-xs space-y-2">
          <button onClick={() => setPage(row.page)} className="text-accent font-medium">Page {row.page}</button>
          <p className="line-clamp-3">“{row.quote}”</p>{row.note && <p className="text-muted whitespace-pre-wrap">{row.note}</p>}
          <button onClick={() => void removeAnnotation(row.id)} className="text-danger hover:underline">Remove</button>
        </div>)}
      </aside>
    </div>
    {selection && <div style={{ position: "fixed", top: Math.min(selection.top, window.innerHeight - 140), left: selection.left }}
      className="z-[60] w-80 max-w-[calc(100vw-24px)] bg-panel border border-border shadow-2xl rounded-2xl p-2 space-y-2">
      <div className="flex flex-wrap gap-1 text-xs">
        <button className="rounded-lg px-2 py-1.5 hover:bg-secondary" onClick={() => { void navigator.clipboard.writeText(selection.quote); setSelection(null); }}>Copy</button>
        <button disabled={saving} className="rounded-lg px-2 py-1.5 hover:bg-secondary" onClick={() => void saveAnnotation(false)}>Highlight</button>
        <button className="rounded-lg px-2 py-1.5 hover:bg-secondary" onClick={() => setNoteOpen(true)}>Add note</button>
        {onAskPdf && <button className="rounded-lg px-2 py-1.5 hover:bg-secondary" onClick={() => onAskPdf(`Explain this passage from ${document.title}: “${selection.quote.slice(0, 1000)}”`)}>Ask PDF</button>}
        <button className="rounded-lg px-2 py-1.5 bg-accent-soft text-accent flex items-center gap-1" onClick={() => { setWebQuery(`What should I know about: ${selection.quote.slice(0, 300)}`); setSelection(null); }}><Search size={12}/> Ask Web</button>
      </div>
      {noteOpen && <form onSubmit={e => { e.preventDefault(); void saveAnnotation(true); }} className="space-y-2">
        <textarea autoFocus value={note} onChange={e => setNote(e.target.value)} placeholder="Write a note…" rows={3} className="w-full bg-background border border-border rounded-lg p-2 text-xs resize-none" />
        <button type="submit" disabled={saving} className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white">Save note</button>
      </form>}
    </div>}
    {webQuery !== null && <div className="fixed inset-0 z-[70] bg-background flex flex-col">
      <div className="h-14 px-5 border-b border-border flex items-center justify-between bg-panel"><span className="text-sm font-semibold">Ask Web about your selection</span><button aria-label="Close Ask Web" onClick={() => setWebQuery(null)}><X size={18}/></button></div>
      <WebResearchPanel initialQuery={webQuery}/>
    </div>}
  </div>;
}
