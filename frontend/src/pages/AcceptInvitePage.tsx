import { FormEvent, useState } from "react";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { Navigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../types/auth";
import { useAuth } from "../hooks/useAuth";
import { AuthFrame } from "../components/AuthFrame";

export function AcceptInvitePage() {
  useDocumentTitle("Accept invite");
  const { user, acceptInvite } = useAuth();
  const [searchParams] = useSearchParams();
  const org = searchParams.get("org");
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/app" replace />;

  if (!org || !token) {
    return (
      <AuthFrame>
        <div className="w-full bg-surface border border-border rounded-[24px] p-7 sm:p-9 shadow-[0_18px_50px_rgb(45_55_80_/_8%)]">
          <p className="text-sm text-danger" role="alert">
            This invite link is invalid or incomplete.
          </p>
        </div>
      </AuthFrame>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await acceptInvite(org as string, token as string, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to accept invite");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame>
      <div className="w-full bg-surface border border-border rounded-[24px] p-7 sm:p-9 space-y-7 shadow-[0_18px_50px_rgb(45_55_80_/_8%)]">
        <div>
          <h1 className="text-xl font-semibold">Set your password</h1>
          <p className="text-sm text-muted mt-1">
            Choose a password to finish joining your team&apos;s workspace
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm text-muted">Password (min 8 characters)</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg border border-border rounded-md px-3 py-2 focus:outline-none focus:border-accent"
            />
          </label>

          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent hover:opacity-90 disabled:opacity-50 text-white rounded-md py-2 font-medium transition"
          >
            {submitting ? "Joining…" : "Join workspace"}
          </button>
        </form>
      </div>
    </AuthFrame>
  );
}
