import { apiFetch } from "./http";

export type WebSource = { title: string; url: string; snippet: string };
export type WebResearchResult = { answer: string; sources: WebSource[]; generated: boolean };

export const webResearchApi = {
  ask: (query: string) => apiFetch<WebResearchResult>("/web-research/ask", {
    method: "POST",
    body: JSON.stringify({ query }),
  }),
};
