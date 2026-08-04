import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const NAV = [
  { path: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { path: "/admin/events", label: "Events", icon: "🎵" },
  { path: "/admin/orders", label: "Orders", icon: "🎫" },
  { path: "/admin/users", label: "Users", icon: "👥" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/"); };

  const isActive = (path, exact) => exact ? pathname === path : pathname.startsWith(path) && (exact || pathname !== "/admin" || path === "/admin");

  return (
    <div className="min-h-screen bg-[#0f0e1a] flex">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-[#13121f] border-r border-white/8 flex flex-col fixed left-0 top-0 bottom-0 z-50">
        <div className="p-5 border-b border-white/5">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L9 5.5H13.5L9.75 8.5L11.25 13L7 10.5L2.75 13L4.25 8.5L0.5 5.5H5L7 1Z" fill="white"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">stagepass</p>
              <p className="text-white/30 text-[10px] mt-0.5">Admin Panel</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => {
            const active = isActive(item.path, item.exact);
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active ? "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/20" : "text-white/50 hover:text-white hover:bg-white/5"
                }`}>
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-2 px-3 py-2 mb-2">
            {user?.avatar ? (
              <img src={user.avatar} className="w-7 h-7 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-300 text-xs font-semibold">
                {user?.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name}</p>
              <p className="text-white/30 text-[10px]">Administrator</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-red-400/70 hover:text-red-400 text-xs rounded-lg hover:bg-white/5 transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-56 p-6 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
