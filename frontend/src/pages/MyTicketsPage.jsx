import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function MyTicketsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/orders/my-bookings")
      .then(({ data }) => setOrders(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#0f0e1a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0e1a]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">My Tickets</h1>
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎫</div>
            <p className="text-white/40 mb-4">No bookings yet</p>
            <Link to="/" className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-6 py-2.5 text-sm font-semibold transition-colors">
              Discover events
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-[#1a1828] border border-white/8 rounded-2xl overflow-hidden">
                <div className={`bg-gradient-to-r ${order.banner_gradient || "from-violet-900 to-violet-600"} px-5 py-4 flex items-center justify-between`}>
                  <div>
                    <p className="text-white font-semibold">{order.title}</p>
                    <p className="text-white/60 text-xs mt-0.5">
                      {new Date(order.event_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · {order.start_time?.slice(0,5)}
                    </p>
                  </div>
                  <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full">Confirmed</span>
                </div>
                <div className="px-5 py-4">
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Venue</p>
                      <p className="text-white text-xs">{order.venue_name}, {order.city}</p>
                    </div>
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Seats</p>
                      <p className="text-white text-xs">{order.items?.map(i => i.seat_code).join(", ")}</p>
                    </div>
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Total Paid</p>
                      <p className="text-violet-400 text-xs font-semibold">₹{Number(order.total).toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <p className="text-white/30 text-xs">Ref: {order.order_ref}</p>
                    <Link to={`/booking-confirmed/${order.order_ref}`} className="text-violet-400 text-xs hover:text-violet-300 transition-colors font-medium">
                      View ticket →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
