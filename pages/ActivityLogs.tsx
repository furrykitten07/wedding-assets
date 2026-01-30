
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { ActivityLog } from '../types';
import { History, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [filterAksi, setFilterAksi] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase.from('activity_logs').select('*', { count: 'exact' });
      if (filterAksi !== 'all') query = query.eq('aksi', filterAksi);
      
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const { data, count } = await query.order('created_at', { ascending: false }).range(from, to);
      setLogs(data || []);
      setTotalCount(count || 0);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [page, pageSize, filterAksi]);

  const getAksiColor = (aksi: string) => {
    switch(aksi) {
      case 'create': return 'bg-green-600 text-white';
      case 'update': return 'bg-blue-600 text-white';
      case 'delete': return 'bg-red-600 text-white';
      case 'login': return 'bg-maroon text-gold';
      default: return 'bg-gray-600 text-white';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-maroon text-gold rounded-2xl shadow-lg border border-gold-200"><History size={28} /></div>
          <div><h1 className="text-3xl font-serif font-bold text-maroon">Log Aktivitas</h1><p className="text-gray-500">Audit transparan semua perubahan sistem</p></div>
        </div>
        <div className="flex space-x-3 items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tampil:</span>
            <select className="px-4 py-2 border border-gold-200 rounded-xl font-bold bg-white text-maroon shadow-sm" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}>
                <option value={20}>20 Data</option><option value={30}>30 Data</option><option value={50}>50 Data</option>
            </select>
            <select className="px-4 py-2 border border-gold-200 rounded-xl font-bold bg-white text-maroon shadow-sm" value={filterAksi} onChange={e => { setFilterAksi(e.target.value); setPage(0); }}>
                <option value="all">Semua Aksi</option><option value="create">Create</option><option value="update">Update</option><option value="delete">Delete</option><option value="login">Login</option>
            </select>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gold-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-maroon-900 text-gold font-serif border-b border-gold-200">
                <th className="px-6 py-5 uppercase text-[10px] tracking-widest">Waktu</th>
                <th className="px-6 py-5 uppercase text-[10px] tracking-widest">User</th>
                <th className="px-6 py-5 uppercase text-[10px] tracking-widest">Modul</th>
                <th className="px-6 py-5 uppercase text-[10px] tracking-widest">Aksi</th>
                <th className="px-6 py-5 uppercase text-[10px] tracking-widest">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (<tr><td colSpan={5} className="py-20 text-center text-gray-400">Loading log...</td></tr>) : logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-4 text-[10px] font-mono font-bold text-gray-400 uppercase">{new Date(log.created_at).toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4 font-bold text-maroon-900 text-sm uppercase">{log.user_email.split('@')[0]}</td>
                  <td className="px-6 py-4"><span className="text-xs font-bold text-gold-700 uppercase tracking-wider">{log.modul}</span></td>
                  <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm ${getAksiColor(log.aksi)}`}>{log.aksi}</span></td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-medium">{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="bg-maroon-900 px-8 py-5 flex items-center justify-between border-t border-gold-400">
          <div className="text-xs font-black text-gold uppercase tracking-[0.2em]">Menampilkan {logs.length} dari {totalCount} aktivitas</div>
          <div className="flex items-center space-x-4">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-2 bg-maroon text-gold rounded-xl border border-gold-600 disabled:opacity-30 hover:bg-maroon-800 transition-all shadow-lg active:scale-90"><ChevronLeft size={20} /></button>
            <span className="text-sm font-black text-gold uppercase tracking-widest px-4 border-x border-gold/30">Halaman {page + 1}</span>
            <button disabled={(page + 1) * pageSize >= totalCount} onClick={() => setPage(p => p + 1)} className="p-2 bg-maroon text-gold rounded-xl border border-gold-600 disabled:opacity-30 hover:bg-maroon-800 transition-all shadow-lg active:scale-90"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogs;
