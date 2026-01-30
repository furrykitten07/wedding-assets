
import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, ArrowUpDown, Edit2, Trash2, 
  FileText, Image as ImageIcon, Save, MessageCircle, MapPin, Instagram, Calendar, X, Eye, ShoppingBag, ChevronLeft, ChevronRight, Loader2, Link as LinkIcon
} from 'lucide-react';
import { BudgetItem, ItemCategory, ItemStatus } from '../types';
import { supabase, logActivity, uploadFile } from '../supabase';
import { formatRupiah } from '../utils/formatter';
import toast from 'react-hot-toast';
import Modal from './Modal';

interface BudgetTableProps {
  moduleName: 'Lamaran' | 'Pernikahan';
  tableName: 'lamaran_items' | 'pernikahan_items';
  userEmail: string;
}

const BudgetTable: React.FC<BudgetTableProps> = ({ moduleName, tableName, userEmail }) => {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [eventDate, setEventDate] = useState<string>(localStorage.getItem(`event_date_${moduleName}`) || '');
  
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    nama_keperluan: '', kategori: ItemCategory.BARANG, harga: 0, qty: 1, is_qty_enabled: false,
    status: ItemStatus.BELUM_TERBELI, deskripsi: '', foto_urls: [] as string[], pdf_url: '',
    wa_admin: '', link_sosmed: '', link_gmaps: '', link_belanja: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase.from(tableName).select('*', { count: 'exact' });
      
      if (searchTerm) query = query.ilike('nama_keperluan', `%${searchTerm}%`);
      if (filterCategory !== 'all') query = query.eq('kategori', filterCategory);
      if (filterStatus !== 'all') query = query.eq('status', filterStatus);
      
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, count } = await query
        .order('harga', { ascending: sortOrder === 'asc' })
        .range(from, to);

      setItems(data || []);
      setTotalCount(count || 0);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [tableName, searchTerm, filterCategory, filterStatus, sortOrder, page, pageSize]);

  const handleSetEventDate = (date: string) => {
    setEventDate(date);
    localStorage.setItem(`event_date_${moduleName}`, date);
    logActivity(userEmail, 'update', 'Settings', `Mengatur tanggal ${moduleName} ke ${date}`);
    toast.success(`Tanggal ${moduleName} disimpan!`);
  };

  const handleOpenModal = (item?: BudgetItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        nama_keperluan: item.nama_keperluan, kategori: item.kategori, harga: item.harga, qty: item.qty || 1, 
        is_qty_enabled: item.is_qty_enabled || false, status: item.status, deskripsi: item.deskripsi || '',
        foto_urls: item.foto_urls || [], pdf_url: item.pdf_url || '', wa_admin: item.wa_admin || '',
        link_sosmed: item.link_sosmed || '', link_gmaps: item.link_gmaps || '', link_belanja: item.link_belanja || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        nama_keperluan: '', kategori: ItemCategory.BARANG, harga: 0, qty: 1, is_qty_enabled: false,
        status: ItemStatus.BELUM_TERBELI, deskripsi: '', foto_urls: [], pdf_url: '',
        wa_admin: '', link_sosmed: '', link_gmaps: '', link_belanja: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'img' | 'pdf') => {
    // Fix: Explicitly cast files to File[] to resolve 'unknown' type error
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    toast.loading(`Mengupload ${type.toUpperCase()}...`, { id: 'upload' });
    try {
      if (type === 'pdf') {
        const url = await uploadFile(files[0], 'docs');
        setFormData(prev => ({ ...prev, pdf_url: url }));
        toast.success("PDF Berhasil diupload!", { id: 'upload' });
      } else {
        const urls = await Promise.all(files.slice(0, 5 - formData.foto_urls.length).map(f => uploadFile(f, 'photos')));
        setFormData(prev => ({ ...prev, foto_urls: [...prev.foto_urls, ...urls] }));
        toast.success("Foto Berhasil diupload!", { id: 'upload' });
      }
    } catch (err) {
      toast.error("Gagal upload. Pastikan bucket 'wedding-assets' sudah Public.", { id: 'upload' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingItem) {
        const { error } = await supabase.from(tableName).update({ ...formData, updated_at: new Date().toISOString() }).eq('id', editingItem.id);
        if (error) throw error;
        logActivity(userEmail, 'update', moduleName, `Edit item: ${formData.nama_keperluan}`);
      } else {
        const { error } = await supabase.from(tableName).insert([{ ...formData, created_by: userEmail }]);
        if (error) throw error;
        logActivity(userEmail, 'create', moduleName, `Tambah item: ${formData.nama_keperluan}`);
      }
      setIsModalOpen(false);
      fetchData();
      toast.success('Data tersimpan di modul ' + moduleName);
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus ${name}?`)) return;
    try {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
      logActivity(userEmail, 'delete', moduleName, `Hapus item: ${name}`);
      await fetchData();
      toast.success('Item berhasil dihapus!');
    } catch (err: any) {
      toast.error('Gagal menghapus: ' + err.message);
    }
  };

  const getStatusBadge = (status: ItemStatus) => {
    switch(status) {
      case ItemStatus.DONE: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case ItemStatus.DICICIL: return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-rose-50 text-rose-900 border-rose-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header logic remains same */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-serif font-bold text-maroon">Daftar {moduleName}</h2>
          <p className="text-gray-500 mt-1 uppercase tracking-widest text-[10px] font-bold">Kelola Anggaran & Persiapan</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-2xl border border-gold-300 shadow-md">
                <Calendar size={18} className="text-maroon" />
                <span className="text-[10px] font-bold uppercase text-gray-500">Tgl Acara:</span>
                <input type="date" className="text-sm font-bold text-maroon outline-none bg-white p-1 rounded" value={eventDate} onChange={(e) => handleSetEventDate(e.target.value)} />
            </div>
            <button onClick={() => handleOpenModal()} className="w-full md:w-auto bg-maroon hover:bg-maroon-800 text-gold px-8 py-4 rounded-2xl flex items-center justify-center space-x-2 shadow-xl border border-gold-400 transition-all active:scale-95">
              <Plus size={20} /><span className="font-bold uppercase tracking-widest text-sm">Tambah Item</span>
            </button>
        </div>
      </div>

      {/* Filters logic remains same */}
      <div className="bg-white p-6 rounded-3xl border border-gold-200 shadow-lg grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Cari keperluan..." className="w-full pl-10 pr-4 py-3 border border-gray-200 bg-white rounded-xl outline-none font-medium text-maroon shadow-inner" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(0); }} />
        </div>
        <select className="md:col-span-2 px-4 py-3 border border-gray-200 bg-white rounded-xl outline-none font-bold text-maroon shadow-sm" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(0); }}>
          <option value="all">KATEGORI</option>
          {Object.values(ItemCategory).map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
        </select>
        <select className="md:col-span-2 px-4 py-3 border border-gray-200 bg-white rounded-xl outline-none font-bold text-maroon shadow-sm" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0); }}>
          <option value="all">STATUS</option>
          {Object.values(ItemStatus).map(st => <option key={st} value={st}>{st.toUpperCase()}</option>)}
        </select>
        <select className="md:col-span-2 px-4 py-3 border border-gold-200 bg-white rounded-xl outline-none font-bold text-maroon shadow-sm" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}>
            <option value={20}>20 DATA</option>
            <option value={30}>30 DATA</option>
            <option value={50}>50 DATA</option>
        </select>
        <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="md:col-span-2 flex items-center justify-between px-4 py-3 border border-gold-200 bg-white rounded-xl hover:bg-gold-50 transition-all font-bold text-maroon">
          <span className="text-xs">URUT HARGA</span><ArrowUpDown size={16} className={sortOrder === 'asc' ? 'rotate-180' : ''} />
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gold-200 shadow-2xl overflow-hidden animate-slide-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-maroon-900 text-gold border-b border-gold-400 font-serif">
                <th className="px-6 py-5 uppercase text-[10px] tracking-widest">Kebutuhan</th>
                <th className="px-6 py-5 uppercase text-[10px] tracking-widest text-center">Status</th>
                <th className="px-6 py-5 uppercase text-[10px] tracking-widest text-center">Qty</th>
                <th className="px-6 py-5 uppercase text-[10px] tracking-widest text-center">Total</th>
                <th className="px-6 py-5 uppercase text-[10px] tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (<tr><td colSpan={5} className="py-20 text-center font-bold text-maroon">Memuat Keperluan...</td></tr>) : items.length === 0 ? (<tr><td colSpan={5} className="py-20 text-center italic text-gray-400">Belum ada data.</td></tr>) : items.map((item) => (
                <tr key={item.id} className="hover:bg-gold-50/30 transition-colors">
                  <td className="px-6 py-5">
                    <div className="font-bold text-maroon-900 text-lg">{item.nama_keperluan}</div>
                    <div className="text-[10px] text-gold-700 font-bold uppercase tracking-wider">{item.kategori}</div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusBadge(item.status)}`}>
                        {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center font-bold text-maroon">{item.is_qty_enabled ? item.qty : '1'}</td>
                  <td className="px-6 py-5 text-center font-mono font-bold text-maroon-700">{formatRupiah(item.is_qty_enabled ? item.harga * item.qty : item.harga)}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center space-x-2">
                      {item.wa_admin && <a href={`https://wa.me/${item.wa_admin}`} target="_blank" className="p-2 bg-emerald-100 text-emerald-700 rounded-lg" title="WhatsApp Admin"><MessageCircle size={16} /></a>}
                      {item.link_belanja && <a href={item.link_belanja} target="_blank" className="p-2 bg-blue-100 text-blue-700 rounded-lg" title="Link Belanja"><ShoppingBag size={16} /></a>}
                      {item.link_sosmed && <a href={item.link_sosmed} target="_blank" className="p-2 bg-pink-100 text-pink-700 rounded-lg" title="Instagram"><Instagram size={16} /></a>}
                      {item.link_gmaps && <a href={item.link_gmaps} target="_blank" className="p-2 bg-orange-100 text-orange-700 rounded-lg" title="Google Maps"><MapPin size={16} /></a>}
                      {item.pdf_url && <button onClick={() => { setPreviewPdfUrl(item.pdf_url!); setIsPreviewOpen(true); }} className="p-2 bg-indigo-100 text-indigo-700 rounded-lg" title="Lihat PDF"><FileText size={16} /></button>}
                      {item.foto_urls.length > 0 && <button onClick={() => { setGalleryPhotos(item.foto_urls); setIsGalleryOpen(true); }} className="p-2 bg-gold-100 text-gold-800 rounded-lg" title="Lihat Foto"><ImageIcon size={16} /></button>}
                      <button onClick={() => handleOpenModal(item)} className="p-2 bg-gray-100 text-gray-600 rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(item.id, item.nama_keperluan)} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-maroon-900 px-8 py-5 flex items-center justify-between border-t border-gold-400">
          <div className="text-xs font-black text-gold uppercase tracking-[0.2em]">Halaman {page + 1} | Total {totalCount} Item</div>
          <div className="flex items-center space-x-4">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-2 bg-maroon text-gold rounded-xl border border-gold-600 disabled:opacity-30"><ChevronLeft size={20} /></button>
            <button disabled={(page + 1) * pageSize >= totalCount} onClick={() => setPage(p => p + 1)} className="p-2 bg-maroon text-gold rounded-xl border border-gold-600 disabled:opacity-30"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Tambah'} ${moduleName}`}>
        <form onSubmit={handleSubmit} className="space-y-6 pb-10">
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-maroon uppercase tracking-widest">Nama Keperluan</label>
              <input required type="text" className="w-full px-4 py-3 border-2 border-maroon-100 rounded-xl outline-none font-bold text-maroon focus:border-maroon" value={formData.nama_keperluan} onChange={e => setFormData({...formData, nama_keperluan: e.target.value})} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-maroon uppercase tracking-widest">Kategori</label>
              <select className="w-full px-4 py-3 border-2 border-maroon-100 rounded-xl font-bold text-maroon" value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value as any})}>
                {Object.values(ItemCategory).map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-maroon uppercase tracking-widest">Status</label>
              <select className="w-full px-4 py-3 border-2 border-maroon-100 rounded-xl font-bold text-maroon" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                {Object.values(ItemStatus).map(st => <option key={st} value={st}>{st.toUpperCase()}</option>)}
              </select>
            </div>

            <div className="col-span-1 space-y-1">
              <label className="text-xs font-bold text-maroon uppercase tracking-widest">Harga Per Item (Rp)</label>
              <input required type="number" className="w-full px-4 py-3 border-2 border-maroon-100 rounded-xl font-mono font-bold text-maroon" value={formData.harga} onChange={e => setFormData({...formData, harga: Number(e.target.value)})} />
            </div>

            <div className="col-span-1 space-y-1">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-maroon uppercase tracking-widest">Qty</label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={formData.is_qty_enabled} onChange={e => setFormData({...formData, is_qty_enabled: e.target.checked})} />
                        <span className="text-[10px] font-bold text-gray-400">AKTIFKAN</span>
                    </label>
                </div>
                <input disabled={!formData.is_qty_enabled} type="number" className="w-full px-4 py-3 border-2 border-maroon-100 rounded-xl font-mono font-bold text-maroon disabled:bg-gray-50" value={formData.qty} onChange={e => setFormData({...formData, qty: Number(e.target.value)})} />
            </div>

            <div className="col-span-2 p-4 bg-gold-50 rounded-2xl border-2 border-gold-200 grid grid-cols-2 gap-4">
                <div className="col-span-2 text-[10px] font-black text-gold-800 uppercase tracking-widest flex items-center space-x-2">
                    <LinkIcon size={12} /><span>Link & Kontak Vendor</span>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-maroon uppercase">WA Admin (62812...)</label>
                    <input type="text" className="w-full px-3 py-2 border border-maroon-100 rounded-lg text-sm font-bold" value={formData.wa_admin} onChange={e => setFormData({...formData, wa_admin: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-maroon uppercase">Link Belanja</label>
                    <input type="text" placeholder="https://..." className="w-full px-3 py-2 border border-maroon-100 rounded-lg text-sm font-bold" value={formData.link_belanja} onChange={e => setFormData({...formData, link_belanja: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-maroon uppercase">Link Instagram</label>
                    <input type="text" placeholder="https://..." className="w-full px-3 py-2 border border-maroon-100 rounded-lg text-sm font-bold" value={formData.link_sosmed} onChange={e => setFormData({...formData, link_sosmed: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-maroon uppercase">Link Gmaps</label>
                    <input type="text" placeholder="https://..." className="w-full px-3 py-2 border border-maroon-100 rounded-lg text-sm font-bold" value={formData.link_gmaps} onChange={e => setFormData({...formData, link_gmaps: e.target.value})} />
                </div>
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Upload Foto (Max 5)</label>
                    <input type="file" multiple accept="image/*" onChange={e => handleFileUpload(e, 'img')} className="text-xs text-maroon p-2 border-2 border-dashed border-maroon-100 rounded-lg w-full" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Upload PDF Vendor</label>
                    <input type="file" accept="application/pdf" onChange={e => handleFileUpload(e, 'pdf')} className="text-xs text-maroon p-2 border-2 border-dashed border-maroon-100 rounded-lg w-full" />
                </div>
            </div>
          </div>
          
          <button disabled={submitting} type="submit" className="w-full bg-maroon text-gold py-5 rounded-3xl font-bold shadow-2xl border-4 border-gold-400 uppercase tracking-[0.3em] hover:bg-maroon-900 transition-all flex items-center justify-center space-x-3 active:scale-95">
            {submitting ? <Loader2 className="animate-spin" /> : <Save size={24} />}
            <span>Simpan Data Keperluan</span>
          </button>
        </form>
      </Modal>

      <Modal isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} title="Galeri Foto">
        <div className="grid grid-cols-2 gap-4">
            {galleryPhotos.map((url, i) => <img key={i} src={url} className="w-full h-48 object-cover rounded-2xl border-2 border-gold-100" />)}
        </div>
      </Modal>

      <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="Pratinjau PDF">
        <iframe src={previewPdfUrl!} className="w-full h-[70vh] rounded-2xl border-4 border-maroon-50" />
      </Modal>
    </div>
  );
};

export default BudgetTable;
