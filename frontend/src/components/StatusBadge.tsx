import type { DocumentStatus } from "../types/documents";

const LABEL: Record<DocumentStatus, string> = {
  UPLOADED: "Uploaded",
  PARSING: "Parsing",
  STRUCTURING: "Structuring",
  EMBEDDING: "Embedding",
  READY: "Ready",
  FAILED: "Failed",
};

// uitokens.md: warning = in-progress stages, success = ready, danger = failed.
const COLOR: Record<DocumentStatus, string> = {
  UPLOADED: "text-warning bg-[#3c2b18] border-transparent",
  PARSING: "text-warning bg-[#3c2b18] border-transparent",
  STRUCTURING: "text-warning bg-[#3c2b18] border-transparent",
  EMBEDDING: "text-warning bg-[#3c2b18] border-transparent",
  READY: "text-success bg-[#173b2c] border-transparent",
  FAILED: "text-danger bg-[#42252c] border-transparent",
};

// failed_stage is its own free-text field on the wire (not a DocumentStatus value) —
// only fall back to LABEL's friendlier names when it happens to match one exactly.
function isKnownStatus(value: string): value is DocumentStatus {
  return value in LABEL;
}

// Non-terminal = still actively being processed (UPLOADED/PARSING/STRUCTURING/EMBEDDING).
// READY and FAILED are terminal and stay static — only an in-progress stage should read
// as "working," not a finished one.
function isNonTerminal(status: DocumentStatus): boolean {
  return status !== "READY" && status !== "FAILED";
}

export function StatusBadge({
  status,
  failedStage,
}: {
  status: DocumentStatus;
  failedStage?: string | null;
}) {
  const failedStageLabel = failedStage
    ? isKnownStatus(failedStage)
      ? LABEL[failedStage]
      : failedStage
    : null;
  const inProgress = isNonTerminal(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium border rounded-full px-2.5 py-1 ${COLOR[status]}`}
    >
      {inProgress ? (
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse"
        />
      ) : null}
      {LABEL[status]}
      {status === "FAILED" && failedStageLabel ? ` (${failedStageLabel})` : null}
    </span>
  );
}
