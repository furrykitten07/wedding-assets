import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { 
  Heart, 
  CheckCircle2, 
  Copy, 
  Check, 
  Share2, 
  Users, 
  Sparkles, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  MessageSquareHeart, 
  ArrowLeft,
  RotateCcw,
  QrCode as QrIcon,
  Download,
  Award,
  Gift,
  Search,
  Edit3,
  X,
  Maximize2,
  Building2,
  History
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../supabase';
import { BukuTamu } from '../types';

const GuestPass: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketCodeParam = searchParams.get('code');
  const navigate = useNavigate();

  // Search by code state
  const [searchCodeInput, setSearchCodeInput] = useState('');

  // Form States (for self-registration if without code)
  const [namaTamu, setNamaTamu] = useState('');
  const [noWhatsapp, setNoWhatsapp] = useState('');
  const [pihak, setPihak] = useState<'Pihak Fikri' | 'Pihak Nadya' | 'Rekan Bersama'>('Pihak Fikri');
  const [jumlahTamu, setJumlahTamu] = useState(1);
  const [ucapan, setUcapan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Ticket State
  const [ticket, setTicket] = useState<BukuTamu | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrKehadiranUrl, setQrKehadiranUrl] = useState<string>('');
  const [qrSouvenirUrl, setQrSouvenirUrl] = useState<string>('');
  const [activeBarcodeTab, setActiveBarcodeTab] = useState<'kehadiran' | 'souvenir'>('kehadiran');
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Division Guest Pre-Scan Determination (Berapa orang & berapa souvenir yang ditentukan tamu sendiri)
  const [selectedDivisiPax, setSelectedDivisiPax] = useState<number>(1);
  const [selectedDivisiSouvenir, setSelectedDivisiSouvenir] = useState<number>(1);

  // Confirmation Flow States
  const [isEditingConfirmation, setIsEditingConfirmation] = useState(false);
  const [confirmedPax, setConfirmedPax] = useState<number>(1);
  const [attendanceStatus, setAttendanceStatus] = useState<'hadir' | 'tidak_hadir'>('hadir');
  const [guestUcapan, setGuestUcapan] = useState('');
  const [savingConfirmation, setSavingConfirmation] = useState(false);

  // Attendance celebratory flag
  const [justAttended, setJustAttended] = useState(false);
  const prevAttendedRef = useRef<boolean>(false);

  // Helper untuk membuat QR Code beresolusi tinggi dengan parameter pax / souvenir yang ditentukan tamu
  const generateQRCodes = async (
    targetTicket: BukuTamu,
    paxCount: number,
    souvenirCount: number
  ) => {
    try {
      const isDiv = Boolean(targetTicket.is_divisi || targetTicket.kategori?.toLowerCase().includes('divisi'));
      
      // 1. QR Code Kehadiran (Menyertakan parameter &pax=X yang ditentukan langsung oleh tamu)
      const checkinPaxParam = isDiv && paxCount > 0 ? `&pax=${paxCount}` : '';
      const checkinUrl = `${window.location.origin}/#/checkin?code=${encodeURIComponent(targetTicket.ticket_code)}${checkinPaxParam}`;
      const qrUrl1 = await QRCode.toDataURL(checkinUrl, {
        width: 520,
        margin: 1.5,
        color: {
          dark: '#6B0F1A', // Royal Maroon
          light: '#FFFFFF'
        }
      });
      setQrKehadiranUrl(qrUrl1);

      // 2. QR Code Souvenir (Menyertakan parameter &count=X yang ditentukan langsung oleh tamu)
      const souvenirCountParam = isDiv && souvenirCount > 0 ? `&count=${souvenirCount}` : '';
      const souvenirUrl = `${window.location.origin}/#/checkin?code=${encodeURIComponent(targetTicket.ticket_code)}&mode=souvenir${souvenirCountParam}`;
      const qrUrl2 = await QRCode.toDataURL(souvenirUrl, {
        width: 520,
        margin: 1.5,
        color: {
          dark: '#14532D', // Deep Royal Emerald
          light: '#FFFFFF'
        }
      });
      setQrSouvenirUrl(qrUrl2);
    } catch (err) {
      console.error('Error generating QRs:', err);
    }
  };

  // Update qrDataUrl saat tab atau QR URL berubah
  useEffect(() => {
    if (activeBarcodeTab === 'souvenir') {
      if (qrSouvenirUrl) setQrDataUrl(qrSouvenirUrl);
    } else {
      if (qrKehadiranUrl) setQrDataUrl(qrKehadiranUrl);
    }
  }, [activeBarcodeTab, qrKehadiranUrl, qrSouvenirUrl]);

  // Re-generate QR codes saat pilihan jumlah orang atau souvenir diubah oleh tamu divisi
  useEffect(() => {
    if (ticket) {
      generateQRCodes(ticket, selectedDivisiPax, selectedDivisiSouvenir);
    }
  }, [ticket?.ticket_code, ticket?.is_divisi, selectedDivisiPax, selectedDivisiSouvenir]);

  // Load ticket if code is in URL
  const fetchTicket = async (code: string) => {
    try {
      setLoadingTicket(true);
      const cleanCode = code.toUpperCase().trim();
      const { data, error } = await supabase
        .from('buku_tamu')
        .select('*')
        .eq('ticket_code', cleanCode);

      if (error && !error.message?.includes('schema cache')) {
        throw error;
      }
      const found = Array.isArray(data) ? data[0] : data;
      if (found) {
        setTicket(found);
        const jatah = Number(found.jatah_tamu || found.jumlah_tamu) || 1;
        const initialConfirmed = Number(found.jumlah_hadir_konfirmasi || found.jumlah_tamu) || jatah;
        setConfirmedPax(initialConfirmed);
        setGuestUcapan(found.ucapan || '');

        const isDiv = Boolean(found.is_divisi || found.kategori?.toLowerCase().includes('divisi'));

        // Undangan divisi langsung masuk ke halaman Barcode tanpa form individu
        const isAlreadyConfirmed = Boolean((found as any).is_confirmed || found.attended_at || found.jumlah_hadir_konfirmasi);
        setIsEditingConfirmation(isDiv ? false : !isAlreadyConfirmed);

        // Inisialisasi kuota pax hadir dan souvenir yang dapat dipilih tamu
        const totalQuota = Number(found.kuota_pax || found.jatah_tamu || found.jumlah_tamu) || 1;
        const currentHadir = Number(found.pax_hadir || 0);
        const sisa = found.sisa_kuota !== undefined ? Number(found.sisa_kuota) : Math.max(0, totalQuota - currentHadir);
        const defaultPax = sisa > 0 ? 1 : 0;
        setSelectedDivisiPax(defaultPax);

        const taken = Number(found.souvenir_taken || 0);
        const policy = found.souvenir_policy || 'per_pax';
        const maxSouvenir = policy === 'per_undangan' ? Math.max(0, 1 - taken) : Math.max(0, totalQuota - taken);
        const defaultSouvenir = maxSouvenir > 0 ? 1 : 0;
        setSelectedDivisiSouvenir(defaultSouvenir);

        // Generate QR Code awal
        await generateQRCodes(found, defaultPax, defaultSouvenir);

        if (!prevAttendedRef.current && found.is_attended) {
          setJustAttended(true);
        }
        prevAttendedRef.current = Boolean(found.is_attended);
      } else {
        toast.error(`Kode undangan "${cleanCode}" tidak ditemukan`);
      }
    } catch (err: any) {
      console.error('Error fetch ticket:', err);
    } finally {
      setLoadingTicket(false);
    }
  };

  useEffect(() => {
    if (ticketCodeParam) {
      fetchTicket(ticketCodeParam);
    } else {
      setTicket(null);
      setQrDataUrl('');
      setQrKehadiranUrl('');
      setQrSouvenirUrl('');
    }
  }, [ticketCodeParam]);

  // Polling check attendance & souvenir status if ticket is open
  useEffect(() => {
    if (!ticket) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('buku_tamu')
          .select('*')
          .eq('ticket_code', ticket.ticket_code);

        const updated = Array.isArray(data) ? data[0] : data;
        if (updated) {
          const isDiv = Boolean(updated.is_divisi || updated.kategori?.toLowerCase().includes('divisi'));
          
          if (isDiv) {
            const oldHadir = Number(ticket.pax_hadir || 0);
            const newHadir = Number(updated.pax_hadir || 0);
            if (newHadir > oldHadir) {
              const diff = newHadir - oldHadir;
              setTicket(updated);
              setJustAttended(true);
              toast.success(`🎉 Kehadiran +${diff} Pax rombongan Anda berhasil diverifikasi oleh penerima tamu! Sisa kuota: ${updated.sisa_kuota} Pax.`, {
                duration: 6000
              });
              const remaining = Number(updated.sisa_kuota ?? Math.max(0, (updated.kuota_pax || 1) - newHadir));
              setSelectedDivisiPax((prev) => Math.min(Math.max(1, prev), Math.max(1, remaining)));
            }

            const oldTaken = Number(ticket.souvenir_taken || 0);
            const newTaken = Number(updated.souvenir_taken || 0);
            if (newTaken > oldTaken) {
              const diffSv = newTaken - oldTaken;
              setTicket(updated);
              toast.success(`🎁 +${diffSv} Paket Souvenir rombongan Anda berhasil diambil. Terima kasih!`, {
                duration: 6000
              });
              const policy = updated.souvenir_policy || 'per_pax';
              const totalQuota = Number(updated.kuota_pax || updated.jatah_tamu || 1);
              const maxEntitled = policy === 'per_undangan' ? Math.max(0, 1 - newTaken) : Math.max(0, totalQuota - newTaken);
              setSelectedDivisiSouvenir((prev) => Math.min(Math.max(1, prev), Math.max(1, maxEntitled)));
            }
          } else {
            if (!ticket.is_attended && updated.is_attended) {
              setTicket(updated);
              setJustAttended(true);
              prevAttendedRef.current = true;
              toast.success('🎉 Kehadiran Anda telah berhasil dikonfirmasi oleh penerima tamu!', {
                duration: 6000
              });
            }
            if (!ticket.is_souvenir_given && updated.is_souvenir_given) {
              setTicket(updated);
              toast.success('🎁 1 Paket Souvenir Anda telah berhasil diambil. Terima kasih!', {
                duration: 6000
              });
            }
          }
        }
      } catch (err) {
        // silent polling error
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [ticket]);

  // Step 3: Handle Confirmation of Attendance & Generate QR
  const handleConfirmAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;

    try {
      setSavingConfirmation(true);
      const jatah = Number(ticket.jatah_tamu || ticket.jumlah_tamu) || 1;
      const finalCount = attendanceStatus === 'tidak_hadir' ? 0 : Math.min(Math.max(1, confirmedPax), jatah);

      const payload = {
        jumlah_tamu: finalCount > 0 ? finalCount : 1,
        jumlah_hadir_konfirmasi: finalCount,
        ucapan: guestUcapan.trim() || null,
        is_confirmed: true
      };

      const { error } = await supabase
        .from('buku_tamu')
        .update(payload)
        .eq('id', ticket.id);

      if (error && !error.message?.includes('schema cache')) {
        throw error;
      }

      setTicket({
        ...ticket,
        ...payload
      });

      setIsEditingConfirmation(false);
      toast.success('Konfirmasi kehadiran tersimpan! QR Code Anda siap.');
    } catch (err: any) {
      toast.error('Gagal menyimpan konfirmasi: ' + (err?.message || err));
    } finally {
      setSavingConfirmation(false);
    }
  };

  // Handle Form Submit for new guest self-registration
  const handleSaveRSVP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaTamu.trim()) {
      toast.error('Mohon isi nama lengkap / keluarga');
      return;
    }

    try {
      setSubmitting(true);
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newTicketCode = `FN-${randomCode}`;

      const payload = {
        ticket_code: newTicketCode,
        nama_tamu: namaTamu.trim(),
        nama_keluarga: namaTamu.trim(),
        no_whatsapp: noWhatsapp.trim() || null,
        pihak,
        jumlah_tamu: Number(jumlahTamu) || 1,
        jatah_tamu: Number(jumlahTamu) || 1,
        jumlah_hadir_konfirmasi: Number(jumlahTamu) || 1,
        kategori_tamu: 'Reguler',
        ucapan: ucapan.trim() || null,
        is_attended: false,
        is_souvenir_given: false,
        is_confirmed: true
      };

      const { error } = await supabase.from('buku_tamu').insert([payload]);
      if (error && !error.message?.includes('schema cache')) throw error;

      toast.success('Buku tamu terisi! Barcode Anda siap.');
      setSearchParams({ code: newTicketCode });
    } catch (err: any) {
      console.error('RSVP save error:', err);
      toast.error(err.message || 'Gagal menyimpan data buku tamu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/#/rsvp?code=${ticket?.ticket_code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    toast.success('Tautan tiket berhasil disalin!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    if (!ticket) return;
    const codeToCopy = activeBarcodeTab === 'souvenir' ? `SV-${ticket.ticket_code}` : ticket.ticket_code;
    navigator.clipboard.writeText(codeToCopy);
    setCopiedCode(true);
    toast.success(`Kode ${activeBarcodeTab === 'souvenir' ? 'Souvenir' : 'Tiket'} disalin!`);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCreateNew = () => {
    setSearchParams({});
    setNamaTamu('');
    setNoWhatsapp('');
    setJumlahTamu(1);
    setUcapan('');
    setTicket(null);
    setQrDataUrl('');
    setQrKehadiranUrl('');
    setQrSouvenirUrl('');
    setJustAttended(false);
    setIsEditingConfirmation(false);
    prevAttendedRef.current = false;
  };

  const handleSearchCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCodeInput.trim()) {
      setSearchParams({ code: searchCodeInput.trim().toUpperCase() });
    }
  };

  return (
    <div className="min-h-screen bg-[#fcf9f5] text-[#2c1810] font-sans relative overflow-x-hidden selection:bg-amber-200">
      {/* Background Ornaments */}
      <div className="fixed inset-0 pointer-events-none opacity-25">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-amber-200/50 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-red-200/40 rounded-full blur-3xl" />
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 md:py-12 relative z-10">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/70 text-amber-900 text-xs font-semibold tracking-widest uppercase mb-3 shadow-sm">
            <Sparkles size={13} className="text-amber-600 animate-spin" style={{ animationDuration: '8s' }} />
            <span>Digital Guest Pass &amp; RSVP</span>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#6B0F1A] tracking-tight">
            Fikri &amp; Nadya
          </h1>
          <p className="text-xs uppercase tracking-[0.25em] text-amber-800/80 font-medium mt-1">
            The Wedding Celebration
          </p>
        </div>

        {/* LOADING SPINNER */}
        {loadingTicket && (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-12 text-center border border-amber-100 shadow-xl">
            <div className="w-12 h-12 border-3 border-amber-300 border-t-[#6B0F1A] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-stone-600">Memuat data undangan pernikahan...</p>
          </div>
        )}

        {/* VIEW 1A: STEP 3 - FORM KONFIRMASI KEHADIRAN (Sebelum atau saat ubah konfirmasi) */}
        {!loadingTicket && ticket && isEditingConfirmation && (
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-gold-200 overflow-hidden animate-fade-in space-y-0">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-[#6B0F1A] via-[#800000] to-[#550B14] p-6 text-white text-center relative">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-gold text-[10px] font-bold tracking-widest uppercase mb-2">
                <Heart size={12} className="fill-gold text-gold" />
                <span>Konfirmasi Kehadiran Tamu</span>
              </div>
              <h2 className="font-serif text-2xl font-bold">
                Yth. {ticket.nama_keluarga || ticket.nama_tamu}
              </h2>
              <div className="flex items-center justify-center space-x-2 mt-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  ticket.kategori_tamu === 'VIP' 
                    ? 'bg-gradient-to-r from-amber-400 to-amber-200 text-stone-900 border border-amber-300 shadow-sm' 
                    : 'bg-white/20 text-amber-100'
                }`}>
                  {ticket.kategori_tamu === 'VIP' ? '★ Undangan VIP' : 'Undangan Reguler'}
                </span>
                <span className="text-xs text-amber-100/80">•</span>
                <span className="text-xs text-amber-100/90 font-medium">
                  {ticket.pihak}
                </span>
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleConfirmAttendance} className="p-6 md:p-8 space-y-6">
              
              {/* Jatah Undangan Box */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-gold-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">
                    Jatah Undangan Keluarga
                  </span>
                  <span className="font-serif text-lg font-bold text-[#6B0F1A]">
                    Maksimal {ticket.jatah_tamu || ticket.jumlah_tamu || 1} Orang
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-maroon/10 text-maroon flex items-center justify-center">
                  <Users size={22} className="text-[#6B0F1A]" />
                </div>
              </div>

              {/* Status Kehadiran Radio */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                  Rencana Kehadiran Anda <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAttendanceStatus('hadir')}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                      attendanceStatus === 'hadir'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm ring-1 ring-emerald-500'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <CheckCircle2 size={16} className={attendanceStatus === 'hadir' ? 'text-emerald-600' : 'text-stone-400'} />
                    <span>✓ Hadir Memenuhi Undangan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttendanceStatus('tidak_hadir')}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                      attendanceStatus === 'tidak_hadir'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-sm ring-1 ring-rose-500'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <span>✗ Berhalangan Hadir</span>
                  </button>
                </div>
              </div>

              {/* Jumlah Hadir Selector (Jika Hadir) */}
              {attendanceStatus === 'hadir' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                    Berapa orang yang akan hadir? <span className="text-rose-600">*</span>
                  </label>

                  {Number(ticket.jatah_tamu || ticket.jumlah_tamu || 1) <= 8 ? (
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: Number(ticket.jatah_tamu || ticket.jumlah_tamu || 1) }, (_, i) => i + 1).map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setConfirmedPax(num)}
                          className={`flex-1 min-w-[70px] py-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                            confirmedPax === num
                              ? 'bg-maroon text-gold border-gold shadow-md ring-1 ring-gold'
                              : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          {num} Orang
                        </button>
                      ))}
                    </div>
                  ) : (
                    /* Layout Khusus Rombongan / 1 Divisi (Pax > 8 s.d. 30) */
                    <div className="space-y-3 bg-stone-50/80 p-4 rounded-2xl border border-gold-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-xs text-stone-700 font-bold block">
                            Atur Jumlah Kehadiran Rombongan
                          </span>
                          <span className="text-[11px] text-stone-500">
                            Tersedia jatah hingga <strong>{Number(ticket.jatah_tamu || ticket.jumlah_tamu || 1)} Pax</strong>
                          </span>
                        </div>

                        {/* Interactive Counter Stepper */}
                        <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-gold-300 shadow-sm self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setConfirmedPax((prev) => Math.max(1, prev - 1))}
                            className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 font-bold text-maroon flex items-center justify-center transition-colors cursor-pointer text-base"
                            title="Kurang 1 orang"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={Number(ticket.jatah_tamu || ticket.jumlah_tamu || 1)}
                            value={confirmedPax}
                            onChange={(e) => {
                              const maxPax = Number(ticket.jatah_tamu || ticket.jumlah_tamu || 1);
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val)) {
                                setConfirmedPax(Math.min(maxPax, Math.max(1, val)));
                              }
                            }}
                            className="w-14 text-center font-serif text-lg font-bold text-maroon outline-none"
                          />
                          <span className="text-xs font-bold text-stone-500 uppercase pr-1">Pax</span>
                          <button
                            type="button"
                            onClick={() => {
                              const maxPax = Number(ticket.jatah_tamu || ticket.jumlah_tamu || 1);
                              setConfirmedPax((prev) => Math.min(maxPax, prev + 1));
                            }}
                            className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 font-bold text-maroon flex items-center justify-center transition-colors cursor-pointer text-base"
                            title="Tambah 1 orang"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Quick Option Pills for Large Divisions */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-200/80">
                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mr-1">
                          Pilihan Cepat:
                        </span>
                        {[1, 2, 5, 10, 15, 20, 25]
                          .filter((p) => p < Number(ticket.jatah_tamu || ticket.jumlah_tamu || 1))
                          .map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setConfirmedPax(val)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                                confirmedPax === val
                                  ? 'bg-maroon text-gold border-gold shadow-xs'
                                  : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                              }`}
                            >
                              {val} Orang
                            </button>
                          ))}
                        <button
                          type="button"
                          onClick={() => setConfirmedPax(Number(ticket.jatah_tamu || ticket.jumlah_tamu || 1))}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            confirmedPax === Number(ticket.jatah_tamu || ticket.jumlah_tamu || 1)
                              ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          Semua Hadir ({Number(ticket.jatah_tamu || ticket.jumlah_tamu || 1)} Pax)
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-stone-400 italic">
                    * Mohon sesuaikan jumlah orang yang hadir demi kenyamanan pengaturan tempat duduk dan katering.
                  </p>
                </div>
              )}

              {/* Ucapan & Doa Restu */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                  Ucapan &amp; Doa Restu untuk Pengantin
                </label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan ucapan dan doa terbaik Anda untuk Fikri & Nadya..."
                  value={guestUcapan}
                  onChange={(e) => setGuestUcapan(e.target.value)}
                  className="w-full p-4 rounded-xl border border-stone-200 text-xs text-stone-800 outline-none focus:border-maroon focus:ring-1 focus:ring-maroon bg-stone-50/50 resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={savingConfirmation}
                className="w-full py-4 rounded-2xl bg-maroon hover:bg-maroon-800 text-gold font-bold text-xs uppercase tracking-widest shadow-xl border border-gold/40 transition-all flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
              >
                {savingConfirmation ? (
                  <span>Menyimpan Konfirmasi...</span>
                ) : (
                  <>
                    <QrIcon size={16} />
                    <span>Konfirmasi Kehadiran &amp; Dapatkan QR Code</span>
                  </>
                )}
              </button>

              {ticket.is_attended && (
                <button
                  type="button"
                  onClick={() => setIsEditingConfirmation(false)}
                  className="w-full text-center text-xs text-stone-500 hover:underline pt-1"
                >
                  Kembali ke Tampilan QR Code
                </button>
              )}
            </form>
          </div>
        )}

        {/* VIEW 1B: TICKET PASS CARD WITH 2-BARCODE SYSTEM (KEHADIRAN & SOUVENIR) */}
        {!loadingTicket && ticket && !isEditingConfirmation && (
          <div className="space-y-4 animate-fade-in">
            
            {/* 2-MENU BARCODE SWITCHER TABS WITH VIBRANT HIGHLIGHT */}
            <div className="bg-stone-100 p-2 rounded-2xl border-2 border-amber-200/90 shadow-sm grid grid-cols-2 gap-2.5">
              {/* Menu 1: Barcode Kehadiran */}
              <button
                type="button"
                onClick={() => setActiveBarcodeTab('kehadiran')}
                className={`p-3.5 rounded-xl font-bold transition-all flex flex-col items-center justify-center space-y-1 relative cursor-pointer ${
                  activeBarcodeTab === 'kehadiran'
                    ? 'bg-gradient-to-r from-[#6B0F1A] via-[#800000] to-[#550B14] text-gold shadow-lg ring-2 ring-gold-400 scale-[1.02]'
                    : 'bg-white text-stone-600 hover:bg-stone-50 hover:text-maroon border border-stone-200'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <QrIcon size={17} />
                  <span className="text-xs uppercase tracking-wider font-black">1. Kehadiran</span>
                </div>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                  ticket.is_attended 
                    ? 'bg-emerald-500 text-white' 
                    : activeBarcodeTab === 'kehadiran' 
                      ? 'bg-amber-400 text-maroon font-black' 
                      : 'bg-stone-200 text-stone-600'
                }`}>
                  {ticket.is_attended ? '✓ Sudah Hadir' : '● Check-in Tamu'}
                </span>
              </button>

              {/* Menu 2: Barcode Souvenir */}
              <button
                type="button"
                onClick={() => setActiveBarcodeTab('souvenir')}
                className={`p-3.5 rounded-xl font-bold transition-all flex flex-col items-center justify-center space-y-1 relative cursor-pointer ${
                  activeBarcodeTab === 'souvenir'
                    ? 'bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 text-white shadow-lg ring-2 ring-amber-400 scale-[1.02]'
                    : 'bg-white text-stone-600 hover:bg-stone-50 hover:text-amber-800 border border-stone-200'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Gift size={17} />
                  <span className="text-xs uppercase tracking-wider font-black">2. Souvenir</span>
                </div>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                  ticket.is_souvenir_given 
                    ? 'bg-emerald-500 text-white' 
                    : activeBarcodeTab === 'souvenir' 
                      ? 'bg-amber-300 text-amber-950 font-black' 
                      : 'bg-stone-200 text-stone-600'
                }`}>
                  {ticket.is_souvenir_given ? '✓ Sudah Diambil' : '🎁 Klaim Souvenir'}
                </span>
              </button>
            </div>

            {/* KHUSUS UNDANGAN DIVISI: KARTU PENENTUAN JUMLAH PAX / SOUVENIR OLEH TAMU */}
            {ticket.is_divisi ? (
              <div className="animate-fade-in space-y-3">
                {activeBarcodeTab === 'kehadiran' ? (
                  <div className="bg-gradient-to-br from-amber-50 via-white to-amber-50/60 p-5 rounded-3xl border-2 border-amber-300 shadow-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-maroon text-gold flex items-center justify-center font-bold text-xs shadow-sm">
                          <Users size={20} />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-maroon tracking-wider block">
                            Undangan Rombongan Divisi
                          </span>
                          <h4 className="font-serif font-bold text-base text-stone-900 leading-tight">
                            Berapa orang hadir bersama Anda?
                          </h4>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">
                          Sisa Kuota
                        </span>
                        <span className="font-serif font-bold text-base text-amber-900">
                          {ticket.sisa_kuota !== undefined ? ticket.sisa_kuota : Math.max(0, (ticket.kuota_pax || ticket.jumlah_tamu || 1) - (ticket.pax_hadir || 0))} Pax
                        </span>
                      </div>
                    </div>

                    {/* Sisa kuota check */}
                    {(ticket.sisa_kuota !== undefined ? ticket.sisa_kuota : Math.max(0, (ticket.kuota_pax || ticket.jumlah_tamu || 1) - (ticket.pax_hadir || 0))) <= 0 ? (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-center text-xs font-bold text-rose-800">
                        ⚠️ Seluruh kuota rombongan divisi ({ticket.kuota_pax || ticket.jumlah_tamu} Pax) telah hadir.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between bg-white p-2.5 rounded-2xl border border-gold-300 shadow-sm">
                          <button
                            type="button"
                            onClick={() => setSelectedDivisiPax((p) => Math.max(1, p - 1))}
                            disabled={selectedDivisiPax <= 1}
                            className="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 text-maroon font-bold text-xl flex items-center justify-center disabled:opacity-30 cursor-pointer transition-colors active:scale-95"
                            title="Kurang 1 orang"
                          >
                            -
                          </button>

                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <span className="font-serif text-3xl font-black text-maroon">
                                {selectedDivisiPax}
                              </span>
                              <span className="text-xs font-bold uppercase text-stone-600">
                                Pax / Orang
                              </span>
                            </div>
                            <span className="text-[11px] text-stone-500 font-medium block">
                              {selectedDivisiPax === 1 
                                ? 'Saya hadir sendiri' 
                                : `Saya hadir bersama ${selectedDivisiPax - 1} rekan rombongan`}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const sisa = ticket.sisa_kuota !== undefined ? ticket.sisa_kuota : Math.max(0, (ticket.kuota_pax || ticket.jumlah_tamu || 1) - (ticket.pax_hadir || 0));
                              setSelectedDivisiPax((p) => Math.min(sisa, p + 1));
                            }}
                            disabled={selectedDivisiPax >= (ticket.sisa_kuota !== undefined ? ticket.sisa_kuota : Math.max(0, (ticket.kuota_pax || ticket.jumlah_tamu || 1) - (ticket.pax_hadir || 0)))}
                            className="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 text-maroon font-bold text-xl flex items-center justify-center disabled:opacity-30 cursor-pointer transition-colors active:scale-95"
                            title="Tambah 1 orang"
                          >
                            +
                          </button>
                        </div>

                        {/* Quick Option Pills */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-stone-400 font-bold uppercase mr-1">
                            Pilihan Cepat:
                          </span>
                          {(() => {
                            const sisa = ticket.sisa_kuota !== undefined ? ticket.sisa_kuota : Math.max(0, (ticket.kuota_pax || ticket.jumlah_tamu || 1) - (ticket.pax_hadir || 0));
                            return [1, 2, 3, 4, 5, 10]
                              .filter((n) => n <= sisa)
                              .map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setSelectedDivisiPax(num)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    selectedDivisiPax === num
                                      ? 'bg-maroon text-gold border-gold shadow-sm ring-1 ring-gold'
                                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                                  }`}
                                >
                                  {num} Pax
                                </button>
                              ));
                          })()}
                          {(() => {
                            const sisa = ticket.sisa_kuota !== undefined ? ticket.sisa_kuota : Math.max(0, (ticket.kuota_pax || ticket.jumlah_tamu || 1) - (ticket.pax_hadir || 0));
                            if (sisa > 1) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => setSelectedDivisiPax(sisa)}
                                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    selectedDivisiPax === sisa
                                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                  }`}
                                >
                                  Semua Rombongan ({sisa} Pax)
                                </button>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        <div className="p-2.5 bg-amber-100/70 rounded-xl border border-amber-300/80 text-[11px] text-amber-950 text-center font-medium">
                          ⚡ Barcode di bawah <strong>otomatis disiapkan untuk check-in {selectedDivisiPax} Pax</strong>. Petugas penerima tamu akan langsung memindai tanpa perlu menentukan jumlahnya lagi.
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50/60 p-5 rounded-3xl border-2 border-purple-300 shadow-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-purple-700 text-purple-100 flex items-center justify-center font-bold text-xs shadow-sm">
                          <Gift size={20} />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-purple-800 tracking-wider block">
                            Souvenir Divisi / Kelompok
                          </span>
                          <h4 className="font-serif font-bold text-base text-stone-900 leading-tight">
                            Berapa paket souvenir yang diambil?
                          </h4>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">
                          Hak Tersedia
                        </span>
                        {(() => {
                          const policy = ticket.souvenir_policy || 'per_pax';
                          const taken = Number(ticket.souvenir_taken || 0);
                          const totalQuota = Number(ticket.kuota_pax || ticket.jumlah_tamu) || 1;
                          const maxEntitled = policy === 'per_undangan'
                            ? Math.max(0, 1 - taken)
                            : Math.max(0, totalQuota - taken);
                          return (
                            <span className="font-serif font-bold text-base text-purple-900">
                              {maxEntitled} Paket
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {(() => {
                      const policy = ticket.souvenir_policy || 'per_pax';
                      const taken = Number(ticket.souvenir_taken || 0);
                      const totalQuota = Number(ticket.kuota_pax || ticket.jumlah_tamu) || 1;
                      const maxEntitled = policy === 'per_undangan'
                        ? Math.max(0, 1 - taken)
                        : Math.max(0, totalQuota - taken);

                      if (maxEntitled <= 0) {
                        return (
                          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center text-xs font-bold text-emerald-800">
                            ✓ Seluruh paket souvenir untuk rombongan divisi ini telah selesai diambil ({taken} Paket).
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between bg-white p-2.5 rounded-2xl border border-purple-300 shadow-sm">
                            <button
                              type="button"
                              onClick={() => setSelectedDivisiSouvenir((p) => Math.max(1, p - 1))}
                              disabled={selectedDivisiSouvenir <= 1}
                              className="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 text-purple-900 font-bold text-xl flex items-center justify-center disabled:opacity-30 cursor-pointer transition-colors active:scale-95"
                              title="Kurang 1 paket"
                            >
                              -
                            </button>

                            <div className="text-center">
                              <div className="flex items-center justify-center space-x-1.5">
                                <span className="font-serif text-3xl font-black text-purple-900">
                                  {selectedDivisiSouvenir}
                                </span>
                                <span className="text-xs font-bold uppercase text-stone-600">
                                  Paket Souvenir
                                </span>
                              </div>
                              <span className="text-[11px] text-stone-500 font-medium block">
                                {ticket.souvenir_policy === 'per_undangan'
                                  ? '1 paket simbolis untuk rombongan'
                                  : `Diambil untuk ${selectedDivisiSouvenir} orang anggota`}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedDivisiSouvenir((p) => Math.min(maxEntitled, p + 1))}
                              disabled={selectedDivisiSouvenir >= maxEntitled}
                              className="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 text-purple-900 font-bold text-xl flex items-center justify-center disabled:opacity-30 cursor-pointer transition-colors active:scale-95"
                              title="Tambah 1 paket"
                            >
                              +
                            </button>
                          </div>

                          {/* Quick Option Pills */}
                          {maxEntitled > 1 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[10px] text-stone-400 font-bold uppercase mr-1">
                                Pilihan Cepat:
                              </span>
                              {[1, 2, 3, 4, 5, 10]
                                .filter((n) => n <= maxEntitled)
                                .map((num) => (
                                  <button
                                    key={num}
                                    type="button"
                                    onClick={() => setSelectedDivisiSouvenir(num)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                      selectedDivisiSouvenir === num
                                        ? 'bg-purple-800 text-white border-purple-900 shadow-sm'
                                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                                    }`}
                                  >
                                    {num} Paket
                                  </button>
                                ))}
                            </div>
                          )}

                          <div className="p-2.5 bg-purple-100/70 rounded-xl border border-purple-200/80 text-[11px] text-purple-900 text-center font-medium">
                            ⚡ Barcode souvenir di bawah <strong>otomatis disiapkan untuk klaim {selectedDivisiSouvenir} Paket</strong>.
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              /* TAMPILAN NOTIFIKASI UNTUK TAMU INDIVIDU / KELUARGA BIASA */
              <>
                {/* Live Attended Celebration Notification (Only on Kehadiran Tab) */}
                {activeBarcodeTab === 'kehadiran' && ticket.is_attended && (
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-lg border border-emerald-400/30 text-center relative overflow-hidden animate-bounce-short">
                    <div className="absolute -right-4 -bottom-4 text-white/10">
                      <CheckCircle2 size={120} />
                    </div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
                        <CheckCircle2 size={28} className="text-white" />
                      </div>
                      <h3 className="font-serif font-bold text-xl tracking-tight">Kehadiran Dikonfirmasi!</h3>
                      <p className="text-emerald-50 text-xs mt-1 leading-relaxed">
                        Alhamdulillah, barcode kehadiran Anda telah berhasil diverifikasi oleh penerima tamu. Selamat menikmati momen bahagia bersama kami.
                      </p>
                      {ticket.attended_at && (
                        <div className="inline-flex items-center space-x-1.5 mt-3 px-3 py-1 bg-black/20 rounded-full text-[11px] font-medium text-emerald-100">
                          <Clock size={12} />
                          <span>Check-in: {new Date(ticket.attended_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Waiting Check-in Notification (Only on Kehadiran Tab) */}
                {activeBarcodeTab === 'kehadiran' && !ticket.is_attended && (
                  <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 text-center">
                    <div className="flex items-center justify-center space-x-2 text-amber-900 font-semibold text-xs tracking-wide">
                      <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
                      <span>Tunjukkan Barcode Ini di Meja Penerima Tamu</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">
                      Halaman ini akan otomatis terupdate saat barcode kehadiran Anda discan oleh petugas.
                    </p>
                  </div>
                )}

                {/* Souvenir Claimed Notification (Only on Souvenir Tab) */}
                {activeBarcodeTab === 'souvenir' && ticket.is_souvenir_given && (
                  <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white p-5 rounded-2xl shadow-lg border border-emerald-400/30 text-center relative overflow-hidden animate-bounce-short">
                    <div className="absolute -right-4 -bottom-4 text-white/10">
                      <Gift size={120} />
                    </div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
                        <CheckCircle2 size={28} className="text-white" />
                      </div>
                      <h3 className="font-serif font-bold text-xl tracking-tight">Souvenir Sudah Diterima!</h3>
                      <p className="text-emerald-50 text-xs mt-1 leading-relaxed">
                        Terima kasih telah hadir dan merayakan hari bahagia kami. Semoga berkenan dengan souvenir kenang-kenangan ini.
                      </p>
                      {ticket.souvenir_given_at && (
                        <div className="inline-flex items-center space-x-1.5 mt-3 px-3 py-1 bg-black/20 rounded-full text-[11px] font-medium text-emerald-100">
                          <Clock size={12} />
                          <span>Diserahkan: {new Date(ticket.souvenir_given_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Waiting Souvenir Notification (Only on Souvenir Tab) */}
                {activeBarcodeTab === 'souvenir' && !ticket.is_souvenir_given && (
                  <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl p-4 text-center shadow-md">
                    <div className="flex items-center justify-center space-x-2 font-bold text-xs tracking-wide">
                      <Gift size={16} className="text-amber-200 animate-bounce" />
                      <span>Kupon 1 Paket Souvenir Siap Ditukarkan</span>
                    </div>
                    <p className="text-[11px] text-amber-100 mt-1">
                      Tunjukkan barcode souvenir ini kepada petugas meja souvenir untuk mengambil paket souvenir keluarga Anda.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* THE WEDDING PASS CARD */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-200/80 relative">
              {/* Header Card Pattern */}
              <div className={`p-6 text-white text-center relative ${
                activeBarcodeTab === 'souvenir'
                  ? 'bg-gradient-to-r from-amber-700 via-amber-800 to-stone-900'
                  : 'bg-gradient-to-r from-[#6B0F1A] via-[#800000] to-[#550B14]'
              }`}>
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
                <div className="relative z-10">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-amber-200 text-[10px] font-bold tracking-[0.2em] uppercase backdrop-blur-sm border border-white/10">
                      {activeBarcodeTab === 'souvenir' ? 'Kupon Souvenir Tamu' : 'Official Wedding Pass'}
                    </span>
                    {ticket.kategori_tamu === 'VIP' && (
                      <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-200 text-stone-900 text-[10px] font-black uppercase tracking-wider shadow-sm">
                        <Award size={12} className="text-stone-900" />
                        <span>VIP</span>
                      </span>
                    )}
                  </div>
                  <h2 className="font-serif text-2xl font-bold tracking-tight">
                    {activeBarcodeTab === 'souvenir' ? 'Klaim Souvenir Resepsi' : 'Fikri & Nadya'}
                  </h2>
                  <p className="text-[11px] text-amber-100/90 font-light mt-0.5">
                    {activeBarcodeTab === 'souvenir' ? 'Walimatul Ursy • 1 Paket per Undangan' : 'Walimatul Ursy'}
                  </p>
                </div>
              </div>

              {/* QR Code Container (EXTRA LARGE DISPLAY FOR FAST SCANNING) */}
              <div className="p-5 sm:p-8 text-center bg-gradient-to-b from-white to-[#fdfaf7]">
                <div 
                  onClick={() => setIsZoomModalOpen(true)}
                  className={`inline-block p-4 sm:p-6 bg-white rounded-3xl shadow-xl border-4 mb-4 transition-transform hover:scale-[1.02] cursor-pointer group relative ${
                    activeBarcodeTab === 'souvenir' ? 'border-amber-400' : 'border-gold-300'
                  }`}
                  title="Ketuk untuk memperbesar barcode ke ukuran penuh"
                >
                  <img 
                    src={activeBarcodeTab === 'souvenir' ? (qrSouvenirUrl || qrDataUrl) : (qrKehadiranUrl || qrDataUrl)} 
                    alt={`QR Code ${ticket.ticket_code}`} 
                    className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 max-w-full object-contain mx-auto"
                  />
                  <div className="mt-2 text-[11px] text-stone-500 group-hover:text-maroon font-semibold flex items-center justify-center space-x-1">
                    <Maximize2 size={13} className="text-gold" />
                    <span>Ketuk untuk Tampilan Penuh Layar (Zoom)</span>
                  </div>
                </div>

                {/* Ticket Code Pill */}
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-stone-100 rounded-full border border-stone-300/80 text-stone-800">
                  <span className="text-xs uppercase text-stone-500 font-semibold tracking-wider">
                    {activeBarcodeTab === 'souvenir' ? 'Kode Souvenir:' : 'Kode Tiket:'}
                  </span>
                  <span className={`font-mono font-bold text-sm tracking-wider ${
                    activeBarcodeTab === 'souvenir' ? 'text-amber-800' : 'text-[#6B0F1A]'
                  }`}>
                    {activeBarcodeTab === 'souvenir' ? `SV-${ticket.ticket_code}` : ticket.ticket_code}
                  </span>
                  <button 
                    onClick={handleCopyCode} 
                    className="p-1 hover:text-[#6B0F1A] transition-colors cursor-pointer"
                    title="Salin Kode"
                  >
                    {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>

                {/* Status Siap Scan Badge */}
                <div className="pt-2">
                  <div className={`inline-flex items-center space-x-2 px-4 py-1.5 rounded-full border text-xs font-bold shadow-xs ${
                    activeBarcodeTab === 'souvenir'
                      ? 'bg-purple-100 text-purple-950 border-purple-300'
                      : 'bg-amber-100 text-amber-950 border-amber-300'
                  }`}>
                    {activeBarcodeTab === 'souvenir' ? (
                      <>
                        <Gift size={14} className="text-purple-700" />
                        <span>Siap Klaim: <strong>{ticket.is_divisi ? selectedDivisiSouvenir : 1} Paket Souvenir</strong></span>
                      </>
                    ) : (
                      <>
                        <Users size={14} className="text-maroon" />
                        <span>Siap Check-in: <strong>{ticket.is_divisi ? selectedDivisiPax : (ticket.jumlah_hadir_konfirmasi || 1)} Pax</strong></span>
                      </>
                    )}
                  </div>
                </div>

                {/* Download QR Button (Highlight) */}
                <div className="pt-3">
                  <a
                    href={activeBarcodeTab === 'souvenir' ? (qrSouvenirUrl || qrDataUrl) : (qrKehadiranUrl || qrDataUrl)}
                    download={`QR-${activeBarcodeTab === 'souvenir' ? 'Souvenir' : 'Kehadiran'}-${ticket.ticket_code}.png`}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition-all shadow-sm active:scale-95"
                  >
                    <Download size={15} className="text-amber-700" />
                    <span>Download Barcode {activeBarcodeTab === 'souvenir' ? 'Souvenir' : 'Kehadiran'} (PNG)</span>
                  </a>
                </div>

                {/* Dashed Tear-off Line */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-dashed border-stone-200" />
                  </div>
                  <div className="relative flex justify-between -mx-8">
                    <div className="w-6 h-6 bg-[#fcf9f5] rounded-full border-r border-stone-200 shadow-inner" />
                    <div className="w-6 h-6 bg-[#fcf9f5] rounded-full border-l border-stone-200 shadow-inner" />
                  </div>
                </div>

                {/* Guest Details (Individu vs Undangan Divisi) */}
                <div className="space-y-4 text-left">
                  {ticket.is_divisi ? (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-maroon text-gold font-black text-[9px] uppercase tracking-wider">
                              🏢 Undangan Divisi / Kelompok
                            </span>
                          </div>
                          <p className="font-serif text-2xl font-bold text-stone-900 leading-tight mt-1">
                            {ticket.nama_divisi || ticket.nama_keluarga || ticket.nama_tamu}
                          </p>
                        </div>
                      </div>

                      {/* Quota Progress Bento */}
                      <div className="grid grid-cols-3 gap-2 text-center pt-1">
                        <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                          <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider block">Total Kuota</span>
                          <span className="font-serif text-lg font-bold text-maroon block mt-0.5">
                            {ticket.kuota_pax || ticket.jumlah_tamu}
                          </span>
                          <span className="text-[9px] text-stone-400">Pax Anggota</span>
                        </div>

                        <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                          <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider block">Sudah Hadir</span>
                          <span className="font-serif text-lg font-bold text-emerald-800 block mt-0.5">
                            {ticket.pax_hadir || 0}
                          </span>
                          <span className="text-[9px] text-emerald-600">Pax Check-in</span>
                        </div>

                        <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                          <span className="text-[9px] font-bold text-amber-900 uppercase tracking-wider block">Sisa Kuota</span>
                          <span className="font-serif text-lg font-bold text-amber-900 block mt-0.5">
                            {ticket.sisa_kuota ?? Math.max(0, (ticket.kuota_pax || ticket.jumlah_tamu || 1) - (ticket.pax_hadir || 0))}
                          </span>
                          <span className="text-[9px] text-amber-700">Pax Tersedia</span>
                        </div>
                      </div>

                      {/* Shared QR Explanation */}
                      <div className="p-3 bg-amber-50/70 rounded-xl border border-gold-300 text-xs text-amber-950 flex items-start space-x-2">
                        <Building2 size={16} className="text-amber-800 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block">QR Code Bersama Divisi</strong>
                          <p className="text-[11px] text-stone-600 mt-0.5">
                            QR Code ini digunakan bersama oleh seluruh rekan rombongan. Setiap kloter yang hadir dapat memindai barcode yang sama selama sisa kuota masih tersedia.
                          </p>
                        </div>
                      </div>

                      {/* Riwayat Check-in Kloter */}
                      {ticket.checkin_history && ticket.checkin_history.length > 0 && (
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
                          <span className="text-[10px] font-bold text-maroon uppercase tracking-wider flex items-center space-x-1">
                            <History size={12} />
                            <span>Riwayat Kedatangan Anggota ({ticket.checkin_history.length} Kloter)</span>
                          </span>
                          <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                            {ticket.checkin_history.map((tx, idx) => (
                              <div key={tx.id || idx} className="text-[11px] flex justify-between bg-white px-2 py-1 rounded border border-stone-100">
                                <span>Kloter #{idx + 1}: <strong>+{tx.pax} Pax</strong> {tx.catatan ? `(${tx.catatan})` : ''}</span>
                                <span className="font-mono text-stone-400">
                                  {new Date(tx.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Souvenir Division Policy */}
                      <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 flex items-center justify-between text-xs text-purple-950">
                        <div className="flex items-center space-x-2">
                          <Gift size={16} className="text-purple-700" />
                          <div>
                            <span className="font-bold block">
                              {ticket.souvenir_policy === 'per_undangan'
                                ? '1 Paket Souvenir / Undangan Divisi'
                                : '1 Souvenir / Pax Anggota Hadir'}
                            </span>
                            <span className="text-[10px] text-purple-800">
                              Total diambil: {ticket.souvenir_taken || 0} paket
                            </span>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-purple-300">
                          {ticket.souvenir_taken || 0} Diambil
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Nama Tamu / Keluarga</p>
                          <p className="font-serif text-xl font-bold text-stone-900 leading-tight mt-0.5">
                            {ticket.nama_keluarga || ticket.nama_tamu}
                          </p>
                        </div>

                        <button
                          onClick={() => setIsEditingConfirmation(true)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold text-maroon hover:bg-gold-50 border border-gold-200 transition-colors"
                          title="Ubah Konfirmasi Kehadiran"
                        >
                          <Edit3 size={13} />
                          <span>Ubah</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Pihak Mempelai</p>
                          <span className="inline-block mt-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold">
                            {ticket.pihak}
                          </span>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Konfirmasi Kehadiran</p>
                          <p className="text-sm font-bold text-stone-800 mt-1 flex items-center space-x-1.5">
                            <Users size={15} className="text-[#6B0F1A]" />
                            <span>
                              {ticket.jumlah_hadir_konfirmasi || ticket.jumlah_tamu} Orang
                              {ticket.jatah_tamu ? ` (Jatah: ${ticket.jatah_tamu})` : ''}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Souvenir Info Card */}
                      <div className="p-3 bg-amber-50/60 rounded-xl border border-gold-200 flex items-center space-x-2.5 text-xs text-amber-950">
                        <Gift size={18} className="text-amber-700 shrink-0" />
                        <div>
                          <span className="font-bold block">1 Paket Souvenir per Undangan / Keluarga</span>
                          <span className="text-[11px] text-amber-800">
                            {ticket.is_souvenir_given ? '✓ Souvenir telah diserahkan di meja resepsi.' : 'Disediakan dan diserahkan saat check-in di meja penerima tamu.'}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {ticket.ucapan && (
                    <div className="pt-3 border-t border-stone-100">
                      <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold flex items-center space-x-1">
                        <MessageSquareHeart size={12} className="text-amber-600" />
                        <span>Doa &amp; Ucapan Anda</span>
                      </p>
                      <p className="text-xs text-stone-600 italic bg-amber-50/50 p-3 rounded-xl border border-amber-100 mt-1">
                        "{ticket.ucapan}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Footer */}
              <div className="bg-stone-50 px-6 py-4 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500 font-medium">Status Kehadiran</span>
                {ticket.is_attended ? (
                  <span className="inline-flex items-center space-x-1 font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={13} />
                    <span>Terverifikasi Hadir</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 font-semibold text-amber-800 bg-amber-100/70 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-pulse" />
                    <span>Belum Check-in</span>
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-semibold text-xs shadow-sm transition-all"
              >
                {copiedLink ? <Check size={16} className="text-emerald-600" /> : <Share2 size={16} className="text-stone-500" />}
                <span>{copiedLink ? 'Tautan Tersalin!' : 'Bagikan / Simpan Link Tiket'}</span>
              </button>

              <button
                onClick={handleCreateNew}
                className="flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-all"
              >
                <RotateCcw size={15} />
                <span>Cari / Isi Tamu Lain</span>
              </button>
            </div>

            <p className="text-center text-[11px] text-stone-400 pt-2">
              💡 Simpan QR Code di atas ke galeri HP Anda untuk ditunjukkan saat tiba di meja penerima tamu.
            </p>
          </div>
        )}

        {/* VIEW 2: RSVP FORM & LOOKUP (When no ticket is loaded yet) */}
        {!loadingTicket && !ticket && (
          <div className="space-y-6">
            
            {/* Quick Ticket Lookup Box */}
            <div className="bg-white p-5 rounded-2xl border border-gold-200 shadow-md">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-2">
                Sudah Memiliki Kode Undangan Unik?
              </label>
              <form onSubmit={handleSearchCode} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                  <input
                    type="text"
                    placeholder="Ketik Kode Tiket (Contoh: FN-XXXXXX)"
                    value={searchCodeInput}
                    onChange={(e) => setSearchCodeInput(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 font-mono text-xs uppercase outline-none focus:border-maroon"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-maroon hover:bg-maroon-800 text-gold font-bold text-xs uppercase tracking-wider shadow-md"
                >
                  Buka Tiket
                </button>
              </form>
            </div>

            {/* Self-registration Form */}
            <div className="bg-white rounded-3xl shadow-xl border border-amber-100 overflow-hidden animate-fade-in">
              <div className="bg-gradient-to-r from-[#6B0F1A] to-[#800000] p-6 text-white text-center relative">
                <Heart size={20} className="mx-auto text-amber-300 fill-amber-300/40 mb-2" />
                <h2 className="font-serif text-xl font-bold">Pendaftaran Buku Tamu &amp; RSVP</h2>
                <p className="text-xs text-amber-100/90 mt-1 max-w-sm mx-auto font-light">
                  Lengkapi data Anda di bawah ini untuk mendapatkan Barcode Masuk Digital Anda.
                </p>
              </div>

              <form onSubmit={handleSaveRSVP} className="p-6 md:p-8 space-y-5">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold text-stone-700 mb-1.5">
                    Nama Tamu / Keluarga <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Keluarga Bpk. Ahmad Hidayat"
                    value={namaTamu}
                    onChange={(e) => setNamaTamu(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-[#6B0F1A] focus:ring-2 focus:ring-[#6B0F1A]/10 outline-none text-sm transition-all bg-stone-50/50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold text-stone-700 mb-1.5">
                    Nomor WhatsApp <span className="text-stone-400 font-normal text-[11px]">(Opsional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <Phone size={16} />
                    </div>
                    <input
                      type="tel"
                      placeholder="081234567890"
                      value={noWhatsapp}
                      onChange={(e) => setNoWhatsapp(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:border-[#6B0F1A] focus:ring-2 focus:ring-[#6B0F1A]/10 outline-none text-sm transition-all bg-stone-50/50 focus:bg-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold text-stone-700 mb-2">
                    Tamu dari Pihak <span className="text-rose-600">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Pihak Fikri', 'Pihak Nadya', 'Rekan Bersama'] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPihak(item)}
                        className={`py-2.5 px-2 text-xs font-semibold rounded-xl border transition-all text-center ${
                          pihak === item
                            ? 'bg-[#6B0F1A] text-white border-[#6B0F1A] shadow-md'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold text-stone-700 mb-2">
                    Estimasi Jumlah Tamu yang Hadir
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setJumlahTamu(num)}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${
                          jumlahTamu === num
                            ? 'bg-[#6B0F1A] text-amber-200 border-[#6B0F1A] shadow-md'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {num} Pax
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold text-stone-700 mb-1.5">
                    Doa &amp; Ucapan untuk Kedua Mempelai
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tuliskan ucapan selamat atau doa restu..."
                    value={ucapan}
                    onChange={(e) => setUcapan(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-[#6B0F1A] focus:ring-2 focus:ring-[#6B0F1A]/10 outline-none text-sm transition-all bg-stone-50/50 focus:bg-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#6B0F1A] to-[#800000] hover:from-[#800000] hover:to-[#550B14] text-amber-200 font-bold text-xs uppercase tracking-[0.2em] shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 mt-2 flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <span>Menyimpan Data...</span>
                  ) : (
                    <>
                      <QrIcon size={16} />
                      <span>Dapatkan Barcode Tamu</span>
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>
        )}

      </div>

      {/* FULLSCREEN LIGHTBOX FOR INSTANT CAMERA SCANNING */}
      {isZoomModalOpen && ticket && (
        <div 
          onClick={() => setIsZoomModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in text-white cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white text-stone-900 rounded-3xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full text-center shadow-2xl space-y-4 relative border-2 border-amber-300"
          >
            <button
              onClick={() => setIsZoomModalOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
              title="Tutup"
            >
              <X size={20} />
            </button>

            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700 block">
                {activeBarcodeTab === 'souvenir' ? 'Kupon Pengambilan Souvenir' : 'Barcode Kehadiran Tamu'}
              </span>
              <h3 className="font-serif text-xl font-bold text-[#6B0F1A] mt-0.5">
                {ticket.nama_keluarga || ticket.nama_tamu}
              </h3>
            </div>

            <div className="bg-white p-3 rounded-2xl border-2 border-stone-200 shadow-inner inline-block">
              <img
                src={activeBarcodeTab === 'souvenir' ? (qrSouvenirUrl || qrDataUrl) : (qrKehadiranUrl || qrDataUrl)}
                alt="Barcode Zoom"
                className="w-72 h-72 sm:w-80 sm:h-80 object-contain mx-auto"
              />
            </div>

            <div className="font-mono font-bold text-base text-[#6B0F1A] bg-stone-100 py-1.5 px-4 rounded-full inline-block">
              {activeBarcodeTab === 'souvenir' ? `SV-${ticket.ticket_code}` : ticket.ticket_code}
            </div>

            {ticket.is_divisi && (
              <div className="block pt-1">
                <span className={`inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full font-bold text-xs border ${
                  activeBarcodeTab === 'souvenir'
                    ? 'bg-purple-100 text-purple-950 border-purple-300'
                    : 'bg-amber-100 text-amber-950 border-amber-300'
                }`}>
                  {activeBarcodeTab === 'souvenir' ? (
                    <span>🎁 Pengambilan: <strong>{selectedDivisiSouvenir} Paket Souvenir</strong></span>
                  ) : (
                    <span>👥 Check-in: <strong>{selectedDivisiPax} Pax Rombongan</strong></span>
                  )}
                </span>
              </div>
            )}

            <p className="text-xs text-stone-500 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              💡 <strong>Tips:</strong> Tingkatkan kecerahan layar HP ke maksimal agar mudah dibaca oleh sensor kamera penerima tamu.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestPass;
