export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-[var(--color-surface-base)]">
      {children}
    </div>
  );
}
