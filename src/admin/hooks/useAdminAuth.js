import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase.js";

/**
 * Checks if the currently logged-in Supabase user is in admin_users.
 * Returns { adminUser, role, loading, isAdmin }
 */
export function useAdminAuth() {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        if (mounted) {
          setAdminUser(null);
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase
        .from("admin_users")
        .select("id, role, created_at")
        .eq("id", session.user.id)
        .single();

      if (mounted) {
        setAdminUser(data ? { ...session.user, ...data } : null);
        setLoading(false);
      }
    }

    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    adminUser,
    role: adminUser?.role ?? null,
    loading,
    isAdmin: !!adminUser,
    isSuperAdmin: adminUser?.role === "super_admin",
  };
}
