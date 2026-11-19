import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, logActivity } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Sparkles, 
  Users, 
  CheckCircle2, 
  History, 
  ChevronRight, 
  Plus, 
  Lightbulb, 
  MessageSquare, 
  ArrowRight, 
  Edit3, 
  BookmarkCheck,
  Send,
  QrCode,
  Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

interface DashboardStats {
  totalLamaran: number;
  lamaranDone: number;
  lamaranDicicil: number;
  lamaranBelum: number;
  totalPernikahan: number;
  pernikahanDone: number;
  pernikahanDicicil: number;
  pernikahanBelum: number;
  totalTamuPax: number;
  tamuFikriPax: number;
  tamuNadyaPax: number;
  tamuCategories: Record<string, number>;
  totalIdeas: number;
  approvedIdeas: number;
  unreadMessages: number;
  latestMessage: any | null;
  recentLogs: any[];
}

const pageContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

const sectionItemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 280,
      damping: 25,
    },
  },
};

const cardHoverSpring = {
  y: -4,
  transition: { type: 'spring' as const, stiffness: 380, damping: 24 },
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const [stats, setStats] = useState<DashboardStats>({
    totalLamaran: 0,
    lamaranDone: 0,
    lamaranDicicil: 0,
    lamaranBelum: 0,
    totalPernikahan: 0,
    pernikahanDone: 0,
    pernikahanDicicil: 0,
    pernikahanBelum: 0,
    totalTamuPax: 0,
    tamuFikriPax: 0,
    tamuNadyaPax: 0,
    tamuCategories: {},
    totalIdeas: 0,
    approvedIdeas: 0,
    unreadMessages: 0,
    latestMessage: null,
    recentLogs: []
  });

  // Event Dates
  const [engagementDate, setEngagementDate] = useState<string>(localStorage.getItem('event_date_Lamaran') || '');
  const [weddingDate, setWeddingDate] = useState<string>(localStorage.getItem('event_date_Pernikahan') || '');
  
  // Date Modal State
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<'Lamaran' | 'Pernikahan'>('Lamaran');
  const [tempDate, setTempDate] = useState('');

  // Tab State for Preparation Breakdown
  const [prepTab, setPrepTab] = useState<'all' | 'lamaran' | 'pernikahan'>('all');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData?.session?.user;
      setUser(currentUser);

      const userEmail = currentUser?.email || '';

      // Parallel fetching non-financial data
      const [
        lamaranRes,
        pernikahanRes,
        tamuRes,
        ideasRes,
        messagesRes,
        logsRes,
        settingsRes
      ] = await Promise.all([
        supabase.from('lamaran_items').select('id, status, kategori'),
        supabase.from('pernikahan_items').select('id, status, kategori'),
        supabase.from('tamu').select('id, pihak, membawa_pasangan, jumlah_tambahan, kategori'),
        supabase.from('ideas').select('id, is_approved, title'),
        supabase.from('messages').select('*').order('created_at', { ascending: false }),
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(6),
        supabase.from('settings').select('*')
      ]) as any[];

      // Dates from Settings if available
      if (settingsRes?.data?.length) {
        settingsRes.data.forEach((s: any) => {
          if (s.setting_key === 'event_date_Lamaran' && s.setting_value) {
            setEngagementDate(s.setting_value);
            localStorage.setItem('event_date_Lamaran', s.setting_value);
          }
          if (s.setting_key === 'event_date_Pernikahan' && s.setting_value) {
            setWeddingDate(s.setting_value);
            localStorage.setItem('event_date_Pernikahan', s.setting_value);
          }
        });
      }

      // Preparation Status Breakdown
      const lamaranItems = lamaranRes?.data || [];
      const lDone = lamaranItems.filter((i: any) => i.status === 'done').length;
      const lDicicil = lamaranItems.filter((i: any) => i.status === 'dicicil').length;
      const lBelum = lamaranItems.filter((i: any) => i.status === 'belum terbeli').length;

      const pernikahanItems = pernikahanRes?.data || [];
      const pDone = pernikahanItems.filter((i: any) => i.status === 'done').length;
      const pDicicil = pernikahanItems.filter((i: any) => i.status === 'dicicil').length;
      const pBelum = pernikahanItems.filter((i: any) => i.status === 'belum terbeli').length;

      // Guest Pax Calculation
      const tamuList = tamuRes?.data || [];
      let totalPax = 0;
      let fikriPax = 0;
      let nadyaPax = 0;
      const categoriesMap: Record<string, number> = {};

      tamuList.forEach((t: any) => {
        const pax = 1 + (t.membawa_pasangan ? (Number(t.jumlah_tambahan) || 0) : 0);
        totalPax += pax;
        if (t.pihak === 'Fikri') fikriPax += pax;
        else if (t.pihak === 'Nadya') nadyaPax += pax;

        const cat = t.kategori || 'Lainnya';
        categoriesMap[cat] = (categoriesMap[cat] || 0) + pax;
      });

      // Ideas
      const ideasList = ideasRes?.data || [];
      const approvedCount = ideasList.filter((i: any) => i.is_approved).length;

      // Messages (filter out bridge messages from guest pass)
      const msgList = messagesRes?.data || [];
      const partnerMsgList = msgList.filter((m: any) => m.receiver_email !== 'guest_pass_data@wedding.system');
      const unreadCount = partnerMsgList.filter((m: any) => m.receiver_email === userEmail && !m.is_read).length;
      const latestMsg = partnerMsgList.length > 0 ? partnerMsgList[0] : null;

      setStats({
        totalLamaran: lamaranItems.length,
        lamaranDone: lDone,
        lamaranDicicil: lDicicil,
        lamaranBelum: lBelum,
        totalPernikahan: pernikahanItems.length,
        pernikahanDone: pDone,
        pernikahanDicicil: pDicicil,
        pernikahanBelum: pBelum,
        totalTamuPax: totalPax,
        tamuFikriPax: fikriPax,
        tamuNadyaPax: nadyaPax,
        tamuCategories: categoriesMap,
        totalIdeas: ideasList.length,
        approvedIdeas: approvedCount,
        unreadMessages: unreadCount,
        latestMessage: latestMsg,
        recentLogs: logsRes?.data || []
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getDaysDiff = (dateStr: string | null) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleOpenDateModal = (module: 'Lamaran' | 'Pernikahan') => {
    setEditingModule(module);
    setTempDate(module === 'Lamaran' ? engagementDate : weddingDate);
    setIsDateModalOpen(true);
  };

  const handleSaveDate = async () => {
    if (!tempDate) return;
    try {
      const settingKey = `event_date_${editingModule}`;
      localStorage.setItem(settingKey, tempDate);
      if (editingModule === 'Lamaran') setEngagementDate(tempDate);
      else setWeddingDate(tempDate);

      // Save to database settings table if available, without breaking if table not present
      try {
        await supabase.from('settings').insert([{ setting_key: settingKey, setting_value: tempDate }]);
      } catch (dbErr) {
        console.warn('Settings table not available in DB, using localStorage:', dbErr);
      }

      if (user?.email) {
        logActivity(user.email, 'update', 'Settings', `Mengatur tanggal ${editingModule} ke ${tempDate}`);
      }
      toast.success(`Tanggal ${editingModule} berhasil disimpan! ✨`);
      setIsDateModalOpen(false);
    } catch (err) {
      toast.error('Gagal menyimpan tanggal');
    }
  };

  const totalItems = stats.totalLamaran + stats.totalPernikahan;
  const totalDone = stats.lamaranDone + stats.pernikahanDone;
  const totalDicicil = stats.lamaranDicicil + stats.pernikahanDicicil;
  const totalBelum = stats.lamaranBelum + stats.pernikahanBelum;
  
  // Calculate readiness %
  const readinessPercent = totalItems > 0 
    ? Math.round(((totalDone + totalDicicil * 0.5) / totalItems) * 100) 
    : 0;

  const isFikri = user?.email?.toLowerCase().includes('fikri');
  const partnerName = isFikri ? 'Nadya' : 'Fikri';

  const prepTabs: { key: 'all' | 'lamaran' | 'pernikahan'; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'lamaran', label: 'Lamaran' },
    { key: 'pernikahan', label: 'Pernikahan' },
  ];

  const currentTotal = prepTab === 'all' ? totalItems : prepTab === 'lamaran' ? stats.totalLamaran : stats.totalPernikahan;
  const currentDone = prepTab === 'all' ? totalDone : prepTab === 'lamaran' ? stats.lamaranDone : stats.pernikahanDone;
  const currentDicicil = prepTab === 'all' ? totalDicicil : prepTab === 'lamaran' ? stats.lamaranDicicil : stats.pernikahanDicicil;
  const currentBelum = prepTab === 'all' ? totalBelum : prepTab === 'lamaran' ? stats.lamaranBelum : stats.pernikahanBelum;

  const donePct = currentTotal > 0 ? (currentDone / currentTotal) * 100 : 0;
  const dicicilPct = currentTotal > 0 ? (currentDicicil / currentTotal) * 100 : 0;
  const belumPct = currentTotal > 0 ? (currentBelum / currentTotal) * 100 : 0;

  return (
    <motion.div
      variants={pageContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-12 font-sans selection:bg-maroon selection:text-gold"
    >
      
      {/* 1. HERO HEADER WITH COUNTDOWN */}
      <motion.div
        variants={sectionItemVariants}
        className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-gold-200/50"
      >
        <div>
          <motion.div
            whileHover={{ scale: 1.03 }}
            className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-gold-50 border border-gold-300 text-gold-800 text-[11px] font-bold uppercase tracking-wider mb-2 cursor-default"
          >
            <motion.span
              animate={{ rotate: [0, 15, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-flex"
            >
              <Sparkles size={12} className="text-gold-600" />
            </motion.span>
            <span>Pusat Kendali Pernikahan</span>
          </motion.div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-maroon leading-tight tracking-tight flex flex-wrap items-center gap-x-2">
            <span>Halo,</span>
            <span className="text-gold-600">{isFikri ? 'Calon Suami Nadya' : 'Calon Istri Fikri'}</span>
            <motion.span
              animate={{ scale: [1, 1.18, 1, 1.12, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
              className="inline-block"
            >
              ❤️
            </motion.span>
          </h1>
          <p className="text-gray-500 text-sm sm:text-base mt-2 font-normal">
            Pantau setiap langkah persiapan hari bahagia kita berdua dengan tenang.
          </p>
        </div>

        {/* Milestone Countdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 shrink-0">
          {[
            { name: 'Lamaran', date: engagementDate, icon: Heart, color: 'text-rose-600 bg-rose-50 border-rose-100', mod: 'Lamaran' as const },
            { name: 'Pernikahan', date: weddingDate, icon: Sparkles, color: 'text-gold-700 bg-gold-50 border-gold-200', mod: 'Pernikahan' as const }
          ].map((ev, i) => {
            const diff = getDaysDiff(ev.date);
            return (
              <motion.div
                key={i}
                whileHover={{ y: -3, scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                onClick={() => handleOpenDateModal(ev.mod)}
                className="group bg-white hover:bg-gold-50/40 p-4 sm:p-5 rounded-2xl border border-gold-200/80 shadow-sm hover:shadow-md transition-colors cursor-pointer flex items-center space-x-4 min-w-[240px]"
              >
                <div className={`p-3 rounded-xl border ${ev.color} group-hover:scale-105 transition-transform`}>
                  <ev.icon size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{ev.name}</p>
                    <Edit3 size={12} className="text-gray-300 group-hover:text-gold-600 transition-colors" />
                  </div>
                  <p className="text-xs font-bold text-maroon truncate mt-0.5">
                    {ev.date ? new Date(ev.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Set Tanggal'}
                  </p>
                  <p className="text-sm font-extrabold text-maroon-900 mt-1">
                    {diff !== null 
                      ? (diff > 0 ? `${diff} Hari Lagi` : diff === 0 ? 'Hari Ini! ❤️' : 'Selesai ✨') 
                      : 'Klik Atur Tanggal'}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* 2. TOP METRIC HIGHLIGHTS (Bento 4-Card Overview - 0% Financial) */}
      <motion.div
        variants={sectionItemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        
        {/* Card 1: Readiness Score */}
        <motion.div
          whileHover={cardHoverSpring}
          className="bg-white p-6 rounded-3xl border border-gold-200/70 shadow-sm hover:shadow-lg hover:shadow-maroon/5 transition-shadow relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Tingkat Kesiapan</span>
            <motion.div
              whileHover={{ rotate: 12, scale: 1.08 }}
              className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100"
            >
              <CheckCircle2 size={18} />
            </motion.div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-maroon font-serif tabular-nums">{readinessPercent}%</span>
            <span className="text-xs font-medium text-gray-400">Siap terlaksana</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mt-3 overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: `${Math.min(100, readinessPercent)}%` }}
              transition={{ type: 'spring', stiffness: 70, damping: 18, delay: 0.2 }}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full"
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-2.5 font-medium">
            {totalDone} dari {totalItems} keperluan sudah siap
          </p>
        </motion.div>

        {/* Card 2: Items Preparation */}
        <motion.div
          whileHover={cardHoverSpring}
          className="bg-white p-6 rounded-3xl border border-gold-200/70 shadow-sm hover:shadow-lg hover:shadow-maroon/5 transition-shadow relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Keperluan Acara</span>
            <motion.div
              whileHover={{ rotate: -10, scale: 1.08 }}
              className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100"
            >
              <BookmarkCheck size={18} />
            </motion.div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-maroon font-serif tabular-nums">{totalItems}</span>
            <span className="text-xs font-medium text-gray-400">Item tercatat</span>
          </div>
          <div className="flex items-center flex-wrap gap-1.5 mt-3 text-[11px] font-semibold text-gray-500">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">{totalDone} Done</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">{totalDicicil} Dicicil</span>
            <span className="px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 border border-gray-100">{totalBelum} Belum</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 font-medium">
            Lamaran ({stats.totalLamaran}) • Pernikahan ({stats.totalPernikahan})
          </p>
        </motion.div>

        {/* Card 3: Guest Estimation */}
        <motion.div
          whileHover={cardHoverSpring}
          className="bg-white p-6 rounded-3xl border border-gold-200/70 shadow-sm hover:shadow-lg hover:shadow-maroon/5 transition-shadow relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Estimasi Tamu</span>
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100"
            >
              <Users size={18} />
            </motion.div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-maroon font-serif tabular-nums">{stats.totalTamuPax}</span>
            <span className="text-xs font-medium text-gray-400">Total Pax</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mt-3 flex overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: `${stats.totalTamuPax > 0 ? (stats.tamuFikriPax / stats.totalTamuPax) * 100 : 50}%` }}
              transition={{ type: 'spring', stiffness: 70, damping: 18, delay: 0.25 }}
              className="bg-blue-500 h-2"
              title={`Fikri: ${stats.tamuFikriPax} Pax`}
            />
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: `${stats.totalTamuPax > 0 ? (stats.tamuNadyaPax / stats.totalTamuPax) * 100 : 50}%` }}
              transition={{ type: 'spring', stiffness: 70, damping: 18, delay: 0.3 }}
              className="bg-rose-400 h-2"
              title={`Nadya: ${stats.tamuNadyaPax} Pax`}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-gray-400 mt-2 font-bold uppercase">
            <span>Fikri: {stats.tamuFikriPax} Pax</span>
            <span>Nadya: {stats.tamuNadyaPax} Pax</span>
          </div>
        </motion.div>

        {/* Card 4: Moodboard & Ideas */}
        <motion.div
          whileHover={cardHoverSpring}
          className="bg-white p-6 rounded-3xl border border-gold-200/70 shadow-sm hover:shadow-lg hover:shadow-maroon/5 transition-shadow relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Papan Inspirasi</span>
            <motion.div
              whileHover={{ rotate: 15, scale: 1.08 }}
              className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100"
            >
              <Lightbulb size={18} />
            </motion.div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-maroon font-serif tabular-nums">{stats.totalIdeas}</span>
            <span className="text-xs font-medium text-gray-400">Ide & Konsep</span>
          </div>
          <div className="flex items-center space-x-2 mt-3">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
              <CheckCircle2 size={11} />
              <span>{stats.approvedIdeas} Disetujui</span>
            </span>
            <span className="text-[11px] text-gray-400 font-medium">
              {stats.totalIdeas - stats.approvedIdeas} Sedang dibahas
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2.5 font-medium truncate">
            Diskusikan dekor, busana, & tema
          </p>
        </motion.div>

      </motion.div>

      {/* 3. MAIN BENTO GRID (Detailed Progress & Couple Space) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Preparation Progress & Quick Actions (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card: Status Kesiapan Persiapan (Lamaran vs Pernikahan) */}
          <motion.div
            variants={sectionItemVariants}
            className="bg-white p-6 sm:p-8 rounded-3xl border border-gold-200/70 shadow-sm space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-maroon">Progress Kesiapan Acara</h2>
                <p className="text-xs text-gray-400 mt-0.5">Pantau status penyelesaian item tanpa beban angka biaya</p>
              </div>

              {/* Sliding Tab Selector powered by Motion layoutId */}
              <div className="flex items-center p-1 bg-gray-50 rounded-xl border border-gray-200/80 self-start sm:self-auto text-xs font-bold relative">
                {prepTabs.map((tab) => {
                  const isActive = prepTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setPrepTab(tab.key)}
                      className={`relative px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer z-10 ${
                        isActive ? 'text-gold' : 'text-gray-500 hover:text-maroon'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="dashboardPrepTabPill"
                          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                          className="absolute inset-0 bg-maroon rounded-lg shadow-sm -z-10"
                        />
                      )}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual Breakdown Bar with Spring Transitions */}
            <div className="space-y-4">
              <div className="w-full h-4 bg-gray-100 rounded-full flex overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${donePct}%` }}
                  transition={{ type: 'spring', stiffness: 90, damping: 20 }}
                  className="bg-emerald-500 h-full"
                  title={`Selesai: ${currentDone}`}
                />
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${dicicilPct}%` }}
                  transition={{ type: 'spring', stiffness: 90, damping: 20 }}
                  className="bg-amber-400 h-full"
                  title={`Dicicil: ${currentDicicil}`}
                />
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${belumPct}%` }}
                  transition={{ type: 'spring', stiffness: 90, damping: 20 }}
                  className="bg-rose-300 h-full"
                  title={`Belum Terbeli: ${currentBelum}`}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={prepTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2"
                >
                  <motion.div
                    whileHover={{ y: -2, scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                    className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col justify-between"
                  >
                    <div className="flex items-center space-x-1.5 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Selesai (Done)</span>
                    </div>
                    <p className="text-2xl font-serif font-bold text-emerald-900 mt-2 tabular-nums">
                      {currentDone} <span className="text-xs font-sans font-medium text-emerald-700">item</span>
                    </p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1">{Math.round(donePct)}% terselesaikan</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2, scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                    className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 flex flex-col justify-between"
                  >
                    <div className="flex items-center space-x-1.5 text-amber-800 text-[11px] font-bold uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <span>Sedang Dicicil</span>
                    </div>
                    <p className="text-2xl font-serif font-bold text-amber-900 mt-2 tabular-nums">
                      {currentDicicil} <span className="text-xs font-sans font-medium text-amber-700">item</span>
                    </p>
                    <p className="text-[10px] text-amber-600 font-semibold mt-1">{Math.round(dicicilPct)}% proses berjalan</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2, scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                    className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100 flex flex-col justify-between"
                  >
                    <div className="flex items-center space-x-1.5 text-rose-800 text-[11px] font-bold uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                      <span>Belum Selesai</span>
                    </div>
                    <p className="text-2xl font-serif font-bold text-rose-900 mt-2 tabular-nums">
                      {currentBelum} <span className="text-xs font-sans font-medium text-rose-700">item</span>
                    </p>
                    <p className="text-[10px] text-rose-600 font-semibold mt-1">{Math.round(belumPct)}% perlu dipersiapkan</p>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Quick jump to tables */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <motion.button
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/lamaran')}
                className="text-xs font-bold text-maroon hover:text-gold-700 flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <span>Buka Keperluan Lamaran</span>
                <ChevronRight size={14} />
              </motion.button>
              <span className="text-gray-300">•</span>
              <motion.button
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/pernikahan')}
                className="text-xs font-bold text-maroon hover:text-gold-700 flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <span>Buka Keperluan Pernikahan</span>
                <ChevronRight size={14} />
              </motion.button>
            </div>
          </motion.div>

          {/* Card: Quick Actions Bar (Jalan Pintas Cepat) */}
          <motion.div
            variants={sectionItemVariants}
            className="bg-gradient-to-br from-gold-50/70 via-white to-gold-50/30 p-6 sm:p-7 rounded-3xl border border-gold-200/80 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-serif font-bold text-maroon">Jalan Pintas Cepat</h3>
              <span className="text-[11px] text-gray-400 font-medium">Akses langsung fitur utama</span>
            </div>

            {/* Reception Desk & Public RSVP Banner */}
            <motion.div
              whileHover={{ scale: 1.008 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-maroon via-maroon-900 to-[#550B14] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md relative overflow-hidden"
            >
              {/* Subtle Ambient Sheen */}
              <motion.div
                animate={{ opacity: [0.08, 0.2, 0.08], x: [-20, 20, -20] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-gold/25 blur-3xl pointer-events-none"
              />

              <div className="flex items-center space-x-3.5 relative z-10">
                <div className="w-11 h-11 rounded-xl bg-gold-400/20 border border-gold-400/30 flex items-center justify-center text-gold shrink-0">
                  <QrCode size={24} />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-gold-200">Buku Tamu Digital & QR Check-in</h4>
                  <p className="text-xs text-amber-100/80 mt-0.5">Form pendaftaran tamu publik & scanner kehadiran di meja resepsi</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0 relative z-10">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    const url = `${window.location.origin}/#/guest-pass`;
                    navigator.clipboard.writeText(url);
                    toast.success('Link Form Tamu disalin!');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gold-200 text-xs font-bold border border-white/15 transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Copy size={13} />
                  <span>Salin Link Tamu</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate('/administrasi-tamu')}
                  className="px-4 py-2 rounded-xl bg-gold text-maroon hover:bg-gold-400 text-xs font-bold transition-colors shadow-sm flex items-center space-x-1 cursor-pointer"
                >
                  <span>Buka Meja Tamu</span>
                  <ChevronRight size={14} />
                </motion.button>
              </div>
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Daftar Tamu', sub: 'Tambah undangan', path: '/tamu', icon: Plus, color: 'bg-blue-50 text-blue-600' },
                { label: 'Papan Ide', sub: 'Tulis inspirasi baru', path: '/ideas', icon: Lightbulb, color: 'bg-amber-50 text-amber-600' },
                { label: 'Pesan Cinta', sub: 'Chat pasangan', path: '/messages', icon: Send, color: 'bg-rose-50 text-rose-600' },
                { label: 'Doa & Amalan', sub: 'Penenang hati', path: '/prayers', icon: Heart, color: 'bg-emerald-50 text-emerald-600' },
              ].map((item) => (
                <motion.button
                  key={item.path}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                  onClick={() => navigate(item.path)}
                  className="p-3.5 bg-white hover:bg-gold-50/70 rounded-2xl border border-gold-200/80 text-left transition-colors shadow-sm hover:shadow-md group cursor-pointer"
                >
                  <div className={`w-8 h-8 rounded-xl ${item.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                    <item.icon size={16} />
                  </div>
                  <p className="text-xs font-bold text-maroon-900 leading-snug">{item.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>

        </div>

        {/* RIGHT COLUMN: Recent Interactions & Couple Space (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Card: Couple Private Message Preview */}
          <motion.div
            variants={sectionItemVariants}
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="bg-white p-6 rounded-3xl border border-gold-200/70 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-bold text-maroon">Pesan untuk {partnerName}</h3>
                  <p className="text-[10px] text-gray-400">Ruang obrolan pribadi</p>
                </div>
              </div>
              {stats.unreadMessages > 0 && (
                <motion.span
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold"
                >
                  {stats.unreadMessages} baru
                </motion.span>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-[#faf7f2] border border-gold-100 text-xs space-y-1.5">
              {stats.latestMessage ? (
                <>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    <span>{stats.latestMessage.sender_email?.split('@')[0]}</span>
                    <span>{new Date(stats.latestMessage.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-gray-700 italic line-clamp-2">
                    "{stats.latestMessage.content}"
                  </p>
                </>
              ) : (
                <p className="text-gray-400 italic text-center py-2">
                  Belum ada pesan. Yuk kirim ide atau ucapan cinta ke {partnerName}!
                </p>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
              onClick={() => navigate('/messages')}
              className="w-full py-2.5 bg-maroon hover:bg-maroon-800 text-gold text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-colors shadow-sm cursor-pointer group"
            >
              <span>Buka Ruang Pesan</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </motion.div>

          {/* Card: Aktivitas Terkini (Activity Feed) */}
          <motion.div
            variants={sectionItemVariants}
            className="bg-white p-6 rounded-3xl border border-gold-200/70 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <History size={16} className="text-gold-700" />
                <h3 className="text-sm font-serif font-bold text-maroon">Aktivitas Terkini</h3>
              </div>
              <motion.button
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/logs')}
                className="text-[11px] font-bold text-gold-700 hover:text-maroon transition-colors cursor-pointer"
              >
                Lihat Semua
              </motion.button>
            </div>

            <div className="space-y-3.5">
              {(stats.recentLogs || []).map((log: any, idx: number) => {
                const userInitial = log.user_email ? log.user_email.charAt(0).toUpperCase() : 'U';
                const userName = log.user_email ? log.user_email.split('@')[0] : 'User';
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.3), type: 'spring', stiffness: 300, damping: 24 }}
                    whileHover={{ x: 4 }}
                    className="flex items-start space-x-3 text-xs cursor-default"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gold-50 border border-gold-200 text-maroon font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {userInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-700 leading-snug">
                        <span className="font-bold text-maroon uppercase text-[11px]">{userName}</span>{' '}
                        <span className="text-gray-600">{log.detail}</span>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                        {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}

              {stats.recentLogs.length === 0 && (
                <p className="text-xs text-gray-400 italic text-center py-4">Belum ada aktivitas tercatat.</p>
              )}
            </div>
          </motion.div>

          {/* Card: Doa Hari Ini */}
          <motion.div
            variants={sectionItemVariants}
            whileHover={{ y: -3, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 340, damping: 24 }}
            className="bg-gradient-to-br from-[#800000] to-[#5a0000] text-white p-6 rounded-3xl shadow-md border border-gold-400/30 relative overflow-hidden space-y-3"
          >
            <motion.div
              animate={{ opacity: [0.12, 0.25, 0.12], scale: [1, 1.12, 1] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full bg-gold/25 blur-2xl pointer-events-none"
            />
            <div className="flex items-center space-x-2 text-gold-200 text-xs font-bold uppercase tracking-wider relative z-10">
              <Sparkles size={14} className="text-gold" />
              <span>Doa Harian Kita</span>
            </div>
            <p className="text-xs font-serif italic text-gold-100 leading-relaxed relative z-10">
              "Rabbana hab lana min azwajina wa dzurriyyatina qurrata a'yunin waj'alna lil muttaqina imama."
            </p>
            <p className="text-[11px] text-white/80 font-light leading-relaxed relative z-10">
              Ya Tuhan kami, anugerahkanlah kepada kami pasangan dan keturunan sebagai penyenang hati, dan jadikanlah kami imam bagi orang-orang yang bertakwa.
            </p>
          </motion.div>

        </div>

      </div>

      {/* MODAL: Set Event Date */}
      <Modal 
        isOpen={isDateModalOpen} 
        onClose={() => setIsDateModalOpen(false)} 
        title={`Atur Tanggal Acara ${editingModule}`}
      >
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            Tentukan tanggal pelaksanaan <strong>{editingModule}</strong> agar sistem dapat menghitung hari countdown secara akurat untuk Fikri & Nadya.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
              Pilih Tanggal Acara
            </label>
            <div className="relative">
              <input 
                type="date" 
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-maroon font-bold outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10 shadow-inner"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsDateModalOpen(false)}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Batal
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleSaveDate}
              className="px-6 py-2.5 rounded-xl bg-maroon text-gold font-bold text-xs shadow-md hover:bg-maroon-800 transition-colors cursor-pointer"
            >
              Simpan Tanggal
            </motion.button>
          </div>
        </div>
      </Modal>

    </motion.div>
  );
};

export default Dashboard;
