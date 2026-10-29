
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from './supabase';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BudgetTable from './components/BudgetTable';
import GuestList from './pages/GuestList';
import IncomeList from './pages/Income';
import ActivityLogs from './pages/ActivityLogs';
import MessageCenter from './pages/MessageCenter';
import Prayers from './pages/Prayers';
import Ideas from './pages/Ideas';
import GuestPass from './pages/GuestPass';
import GuestAdministration from './pages/GuestAdministration';
import CheckinValidation from './pages/CheckinValidation';
import ScannerDesk from './pages/ScannerDesk';
import SessionTimeoutManager from './components/SessionTimeoutManager';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Inisialisasi session & listener auth
  useEffect(() => {
    let subscription: any = null;
    const initSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data?.session || null);
      } catch (err) {
        console.warn("Auth session error:", err);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };
    initSession();

    try {
      const authRes = supabase.auth.onAuthStateChange((_event: any, newSession: any) => {
        setSession(newSession);
      });
      subscription = authRes.data?.subscription;
    } catch (e) {
      console.warn("Auth listener error:", e);
    }

    // Listener custom event untuk sinkronisasi seketika antar layer auth lokal & cloud
    const handleCustomAuthChange = (e: any) => {
      setSession(e.detail?.session || null);
    };
    window.addEventListener('wedding_auth_change', handleCustomAuthChange);

    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
      window.removeEventListener('wedding_auth_change', handleCustomAuthChange);
    };
  }, []);

  // Handler update login sinkron langsung dari form Login
  const handleLoginSuccess = (newSession: any) => {
    setSession(newSession);
  };

  // Handler logout otomatis saat sesi habis (40 menit inaktif)
  const handleAutoLogout = async (reason?: string) => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Signout error:", err);
    }
    setSession(null);
    if (reason) {
      toast.error(reason, {
        duration: 7000,
        id: 'session-timeout-toast',
        style: { background: '#800000', color: '#D4AF37', borderRadius: '16px', fontWeight: 'bold', border: '1px solid #D4AF37' }
      });
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-stone-50 space-y-6 font-serif">
        <div className="relative">
            <div className="w-24 h-24 border-4 border-gold-200 border-t-maroon rounded-full animate-spin shadow-xl"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <HeartIcon size={24} className="text-maroon animate-pulse fill-maroon" />
            </div>
        </div>
        <p className="text-maroon font-bold text-xl tracking-[0.2em] animate-pulse uppercase">Menata Kebahagiaan...</p>
      </div>
    );
  }

  const userEmail = session?.user?.email || '';
  const userRole = session?.user?.role || session?.user?.user_metadata?.role || '';
  const isStaffOrResepsi = 
    userEmail.toLowerCase().includes('staff') ||
    userEmail.toLowerCase().includes('resepsi') || 
    userEmail.toLowerCase().includes('scanner') || 
    userEmail.toLowerCase().includes('panitia') ||
    userRole === 'staff' ||
    userRole === 'resepsi';

  return (
    <HashRouter>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#800000', color: '#D4AF37', borderRadius: '16px', fontWeight: 'bold', border: '1px solid #D4AF37' }
      }} />

      {/* Pengawas Waktu Sesi (Inaktivitas 40 Menit & Auto-Logout dengan Peringatan Modal) */}
      <SessionTimeoutManager session={session} onLogout={handleAutoLogout} />

      <Routes>
        {/* Halaman Publik (Tanpa Login) untuk RSVP & Digital Guest Pass Barcode */}
        <Route path="/guest-pass" element={<GuestPass />} />
        <Route path="/rsvp" element={<GuestPass />} />
        <Route path="/buku-tamu" element={<GuestPass />} />
        <Route path="/checkin" element={<CheckinValidation />} />
        <Route path="/validasi" element={<CheckinValidation />} />
        <Route path="/scan" element={<CheckinValidation />} />

        <Route path="/login" element={!session ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to={isStaffOrResepsi ? "/scanner" : "/"} />} />
        
        {/* Dashboard utama: Jika akun staff/resepsi langsung arahkan ke Scanner */}
        <Route path="/" element={
          session ? (
            isStaffOrResepsi ? (
              <Layout userEmail={userEmail}><ScannerDesk userEmail={userEmail} /></Layout>
            ) : (
              <Layout userEmail={userEmail}><Dashboard /></Layout>
            )
          ) : <Navigate to="/login" />
        } />

        {/* Menu Khusus Scan Kehadiran & Souvenir (Staff & Pengantin) */}
        <Route path="/scanner" element={session ? <Layout userEmail={userEmail}><ScannerDesk userEmail={userEmail} /></Layout> : <Navigate to="/login" />} />
        
        {/* Administrasi Tamu (Buku Tamu & Scan) */}
        <Route path="/administrasi-tamu" element={session ? <Layout userEmail={userEmail}><GuestAdministration userEmail={userEmail} /></Layout> : <Navigate to="/login" />} />

        {/* Daftar Tamu (Dapat dibuka oleh Pengantin dan Staff untuk melihat VIP / Reguler) */}
        <Route path="/tamu" element={session ? <Layout userEmail={userEmail}><GuestList userEmail={userEmail} /></Layout> : <Navigate to="/login" />} />
        
        {/* Menu Khusus Pengantin (Hanya Fikri & Nadya, akun staff/resepsi dialihkan ke scanner) */}
        <Route path="/lamaran" element={session ? (!isStaffOrResepsi ? <Layout userEmail={userEmail}><BudgetTable moduleName="Lamaran" tableName="lamaran_items" userEmail={userEmail} /></Layout> : <Navigate to="/scanner" />) : <Navigate to="/login" />} />
        <Route path="/pernikahan" element={session ? (!isStaffOrResepsi ? <Layout userEmail={userEmail}><BudgetTable moduleName="Pernikahan" tableName="pernikahan_items" userEmail={userEmail} /></Layout> : <Navigate to="/scanner" />) : <Navigate to="/login" />} />
        <Route path="/pendapatan" element={session ? (!isStaffOrResepsi ? <Layout userEmail={userEmail}><IncomeList userEmail={userEmail} /></Layout> : <Navigate to="/scanner" />) : <Navigate to="/login" />} />
        <Route path="/ideas" element={session ? (!isStaffOrResepsi ? <Layout userEmail={userEmail}><Ideas userEmail={userEmail} /></Layout> : <Navigate to="/scanner" />) : <Navigate to="/login" />} />
        <Route path="/prayers" element={session ? (!isStaffOrResepsi ? <Layout userEmail={userEmail}><Prayers /></Layout> : <Navigate to="/scanner" />) : <Navigate to="/login" />} />
        <Route path="/logs" element={session ? (!isStaffOrResepsi ? <Layout userEmail={userEmail}><ActivityLogs /></Layout> : <Navigate to="/scanner" />) : <Navigate to="/login" />} />
        <Route path="/messages" element={session ? (!isStaffOrResepsi ? <Layout userEmail={userEmail}><MessageCenter userEmail={userEmail} /></Layout> : <Navigate to="/scanner" />) : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={isStaffOrResepsi ? "/scanner" : "/"} />} />
      </Routes>
    </HashRouter>
  );
};

const HeartIcon = ({ size, className, fill }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill || "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

export default App;
