
import React, { useEffect, useState, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase, checkAndClearLoginInProgress } from './supabase';
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
import Honeymoon from './pages/Honeymoon';
import SessionTimeoutManager from './components/SessionTimeoutManager';
import RomanticLoginOverlay from './components/RomanticLoginOverlay';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLoginTransitioning, setIsLoginTransitioning] = useState(false);
  const [loginUser, setLoginUser] = useState<any>(null);
  const sessionRef = useRef<any>(null);
  sessionRef.current = session;

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
        // Cek apakah event ini berasal dari aksi login yang sesungguhnya (bukan window focus / tab switch)
        const isLoggingIn = checkAndClearLoginInProgress();
        if (isLoggingIn && newSession) {
          setIsLoginTransitioning(true);
          setLoginUser(newSession.user);
        }
        setSession(newSession);
      });
      subscription = authRes.data?.subscription;
    } catch (e) {
      console.warn("Auth listener error:", e);
    }

    // Listener custom event untuk sinkronisasi seketika antar layer auth lokal & cloud
    const handleCustomAuthChange = (e: any) => {
      const newSession = e.detail?.session || null;
      const isLoggingIn = checkAndClearLoginInProgress();
      if (isLoggingIn && newSession) {
        setIsLoginTransitioning(true);
        setLoginUser(newSession.user);
      }
      setSession(newSession);
    };
    window.addEventListener('wedding_auth_change', handleCustomAuthChange);

    // Listener khusus trigger transisi romantis dari Login page
    const handleStartLoginTransition = (e: any) => {
      setIsLoginTransitioning(true);
      if (e.detail?.user) {
        setLoginUser(e.detail.user);
      }
    };
    window.addEventListener('wedding_start_login_transition', handleStartLoginTransition);

    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
      window.removeEventListener('wedding_auth_change', handleCustomAuthChange);
      window.removeEventListener('wedding_start_login_transition', handleStartLoginTransition);
    };
  }, []);

  // Handler update login sinkron langsung dari form Login
  const handleLoginSuccess = (newSession: any, user?: any) => {
    if (newSession) {
      setIsLoginTransitioning(true);
      setLoginUser(user || newSession.user);
    }
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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#140204] text-white p-6 text-center font-serif relative overflow-hidden select-none">
        {/* Royal Velvet Radial Backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#3b060d_0%,_#1d0206_55%,_#0d0102_100%)] pointer-events-none" />

        {/* Organic Breathing Aura */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.42, 0.25] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-96 h-96 bg-gradient-to-tr from-[#800000]/40 via-[#d4af37]/20 to-rose-500/20 rounded-full blur-[110px] pointer-events-none"
        />

        {/* Animated Motion Centerpiece */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          className="relative mb-7 z-10 flex items-center justify-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className="w-32 h-32 flex items-center justify-center relative"
          >
            <svg viewBox="0 0 140 140" className="w-full h-full">
              <circle
                cx="70"
                cy="70"
                r="64"
                fill="none"
                stroke="rgba(212,175,55,0.25)"
                strokeWidth="1"
                strokeDasharray="3 5"
              />
              <motion.circle
                cx="70"
                cy="70"
                r="57"
                fill="none"
                stroke="#D4AF37"
                strokeWidth="1.8"
                strokeLinecap="round"
                initial={{ pathLength: 0.15 }}
                animate={{ pathLength: [0.15, 0.85, 0.15] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            </svg>
            <span className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-200 shadow-[0_0_10px_rgba(253,230,138,1)]" />
          </motion.div>

          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-20 h-20 rounded-2xl bg-gradient-to-br from-[#7c0b16] via-[#53050d] to-[#2d0207] border border-gold/70 flex flex-col items-center justify-center shadow-[0_10px_30px_rgba(212,175,55,0.3)] overflow-hidden"
          >
            <span className="font-serif text-2xl font-bold tracking-[0.14em] bg-gradient-to-b from-amber-100 via-gold to-amber-500 bg-clip-text text-transparent">
              FN
            </span>
            <HeartIcon size={9} className="text-rose-300 fill-rose-300 mt-0.5" />
          </motion.div>
        </motion.div>

        {/* Text and Arabic Blessing */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="space-y-2 z-10 max-w-sm"
        >
          <p className="font-serif text-xs sm:text-sm text-amber-200/85 tracking-wider drop-shadow-sm select-none" dir="rtl">
            بَارَكَ اللَّهُ لَكَ وَبَارَكَ عَلَيْكَ وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ
          </p>
          <h2 className="text-xl sm:text-2xl font-bold tracking-wide bg-gradient-to-r from-white via-amber-100 to-white bg-clip-text text-transparent">
            Fikri &amp; Nadya
          </h2>
          <motion.p
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="text-xs text-amber-200/85 font-serif italic tracking-wider"
          >
            Menata Setiap Detil Bahagia Menuju Hari Istimewa...
          </motion.p>
        </motion.div>

        <p className="text-[9px] text-amber-100/45 font-sans mt-8 uppercase tracking-[0.32em] z-10">
          Private Wedding Portal
        </p>
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

      {/* Overlay Animasi Loading Romantis & So Sweet Menuju Dashboard Saat User Berhasil Login */}
      <AnimatePresence>
        {isLoginTransitioning && (
          <RomanticLoginOverlay
            key="romantic-login-overlay"
            user={loginUser || session?.user}
            onComplete={() => {
              setIsLoginTransitioning(false);
            }}
          />
        )}
      </AnimatePresence>

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
        <Route path="/honeymoon" element={session ? (!isStaffOrResepsi ? <Layout userEmail={userEmail}><Honeymoon userEmail={userEmail} /></Layout> : <Navigate to="/scanner" />) : <Navigate to="/login" />} />
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
