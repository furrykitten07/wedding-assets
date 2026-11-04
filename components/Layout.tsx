
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Heart, 
  Users, 
  Wallet, 
  History, 
  LogOut, 
  Menu, 
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MessageSquare,
  BookOpenCheck,
  Lightbulb,
  QrCode,
  Camera,
  Palmtree,
  X,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../supabase';

interface LayoutProps {
  children: React.ReactNode;
  userEmail: string;
}

const Layout: React.FC<LayoutProps> = ({ children, userEmail }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const cleanEmail = (userEmail || '').toLowerCase();
  const isStaff = cleanEmail.includes('staff') || 
                  cleanEmail.includes('resepsi') || 
                  cleanEmail.includes('scanner') || 
                  cleanEmail.includes('panitia');
  const isStaff1 = cleanEmail.includes('staff1');
  const isStaff2 = cleanEmail.includes('staff2');
  const isFikri = cleanEmail.includes('fikri');

  let roleLabel = 'Staff Resepsi & Scan';
  if (isStaff1) {
    roleLabel = 'Staff 1 • Resepsi & Scan';
  } else if (isStaff2) {
    roleLabel = 'Staff 2 • Resepsi & Scan';
  } else if (isStaff) {
    roleLabel = 'Staff Resepsi & Scan';
  } else if (isFikri) {
    roleLabel = 'Calon Suami';
  } else {
    roleLabel = 'Calon Istri';
  }

  useEffect(() => {
    if (isStaff) return;
    const fetchUnread = async () => {
      const { data } = await supabase.from('messages').select('*').eq('receiver_email', userEmail).eq('is_read', false);
      setUnreadCount(data?.length || 0);
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, [userEmail, location.pathname, isStaff]);

  const handleLogoutClick = () => {
    setIsLogoutConfirmOpen(true);
  };

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await supabase.auth.signOut();
      toast.success('Berhasil logout dari sistem.', {
        icon: '👋',
        duration: 3000
      });
      navigate('/login');
    } catch (err) {
      console.warn('Signout error:', err);
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
      setIsLogoutConfirmOpen(false);
    }
  };

  const navItems = isStaff ? [
    { name: 'Scan Kehadiran & Souvenir', icon: Camera, path: '/scanner' },
    { name: 'Daftar Tamu (VIP & Reguler)', icon: Users, path: '/tamu' },
    { name: 'Buku Tamu & Data', icon: QrCode, path: '/administrasi-tamu' },
  ] : [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Scan Kehadiran', icon: Camera, path: '/scanner' },
    { name: 'Lamaran', icon: Heart, path: '/lamaran' },
    { name: 'Pernikahan', icon: Sparkles, path: '/pernikahan' },
    { name: 'Agenda Honeymoon', icon: Palmtree, path: '/honeymoon' },
    { name: 'Daftar Tamu', icon: Users, path: '/tamu' },
    { name: 'Buku Tamu & Scan', icon: QrCode, path: '/administrasi-tamu' },
    { name: 'Pendapatan', icon: Wallet, path: '/pendapatan' },
    { name: 'Doa & Amalan', icon: BookOpenCheck, path: '/prayers' },
    { name: 'Log Aktivitas', icon: History, path: '/logs' },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gold-200">
      <div className="p-6 flex items-center justify-between">
        <div className={`flex items-center space-x-3 ${isCollapsed ? 'hidden' : 'flex'}`}>
          <div className="w-10 h-10 bg-maroon rounded-lg flex items-center justify-center shadow-lg border border-gold-400">
            <span className="text-gold font-serif text-xl font-bold">FN</span>
          </div>
          <div>
            <h1 className="text-maroon font-serif font-bold text-lg leading-tight">Fikri & Nadya</h1>
            <p className="text-[10px] text-gold-600 font-bold tracking-[0.2em] uppercase">Private Portal</p>
          </div>
        </div>
        {isCollapsed && (
           <div className="w-10 h-10 bg-maroon rounded-lg flex items-center justify-center mx-auto shadow-lg">
            <span className="text-gold font-serif text-xl font-bold">FN</span>
          </div>
        )}
      </div>

      <nav className="flex-1 mt-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center p-3 rounded-xl transition-all duration-300 group relative
              ${isActive 
                ? 'bg-maroon text-gold shadow-lg border border-gold-400' 
                : 'text-gray-500 hover:bg-maroon-50 hover:text-gold-600'
              }
              ${isCollapsed ? 'justify-center' : 'space-x-3'}
            `}
          >
            <item.icon size={20} className={`shrink-0 transition-colors ${location.pathname === item.path ? 'text-gold' : 'group-hover:text-gold-600'}`} />
            {!isCollapsed && <span className="font-bold tracking-wide uppercase text-[11px]">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100 space-y-3">
        {!isStaff && (
          <>
            <NavLink
                to="/ideas"
                className={({ isActive }) => `
                  flex items-center p-3 rounded-xl transition-all duration-300 relative group
                  ${isActive ? 'bg-maroon text-gold shadow-lg border border-gold-400' : 'bg-gold-50 text-gold-800 hover:bg-gold-100'}
                  ${isCollapsed ? 'justify-center' : 'space-x-3'}
                `}
            >
              <Lightbulb size={20} />
              {!isCollapsed && <span className="font-bold uppercase text-[11px] tracking-widest">Ide & Inspirasi</span>}
            </NavLink>

            <NavLink
                to="/messages"
                className={({ isActive }) => `
                  flex items-center p-3 rounded-xl transition-all duration-300 relative group
                  ${isActive ? 'bg-maroon text-gold shadow-lg' : 'bg-gold-50 text-gold-800 hover:bg-gold-100'}
                  ${isCollapsed ? 'justify-center' : 'space-x-3'}
                `}
            >
              <div className="relative">
                <MessageSquare size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              {!isCollapsed && <span className="font-bold uppercase text-[11px] tracking-widest">Pesan Pasangan</span>}
            </NavLink>
          </>
        )}

        <div className={`mb-4 ${isCollapsed ? 'hidden' : 'block'}`}>
          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-maroon flex items-center justify-center text-gold font-bold text-sm uppercase shadow-sm border border-gold-200">
              {isStaff1 ? 'S1' : isStaff2 ? 'S2' : userEmail.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-maroon truncate uppercase">
                {isStaff1 ? 'Staff 1' : isStaff2 ? 'Staff 2' : (userEmail.split('@')[0] || 'User')}
              </p>
              <p className="text-[10px] text-gold-700 font-bold tracking-widest uppercase">{roleLabel}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogoutClick}
          className={`
            w-full flex items-center p-3 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all group cursor-pointer
            ${isCollapsed ? 'justify-center' : 'space-x-3'}
          `}
        >
          <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
          {!isCollapsed && <span className="font-bold text-[11px] uppercase tracking-wider">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fdfaf7] flex font-sans overflow-hidden">
      <aside className={`hidden md:block h-screen transition-all duration-500 ease-in-out relative z-30 ${isCollapsed ? 'w-20' : 'w-72'}`}>
        <SidebarContent />
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-20 w-6 h-6 bg-maroon text-gold rounded-full flex items-center justify-center shadow-xl border border-gold-400 z-50">
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      <div className={`md:hidden fixed inset-0 z-40 ${isMobileOpen ? 'visible' : 'invisible'}`}>
        <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity ${isMobileOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsMobileOpen(false)}/>
        <div className={`absolute top-0 left-0 bottom-0 w-72 bg-white transition-transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <SidebarContent />
        </div>
      </div>

      <main className="flex-1 flex flex-col h-screen relative overflow-hidden">
        <header className="md:hidden h-16 bg-white border-b border-gray-100 flex items-center px-4 shrink-0">
          <button onClick={() => setIsMobileOpen(true)} className="p-2 text-maroon"><Menu size={24} /></button>
          <div className="flex-1 text-center"><h1 className="font-serif font-bold text-maroon text-lg">Fikri & Nadya</h1></div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth bg-[#fdfaf7]">
          <div className="max-w-7xl mx-auto animate-fade-in">{children}</div>
        </div>
      </main>

      {/* MODAL KONFIRMASI LOGOUT */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-maroon-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => !isLoggingOut && setIsLogoutConfirmOpen(false)}
          />
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden animate-slide-up border-2 border-gold-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-maroon via-maroon-700 to-[#5a0e17] px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 text-gold flex items-center justify-center border border-white/20">
                  <LogOut size={18} />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-gold">Konfirmasi Keluar</h3>
                  <p className="text-[10px] text-amber-200 uppercase tracking-widest font-semibold">Fikri &amp; Nadya Wedding Portal</p>
                </div>
              </div>
              <button
                disabled={isLoggingOut}
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-stone-300 hover:text-white transition-colors cursor-pointer"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-7 space-y-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-inner">
                <LogOut size={28} />
              </div>

              <div className="space-y-1.5">
                <h4 className="font-serif text-lg font-bold text-stone-900">
                  Apakah Anda yakin ingin keluar?
                </h4>
                <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
                  Sesi login aktif Anda akan diakhiri. Anda perlu memasukkan email &amp; kata sandi kembali untuk membuka portal ini.
                </p>
              </div>

              {/* Account active chip */}
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 flex items-center justify-center space-x-2 text-xs text-stone-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate">Login sebagai: <strong>{roleLabel}</strong></span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => setIsLogoutConfirmOpen(false)}
                  className="w-full py-3 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  Batal
                </button>

                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handleConfirmLogout}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-maroon hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Sedang Keluar...</span>
                    </>
                  ) : (
                    <>
                      <LogOut size={14} />
                      <span>Ya, Keluar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
