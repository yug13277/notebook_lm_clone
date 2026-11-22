import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ArrowRight, BookOpen, Folder, Search } from "react-feather";
import { Card } from "../components/ui/card";

// Fallback ONLY — used when the user has no real ``name`` on file (every user who
// signed up before this field existed, plus any invited member, since name
// collection isn't wired into the invite flow yet). Splits the email local-part on
// separators/digits and title-cases each remaining word-like segment, e.g.
// "j.smith23@company.com" -> "J Smith" instead of the old raw "J.smith23".
export function deriveDisplayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const words = local
    .split(/[._\-\d]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  if (words.length > 0) return words.join(" ");
  // No letter-like segment at all (e.g. a purely numeric local part) — fall back to
  // just capitalizing whatever's there rather than showing an empty greeting.
  return local ? local.charAt(0).toUpperCase() + local.slice(1).toLowerCase() : "";
}

export function HomePage() {
  const { user } = useAuth();
  const displayName =
    user?.name?.trim() || (user?.email ? deriveDisplayNameFromEmail(user.email) : "");

  return (
    <div className="flex-1 overflow-y-auto bg-panel">
      <main className="page-enter max-w-6xl mx-auto px-6 sm:px-10 py-12 sm:py-16">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-3 py-1.5 text-xs text-muted mb-7">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" /> Your workspace
          </span>
          <h1 className="text-[clamp(2.25rem,4vw,3.75rem)] font-semibold tracking-[-0.045em] leading-[1.08]">
            Welcome, <span>{displayName}</span>
          </h1>
          <p className="mt-5 max-w-xl text-base sm:text-lg text-muted leading-relaxed">
            Open a notebook to ask questions and explore the documents behind each answer.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/app/notebooks" className="button-press inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-white hover:brightness-110">
              Open a notebook <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to="/app/repository" className="button-press inline-flex h-11 items-center rounded-full border border-border bg-elevated px-5 text-sm font-medium text-text hover:bg-secondary">
              Browse documents
            </Link>
          </div>
        </div>

        <section className="mt-16 sm:mt-20" aria-labelledby="workspace-shortcuts">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 id="workspace-shortcuts" className="text-lg font-semibold tracking-tight">Quick access</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { to: "/app/notebooks", title: "Notebooks", detail: "Ask questions and keep sources together.", icon: BookOpen },
              { to: "/app/repository", title: "Repository", detail: "Upload and organize your PDFs.", icon: Folder },
              { to: "/app/search", title: "Search", detail: "Find a passage across your sources.", icon: Search },
            ].map(({ to, title, detail, icon: Icon }) => (
              <Card key={to} className="surface-lift border border-border bg-surface shadow-none">
                <Link to={to} className="flex h-full min-h-44 flex-col p-6 rounded-[18px] focus-visible:outline-offset-4">
                  <Icon size={21} strokeWidth={1.7} className="text-muted" aria-hidden="true" />
                  <div className="mt-auto pt-8 flex items-end justify-between gap-3">
                    <div><h3 className="font-semibold tracking-tight">{title}</h3><p className="mt-1 text-sm text-muted leading-snug">{detail}</p></div>
                    <ArrowRight size={17} className="shrink-0 text-accent" aria-hidden="true" />
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
