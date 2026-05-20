import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase.js";
import AdminLayout from "../layouts/AdminLayout.jsx";
import { useAdminAuth } from "../hooks/useAdminAuth.js";
import toast from "react-hot-toast";

function SettingRow({
  label,
  description,
  settingKey,
  value,
  onSave,
  type = "text",
  suffix,
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVal(value);
  }, [value]);

  async function handleSave() {
    setSaving(true);
    await onSave(settingKey, val);
    setSaving(false);
    setEditing(false);
  }

  return (
    <div
      className="flex items-start justify-between gap-4 py-4"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex-1 min-w-0">
        <p
          className="text-[13px] font-semibold"
          style={{ color: "var(--text-1)" }}
        >
          {label}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
          {description}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {editing ? (
          <>
            <div className="flex items-center gap-1">
              <input
                type={type}
                value={val}
                onChange={(e) => setVal(e.target.value)}
                className="w-24 rounded-lg px-2.5 py-1.5 text-[13px] outline-none text-right"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  color: "var(--text-1)",
                }}
              />
              {suffix && (
                <span
                  className="text-[12px]"
                  style={{ color: "var(--text-3)" }}
                >
                  {suffix}
                </span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer font-bold text-white"
              style={{ background: "var(--accent)" }}
            >
              {saving ? "…" : "Save"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setVal(value);
              }}
              className="text-[11px] px-2 py-1.5 rounded-lg cursor-pointer"
              style={{ color: "var(--text-3)", background: "var(--bg-hover)" }}
            >
              ✕
            </button>
          </>
        ) : (
          <>
            <span
              className="text-[13px] font-bold"
              style={{ color: "var(--text-1)" }}
            >
              {value}
              {suffix}
            </span>
            <button
              onClick={() => setEditing(true)}
              className="text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer font-medium"
              style={{
                background: "rgba(99,102,241,0.1)",
                color: "#818cf8",
                border: "1px solid rgba(99,102,241,0.2)",
              }}
            >
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const { adminUser, role, isSuperAdmin } = useAdminAuth();
  const [settings, setSettings] = useState({});
  const [admins, setAdmins] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("moderator");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("platform");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: s }, { data: a }, { data: l }] = await Promise.all([
      supabase.from("platform_settings").select("*"),
      supabase
        .from("admin_users")
        .select("id, role, created_at, profiles(full_name, email)"),
      supabase
        .from("admin_logs")
        .select(
          "id, action, target_type, notes, created_at, profiles(full_name)",
        )
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    const map = {};
    (s || []).forEach((row) => {
      map[row.key] = row.value;
    });
    setSettings(map);
    setAdmins(a || []);
    setLogs(l || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleSaveSetting(key, value) {
    const { error } = await supabase
      .from("platform_settings")
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
        updated_by: adminUser?.id,
      });
    if (error) {
      toast.error("Failed to save setting.");
      return;
    }
    setSettings((prev) => ({ ...prev, [key]: value }));
    toast.success("Setting saved.");
  }

  async function handleAddAdmin(e) {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    setAddingAdmin(true);

    // Look up user by email in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", newAdminEmail.trim())
      .single();
    if (!profile) {
      toast.error("No user found with that email.");
      setAddingAdmin(false);
      return;
    }

    const { error } = await supabase
      .from("admin_users")
      .insert({
        id: profile.id,
        role: newAdminRole,
        created_by: adminUser?.id,
      });
    if (error) {
      toast.error(
        error.message.includes("duplicate")
          ? "User is already an admin."
          : error.message,
      );
      setAddingAdmin(false);
      return;
    }

    toast.success("Admin added.");
    setNewAdminEmail("");
    fetchAll();
    setAddingAdmin(false);
  }

  async function handleRemoveAdmin(id) {
    if (!confirm("Remove this admin?")) return;
    await supabase.from("admin_users").delete().eq("id", id);
    toast.success("Admin removed.");
    setAdmins((prev) => prev.filter((a) => a.id !== id));
  }

  const PLATFORM_SETTINGS = [
    {
      key: "platform_fee_percent",
      label: "Platform Fee",
      description: "Percentage taken from each job payment",
      suffix: "%",
      type: "number",
    },
    {
      key: "min_budget_ngn",
      label: "Minimum Budget",
      description: "Minimum allowed job budget in NGN",
      suffix: " NGN",
      type: "number",
    },
    {
      key: "max_budget_ngn",
      label: "Maximum Budget",
      description: "Maximum allowed job budget in NGN",
      suffix: " NGN",
      type: "number",
    },
    {
      key: "dispute_review_hours",
      label: "Dispute Review SLA",
      description: "Hours to resolve a dispute",
      suffix: "h",
      type: "number",
    },
    {
      key: "withdrawal_processing_hours",
      label: "Withdrawal Processing",
      description: "Hours to process a withdrawal",
      suffix: "h",
      type: "number",
    },
  ];

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        <div className="mb-6">
          <h2
            className="text-[15px] font-bold"
            style={{ color: "var(--text-1)" }}
          >
            Settings
          </h2>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-3)" }}>
            Platform configuration and admin management
          </p>
        </div>

        {/* Tab switcher */}
        <div
          className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          {["platform", "admins", "logs"].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="px-4 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer capitalize transition-all"
              style={{
                background: activeTab === t ? "var(--accent)" : "transparent",
                color: activeTab === t ? "#fff" : "var(--text-3)",
              }}
            >
              {t === "platform"
                ? "⚙️ Platform"
                : t === "admins"
                  ? "👥 Admins"
                  : "📋 Logs"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton rounded-xl h-14" />
            ))}
          </div>
        ) : (
          <>
            {/* Platform settings */}
            {activeTab === "platform" && (
              <div
                className="rounded-2xl p-5"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  className="text-[12px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: "var(--text-3)" }}
                >
                  Platform Configuration
                </p>
                {PLATFORM_SETTINGS.map((s) => (
                  <SettingRow
                    key={s.key}
                    {...s}
                    value={settings[s.key] ?? "—"}
                    onSave={handleSaveSetting}
                  />
                ))}
              </div>
            )}

            {/* Admin management */}
            {activeTab === "admins" && (
              <div className="flex flex-col gap-4">
                {isSuperAdmin && (
                  <div
                    className="rounded-2xl p-5"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <p
                      className="text-[12px] font-bold uppercase tracking-widest mb-4"
                      style={{ color: "var(--text-3)" }}
                    >
                      Add Admin
                    </p>
                    <form
                      onSubmit={handleAddAdmin}
                      className="flex gap-3 flex-wrap"
                    >
                      <input
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="User email address"
                        type="email"
                        className="flex-1 min-w-48 rounded-xl px-3.5 py-2.5 text-[13px] outline-none"
                        style={{
                          background: "var(--bg-input)",
                          border: "1px solid var(--border)",
                          color: "var(--text-1)",
                        }}
                      />
                      <select
                        value={newAdminRole}
                        onChange={(e) => setNewAdminRole(e.target.value)}
                        className="rounded-xl px-3 py-2.5 text-[13px] outline-none cursor-pointer"
                        style={{
                          background: "var(--bg-input)",
                          border: "1px solid var(--border)",
                          color: "var(--text-1)",
                        }}
                      >
                        {["super_admin", "admin", "moderator", "support"].map(
                          (r) => (
                            <option key={r} value={r}>
                              {r.replace("_", " ")}
                            </option>
                          ),
                        )}
                      </select>
                      <button
                        type="submit"
                        disabled={addingAdmin}
                        className="px-4 py-2.5 text-white font-bold rounded-xl text-[13px] cursor-pointer disabled:opacity-50"
                        style={{ background: "var(--accent)" }}
                      >
                        {addingAdmin ? "Adding…" : "Add Admin"}
                      </button>
                    </form>
                  </div>
                )}

                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr
                        style={{
                          background: "var(--bg-card)",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        {[
                          "Admin",
                          "Role",
                          "Added",
                          ...(isSuperAdmin ? ["Actions"] : []),
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left font-semibold"
                            style={{ color: "var(--text-3)" }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map((a, i) => (
                        <tr
                          key={a.id}
                          style={{
                            background:
                              i % 2 === 0
                                ? "var(--bg-card)"
                                : "var(--bg-raised)",
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          <td className="px-4 py-3">
                            <p style={{ color: "var(--text-1)" }}>
                              {a.profiles?.full_name || "—"}
                            </p>
                            <p style={{ color: "var(--text-3)" }}>
                              {a.profiles?.email}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                              style={{
                                background: "rgba(99,102,241,0.1)",
                                color: "#818cf8",
                              }}
                            >
                              {a.role.replace("_", " ")}
                            </span>
                          </td>
                          <td
                            className="px-4 py-3"
                            style={{ color: "var(--text-3)" }}
                          >
                            {new Date(a.created_at).toLocaleDateString()}
                          </td>
                          {isSuperAdmin && (
                            <td className="px-4 py-3">
                              {a.id !== adminUser?.id && (
                                <button
                                  onClick={() => handleRemoveAdmin(a.id)}
                                  className="text-[11px] px-2 py-1 rounded-lg cursor-pointer font-medium"
                                  style={{
                                    background: "rgba(248,113,113,0.1)",
                                    color: "#f87171",
                                    border: "1px solid rgba(248,113,113,0.2)",
                                  }}
                                >
                                  Remove
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Activity logs */}
            {activeTab === "logs" && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid var(--border)" }}
              >
                <table className="w-full text-[12px]">
                  <thead>
                    <tr
                      style={{
                        background: "var(--bg-card)",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {["Admin", "Action", "Target", "Notes", "Time"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left font-semibold"
                            style={{ color: "var(--text-3)" }}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l, i) => (
                      <tr
                        key={l.id}
                        style={{
                          background:
                            i % 2 === 0 ? "var(--bg-card)" : "var(--bg-raised)",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <td
                          className="px-4 py-3"
                          style={{ color: "var(--text-2)" }}
                        >
                          {l.profiles?.full_name || "—"}
                        </td>
                        <td
                          className="px-4 py-3 font-semibold"
                          style={{ color: "#818cf8" }}
                        >
                          {l.action.replace(/_/g, " ")}
                        </td>
                        <td
                          className="px-4 py-3"
                          style={{ color: "var(--text-3)" }}
                        >
                          {l.target_type || "—"}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p
                            className="truncate"
                            style={{ color: "var(--text-3)" }}
                          >
                            {l.notes || "—"}
                          </p>
                        </td>
                        <td
                          className="px-4 py-3 whitespace-nowrap"
                          style={{ color: "var(--text-3)" }}
                        >
                          {new Date(l.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-12 text-center"
                          style={{ color: "var(--text-3)" }}
                        >
                          No logs yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
