# PDF reading and web research

## Product behavior

1. A notebook keeps its existing **Ask PDF** conversation. Answers and citations in that view come only from attached documents.
2. **Ask Web** is a separate view, with its own prompt and results. It searches current public pages, shows clickable source links, and never writes web material into PDF chat history or the document index. The web query can work without an attached PDF.
3. Open any uploaded PDF from the repository or notebook source list. Selecting text reveals Copy, Highlight, Add note, and Ask Web. Ask Web starts with the selection quoted in the prompt; the user can edit the question before submitting.
4. Highlights and notes belong to the document and author. They survive reloads and zoom. Removing a PDF removes its annotations; the uploaded file itself is never modified.

## Data and trust boundaries

- Serve the PDF through an authenticated, org-scoped, document-permission-checked endpoint. Do not expose raw object-store keys as browser URLs.
- Store each annotation with document, org, author, page, selected quote, normalized rectangles, optional note, and creation time. Tenant RLS applies. Only the author may remove an annotation.
- Search requests are sent by the backend to the configured search provider. The query may include selected PDF text only when the user deliberately submits it; no full PDF or private conversation is transmitted automatically.
- Treat web snippets as untrusted source data, not instructions. The model may summarize only returned snippets and must cite source numbers. Give users direct source links so they can inspect the pages.

## Delivery and failure states

- Use PDF.js for selectable text. Keep rendering limited to the active page for responsiveness; coordinates are normalized to the page so zoom does not move highlights.
- Use a bounded, timed server-side search. Local mode uses a private SearXNG container so live source previews need no search key; a `BRAVE_SEARCH_API_KEY` switches to Brave Web Search. Require topical overlap with the question before returning a source, and show a no-relevant-sources state if everything is filtered out. `LLM_MODE=real` and a model key are needed for a synthesized answer; fake mode shows clearly labeled source excerpts instead of pretending to generate one.
- A missing key, empty search, provider outage, or model failure gets a visible, recoverable message. Existing Ask PDF routes and rendering stay unchanged.
- Verify tenant and access-role isolation, author-only delete, web provider failure, source attribution, selection behavior, frontend build, and existing tests.

## Follow-up after the first release

- Add optional per-notebook web research history and async task progress when longer multi-page research is needed. The initial search is intentionally a short request, not a background crawl.
- Add full-page fetching and claim-level checks only after the search-result workflow is validated; snippets alone are a limited evidence base and the UI must say so.
