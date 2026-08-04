import { useState, useEffect } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 30 });
      if (search) params.set("search", search);
      const { data } = await api.get(`/admin/users?${params}`);
      setUsers(data.data);
      setTotal(data.total);
    } catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [search]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Users <span className="text-white/30 text-base font-normal">({total})</span></h1>
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
        className="w-full max-w-sm bg-[#1a1828] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-violet-500/50 transition-colors" />

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-[#1a1828] border border-white/8 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-white/3">
                  {["User","Phone","Bookings","Total Spent","Joined",""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-white/30 text-[10px] font-semibold tracking-wider uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <img src={u.avatar} className="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-300 text-xs font-semibold flex-shrink-0">
                            {u.name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-white text-xs font-medium">{u.name}</p>
                          <p className="text-white/40 text-[11px]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs">{u.phone || "—"}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{u.booking_count}</td>
                    <td className="px-4 py-3 text-violet-400 text-xs font-semibold">₹{Number(u.total_spent).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-white/40 text-xs">{new Date(u.created_at).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${u.is_active ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="text-center text-white/30 py-12 text-sm">No users found</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [total, setTotal] = useState(0);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 30 });
      if (statusFilter) params.set("status", statusFilter);
      const { data } = await api.get(`/admin/orders?${params}`);
      setOrders(data.data);
      setTotal(data.total);
    } catch { toast.error("Failed to load orders"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [statusFilter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Orders <span className="text-white/30 text-base font-normal">({total})</span></h1>
      </div>

      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
        className="bg-[#1a1828] border border-white/10 rounded-xl px-3 py-2.5 text-white/60 text-sm outline-none focus:border-violet-500/50">
        <option value="">All statuses</option>
        {["pending","confirmed","cancelled","refunded"].map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-[#1a1828] border border-white/8 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-white/3">
                  {["Order Ref","Customer","Event","Amount","Status","Date"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-white/30 text-[10px] font-semibold tracking-wider uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-violet-400 text-xs font-mono">{o.order_ref}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-xs">{o.user_name}</p>
                      <p className="text-white/40 text-[11px]">{o.user_email}</p>
                    </td>
                    <td className="px-4 py-3 text-white/60 text-xs max-w-[160px]">
                      <p className="truncate">{o.event_title}</p>
                    </td>
                    <td className="px-4 py-3 text-violet-400 text-xs font-semibold">₹{Number(o.total).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        o.status === "confirmed" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                        o.status === "pending" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                        "bg-red-500/10 border-red-500/20 text-red-400"
                      }`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs">{new Date(o.created_at).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && <p className="text-center text-white/30 py-12 text-sm">No orders found</p>}
          </div>
        </div>
      )}
    </div>
  );
}
