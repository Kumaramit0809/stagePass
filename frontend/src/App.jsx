import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { RequireAuth, RequireAdmin } from "./components/ProtectedRoute";

import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import EventDetailPage from "./pages/EventDetailPage";
import SeatSelectionPage from "./pages/SeatSelectionPage";
import CheckoutPage from "./pages/CheckoutPage";
import BookingConfirmedPage from "./pages/BookingConfirmedPage";
import MyTicketsPage from "./pages/MyTicketsPage";
import { LoginPage, RegisterPage } from "./pages/auth/AuthPages";

import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEvents from "./pages/admin/AdminEvents";
import { AdminUsers, AdminOrders } from "./pages/admin/AdminUsersOrders";

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-center"
            toastOptions={{
              style: { background: "#1a1828", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", fontSize: "13px" },
              success: { iconTheme: { primary: "#4ade80", secondary: "#1a1828" } },
              error: { iconTheme: { primary: "#f87171", secondary: "#1a1828" } },
            }}
          />
          <Routes>
            {/* Public routes with Navbar */}
            <Route path="/" element={<><Navbar /><HomePage /></>} />
            <Route path="/events/:id" element={<><Navbar /><EventDetailPage /></>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Auth-protected routes */}
            <Route path="/events/:id/seats" element={
              <RequireAuth><Navbar /><SeatSelectionPage /></RequireAuth>
            } />
            <Route path="/events/:id/checkout" element={
              <RequireAuth><Navbar /><CheckoutPage /></RequireAuth>
            } />
            <Route path="/booking-confirmed/:ref" element={
              <RequireAuth><Navbar /><BookingConfirmedPage /></RequireAuth>
            } />
            <Route path="/my-tickets" element={
              <RequireAuth><Navbar /><MyTicketsPage /></RequireAuth>
            } />

            {/* Admin routes */}
            <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route index element={<AdminDashboard />} />
              <Route path="events" element={<AdminEvents />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="users" element={<AdminUsers />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={
              <div className="min-h-screen bg-[#0f0e1a] flex items-center justify-center text-center px-4">
                <div>
                  <div className="text-6xl mb-4">🎵</div>
                  <h1 className="text-3xl font-bold text-white mb-2">Page not found</h1>
                  <p className="text-white/40 mb-6">This page doesn't exist</p>
                  <a href="/" className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-6 py-3 font-medium transition-colors">
                    Back to home
                  </a>
                </div>
              </div>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
