import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const { data } = await api.get(`/events/${id}`);
        setEvent(data.data);
      } catch {
        toast.error("Event not found");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0e1a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!event) return null;

  const soldPct = event.tiers?.length
    ? Math.round((1 - event.tiers.reduce((s, t) => s + t.available_seats, 0) / Math.max(event.tiers.reduce((s, t) => s + t.total_seats, 0), 1)) * 100)
    : 0;

  const handleBook = () => {
    if (!user) { toast.error("Please sign in to book tickets"); navigate("/login"); return; }
    navigate(`/events/${id}/seats`);
  };

  return (
    <div className="min-h-screen bg-[#0f0e1a]">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2 text-xs text-white/30">
          <Link to="/" className="hover:text-violet-400 transition-colors">Discover</Link>
          <span>›</span><span>{event.genre}</span><span>›</span>
          <span className="text-white/60 truncate max-w-xs">{event.title}</span>
        </div>
      </div>

      {/* Hero */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${event.banner_gradient || "from-violet-900 to-violet-600"}`} style={{ minHeight: 220 }}>
        <div className="absolute inset-0 bg-[#0f0e1a]/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-white/50 text-xs font-medium tracking-widest uppercase mb-2">{event.genre} · Live Event</p>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight leading-tight">{event.title}</h1>
              <p className="text-white/60 text-sm mb-4 line-clamp-2">{event.artist}</p>
              <div className="flex flex-wrap gap-2">
                {[
                  new Date(event.event_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
                  `${event.venue_name}, ${event.city}`,
                  `${event.start_time?.slice(0, 5)} – ${event.end_time?.slice(0, 5) || "Late"}`,
                ].map(b => (
                  <span key={b} className="bg-white/10 border border-white/15 rounded-lg px-3 py-1 text-white/80 text-xs">{b}</span>
                ))}
                {event.is_featured ? <span className="bg-amber-400/20 border border-amber-400/30 rounded-lg px-3 py-1 text-amber-300 text-xs">✦ Featured</span> : null}
              </div>
            </div>
            <button className="bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl px-4 py-2 text-white/70 text-xs transition-colors flex-shrink-0">♡ Save</button>
          </div>
        </div>
      </div>

      {/* AI Bar */}
      <div className="bg-amber-400/8 border-b border-amber-400/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <span className="text-amber-400 text-sm flex-shrink-0">✦</span>
          <p className="text-amber-200/70 text-xs leading-relaxed">
            <span className="text-amber-300 font-medium">AI note: </span>
            {soldPct > 50
              ? `${soldPct}% of seats sold — book soon to get your preferred tier.`
              : "Tickets are available across all tiers. Premium Standing offers the best stage views for this venue."}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {/* Meta Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: "📅", key: "DATE", val: new Date(event.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), sub: event.gates_open ? `Gates: ${event.gates_open.slice(0,5)}` : "" },
                { icon: "📍", key: "VENUE", val: event.venue_name, sub: event.city },
                { icon: "🎟", key: "AVAILABILITY", val: `${soldPct}% sold`, valColor: soldPct > 60 ? "text-red-400" : "text-emerald-400", sub: `${event.tiers?.reduce((s, t) => s + t.available_seats, 0)?.toLocaleString("en-IN")} seats left` },
                { icon: "🔞", key: "AGE POLICY", val: event.age_restriction > 0 ? `${event.age_restriction}+ only` : "All ages", sub: "No re-entry" },
              ].map(m => (
                <div key={m.key} className="bg-[#1a1828] rounded-xl border border-white/8 p-3">
                  <div className="text-base mb-2">{m.icon}</div>
                  <p className="text-white/30 text-[10px] font-medium tracking-wider uppercase mb-1">{m.key}</p>
                  <p className={`text-sm font-semibold ${m.valColor || "text-white"}`}>{m.val}</p>
                  {m.sub && <p className="text-white/40 text-[11px] mt-0.5">{m.sub}</p>}
                </div>
              ))}
            </div>

            {/* About */}
            {event.description && (
              <div>
                <h3 className="text-white/40 text-[10px] font-medium tracking-widest uppercase mb-3">ABOUT</h3>
                <p className="text-white/60 text-sm leading-relaxed">{event.description}</p>
              </div>
            )}

            {/* Tags */}
            {event.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {event.tags.map(t => (
                  <span key={t} className="bg-[#1a1828] border border-white/8 rounded-lg px-3 py-1.5 text-xs text-white/50">{t}</span>
                ))}
              </div>
            )}

            {/* Venue Info */}
            <div>
              <h3 className="text-white/40 text-[10px] font-medium tracking-widest uppercase mb-3">VENUE</h3>
              <div className="bg-[#1a1828] border border-white/8 rounded-2xl overflow-hidden">
                <div className="h-28 relative bg-slate-800/50">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)", backgroundSize: "20px 20px" }} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center"><div className="w-2.5 h-2.5 rounded-full bg-white" /></div>
                    <div className="w-0.5 h-3 bg-violet-500" />
                  </div>
                  <div className="absolute bottom-2 left-3 bg-[#1a1828] rounded-md px-2 py-1">
                    <p className="text-white/60 text-[10px]">{event.venue_name}</p>
                  </div>
                </div>
                <div className="p-4 space-y-1.5">
                  <p className="text-white/60 text-xs">📍 {event.address}, {event.city}</p>
                  {event.pincode && <p className="text-white/40 text-xs">Pincode: {event.pincode}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sticky */}
          <div>
            <div className="sticky top-20 space-y-4">
              {soldPct > 60 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
                  <span className="text-red-400 text-sm">⚡</span>
                  <p className="text-red-300 text-xs font-medium">{soldPct}% sold — limited seats remaining</p>
                </div>
              )}

              <div className="bg-[#1a1828] border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <p className="text-white/40 text-[10px] font-medium tracking-wider uppercase mb-3">TICKET TIERS</p>
                  <div className="space-y-1">
                    {event.tiers?.map(t => {
                      const tierPct = Math.round((1 - t.available_seats / t.total_seats) * 100);
                      return (
                        <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
                          <div className={`w-2 h-2 rounded-sm flex-shrink-0 bg-${t.color || "violet"}-500`} />
                          <span className="flex-1 text-white text-xs">{t.name}</span>
                          <span className={`text-[10px] mr-2 ${tierPct > 80 ? "text-red-400" : tierPct > 50 ? "text-amber-400" : "text-emerald-400"}`}>
                            {t.available_seats === 0 ? "Sold out" : tierPct > 80 ? "Almost full" : "Available"}
                          </span>
                          <span className="text-violet-400 text-xs font-semibold">₹{Number(t.price).toLocaleString("en-IN")}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="px-4 pb-4 pt-2">
                  <button onClick={handleBook} className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-xl py-3.5 text-sm font-semibold transition-all hover:shadow-lg hover:shadow-violet-900/50 active:scale-[0.98]">
                    Select seats & time →
                  </button>
                  <p className="text-center text-white/30 text-xs mt-2">Free cancellation up to 24 hrs before</p>
                </div>
              </div>

              {/* Venue Map placeholder */}
              <div className="bg-[#1a1828] border border-white/8 rounded-2xl p-4 space-y-1">
                <p className="text-white/50 text-xs">📍 {event.address}, {event.city}</p>
                {event.state && <p className="text-white/30 text-xs">{event.state} {event.pincode}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
