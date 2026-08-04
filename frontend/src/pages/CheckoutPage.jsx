import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const PAY_METHODS = ["UPI", "Card", "Wallet", "Net Banking"];

export default function CheckoutPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const selected = state?.selected || [];
  const event = state?.event;

  const [payMethod, setPayMethod] = useState("UPI");
  const [promo, setPromo] = useState("");
  const [discount, setDiscount] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [timer, setTimer] = useState(10 * 60);
  const [contact, setContact] = useState({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "" });

  const timerRef = useRef();

  useEffect(() => {
    if (!selected.length) { navigate(`/events/${id}/seats`); return; }
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          toast.error("Seat hold expired. Please re-select.");
          navigate(`/events/${id}/seats`);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const mins = String(Math.floor(timer / 60)).padStart(2, "0");
  const secs = String(timer % 60).padStart(2, "0");
  const timerCritical = timer < 120;

  const subtotal = selected.reduce((s, x) => s + Number(x.tierPrice), 0);
  const fee = Math.round(subtotal * 0.04);
  const total = subtotal + fee - discount;

  const applyPromo = async () => {
    if (!promo.trim()) return;
    setPromoLoading(true);
    try {
      const { data } = await api.post("/orders/validate-promo", { code: promo.trim(), amount: subtotal });
      setDiscount(data.discount);
      setPromoApplied(true);
      toast.success(`Promo applied! ₹${data.discount} off`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid promo code");
      setDiscount(0);
      setPromoApplied(false);
    } finally {
      setPromoLoading(false);
    }
  };

  const loadRazorpay = () => new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const handlePayment = async () => {
    if (!contact.name || !contact.email || !contact.phone) {
      toast.error("Please fill in all contact details"); return;
    }
    setProcessing(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) { toast.error("Payment gateway failed to load"); return; }

      const { data } = await api.post("/orders/create", {
        event_id: id,
        seat_ids: selected.map(s => s.id),
        promo_code: promoApplied ? promo : null,
        contact,
      });

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.amount * 100,
        currency: data.currency,
        order_id: data.razorpay_order_id,
        name: "StagePass",
        description: event?.title,
        prefill: data.prefill,
        theme: { color: "#7c3aed" },
        handler: async (response) => {
          try {
            const verifyRes = await api.post("/orders/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_id: data.order_id,
              promo_code: promoApplied ? promo : null,
            });
            clearInterval(timerRef.current);
            navigate(`/booking-confirmed/${verifyRes.data.order.order_ref}`, {
              state: { order: verifyRes.data.order },
            });
          } catch {
            toast.error("Payment verification failed. Contact support.");
          }
        },
        modal: { ondismiss: () => setProcessing(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => { toast.error("Payment failed. Please try again."); setProcessing(false); });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to initiate payment");
      setProcessing(false);
    }
  };

  if (!selected.length) return null;

  return (
    <div className="min-h-screen bg-[#0f0e1a]">
      <div className="bg-[#0f0e1a]/95 border-b border-white/5 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-white/50 text-sm truncate max-w-xs">{event?.title}</div>
          <StepIndicator current={3} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-5">
            {/* Event summary card */}
            <div className="bg-[#1a1828] border border-white/8 rounded-2xl overflow-hidden">
              <div className={`bg-gradient-to-r ${event?.banner_gradient || "from-violet-900 to-violet-600"} px-5 py-4`}>
                <p className="text-white font-semibold">{event?.title}</p>
              </div>
              <div className="px-5 py-4 grid grid-cols-3 gap-4">
                {[
                  { k: "DATE", v: event?.event_date ? new Date(event.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "" },
                  { k: "TIME", v: event?.start_time?.slice(0, 5) },
                  { k: "VENUE", v: `${event?.venue_name}, ${event?.city}` },
                ].map(m => (
                  <div key={m.k}>
                    <p className="text-white/30 text-[10px] font-medium tracking-wider uppercase mb-1">{m.k}</p>
                    <p className="text-white text-xs font-medium">{m.v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ticket Table */}
            <div>
              <h3 className="text-white font-semibold text-sm mb-3">Ticket summary</h3>
              <div className="bg-[#1a1828] border border-white/8 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-4 gap-4 px-4 py-2.5 bg-white/3 border-b border-white/5">
                  {["SEAT", "TIER", "QTY", "PRICE"].map((h, i) => (
                    <p key={h} className={`text-[10px] font-semibold tracking-wider text-white/30 ${i === 3 ? "text-right" : ""}`}>{h}</p>
                  ))}
                </div>
                {selected.map(s => (
                  <div key={s.id} className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-white/5 last:border-0 items-center">
                    <span className="bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-semibold px-2 py-0.5 rounded-md w-fit">{s.code}</span>
                    <span className="bg-white/5 border border-white/10 text-white/50 text-xs rounded-full px-2 py-0.5 w-fit truncate">{s.tierName}</span>
                    <span className="text-white/60 text-xs">×1</span>
                    <span className="text-violet-400 text-xs font-semibold text-right">₹{Number(s.tierPrice).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-white font-semibold text-sm mb-3">Contact & delivery</h3>
              <div className="bg-[#1a1828] border border-white/8 rounded-2xl p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Full name" value={contact.name} onChange={v => setContact({ ...contact, name: v })} placeholder="Your name" />
                  <Field label="Mobile number" type="tel" value={contact.phone} onChange={v => setContact({ ...contact, phone: v })} placeholder="+91 98765 43210" />
                </div>
                <Field label="Email address (tickets sent here)" type="email" value={contact.email} onChange={v => setContact({ ...contact, email: v })} placeholder="you@example.com" />
              </div>
            </div>

            {/* Payment */}
            <div>
              <h3 className="text-white font-semibold text-sm mb-3">Payment method</h3>
              <div className="bg-[#1a1828] border border-white/8 rounded-2xl p-5 space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {PAY_METHODS.map(pm => (
                    <button key={pm} onClick={() => setPayMethod(pm)}
                      className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
                        payMethod === pm ? "bg-violet-500/20 border-violet-400/50 text-violet-300 ring-1 ring-violet-400/30" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                      }`}>
                      {pm === "UPI" ? "⚡ " : pm === "Card" ? "💳 " : ""}
                      {pm}
                    </button>
                  ))}
                </div>
                <p className="text-white/30 text-xs">
                  {payMethod === "UPI" && "You'll be prompted to enter your UPI ID in the Razorpay secure checkout."}
                  {payMethod === "Card" && "Your card details will be entered in the Razorpay secure checkout."}
                  {payMethod === "Wallet" && "Choose your preferred wallet in the Razorpay checkout."}
                  {payMethod === "Net Banking" && "Select your bank in the Razorpay secure checkout."}
                </p>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-4 self-start sticky top-20">
            {/* Timer */}
            <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${timerCritical ? "bg-red-500/10 border-red-500/30" : "bg-amber-400/8 border-amber-400/20"}`}>
              <span className={`text-xs ${timerCritical ? "text-red-300" : "text-amber-300"}`}>Seats held for</span>
              <span className={`font-mono font-bold text-sm rounded-full px-3 py-1 ${timerCritical ? "bg-red-500 text-white" : "bg-amber-400/20 text-amber-300"}`}>
                {mins}:{secs}
              </span>
            </div>

            {/* AI Note */}
            <div className="bg-amber-400/8 border border-amber-400/20 rounded-xl p-3">
              <p className="text-amber-300 text-xs font-medium mb-1">✦ Great choice!</p>
              <p className="text-amber-200/60 text-xs leading-relaxed">You've selected {selected.length} seat{selected.length > 1 ? "s" : ""}. Proceed to payment to confirm your booking.</p>
            </div>

            {/* Order Summary */}
            <div className="bg-[#1a1828] border border-white/8 rounded-2xl p-4 space-y-3">
              <p className="text-white font-semibold text-sm">Order summary</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-white/40">
                  <span>{selected.length} tickets</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-xs text-white/40">
                  <span>Convenience fee (4%)</span>
                  <span>₹{fee.toLocaleString("en-IN")}</span>
                </div>
                {promoApplied && (
                  <div className="flex justify-between text-xs text-emerald-400">
                    <span>Discount ({promo})</span>
                    <span>−₹{discount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/5">
                  <span>Total payable</span>
                  <span>₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Promo */}
              <div className="flex gap-2">
                <input
                  value={promo}
                  onChange={e => { setPromo(e.target.value.toUpperCase()); setPromoApplied(false); setDiscount(0); }}
                  placeholder="Promo code"
                  className="flex-1 bg-[#0f0e1a] border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder-white/20 outline-none focus:border-violet-500/50 transition-colors uppercase"
                />
                <button onClick={applyPromo} disabled={promoLoading || !promo}
                  className="bg-violet-500/20 border border-violet-400/30 text-violet-300 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-violet-500/30 transition-colors disabled:opacity-40">
                  {promoLoading ? "..." : "Apply"}
                </button>
              </div>

              <button onClick={handlePayment} disabled={processing}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white rounded-xl py-3.5 text-sm font-semibold transition-all hover:shadow-lg hover:shadow-violet-900/50 active:scale-[0.98]">
                {processing ? "Processing..." : `Pay ₹${total.toLocaleString("en-IN")} →`}
              </button>

              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded bg-emerald-600/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <p className="text-white/30 text-xs">Free cancellation up to 24 hrs before event. Powered by Razorpay.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label className="block text-white/40 text-xs mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#0f0e1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-violet-500/50 transition-colors" />
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
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${active ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/40" : done ? "text-violet-400" : "text-white/30"}`}>
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
