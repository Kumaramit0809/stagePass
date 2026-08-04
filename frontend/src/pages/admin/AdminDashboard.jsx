import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /></div>;

  const s = stats?.stats || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-white/40 text-sm">Overview of StagePass activity</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `₹${Number(s.revenue||0).toLocaleString("en-IN")}`, icon: "💰", color: "violet" },
          { label: "Total Bookings", value: Number(s.bookings||0).toLocaleString("en-IN"), icon: "🎫", color: "teal" },
          { label: "Registered Users", value: Number(s.users||0).toLocaleString("en-IN"), icon: "👥", color: "blue" },
          { label: "Live Events", value: Number(s.events||0).toLocaleString("en-IN"), icon: "🎵", color: "amber" },
        ].map(c => (
          <div key={c.label} className="bg-[#1a1828] border border-white/8 rounded-2xl p-4">
            <div className="text-2xl mb-2">{c.icon}</div>
            <p className="text-white/40 text-xs mb-1">{c.label}</p>
            <p className="text-white text-xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-[#1a1828] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm">Recent Bookings</h2>
            <Link to="/admin/orders" className="text-violet-400 text-xs hover:text-violet-300">View all →</Link>
          </div>
          <div className="divide-y divide-white/5">
            {stats?.recentOrders?.length === 0 && (
              <p className="text-white/30 text-sm text-center py-8">No bookings yet</p>
            )}
            {stats?.recentOrders?.map(o => (
              <div key={o.order_ref} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-white text-xs font-medium truncate">{o.user_name}</p>
                  <p className="text-white/40 text-[11px] truncate">{o.event_title}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-violet-400 text-xs font-semibold">₹{Number(o.total).toLocaleString("en-IN")}</p>
                  <p className="text-white/30 text-[11px]">{new Date(o.created_at).toLocaleDateString("en-IN")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Events */}
        <div className="bg-[#1a1828] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm">Top Events by Revenue</h2>
            <Link to="/admin/events" className="text-violet-400 text-xs hover:text-violet-300">View all →</Link>
          </div>
          <div className="divide-y divide-white/5">
            {stats?.topEvents?.length === 0 && (
              <p className="text-white/30 text-sm text-center py-8">No data yet</p>
            )}
            {stats?.topEvents?.map((e, i) => (
              <div key={e.title} className="px-5 py-3 flex items-center gap-3">
                <span className="text-white/20 text-xs w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{e.title}</p>
                  <p className="text-white/40 text-[11px]">{e.tickets || 0} tickets sold</p>
                </div>
                <p className="text-violet-400 text-xs font-semibold flex-shrink-0">₹{Number(e.revenue || 0).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Revenue */}
      {stats?.monthlyRevenue?.length > 0 && (
        <div className="bg-[#1a1828] border border-white/8 rounded-2xl p-5">
          <h2 className="text-white font-semibold text-sm mb-4">Monthly Revenue</h2>
          <div className="flex items-end gap-3 h-32">
            {stats.monthlyRevenue.map(m => {
              const maxRev = Math.max(...stats.monthlyRevenue.map(x => x.revenue));
              const h = maxRev > 0 ? Math.round((m.revenue / maxRev) * 100) : 0;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-white/40 text-[10px]">₹{(m.revenue / 1000).toFixed(0)}k</span>
                  <div className="w-full bg-violet-500/80 rounded-t-md transition-all" style={{ height: `${h}%`, minHeight: 4 }} />
                  <span className="text-white/30 text-[10px] text-center">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
