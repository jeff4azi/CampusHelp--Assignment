import Navbar from "../components/Navbar.jsx";

export default function AppLayout({ children }) {
  return (
    <div className="flex flex-col h-screen bg-[var(--color-surface-base)]">
      <Navbar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
