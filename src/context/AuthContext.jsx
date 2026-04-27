import { createContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";
import toast from "react-hot-toast";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) toast.error(error.message);
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      toast.error(error.message);
      return { success: false, error: error.message };
    }
    toast.success("Welcome back!");
    return { success: true, user: data.user };
  }

  async function signup(email, password, username, phone) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username ?? email.split("@")[0] } },
    });
    if (error) {
      toast.error(error.message);
      return { success: false, error: error.message };
    }
    // Save phone to profiles (trigger already created the row)
    if (phone && data.user) {
      await supabase
        .from("profiles")
        .upsert({ id: data.user.id, email, full_name: username, phone })
        .eq("id", data.user.id);
    }
    toast.success("Account created successfully!");
    return { success: true, user: data.user };
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    toast("Logged out", { icon: "👋" });
  }

  async function updateProfile({ username, email }) {
    const updates = {};
    if (username) updates.data = { username };
    if (email) updates.email = email;

    const { data, error } = await supabase.auth.updateUser(updates);
    if (error) return { success: false, error: error.message };

    // Refresh local user
    setUser(data.user);
    return { success: true };
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async function verifyCurrentPassword(currentPassword) {
    const { error } = await supabase.auth.signInWithPassword({
      email: user?.email,
      password: currentPassword,
    });
    if (error)
      return { success: false, error: "Current password is incorrect." };
    return { success: true };
  }

  async function updatePhone(phone) {
    if (!user?.id) return { success: false, error: "Not logged in" };
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, phone })
      .eq("id", user.id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  // Expose a normalised user shape consistent with the old API
  const publicUser = user
    ? {
        id: user.id,
        email: user.email,
        username: user.user_metadata?.username ?? user.email?.split("@")[0],
        createdAt: user.created_at,
      }
    : null;

  // True when the user signed in via Google OAuth (no password set)
  const isGoogleUser = user?.app_metadata?.provider === "google";

  return (
    <AuthContext.Provider
      value={{
        user: publicUser,
        isGoogleUser,
        loading,
        login,
        loginWithGoogle,
        signup,
        logout,
        updateProfile,
        updatePassword,
        verifyCurrentPassword,
        updatePhone,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}
