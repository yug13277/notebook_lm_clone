import { apiFetch } from "./http";

export type Rect = { x: number; y: number; width: number; height: number };
export type PdfAnnotation = {
  id: string;
  document_id: string;
  page: number;
  quote: string;
  rectangles: Rect[];
  note: string | null;
  created_at: string;
};

export const annotationsApi = {
  list: (documentId: string) => apiFetch<PdfAnnotation[]>(`/documents/${documentId}/annotations`),
  create: (documentId: string, body: Omit<PdfAnnotation, "id" | "document_id" | "created_at">) =>
    apiFetch<PdfAnnotation>(`/documents/${documentId}/annotations`, {
      method: "POST", body: JSON.stringify(body),
    }),
  remove: (documentId: string, annotationId: string) =>
    apiFetch<void>(`/documents/${documentId}/annotations/${annotationId}`, { method: "DELETE" }),
};
