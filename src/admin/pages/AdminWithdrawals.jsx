import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase.js";
import { formatCurrency, formatRelativeTime } from "../../utils/formatters.js";
import AdminLayout from "../layouts/AdminLayout.jsx";
import { useAdminAuth } from "../hooks/useAdminAuth.js";
import toast from "react-hot-toast";

const STATUS_FILTERS = ["all", "pending", "processing", "completed", "failed"];

export default function AdminWithdrawals() {
  const { adminUser } = useAdminAuth();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);

    // Fetch withdrawals without the join first to isolate the issue
    const { data, error } = await supabase
      .from("withdrawals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Withdrawals fetch error:", error);
      toast.error(`Failed to load withdrawals: ${error.message}`);
      setWithdrawals([]);
      setLoading(false);
      return;
    }

    if (!data?.length) {
      setWithdrawals([]);
      setLoading(false);
      return;
    }

    // Fetch helper profiles separately to avoid FK join issues
    const helperIds = [
      ...new Set(data.map((w) => w.helper_id).filter(Boolean)),
    ];
    let profileMap = {};

    if (helperIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", helperIds);
      profiles?.forEach((p) => {
        profileMap[p.id] = p;
      });
    }

    // Attach profiles to withdrawals
    const enriched = data.map((w) => ({
      ...w,
      profiles: profileMap[w.helper_id] ?? null,
    }));

    setWithdrawals(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  async function handleMarkPaid(w) {
    setProcessing(true);
    const { error } = await supabase
      .from("withdrawals")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
        processed_by: adminUser?.id,
        admin_notes: adminNote.trim() || null,
      })
      .eq("id", w.id);

    if (error) {
      toast.error("Failed to update.");
      setProcessing(false);
      return;
    }

    // Mark payments as withdrawn — try payment_ids first, fall back to helper_id
    const realPaymentIds = (w.payment_ids || []).filter(
      (id) => id && !id.startsWith("session_"),
    );

    if (realPaymentIds.length > 0) {
      await supabase
        .from("payments")
        .update({
          withdrawal_status: "completed",
          withdrawn_at: new Date().toISOString(),
        })
        .in("id", realPaymentIds);
    } else {
      // Fallback: mark ALL released pending payments for this helper as withdrawn
      await supabase
        .from("payments")
        .update({
          withdrawal_status: "completed",
          withdrawn_at: new Date().toISOString(),
        })
        .eq("helper_id", w.helper_id)
        .eq("withdrawal_status", "pending")
        .eq("escrow_status", "released");
    }

    await supabase
      .rpc("log_admin_action", {
        p_action: "mark_withdrawal_paid",
        p_target_type: "withdrawal",
        p_target_id: w.id,
        p_notes: adminNote || null,
      })
      .catch(() => {});

    toast.success("Withdrawal marked as paid. Helper notified.");
    setWithdrawals((prev) =>
      prev.map((x) => (x.id === w.id ? { ...x, status: "completed" } : x)),
    );
    setSelected(null);
    setAdminNote("");
    setProcessing(false);
  }

  async function handleReject(w) {
    if (!confirm("Reject this withdrawal?")) return;
    setProcessing(true);
    const { error } = await supabase
      .from("withdrawals")
      .update({
        status: "failed",
        admin_notes: adminNote.trim() || "Rejected by admin",
      })
      .eq("id", w.id);
    if (error) {
      toast.error("Failed.");
      setProcessing(false);
      return;
    }
    toast.success("Withdrawal rejected.");
    setWithdrawals((prev) =>
      prev.map((x) => (x.id === w.id ? { ...x, status: "failed" } : x)),
    );
    setSelected(null);
    setAdminNote("");
    setProcessing(false);
  }

  const filtered =
    filter === "all"
      ? withdrawals
      : withdrawals.filter((w) => w.status === filter);

  const statusStyle = {
    pending: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24" },
    processing: { bg: "rgba(96,165,250,0.1)", color: "#60a5fa" },
    completed: { bg: "rgba(52,211,153,0.1)", color: "#34d399" },
    failed: { bg: "rgba(248,113,113,0.1)", color: "#f87171" },
  };

  const pendingCount = withdrawals.filter((w) => w.status === "pending").length;
  const pendingTotal = withdrawals
    .filter((w) => w.status === "pending")
    .reduce((s, w) => s + Number(w.amount), 0);

  return (
    <AdminLayout badge={{ withdrawals: pendingCount }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2
              className="text-[15px] font-bold"
              style={{ color: "var(--text-1)" }}
            >
              Withdrawals
            </h2>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--text-3)" }}
            >
              {pendingCount} pending · {formatCurrency(pendingTotal)} to pay out
            </p>
          </div>
          <button
            onClick={fetchWithdrawals}
            className="text-[12px] px-3 py-1.5 rounded-lg cursor-pointer font-medium"
            style={{
              background: "var(--bg-hover)",
              border: "1px solid var(--border)",
              color: "var(--text-2)",
            }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Filter tabs */}
        <div
          className="flex gap-1 p-1 rounded-xl mb-5 w-fit"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer capitalize transition-all"
              style={{
                background: filter === f ? "var(--accent)" : "transparent",
                color: filter === f ? "#fff" : "var(--text-3)",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton rounded-2xl h-24" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((w) => {
              const ss = statusStyle[w.status] ?? statusStyle.pending;
              return (
                <div
                  key={w.id}
                  className="rounded-2xl p-4"
                  style={{
                    background: "var(--bg-card)",
                    border:
                      w.status === "pending"
                        ? "1px solid rgba(251,191,36,0.25)"
                        : "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className="text-[14px] font-bold"
                          style={{ color: "#34d399" }}
                        >
                          {formatCurrency(w.amount)}
                        </span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                          style={{ background: ss.bg, color: ss.color }}
                        >
                          {w.status}
                        </span>
                      </div>
                      <p
                        className="text-[12px] font-semibold"
                        style={{ color: "var(--text-1)" }}
                      >
                        {w.profiles?.full_name || "—"} · {w.profiles?.email}
                      </p>
                      {w.bank_details && (
                        <div
                          className="mt-1.5 p-2.5 rounded-xl text-[11px]"
                          style={{
                            background: "var(--bg-input)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <p style={{ color: "var(--text-2)" }}>
                            🏦 {w.bank_details.bank_name}
                          </p>
                          <p style={{ color: "var(--text-2)" }}>
                            Acc: {w.bank_details.account_number} ·{" "}
                            {w.bank_details.account_name}
                          </p>
                        </div>
                      )}
                      {w.admin_notes && (
                        <p
                          className="text-[11px] mt-1 italic"
                          style={{ color: "var(--text-3)" }}
                        >
                          Note: {w.admin_notes}
                        </p>
                      )}
                      <p
                        className="text-[11px] mt-1"
                        style={{ color: "var(--text-3)" }}
                      >
                        {formatRelativeTime(w.created_at)}
                      </p>
                    </div>
                    {w.status === "pending" && (
                      <button
                        onClick={() => {
                          setSelected(w);
                          setAdminNote("");
                        }}
                        className="shrink-0 text-[11px] px-3 py-1.5 rounded-lg cursor-pointer font-bold text-white"
                        style={{
                          background: "#0ba360",
                          boxShadow: "0 4px 12px rgba(11,163,96,0.3)",
                        }}
                      >
                        Process
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div
                className="text-center py-12"
                style={{ color: "var(--text-3)" }}
              >
                No withdrawals found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Process modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
          onMouseDown={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 fade-in"
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-card)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3
                className="font-bold text-[15px]"
                style={{ color: "var(--text-1)" }}
              >
                Process Withdrawal
              </h3>
              <button
                onClick={() => setSelected(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                style={{
                  color: "var(--text-3)",
                  background: "var(--bg-hover)",
                }}
              >
                ✕
              </button>
            </div>

            <div
              className="rounded-xl p-4 mb-4"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <p
                className="text-[14px] font-bold mb-1"
                style={{ color: "#34d399" }}
              >
                {formatCurrency(selected.amount)}
              </p>
              <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                {selected.profiles?.full_name} · {selected.profiles?.email}
              </p>
              {selected.bank_details && (
                <div
                  className="mt-2 text-[12px]"
                  style={{ color: "var(--text-2)" }}
                >
                  <p>🏦 {selected.bank_details.bank_name}</p>
                  <p>Acc: {selected.bank_details.account_number}</p>
                  <p>Name: {selected.bank_details.account_name}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 mb-4">
              <label
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: "var(--text-3)" }}
              >
                Admin Note (optional)
              </label>
              <input
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="e.g. Paid via GTBank transfer"
                className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  color: "var(--text-1)",
                }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleReject(selected)}
                disabled={processing}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer disabled:opacity-50"
                style={{
                  background: "rgba(248,113,113,0.1)",
                  color: "#f87171",
                  border: "1px solid rgba(248,113,113,0.2)",
                }}
              >
                Reject
              </button>
              <button
                onClick={() => handleMarkPaid(selected)}
                disabled={processing}
                className="flex-1 py-2.5 text-white font-bold rounded-xl text-[13px] cursor-pointer disabled:opacity-50 active:scale-95"
                style={{
                  background: "#0ba360",
                  boxShadow: "0 4px 12px rgba(11,163,96,0.3)",
                }}
              >
                {processing ? "Processing…" : "✓ Mark as Paid"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
