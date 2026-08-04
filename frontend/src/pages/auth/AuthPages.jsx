import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      login(data.token, data.user);
      toast.success("Welcome back!");
      navigate(data.user.role === "admin" ? "/admin" : "/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credential) => {
    try {
      const { data } = await api.post("/auth/google", { credential });
      login(data.token, data.user);
      toast.success("Welcome!");
      navigate("/");
    } catch {
      toast.error("Google login failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0e1a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M7 1L9 5.5H13.5L9.75 8.5L11.25 13L7 10.5L2.75 13L4.25 8.5L0.5 5.5H5L7 1Z" fill="white"/></svg>
            </div>
            <span className="text-white font-semibold text-lg">stage<span className="text-violet-400">pass</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-white/40 text-sm">Sign in to your account</p>
        </div>

        <div className="bg-[#1a1828] border border-white/10 rounded-2xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <Field label="Email" type="email" value={form.email} onChange={v => setForm({...form, email: v})} placeholder="you@example.com" />
            <Field label="Password" type="password" value={form.password} onChange={v => setForm({...form, password: v})} placeholder="••••••••" />
            <button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white rounded-xl py-3 text-sm font-semibold transition-all">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <Divider />

          <div className="flex justify-center mt-4">
            <GoogleLogin
              onSuccess={({ credential }) => handleGoogle(credential)}
              onError={() => toast.error("Google login failed")}
              theme="filled_black"
              size="large"
              width="320"
            />
          </div>

          <p className="text-center text-white/40 text-sm mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-violet-400 hover:text-violet-300 font-medium">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      login(data.token, data.user);
      toast.success("Account created!");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credential) => {
    try {
      const { data } = await api.post("/auth/google", { credential });
      login(data.token, data.user);
      toast.success("Welcome to StagePass!");
      navigate("/");
    } catch {
      toast.error("Google sign-up failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0e1a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M7 1L9 5.5H13.5L9.75 8.5L11.25 13L7 10.5L2.75 13L4.25 8.5L0.5 5.5H5L7 1Z" fill="white"/></svg>
            </div>
            <span className="text-white font-semibold text-lg">stage<span className="text-violet-400">pass</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-white/40 text-sm">Join thousands of event-goers</p>
        </div>
        <div className="bg-[#1a1828] border border-white/10 rounded-2xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <Field label="Full name" value={form.name} onChange={v => setForm({...form, name: v})} placeholder="Arjun Rao" />
            <Field label="Email" type="email" value={form.email} onChange={v => setForm({...form, email: v})} placeholder="you@example.com" />
            <Field label="Phone" type="tel" value={form.phone} onChange={v => setForm({...form, phone: v})} placeholder="+91 98765 43210" />
            <Field label="Password" type="password" value={form.password} onChange={v => setForm({...form, password: v})} placeholder="Min. 6 characters" />
            <button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white rounded-xl py-3 text-sm font-semibold transition-all">
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
          <Divider />
          <div className="flex justify-center mt-4">
            <GoogleLogin onSuccess={({ credential }) => handleGoogle(credential)} onError={() => toast.error("Google signup failed")} theme="filled_black" size="large" width="320" />
          </div>
          <p className="text-center text-white/40 text-sm mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label className="block text-white/50 text-xs mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#0f0e1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-violet-500/50 transition-colors" />
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-white/30 text-xs">or continue with</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}
