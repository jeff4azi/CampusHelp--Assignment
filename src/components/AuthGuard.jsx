import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useSessions } from "../hooks/useSessions.js";
import { useNotifications } from "../hooks/useNotifications.js";

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const { fetchSessions } = useSessions();
  const { fetchNotifications, subscribeRealtime } = useNotifications();

  useEffect(() => {
    if (user?.id) {
      fetchSessions(user.id);
      fetchNotifications(user.id);
      const unsub = subscribeRealtime(user.id);
      return unsub;
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <span className="text-gray-500 text-sm animate-pulse">Loading…</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}
