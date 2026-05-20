import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../hooks/useAuth.js";
import toast from "react-hot-toast";

const DISPUTE_REASONS = [
  { value: "Work not delivered", icon: "📭" },
  { value: "Work quality is unacceptable", icon: "❌" },
  { value: "Helper is unresponsive", icon: "🔇" },
  { value: "Wrong work submitted", icon: "📄" },
  { value: "Deadline missed", icon: "⏰" },
  { value: "Other", icon: "💬" },
];

const MAX_FILES = 5;
const MAX_FILE_MB = 10;

function FileIcon({ type }) {
  if (type?.startsWith("image/")) return <span>🖼️</span>;
  if (type?.includes("pdf")) return <span>📄</span>;
  if (type?.includes("word") || type?.includes("document"))
    return <span>📝</span>;
  return <span>📎</span>;
}

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DisputeModal({ session, onClose, onSubmitted }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]); // { file, preview, uploading, url, error }
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1 = reason+desc, 2 = evidence, 3 = confirm

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ── File handling ─────────────────────────────────────────────────────
  function handleFileSelect(e) {
    const selected = Array.from(e.target.files || []);
    const remaining = MAX_FILES - files.length;
    const toAdd = selected.slice(0, remaining);

    const newFiles = toAdd.map((file) => {
      const isImage = file.type.startsWith("image/");
      return {
        id: crypto.randomUUID(),
        file,
        preview: isImage ? URL.createObjectURL(file) : null,
        uploading: false,
        url: null,
        error: null,
      };
    });

    // Validate sizes
    const oversized = toAdd.filter((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error(`Files must be under ${MAX_FILE_MB}MB each.`);
      return;
    }

    setFiles((prev) => [...prev, ...newFiles]);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(id) {
    setFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((x) => x.id !== id);
    });
  }

  // Upload a single file to Supabase Storage
  async function uploadFile(fileEntry) {
    const ext = fileEntry.file.name.split(".").pop();
    const path = `disputes/${session.id}/${user.id}/${fileEntry.id}.${ext}`;

    const { data, error } = await supabase.storage
      .from("dispute-evidence")
      .upload(path, fileEntry.file, { upsert: false });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("dispute-evidence")
      .getPublicUrl(path);

    return urlData.publicUrl;
  }

  // ── Submit ────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!reason) {
      toast.error("Please select a reason.");
      return;
    }
    if (description.trim().length < 20) {
      toast.error("Please describe the issue in at least 20 characters.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Upload files (if any)
      const uploadedUrls = [];
      const uploadedMeta = [];

      if (files.length > 0) {
        setFiles((prev) => prev.map((f) => ({ ...f, uploading: true })));

        for (const fileEntry of files) {
          try {
            const url = await uploadFile(fileEntry);
            uploadedUrls.push(url);
            uploadedMeta.push({
              id: fileEntry.id,
              url,
              name: fileEntry.file.name,
              size: fileEntry.file.size,
              type: fileEntry.file.type,
            });
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileEntry.id ? { ...f, uploading: false, url } : f,
              ),
            );
          } catch (uploadErr) {
            console.warn("File upload failed:", uploadErr);
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileEntry.id
                  ? { ...f, uploading: false, error: "Upload failed" }
                  : f,
              ),
            );
            // Continue — don't block dispute submission over a failed upload
          }
        }
      }

      // 2. Create dispute record
      const { data: dispute, error: disputeErr } = await supabase
        .from("disputes")
        .insert({
          session_id: session.id,
          raised_by: user.id,
          reason,
          description: description.trim(),
          evidence_urls: uploadedUrls,
        })
        .select("id")
        .single();

      if (disputeErr) throw disputeErr;

      // 3. Insert evidence metadata rows
      if (uploadedMeta.length > 0) {
        const evidenceRows = uploadedMeta.map((m) => ({
          dispute_id: dispute.id,
          uploaded_by: user.id,
          file_url: m.url,
          file_name: m.name,
          file_size: m.size,
          file_type: m.type.startsWith("image/") ? "image" : "document",
        }));

        await supabase.from("dispute_evidence").insert(evidenceRows);
      }

      toast.success("Dispute submitted. Funds are now frozen pending review.");
      onSubmitted?.(dispute.id);
      onClose();
    } catch (err) {
      toast.error("Failed to submit dispute. Please try again.");
      console.error(err);
      setSubmitting(false);
    }
  }

  const canProceedStep1 = reason && description.trim().length >= 20;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md px-4 pb-4 sm:pb-0"
      onMouseDown={(e) =>
        e.target === e.currentTarget && !submitting && onClose()
      }
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden fade-in flex flex-col"
        style={{
          background: "var(--bg-raised)",
          border: "1px solid rgba(239,68,68,0.25)",
          boxShadow: "var(--shadow-card)",
          maxHeight: "92vh",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-lg">⚠️</span>
            <div>
              <h2
                className="font-bold text-[14px]"
                style={{ color: "var(--text-1)" }}
              >
                Raise a Dispute
              </h2>
              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                Step {step} of 3
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-40"
            style={{ color: "var(--text-3)", background: "var(--bg-hover)" }}
          >
            ✕
          </button>
        </div>

        {/* ── Step indicator ───────────────────────────────────────── */}
        <div className="flex px-5 pt-4 gap-1.5 shrink-0">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{
                background: s <= step ? "rgba(239,68,68,0.7)" : "var(--border)",
              }}
            />
          ))}
        </div>

        {/* ── Scrollable body ──────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          {/* ── STEP 1: Reason + Description ──────────────────────── */}
          {step === 1 && (
            <>
              {/* Freeze warning */}
              <div
                className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[12px]"
                style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  color: "#fca5a5",
                }}
              >
                <span className="shrink-0 mt-0.5">🔒</span>
                <span>
                  Raising a dispute immediately freezes the escrow. Neither
                  party can withdraw funds until our team resolves this (within
                  48h).
                </span>
              </div>

              {/* Reason */}
              <div className="flex flex-col gap-2">
                <label
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-3)" }}
                >
                  What went wrong?
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {DISPUTE_REASONS.map(({ value, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setReason(value)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] text-left cursor-pointer transition-all"
                      style={
                        reason === value
                          ? {
                              background: "rgba(239,68,68,0.1)",
                              border: "1px solid rgba(239,68,68,0.35)",
                              color: "#fca5a5",
                            }
                          : {
                              background: "var(--bg-input)",
                              border: "1px solid var(--border)",
                              color: "var(--text-2)",
                            }
                      }
                    >
                      <span className="shrink-0">{icon}</span>
                      <span className="leading-tight">{value}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-3)" }}
                >
                  Describe the issue
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Explain what happened in detail. Include dates, what was agreed, and what went wrong. The more detail you provide, the faster we can resolve this."
                  className="w-full rounded-xl px-3.5 py-2.5 text-[13px] resize-none outline-none transition-all"
                  style={{
                    background: "var(--bg-input)",
                    border: "1px solid var(--border)",
                    color: "var(--text-1)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(239,68,68,0.4)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <div className="flex items-center justify-between">
                  <p
                    className="text-[11px]"
                    style={{
                      color:
                        description.trim().length >= 20
                          ? "#34d399"
                          : "var(--text-3)",
                    }}
                  >
                    {description.trim().length >= 20
                      ? "✓ Good"
                      : `${description.trim().length}/20 minimum`}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                    {description.trim().length} chars
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 2: Evidence uploads ───────────────────────────── */}
          {step === 2 && (
            <>
              <div>
                <p
                  className="text-[13px] font-semibold mb-1"
                  style={{ color: "var(--text-1)" }}
                >
                  Upload Evidence
                </p>
                <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
                  Screenshots, documents, or any proof that supports your case.
                  Up to {MAX_FILES} files, {MAX_FILE_MB}MB each. This step is
                  optional.
                </p>
              </div>

              {/* Drop zone */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= MAX_FILES}
                className="w-full rounded-2xl py-8 flex flex-col items-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "var(--bg-input)",
                  border: "2px dashed var(--border)",
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)";
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = "var(--border)";
                  const dt = e.dataTransfer;
                  if (dt.files.length > 0) {
                    handleFileSelect({ target: { files: dt.files } });
                  }
                }}
              >
                <span className="text-3xl">📎</span>
                <p
                  className="text-[13px] font-semibold"
                  style={{ color: "var(--text-2)" }}
                >
                  {files.length >= MAX_FILES
                    ? "Maximum files reached"
                    : "Click or drag files here"}
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                  Images, PDFs, Word docs — max {MAX_FILE_MB}MB each
                </p>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* File list */}
              {files.length > 0 && (
                <div className="flex flex-col gap-2">
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 rounded-xl p-3"
                      style={{
                        background: f.error
                          ? "rgba(239,68,68,0.06)"
                          : f.url
                            ? "rgba(52,211,153,0.06)"
                            : "var(--bg-input)",
                        border: `1px solid ${f.error ? "rgba(239,68,68,0.2)" : f.url ? "rgba(52,211,153,0.2)" : "var(--border)"}`,
                      }}
                    >
                      {/* Preview or icon */}
                      {f.preview ? (
                        <img
                          src={f.preview}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                          style={{ background: "var(--bg-hover)" }}
                        >
                          <FileIcon type={f.file.type} />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[12px] font-medium truncate"
                          style={{ color: "var(--text-1)" }}
                        >
                          {f.file.name}
                        </p>
                        <p
                          className="text-[10px]"
                          style={{ color: "var(--text-3)" }}
                        >
                          {formatBytes(f.file.size)}
                          {f.uploading && " · Uploading…"}
                          {f.url && " · ✓ Uploaded"}
                          {f.error && ` · ⚠ ${f.error}`}
                        </p>
                      </div>

                      {!f.uploading && (
                        <button
                          type="button"
                          onClick={() => removeFile(f.id)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer shrink-0 text-[11px]"
                          style={{
                            color: "var(--text-3)",
                            background: "var(--bg-hover)",
                          }}
                        >
                          ✕
                        </button>
                      )}
                      {f.uploading && (
                        <span
                          className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin shrink-0"
                          style={{
                            borderColor: "rgba(239,68,68,0.4)",
                            borderTopColor: "transparent",
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <p
                className="text-[11px] text-center"
                style={{ color: "var(--text-3)" }}
              >
                {files.length}/{MAX_FILES} files · Evidence is optional but
                helps resolve disputes faster
              </p>
            </>
          )}

          {/* ── STEP 3: Confirm ───────────────────────────────────── */}
          {step === 3 && (
            <>
              <div
                className="rounded-2xl p-4 flex flex-col gap-3"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-3)" }}
                >
                  Review your dispute
                </p>

                <div className="flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <span
                      className="text-[11px] font-semibold w-20 shrink-0"
                      style={{ color: "var(--text-3)" }}
                    >
                      Reason
                    </span>
                    <span
                      className="text-[12px]"
                      style={{ color: "var(--text-1)" }}
                    >
                      {reason}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span
                      className="text-[11px] font-semibold w-20 shrink-0"
                      style={{ color: "var(--text-3)" }}
                    >
                      Details
                    </span>
                    <span
                      className="text-[12px] leading-relaxed"
                      style={{ color: "var(--text-2)" }}
                    >
                      {description.trim().slice(0, 120)}
                      {description.trim().length > 120 ? "…" : ""}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span
                      className="text-[11px] font-semibold w-20 shrink-0"
                      style={{ color: "var(--text-3)" }}
                    >
                      Evidence
                    </span>
                    <span
                      className="text-[12px]"
                      style={{ color: "var(--text-2)" }}
                    >
                      {files.length > 0
                        ? `${files.length} file${files.length > 1 ? "s" : ""} attached`
                        : "None"}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl px-4 py-3 text-[12px] flex flex-col gap-1.5"
                style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  color: "#fca5a5",
                }}
              >
                <p className="font-semibold">What happens next:</p>
                <p>🔒 Escrow is frozen immediately — no one can withdraw</p>
                <p>👀 Our team reviews within 48 hours</p>
                <p>📬 Both parties are notified of the outcome</p>
                <p>⚖️ Resolution is final and binding</p>
              </div>
            </>
          )}
        </div>

        {/* ── Footer buttons ───────────────────────────────────────── */}
        <div
          className="flex gap-3 px-5 py-4 shrink-0"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer disabled:opacity-40"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-2)",
                background: "var(--bg-hover)",
              }}
            >
              ← Back
            </button>
          )}

          {step === 1 && (
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
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && !canProceedStep1}
              className="flex-1 py-2.5 text-white font-bold rounded-xl text-[13px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
              style={{
                background: "#dc2626",
                boxShadow: "0 4px 16px rgba(220,38,38,0.25)",
              }}
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2.5 text-white font-bold rounded-xl text-[13px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center gap-2"
              style={{
                background: "#dc2626",
                boxShadow: "0 4px 16px rgba(220,38,38,0.25)",
              }}
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Dispute"
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
