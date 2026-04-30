import { useState } from "react";
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

function SidebarLink({
  to,
  label,
  Icon,
  end,
  badge,
  collapsed,
  onClick,
  isDark,
}) {
  const match = useMatch(end ? { path: to, end: true } : to);
  const isActive = Boolean(match);

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center gap-3 rounded-xl font-medium transition-all duration-150 cursor-pointer
        ${collapsed ? "px-2.5 py-2.5 justify-center" : "px-3.5 py-2.5"}
        ${
          isActive
            ? "bg-indigo-500/12 text-indigo-400"
            : isDark
              ? "text-[#5a6a85] hover:text-[#c8d4e8] hover:bg-white/5"
              : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        }`}
    >
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-indigo-400" />
      )}
      <span
        className={`shrink-0 transition-colors ${isActive ? "text-indigo-400" : ""}`}
      >
        <Icon className="w-[18px] h-[18px]" />
      </span>
      {!collapsed && (
        <>
          <span className="text-[13.5px] tracking-[-0.01em]">{label}</span>
          {badge > 0 ? (
            <span className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold">
              {badge > 99 ? "99+" : badge}
            </span>
          ) : isActive ? (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 opacity-70" />
          ) : null}
        </>
      )}
      {collapsed && badge > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500" />
      )}
    </NavLink>
  );
}

function MobileNavLink({ to, label, Icon, end, badge, isDark }) {
  const match = useMatch(end ? { path: to, end: true } : to);
  const isActive = Boolean(match);
  return (
    <NavLink
      to={to}
      end={end}
      className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative"
    >
      <span
        className={`transition-colors ${isActive ? "text-indigo-400" : isDark ? "text-[#3d4f6b]" : "text-slate-400"}`}
      >
        <Icon className="w-5 h-5" />
      </span>
      <span
        className={`text-[10px] font-semibold tracking-wide transition-colors ${isActive ? "text-indigo-400" : isDark ? "text-[#3d4f6b]" : "text-slate-400"}`}
      >
        {label}
      </span>
      {badge > 0 && (
        <span className="absolute top-2 right-[calc(50%-14px)] min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-indigo-600 text-white text-[9px] font-bold">
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
  const isDark = theme === "dark";

  return (
    <div
      className="flex h-screen"
      style={{ background: "var(--bg-base)", color: "var(--text-1)" }}
    >
      {/* ── Mobile overlay ───────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        style={{
          background: "var(--sidebar-bg)",
          borderColor: "var(--sidebar-border)",
        }}
        className={`
          fixed lg:relative inset-y-0 left-0 z-50
          ${collapsed ? "w-[68px]" : "w-60"}
          flex flex-col border-r
          transition-all duration-300 ease-in-out
          ${drawerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div
          className="h-16 flex items-center justify-between px-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50 shrink-0">
                <AcademicCapIcon className="w-4 h-4 text-white" />
              </div>
              <span
                className="font-bold text-[15px] tracking-tight"
                style={{ color: "var(--text-1)" }}
              >
                CampusHelp
              </span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50 mx-auto">
              <AcademicCapIcon className="w-4 h-4 text-white" />
            </div>
          )}
          {!collapsed && (
            <>
              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-lg transition-colors cursor-pointer hidden lg:flex hover:bg-white/5"
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
            className="mx-auto mt-3 p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-white/5"
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
              isDark={isDark}
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
              isDark={isDark}
              badge={item.to === "/notifications" ? unreadCount : 0}
              onClick={() => setDrawerOpen(false)}
            />
          ))}
        </nav>

        {/* User card */}
        {!collapsed && (
          <div
            className="mx-2.5 mb-3 p-3 rounded-xl"
            style={{
              background: "var(--bg-hover)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
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
              className="w-full flex items-center gap-2 text-[12px] font-medium transition-colors cursor-pointer hover:text-red-400"
              style={{ color: "var(--text-3)" }}
            >
              <LogoutIcon className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        )}

        {collapsed && (
          <div className="flex flex-col items-center gap-2 pb-4">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white">
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

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 backdrop-blur-xl"
          style={{
            background: isDark ? "rgba(7,9,15,0.85)" : "rgba(244,246,251,0.9)",
            borderBottom: "1px solid var(--border)",
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
            <h1
              className="text-[15px] font-semibold tracking-[-0.01em]"
              style={{ color: "var(--text-1)" }}
            >
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? "Light mode" : "Dark mode"}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer"
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
              className="relative w-9 h-9 rounded-xl hidden sm:flex items-center justify-center transition-all cursor-pointer"
              style={{ background: "var(--bg-hover)", color: "var(--text-2)" }}
            >
              <BellIcon className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* Avatar + dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white cursor-pointer select-none shadow-md shadow-indigo-900/30 hover:shadow-indigo-900/50 transition-shadow"
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
                    className="absolute right-0 mt-2 w-48 rounded-2xl shadow-2xl z-20 overflow-hidden fade-in"
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
                      <SettingsIcon className="w-4 h-4" />
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-colors cursor-pointer hover:bg-white/5 text-red-400"
                    >
                      <LogoutIcon className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">{children}</main>
      </div>

      {/* ── Mobile bottom nav ────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-30 flex border-t lg:hidden"
        style={{
          background: "var(--sidebar-bg)",
          borderColor: "var(--sidebar-border)",
        }}
      >
        {MOBILE_NAV.map((item) => (
          <MobileNavLink
            key={item.to}
            {...item}
            isDark={isDark}
            badge={item.to === "/notifications" ? unreadCount : 0}
          />
        ))}
      </nav>
    </div>
  );
}
