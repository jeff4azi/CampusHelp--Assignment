import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

const LOADER_VIDEO =
  "https://cdn.dribbble.com/userupload/11001831/file/large-cc6e7b6fc27b543399281ca41108ca3f.mp4";

// ── Country dial codes ────────────────────────────────────────────────────
const COUNTRIES = [
  { code: "NG", flag: "🇳🇬", dial: "+234", name: "Nigeria" },
  { code: "GH", flag: "🇬🇭", dial: "+233", name: "Ghana" },
  { code: "KE", flag: "🇰🇪", dial: "+254", name: "Kenya" },
  { code: "ZA", flag: "🇿🇦", dial: "+27", name: "South Africa" },
  { code: "US", flag: "🇺🇸", dial: "+1", name: "United States" },
  { code: "GB", flag: "🇬🇧", dial: "+44", name: "United Kingdom" },
  { code: "CA", flag: "🇨🇦", dial: "+1", name: "Canada" },
  { code: "IN", flag: "🇮🇳", dial: "+91", name: "India" },
  { code: "AU", flag: "🇦🇺", dial: "+61", name: "Australia" },
  { code: "DE", flag: "🇩🇪", dial: "+49", name: "Germany" },
  { code: "FR", flag: "🇫🇷", dial: "+33", name: "France" },
  { code: "BR", flag: "🇧🇷", dial: "+55", name: "Brazil" },
];

// ── Password rules ────────────────────────────────────────────────────────
const RULES = [
  { id: "len", label: "At least 8 characters", test: (p) => p.length >= 8 },
  {
    id: "upper",
    label: "At least 1 uppercase letter",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: "special",
    label: "At least 1 special character",
    test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
  },
];

