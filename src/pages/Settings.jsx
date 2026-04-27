import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth.js";
import { useTheme } from "../context/ThemeContext.jsx";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import { supabase } from "../lib/supabase.js";
import {
  UserIcon,
  MailIcon,
  LockIcon,
  LogoutIcon,
  PaletteIcon,
  ShieldIcon,
  InfoIcon,
  SunIcon,
  MoonIcon,
  BellIcon,
  ChevronRightIcon,
} from "../components/Icons.jsx";

function useInputCls(isDark) {
  return isDark
    ? "bg-white/4 border border-white/8 focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none transition-all disabled:opacity-40 w-full"
    : "bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all disabled:opacity-40 w-full";
}

function StatusMsg({ msg }) {
  if (!msg) return null;
  return (
    <div
      className={`flex items-center gap-2 text-xs mt-3 px-3 py-2 rounded-lg ${msg.ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}
    >
      <span>{msg.ok ? "✓" : "⚠"}</span>
      <span>{msg.text}</span>
    </div>
  );
}

function FieldLabel({ children, isDark }) {
  return (
    <label
      className={`text-xs font-medium uppercase tracking-wider ${isDark ? "text-gray-500" : "text-slate-400"}`}
    >
      {children}
    </label>
  );
}

function Toggle({ enabled, onChange, isDark }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${enabled ? "bg-indigo-600" : isDark ? "bg-white/10" : "bg-slate-200"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}

// Accordion section — click header to expand/collapse
function Accordion({
  icon: Icon,
  title,
  description,
  isDark,
  defaultOpen = false,
  danger = false,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);

  const cardBorder = danger
    ? isDark
      ? "border-red-500/15"
      : "border-red-300/40"
    : isDark
      ? "border-white/6"
      : "border-slate-200";
  const cardBg = isDark ? "bg-[#0d1424]" : "bg-white";
  const iconBg = danger
    ? isDark
      ? "bg-red-500/10"
      : "bg-red-50"
    : isDark
      ? "bg-indigo-500/10"
      : "bg-indigo-50";
  const iconClr = danger ? "text-red-400" : "text-indigo-400";

  return (
    <div
      className={`border rounded-2xl overflow-hidden ${cardBg} ${cardBorder}`}
    >
      {/* Header — always visible, clickable */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 px-6 py-4 transition-colors cursor-pointer ${isDark ? "hover:bg-white/3" : "hover:bg-slate-50"}`}
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
        >
          <Icon className={`w-4 h-4 ${iconClr}`} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p
            className={`text-sm font-semibold ${isDark ? "text-gray-100" : "text-slate-800"}`}
          >
            {title}
          </p>
          <p
            className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-slate-400"}`}
          >
            {description}
          </p>
        </div>
        <ChevronRightIcon
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isDark ? "text-gray-600" : "text-slate-400"} ${open ? "rotate-90" : ""}`}
        />
      </button>

      {/* Collapsible body */}
      {open && (
        <div
          className={`px-6 pb-6 pt-1 border-t ${isDark ? "border-white/5" : "border-slate-100"}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// Static card (no accordion) for identity strip, security, about, session
function StaticCard({ isDark, danger = false, children }) {
  const cardBorder = danger
    ? isDark
      ? "border-red-500/15"
      : "border-red-300/40"
    : isDark
      ? "border-white/6"
      : "border-slate-200";
  const cardBg = isDark ? "bg-[#0d1424]" : "bg-white";
  return (
    <div className={`border rounded-2xl p-6 ${cardBg} ${cardBorder}`}>
      {children}
    </div>
  );
}

function StaticSectionHeader({
  icon: Icon,
  title,
  description,
  isDark,
  danger = false,
}) {
  const iconBg = danger
    ? isDark
      ? "bg-red-500/10"
      : "bg-red-50"
    : isDark
      ? "bg-indigo-500/10"
      : "bg-indigo-50";
  const iconClr = danger ? "text-red-400" : "text-indigo-400";
  return (
    <div className="flex items-start gap-3 mb-5">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}
      >
        <Icon className={`w-4 h-4 ${iconClr}`} />
      </div>
      <div>
        <h2
          className={`text-sm font-semibold ${isDark ? "text-gray-100" : "text-slate-800"}`}
        >
          {title}
        </h2>
        <p
          className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-slate-400"}`}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

export default function Settings() {
  const {
    user,
    updateProfile,
    updatePassword,
    logout,
    updatePhone,
    isGoogleUser,
    verifyCurrentPassword,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const inputCls = useInputCls(isDark);

  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);

  const [notifNewJob, setNotifNewJob] = useState(true);
  const [notifOffers, setNotifOffers] = useState(true);
  const [notifAccepted, setNotifAccepted] = useState(true);

  const initials = (user?.username ?? user?.email ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Load existing phone from profiles
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.phone) setPhone(data.phone);
      });
  }, [user?.id]);

  async function handleProfileSave(e) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);
    const updates = {};
    if (username !== user?.username) updates.username = username;
    if (email !== user?.email) updates.email = email;

    let anyChange = Object.keys(updates).length > 0 || phone.trim();

    if (!anyChange) {
      setProfileMsg({ ok: false, text: "No changes to save." });
      setProfileLoading(false);
      return;
    }

    // Save auth fields
    if (Object.keys(updates).length > 0) {
      const result = await updateProfile(updates);
      if (!result.success) {
        setProfileMsg({ ok: false, text: result.error });
        setProfileLoading(false);
        return;
      }
    }

    // Save phone
    if (phone.trim()) {
      const result = await updatePhone(phone.trim());
      if (!result.success) {
        setProfileMsg({ ok: false, text: result.error });
        setProfileLoading(false);
        return;
      }
    }

    setProfileLoading(false);
    setProfileMsg({
      ok: true,
      text: updates.email
        ? "Check your new email for a confirmation link."
        : "Profile updated successfully.",
    });
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    setPwMsg(null);

    // Email users must verify their current password first
    if (!isGoogleUser && !currentPw) {
      setPwMsg({ ok: false, text: "Please enter your current password." });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ ok: false, text: "Password must be at least 6 characters." });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ ok: false, text: "Passwords do not match." });
      return;
    }

    setPwLoading(true);

    // Verify current password for email/password users
    if (!isGoogleUser) {
      const verify = await verifyCurrentPassword(currentPw);
      if (!verify.success) {
        setPwMsg({ ok: false, text: verify.error });
        setPwLoading(false);
        return;
      }
    }

    const result = await updatePassword(newPw);
    setPwLoading(false);
    if (result.success) {
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwMsg({ ok: true, text: "Password updated successfully." });
    } else {
      setPwMsg({ ok: false, text: result.error });
    }
  }

  const divider = (
    <div className={`h-px my-1 ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
  );
  const pageBg = isDark ? "" : "bg-slate-100 min-h-screen";

  return (
    <DashboardLayout>
      <div className={pageBg}>
        <div className="max-w-2xl mx-auto px-6 pt-7 pb-16">
          <div className="mb-8">
            <p
              className={`text-sm mt-1 ${isDark ? "text-gray-500" : "text-slate-400"}`}
            >
              Manage your profile, security, and preferences.
            </p>
          </div>

          {/* Identity card — static */}
          <StaticCard isDark={isDark}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-900/30">
                <span className="text-xl font-bold text-white">{initials}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-base font-semibold truncate ${isDark ? "text-gray-100" : "text-slate-800"}`}
                >
                  {user?.username || "—"}
                </p>
                <p
                  className={`text-sm truncate mt-0.5 ${isDark ? "text-gray-500" : "text-slate-400"}`}
                >
                  {user?.email}
                </p>
                <p
                  className={`text-xs mt-1 ${isDark ? "text-gray-600" : "text-slate-400"}`}
                >
                  Member since{" "}
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
              <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 font-medium">
                Active
              </span>
            </div>
          </StaticCard>

          <div className="flex flex-col gap-3 mt-4">
            {/* ── Profile — accordion ── */}
            <Accordion
              icon={UserIcon}
              title="Profile Information"
              description="Update your display name and email address."
              isDark={isDark}
            >
              <form
                onSubmit={handleProfileSave}
                className="flex flex-col gap-4 mt-4"
              >
                <div className="flex flex-col gap-1.5">
                  <FieldLabel isDark={isDark}>Display Name</FieldLabel>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your name"
                    disabled={profileLoading}
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel isDark={isDark}>
                    <span className="flex items-center gap-1.5">
                      <MailIcon className="w-3 h-3" /> Email Address
                    </span>
                  </FieldLabel>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    disabled={profileLoading}
                    className={inputCls}
                  />
                  <p
                    className={`text-xs ${isDark ? "text-gray-600" : "text-slate-400"}`}
                  >
                    Changing your email will require re-verification.
                  </p>
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-1.5">
                  <FieldLabel isDark={isDark}>WhatsApp Phone Number</FieldLabel>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 08012345678 or +2348012345678"
                    disabled={profileLoading}
                    className={inputCls}
                  />
                  <p
                    className={`text-xs ${isDark ? "text-gray-600" : "text-slate-400"}`}
                  >
                    Used so your match can contact you via WhatsApp. Not shown
                    publicly.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={profileLoading}
                  className="self-start px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
                >
                  {profileLoading ? "Saving…" : "Save Changes"}
                </button>
                <StatusMsg msg={profileMsg} />
              </form>
            </Accordion>

            {/* ── Password — accordion ── */}
            <Accordion
              icon={LockIcon}
              title="Change Password"
              description="Use a strong password you don't use elsewhere."
              isDark={isDark}
            >
              <form
                onSubmit={handlePasswordSave}
                className="flex flex-col gap-4 mt-4"
              >
                {/* Current password — only for email/password users */}
                {!isGoogleUser && (
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel isDark={isDark}>Current Password</FieldLabel>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        placeholder="Enter your current password"
                        disabled={pwLoading}
                        className={inputCls + " pr-14"}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPw((v) => !v)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs cursor-pointer transition-colors ${isDark ? "text-gray-500 hover:text-gray-300" : "text-slate-400 hover:text-slate-600"}`}
                      >
                        {showPw ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                )}

                {isGoogleUser && (
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                    style={{
                      background: "rgba(99,102,241,0.08)",
                      border: "1px solid rgba(99,102,241,0.15)",
                      color: "#a5b4fc",
                    }}
                  >
                    <span>🔑</span>
                    <span>
                      You signed in with Google — no current password needed.
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <FieldLabel isDark={isDark}>New Password</FieldLabel>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="Min. 6 characters"
                      disabled={pwLoading}
                      className={inputCls + " pr-14"}
                    />
                    {isGoogleUser && (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPw((v) => !v)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs cursor-pointer transition-colors ${isDark ? "text-gray-500 hover:text-gray-300" : "text-slate-400 hover:text-slate-600"}`}
                      >
                        {showPw ? "Hide" : "Show"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel isDark={isDark}>Confirm Password</FieldLabel>
                  <input
                    type={showPw ? "text" : "password"}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Re-enter new password"
                    disabled={pwLoading}
                    className={inputCls}
                  />
                </div>
                {newPw.length > 0 && (
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          newPw.length >= i * 3
                            ? newPw.length >= 12
                              ? "bg-emerald-400"
                              : newPw.length >= 8
                                ? "bg-amber-400"
                                : "bg-red-400"
                            : isDark
                              ? "bg-white/8"
                              : "bg-slate-200"
                        }`}
                      />
                    ))}
                    <span
                      className={`text-xs ml-1 ${isDark ? "text-gray-500" : "text-slate-400"}`}
                    >
                      {newPw.length >= 12
                        ? "Strong"
                        : newPw.length >= 8
                          ? "Fair"
                          : "Weak"}
                    </span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="self-start px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
                >
                  {pwLoading ? "Updating…" : "Update Password"}
                </button>
                <StatusMsg msg={pwMsg} />
              </form>
            </Accordion>

            {/* ── Appearance — accordion ── */}
            <Accordion
              icon={PaletteIcon}
              title="Appearance"
              description="Customize how CampusHelp looks for you."
              isDark={isDark}
            >
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? "bg-amber-500/10" : "bg-slate-100"}`}
                  >
                    {isDark ? (
                      <MoonIcon className="w-4 h-4 text-amber-400" />
                    ) : (
                      <SunIcon className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-slate-700"}`}
                    >
                      {isDark ? "Dark Mode" : "Light Mode"}
                    </p>
                    <p
                      className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-slate-400"}`}
                    >
                      {isDark
                        ? "Easy on the eyes at night"
                        : "Clean and bright interface"}
                    </p>
                  </div>
                </div>
                <Toggle
                  enabled={isDark}
                  onChange={toggleTheme}
                  isDark={isDark}
                />
              </div>
            </Accordion>

            {/* ── Notifications — accordion ── */}
            <Accordion
              icon={BellIcon}
              title="Notification Preferences"
              description="Choose which alerts you want to receive."
              isDark={isDark}
            >
              <div className="flex flex-col gap-4 mt-4">
                {[
                  {
                    label: "New job posted",
                    desc: "When a new assignment request is posted",
                    value: notifNewJob,
                    set: setNotifNewJob,
                  },
                  {
                    label: "New offer received",
                    desc: "When someone applies to help with your post",
                    value: notifOffers,
                    set: setNotifOffers,
                  },
                  {
                    label: "Offer accepted",
                    desc: "When your offer to help is accepted",
                    value: notifAccepted,
                    set: setNotifAccepted,
                  },
                ].map(({ label, desc, value, set }, i, arr) => (
                  <div key={label}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-slate-700"}`}
                        >
                          {label}
                        </p>
                        <p
                          className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-slate-400"}`}
                        >
                          {desc}
                        </p>
                      </div>
                      <Toggle enabled={value} onChange={set} isDark={isDark} />
                    </div>
                    {i < arr.length - 1 && divider}
                  </div>
                ))}
              </div>
            </Accordion>

            {/* ── Security — static ── */}
            <StaticCard isDark={isDark}>
              <StaticSectionHeader
                icon={ShieldIcon}
                title="Security"
                description="Your account security overview."
                isDark={isDark}
              />
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}
                  >
                    Two-factor authentication
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDark ? "bg-white/5 text-gray-500" : "bg-slate-100 text-slate-400"}`}
                  >
                    Not enabled
                  </span>
                </div>
                {divider}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}
                  >
                    Last sign in
                  </span>
                  <span
                    className={`text-xs ${isDark ? "text-gray-500" : "text-slate-400"}`}
                  >
                    This session
                  </span>
                </div>
                {divider}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}
                  >
                    Account status
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Verified
                  </span>
                </div>
              </div>
            </StaticCard>

            {/* ── About — static ── */}
            <StaticCard isDark={isDark}>
              <StaticSectionHeader
                icon={InfoIcon}
                title="About"
                description="App information and version details."
                isDark={isDark}
              />
              <div className="flex flex-col gap-3">
                {[
                  { label: "App name", value: "CampusHelp", bold: true },
                  { label: "Version", value: "1.0.0" },
                  { label: "Platform", value: "Web" },
                ].map(({ label, value, bold }, i, arr) => (
                  <div key={label}>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}
                      >
                        {label}
                      </span>
                      <span
                        className={`text-sm ${bold ? (isDark ? "text-gray-200 font-medium" : "text-slate-700 font-medium") : isDark ? "text-gray-500" : "text-slate-400"}`}
                      >
                        {value}
                      </span>
                    </div>
                    {i < arr.length - 1 && divider}
                  </div>
                ))}
              </div>
            </StaticCard>

            {/* ── Session — static danger ── */}
            <StaticCard isDark={isDark} danger>
              <StaticSectionHeader
                icon={LogoutIcon}
                title="Session"
                description="Sign out of your account on this device."
                isDark={isDark}
                danger
              />
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-medium rounded-xl transition-all cursor-pointer"
              >
                <LogoutIcon className="w-4 h-4" />
                Sign Out
              </button>
            </StaticCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
