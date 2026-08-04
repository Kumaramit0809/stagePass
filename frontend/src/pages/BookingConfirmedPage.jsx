import { useEffect, useState } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function BookingConfirmedPage() {
  const { ref } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(state?.order || null);
  const [loading, setLoading] = useState(!state?.order);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!order) {
      api.get(`/orders/${ref}`)
        .then(({ data }) => setOrder(data.data))
        .catch(() => navigate("/"))
        .finally(() => setLoading(false));
    }
    setTimeout(() => setAnimate(true), 100);
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#0f0e1a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );
  if (!order) return null;

  const seats = order.items?.map(i => i.seat_code).join(", ") || "";
  const tierName = order.items?.[0]?.tier_name || "";

  return (
    <div className="min-h-screen bg-[#0f0e1a] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Check */}
        <div className={`text-center transition-all duration-700 ${animate ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: "2s" }} />
            <div className="relative w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
                <path d="M2 12L10 20L30 2" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        <div className={`text-center transition-all duration-700 delay-200 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <h1 className="text-3xl font-bold text-white mb-2">You're going! 🎶</h1>
          <p className="text-white/40 text-sm mb-8">Booking confirmed. Tickets sent to {order.contact_email}.</p>
        </div>

        {/* Ticket */}
        <div className={`transition-all duration-700 delay-300 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="bg-[#1a1828] border border-white/10 rounded-3xl overflow-hidden mb-6">
            <div className={`bg-gradient-to-r from-violet-900 to-violet-700 p-5 relative`}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 11px)" }} />
              <p className="text-violet-300 text-xs font-medium tracking-wider uppercase mb-1.5">Your Ticket</p>
              <p className="text-white text-lg font-bold leading-tight">{order.event_title || order.title}</p>
            </div>

            {/* Perforation */}
            <div className="flex items-center px-4">
              <div className="w-5 h-5 rounded-full bg-[#0f0e1a] -ml-7 flex-shrink-0" />
              <div className="flex-1 border-t border-dashed border-white/10 mx-2" />
              <div className="w-5 h-5 rounded-full bg-[#0f0e1a] -mr-7 flex-shrink-0" />
            </div>

            <div className="p-5 grid grid-cols-2 gap-4">
              {[
                { label: "Date", val: new Date(order.event_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) },
                { label: "Time", val: order.start_time?.slice(0, 5) || "" },
                { label: "Venue", val: `${order.venue_name}, ${order.city}` },
                { label: "Seats", val: seats },
                { label: "Tier", val: tierName },
                { label: "Booking ID", val: order.order_ref },
              ].map(d => (
                <div key={d.label}>
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">{d.label}</p>
                  <p className="text-white text-xs font-medium break-words">{d.val}</p>
                </div>
              ))}
            </div>

            {/* QR */}
            <div className="px-5 pb-5 flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center flex-shrink-0 p-2">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <rect x="4" y="4" width="24" height="24" rx="2" fill="#0f0e1a" /><rect x="8" y="8" width="16" height="16" rx="1" fill="white" /><rect x="10" y="10" width="12" height="12" rx="1" fill="#0f0e1a" />
                  <rect x="36" y="4" width="24" height="24" rx="2" fill="#0f0e1a" /><rect x="40" y="8" width="16" height="16" rx="1" fill="white" /><rect x="42" y="10" width="12" height="12" rx="1" fill="#0f0e1a" />
                  <rect x="4" y="36" width="24" height="24" rx="2" fill="#0f0e1a" /><rect x="8" y="40" width="16" height="16" rx="1" fill="white" /><rect x="10" y="42" width="12" height="12" rx="1" fill="#0f0e1a" />
                  <rect x="36" y="36" width="6" height="6" fill="#0f0e1a" /><rect x="46" y="36" width="6" height="6" fill="#0f0e1a" /><rect x="56" y="36" width="4" height="16" fill="#0f0e1a" /><rect x="36" y="46" width="6" height="14" fill="#0f0e1a" /><rect x="46" y="46" width="14" height="6" fill="#0f0e1a" />
                </svg>
              </div>
              <div>
                <p className="text-white/60 text-xs">Scan at entry gate</p>
                <p className="text-white/30 text-[10px] mt-1">Also sent to your email</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={`transition-all duration-700 delay-500 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} space-y-3`}>
          <div className="flex gap-3">
            <button className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 rounded-xl py-3 text-sm font-medium transition-colors">↓ Download</button>
            <button className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 rounded-xl py-3 text-sm font-medium transition-colors">📅 Calendar</button>
          </div>
          <Link to="/my-tickets" className="block w-full text-center bg-violet-600 hover:bg-violet-500 text-white rounded-xl py-3 text-sm font-semibold transition-all">
            View all my tickets
          </Link>
          <Link to="/" className="block w-full text-center text-white/40 hover:text-white/60 text-sm py-2 transition-colors">
            Discover more events →
          </Link>

          <div className="bg-amber-400/8 border border-amber-400/15 rounded-xl p-3 mt-2">
            <p className="text-amber-300 text-xs font-medium mb-1">✦ You might also enjoy</p>
            <p className="text-amber-200/50 text-xs">Check out more upcoming events in Bengaluru this month.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
