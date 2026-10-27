import React, { useState, useEffect, useMemo } from 'react';
import { supabase, logActivity } from '../supabase';
import { Guest } from '../types';
import {
  Search,
  Trash2,
  Edit2,
  UserPlus,
  Users,
  Save,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Copy,
  RefreshCw,
  X,
  Phone,
  Calendar,
  Sparkles,
  ExternalLink,
  Check,
  CheckCircle2,
  Heart,
  SlidersHorizontal,
  Share2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

const CATEGORIES = [
  'Teman Kerja',
  'Teman Kuliah',
  'Teman SMA',
  'Teman SMP',
  'Teman SD',
  'Teman TK',
  'Teman Organisasi',
  'Teman Komplek Rumah',
  'Keluarga Besar',
  'Keluarga Inti'
];

const GuestList: React.FC<{ userEmail: string }> = ({ userEmail }) => {
  // Master state
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPihak, setFilterPihak] = useState('all');
  const [filterKategori, setFilterKategori] = useState('all');
  const [filterPasangan, setFilterPasangan] = useState('all'); // 'all' | 'pasangan' | 'sendiri'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20); // 10, 20, 30, 50, -1 (all)

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [viewingGuest, setViewingGuest] = useState<Guest | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nama_tamu: '',
    no_whatsapp: '',
    pihak: 'Fikri' as 'Fikri' | 'Nadya',
    kategori: 'Teman Kerja',
    membawa_pasangan: false,
    jumlah_tambahan: 1
  });

  // Fetch all guests
  const fetchGuests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tamu')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllGuests(data || []);
    } catch (error: any) {
      toast.error('Gagal mengambil daftar tamu: ' + (error?.message || error));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchGuests();
    toast.success('Daftar tamu diperbarui!');
  };

  // Helper to calculate total pax for a guest
  const getGuestPax = (g: Guest): number => {
    return 1 + (g.membawa_pasangan ? Number(g.jumlah_tambahan || 0) : 0);
  };

  // Computed Overall Metrics
  const metrics = useMemo(() => {
    const totalInvitations = allGuests.length;
    const totalPax = allGuests.reduce((acc, g) => acc + getGuestPax(g), 0);

    const fikriGuests = allGuests.filter((g) => g.pihak === 'Fikri');
    const fikriPax = fikriGuests.reduce((acc, g) => acc + getGuestPax(g), 0);

    const nadyaGuests = allGuests.filter((g) => g.pihak === 'Nadya');
    const nadyaPax = nadyaGuests.reduce((acc, g) => acc + getGuestPax(g), 0);

    return {
      totalInvitations,
      totalPax,
      fikriCount: fikriGuests.length,
      fikriPax,
      nadyaCount: nadyaGuests.length,
      nadyaPax
    };
  }, [allGuests]);

  // Filtered Guests
  const filteredGuests = useMemo(() => {
    return allGuests.filter((g) => {
      const search = searchTerm.toLowerCase().trim();
      const matchSearch =
        !search ||
        g.nama_tamu.toLowerCase().includes(search) ||
        g.kategori.toLowerCase().includes(search) ||
        (g.no_whatsapp && g.no_whatsapp.includes(search));

      const matchPihak = filterPihak === 'all' || g.pihak === filterPihak;
      const matchKategori = filterKategori === 'all' || g.kategori === filterKategori;

      const matchPasangan =
        filterPasangan === 'all' ||
        (filterPasangan === 'pasangan' && g.membawa_pasangan) ||
        (filterPasangan === 'sendiri' && !g.membawa_pasangan);

      return matchSearch && matchPihak && matchKategori && matchPasangan;
    });
  }, [allGuests, searchTerm, filterPihak, filterKategori, filterPasangan]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterPihak, filterKategori, filterPasangan, pageSize]);

  // Pagination Computations
  const totalItems = filteredGuests.length;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalItems / pageSize) || 1;

  const paginatedGuests = useMemo(() => {
    if (pageSize === -1) return filteredGuests;
    const from = (currentPage - 1) * pageSize;
    return filteredGuests.slice(from, from + pageSize);
  }, [filteredGuests, currentPage, pageSize]);

  // Filtered Pax Count
  const filteredPaxCount = useMemo(() => {
    return filteredGuests.reduce((acc, g) => acc + getGuestPax(g), 0);
  }, [filteredGuests]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterPihak('all');
    setFilterKategori('all');
    setFilterPasangan('all');
    setCurrentPage(1);
  };

  const isAnyFilterActive =
    searchTerm !== '' ||
    filterPihak !== 'all' ||
    filterKategori !== 'all' ||
    filterPasangan !== 'all';

  // Form handlers
  const handleOpenAddModal = () => {
    setEditingGuest(null);
    setFormData({
      nama_tamu: '',
      no_whatsapp: '',
      pihak: 'Fikri',
      kategori: 'Teman Kerja',
      membawa_pasangan: false,
      jumlah_tambahan: 1
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (guest: Guest) => {
    setEditingGuest(guest);
    setFormData({
      nama_tamu: guest.nama_tamu,
      no_whatsapp: guest.no_whatsapp || '',
      pihak: guest.pihak,
      kategori: guest.kategori,
      membawa_pasangan: guest.membawa_pasangan,
      jumlah_tambahan: guest.jumlah_tambahan || 1
    });
    setIsFormModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_tamu.trim()) {
      toast.error('Nama tamu wajib diisi!');
      return;
    }

    const payload = {
      nama_tamu: formData.nama_tamu.trim(),
      no_whatsapp: formData.no_whatsapp ? formData.no_whatsapp.trim() : null,
      pihak: formData.pihak,
      kategori: formData.kategori,
      membawa_pasangan: formData.membawa_pasangan,
      jumlah_tambahan: formData.membawa_pasangan ? Math.max(1, Number(formData.jumlah_tambahan)) : 0
    };

    try {
      if (editingGuest) {
        const { error } = await supabase
          .from('tamu')
          .update(payload)
          .eq('id', editingGuest.id);

        if (error) throw error;
        logActivity(userEmail, 'update', 'Tamu', `Update tamu: ${formData.nama_tamu}`);
        toast.success(`Data ${formData.nama_tamu} berhasil diperbarui!`);

        // If currently viewing this guest, update viewing guest state too
        if (viewingGuest && viewingGuest.id === editingGuest.id) {
          setViewingGuest({ ...viewingGuest, ...payload });
        }
      } else {
        const { error } = await supabase.from('tamu').insert([payload]);
        if (error) throw error;
        logActivity(userEmail, 'create', 'Tamu', `Tambah tamu: ${formData.nama_tamu}`);
        toast.success(`Tamu ${formData.nama_tamu} berhasil ditambahkan!`);
      }

      setIsFormModalOpen(false);
      await fetchGuests();
    } catch (err: any) {
      toast.error('Gagal menyimpan tamu: ' + (err?.message || err));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus tamu "${name}" dari daftar undangan?`)) return;
    try {
      const { error } = await supabase.from('tamu').delete().eq('id', id);
      if (error) throw error;
      logActivity(userEmail, 'delete', 'Tamu', `Hapus tamu: ${name}`);
      toast.success(`Tamu "${name}" berhasil dihapus!`);

      if (viewingGuest && viewingGuest.id === id) {
        setViewingGuest(null);
      }

      await fetchGuests();
    } catch (err: any) {
      toast.error('Gagal menghapus tamu: ' + (err?.message || err));
    }
  };

  // WhatsApp Link Builder
  const getWhatsAppLink = (phone: string, guestName: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    } else if (!clean.startsWith('62')) {
      clean = '62' + clean;
    }
    const message = encodeURIComponent(
      `Assalamu'alaikum Wr. Wb. Halo ${guestName},\n\nKami mengundang Bapak/Ibu/Saudara/i untuk hadir dan memberikan doa restu pada acara pernikahan kami, Fikri & Nadya.\n\nMerupakan suatu kehormatan dan kebahagiaan bagi kami apabila berkenan hadir.\n\nTerima kasih.`
    );
    return `https://wa.me/${clean}?text=${message}`;
  };

  // Copy Summary to Clipboard
  const handleCopySummary = () => {
    const text = `📋 RINGKASAN DAFTAR TAMU UNDANGAN
Fikri & Nadya Wedding

• Total Undangan: ${metrics.totalInvitations} Orang
• Estimasi Kehadiran: ${metrics.totalPax} Pax
• Pihak Fikri: ${metrics.fikriCount} Undangan (${metrics.fikriPax} Pax)
• Pihak Nadya: ${metrics.nadyaCount} Undangan (${metrics.nadyaPax} Pax)

(Filter aktif saat ini: ${totalItems} tamu terpilih • ${filteredPaxCount} Pax)`;

    navigator.clipboard.writeText(text);
    toast.success('Ringkasan daftar tamu disalin ke clipboard!');
  };

  // Copy Single Guest Detail
  const handleCopyGuestDetail = (guest: Guest) => {
    const pax = getGuestPax(guest);
    const detail = `👤 Data Tamu Undangan:
Nama: ${guest.nama_tamu}
Pihak: ${guest.pihak}
Kategori: ${guest.kategori}
Estimasi: ${pax} Pax ${guest.membawa_pasangan ? `(1 + ${guest.jumlah_tambahan} pasangan/keluarga)` : '(Sendiri)'}
WhatsApp: ${guest.no_whatsapp || '-'}`;

    navigator.clipboard.writeText(detail);
    toast.success(`Data ${guest.nama_tamu} disalin!`);
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in font-sans">
      
      {/* ============================================================== */}
      {/* 1. HEADER SECTION & MAIN ACTIONS                              */}
      {/* ============================================================== */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gold-200/70 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-maroon/10 text-maroon text-xs font-bold tracking-widest uppercase mb-2">
            <Heart size={14} className="text-gold fill-gold" />
            <span>Wedding Guest Directory</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-maroon leading-tight">
            Daftar Tamu Undangan
          </h1>
          <p className="text-stone-500 text-xs mt-1">
            Kelola daftar nama undangan pernikahan Fikri &amp; Nadya beserta estimasi katering acara.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Copy Summary Button */}
          <button
            onClick={handleCopySummary}
            className="px-4 py-3 rounded-2xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold transition-all flex items-center space-x-2 shadow-sm"
            title="Salin ringkasan daftar tamu ke clipboard"
          >
            <Copy size={16} className="text-stone-500" />
            <span>Salin Ringkasan</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="p-3 rounded-2xl border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
            title="Muat ulang data dari server"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-gold' : ''} />
          </button>

          {/* Add Guest Button */}
          <button
            onClick={handleOpenAddModal}
            className="px-6 py-3.5 rounded-2xl bg-maroon hover:bg-maroon-800 text-gold font-bold text-xs tracking-wider uppercase shadow-xl border border-gold/40 flex items-center space-x-2 transition-all active:scale-95 group"
          >
            <UserPlus size={18} className="group-hover:scale-110 transition-transform text-gold" />
            <span>Tambah Tamu</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. BENTO METRICS GRID (4 CARDS)                               */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Undangan */}
        <div className="bg-white p-5 rounded-3xl border border-gold-200/60 shadow-sm relative overflow-hidden group hover:border-gold-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-400">
              Total Undangan
            </span>
            <div className="w-10 h-10 rounded-2xl bg-maroon/10 text-maroon flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-serif font-bold text-maroon">
              {metrics.totalInvitations}
            </span>
            <span className="text-xs text-stone-500 ml-1.5 font-bold">Undangan</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Nama terdaftar di sistem</p>
        </div>

        {/* Total Estimasi Pax */}
        <div className="bg-white p-5 rounded-3xl border border-gold-200/60 shadow-sm relative overflow-hidden group hover:border-gold-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-400">
              Total Estimasi Katering
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Sparkles size={20} className="text-gold" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-serif font-bold text-maroon">
              {metrics.totalPax}
            </span>
            <span className="text-xs text-gold-700 font-black ml-1.5">Pax Total</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Termasuk pasangan / keluarga</p>
        </div>

        {/* Pihak Fikri */}
        <div className="bg-white p-5 rounded-3xl border border-blue-200/60 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">
              Pihak Fikri
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              Mempelai Pria
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-serif font-bold text-blue-900">
              {metrics.fikriPax}
            </span>
            <span className="text-xs font-bold text-blue-700">Pax</span>
            <span className="text-xs text-stone-400">({metrics.fikriCount} Undangan)</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Alokasi tamu mempelai pria</p>
        </div>

        {/* Pihak Nadya */}
        <div className="bg-white p-5 rounded-3xl border border-rose-200/60 shadow-sm relative overflow-hidden group hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-700">
              Pihak Nadya
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
              Mempelai Wanita
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-serif font-bold text-rose-900">
              {metrics.nadyaPax}
            </span>
            <span className="text-xs font-bold text-rose-700">Pax</span>
            <span className="text-xs text-stone-400">({metrics.nadyaCount} Undangan)</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Alokasi tamu mempelai wanita</p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. SEARCH & ADVANCED FILTER TOOLBAR                           */}
      {/* ============================================================== */}
      <div className="bg-white p-5 rounded-3xl border border-gold-200/60 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          
          {/* Search Bar (5 cols) */}
          <div className="lg:col-span-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={17} />
            <input
              type="text"
              placeholder="Cari nama tamu, kategori, atau WhatsApp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-maroon placeholder:text-stone-400 outline-none focus:border-gold focus:bg-white transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                title="Hapus pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pihak (3 cols) */}
          <div className="lg:col-span-3">
            <select
              value={filterPihak}
              onChange={(e) => setFilterPihak(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:border-gold focus:bg-white transition-all cursor-pointer"
            >
              <option value="all">Semua Pihak Pengundang</option>
              <option value="Fikri">Pihak Fikri (Pria)</option>
              <option value="Nadya">Pihak Nadya (Wanita)</option>
            </select>
          </div>

          {/* Filter Kategori (3 cols) */}
          <div className="lg:col-span-3">
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:border-gold focus:bg-white transition-all cursor-pointer"
            >
              <option value="all">Semua Kategori Relasi</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Pasangan / Pax (2 cols) */}
          <div className="lg:col-span-2">
            <select
              value={filterPasangan}
              onChange={(e) => setFilterPasangan(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:border-gold focus:bg-white transition-all cursor-pointer"
            >
              <option value="all">Semua Pax</option>
              <option value="pasangan">+ Pasangan</option>
              <option value="sendiri">Sendiri (1 Pax)</option>
            </select>
          </div>

        </div>

        {/* Sub-bar: Active Filter Chips & Reset */}
        {isAnyFilterActive && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
            <div className="flex items-center space-x-2 text-stone-500">
              <SlidersHorizontal size={13} className="text-gold" />
              <span>
                Menemukan <strong>{totalItems}</strong> tamu dari filter ini (
                <strong className="text-maroon">{filteredPaxCount} Pax</strong>)
              </span>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-maroon hover:underline font-bold text-[11px] flex items-center space-x-1"
            >
              <X size={12} />
              <span>Reset Semua Filter</span>
            </button>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 4. SCROLLABLE GUEST LIST TABLE WITH STICKY HEADER             */}
      {/* ============================================================== */}
      <div className="bg-white rounded-[2rem] border border-gold-200/70 shadow-xl overflow-hidden flex flex-col">
        
        {/* Scrollable Container with Sticky Header */}
        <div className="max-h-[560px] overflow-y-auto overflow-x-auto relative">
          <table className="w-full text-left border-collapse">
            
            {/* Sticky Table Header */}
            <thead className="sticky top-0 z-20 bg-maroon text-gold font-serif text-[11px] uppercase tracking-wider shadow-sm">
              <tr>
                <th className="px-5 py-4 w-12 text-center">#</th>
                <th className="px-6 py-4">Nama Tamu &amp; Kategori</th>
                <th className="px-6 py-4 text-center">Pihak</th>
                <th className="px-6 py-4 text-center">Estimasi Pax</th>
                <th className="px-6 py-4 text-center">WhatsApp</th>
                <th className="px-6 py-4 text-center w-36">Aksi</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-stone-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <RefreshCw size={28} className="animate-spin text-gold" />
                      <span className="font-serif font-bold text-maroon text-sm">
                        Memuat Data Tamu Undangan...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : paginatedGuests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                      <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center">
                        <Users size={28} />
                      </div>
                      <p className="font-serif font-bold text-stone-800 text-base">
                        Tidak ada data tamu ditemukan
                      </p>
                      <p className="text-xs text-stone-500">
                        {isAnyFilterActive
                          ? 'Coba sesuaikan kata kunci pencarian atau ubah filter di atas.'
                          : 'Belum ada tamu terdaftar. Klik tombol Tambah Tamu untuk mulai mendaftarkan undangan.'}
                      </p>
                      {isAnyFilterActive && (
                        <button
                          onClick={handleResetFilters}
                          className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all"
                        >
                          Reset Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedGuests.map((guest, idx) => {
                  const absoluteIndex =
                    pageSize === -1
                      ? idx + 1
                      : (currentPage - 1) * pageSize + idx + 1;
                  const pax = getGuestPax(guest);

                  return (
                    <tr
                      key={guest.id}
                      className="hover:bg-amber-50/40 transition-colors group"
                    >
                      {/* # Index */}
                      <td className="px-5 py-4 text-center font-mono font-bold text-stone-400 group-hover:text-maroon">
                        {absoluteIndex}
                      </td>

                      {/* Nama & Kategori */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <button
                            onClick={() => setViewingGuest(guest)}
                            className="text-left font-serif font-bold text-maroon hover:text-maroon-800 text-sm hover:underline flex items-center space-x-1.5"
                          >
                            <span>{guest.nama_tamu}</span>
                          </button>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 uppercase tracking-wider">
                              {guest.kategori}
                            </span>
                            {guest.membawa_pasangan && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                + Pasangan / Keluarga
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Pihak */}
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            guest.pihak === 'Fikri'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {guest.pihak}
                        </span>
                      </td>

                      {/* Pax */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center justify-center min-w-[36px] px-2.5 py-1 bg-maroon text-gold rounded-xl font-mono font-bold text-xs shadow-sm">
                            {pax} Pax
                          </span>
                          {guest.membawa_pasangan && (
                            <span className="text-[9px] text-stone-400 mt-0.5 font-bold">
                              1 + {guest.jumlah_tambahan}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* WhatsApp */}
                      <td className="px-6 py-4 text-center">
                        {guest.no_whatsapp ? (
                          <a
                            href={getWhatsAppLink(guest.no_whatsapp, guest.nama_tamu)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all font-bold text-[11px] shadow-sm group/wa"
                            title={`Kirim WhatsApp ke ${guest.no_whatsapp}`}
                          >
                            <MessageCircle size={14} className="text-emerald-600 group-hover/wa:scale-110 transition-transform" />
                            <span>{guest.no_whatsapp}</span>
                          </a>
                        ) : (
                          <span className="text-stone-300 italic">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* View Detail Button */}
                          <button
                            onClick={() => setViewingGuest(guest)}
                            className="p-2 rounded-xl bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-maroon transition-all shadow-sm"
                            title="Lihat Detail Tamu"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditModal(guest)}
                            className="p-2 rounded-xl bg-stone-100 hover:bg-gold/20 text-stone-600 hover:text-amber-900 transition-all shadow-sm"
                            title="Edit Data Tamu"
                          >
                            <Edit2 size={15} />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(guest.id, guest.nama_tamu)}
                            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all shadow-sm"
                            title="Hapus Tamu"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ============================================================== */}
        {/* 5. INTERACTIVE PAGINATION BAR                                  */}
        {/* ============================================================== */}
        <div className="p-4 bg-stone-50 border-t border-gold-200/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          
          {/* Page Size Selector & Count Display */}
          <div className="flex items-center space-x-3 text-stone-600">
            <span>Baris per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-800 outline-none cursor-pointer focus:border-gold"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={-1}>Semua</option>
            </select>

            <span className="text-stone-400">|</span>

            <span className="font-bold text-stone-700">
              {totalItems === 0
                ? '0 tamu'
                : `Menampilkan ${
                    pageSize === -1
                      ? `1 - ${totalItems}`
                      : `${(currentPage - 1) * pageSize + 1} - ${Math.min(
                          currentPage * pageSize,
                          totalItems
                        )}`
                  } dari ${totalItems} tamu`}
            </span>
          </div>

          {/* Page Navigation Controls */}
          {pageSize !== -1 && totalPages > 1 && (
            <div className="flex items-center space-x-1.5">
              {/* First Page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none transition-all"
                title="Halaman Pertama"
              >
                <ChevronsLeft size={16} />
              </button>

              {/* Prev Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none transition-all"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page Number Pills */}
              <div className="flex items-center space-x-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    // Show current page, edges, and +/- 1 neighbor
                    return (
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - currentPage) <= 1
                    );
                  })
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const hasGap = prev && p - prev > 1;

                    return (
                      <React.Fragment key={p}>
                        {hasGap && (
                          <span className="px-1 text-stone-400 select-none">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`min-w-[28px] h-7 px-2 rounded-lg font-bold transition-all text-xs ${
                            currentPage === p
                              ? 'bg-maroon text-gold shadow-sm'
                              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              {/* Next Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none transition-all"
                title="Halaman Berikutnya"
              >
                <ChevronRight size={16} />
              </button>

              {/* Last Page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none transition-all"
                title="Halaman Terakhir"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ============================================================== */}
      {/* 6. DEDICATED VIEW / DETAIL TAMU MODAL                         */}
      {/* ============================================================== */}
      {viewingGuest && (
        <Modal
          isOpen={Boolean(viewingGuest)}
          onClose={() => setViewingGuest(null)}
          title="Detail Tamu Undangan"
          maxWidth="max-w-xl"
        >
          <div className="space-y-6">
            
            {/* Guest Banner Header */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-50 via-stone-50 to-white border-2 border-gold-200 text-center relative overflow-hidden shadow-inner">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-maroon text-gold flex items-center justify-center font-serif text-2xl font-bold shadow-md border-2 border-gold-300 mb-3">
                {viewingGuest.nama_tamu.charAt(0).toUpperCase()}
              </div>

              <h2 className="font-serif text-2xl font-bold text-maroon">
                {viewingGuest.nama_tamu}
              </h2>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    viewingGuest.pihak === 'Fikri'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  Pihak {viewingGuest.pihak}
                </span>

                <span className="px-3 py-1 rounded-full text-xs font-bold bg-stone-200 text-stone-800">
                  {viewingGuest.kategori}
                </span>
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Estimasi Pax Breakdown */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center justify-between text-xs text-stone-500 font-bold uppercase tracking-wider">
                  <span>Estimasi Kehadiran</span>
                  <Sparkles size={14} className="text-gold" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-serif font-bold text-maroon">
                    {getGuestPax(viewingGuest)}
                  </span>
                  <span className="text-xs font-bold text-stone-700">Pax Total</span>
                </div>
                <p className="text-[11px] text-stone-500">
                  {viewingGuest.membawa_pasangan ? (
                    <>1 Tamu Utama + <strong>{viewingGuest.jumlah_tambahan} Pendamping</strong></>
                  ) : (
                    'Hadir Sendiri (1 Pax)'
                  )}
                </p>
              </div>

              {/* Status Pasangan */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center justify-between text-xs text-stone-500 font-bold uppercase tracking-wider">
                  <span>Status Pendamping</span>
                  <Heart size={14} className="text-rose-500" />
                </div>
                <div className="mt-1">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                      viewingGuest.membawa_pasangan
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {viewingGuest.membawa_pasangan
                      ? '✓ Membawa Pasangan / Keluarga'
                      : 'Hadir Tanpa Pendamping'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  {viewingGuest.membawa_pasangan
                    ? `Tambahan kursi: ${viewingGuest.jumlah_tambahan} orang`
                    : '1 Kursi disiapkan'}
                </p>
              </div>

              {/* WhatsApp Contact */}
              <div className="sm:col-span-2 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-800">
                  <span className="flex items-center space-x-1.5">
                    <Phone size={14} />
                    <span>Kontak WhatsApp</span>
                  </span>
                  {viewingGuest.no_whatsapp && (
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Tersedia
                    </span>
                  )}
                </div>

                {viewingGuest.no_whatsapp ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <span className="font-mono text-base font-bold text-emerald-950">
                      {viewingGuest.no_whatsapp}
                    </span>
                    <a
                      href={getWhatsAppLink(viewingGuest.no_whatsapp, viewingGuest.nama_tamu)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2"
                    >
                      <MessageCircle size={15} />
                      <span>Kirim Undangan WhatsApp</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-stone-500 italic">
                    Nomor WhatsApp belum dicantumkan untuk tamu ini.
                  </p>
                )}
              </div>

              {/* Tanggal Didaftarkan */}
              {viewingGuest.created_at && (
                <div className="sm:col-span-2 flex items-center justify-between text-xs text-stone-400 px-1 pt-1">
                  <span className="flex items-center space-x-1.5">
                    <Calendar size={13} />
                    <span>Didaftarkan pada:</span>
                  </span>
                  <span className="font-mono font-bold text-stone-600">
                    {new Date(viewingGuest.created_at).toLocaleString('id-ID', {
                      dateStyle: 'long',
                      timeStyle: 'short'
                    })}
                  </span>
                </div>
              )}

            </div>

            {/* Bottom Actions inside View Modal */}
            <div className="flex items-center justify-between pt-4 border-t border-stone-200">
              <button
                onClick={() => handleCopyGuestDetail(viewingGuest)}
                className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-all flex items-center space-x-1.5"
              >
                <Copy size={14} />
                <span>Salin Info</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const guestToEdit = viewingGuest;
                    setViewingGuest(null);
                    handleOpenEditModal(guestToEdit);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-maroon hover:bg-maroon-800 text-gold text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md"
                >
                  <Edit2 size={14} />
                  <span>Edit Data</span>
                </button>

                <button
                  onClick={() => setViewingGuest(null)}
                  className="px-4 py-2.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>

          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* 7. ADD / EDIT GUEST MODAL                                      */}
      {/* ============================================================== */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={`${editingGuest ? 'Edit Data' : 'Tambah'} Tamu Undangan`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-6">
          <div className="space-y-4">
            
            {/* Nama Tamu */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-maroon uppercase tracking-wider">
                Nama Lengkap Tamu <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="Contoh: Bpk. Bambang Sutrisno"
                value={formData.nama_tamu}
                onChange={(e) => setFormData({ ...formData, nama_tamu: e.target.value })}
                className="w-full px-4 py-3 border border-stone-300 focus:border-maroon rounded-xl font-bold text-stone-800 outline-none transition-all shadow-sm"
              />
            </div>

            {/* Nomor WhatsApp */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-maroon uppercase tracking-wider">
                Nomor WhatsApp (Opsional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input
                  type="text"
                  placeholder="0812xxxx atau 62812xxxx"
                  value={formData.no_whatsapp}
                  onChange={(e) => setFormData({ ...formData, no_whatsapp: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-stone-300 focus:border-maroon rounded-xl font-mono text-xs font-bold text-stone-800 outline-none transition-all shadow-sm"
                />
              </div>
              <p className="text-[10px] text-stone-400 ml-1">
                Dapat digunakan untuk mengirim link undangan WhatsApp langsung.
              </p>
            </div>

            {/* Pihak & Kategori (2 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-maroon uppercase tracking-wider">
                  Pihak Pengundang
                </label>
                <select
                  value={formData.pihak}
                  onChange={(e) =>
                    setFormData({ ...formData, pihak: e.target.value as 'Fikri' | 'Nadya' })
                  }
                  className="w-full px-4 py-3 border border-stone-300 focus:border-maroon rounded-xl font-bold text-stone-800 outline-none transition-all shadow-sm cursor-pointer"
                >
                  <option value="Fikri">Pihak Fikri (Mempelai Pria)</option>
                  <option value="Nadya">Pihak Nadya (Mempelai Wanita)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-maroon uppercase tracking-wider">
                  Kategori Relasi
                </label>
                <select
                  value={formData.kategori}
                  onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                  className="w-full px-4 py-3 border border-stone-300 focus:border-maroon rounded-xl font-bold text-stone-800 outline-none transition-all shadow-sm cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pasangan / Keluarga Box */}
            <div className="p-5 bg-amber-50/60 rounded-2xl border border-gold-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        membawa_pasangan: !formData.membawa_pasangan
                      })
                    }
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      formData.membawa_pasangan ? 'bg-maroon' : 'bg-stone-300'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-md ${
                        formData.membawa_pasangan ? 'left-6' : 'left-0.5'
                      }`}
                    />
                  </button>
                  <span className="text-xs font-bold text-maroon uppercase tracking-wider">
                    Membawa Pasangan / Keluarga?
                  </span>
                </div>

                {formData.membawa_pasangan && (
                  <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-gold-300 shadow-sm">
                    <span className="text-[10px] font-bold text-stone-500 uppercase">
                      Tambahan:
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={formData.jumlah_tambahan}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          jumlah_tambahan: Math.max(1, Number(e.target.value))
                        })
                      }
                      className="w-12 text-center font-mono font-bold text-maroon text-sm outline-none"
                    />
                    <span className="text-[10px] font-bold text-stone-500 uppercase">
                      Orang
                    </span>
                  </div>
                )}
              </div>

              {/* Total Pax Calculator Hint */}
              <div className="p-3 bg-white/80 rounded-xl border border-dashed border-gold-300 flex items-center space-x-2 text-xs">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <p className="text-stone-700">
                  Total estimasi katering untuk tamu ini:{' '}
                  <strong className="text-maroon font-serif text-sm">
                    {1 + (formData.membawa_pasangan ? Number(formData.jumlah_tambahan || 1) : 0)} Pax
                  </strong>
                </p>
              </div>
            </div>

          </div>

          {/* Form Submit Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="px-5 py-3 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-all"
            >
              Batal
            </button>

            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-maroon hover:bg-maroon-800 text-gold text-xs font-bold uppercase tracking-wider shadow-lg border border-gold/40 transition-all flex items-center space-x-2"
            >
              <Save size={16} />
              <span>{editingGuest ? 'Simpan Perubahan' : 'Tambah ke Daftar Tamu'}</span>
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default GuestList;
