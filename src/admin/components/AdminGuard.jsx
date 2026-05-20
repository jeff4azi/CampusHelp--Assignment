import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../hooks/useAdminAuth.js";

export default function AdminGuard({ children, requiredRole }) {
  const { adminUser, loading, isAdmin } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) navigate("/admin/login", { replace: true });
  }, [loading, isAdmin, navigate]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg-base)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
            Verifying access…
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return children;
}
