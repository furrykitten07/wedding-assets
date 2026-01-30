
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { formatRupiah, formatDate } from '../utils/formatter';
import { Heart, Sparkles, Users, Wallet, TrendingUp, Calendar, History, ChevronRight, Clock } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalLamaran: 0,
    totalPernikahan: 0,
    totalTamu: 0,
    totalPendapatan: 0,
    recentLogs: [] as any[]
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const engagementDate = localStorage.getItem('event_date_Lamaran');
  const weddingDate = localStorage.getItem('event_date_Pernikahan');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user);

        const [lamaran, pernikahan, tamu, pendapatan, logs] = await Promise.all([
          supabase.from('lamaran_items').select('harga, qty, is_qty_enabled'),
          supabase.from('pernikahan_items').select('harga, qty, is_qty_enabled'),
          supabase.from('tamu').select('jumlah_tambahan'),
          supabase.from('pendapatan').select('nominal'),
          supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(5)
        ]) as any[];

        const calculateTotal = (data: any[]) => {
            return data?.reduce((acc, curr) => {
                const amount = curr.is_qty_enabled ? curr.harga * curr.qty : curr.harga;
                return acc + (amount || 0);
            }, 0) || 0;
        };

        const sumSimple = (arr: any[], key: string) => arr?.reduce((a, b) => a + (b[key] || 0), 0) || 0;

        setStats({
          totalLamaran: calculateTotal(lamaran.data || []),
          totalPernikahan: calculateTotal(pernikahan.data || []),
          totalTamu: (tamu.data?.length || 0) + sumSimple(tamu.data || [], 'jumlah_tambahan'),
          totalPendapatan: sumSimple(pendapatan.data || [], 'nominal'),
          recentLogs: logs.data || []
        });
      } finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  const getDaysDiff = (dateStr: string | null) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    target.setHours(0,0,0,0);
    const now = new Date();
    now.setHours(0,0,0,0);
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getGreeting = () => {
    const isFikri = user?.email?.toLowerCase().includes('fikri');
    return (
      <div className="animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-maroon leading-tight">
          Halo, <span className="text-gold">{isFikri ? 'Calon Suami Nadya' : 'Calon Istri Fikri'} ❤️</span>
        </h1>
        <p className="text-gray-500 mt-3 text-lg italic italic">Persiapkan hari bahagia kita dengan bismillah.</p>
      </div>
    );
  };

  const dataChart = [
    { name: 'Lamaran', value: stats.totalLamaran, color: '#800000' },
    { name: 'Pernikahan', value: stats.totalPernikahan, color: '#D4AF37' },
    { name: 'Sisa Dana', value: Math.max(0, stats.totalPendapatan - (stats.totalLamaran + stats.totalPernikahan)), color: '#10b981' }
  ];

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <div className="group bg-white p-6 rounded-[2.5rem] border-2 border-gold-100 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-gold-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`p-4 rounded-2xl ${color} shadow-lg shadow-inherit/20`}>
          <Icon size={24} className="text-white" />
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">{title}</p>
          <h3 className="text-2xl font-bold text-maroon-900 mt-1">
            {typeof value === 'number' && (title.includes('Budget') || title.includes('Dana')) ? formatRupiah(value) : value}
          </h3>
        </div>
      </div>
      {subtitle && <p className="text-xs text-gray-400 font-medium italic relative z-10">{subtitle}</p>}
    </div>
  );

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b-2 border-gold-200 pb-8">
        {getGreeting()}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
                { name: 'Lamaran', date: engagementDate, icon: Heart, color: 'text-rose-600' },
                { name: 'Pernikahan', date: weddingDate, icon: Sparkles, color: 'text-amber-500' }
            ].map((ev, i) => {
                const diff = getDaysDiff(ev.date);
                return (
                    <div key={i} className="bg-white px-6 py-4 rounded-[1.5rem] border-2 border-gold-200 shadow-lg flex items-center space-x-4">
                        <div className={`p-3 bg-gray-50 rounded-xl ${ev.color}`}><ev.icon size={24} /></div>
                        <div>
                            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{ev.name}</p>
                            <p className="text-maroon font-bold text-xs uppercase">
                                {ev.date ? new Date(ev.date).toLocaleDateString('id-ID', { dateStyle: 'full' }) : 'Belum Diatur'}
                            </p>
                            <p className="text-maroon-900 font-black text-lg">
                                {diff !== null ? (diff > 0 ? `${diff} HARI LAGI` : diff === 0 ? 'HARI INI! ❤️' : 'SELESAI ✨') : 'KLIK SET TANGGAL'}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Budget Lamaran" value={stats.totalLamaran} icon={Heart} color="bg-rose-700" subtitle="Total item tercatat" />
        <StatCard title="Budget Wedding" value={stats.totalPernikahan} icon={Sparkles} color="bg-amber-600" subtitle="Rencana biaya utama" />
        <StatCard title="Estimasi Tamu" value={stats.totalTamu} icon={Users} color="bg-indigo-700" subtitle="Total pax terdaftar" />
        <StatCard title="Dana Tabungan" value={stats.totalPendapatan} icon={Wallet} color="bg-emerald-700" subtitle="Saldo kita saat ini" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border-2 border-gold-100 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12"><TrendingUp size={150} /></div>
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div>
              <h2 className="text-2xl font-serif font-bold text-maroon">Pergerakan Keuangan</h2>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">Budget vs Saldo</p>
            </div>
          </div>
          <div className="h-[350px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#800000', fontSize: 12, fontWeight: '900'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 11}} tickFormatter={(val) => `Rp ${val/1000000}jt`} />
                <Tooltip cursor={{fill: '#fcf8f0'}} contentStyle={{ borderRadius: '20px', border: '1px solid #e9d9b1', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} formatter={(value: any) => [formatRupiah(value), '']} />
                <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={60}>
                  {dataChart.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-maroon-900 text-gold p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col border-4 border-gold-400">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <h2 className="text-xl font-serif font-bold mb-8 flex items-center space-x-3 border-b border-gold/40 pb-4">
             <History size={20} />
             <span>Aktivitas Terkini</span>
          </h2>
          <div className="space-y-6 flex-1 relative z-10">
            {stats.recentLogs.map((log: any) => (
              <div key={log.id} className="flex space-x-4 group/log">
                <div className="w-10 h-10 rounded-2xl bg-gold/10 flex items-center justify-center shrink-0 border border-gold/40 group-hover/log:bg-gold/30 transition-all">
                  <span className="text-xs font-black">{log.user_email.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gold-50 leading-snug">
                    <span className="font-black text-gold uppercase">{log.user_email.split('@')[0]}</span> {log.detail}
                  </p>
                  <p className="text-[10px] text-gold/50 mt-1 font-black uppercase tracking-widest">{new Date(log.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
            {stats.recentLogs.length === 0 && <p className="text-center italic text-gold/40 py-10">Belum ada aktivitas.</p>}
          </div>
          <button 
            onClick={() => navigate('/logs')}
            className="w-full mt-10 py-5 bg-gold text-maroon-900 rounded-3xl font-black text-xs tracking-[0.3em] uppercase hover:bg-white transition-all flex items-center justify-center space-x-3 shadow-lg"
          >
            <span>Semua Aktivitas</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
