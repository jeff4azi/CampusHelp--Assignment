import { useState, useEffect } from "react";
import { NavLink, useNavigate, useMatch, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useNotifications } from "../hooks/useNotifications.js";
import { useTheme } from "../context/ThemeContext.jsx";
import {
  HomeIcon,
  StoreIcon,
  BriefcaseIcon,
  HandshakeIcon,
  CheckCircleIcon,
  LogoutIcon,
  AcademicCapIcon,
  BellIcon,
  SettingsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SunIcon,
  MoonIcon,
  WalletIcon,
} from "../components/Icons.jsx";

const NAV_MAIN = [
  { to: "/dashboard", label: "Dashboard", Icon: HomeIcon, end: true },
  { to: "/marketplace", label: "Marketplace", Icon: StoreIcon, end: false },
  { to: "/my-jobs", label: "My Jobs", Icon: BriefcaseIcon, end: false },
  { to: "/helping", label: "Helping", Icon: HandshakeIcon, end: false },
  { to: "/completed", label: "Completed", Icon: CheckCircleIcon, end: false },
  { to: "/earnings", label: "Earnings", Icon: WalletIcon, end: false },
];

const NAV_BOTTOM = [
  { to: "/notifications", label: "Notifications", Icon: BellIcon, end: false },
  { to: "/settings", label: "Settings", Icon: SettingsIcon, end: false },
];

const MOBILE_NAV = [
  { to: "/dashboard", label: "Home", Icon: HomeIcon, end: true },
  { to: "/marketplace", label: "Market", Icon: StoreIcon, end: false },
  { to: "/my-jobs", label: "My Jobs", Icon: BriefcaseIcon, end: false },
  { to: "/helping", label: "Helping", Icon: HandshakeIcon, end: false },
  { to: "/notifications", label: "Alerts", Icon: BellIcon, end: false },
];

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/marketplace": "Marketplace",
  "/my-jobs": "My Jobs",
  "/helping": "Helping",
  "/completed": "Completed",
  "/notifications": "Notifications",
  "/settings": "Settings",
  "/earnings": "Earnings",
};

