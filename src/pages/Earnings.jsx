import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth.js";
import { supabase } from "../lib/supabase.js";
import { formatCurrency, formatRelativeTime } from "../utils/formatters.js";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import toast from "react-hot-toast";

const HELPER_SHARE = 0.85;

function StatCard({ label, value, color = "indigo", sub }) {
  const colors = {
    indigo: {
      text: "#818cf8",
      bg: "rgba(99,102,241,0.08)",
      border: "rgba(99,102,241,0.15)",
    },
    emerald: {
      text: "#34d399",
      bg: "rgba(52,211,153,0.08)",
      border: "rgba(52,211,153,0.15)",
    },
    amber: {
      text: "#fbbf24",
      bg: "rgba(251,191,36,0.08)",
      border: "rgba(251,191,36,0.15)",
    },
    violet: {
      text: "#a78bfa",
      bg: "rgba(167,139,250,0.08)",
      border: "rgba(167,139,250,0.15)",
    },
  };
  const c = colors[color];
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <p
        className="text-[11px] font-bold uppercase tracking-widest mb-2"
        style={{ color: "var(--text-3)" }}
      >
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: c.text }}>
        {value}
      </p>
      {sub && (
        <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export default function Earnings() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    // Primary: get all completed sessions where user is helper
    const { data: helperSessions, error: sessErr } = await supabase
      .from("work_sessions")
      .select(
        "id, post_id, amount, platform_fee, payment_reference, payment_status, created_at, posts(course, description, budget)",
      )
      .eq("helper_id", user.id)
      .eq("status", "completed");

    if (sessErr) console.error("Sessions fetch error:", sessErr);

    let paymentsData = [];

    if (helperSessions && helperSessions.length > 0) {
      const sessionIds = helperSessions.map((s) => s.id);

      // Try fetching from payments table
      const { data: dbPayments } = await supabase
        .from("payments")
        .select("*")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false });

      if (dbPayments && dbPayments.length > 0) {
        // Attach post info from sessions + ensure withdrawable_amount is calculated
        paymentsData = dbPayments.map((p) => {
          const session = helperSessions.find((s) => s.id === p.session_id);
          const budget =
            Number(p.amount) || Number(session?.posts?.budget) || 0;
          const fee = Number(p.platform_fee) || budget * 0.15;
          const withdrawable = Number(p.withdrawable_amount) || budget - fee;
          return {
            ...p,
            amount: budget,
            platform_fee: fee,
            withdrawable_amount: withdrawable,
            _course: session?.posts?.course ?? "—",
          };
        });
      } else {
        // Payments table empty or migration not run — build from sessions directly
        paymentsData = helperSessions.map((s) => {
          // Use session amount first, then fall back to post budget
          const budget =
            Number(s.amount) > 0
              ? Number(s.amount)
              : Number(s.posts?.budget) > 0
                ? Number(s.posts.budget)
                : 0;
          const fee =
            Number(s.platform_fee) > 0 ? Number(s.platform_fee) : budget * 0.15;
          const withdrawable = budget - fee;
          return {
            id: s.id,
            session_id: s.id,
            amount: budget,
            platform_fee: fee,
            withdrawable_amount: withdrawable,
            status: "available_for_withdrawal",
            withdrawal_status: "pending",
            created_at: s.created_at,
            _course: s.posts?.course ?? "—",
          };
        });
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute stats — handle both DB payments and session-derived data
  const totalEarned = payments.reduce(
    (sum, p) => sum + (Number(p.withdrawable_amount) || 0),
    0,
  );

  const availableToWithdraw = payments
    .filter(
      (p) =>
        p.withdrawal_status !== "completed" &&
        p.withdrawal_status !== "processing",
    )
    .reduce((sum, p) => sum + (Number(p.withdrawable_amount) || 0), 0);

  const pendingWithdrawals = withdrawals
    .filter((w) => w.status === "pending" || w.status === "processing")
    .reduce((sum, w) => sum + Number(w.amount), 0);

  const completedWithdrawals = withdrawals
    .filter((w) => w.status === "completed")
    .reduce((sum, w) => sum + Number(w.amount), 0);

  const availablePayments = payments.filter(
    (p) =>
      p.withdrawal_status !== "completed" &&
      p.withdrawal_status !== "processing",
  );

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        <div className="mb-6">
          <h1 className="text-lg font-bold" style={{ color: "var(--text-1)" }}>
            My Earnings
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-3)" }}>
            You earn 85% of each job budget
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton rounded-2xl h-24" />
            ))}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatCard
                label="Total Earned"
                value={formatCurrency(totalEarned)}
                color="emerald"
              />
              <StatCard
                label="Available to Withdraw"
                value={formatCurrency(availableToWithdraw)}
                color="indigo"
                sub={
                  availablePayments.length > 0
                    ? `${availablePayments.length} job${availablePayments.length > 1 ? "s" : ""}`
                    : "Nothing yet"
                }
              />
              <StatCard
                label="Pending Withdrawal"
                value={formatCurrency(pendingWithdrawals)}
                color="amber"
              />
              <StatCard
                label="Total Withdrawn"
                value={formatCurrency(completedWithdrawals)}
                color="violet"
              />
            </div>

            {/* Withdraw button */}
            {availableToWithdraw > 0 && (
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="w-full py-3 text-white font-bold rounded-2xl text-[14px] mb-6 transition-all active:scale-95 cursor-pointer"
                style={{
                  background: "#0ba360",
                  boxShadow: "0 4px 16px rgba(11,163,96,0.3)",
                }}
              >
                Withdraw {formatCurrency(availableToWithdraw)}
              </button>
            )}

            {/* Earnings history */}
            <div className="mb-2">
              <h2
                className="text-[13px] font-bold mb-3"
                style={{ color: "var(--text-1)" }}
              >
                Earnings History
              </h2>
              {payments.length === 0 ? (
                <div
                  className="text-center py-12 rounded-2xl"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
                    No earnings yet.
                  </p>
                  <p
                    className="text-[11px] mt-1"
                    style={{ color: "var(--text-3)" }}
                  >
                    Complete jobs to start earning.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {payments.map((p) => {
                    const course =
                      p._course ?? p.work_sessions?.posts?.course ?? "—";
                    const isAvailable =
                      p.status === "available_for_withdrawal" &&
                      p.withdrawal_status === "pending";
                    const isWithdrawn = p.withdrawal_status === "completed";
                    const isProcessing = p.withdrawal_status === "processing";
                    return (
                      <div
                        key={p.id}
                        className="rounded-2xl p-4"
                        style={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              className="text-[13px] font-semibold"
                              style={{ color: "var(--text-1)" }}
                            >
                              {course}
                            </p>
                            <p
                              className="text-[11px] mt-0.5"
                              style={{ color: "var(--text-3)" }}
                            >
                              {formatRelativeTime(p.created_at)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p
                              className="text-[14px] font-bold"
                              style={{ color: "#34d399" }}
                            >
                              {formatCurrency(p.withdrawable_amount || 0)}
                            </p>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={
                                isAvailable
                                  ? {
                                      background: "rgba(99,102,241,0.1)",
                                      color: "#818cf8",
                                    }
                                  : isWithdrawn
                                    ? {
                                        background: "rgba(52,211,153,0.1)",
                                        color: "#34d399",
                                      }
                                    : isProcessing
                                      ? {
                                          background: "rgba(251,191,36,0.1)",
                                          color: "#fbbf24",
                                        }
                                      : {
                                          background: "var(--bg-hover)",
                                          color: "var(--text-3)",
                                        }
                              }
                            >
                              {isAvailable
                                ? "Available"
                                : isWithdrawn
                                  ? "Withdrawn"
                                  : isProcessing
                                    ? "Processing"
                                    : "Pending"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Withdrawal history */}
            {withdrawals.length > 0 && (
              <div className="mt-6">
                <h2
                  className="text-[13px] font-bold mb-3"
                  style={{ color: "var(--text-1)" }}
                >
                  Withdrawal History
                </h2>
                <div className="flex flex-col gap-2">
                  {withdrawals.map((w) => (
                    <div
                      key={w.id}
                      className="rounded-2xl p-4 flex items-center justify-between"
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div>
                        <p
                          className="text-[13px] font-semibold"
                          style={{ color: "var(--text-1)" }}
                        >
                          {formatCurrency(w.amount)}
                        </p>
                        <p
                          className="text-[11px] mt-0.5"
                          style={{ color: "var(--text-3)" }}
                        >
                          {formatRelativeTime(w.created_at)}
                        </p>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={
                          w.status === "completed"
                            ? {
                                background: "rgba(52,211,153,0.1)",
                                color: "#34d399",
                              }
                            : w.status === "processing"
                              ? {
                                  background: "rgba(251,191,36,0.1)",
                                  color: "#fbbf24",
                                }
                              : {
                                  background: "var(--bg-hover)",
                                  color: "var(--text-3)",
                                }
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
          availableAmount={availableToWithdraw}
          availablePayments={availablePayments}
          helperId={user.id}
          helperEmail={user.email}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={() => {
            setShowWithdrawModal(false);
            fetchData();
          }}
        />
      )}
    </DashboardLayout>
  );
}

// ── Withdraw Modal ─────────────────────────────────────────────────────────
function WithdrawModal({
  availableAmount,
  availablePayments,
  helperId,
  helperEmail,
  onClose,
  onSuccess,
}) {
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      toast.error("Please fill in all bank details.");
      return;
    }
    setSubmitting(true);
    try {
      // 1. Create withdrawal request
      const { data: withdrawal, error: wErr } = await supabase
        .from("withdrawals")
        .insert({
          helper_id: helperId,
          amount: availableAmount,
          status: "pending",
          payment_ids: availablePayments.map((p) => p.id),
          bank_details: {
            bank_name: bankName.trim(),
            account_number: accountNumber.trim(),
            account_name: accountName.trim(),
          },
        })
        .select("id")
        .single();

      if (wErr) throw wErr;

      // 2. Mark payments as processing
      if (availablePayments.some((p) => p.id && !p.id.startsWith("session_"))) {
        await supabase
          .from("payments")
          .update({ withdrawal_status: "processing" })
          .in(
            "id",
            availablePayments.map((p) => p.id),
          );
      }

      // 3. In-app notification — withdrawal received
      await supabase.from("notifications").insert({
        user_id: helperId,
        type: "withdrawal_pending",
        title: "Withdrawal request received 💸",
        body: `Your withdrawal of ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(availableAmount)} is being processed. We'll notify you once it's paid out (within 24 hours).`,
        ref_id: withdrawal.id,
      });

      // 4. Email notification via Supabase auth email (uses your SMTP settings)
      // This inserts a record that triggers the email DB function if configured,
      // otherwise the in-app notification above is the primary channel.
      await supabase
        .from("withdrawal_emails")
        .insert({
          helper_id: helperId,
          email: helperEmail,
          amount: availableAmount,
          withdrawal_id: withdrawal.id,
          type: "pending",
        })
        .then(() => {})
        .catch(() => {}); // silent fail if table doesn't exist

      toast.success(
        "Withdrawal request submitted! We'll process it within 24 hours.",
      );
      onSuccess();
    } catch (err) {
      toast.error("Failed to submit withdrawal. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-xl px-3.5 py-2.5 text-[13.5px] transition-all outline-none";

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="font-bold text-[15px]"
              style={{ color: "var(--text-1)" }}
            >
              Withdraw Earnings
            </h2>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--text-3)" }}
            >
              Amount: {formatCurrency(availableAmount)}
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
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-3)" }}
            >
              Bank Name
            </label>
            <input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. GTBank, Access Bank, Opay"
              className={inputCls}
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-1)",
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-3)" }}
            >
              Account Number
            </label>
            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="10-digit account number"
              maxLength={10}
              className={inputCls}
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-1)",
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-3)" }}
            >
              Account Name
            </label>
            <input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Name on the account"
              className={inputCls}
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-1)",
              }}
            />
          </div>

          <div
            className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-[12px]"
            style={{
              background: "rgba(251,191,36,0.06)",
              border: "1px solid rgba(251,191,36,0.15)",
              color: "#fbbf24",
            }}
          >
            <span className="shrink-0">⚠️</span>
            <span>
              Withdrawals are processed manually within 24 hours. Ensure your
              bank details are correct.
            </span>
          </div>

          <div className="flex gap-3 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-2)",
                background: "var(--bg-hover)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 text-white font-bold rounded-xl text-[13px] cursor-pointer disabled:opacity-50 active:scale-95"
              style={{
                background: "#0ba360",
                boxShadow: "0 4px 16px rgba(11,163,96,0.3)",
              }}
            >
              {submitting ? "Submitting…" : "Request Withdrawal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
