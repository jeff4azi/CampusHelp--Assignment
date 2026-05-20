import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { useAdminAuth } from "../hooks/useAdminAuth.js";
import toast from "react-hot-toast";

const NAV = [
  { to: "/admin", label: "Overview", icon: "📊", end: true },
  { to: "/admin/users", label: "Users", icon: "👥", end: false },
  { to: "/admin/posts", label: "Posts", icon: "📋", end: false },
  { to: "/admin/sessions", label: "Sessions", icon: "🤝", end: false },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: "💸", end: false },
  { to: "/admin/disputes", label: "Disputes", icon: "⚖️", end: false },
  { to: "/admin/analytics", label: "Analytics", icon: "📈", end: false },
  { to: "/admin/settings", label: "Settings", icon: "⚙️", end: false },
];

const ROLE_COLORS = {
  super_admin: { bg: "rgba(251,191,36,0.15)", color: "#fbbf24" },
  admin: { bg: "rgba(99,102,241,0.15)", color: "#818cf8" },
  moderator: { bg: "rgba(52,211,153,0.15)", color: "#34d399" },
  support: { bg: "rgba(96,165,250,0.15)", color: "#60a5fa" },
};

export default function AdminLayout({ children, badge }) {
  const { adminUser, role } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const roleStyle = ROLE_COLORS[role] ?? ROLE_COLORS.admin;
  const initials = (adminUser?.email ?? "A")[0].toUpperCase();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast("Logged out", { icon: "👋" });
    navigate("/admin/login");
  }

  const pageTitle =
    NAV.find((n) =>
      n.end ? location.pathname === n.to : location.pathname.startsWith(n.to),
    )?.label ?? "Admin";

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      {/* ── Mobile overlay ─────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-50 w-60 flex flex-col
          border-r transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{
          background: "var(--sidebar-bg)",
          borderColor: "var(--sidebar-border)",
        }}
      >
        {/* Logo */}
        <div
          className="h-16 flex items-center gap-3 px-5 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/40 shrink-0">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <div className="min-w-0">
            <p
              className="text-[13px] font-bold"
              style={{ color: "var(--text-1)" }}
            >
              CampusHelp
            </p>
            <p className="text-[10px]" style={{ color: "var(--text-3)" }}>
              Admin Panel
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden cursor-pointer"
            style={{ color: "var(--text-3)" }}
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-red-500/12 text-red-400"
                    : "text-[#5a6a85] hover:text-[#c8d4e8] hover:bg-white/5"
                }`
              }
            >
              <span className="text-base shrink-0">{icon}</span>
              {label}
              {label === "Disputes" && badge?.disputes > 0 && (
                <span className="ml-auto min-w-[18px] h-4 px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[9px] font-bold">
                  {badge.disputes}
                </span>
              )}
              {label === "Withdrawals" && badge?.withdrawals > 0 && (
                <span className="ml-auto min-w-[18px] h-4 px-1 flex items-center justify-center rounded-full bg-amber-500 text-white text-[9px] font-bold">
                  {badge.withdrawals}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        <div
          className="mx-2.5 mb-3 p-3 rounded-xl"
          style={{
            background: "var(--bg-hover)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p
                className="text-[12px] font-semibold truncate"
                style={{ color: "var(--text-1)" }}
              >
                {adminUser?.email?.split("@")[0] ?? "Admin"}
              </p>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: roleStyle.bg, color: roleStyle.color }}
              >
                {role?.replace("_", " ") ?? "admin"}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-[11px] font-medium text-left transition-colors cursor-pointer hover:text-red-400"
            style={{ color: "var(--text-3)" }}
          >
            🚪 Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header
          className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 backdrop-blur-xl"
          style={{
            background: "rgba(7,9,15,0.85)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl cursor-pointer"
              style={{ color: "var(--text-2)" }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div>
              <h1
                className="text-[15px] font-semibold"
                style={{ color: "var(--text-1)" }}
              >
                {pageTitle}
              </h1>
              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                CampusHelp Admin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(52,211,153,0.1)", color: "#34d399" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
            <button
              onClick={() => navigate("/")}
              className="text-[11px] px-3 py-1.5 rounded-lg cursor-pointer font-medium transition-colors"
              style={{
                background: "var(--bg-hover)",
                color: "var(--text-3)",
                border: "1px solid var(--border)",
              }}
            >
              ← User App
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
