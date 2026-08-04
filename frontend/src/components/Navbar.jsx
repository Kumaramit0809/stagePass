import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => { logout(); navigate("/"); };

  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="sticky top-0 z-50 bg-[#0f0e1a]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L9 5.5H13.5L9.75 8.5L11.25 13L7 10.5L2.75 13L4.25 8.5L0.5 5.5H5L7 1Z" fill="white"/>
            </svg>
          </div>
          <span className="text-white font-semibold text-base tracking-tight">
            stage<span className="text-violet-400">pass</span>
          </span>
        </Link>

        <div className="hidden sm:flex items-center gap-6 text-sm">
          <Link to="/" className={`transition-colors ${pathname === "/" ? "text-violet-400 font-medium" : "text-white/50 hover:text-white"}`}>Discover</Link>
          {user && <Link to="/my-tickets" className={`transition-colors ${pathname === "/my-tickets" ? "text-violet-400 font-medium" : "text-white/50 hover:text-white"}`}>My Tickets</Link>}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {user.role === "admin" && (
                <Link to="/admin" className="text-amber-400 text-xs font-medium bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1 hover:bg-amber-400/20 transition-colors">
                  Admin
                </Link>
              )}
              <div className="relative group">
                <button className="flex items-center gap-2">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-violet-500/20 ring-1 ring-violet-500/40 flex items-center justify-center text-violet-300 text-xs font-semibold">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-white/70 text-sm hidden sm:block">{user.name?.split(" ")[0]}</span>
                </button>
                <div className="absolute right-0 top-10 bg-[#1a1828] border border-white/10 rounded-xl shadow-xl w-44 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <Link to="/profile" className="block px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5">Profile</Link>
                  <Link to="/my-tickets" className="block px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5">My Tickets</Link>
                  <hr className="border-white/10 my-1" />
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/5">Sign out</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="text-white/70 text-sm hover:text-white transition-colors px-3 py-1.5">Sign in</Link>
              <Link to="/register" className="bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg px-4 py-1.5 transition-colors font-medium">
                Get started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
