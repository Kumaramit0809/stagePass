import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

export default function SeatSelectionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [seatMap, setSeatMap] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [evRes, seatsRes] = await Promise.all([
          api.get(`/events/${id}`),
          api.get(`/events/${id}/seats`),
        ]);
        setEvent(evRes.data.data);
        setSeatMap(seatsRes.data.data);
      } catch {
        toast.error("Failed to load seat map");
        navigate(`/events/${id}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const toggleSeat = (seat, tierId, tierPrice, tierName) => {
    if (seat.status === "booked" || seat.status === "held") return;
    const exists = selected.find(s => s.id === seat.id);
    if (exists) {
      setSelected(selected.filter(s => s.id !== seat.id));
    } else {
      if (selected.length >= 6) { toast.error("Maximum 6 tickets per booking"); return; }
      setSelected([...selected, { id: seat.id, code: seat.code, row: seat.row, tierId, tierPrice, tierName }]);
    }
  };

  const handleProceed = async () => {
    if (selected.length === 0) { toast.error("Please select at least one seat"); return; }
    setHolding(true);
    try {
      await api.post(`/events/${id}/hold-seats`, { seat_ids: selected.map(s => s.id) });
      navigate(`/events/${id}/checkout`, { state: { event, selected } });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to hold seats");
    } finally {
      setHolding(false);
    }
  };

  const subtotal = selected.reduce((s, x) => s + Number(x.tierPrice), 0);
  const fee = selected.length > 0 ? Math.round(subtotal * 0.04) : 0;

  const SEAT_COLORS = {
    available: {
      violet: "bg-violet-500/25 border-violet-500/50 hover:bg-violet-500/50",
      teal: "bg-teal-500/25 border-teal-500/50 hover:bg-teal-500/50",
      amber: "bg-amber-500/25 border-amber-500/50 hover:bg-amber-500/50",
      rose: "bg-rose-500/25 border-rose-500/50 hover:bg-rose-500/50",
    },
    selected: "bg-violet-600 border-violet-400 scale-110",
    taken: "bg-white/5 border-white/10 cursor-not-allowed opacity-50",
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0f0e1a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0e1a]">
      {/* Top step bar */}
      <div className="bg-[#0f0e1a]/95 border-b border-white/5 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-white/50 text-sm truncate max-w-xs">{event?.title}</div>
          <StepIndicator current={2} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Seat Map */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h2 className="text-white font-semibold text-base mb-1">Select your seats</h2>
              <p className="text-white/40 text-xs">{event?.venue_name} · {event?.event_date ? new Date(event.event_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : ""} · {event?.start_time?.slice(0, 5)}</p>
            </div>

            <div className="bg-[#1a1828] border border-white/8 rounded-2xl overflow-hidden">
              {/* Stage */}
              <div className="mx-8 mt-5 bg-violet-800/50 border border-violet-600/30 rounded-lg py-2.5 text-center">
                <p className="text-violet-300 text-xs font-semibold tracking-[0.15em] uppercase">Stage</p>
              </div>
              <p className="text-center text-white/25 text-[11px] mt-2 mb-1">Click seats to select</p>

              <div className="px-4 sm:px-6 pb-6 space-y-1 overflow-x-auto">
                {seatMap.map(tier => (
                  <div key={tier.tier_id}>
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-white/5" />
                      <span className="text-[10px] font-semibold text-white/40 tracking-wider whitespace-nowrap">
                        {tier.tier_name} — ₹{Number(tier.price).toLocaleString("en-IN")}
                      </span>
                      <div className="flex-1 h-px bg-white/5" />
                    </div>
                    {Object.entries(tier.rows).map(([rowLabel, seats]) => (
                      <div key={rowLabel} className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-white/20 text-[10px] w-4 text-right flex-shrink-0">{rowLabel}</span>
                        <div className="flex gap-1 flex-wrap">
                          {seats.map((seat, idx) => {
                            const isSel = selected.some(s => s.id === seat.id);
                            const isTaken = seat.status === "booked" || seat.status === "held";
                            const colorKey = tier.color || "violet";
                            return (
                              <>
                                {idx === Math.floor(seats.length / 2) && <div key={`aisle-${rowLabel}`} className="w-2 flex-shrink-0" />}
                                <button
                                  key={seat.id}
                                  onClick={() => !isTaken && toggleSeat(seat, tier.tier_id, tier.price, tier.tier_name)}
                                  title={isTaken ? "Taken" : `Seat ${seat.code} · ₹${tier.price}`}
                                  className={`w-5 h-4 rounded-sm border transition-all flex-shrink-0 ${
                                    isTaken ? SEAT_COLORS.taken :
                                    isSel ? SEAT_COLORS.selected :
                                    SEAT_COLORS.available[colorKey] || SEAT_COLORS.available.violet
                                  }`}
                                />
                              </>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="border-t border-white/5 px-6 py-3 flex flex-wrap gap-4">
                {seatMap.map(t => (
                  <div key={t.tier_id} className="flex items-center gap-1.5">
                    <div className={`w-3.5 h-3 rounded-sm border bg-${t.color || "violet"}-500/25 border-${t.color || "violet"}-500/50`} />
                    <span className="text-white/40 text-[11px]">{t.tier_name}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3 rounded-sm bg-violet-600 border border-violet-400" />
                  <span className="text-white/40 text-[11px]">Selected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3 rounded-sm bg-white/5 border border-white/10 opacity-50" />
                  <span className="text-white/40 text-[11px]">Taken</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Panel */}
          <div className="sticky top-20 space-y-4 self-start">
            <div className="bg-amber-400/8 border border-amber-400/20 rounded-xl p-3">
              <p className="text-amber-300 text-xs font-medium mb-1">✦ AI suggestion</p>
              <p className="text-amber-200/60 text-xs leading-relaxed">Premium Standing offers the best view-to-price ratio for this venue layout.</p>
            </div>

            <div className="bg-[#1a1828] border border-white/8 rounded-2xl p-4">
              <p className="text-white/40 text-[10px] font-medium tracking-wider uppercase mb-3">Selected Seats</p>
              {selected.length === 0 ? (
                <div className="text-center py-6 text-white/25">
                  <div className="text-3xl mb-2">🪑</div>
                  <p className="text-xs">Click seats on the map</p>
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {selected.map(s => (
                    <div key={s.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-violet-500/20 border border-violet-500/30 text-violet-300">{s.code}</span>
                        <span className="text-white/50 text-xs">{s.tierName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-violet-400 text-xs font-semibold">₹{Number(s.tierPrice).toLocaleString("en-IN")}</span>
                        <button onClick={() => setSelected(selected.filter(x => x.id !== s.id))} className="text-white/20 hover:text-red-400 transition-colors text-xs">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selected.length > 0 && (
                <div className="border-t border-white/5 pt-3 space-y-1.5 mb-4">
                  <div className="flex justify-between text-xs text-white/40">
                    <span>Subtotal ({selected.length} tickets)</span>
                    <span>₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-xs text-white/40">
                    <span>Convenience fee (4%)</span>
                    <span>₹{fee.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-white/5">
                    <span>Total</span>
                    <span>₹{(subtotal + fee).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleProceed}
                disabled={selected.length === 0 || holding}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-white/5 disabled:text-white/20 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold transition-all"
              >
                {holding ? "Holding seats..." : selected.length === 0 ? "Select seats to continue" : `Proceed to checkout →`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ current }) {
  const steps = ["Event", "Seats", "Summary"];
  return (
    <div className="hidden sm:flex items-center gap-1">
      {steps.map((s, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={s} className="flex items-center gap-1">
            {i > 0 && <span className="text-white/20 text-xs mx-0.5">›</span>}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${active ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/40" : done ? "text-violet-400" : "text-white/30"}`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${done ? "bg-violet-500 text-white" : active ? "bg-violet-500/30 text-violet-300 ring-1 ring-violet-400" : "bg-white/10 text-white/30"}`}>
                {done ? "✓" : idx}
              </div>
              {s}
            </div>
          </div>
        );
      })}
    </div>
  );
}
