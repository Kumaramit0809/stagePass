import { useState, useEffect } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [venues, setVenues] = useState([]);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);

  function defaultForm() {
    return {
      title: "", description: "", artist: "", genre: "Live Music",
      venue_id: "", event_date: "", start_time: "", end_time: "", gates_open: "",
      banner_gradient: "from-violet-900 via-violet-700 to-violet-500",
      age_restriction: 0, is_featured: false, status: "draft",
      tags: "",
      tiers: [
        { name: "GA Floor", price: "", total_seats: "", color: "violet" },
        { name: "Premium Standing", price: "", total_seats: "", color: "teal" },
      ],
    };
  }

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const { data } = await api.get(`/admin/events?${params}`);
      setEvents(data.data);
    } catch { toast.error("Failed to load events"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, [search, statusFilter]);

  useEffect(() => {
    api.get("/admin/venues").then(({ data }) => setVenues(data.data)).catch(() => {});
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        tiers: editId ? undefined : form.tiers.map(t => ({ ...t, price: Number(t.price), total_seats: Number(t.total_seats) })),
      };
      if (editId) {
        await api.put(`/admin/events/${editId}`, payload);
        toast.success("Event updated");
      } else {
        await api.post("/admin/events", payload);
        toast.success("Event created");
      }
      setShowForm(false);
      setEditId(null);
      setForm(defaultForm());
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally { setSaving(false); }
  };

  const handleEdit = (ev) => {
    setEditId(ev.id);
    setForm({
      title: ev.title, description: ev.description || "", artist: ev.artist || "",
      genre: ev.genre, venue_id: ev.venue_id, event_date: ev.event_date?.split("T")[0] || ev.event_date,
      start_time: ev.start_time, end_time: ev.end_time || "", gates_open: ev.gates_open || "",
      banner_gradient: ev.banner_gradient, age_restriction: ev.age_restriction,
      is_featured: ev.is_featured, status: ev.status, tags: "", tiers: [],
    });
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!confirm("Cancel this event? All bookings will be notified.")) return;
    try {
      await api.delete(`/admin/events/${id}`);
      toast.success("Event cancelled");
      fetchEvents();
    } catch { toast.error("Failed to cancel event"); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Events</h1>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(defaultForm()); }}
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          {showForm ? "✕ Cancel" : "+ New Event"}
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-[#1a1828] border border-white/8 rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm">{editId ? "Edit Event" : "Create New Event"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdminField label="Title *" value={form.title} onChange={v => setForm({...form, title: v})} required />
            <AdminField label="Artist / Lineup" value={form.artist} onChange={v => setForm({...form, artist: v})} />
            <AdminField label="Description" value={form.description} onChange={v => setForm({...form, description: v})} textarea />
            <div className="space-y-4">
              <AdminSelect label="Genre" value={form.genre} onChange={v => setForm({...form, genre: v})}
                options={["Live Music","Electronic","Comedy","Theatre","Classical","Sports","Other"]} />
              <AdminSelect label="Venue *" value={form.venue_id} onChange={v => setForm({...form, venue_id: v})}
                options={venues.map(v => ({ value: v.id, label: `${v.name}, ${v.city}` }))} />
            </div>
            <AdminField label="Event Date *" type="date" value={form.event_date} onChange={v => setForm({...form, event_date: v})} required />
            <div className="grid grid-cols-2 gap-3">
              <AdminField label="Start Time *" type="time" value={form.start_time} onChange={v => setForm({...form, start_time: v})} required />
              <AdminField label="End Time" type="time" value={form.end_time} onChange={v => setForm({...form, end_time: v})} />
            </div>
            <AdminField label="Gates Open" type="time" value={form.gates_open} onChange={v => setForm({...form, gates_open: v})} />
            <AdminField label="Age Restriction (0 = all ages)" type="number" value={form.age_restriction} onChange={v => setForm({...form, age_restriction: v})} />
            <AdminField label="Banner Gradient (Tailwind classes)" value={form.banner_gradient} onChange={v => setForm({...form, banner_gradient: v})} />
            <AdminField label="Tags (comma separated)" value={form.tags} onChange={v => setForm({...form, tags: v})} placeholder="Indie, Rock, Festival" />
          </div>
          <div className="flex gap-4">
            <AdminSelect label="Status" value={form.status} onChange={v => setForm({...form, status: v})}
              options={["draft","published","cancelled"]} />
            <label className="flex items-center gap-2 mt-6 cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={e => setForm({...form, is_featured: e.target.checked})}
                className="w-4 h-4 rounded accent-violet-500" />
              <span className="text-white/60 text-sm">Featured</span>
            </label>
          </div>
          {!editId && (
            <div>
              <p className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">Ticket Tiers</p>
              {form.tiers.map((t, i) => (
                <div key={i} className="grid grid-cols-3 gap-3 mb-3 p-3 bg-white/3 rounded-xl">
                  <AdminField label="Tier Name" value={t.name} onChange={v => { const ts = [...form.tiers]; ts[i].name = v; setForm({...form, tiers: ts}); }} />
                  <AdminField label="Price (₹)" type="number" value={t.price} onChange={v => { const ts = [...form.tiers]; ts[i].price = v; setForm({...form, tiers: ts}); }} />
                  <AdminField label="Total Seats" type="number" value={t.total_seats} onChange={v => { const ts = [...form.tiers]; ts[i].total_seats = v; setForm({...form, tiers: ts}); }} />
                </div>
              ))}
              <button type="button" onClick={() => setForm({...form, tiers: [...form.tiers, { name: "", price: "", total_seats: "", color: "violet" }]})}
                className="text-violet-400 text-xs hover:text-violet-300 transition-colors">+ Add tier</button>
            </div>
          )}
          <button type="submit" disabled={saving}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors">
            {saving ? "Saving..." : editId ? "Update Event" : "Create Event"}
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events..."
          className="flex-1 bg-[#1a1828] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-violet-500/50 transition-colors" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#1a1828] border border-white/10 rounded-xl px-3 py-2.5 text-white/60 text-sm outline-none focus:border-violet-500/50">
          <option value="">All statuses</option>
          {["draft","published","cancelled","completed"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-[#1a1828] border border-white/8 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-white/3">
                  {["Event","Date","Venue","Tix Sold","Revenue","Status",""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-white/30 text-[10px] font-semibold tracking-wider uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {events.map(ev => (
                  <tr key={ev.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white text-xs font-medium line-clamp-1 max-w-[200px]">{ev.title}</p>
                      <p className="text-white/40 text-[11px]">{ev.genre}</p>
                    </td>
                    <td className="px-4 py-3 text-white/60 text-xs whitespace-nowrap">{new Date(ev.event_date).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{ev.venue_name}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{ev.booking_count || 0}</td>
                    <td className="px-4 py-3 text-violet-400 text-xs font-semibold">₹{Number(ev.revenue || 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        ev.status === "published" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                        ev.status === "draft" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                        "bg-red-500/10 border-red-500/20 text-red-400"
                      }`}>{ev.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(ev)} className="text-violet-400 hover:text-violet-300 text-xs transition-colors">Edit</button>
                        <button onClick={() => handleDelete(ev.id)} className="text-red-400/60 hover:text-red-400 text-xs transition-colors">Cancel</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {events.length === 0 && <p className="text-center text-white/30 py-12 text-sm">No events found</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminField({ label, value, onChange, type = "text", required, textarea, placeholder }) {
  const cls = "w-full bg-[#0f0e1a] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs placeholder-white/20 outline-none focus:border-violet-500/50 transition-colors";
  return (
    <div>
      <label className="block text-white/40 text-[11px] mb-1.5">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} className={cls + " h-24 resize-none"} placeholder={placeholder} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} className={cls} required={required} placeholder={placeholder} />
      )}
    </div>
  );
}

function AdminSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-white/40 text-[11px] mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0f0e1a] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-violet-500/50 transition-colors">
        <option value="">Select...</option>
        {options.map(o => typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </div>
  );
}
