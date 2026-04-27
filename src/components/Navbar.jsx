import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="h-14 flex items-center justify-between px-6 border-b border-gray-700 bg-[var(--color-surface-base)] sticky top-0 z-10">
      <span className="text-indigo-400 font-bold text-lg">CampusHelp</span>
      <div className="flex items-center gap-2">
        {user && <span className="text-sm text-gray-400">{user.email}</span>}
        <button
          onClick={handleLogout}
          className="hover:bg-gray-800 text-gray-400 hover:text-gray-100 px-3 py-1.5 rounded-lg transition-colors text-sm cursor-pointer"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
