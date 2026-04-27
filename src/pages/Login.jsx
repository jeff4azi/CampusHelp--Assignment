import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { AcademicCapIcon, ArrowRightIcon } from "../components/Icons.jsx";

const fieldCls =
  "w-full bg-white/4 border border-white/8 focus:border-indigo-500/60 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none transition-all disabled:opacity-40";

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

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) navigate("/dashboard");
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await loginWithGoogle(); // redirects — no need to reset loading
  }

  return (
    <div className="min-h-screen bg-[#080b14] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-900/50 glow-pulse">
              <AcademicCapIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">
              CampusHelp
            </span>
          </Link>
          <p className="text-gray-500 text-sm mt-2">
            Welcome back — sign in to continue
          </p>
        </div>

        <div className="bg-[#0d1424] border border-white/6 rounded-2xl p-7 shadow-2xl shadow-black/40">
          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800 font-semibold py-3 rounded-xl transition-all text-sm cursor-pointer mb-5 shadow-sm"
          >
            <GoogleIcon />
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs text-gray-600">or sign in with email</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className={fieldCls}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={fieldCls + " pr-14"}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors cursor-pointer text-xs"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="group mt-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-900/40 hover:-translate-y-0.5 cursor-pointer"
            >
              {loading ? (
                "Signing in…"
              ) : (
                <>
                  Sign In
                  <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 mt-5">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
