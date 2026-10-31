import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { supabase, logActivity } from '../supabase';
import { Guest, BukuTamu } from '../types';
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
  Share2,
  QrCode,
  Download,
  Award,
  Link as LinkIcon
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
  const [filterKategoriTamu, setFilterKategoriTamu] = useState('all'); // 'all' | 'VIP' | 'Reguler'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20); // 10, 20, 30, 50, -1 (all)

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [viewingGuest, setViewingGuest] = useState<Guest | null>(null);

  // QR Barcode Preview Modal
  const [previewGuest, setPreviewGuest] = useState<Guest | null>(null);
  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nama_tamu: '',
    no_whatsapp: '',
    pihak: 'Fikri' as 'Fikri' | 'Nadya',
    kategori: 'Teman Kerja',
    kategori_tamu: 'Reguler' as 'VIP' | 'Reguler',
    membawa_pasangan: false,
    jumlah_tambahan: 1
  });

  const isStaff = (userEmail || '').toLowerCase().includes('staff') ||
                  (userEmail || '').toLowerCase().includes('resepsi') ||
                  (userEmail || '').toLowerCase().includes('scanner') ||
                  (userEmail || '').toLowerCase().includes('panitia');

  // Helper untuk menghitung total pax tamu
  const getGuestPax = (g: Guest): number => {
    return 1 + (g.membawa_pasangan ? Number(g.jumlah_tambahan || 0) : 0);
  };

  // Fetch all guests with bidirectional sync to buku_tamu
  const fetchGuests = async () => {
    setLoading(true);
    try {
      // 1. Ambil data dari tabel tamu
      const { data: tamuData, error: tamuError } = await supabase
        .from('tamu')
        .select('*')
        .order('created_at', { ascending: false });

      if (tamuError) throw tamuError;

      // 2. Ambil data dari tabel buku_tamu untuk sinkronisasi QR barcode & link unik
      let bukuList: BukuTamu[] = [];
      try {
        const { data: bukuData } = await supabase.from('buku_tamu').select('*');
        bukuList = (bukuData || []) as BukuTamu[];
      } catch (bukuErr) {
        console.warn('Gagal load buku_tamu untuk sinkronisasi:', bukuErr);
      }

      // Buat peta pencarian buku_tamu berdasarkan nama_tamu dan no_whatsapp
      const bukuByCode = new Map<string, BukuTamu>();
      const bukuByName = new Map<string, BukuTamu>();
      const bukuByPhone = new Map<string, BukuTamu>();

      bukuList.forEach((b) => {
        if (b.ticket_code) bukuByCode.set(b.ticket_code, b);
        if (b.nama_tamu) bukuByName.set(b.nama_tamu.trim().toLowerCase(), b);
        if (b.nama_keluarga) bukuByName.set(b.nama_keluarga.trim().toLowerCase(), b);
        if (b.no_whatsapp) {
          const cleanPhone = b.no_whatsapp.replace(/\D/g, '');
          if (cleanPhone) bukuByPhone.set(cleanPhone, b);
        }
      });

      // 3. Gabungkan data tamu dengan ticket_code dari buku_tamu
      const synchronizedGuests: Guest[] = [];

      for (const t of (tamuData || [])) {
        const cleanName = (t.nama_tamu || '').trim().toLowerCase();
        const cleanPhone = (t.no_whatsapp || '').replace(/\D/g, '');

        let matched = (t.ticket_code && bukuByCode.get(t.ticket_code)) ||
                      bukuByName.get(cleanName) ||
                      (cleanPhone && bukuByPhone.get(cleanPhone));

        // Jika data tamu lama belum punya data di buku_tamu, otomatis buatkan agar langsung sinkron!
        if (!matched) {
          const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          const autoTicketCode = `FN-${randomCode}`;
          const paxQuota = 1 + (t.membawa_pasangan ? Math.max(1, Number(t.jumlah_tambahan || 0)) : 0);
          const isVip = t.kategori?.includes('Keluarga') ? 'VIP' : 'Reguler';

          const newBukuItem: Partial<BukuTamu> = {
            ticket_code: autoTicketCode,
            nama_tamu: t.nama_tamu.trim(),
            nama_keluarga: t.nama_tamu.trim(),
            kategori_tamu: isVip,
            jatah_tamu: paxQuota,
            jumlah_tamu: paxQuota,
            jumlah_hadir_konfirmasi: paxQuota,
            pihak: t.pihak === 'Nadya' ? 'Pihak Nadya' : 'Pihak Fikri',
            no_whatsapp: t.no_whatsapp || null,
            is_attended: false,
            is_souvenir_given: false
          };

          try {
            await supabase.from('buku_tamu').insert([newBukuItem]);
          } catch (_) {}

          matched = newBukuItem as BukuTamu;
        }

        const resolvedTicketCode = matched?.ticket_code || t.ticket_code || `FN-${t.id?.substring(0, 6)?.toUpperCase()}`;
        const resolvedKategoriTamu = matched?.kategori_tamu || (t.kategori?.includes('Keluarga') ? 'VIP' : 'Reguler');

        synchronizedGuests.push({
          ...t,
          ticket_code: resolvedTicketCode,
          kategori_tamu: resolvedKategoriTamu,
          is_attended: Boolean(matched?.is_attended),
          is_souvenir_given: Boolean(matched?.is_souvenir_given),
          total_pax: getGuestPax(t)
        });
      }

      setAllGuests(synchronizedGuests);
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
    toast.success('Daftar tamu & link barcode berhasil diperbarui!');
  };

  // Computed Overall Metrics
  const metrics = useMemo(() => {
    const totalInvitations = allGuests.length;
    const totalPax = allGuests.reduce((acc, g) => acc + getGuestPax(g), 0);

    const fikriGuests = allGuests.filter((g) => g.pihak === 'Fikri');
    const fikriPax = fikriGuests.reduce((acc, g) => acc + getGuestPax(g), 0);

    const nadyaGuests = allGuests.filter((g) => g.pihak === 'Nadya');
    const nadyaPax = nadyaGuests.reduce((acc, g) => acc + getGuestPax(g), 0);

    const vipGuests = allGuests.filter((g) => g.kategori_tamu === 'VIP');

    return {
      totalInvitations,
      totalPax,
      fikriCount: fikriGuests.length,
      fikriPax,
      nadyaCount: nadyaGuests.length,
      nadyaPax,
      vipCount: vipGuests.length
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
        (g.ticket_code && g.ticket_code.toLowerCase().includes(search)) ||
        (g.no_whatsapp && g.no_whatsapp.includes(search));

      const matchPihak = filterPihak === 'all' || g.pihak === filterPihak;
      const matchKategori = filterKategori === 'all' || g.kategori === filterKategori;
      const matchKategoriTamu = filterKategoriTamu === 'all' || g.kategori_tamu === filterKategoriTamu;

      const matchPasangan =
        filterPasangan === 'all' ||
        (filterPasangan === 'pasangan' && g.membawa_pasangan) ||
        (filterPasangan === 'sendiri' && !g.membawa_pasangan);

      return matchSearch && matchPihak && matchKategori && matchKategoriTamu && matchPasangan;
    });
  }, [allGuests, searchTerm, filterPihak, filterKategori, filterKategoriTamu, filterPasangan]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterPihak, filterKategori, filterKategoriTamu, filterPasangan, pageSize]);

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
    setFilterKategoriTamu('all');
    setFilterPasangan('all');
    setCurrentPage(1);
  };

  const isAnyFilterActive =
    searchTerm !== '' ||
    filterPihak !== 'all' ||
    filterKategori !== 'all' ||
    filterKategoriTamu !== 'all' ||
    filterPasangan !== 'all';

  // Form handlers
  const handleOpenAddModal = () => {
    if (isStaff) {
      toast.error('Akun Staff hanya memiliki hak akses untuk melihat daftar tamu.');
      return;
    }
    setEditingGuest(null);
    setFormData({
      nama_tamu: '',
      no_whatsapp: '',
      pihak: 'Fikri',
      kategori: 'Teman Kerja',
      kategori_tamu: 'Reguler',
      membawa_pasangan: false,
      jumlah_tambahan: 1
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (guest: Guest) => {
    if (isStaff) {
      toast.error('Akun Staff hanya memiliki hak akses untuk melihat daftar tamu.');
      return;
    }
    setEditingGuest(guest);
    setFormData({
      nama_tamu: guest.nama_tamu,
      no_whatsapp: guest.no_whatsapp || '',
      pihak: guest.pihak,
      kategori: guest.kategori,
      kategori_tamu: guest.kategori_tamu || 'Reguler',
      membawa_pasangan: guest.membawa_pasangan,
      jumlah_tambahan: guest.jumlah_tambahan || 1
    });
    setIsFormModalOpen(true);
  };

  // Submit form dengan sinkronisasi otomatis ke buku_tamu (QR barcode & link)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStaff) {
      toast.error('Akun Staff hanya memiliki hak akses untuk melihat daftar tamu.');
      return;
    }
    if (!formData.nama_tamu.trim()) {
      toast.error('Nama tamu wajib diisi!');
      return;
    }

    const additionalCount = formData.membawa_pasangan
      ? Math.min(30, Math.max(1, Number(formData.jumlah_tambahan) || 1))
      : 0;
    const paxQuota = 1 + additionalCount;

    const tamuPayload = {
      nama_tamu: formData.nama_tamu.trim(),
      no_whatsapp: formData.no_whatsapp ? formData.no_whatsapp.trim() : null,
      pihak: formData.pihak,
      kategori: formData.kategori,
      membawa_pasangan: formData.membawa_pasangan,
      jumlah_tambahan: additionalCount
    };

    try {
      if (editingGuest) {
        // 1. Update ke tabel tamu
        const { error: tamuError } = await supabase
          .from('tamu')
          .update(tamuPayload)
          .eq('id', editingGuest.id);

        if (tamuError) throw tamuError;

        // 2. Sinkronisasi update ke tabel buku_tamu
        try {
          const bukuUpdatePayload = {
            nama_tamu: formData.nama_tamu.trim(),
            nama_keluarga: formData.nama_tamu.trim(),
            no_whatsapp: formData.no_whatsapp ? formData.no_whatsapp.trim() : null,
            pihak: formData.pihak === 'Nadya' ? 'Pihak Nadya' : 'Pihak Fikri',
            kategori_tamu: formData.kategori_tamu,
            jatah_tamu: paxQuota,
            jumlah_tamu: paxQuota
          };

          if (editingGuest.ticket_code) {
            await supabase.from('buku_tamu').update(bukuUpdatePayload).eq('ticket_code', editingGuest.ticket_code);
          } else {
            await supabase.from('buku_tamu').update(bukuUpdatePayload).eq('nama_tamu', editingGuest.nama_tamu);
          }
        } catch (syncErr) {
          console.warn('Gagal sinkronisasi update ke buku_tamu:', syncErr);
        }

        logActivity(userEmail, 'update', 'Tamu', `Update tamu: ${formData.nama_tamu}`);
        toast.success(`Data ${formData.nama_tamu} berhasil diperbarui di Daftar Tamu & Buku Tamu!`);

        if (viewingGuest && viewingGuest.id === editingGuest.id) {
          setViewingGuest({ ...viewingGuest, ...tamuPayload, kategori_tamu: formData.kategori_tamu });
        }
      } else {
        // 1. Generate Kode Tiket Barcode Unik
        const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const newTicketCode = `FN-${randomCode}`;

        // 2. Insert ke tabel tamu
        const { error: tamuError } = await supabase.from('tamu').insert([tamuPayload]);
        if (tamuError) throw tamuError;

        // 3. Otomatis buatkan data QR & link unik di buku_tamu agar langsung muncul di menu Buku Tamu & Scan!
        const bukuPayload = {
          ticket_code: newTicketCode,
          nama_tamu: formData.nama_tamu.trim(),
          nama_keluarga: formData.nama_tamu.trim(),
          no_whatsapp: formData.no_whatsapp ? formData.no_whatsapp.trim() : null,
          pihak: formData.pihak === 'Nadya' ? 'Pihak Nadya' : 'Pihak Fikri',
          kategori_tamu: formData.kategori_tamu,
          jatah_tamu: paxQuota,
          jumlah_tamu: paxQuota,
          jumlah_hadir_konfirmasi: paxQuota,
          is_attended: false,
          is_souvenir_given: false
        };

        try {
          await supabase.from('buku_tamu').insert([bukuPayload]);
        } catch (bukuErr) {
          console.warn('Gagal insert buku_tamu:', bukuErr);
        }

        logActivity(userEmail, 'create', 'Tamu', `Tambah tamu: ${formData.nama_tamu} (${newTicketCode})`);
        toast.success(`Tamu ${formData.nama_tamu} ditambahkan! Kode ${newTicketCode} & QR otomatis aktif di Buku Tamu & Scan.`);
      }

      setIsFormModalOpen(false);
      await fetchGuests();
    } catch (err: any) {
      toast.error('Gagal menyimpan tamu: ' + (err?.message || err));
    }
  };

  // Delete tamu dengan penghapusan otomatis di buku_tamu
  const handleDelete = async (guest: Guest) => {
    if (isStaff) {
      toast.error('Akun Staff tidak memiliki izin untuk menghapus data tamu.');
      return;
    }
    if (!confirm(`Hapus tamu "${guest.nama_tamu}" dari daftar undangan dan buku tamu?`)) return;
    try {
      // 1. Hapus dari tabel tamu
      const { error: tamuError } = await supabase.from('tamu').delete().eq('id', guest.id);
      if (tamuError) throw tamuError;

      // 2. Sinkronisasi hapus dari tabel buku_tamu
      try {
        if (guest.ticket_code) {
          await supabase.from('buku_tamu').delete().eq('ticket_code', guest.ticket_code);
        } else {
          await supabase.from('buku_tamu').delete().eq('nama_tamu', guest.nama_tamu);
        }
      } catch (syncErr) {
        console.warn('Gagal sinkronisasi hapus buku_tamu:', syncErr);
      }

      logActivity(userEmail, 'delete', 'Tamu', `Hapus tamu: ${guest.nama_tamu}`);
      toast.success(`Tamu "${guest.nama_tamu}" dan data QR di Buku Tamu berhasil dihapus!`);

      if (viewingGuest && viewingGuest.id === guest.id) {
        setViewingGuest(null);
      }
      if (previewGuest && previewGuest.id === guest.id) {
        setPreviewGuest(null);
      }

      await fetchGuests();
    } catch (err: any) {
      toast.error('Gagal menghapus tamu: ' + (err?.message || err));
    }
  };

  // Open QR Preview Modal
  const handleOpenPreview = async (guest: Guest) => {
    try {
      setPreviewGuest(guest);
      const ticketCode = guest.ticket_code || `FN-${guest.id.substring(0, 6).toUpperCase()}`;
      const checkinUrl = `${window.location.origin}/#/checkin?code=${encodeURIComponent(ticketCode)}`;
      const url = await QRCode.toDataURL(checkinUrl, {
        width: 340,
        margin: 2,
        color: { dark: '#800000', light: '#FFFFFF' }
      });
      setPreviewQrUrl(url);
    } catch (err) {
      toast.error('Gagal memproses QR Code barcode');
    }
  };

  // Salin link RSVP undangan unik
  const handleCopyGuestLink = (guest: Guest) => {
    const ticketCode = guest.ticket_code || `FN-${guest.id.substring(0, 6).toUpperCase()}`;
    const rsvpUrl = `${window.location.origin}/#/rsvp?code=${encodeURIComponent(ticketCode)}`;
    navigator.clipboard.writeText(rsvpUrl);
    setCopiedLink(true);
    toast.success(`Link RSVP untuk ${guest.nama_tamu} berhasil disalin!`);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // WhatsApp Link Builder dengan tautan RSVP unik
  const getWhatsAppLink = (guest: Guest) => {
    let clean = (guest.no_whatsapp || '').replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    else if (!clean.startsWith('62')) clean = '62' + clean;

    const ticketCode = guest.ticket_code || `FN-${guest.id.substring(0, 6).toUpperCase()}`;
    const rsvpUrl = `${window.location.origin}/#/rsvp?code=${encodeURIComponent(ticketCode)}`;

    const message = encodeURIComponent(
      `Assalamu'alaikum Wr. Wb.\n\nYth. ${guest.nama_tamu},\n\nTanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i untuk hadir pada acara pernikahan kami:\n\n👰🏻 Nadya & Fikri 🤵🏻\n\nUntuk konfirmasi kehadiran (RSVP) serta mendapatkan QR Code Masuk & Souvenir, silakan buka tautan undangan unik berikut:\n👉 ${rsvpUrl}\n\nMerupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.\n\nTerima kasih.`
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
• Tamu VIP: ${metrics.vipCount} Undangan

(Filter aktif saat ini: ${totalItems} tamu terpilih • ${filteredPaxCount} Pax)`;

    navigator.clipboard.writeText(text);
    toast.success('Ringkasan daftar tamu disalin ke clipboard!');
  };

  // Copy Single Guest Detail
  const handleCopyGuestDetail = (guest: Guest) => {
    const pax = getGuestPax(guest);
    const ticketCode = guest.ticket_code || '-';
    const rsvpUrl = `${window.location.origin}/#/rsvp?code=${ticketCode}`;

    const detail = `👤 Data Tamu Undangan:
Nama: ${guest.nama_tamu}
Kategori: ${guest.kategori} (${guest.kategori_tamu || 'Reguler'})
Kode Undangan: ${ticketCode}
Pihak: ${guest.pihak}
Estimasi: ${pax} Pax ${guest.membawa_pasangan ? `(1 + ${guest.jumlah_tambahan} pasangan/keluarga)` : '(Sendiri)'}
WhatsApp: ${guest.no_whatsapp || '-'}
Link RSVP: ${rsvpUrl}`;

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
            <span>Terhubung Langsung ke Buku Tamu &amp; Scanner</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-maroon leading-tight">
            Daftar Tamu Undangan
          </h1>
          <p className="text-stone-500 text-xs mt-1">
            Tambah tamu baru secara otomatis membuat <strong>Kode Barcode QR &amp; Link RSVP</strong> yang tersinkronisasi ke Meja Scanner &amp; Buku Tamu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Copy Summary Button */}
          <button
            onClick={handleCopySummary}
            className="px-4 py-3 rounded-2xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold transition-all flex items-center space-x-2 shadow-sm cursor-pointer"
            title="Salin ringkasan daftar tamu ke clipboard"
          >
            <Copy size={16} className="text-stone-500" />
            <span>Salin Ringkasan</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="p-3 rounded-2xl border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-bold transition-all disabled:opacity-50 shadow-sm cursor-pointer"
            title="Muat ulang data dari server"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-gold' : ''} />
          </button>

          {/* Add Guest Button (Pengantin) / Mode Staff Indicator (Staff) */}
          {!isStaff ? (
            <button
              onClick={handleOpenAddModal}
              className="px-6 py-3.5 rounded-2xl bg-maroon hover:bg-maroon-800 text-gold font-bold text-xs tracking-wider uppercase shadow-xl border border-gold/40 flex items-center space-x-2 transition-all active:scale-95 group cursor-pointer"
            >
              <UserPlus size={18} className="group-hover:scale-110 transition-transform text-gold" />
              <span>+ Tambah Tamu (Auto QR)</span>
            </button>
          ) : (
            <div className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-50 to-gold-50 border border-amber-300 text-amber-900 font-bold text-xs flex items-center space-x-2 shadow-sm">
              <Award size={16} className="text-amber-700" />
              <span>Akses Staff • Mode Melihat Tamu VIP &amp; Reguler</span>
            </div>
          )}
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
          <p className="text-[11px] text-stone-400 mt-1">Tersinkron dengan QR Buku Tamu</p>
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
      {/* 3. FILTER, SEARCH, & TOOLBAR                                   */}
      {/* ============================================================== */}
      <div className="bg-white p-5 rounded-3xl border border-gold-200/70 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama tamu, kode tiket (FN-...), kategori, atau nomor WhatsApp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-10 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:border-maroon focus:bg-white transition-all shadow-inner placeholder:text-stone-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Filter Pihak */}
            <select
              value={filterPihak}
              onChange={(e) => setFilterPihak(e.target.value)}
              className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-700 outline-none focus:border-maroon cursor-pointer shadow-sm"
            >
              <option value="all">Semua Pihak</option>
              <option value="Fikri">Pihak Fikri</option>
              <option value="Nadya">Pihak Nadya</option>
            </select>

            {/* Filter Kategori Relasi */}
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-700 outline-none focus:border-maroon cursor-pointer shadow-sm"
            >
              <option value="all">Semua Kategori</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Filter VIP / Reguler */}
            <select
              value={filterKategoriTamu}
              onChange={(e) => setFilterKategoriTamu(e.target.value)}
              className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-700 outline-none focus:border-maroon cursor-pointer shadow-sm"
            >
              <option value="all">Semua Badge</option>
              <option value="VIP">⭐ Tamu VIP</option>
              <option value="Reguler">Tamu Reguler</option>
            </select>

            {/* Filter Pasangan */}
            <select
              value={filterPasangan}
              onChange={(e) => setFilterPasangan(e.target.value)}
              className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-700 outline-none focus:border-maroon cursor-pointer shadow-sm"
            >
              <option value="all">Semua Tamu</option>
              <option value="pasangan">+ Pasangan / Keluarga</option>
              <option value="sendiri">Sendiri (1 Pax)</option>
            </select>

            {/* Reset Filters */}
            {isAnyFilterActive && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                title="Reset semua filter pencarian"
              >
                <X size={14} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Filter Indicator Bar */}
        <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-maroon">{filteredGuests.length}</span>
            <span>dari {allGuests.length} Tamu Ditemukan</span>
            <span className="text-stone-300">•</span>
            <span className="font-bold text-amber-800">{filteredPaxCount} Pax</span>
            <span>Total Katering Terpilih</span>
          </div>

          <div className="text-[11px] text-stone-400">
            Halaman {currentPage} dari {totalPages}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. MASTER GUEST LIST TABLE                                     */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl border border-gold-200/70 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-maroon via-maroon-800 to-maroon text-gold uppercase tracking-wider font-bold text-[11px] border-b border-gold-400/40">
                <th className="px-5 py-4 w-12 text-center">#</th>
                <th className="px-6 py-4">Nama Tamu &amp; Kategori</th>
                <th className="px-6 py-4 text-center">Barcode QR &amp; Link RSVP</th>
                <th className="px-6 py-4 text-center">Pihak</th>
                <th className="px-6 py-4 text-center">Estimasi Pax</th>
                <th className="px-6 py-4 text-center">Kirim WhatsApp</th>
                <th className="px-6 py-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-stone-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <RefreshCw size={24} className="animate-spin text-gold" />
                      <span className="font-serif text-sm font-semibold">
                        Menyelaraskan Data Tamu &amp; Kode Barcode...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : paginatedGuests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-stone-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Users size={32} className="text-stone-300" />
                      <p className="font-bold text-stone-600">Tidak ada data tamu ditemukan.</p>
                      {isAnyFilterActive && (
                        <button
                          onClick={handleResetFilters}
                          className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
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
                  const ticketCode = guest.ticket_code || `FN-${guest.id.substring(0, 6).toUpperCase()}`;

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
                            className="text-left font-serif font-bold text-maroon hover:text-maroon-800 text-sm hover:underline flex items-center space-x-1.5 cursor-pointer"
                          >
                            <span>{guest.nama_tamu}</span>
                            {guest.kategori_tamu === 'VIP' && (
                              <span className="inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] font-black uppercase tracking-wider shadow-xs ml-1">
                                <Award size={10} />
                                <span>VIP</span>
                              </span>
                            )}
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

                      {/* Barcode QR & Link Undangan */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center space-x-1.5 bg-stone-50 hover:bg-gold-50/50 p-1.5 rounded-2xl border border-stone-200 transition-colors">
                          {/* Kode Tiket Badge */}
                          <span className="font-mono font-bold text-[11px] text-maroon px-2 py-0.5 bg-white rounded-lg border border-gold-300 shadow-2xs">
                            {ticketCode}
                          </span>

                          {/* Tombol Lihat QR Barcode */}
                          <button
                            onClick={() => handleOpenPreview(guest)}
                            className="p-1.5 rounded-lg bg-gold-50 text-gold-900 hover:bg-gold-100 transition-colors shadow-2xs cursor-pointer"
                            title="Buka QR Barcode untuk Discan"
                          >
                            <QrCode size={14} />
                          </button>

                          {/* Tombol Salin Link RSVP */}
                          <button
                            onClick={() => handleCopyGuestLink(guest)}
                            className="p-1.5 rounded-lg bg-white hover:bg-stone-200 text-stone-600 transition-colors shadow-2xs cursor-pointer"
                            title="Salin Tautan RSVP Tamu"
                          >
                            <LinkIcon size={14} />
                          </button>
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

                      {/* WhatsApp Undangan */}
                      <td className="px-6 py-4 text-center">
                        {guest.no_whatsapp ? (
                          <a
                            href={getWhatsAppLink(guest)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all font-bold text-[11px] shadow-sm group/wa cursor-pointer"
                            title={`Kirim Undangan WhatsApp ke ${guest.no_whatsapp}`}
                          >
                            <MessageCircle size={14} className="text-emerald-600 group-hover/wa:scale-110 transition-transform" />
                            <span>Kirim Undangan</span>
                          </a>
                        ) : (
                          <span className="text-stone-300 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* View Detail Button - Always visible (Tamu VIP/Reguler, Pax, Tiket) */}
                          <button
                            onClick={() => setViewingGuest(guest)}
                            className="p-2 rounded-xl bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-maroon transition-all shadow-sm cursor-pointer"
                            title="Lihat Detail Tamu"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Edit & Delete Buttons - Hanya untuk Pengantin (Disembunyikan untuk Staff) */}
                          {!isStaff && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(guest)}
                                className="p-2 rounded-xl bg-stone-100 hover:bg-gold/20 text-stone-600 hover:text-amber-900 transition-all shadow-sm cursor-pointer"
                                title="Edit Data Tamu"
                              >
                                <Edit2 size={15} />
                              </button>

                              <button
                                onClick={() => handleDelete(guest)}
                                className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all shadow-sm cursor-pointer"
                                title="Hapus Tamu dari Daftar & Buku Tamu"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
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
              <option value={-1}>Semua Data ({totalItems})</option>
            </select>
            <span className="text-stone-400">
              Menampilkan {paginatedGuests.length} dari {totalItems} tamu
            </span>
          </div>

          {/* Page Navigation Controls */}
          {pageSize !== -1 && totalPages > 1 && (
            <div className="flex items-center space-x-1.5">
              {/* First Page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title="Halaman Pertama"
              >
                <ChevronsLeft size={16} />
              </button>

              {/* Prev Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Dynamic Numbered Pages */}
              <div className="flex items-center space-x-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
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
                          className={`min-w-[28px] h-7 px-2 rounded-lg font-bold transition-all text-xs cursor-pointer ${
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
                className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title="Halaman Berikutnya"
              >
                <ChevronRight size={16} />
              </button>

              {/* Last Page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title="Halaman Terakhir"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ============================================================== */}
      {/* 6. MODAL PREVIEW BARCODE QR UNDANGAN                           */}
      {/* ============================================================== */}
      {previewGuest && (
        <Modal
          isOpen={Boolean(previewGuest)}
          onClose={() => setPreviewGuest(null)}
          title="Tiket & Barcode QR Tamu"
          maxWidth="max-w-md"
        >
          <div className="p-4 text-center space-y-4 font-sans">
            
            {/* QR Viewport */}
            <div className="relative inline-block bg-white p-4 rounded-3xl border-2 border-dashed border-maroon/30 shadow-lg">
              {previewQrUrl ? (
                <img
                  src={previewQrUrl}
                  alt={`QR Code ${previewGuest.nama_tamu}`}
                  className="w-56 h-56 mx-auto rounded-2xl"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center">
                  <RefreshCw size={32} className="animate-spin text-gold" />
                </div>
              )}

              {/* Monogram Seal in Center Badge */}
              <div className="mt-2">
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">
                  Scan QR untuk Check-in di Meja Resepsi
                </span>
              </div>
            </div>

            {/* Guest Identity */}
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-widest text-gold-700">
                KODE TIKET RESMI
              </span>
              <h3 className="font-mono text-xl font-bold text-maroon tracking-wider">
                {previewGuest.ticket_code}
              </h3>
              <p className="font-serif text-lg font-bold text-gray-900 mt-1">
                {previewGuest.nama_tamu}
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-stone-500 font-semibold">
                <span>Pihak {previewGuest.pihak}</span>
                <span>•</span>
                <span>{getGuestPax(previewGuest)} Pax</span>
                <span>•</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  previewGuest.kategori_tamu === 'VIP' ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-700'
                }`}>
                  {previewGuest.kategori_tamu || 'Reguler'}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2">
                {/* Buka Link RSVP */}
                <a
                  href={`${window.location.origin}/#/rsvp?code=${previewGuest.ticket_code}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <ExternalLink size={13} />
                  <span>Buka RSVP</span>
                </a>

                {/* Salin Link RSVP */}
                <button
                  onClick={() => handleCopyGuestLink(previewGuest)}
                  className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  {copiedLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedLink ? 'Tersalin!' : 'Salin Link'}</span>
                </button>
              </div>

              {/* Kirim WhatsApp Undangan */}
              {previewGuest.no_whatsapp && (
                <a
                  href={getWhatsAppLink(previewGuest)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
                >
                  <MessageCircle size={15} />
                  <span>Kirim Undangan WhatsApp</span>
                </a>
              )}

              {/* Download Image QR */}
              {previewQrUrl && (
                <a
                  href={previewQrUrl}
                  download={`QR-Undangan-${previewGuest.ticket_code}-${previewGuest.nama_tamu.replace(/\s+/g, '_')}.png`}
                  className="w-full py-2.5 px-4 rounded-xl bg-maroon hover:bg-maroon-800 text-gold text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-md border border-gold/40 cursor-pointer"
                >
                  <Download size={15} />
                  <span>Download / Simpan Gambar QR</span>
                </a>
              )}
            </div>

          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* 7. DEDICATED VIEW / DETAIL TAMU MODAL                         */}
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

              <h2 className="font-serif text-2xl font-bold text-maroon flex items-center justify-center space-x-2">
                <span>{viewingGuest.nama_tamu}</span>
                {viewingGuest.kategori_tamu === 'VIP' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black tracking-wider uppercase shadow-xs">
                    VIP
                  </span>
                )}
              </h2>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white text-maroon border border-gold-300 shadow-2xs">
                  {viewingGuest.ticket_code}
                </span>

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
                      href={getWhatsAppLink(viewingGuest)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
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
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenPreview(viewingGuest)}
                  className="px-4 py-2.5 rounded-xl bg-gold-50 hover:bg-gold-100 text-gold-950 border border-gold-300 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <QrCode size={14} />
                  <span>Lihat QR Barcode</span>
                </button>

                <button
                  onClick={() => handleCopyGuestDetail(viewingGuest)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Copy size={14} />
                  <span>Salin Info</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const guestToEdit = viewingGuest;
                    setViewingGuest(null);
                    handleOpenEditModal(guestToEdit);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-maroon hover:bg-maroon-800 text-gold text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <Edit2 size={14} />
                  <span>Edit Data</span>
                </button>

                <button
                  onClick={() => setViewingGuest(null)}
                  className="px-4 py-2.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* 8. ADD / EDIT GUEST MODAL (WITH VIP & AUTO QR BARCODE LINK)    */}
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
                Nama Lengkap Tamu / Keluarga <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="Contoh: Bpk. Bambang Sutrisno / Keluarga Bpk. Rahmat"
                value={formData.nama_tamu}
                onChange={(e) => setFormData({ ...formData, nama_tamu: e.target.value })}
                className="w-full px-4 py-3 border border-stone-300 focus:border-maroon rounded-xl font-bold text-stone-800 outline-none transition-all shadow-sm"
              />
            </div>

            {/* Nomor WhatsApp */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-maroon uppercase tracking-wider">
                Nomor WhatsApp (Untuk Kirim Undangan Digital)
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
                Tamu dapat langsung dikirimi link undangan digital &amp; QR Code melalui WhatsApp.
              </p>
            </div>

            {/* Kategori Undangan (VIP vs Reguler) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-maroon uppercase tracking-wider">
                Kategori Undangan
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, kategori_tamu: 'Reguler' })}
                  className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    formData.kategori_tamu === 'Reguler'
                      ? 'bg-stone-800 text-white border-stone-800 shadow-sm'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <span>Tamu Reguler</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, kategori_tamu: 'VIP' })}
                  className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    formData.kategori_tamu === 'VIP'
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-gold-100 border-amber-500 shadow-md ring-2 ring-amber-300'
                      : 'bg-amber-50/50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Award size={14} className="text-gold" />
                  <span>Tamu VIP (Istimewa)</span>
                </button>
              </div>
            </div>

            {/* Pihak & Kategori Relasi (2 columns) */}
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
                      max={30}
                      value={formData.jumlah_tambahan}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          setFormData({ ...formData, jumlah_tambahan: '' as any });
                          return;
                        }
                        const val = parseInt(raw, 10);
                        if (isNaN(val)) return;
                        setFormData({
                          ...formData,
                          jumlah_tambahan: Math.min(30, Math.max(1, val))
                        });
                      }}
                      onBlur={() => {
                        if (!formData.jumlah_tambahan || Number(formData.jumlah_tambahan) < 1) {
                          setFormData({ ...formData, jumlah_tambahan: 1 });
                        } else if (Number(formData.jumlah_tambahan) > 30) {
                          setFormData({ ...formData, jumlah_tambahan: 30 });
                        }
                      }}
                      className="w-16 text-center font-mono font-bold text-maroon text-sm outline-none"
                    />
                    <span className="text-[10px] font-bold text-stone-500 uppercase">
                      Orang (Maks. 30)
                    </span>
                  </div>
                )}
              </div>

              {/* Quick shortcut pills for large families or entire company division (Bisa untuk 1 Divisi s.d. 30 Pax) */}
              {formData.membawa_pasangan && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gold-200/50">
                  <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mr-1">
                    Pilihan Cepat:
                  </span>
                  {[1, 2, 4, 9, 14, 19, 24, 29].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormData({ ...formData, jumlah_tambahan: val })}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                        Number(formData.jumlah_tambahan) === val
                          ? 'bg-maroon text-gold border-gold shadow-xs'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      +{val} ({val + 1} Pax)
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, jumlah_tambahan: 29 })}
                    className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-all cursor-pointer"
                  >
                    🏢 1 Divisi (30 Pax)
                  </button>
                </div>
              )}

              {/* Total Pax Calculator Hint */}
              <div className="p-3 bg-white/80 rounded-xl border border-dashed border-gold-300 flex items-center space-x-2 text-xs">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <p className="text-stone-700">
                  Total estimasi katering untuk tamu ini:{' '}
                  <strong className="text-maroon font-serif text-sm">
                    {1 + (formData.membawa_pasangan ? Number(formData.jumlah_tambahan || 1) : 0)} Pax
                  </strong>
                  {formData.membawa_pasangan && Number(formData.jumlah_tambahan) >= 9 && (
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                      🏢 Rombongan / 1 Divisi
                    </span>
                  )}
                </p>
              </div>

              {/* Auto Sync Notice */}
              <div className="p-3 bg-gold-50/70 rounded-xl border border-gold-300/60 text-[11px] text-amber-900 flex items-start space-x-2">
                <Sparkles size={14} className="text-gold shrink-0 mt-0.5" />
                <p>
                  Sistem akan <strong>otomatis membuatkan barcode unik &amp; link undangan</strong> yang langsung terdaftar pada menu <strong>Buku Tamu &amp; Scan</strong> serta <strong>Scan Kehadiran</strong>.
                </p>
              </div>
            </div>

          </div>

          {/* Form Submit Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="px-5 py-3 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-all cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-maroon hover:bg-maroon-800 text-gold text-xs font-bold uppercase tracking-wider shadow-lg border border-gold/40 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Save size={16} />
              <span>{editingGuest ? 'Simpan Perubahan' : 'Tambah & Buat Barcode'}</span>
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default GuestList;
