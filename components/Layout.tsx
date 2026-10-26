
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
  QrCode
} from 'lucide-react';
import { supabase } from '../supabase';

interface LayoutProps {
  children: React.ReactNode;
  userEmail: string;
}

const Layout: React.FC<LayoutProps> = ({ children, userEmail }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const isFikri = userEmail.toLowerCase().includes('fikri');
  const roleLabel = isFikri ? 'Calon Suami' : 'Calon Istri';

  useEffect(() => {
    const fetchUnread = async () => {
      const { data } = await supabase.from('messages').select('*').eq('receiver_email', userEmail).eq('is_read', false);
      setUnreadCount(data?.length || 0);
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, [userEmail, location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Lamaran', icon: Heart, path: '/lamaran' },
    { name: 'Pernikahan', icon: Sparkles, path: '/pernikahan' },
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

        <div className={`mb-4 ${isCollapsed ? 'hidden' : 'block'}`}>
          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-maroon flex items-center justify-center text-gold font-bold text-sm uppercase shadow-sm border border-gold-200">
              {userEmail.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-maroon truncate uppercase">{userEmail.split('@')[0]}</p>
              <p className="text-[10px] text-gold-700 font-bold tracking-widest uppercase">{roleLabel}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className={`
            w-full flex items-center p-3 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all group
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
    </div>
  );
};

export default Layout;