function SidebarLink({ to, label, Icon, end, badge, collapsed, onClick }) {
  const match = useMatch(end ? { path: to, end: true } : to);
  const isActive = Boolean(match);

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center gap-3 rounded-xl font-medium transition-all duration-200 cursor-pointer
        ${collapsed ? "px-2.5 py-2.5 justify-center" : "px-3.5 py-2.5"}
        ${
          isActive ? "text-indigo-300" : "text-[#5a6a85] hover:text-[#c8d4e8]"
        }`}
      style={
        isActive
          ? {
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(167,139,250,0.08))",
              boxShadow:
                "inset 0 0 0 1px rgba(99,102,241,0.2), 0 0 20px rgba(99,102,241,0.08)",
            }
          : {}
      }
    >
      {/* Active indicator */}
      {isActive && !collapsed && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
          style={{ background: "linear-gradient(180deg, #818cf8, #a78bfa)" }}
        />
      )}

      {/* Icon with glow on active */}
      <span
        className={`shrink-0 transition-all duration-200 ${isActive ? "drop-shadow-[0_0_6px_rgba(99,102,241,0.8)]" : "group-hover:scale-110"}`}
      >
        <Icon className="w-[18px] h-[18px]" />
      </span>

      {!collapsed && (
        <>
          <span className="text-[13.5px] tracking-[-0.01em]">{label}</span>
          {badge > 0 ? (
            <span className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold badge-pulse">
              {badge > 99 ? "99+" : badge}
            </span>
          ) : isActive ? (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 opacity-70 animate-pulse" />
          ) : null}
        </>
      )}
      {collapsed && badge > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 badge-pulse" />
      )}
    </NavLink>
  );
}

function MobileNavLink({ to, label, Icon, end, badge }) {
  const match = useMatch(end ? { path: to, end: true } : to);
  const isActive = Boolean(match);
  return (
    <NavLink
      to={to}
      end={end}
      className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative"
    >
      <span
        className={`transition-all duration-200 ${isActive ? "text-indigo-400 drop-shadow-[0_0_6px_rgba(99,102,241,0.8)] scale-110" : "text-[#3d4f6b]"}`}
      >
        <Icon className="w-5 h-5" />
      </span>
      <span
        className={`text-[10px] font-semibold tracking-wide transition-colors ${isActive ? "text-indigo-400" : "text-[#3d4f6b]"}`}
      >
        {label}
      </span>
      {badge > 0 && (
        <span className="absolute top-2 right-[calc(50%-14px)] min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-indigo-600 text-white text-[9px] font-bold badge-pulse">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </NavLink>
  );
}

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isDark = theme === "dark";

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const handler = () => setScrolled(main.scrollTop > 10);
    main.addEventListener("scroll", handler);
    return () => main.removeEventListener("scroll", handler);
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const initials = (user?.username ?? user?.email ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const pageTitle = PAGE_TITLES[location.pathname] ?? "CampusHelp";

  return (
    <div
      className="flex h-screen"
      style={{ background: "var(--bg-base)", color: "var(--text-1)" }}
    >
      {/* ── Mobile overlay ─────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-50 flex flex-col border-r
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-[68px]" : "w-60"}
          ${drawerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{
          background: isDark
            ? "linear-gradient(180deg, #080c14 0%, #07090f 100%)"
            : "var(--sidebar-bg)",
          borderColor: "var(--sidebar-border)",
        }}
      >
        {/* Subtle top glow */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)",
          }}
        />

        {/* Logo */}
        <div
          className="h-16 flex items-center justify-between px-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/60 shrink-0 glow-pulse">
                <AcademicCapIcon className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-[15px] tracking-tight gradient-text">
                CampusHelp
              </span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/60 mx-auto glow-pulse">
              <AcademicCapIcon className="w-4 h-4 text-white" />
            </div>
          )}
          {!collapsed && (
            <>
              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-lg transition-all cursor-pointer hidden lg:flex hover:bg-white/5 hover:rotate-180 duration-300"
                style={{ color: "var(--text-3)" }}
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg transition-colors cursor-pointer lg:hidden"
                style={{ color: "var(--text-3)" }}
              >
                ✕
              </button>
            </>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mx-auto mt-3 p-1.5 rounded-lg transition-all cursor-pointer hover:bg-white/5"
            style={{ color: "var(--text-3)" }}
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {NAV_MAIN.map((item) => (
            <SidebarLink
              key={item.to}
              {...item}
              collapsed={collapsed}
              onClick={() => setDrawerOpen(false)}
            />
          ))}
          <div
            className="my-3"
            style={{ borderTop: "1px solid var(--border)" }}
          />
          {NAV_BOTTOM.map((item) => (
            <SidebarLink
              key={item.to}
              {...item}
              collapsed={collapsed}
              badge={item.to === "/notifications" ? unreadCount : 0}
              onClick={() => setDrawerOpen(false)}
            />
          ))}
        </nav>

        {/* User card */}
        {!collapsed && (
          <div
            className="mx-2.5 mb-3 p-3 rounded-xl transition-all"
            style={{
              background: "rgba(99,102,241,0.06)",
              border: "1px solid rgba(99,102,241,0.12)",
            }}
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-md"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p
                  className="text-[13px] font-semibold truncate"
                  style={{ color: "var(--text-1)" }}
                >
                  {user?.username || "Student"}
                </p>
                <p
                  className="text-[11px] truncate"
                  style={{ color: "var(--text-3)" }}
                >
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 text-[12px] font-medium transition-all cursor-pointer hover:text-red-400 group"
              style={{ color: "var(--text-3)" }}
            >
              <LogoutIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              Sign out
            </button>
          </div>
        )}

        {collapsed && (
          <div className="flex flex-col items-center gap-2 pb-4">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-md"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              }}
            >
              {initials}
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-lg transition-colors cursor-pointer hover:text-red-400"
              style={{ color: "var(--text-3)" }}
            >
              <LogoutIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 transition-all duration-300"
          style={{
            background: scrolled
              ? isDark
                ? "rgba(7,9,15,0.95)"
                : "rgba(244,246,251,0.95)"
              : isDark
                ? "rgba(7,9,15,0.7)"
                : "rgba(244,246,251,0.8)",
            backdropFilter: "blur(24px)",
            borderBottom: scrolled
              ? "1px solid var(--border)"
              : "1px solid transparent",
            boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.15)" : "none",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl transition-colors cursor-pointer"
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
                className="text-[15px] font-bold tracking-[-0.01em]"
                style={{ color: "var(--text-1)" }}
              >
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? "Light mode" : "Dark mode"}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer hover:scale-110"
              style={{
                background: "var(--bg-hover)",
                color: isDark ? "#fbbf24" : "var(--text-2)",
              }}
            >
              {isDark ? (
                <SunIcon className="w-4 h-4" />
              ) : (
                <MoonIcon className="w-4 h-4" />
              )}
            </button>

            {/* Bell */}
            <button
              onClick={() => navigate("/notifications")}
              className="relative w-9 h-9 rounded-xl hidden sm:flex items-center justify-center transition-all cursor-pointer hover:scale-110"
              style={{ background: "var(--bg-hover)", color: "var(--text-2)" }}
            >
              <BellIcon className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold badge-pulse">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* Avatar */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold text-white cursor-pointer select-none transition-all hover:scale-110 hover:shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
                }}
              >
                {initials}
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-2xl shadow-2xl z-20 overflow-hidden scale-in"
                    style={{
                      background: "var(--bg-raised)",
                      border: "1px solid var(--border)",
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    <div
                      className="px-4 py-3"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <p
                        className="text-[13px] font-semibold truncate"
                        style={{ color: "var(--text-1)" }}
                      >
                        {user?.username || "Student"}
                      </p>
                      <p
                        className="text-[11px] truncate mt-0.5"
                        style={{ color: "var(--text-3)" }}
                      >
                        {user?.email}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate("/settings");
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-colors cursor-pointer hover:bg-white/5"
                      style={{ color: "var(--text-2)" }}
                    >
                      <SettingsIcon className="w-4 h-4" /> Profile
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-colors cursor-pointer hover:bg-white/5 text-red-400"
                    >
                      <LogoutIcon className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0 page-enter">
          {/* Subtle mesh gradient */}
          <div
            className="fixed inset-0 pointer-events-none z-0"
            style={{
              background: isDark
                ? "radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.04) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(167,139,250,0.03) 0%, transparent 50%)"
                : "none",
            }}
          />
          <div className="relative z-10">{children}</div>
        </main>
      </div>

      {/* ── Mobile bottom nav ────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-30 flex border-t lg:hidden"
        style={{
          background: isDark ? "rgba(8,12,20,0.95)" : "var(--sidebar-bg)",
          backdropFilter: "blur(20px)",
          borderColor: "var(--sidebar-border)",
        }}
      >
        {MOBILE_NAV.map((item) => (
          <MobileNavLink
            key={item.to}
            {...item}
            badge={item.to === "/notifications" ? unreadCount : 0}
          />
        ))}
      </nav>
    </div>
  );
}