function usePasswordValidation(password) {
  return useMemo(
    () => RULES.map((r) => ({ ...r, pass: r.test(password) })),
    [password],
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────
function EyeIcon({ open }) {
  return open ? (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ) : (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 012.163-3.592M6.53 6.533A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411M3 3l18 18"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// ── Phone input with country picker ──────────────────────────────────────
function PhoneInput({ value, onChange, dialCode, onDialChange, disabled }) {
  const [open, setOpen] = useState(false);
  const selected = COUNTRIES.find((c) => c.dial === dialCode) ?? COUNTRIES[0];

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        Phone Number
      </label>
      <div className="flex gap-0">
        {/* Country selector */}
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen((v) => !v)}
            className="h-full flex items-center gap-1.5 bg-white/4 border border-white/8 border-r-0 rounded-l-xl px-3 py-3 text-sm text-gray-200 hover:bg-white/6 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap"
          >
            <span className="text-base leading-none">{selected.flag}</span>
            <span className="text-gray-400 text-xs">{selected.dial}</span>
            <svg
              className="w-3 h-3 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {open && (
            <div
              className="absolute top-full left-0 mt-1 z-50 w-52 rounded-xl overflow-hidden shadow-2xl shadow-black/50"
              style={{
                background: "#0d1424",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onDialChange(c.dial);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors cursor-pointer hover:bg-white/5 ${c.dial === dialCode ? "bg-indigo-600/15 text-indigo-300" : "text-gray-300"}`}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {c.dial}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Number input */}
        <input
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="8012345678"
          className="flex-1 bg-white/4 border border-white/8 rounded-r-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 transition-all disabled:opacity-40"
        />
      </div>
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────
function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
  children,
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          required
          disabled={disabled}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-white/4 border border-white/8 focus:border-indigo-500/60 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none transition-all disabled:opacity-40 pr-10"
        />
        {children}
      </div>
    </div>
  );
}

function PasswordRules({ rules, visible }) {
  if (!visible) return null;
  return (
    <ul className="flex flex-col gap-1.5 mt-1">
      {rules.map((r) => (
        <li key={r.id} className="flex items-center gap-2 text-xs">
          <span
            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold transition-colors ${r.pass ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-gray-600"}`}
          >
            {r.pass ? "✓" : "·"}
          </span>
          <span
            className={`transition-colors ${r.pass ? "text-emerald-400" : "text-gray-500"}`}
          >
            {r.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function Signup() {
  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [dialCode, setDialCode] = useState("+234"); // default Nigeria
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayFading, setOverlayFading] = useState(false);

  const rules = usePasswordValidation(form.password);
  const allRulesPass = rules.every((r) => r.pass);
  const passwordsMatch =
    form.password === form.confirmPassword && form.confirmPassword.length > 0;
  const canSubmit =
    allRulesPass && passwordsMatch && !loading && !googleLoading;

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function showOverlay() {
    setOverlayVisible(true);
    setOverlayFading(false);
  }
  function hideOverlay(cb) {
    setOverlayFading(true);
    setTimeout(() => {
      setOverlayVisible(false);
      setOverlayFading(false);
      cb?.();
    }, 500);
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await loginWithGoogle();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    showOverlay();

    const username = `${form.firstName.trim()} ${form.lastName.trim()}`;
    // Combine dial code + local number, strip leading zero from local part
    const localNum = form.phoneNumber.replace(/^0+/, "");
    const fullPhone = dialCode.replace("+", "") + localNum;

    const [result] = await Promise.all([
      signup(form.email, form.password, username, fullPhone),
      new Promise((res) => setTimeout(res, 3000)),
    ]);

    if (result.success) {
      hideOverlay(() => navigate("/dashboard"));
    } else {
      hideOverlay(() => setLoading(false));
    }
  }

  return (
    <div className="min-h-screen bg-[#080b14] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            to="/"
            className="text-indigo-400 font-bold text-2xl tracking-tight"
          >
            CampusHelp
          </Link>
          <p className="text-gray-500 text-sm mt-2">
            Create your free account — it only takes a minute
          </p>
        </div>

        <div className="relative">
          <form
            onSubmit={handleSubmit}
            className="bg-[#0d1424] border border-white/6 rounded-2xl p-7 flex flex-col gap-4 shadow-xl shadow-black/40"
          >
            {/* Google button */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800 font-semibold py-3 rounded-xl transition-all text-sm cursor-pointer shadow-sm"
            >
              <GoogleIcon />
              {googleLoading ? "Redirecting…" : "Sign up with Google"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-xs text-gray-600">or with email</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="First Name"
                value={form.firstName}
                onChange={set("firstName")}
                placeholder="Jane"
                disabled={loading}
              />
              <Field
                label="Last Name"
                value={form.lastName}
                onChange={set("lastName")}
                placeholder="Doe"
                disabled={loading}
              />
            </div>

            {/* Phone with country picker */}
            <PhoneInput
              value={form.phoneNumber}
              onChange={(v) => setForm((p) => ({ ...p, phoneNumber: v }))}
              dialCode={dialCode}
              onDialChange={setDialCode}
              disabled={loading}
            />

            <Field
              label="Email Address"
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="jane@university.edu"
              disabled={loading}
            />

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={loading}
                  value={form.password}
                  onChange={set("password")}
                  onFocus={() => setPwFocused(true)}
                  placeholder="Min. 8 characters"
                  className="w-full bg-white/4 border border-white/8 focus:border-indigo-500/60 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none transition-all disabled:opacity-40 pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              <PasswordRules rules={rules} visible={pwFocused} />
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  disabled={loading}
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  placeholder="Re-enter your password"
                  className={`w-full bg-white/4 border rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none transition-all disabled:opacity-40 pr-10 ${
                    form.confirmPassword.length > 0
                      ? passwordsMatch
                        ? "border-emerald-500/40 focus:border-emerald-500/60"
                        : "border-red-500/40 focus:border-red-500/60"
                      : "border-white/8 focus:border-indigo-500/60"
                  }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {form.confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-400 mt-0.5">
                  Passwords do not match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all text-sm cursor-pointer tracking-wide hover:-translate-y-0.5 shadow-lg shadow-indigo-900/30"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          {/* Loading overlay */}
          {overlayVisible && (
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden flex items-center justify-center z-50"
              style={{
                opacity: overlayFading ? 0 : 1,
                transition: "opacity 0.5s ease",
              }}
            >
              <div
                className="absolute inset-0"
                style={{ backgroundColor: "rgba(5,5,10,0.5)" }}
              />
              <video
                src={LOADER_VIDEO}
                autoPlay
                muted
                playsInline
                loop
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: 0.3,
                  pointerEvents: "none",
                }}
              />
              <p
                className="relative z-10 text-xs text-indigo-300 font-medium tracking-widest uppercase animate-pulse"
                style={{ textShadow: "0 0 12px rgba(99,102,241,0.8)" }}
              >
                Creating your account…
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-600 mt-5">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
