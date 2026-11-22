import { useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { BookOpen, Code, Folder, Home, LogOut, Search, Settings, Shield, X } from "react-feather";
import {
  Sidebar as DesignSidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarItem,
} from "../components/ui/sidebar";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

function NavItem({
  to,
  label,
  icon,
  disabled,
  onNavigate,
}: {
  to: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  onNavigate?: () => void;
}) {
  if (disabled) {
    return (
      <span className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted opacity-50 cursor-not-allowed">
        {icon}
        {label}
      </span>
    );
  }
  return (
    <NavLink
      to={to}
      end
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.985] ${
          isActive ? "bg-primary/10 text-primary" : "text-muted hover:text-text hover:bg-secondary"
        }`
      }
    >
      <span className="w-4 h-4 shrink-0" aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const canManageTeam = user?.role === "owner" || user?.role === "admin";

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  // Mobile off-canvas drawer: close on Escape. Only listens while open, and only
  // matters below `lg:` (the drawer is visually inert at `lg:`+ regardless).
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // U14: show the real display name, email as tooltip; fall back to the email
  // when no name is on file (pre-name signups, invited members).
  const displayName = user?.name?.trim() || user?.email || "";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  return (
    <>
      {/* Backdrop: mobile-only, dismisses the drawer on click. Absent at `lg:`+. */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <DesignSidebar
        id="app-sidebar"
        role="complementary"
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static !w-60 shrink-0 bg-background backdrop-blur-xl border-r border-border h-dvh lg:h-full`}
      >
        <SidebarHeader className="h-20 border-b-0 px-5 justify-between">
          <span className="font-semibold tracking-tight text-xl flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-[11px] bg-primary text-white flex items-center justify-center text-base font-bold shadow-sm" aria-hidden="true">V</span>
            Veratas
          </span>
          {/* F7: the drawer covers the top bar's toggle, so it carries its own
              close button (mobile only). */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="lg:hidden text-muted hover:text-text transition p-2 rounded-lg hover:bg-secondary"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </SidebarHeader>

        <SidebarContent className="px-3 pt-4">
        <nav aria-label="Main navigation">
          <SidebarGroup>
          <SidebarGroupLabel className="normal-case tracking-normal text-xs text-muted px-3 mb-2">Workspace</SidebarGroupLabel>
          <NavItem to="/app" label="Home" icon={<Home size={17} />} onNavigate={onClose} />
          <NavItem to="/app/repository" label="Repository" icon={<Folder size={17} />} onNavigate={onClose} />
          <NavItem to="/app/notebooks" label="Notebooks" icon={<BookOpen size={17} />} onNavigate={onClose} />
          <NavItem to="/app/search" label="Search" icon={<Search size={17} />} onNavigate={onClose} />
          </SidebarGroup>
          {canManageTeam && (
            <SidebarGroup className="mt-7">
              <SidebarGroupLabel className="normal-case tracking-normal text-xs text-muted px-3 mb-2">Manage</SidebarGroupLabel>
              <NavItem to="/app/access-roles" label="Access Roles" icon={<Shield size={17} />} onNavigate={onClose} />
              <NavItem to="/app/embed" label="Embed widgets" icon={<Code size={17} />} onNavigate={onClose} />
            </SidebarGroup>
          )}
        </nav>
        </SidebarContent>

        <SidebarFooter className="px-3 pb-4 pt-3 border-t border-border space-y-2">
          <div className="flex items-center gap-2.5 px-2 py-2" title={user?.email}>
            <span className="w-9 h-9 rounded-full bg-accent-soft text-primary text-sm font-semibold flex items-center justify-center shrink-0">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm truncate">{displayName}</p>
              <p className="text-xs text-muted">
                {user ? (ROLE_LABEL[user.role] ?? user.role) : ""}
              </p>
            </div>
            {canManageTeam && (
              <button
                type="button"
                onClick={() => navigate("/app/users")}
                title="Team settings"
                aria-label="Team settings"
                className="text-muted hover:text-text transition p-2 rounded-lg hover:bg-secondary"
              >
                <Settings size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          <SidebarItem
            onClick={() => void handleLogout()}
            icon={<LogOut size={16} />}
            label="Sign out"
            className="text-muted hover:text-danger"
          />
        </SidebarFooter>
      </DesignSidebar>
    </>
  );
}
