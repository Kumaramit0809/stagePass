import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

const GENRES = ["All Events", "Live Music", "Electronic", "Comedy", "Theatre", "Classical"];

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("All Events");
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
    fetchFeatured();
  }, [genre]);

  const fetchFeatured = async () => {
    try {
      const { data } = await api.get("/events?featured=true&limit=4");
      setFeatured(data.data);
    } catch {}
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 12 });
      if (genre !== "All Events") params.set("genre", genre);
      const { data } = await api.get(`/events?${params}`);
      setEvents(data.data);
    } catch { toast.error("Failed to load events"); }
    finally { setLoading(false); }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.get(`/events?search=${search}`);
      setEvents(data.data);
    } catch {} finally { setLoading(false); }
  };

  const pct = (ev) => ev.total_seats > 0 ? Math.round((1 - ev.available_seats / ev.total_seats) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0f0e1a]">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-900/40 via-[#0f0e1a]/60 to-[#0f0e1a]" />
        <div className="absolute inset-0 opacity-20" style={{backgroundImage:"radial-gradient(ellipse at 30% 40%, #7c3aed 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #3b82f6 0%, transparent 50%)"}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 rounded-full px-3 py-1 text-amber-300 text-xs font-medium mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            AI-curated events just for you
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight leading-tight">
            What are you in<br /><span className="text-violet-400">the mood for?</span>
          </h1>
          <p className="text-white/50 text-base mb-8">Concerts, comedy, theatre & more — Bengaluru's best live events</p>
          <form onSubmit={handleSearch} className="flex gap-3 max-w-xl">
            <div className="flex-1 flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-violet-500/50 transition-all">
              <svg className="text-white/30 flex-shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search artists, events, venues..."
                className="bg-transparent flex-1 text-white placeholder-white/30 outline-none text-sm" />
            </div>
            <button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white px-5 rounded-xl text-sm font-medium transition-colors">Search</button>
          </form>
        </div>
      </div>

      {/* Genre Filters */}
      <div className="sticky top-14 z-40 bg-[#0f0e1a]/95 backdrop-blur border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-2 py-3 overflow-x-auto no-scrollbar">
            {GENRES.map(g => (
              <button key={g} onClick={() => setGenre(g)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  genre === g ? "bg-violet-600 text-white" : "bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10"
                }`}>{g}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Featured */}
        {featured.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-lg">Featured events</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {featured.map(ev => (
                <FeaturedCard key={ev.id} event={ev} pct={pct(ev)} onClick={() => navigate(`/events/${ev.id}`)} />
              ))}
            </div>
          </>
        )}

        {/* All Events */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">
            {genre === "All Events" ? "All upcoming events" : genre}
            <span className="text-white/30 text-sm font-normal ml-2">({events.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-[#1a1828] rounded-2xl border border-white/8 h-40 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <div className="text-5xl mb-4">🎵</div>
            <p>No events found. Try a different filter.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map(ev => <ListCard key={ev.id} event={ev} pct={pct(ev)} onClick={() => navigate(`/events/${ev.id}`)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function FeaturedCard({ event, pct, onClick }) {
  return (
    <div onClick={onClick} className={`group cursor-pointer rounded-2xl overflow-hidden border border-white/10 hover:border-violet-500/40 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-900/20`}>
      <div className={`h-28 bg-gradient-to-br ${event.banner_gradient || "from-violet-900 to-violet-600"} relative flex items-end p-3`}>
        {event.is_featured && <span className="absolute top-2.5 left-2.5 bg-amber-400/90 text-amber-900 text-[10px] font-semibold px-2 py-0.5 rounded-full">✦ Featured</span>}
        {pct > 60 && <span className="absolute top-2.5 right-2.5 bg-red-500/80 text-white text-[10px] px-2 py-0.5 rounded-full">{pct}% sold</span>}
      </div>
      <div className="bg-[#1a1828] p-3">
        <p className="text-white text-xs font-semibold leading-tight mb-1 line-clamp-2">{event.title}</p>
        <p className="text-white/40 text-[11px] mb-2">{new Date(event.event_date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})} · {event.venue_name}</p>
        <div className="flex justify-between items-center">
          <span className="text-violet-400 text-xs font-semibold">₹{Number(event.min_price).toLocaleString("en-IN")}+</span>
          <span className={`text-[10px] ${pct > 60 ? "text-red-400" : "text-emerald-400"}`}>{pct > 60 ? "Filling fast" : "Available"}</span>
        </div>
      </div>
    </div>
  );
}

function ListCard({ event, pct, onClick }) {
  return (
    <div onClick={onClick} className="group cursor-pointer flex rounded-2xl overflow-hidden border border-white/10 bg-[#1a1828] hover:border-violet-500/30 hover:bg-[#1e1c30] transition-all">
      <div className={`w-24 sm:w-28 flex-shrink-0 bg-gradient-to-br ${event.banner_gradient || "from-violet-900 to-violet-600"}`} />
      <div className="flex-1 p-4 min-w-0">
        <p className="text-white text-sm font-semibold mb-1 truncate">{event.title}</p>
        <p className="text-white/40 text-xs mb-2">
          {new Date(event.event_date).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})} · {event.start_time?.slice(0,5)} · {event.venue_name}, {event.city}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {event.tags?.slice(0,3).map(t => (
            <span key={t} className="bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-[10px] text-white/50">{t}</span>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-end justify-between p-4 flex-shrink-0">
        <div />
        <div className="text-right">
          <div className="text-violet-400 text-sm font-bold">₹{Number(event.min_price).toLocaleString("en-IN")}+</div>
          <div className="flex items-center gap-1 justify-end mt-1">
            <span className={`w-1.5 h-1.5 rounded-full ${pct > 60 ? "bg-red-400" : "bg-emerald-400"}`} />
            <span className="text-[10px] text-white/40">{pct > 60 ? `${pct}% sold` : "Available"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
