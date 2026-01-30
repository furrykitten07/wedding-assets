
import React, { useState, useEffect } from 'react';
import { supabase, logActivity } from '../supabase';
import { Income } from '../types';
import { Plus, Wallet, Search, Trash2, Edit2, Calendar, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatRupiah } from '../utils/formatter';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

const IncomeList: React.FC<{ userEmail: string }> = ({ userEmail }) => {
  const [data, setData] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  // Pagination States
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const [formData, setFormData] = useState({
    nama: '',
    nominal: 0,
    tanggal: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase.from('pendapatan').select('*', { count: 'exact' });
      if (searchTerm) query = query.ilike('nama', `%${searchTerm}%`);
      
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data: res, count, error } = await query
        .order('tanggal', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setData(res || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm, page, pageSize]);

  const handleOpenModal = (income?: Income) => {
    if (income) {
        setEditingIncome(income);
        setFormData({
            nama: income.nama,
            nominal: income.nominal,
            tanggal: income.tanggal
        });
    } else {
        setEditingIncome(null);
        setFormData({ 
            nama: '', 
            nominal: 0, 
            tanggal: new Date().toISOString().split('T')[0] 
        });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingIncome) {
        await supabase.from('pendapatan').update(formData).eq('id', editingIncome.id);
        logActivity(userEmail, 'update', 'Pendapatan', `Update dana: ${formData.nama} (${formatRupiah(formData.nominal)})`);
        toast.success('Tabungan diperbarui!');
      } else {
        await supabase.from('pendapatan').insert([{ ...formData, created_by: userEmail }]);
        logActivity(userEmail, 'create', 'Pendapatan', `Tambah dana: ${formData.nama} (${formatRupiah(formData.nominal)})`);
        toast.success('Tabungan berhasil dicatat!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus catatan dana: ${name}?`)) return;
    try {
      await supabase.from('pendapatan').delete().eq('id', id);
      toast.success('Catatan dana dihapus');
      logActivity(userEmail, 'delete', 'Pendapatan', `Hapus dana: ${name}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const total = data.reduce((acc, curr) => acc + curr.nominal, 0);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-maroon">Tabungan Kita</h1>
          <p className="text-gray-500 mt-1 uppercase text-[10px] tracking-[0.3em] font-black">Dana Persiapan Pernikahan</p>
        </div>
        <div className="bg-emerald-50 border-4 border-emerald-200 px-10 py-6 rounded-[2.5rem] flex items-center space-x-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/50 rounded-full -mr-12 -mt-12"></div>
          <Wallet className="text-emerald-600 relative z-10" size={40} />
          <div className="relative z-10">
            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em]">Total Saldo Tabungan</p>
            <p className="text-4xl font-black text-emerald-800 leading-none">{formatRupiah(total)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-white p-6 rounded-3xl border-2 border-gold-200 shadow-lg grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" placeholder="Cari sumber dana..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 bg-white rounded-xl outline-none font-bold text-maroon shadow-inner focus:border-maroon transition-all"
              value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            />
          </div>
          <select className="px-4 py-3 border-2 border-gold-200 bg-white rounded-xl outline-none font-bold text-maroon shadow-sm" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}>
                <option value={20}>TAMPIL 20 DATA</option>
                <option value={30}>TAMPIL 30 DATA</option>
                <option value={50}>TAMPIL 50 DATA</option>
            </select>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-maroon text-gold px-10 py-4 rounded-[1.5rem] flex items-center justify-center space-x-3 font-black shadow-2xl border-4 border-gold-400 hover:bg-maroon-900 transition-all active:scale-95">
          <Plus size={24} />
          <span className="uppercase tracking-widest text-sm">Tambah Dana</span>
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border-2 border-gold-200 shadow-2xl overflow-hidden animate-slide-up">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-maroon-900 text-gold font-serif border-b border-gold-400">
              <th className="px-6 py-5 uppercase text-[10px] tracking-widest font-black">Sumber / Keterangan</th>
              <th className="px-6 py-5 uppercase text-[10px] tracking-widest font-black text-center">Nominal</th>
              <th className="px-6 py-5 uppercase text-[10px] tracking-widest font-black text-center">Tanggal</th>
              <th className="px-6 py-5 uppercase text-[10px] tracking-widest font-black text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="py-20 text-center font-bold text-maroon">Memuat Catatan Tabungan...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={4} className="py-20 text-center italic text-gray-400">Belum ada dana masuk tercatat.</td></tr>
            ) : data.map(item => (
              <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                <td className="px-6 py-6">
                  <div className="font-black text-maroon-900 text-lg">{item.nama}</div>
                  <div className="text-[10px] text-gold-700 font-black uppercase tracking-[0.2em]">{item.created_by.split('@')[0]}</div>
                </td>
                <td className="px-6 py-6 text-center font-mono text-2xl font-black text-emerald-700">
                  {formatRupiah(item.nominal)}
                </td>
                <td className="px-6 py-6 text-center">
                  <div className="inline-flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                    <Calendar size={16} className="text-maroon" />
                    <span className="text-sm font-bold text-maroon-900">{new Date(item.tanggal).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
                  </div>
                </td>
                <td className="px-6 py-6 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <button onClick={() => handleOpenModal(item)} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 shadow-sm transition-all">
                        <Edit2 size={20} />
                    </button>
                    <button onClick={() => handleDelete(item.id, item.nama)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 shadow-sm transition-all">
                        <Trash2 size={20} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PAGINATION FOOTER */}
        <div className="bg-maroon-900 px-8 py-5 flex items-center justify-between border-t border-gold-400">
          <div className="text-xs font-black text-gold uppercase tracking-[0.2em]">Menampilkan {data.length} dari {totalCount} catatan dana</div>
          <div className="flex items-center space-x-4">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-2 bg-maroon text-gold rounded-xl border border-gold-600 disabled:opacity-30 hover:bg-maroon-800 transition-all shadow-lg active:scale-90"><ChevronLeft size={20} /></button>
            <span className="text-sm font-black text-gold uppercase tracking-widest px-4 border-x border-gold/30">Halaman {page + 1}</span>
            <button disabled={(page + 1) * pageSize >= totalCount} onClick={() => setPage(p => p + 1)} className="p-2 bg-maroon text-gold rounded-xl border border-gold-600 disabled:opacity-30 hover:bg-maroon-800 transition-all shadow-lg active:scale-90"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingIncome ? 'Edit' : 'Tambah'} Catatan Tabungan`}>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-black text-maroon uppercase tracking-widest ml-1">Keterangan / Sumber Dana</label>
              <input 
                required type="text" placeholder="Misal: Bonus Tahunan Nadya"
                className="w-full px-5 py-4 border-2 border-maroon-100 bg-white rounded-2xl font-black text-maroon shadow-sm outline-none focus:border-maroon transition-all"
                value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-maroon uppercase tracking-widest ml-1">Nominal (Rp)</label>
              <input 
                required type="number" className="w-full px-5 py-4 border-2 border-maroon-100 bg-white rounded-2xl font-black text-maroon text-xl shadow-sm outline-none focus:border-maroon transition-all"
                value={formData.nominal} onChange={e => setFormData({...formData, nominal: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-maroon uppercase tracking-widest ml-1">Tanggal Terima</label>
              <input 
                required type="date" className="w-full px-5 py-4 border-2 border-maroon-100 bg-white rounded-2xl font-black text-maroon shadow-sm outline-none focus:border-maroon transition-all"
                value={formData.tanggal} onChange={e => setFormData({...formData, tanggal: e.target.value})}
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-maroon text-gold py-5 rounded-3xl font-black shadow-2xl border-4 border-gold-400 uppercase tracking-[0.3em] hover:bg-maroon-900 transition-all flex items-center justify-center space-x-3 active:scale-95">
            <Save size={24} />
            <span>Simpan Catatan Dana</span>
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default IncomeList;
