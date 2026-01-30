
import React, { useState, useEffect } from 'react';
import { supabase, logActivity } from '../supabase';
import { Guest } from '../types';
import { Plus, Search, Trash2, Edit2, UserPlus, Users, Save, MessageCircle, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

const GuestList: React.FC<{ userEmail: string }> = ({ userEmail }) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPihak, setFilterPihak] = useState('all');
  const [filterKategori, setFilterKategori] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  // Pagination States
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const [formData, setFormData] = useState({
    nama_tamu: '', no_whatsapp: '', pihak: 'Fikri' as 'Fikri' | 'Nadya', kategori: 'Teman Kerja', membawa_pasangan: false, jumlah_tambahan: 0
  });

  const categories = [
    'Teman Kerja', 'Teman Kuliah', 'Teman SMA', 'Teman SMP', 'Teman SD', 'Teman TK', 
    'Teman Organisasi', 'Teman Komplek Rumah', 'Keluarga Besar', 'Keluarga Inti'
  ];

  const fetchGuests = async () => {
    setLoading(true);
    try {
      let query = supabase.from('tamu').select('*', { count: 'exact' });
      if (searchTerm) query = query.ilike('nama_tamu', `%${searchTerm}%`);
      if (filterPihak !== 'all') query = query.eq('pihak', filterPihak);
      if (filterKategori !== 'all') query = query.eq('kategori', filterKategori);
      
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      setGuests(data || []);
      setTotalCount(count || 0);
    } catch (error: any) { toast.error(error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGuests(); }, [searchTerm, filterPihak, filterKategori, page, pageSize]);

  const handleOpenModal = (guest?: Guest) => {
    if (guest) {
      setEditingGuest(guest);
      setFormData({
        nama_tamu: guest.nama_tamu, no_whatsapp: guest.no_whatsapp || '', pihak: guest.pihak, kategori: guest.kategori, membawa_pasangan: guest.membawa_pasangan, jumlah_tambahan: guest.jumlah_tambahan
      });
    } else {
      setEditingGuest(null);
      setFormData({ nama_tamu: '', no_whatsapp: '', pihak: 'Fikri', kategori: 'Teman Kerja', membawa_pasangan: false, jumlah_tambahan: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGuest) {
        const { error } = await supabase.from('tamu').update(formData).eq('id', editingGuest.id);
        if (error) throw error;
        logActivity(userEmail, 'update', 'Tamu', `Update tamu: ${formData.nama_tamu}`);
      } else {
        const { error } = await supabase.from('tamu').insert([formData]);
        if (error) throw error;
        logActivity(userEmail, 'create', 'Tamu', `Tambah tamu: ${formData.nama_tamu}`);
      }
      setIsModalOpen(false);
      fetchGuests();
      toast.success('Daftar tamu diperbarui!');
    } catch (err: any) {
      toast.error('Gagal simpan tamu: ' + err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus tamu: ${name}?`)) return;
    try {
      const { error } = await supabase.from('tamu').delete().eq('id', id);
      if (error) throw error;
      logActivity(userEmail, 'delete', 'Tamu', `Hapus tamu: ${name}`);
      await fetchGuests();
      toast.success('Tamu berhasil dihapus!');
    } catch (err: any) {
      toast.error('Gagal hapus tamu: ' + err.message);
    }
  };

  const totalPax = guests.reduce((acc, curr) => acc + (1 + (curr.membawa_pasangan ? curr.jumlah_tambahan : 0)), 0);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-serif font-bold text-maroon">Daftar Tamu</h1>
            <p className="text-gray-500 mt-1 uppercase text-[10px] tracking-[0.3em] font-black">List Undangan Pernikahan</p>
        </div>
        <div className="flex space-x-3">
          <div className="bg-white px-8 py-4 rounded-[1.5rem] flex items-center space-x-3 shadow-xl border-2 border-gold-200">
            <Users className="text-maroon" size={24} />
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Estimasi</p>
              <p className="text-3xl font-black text-maroon leading-none">{totalPax} <span className="text-xs font-serif text-gold-700">Pax</span></p>
            </div>
          </div>
          <button onClick={() => handleOpenModal()} className="bg-maroon hover:bg-maroon-800 text-gold px-8 py-4 rounded-[1.5rem] flex items-center space-x-3 shadow-xl border-4 border-gold-400 group transition-all">
            <UserPlus size={24} className="group-hover:rotate-12 transition-transform" />
            <span className="font-black uppercase tracking-widest text-sm">Tambah Tamu</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border-2 border-gold-200 shadow-lg grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Cari nama tamu..." className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 bg-white rounded-xl outline-none font-bold text-maroon shadow-inner" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(0); }} />
        </div>
        <select className="px-4 py-3 border-2 border-gray-100 bg-white rounded-xl outline-none font-bold text-maroon shadow-sm" value={filterPihak} onChange={e => { setFilterPihak(e.target.value); setPage(0); }}>
          <option value="all">SEMUA PIHAK</option><option value="Fikri">PIHAK FIKRI</option><option value="Nadya">PIHAK NADYA</option>
        </select>
        <select className="px-4 py-3 border-2 border-gray-100 bg-white rounded-xl outline-none font-bold text-maroon shadow-sm" value={filterKategori} onChange={e => { setFilterKategori(e.target.value); setPage(0); }}>
          <option value="all">SEMUA KATEGORI</option>{categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
        </select>
        <select className="px-4 py-3 border-2 border-gold-200 bg-white rounded-xl outline-none font-bold text-maroon shadow-sm" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}>
            <option value={20}>20 DATA</option>
            <option value={30}>30 DATA</option>
            <option value={50}>50 DATA</option>
        </select>
      </div>

      <div className="bg-white rounded-[2.5rem] border-2 border-gold-200 shadow-2xl overflow-hidden animate-slide-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-maroon text-gold font-serif">
                <th className="px-6 py-5 uppercase text-[10px] tracking-[0.2em] font-black">Nama Tamu</th>
                <th className="px-6 py-5 uppercase text-[10px] tracking-[0.2em] font-black">Pihak</th>
                <th className="px-6 py-5 uppercase text-[10px] tracking-[0.2em] font-black text-center">Pax</th>
                <th className="px-6 py-5 uppercase text-[10px] tracking-[0.2em] font-black text-center">WA</th>
                <th className="px-6 py-5 uppercase text-[10px] tracking-[0.2em] font-black text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (<tr><td colSpan={5} className="text-center py-20 font-bold text-maroon">Memuat Daftar Tamu...</td></tr>) : guests.length === 0 ? (<tr><td colSpan={5} className="text-center py-20 italic text-gray-400">Belum ada tamu terdaftar.</td></tr>) : guests.map(guest => (
                <tr key={guest.id} className="hover:bg-gold-50/40 transition-colors">
                  <td className="px-6 py-6"><div className="font-black text-maroon-900 text-lg">{guest.nama_tamu}</div><div className="text-[10px] text-gold-700 font-black uppercase tracking-widest">{guest.kategori}</div></td>
                  <td className="px-6 py-6"><span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${guest.pihak === 'Fikri' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-pink-100 text-pink-800 border border-pink-200'}`}>{guest.pihak}</span></td>
                  <td className="px-6 py-6 text-center"><div className="inline-flex bg-maroon text-gold px-5 py-2 rounded-2xl font-black shadow-lg ring-2 ring-gold-200">{1 + (guest.membawa_pasangan ? guest.jumlah_tambahan : 0)}</div></td>
                  <td className="px-6 py-6 text-center">{guest.no_whatsapp ? <a href={`https://wa.me/${guest.no_whatsapp}`} target="_blank" className="inline-block p-3 bg-emerald-100 text-emerald-800 rounded-xl hover:bg-emerald-200 shadow-sm transition-all"><MessageCircle size={20} /></a> : '-'}</td>
                  <td className="px-6 py-6"><div className="flex items-center justify-center space-x-3"><button onClick={() => handleOpenModal(guest)} className="p-3 bg-gray-50 text-maroon rounded-xl hover:bg-gold-50 shadow-sm transition-all"><Edit2 size={18} /></button><button onClick={() => handleDelete(guest.id, guest.nama_tamu)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 shadow-sm transition-all"><Trash2 size={18} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-maroon-900 px-8 py-5 flex items-center justify-between border-t border-gold-400">
          <div className="text-xs font-black text-gold uppercase tracking-[0.2em]">Menampilkan {guests.length} dari {totalCount} tamu terdaftar</div>
          <div className="flex items-center space-x-4">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-2 bg-maroon text-gold rounded-xl border border-gold-600 disabled:opacity-30 hover:bg-maroon-800 transition-all shadow-lg active:scale-90"><ChevronLeft size={20} /></button>
            <span className="text-sm font-black text-gold uppercase tracking-widest px-4 border-x border-gold/30">Halaman {page + 1}</span>
            <button disabled={(page + 1) * pageSize >= totalCount} onClick={() => setPage(p => p + 1)} className="p-2 bg-maroon text-gold rounded-xl border border-gold-600 disabled:opacity-30 hover:bg-maroon-800 transition-all shadow-lg active:scale-90"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingGuest ? 'Edit Data' : 'Daftarkan'} Tamu Undangan`}>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 space-y-1">
                <label className="text-xs font-black text-maroon uppercase tracking-widest ml-1">Nama Lengkap Tamu</label>
                <input required type="text" className="w-full px-5 py-4 border-2 border-maroon-100 bg-white rounded-2xl font-black text-maroon shadow-sm outline-none focus:border-maroon transition-all" value={formData.nama_tamu} onChange={e => setFormData({...formData, nama_tamu: e.target.value})} />
            </div>
            
            <div className="col-span-2 space-y-1">
                <label className="text-xs font-black text-maroon uppercase tracking-widest ml-1">Nomor WhatsApp</label>
                <input type="text" placeholder="62812xxxx" className="w-full px-5 py-4 border-2 border-maroon-100 bg-white rounded-2xl font-black text-maroon shadow-sm outline-none focus:border-maroon transition-all" value={formData.no_whatsapp} onChange={e => setFormData({...formData, no_whatsapp: e.target.value})} />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-black text-maroon uppercase tracking-widest ml-1">Pihak Pengundang</label>
                <select className="w-full px-5 py-4 border-2 border-maroon-100 bg-white rounded-2xl font-black text-maroon shadow-sm outline-none focus:border-maroon transition-all" value={formData.pihak} onChange={e => setFormData({...formData, pihak: e.target.value as any})}>
                    <option value="Fikri">FIKRI</option>
                    <option value="Nadya">NADYA</option>
                </select>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-black text-maroon uppercase tracking-widest ml-1">Kategori Relasi</label>
                <select className="w-full px-5 py-4 border-2 border-maroon-100 bg-white rounded-2xl font-black text-maroon shadow-sm outline-none focus:border-maroon transition-all" value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value})}>
                    {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
            </div>

            <div className="col-span-2 p-6 bg-gold-50 rounded-3xl border-4 border-gold-200 shadow-inner space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${formData.membawa_pasangan ? 'bg-maroon' : 'bg-gray-300'}`} onClick={() => setFormData({...formData, membawa_pasangan: !formData.membawa_pasangan})}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.membawa_pasangan ? 'left-7' : 'left-1'}`}></div>
                        </div>
                        <span className="text-sm font-black text-maroon uppercase tracking-widest">Membawa Pasangan/Keluarga?</span>
                    </div>
                    {formData.membawa_pasangan && (
                        <div className="flex items-center space-x-3 bg-white p-2 rounded-2xl border-2 border-gold-400">
                            <span className="text-[10px] font-black text-gray-400">TAMBAHAN:</span>
                            <input 
                              type="number" 
                              className="w-16 px-2 py-1 border-2 border-maroon-100 rounded-xl text-center font-black text-maroon text-lg bg-white" 
                              value={formData.jumlah_tambahan} 
                              onChange={e => setFormData({...formData, jumlah_tambahan: Math.max(0, Number(e.target.value))})} 
                            />
                            <span className="text-[10px] font-black text-gray-400">ORANG</span>
                        </div>
                    )}
                </div>
                {formData.membawa_pasangan && (
                    <div className="p-3 bg-white/50 rounded-xl border border-dashed border-gold-400 flex items-center space-x-2">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <p className="text-[11px] font-bold text-gray-600 italic">Total pax untuk tamu ini akan tercatat sebanyak <span className="text-maroon font-black">{1 + formData.jumlah_tambahan}</span> orang.</p>
                    </div>
                )}
            </div>
          </div>
          <button type="submit" className="w-full bg-maroon text-gold py-5 rounded-3xl font-black shadow-2xl border-4 border-gold-400 uppercase tracking-[0.3em] hover:bg-maroon-900 transition-all flex items-center justify-center space-x-3">
            <Save size={24} />
            <span>Simpan Data Tamu</span>
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default GuestList;
