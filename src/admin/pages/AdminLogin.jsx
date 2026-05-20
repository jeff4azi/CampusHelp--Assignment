import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import toast from "react-hot-toast";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // If already logged in as admin, redirect
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const { data } = await supabase
        .from("admin_users")
        .select("id")
        .eq("id", session.user.id)
        .single();
      if (data) navigate("/admin", { replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Check admin_users table
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("id", data.user.id)
      .single();

    if (!adminRow) {
      await supabase.auth.signOut();
      toast.error("Access denied. You are not an admin.");
      setLoading(false);
      return;
    }

    toast.success(`Welcome back, ${adminRow.role.replace("_", " ")}!`);
    navigate("/admin", { replace: true });
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg-base)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center shadow-xl shadow-red-900/40 mb-4">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-1)" }}>
            Admin Portal
          </h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>
            CampusHelp — Restricted Access
          </p>
        </div>

        {/* Warning */}
        <div
          className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-6 text-[12px]"
          style={{
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.15)",
            color: "#fca5a5",
          }}
        >
          <span className="shrink-0">🔒</span>
          <span>
            This portal is for authorised administrators only. Unauthorised
            access attempts are logged.
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-3)" }}
            >
              Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@campushelp.com"
              required
              className="w-full rounded-xl px-4 py-3 text-[13.5px] outline-none transition-all"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-1)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(239,68,68,0.5)";
                e.target.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-3)" }}
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl px-4 py-3 text-[13.5px] outline-none transition-all pr-14"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  color: "var(--text-1)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(239,68,68,0.5)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border)";
                  e.target.style.boxShadow = "none";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs cursor-pointer"
                style={{ color: "var(--text-3)" }}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-white font-bold rounded-xl text-[14px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2 mt-2"
            style={{
              background: "#dc2626",
              boxShadow: "0 4px 16px rgba(220,38,38,0.3)",
            }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying…
              </>
            ) : (
              "Sign In to Admin"
            )}
          </button>
        </form>

        <p
          className="text-center text-[11px] mt-6"
          style={{ color: "var(--text-3)" }}
        >
          Not an admin?{" "}
          <a
            href="/"
            className="text-indigo-400 hover:underline cursor-pointer"
          >
            Go to user app →
          </a>
        </p>
      </div>
    </div>
  );
}
