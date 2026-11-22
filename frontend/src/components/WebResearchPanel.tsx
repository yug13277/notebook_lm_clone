import { useEffect, useState } from "react";
import { ExternalLink, Search, Send } from "react-feather";
import { webResearchApi, type WebResearchResult } from "../services/webResearchService";
import { ApiError } from "../types/auth";

export function WebResearchPanel({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<WebResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => setQuery(initialQuery), [initialQuery]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 3 || pending) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      setResult(await webResearchApi.ask(q));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Web research failed. Please retry.");
    } finally {
      setPending(false);
    }
  }

  return <section className="flex-1 min-h-0 overflow-y-auto bg-background" aria-label="Ask Web">
    <div className="max-w-3xl mx-auto px-5 py-8 sm:py-12 space-y-7">
      <div className="space-y-2">
        <div className="h-11 w-11 rounded-2xl bg-accent-soft text-accent flex items-center justify-center"><Search size={20}/></div>
        <h2 className="text-2xl font-semibold tracking-tight">Ask the web</h2>
        <p className="text-sm text-muted">Research public sources. Results here are separate from your PDF answers.</p>
      </div>
      <form onSubmit={submit} className="flex gap-2 items-end bg-panel border border-border rounded-2xl p-2 shadow-sm">
        <label className="sr-only" htmlFor="web-query">Web question</label>
        <textarea id="web-query" value={query} onChange={e => setQuery(e.target.value)} rows={2}
          placeholder="What else should I know about this topic?"
          className="flex-1 min-w-0 resize-none bg-transparent px-3 py-2 text-sm outline-none" />
        <button type="submit" disabled={pending || query.trim().length < 3}
          className="button-press rounded-xl bg-primary text-white px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-40">
          {pending ? "Searching…" : <><span>Ask Web</span><Send size={14}/></>}
        </button>
      </form>
      {error && <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
      {result && <div className="space-y-6">
        <div className="rounded-2xl bg-panel border border-border p-5 sm:p-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">{result.generated ? "Web answer" : "Web source previews"}</p>
          <p className="text-sm leading-7 whitespace-pre-wrap">{result.answer}</p>
          <p className="text-xs text-muted">Based on search excerpts. Open sources to verify details.</p>
        </div>
        {result.sources.length > 0 && <div className="space-y-3">
          <h3 className="text-sm font-semibold">Sources</h3>
          {result.sources.map((source, i) => <a key={`${source.url}-${i}`} href={source.url} target="_blank" rel="noopener noreferrer"
            className="block rounded-xl bg-surface border border-border p-4 hover:border-accent transition-colors">
            <div className="flex items-start gap-2 text-sm font-medium text-accent"><span>[{i + 1}] {source.title}</span><ExternalLink size={13} className="shrink-0 mt-0.5"/></div>
            <p className="text-xs text-muted mt-1 break-all">{source.url}</p>
            {source.snippet && <p className="text-sm mt-2 leading-6 text-muted">{source.snippet}</p>}
          </a>)}
        </div>}
      </div>}
    </div>
  </section>;
}
