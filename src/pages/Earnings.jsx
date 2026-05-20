import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth.js";
import { supabase } from "../lib/supabase.js";
import { formatCurrency, formatRelativeTime } from "../utils/formatters.js";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import toast from "react-hot-toast";

// ── Balance card ──────────────────────────────────────────────────────────
function BalanceCard({ label, amount, sub, icon, colorKey, pulse = false }) {
  const palette = {
    amber:   { text: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.18)"  },
    indigo:  { text: "#818cf8", bg: "rgba(99,102,241,0.08)",  border: "rgba(99,102,241,0.18)"  },
    emerald: { text: "#34d399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.18)"  },
    red:     { text: "#f87171", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.18)"   },
    violet:  { text: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.18)" },
  };
  const c = palette[colorKey] ?? palette.indigo;

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg">{icon}</span>
        {pulse && (
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: c.text }}
          />
        )}
      </div>
      <div>
        <p className="text-xl font-bold" style={{ color: c.text }}>
          {formatCurrency(amount)}
        </p>
        <p className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--text-2)" }}>
          {label}
        </p>
        {sub && (
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Escrow status pill ────────────────────────────────────────────────────
function EscrowPill({ status }) {
  const map = {
    held:      { label: "In Escrow",  color: "#fbbf24", bg: "rgba(251,191,36,0.1)"  },
    released:  { label: "Available",  color: "#34d399", bg: "rgba(52,211,153,0.1)"  },
    disputed:  { label: "Frozen",     color: "#f87171", bg: "rgba(239,68,68,0.1)"   },
    refunded:  { label: "Refunded",   color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  };
  const s = map[status] ?? map.held;
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ── Escrow flow diagram ───────────────────────────────────────────────────
function EscrowFlow() {
  const steps = [
    { icon: "💳", label: "Student pays",    sub: "Funds enter escrow" },
    { icon: "🔒", label: "Held in escrow",  sub: "Safe while work happens" },
    { icon: "✅", label: "Job completed",   sub: "Funds released to helper" },
    { icon: "💸", label: "Helper withdraws", sub: "Paid to bank account" },
  ];
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
        How Escrow Works
      </p>
      <div className="flex items-start gap-0">
        {steps.map((step, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 relative">
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className="absolute top-4 left-1/2 w-full h-px"
                style={{ background: "var(--border)" }}
              />
            )}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm z-10 relative"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}
            >
              {step.icon}
            </div>
            <p className="text-[10px] font-semibold text-center" style={{ color: "var(--text-2)" }}>
              {step.label}
            </p>
            <p className="text-[9px] text-center" style={{ color: "var(--text-3)" }}>
              {step.sub}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Payment row ───────────────────────────────────────────────────────────
function PaymentRow({ payment }) {
  const course = payment._course ?? "—";
  const withdrawable = Number(payment.withdrawable_amount) || 0;
  const escrow = payment.escrow_status ?? "held";
  const withdrawalStatus = payment.withdrawal_status ?? "pending";

  // Determine display status
  let displayStatus = escrow;
  if (escrow === "released" && withdrawalStatus === "completed") displayStatus = "withdrawn";
  if (escrow === "released" && withdrawalStatus === "processing") displayStatus = "processing";

  const statusMap = {
    held:        { label: "In Escrow",  color: "#fbbf24" },
    released:    { label: "Available",  color: "#34d399" },
    disputed:    { label: "Frozen",     color: "#f87171" },
    refunded:    { label: "Refunded",   color: "#94a3b8" },
    withdrawn:   { label: "Withdrawn",  color: "#a78bfa" },
    processing:  { label: "Processing", color: "#60a5fa" },
  };
  const s = statusMap[displayStatus] ?? statusMap.held;

  return (
    <div
      className="rounded-2xl p-4 flex items-start justify-between gap-3"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
            {course}
          </p>
          {escrow === "disputed" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-red-500/10 text-red-400">
              ⚠ Dispute
            </span>
          )}
        </div>
        <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
          {formatRelativeTime(payment.created_at)}
        </p>
        {escrow === "held" && (
          <p className="text-[10px] mt-1" style={{ color: "var(--text-3)" }}>
            Released when session is marked complete
          </p>
        )}
        {escrow === "disputed" && (
          <p className="text-[10px] mt-1" style={{ color: "#fca5a5" }}>
            Frozen — under admin review
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-[14px] font-bold" style={{ color: "#34d399" }}>
          {formatCurrency(withdrawable)}
        </p>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${s.color}18`, color: s.color }}
        >
          {s.label}
        </span>
      </div>
    </div>
  );
}

// ── Withdraw modal ────────────────────────────────────────────────────────
function WithdrawModal({ availableAmount, availablePayments, helperId, helperEmail, onClose, onSuccess }) {
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const inputCls = "w-full rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none transition-all";
  const inputStyle = {
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
    color: "var(--text-1)",
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      toast.error("Please fill in all bank details.");
      return;
    }
    if (accountNumber.replace(/\D/g, "").length !== 10) {
      toast.error("Account number must be 10 digits.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: withdrawal, error: wErr } = await supabase
        .from("withdrawals")
        .insert({
          helper_id: helperId,
          amount: availableAmount,
          status: "pending",
          payment_ids: availablePayments.map((p) => p.id).filter((id) => id && !id.startsWith("session_")),
          bank_details: {
            bank_name: bankName.trim(),
            account_number: accountNumber.trim(),
            account_name: accountName.trim(),
          },
        })
        .select("id")
        .single();

      if (wErr) throw wErr;

      // Mark payments as processing
      const realIds = availablePayments.map((p) => p.id).filter((id) => id && !id.startsWith("session_"));
      if (realIds.length > 0) {
        await supabase
          .from("payments")
          .update({ withdrawal_status: "processing" })
          .in("id", realIds);
      }

      toast.success("Withdrawal request submitted! We'll process it within 24 hours.");
      onSuccess();
    } catch (err) {
      toast.error("Failed to submit withdrawal. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md px-4 pb-4 sm:pb-0"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
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
          <div>
            <h2 className="font-bold text-[15px]" style={{ color: "var(--text-1)" }}>
              Withdraw Earnings
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--text-3)" }}>
              {formatCurrency(availableAmount)} available
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ color: "var(--text-3)", background: "var(--bg-hover)" }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { label: "Bank Name", value: bankName, set: setBankName, placeholder: "e.g. GTBank, Access Bank, Opay" },
            { label: "Account Number", value: accountNumber, set: setAccountNumber, placeholder: "10-digit account number", maxLength: 10 },
            { label: "Account Name", value: accountName, set: setAccountName, placeholder: "Name on the account" },
          ].map(({ label, value, set, placeholder, maxLength }) => (
            <div key={label} className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                {label}
              </label>
              <input
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
                className={inputCls}
                style={inputStyle}
              />
            </div>
          ))}

          <div
            className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-[12px]"
            style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", color: "#fbbf24" }}
          >
            <span className="shrink-0">⚠️</span>
            <span>Withdrawals are processed manually within 24 hours. Ensure your bank details are correct.</span>
          </div>

          <div className="flex gap-3 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer"
              style={{ border: "1px solid var(--border)", color: "var(--text-2)", background: "var(--bg-hover)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 text-white font-bold rounded-xl text-[13px] cursor-pointer disabled:opacity-50 active:scale-95"
              style={{ background: "#0ba360", boxShadow: "0 4px 16px rgba(11,163,96,0.3)" }}
            >
              {submitting ? "Submitting…" : "Request Withdrawal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function Earnings() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    // Fetch completed sessions where user is helper
    const { data: helperSessions } = await supabase
      .from("work_sessions")
      .select("id, post_id, amount, platform_fee, payment_reference, payment_status, created_at, posts(course, description, budget)")
      .eq("helper_id", user.id)
      .eq("status", "completed");

    let paymentsData = [];

    if (helperSessions?.length > 0) {
      const sessionIds = helperSessions.map((s) => s.id);

      const { data: dbPayments } = await supabase
        .from("payments")
        .select("*")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false });

      if (dbPayments?.length > 0) {
        paymentsData = dbPayments.map((p) => {
          const session = helperSessions.find((s) => s.id === p.session_id);
          const budget = Number(p.amount) || Number(session?.posts?.budget) || 0;
          const fee = Number(p.platform_fee) || budget * 0.15;
          const withdrawable = Number(p.withdrawable_amount) || budget - fee;
          return {
            ...p,
            amount: budget,
            platform_fee: fee,
            withdrawable_amount: withdrawable,
            escrow_status: p.escrow_status ?? "released", // legacy rows default to released
            _course: session?.posts?.course ?? "—",
          };
        });
      } else {
        // Fallback: build from sessions (pre-escrow data)
        paymentsData = helperSessions.map((s) => {
          const budget = Number(s.amount) > 0 ? Number(s.amount) : Number(s.posts?.budget) || 0;
          const fee = Number(s.platform_fee) > 0 ? Number(s.platform_fee) : budget * 0.15;
          return {
            id: s.id,
            session_id: s.id,
            amount: budget,
            platform_fee: fee,
            withdrawable_amount: budget - fee,
            status: "available_for_withdrawal",
            escrow_status: "released",
            withdrawal_status: "pending",
            created_at: s.created_at,
            _course: s.posts?.course ?? "—",
          };
        });
      }
    }

    // Also fetch ACTIVE sessions where user is helper (held funds)
    const { data: activeSessions } = await supabase
      .from("work_sessions")
      .select("id, amount, platform_fee, created_at, posts(course)")
      .eq("helper_id", user.id)
      .eq("status", "active")
      .eq("payment_status", "paid");

    if (activeSessions?.length > 0) {
      const activeIds = activeSessions.map((s) => s.id);
      const { data: heldPayments } = await supabase
        .from("payments")
        .select("*")
        .in("session_id", activeIds)
        .order("created_at", { ascending: false });

      if (heldPayments?.length > 0) {
        const heldMapped = heldPayments.map((p) => {
          const session = activeSessions.find((s) => s.id === p.session_id);
          const budget = Number(p.amount) || Number(session?.posts?.budget) || 0;
          const fee = Number(p.platform_fee) || budget * 0.15;
          return {
            ...p,
            amount: budget,
            platform_fee: fee,
            withdrawable_amount: Number(p.withdrawable_amount) || budget - fee,
            escrow_status: p.escrow_status ?? "held",
            _course: session?.posts?.course ?? "—",
          };
        });
        paymentsData = [...heldMapped, ...paymentsData];
      }
    }

    const { data: withdrawalsData } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("helper_id", user.id)
      .order("created_at", { ascending: false });

    setPayments(paymentsData);
    setWithdrawals(withdrawalsData || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Compute balances ──────────────────────────────────────────────────
  const heldAmount = payments
    .filter((p) => p.escrow_status === "held")
    .reduce((s, p) => s + (Number(p.withdrawable_amount) || 0), 0);

  const availableAmount = payments
    .filter((p) => p.escrow_status === "released" && p.withdrawal_status === "pending")
    .reduce((s, p) => s + (Number(p.withdrawable_amount) || 0), 0);

  const disputedAmount = payments
    .filter((p) => p.escrow_status === "disputed")
    .reduce((s, p) => s + (Number(p.withdrawable_amount) || 0), 0);

  const withdrawnAmount = withdrawals
    .filter((w) => w.status === "completed")
    .reduce((s, w) => s + Number(w.amount), 0);

  const pendingWithdrawalAmount = withdrawals
    .filter((w) => w.status === "pending" || w.status === "processing")
    .reduce((s, w) => s + Number(w.amount), 0);

  const availablePayments = payments.filter(
    (p) => p.escrow_status === "released" && p.withdrawal_status === "pending",
  );

  const heldCount = payments.filter((p) => p.escrow_status === "held").length;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        <div className="mb-6">
          <h1 className="text-lg font-bold" style={{ color: "var(--text-1)" }}>
            Earnings & Escrow
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-3)" }}>
            You earn 85% of each job. Funds are held in escrow until work is completed.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton rounded-2xl h-24" />
            ))}
          </div>
        ) : (
          <>
            {/* ── Balance cards ──────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <BalanceCard
                icon="🔒"
                label="Held in Escrow"
                amount={heldAmount}
                sub={heldCount > 0 ? `${heldCount} active job${heldCount > 1 ? "s" : ""}` : "No active jobs"}
                colorKey="amber"
                pulse={heldCount > 0}
              />
              <BalanceCard
                icon="✅"
                label="Available to Withdraw"
                amount={availableAmount}
                sub={availablePayments.length > 0 ? `${availablePayments.length} job${availablePayments.length > 1 ? "s" : ""} completed` : "Complete jobs to unlock"}
                colorKey="emerald"
              />
              {disputedAmount > 0 && (
                <BalanceCard
                  icon="⚠️"
                  label="Frozen (Disputed)"
                  amount={disputedAmount}
                  sub="Under admin review"
                  colorKey="red"
                  pulse
                />
              )}
              <BalanceCard
                icon="⏳"
                label="Pending Withdrawal"
                amount={pendingWithdrawalAmount}
                sub="Processing within 24h"
                colorKey="violet"
              />
              <BalanceCard
                icon="💸"
                label="Total Withdrawn"
                amount={withdrawnAmount}
                sub="Paid to your bank"
                colorKey="indigo"
              />
            </div>

            {/* ── Escrow flow explainer ──────────────────────────── */}
            <div className="mb-5">
              <EscrowFlow />
            </div>

            {/* ── Withdraw button ────────────────────────────────── */}
            {availableAmount > 0 && (
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="w-full py-3.5 text-white font-bold rounded-2xl text-[14px] mb-6 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                style={{ background: "#0ba360", boxShadow: "0 4px 16px rgba(11,163,96,0.3)" }}
              >
                <span>💸</span>
                Withdraw {formatCurrency(availableAmount)}
              </button>
            )}

            {/* ── Payment history ────────────────────────────────── */}
            <div className="mb-2">
              <h2 className="text-[13px] font-bold mb-3" style={{ color: "var(--text-1)" }}>
                Payment History
              </h2>
              {payments.length === 0 ? (
                <div
                  className="text-center py-12 rounded-2xl"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <p className="text-3xl mb-2">💼</p>
                  <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
                    No payments yet.
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>
                    Complete jobs to start earning.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {payments.map((p) => (
                    <PaymentRow key={p.id} payment={p} />
                  ))}
                </div>
              )}
            </div>

            {/* ── Withdrawal history ─────────────────────────────── */}
            {withdrawals.length > 0 && (
              <div className="mt-6">
                <h2 className="text-[13px] font-bold mb-3" style={{ color: "var(--text-1)" }}>
                  Withdrawal History
                </h2>
                <div className="flex flex-col gap-2">
                  {withdrawals.map((w) => (
                    <div
                      key={w.id}
                      className="rounded-2xl p-4 flex items-center justify-between"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                    >
                      <div>
                        <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
                          {formatCurrency(w.amount)}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
                          {formatRelativeTime(w.created_at)}
                          {w.bank_details?.bank_name && ` · ${w.bank_details.bank_name}`}
                        </p>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={
                          w.status === "completed"
                            ? { background: "rgba(52,211,153,0.1)", color: "#34d399" }
                            : w.status === "processing"
                              ? { background: "rgba(251,191,36,0.1)", color: "#fbbf24" }
                              : { background: "var(--bg-hover)", color: "var(--text-3)" }
                        }
                      >
                        {w.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showWithdrawModal && (
        <WithdrawModal
          availableAmount={availableAmount}
          availablePayments={availablePayments}
          helperId={user.id}
          helperEmail={user.email}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={() => { setShowWithdrawModal(false); fetchData(); }}
        />
      )}
    </DashboardLayout>
  );
}
