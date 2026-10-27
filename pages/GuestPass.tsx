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
  Edit3
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
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Confirmation Flow States
  const [isEditingConfirmation, setIsEditingConfirmation] = useState(false);
  const [confirmedPax, setConfirmedPax] = useState<number>(1);
  const [attendanceStatus, setAttendanceStatus] = useState<'hadir' | 'tidak_hadir'>('hadir');
  const [guestUcapan, setGuestUcapan] = useState('');
  const [savingConfirmation, setSavingConfirmation] = useState(false);

  // Attendance celebratory flag
  const [justAttended, setJustAttended] = useState(false);
  const prevAttendedRef = useRef<boolean>(false);

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

        // If ticket was pre-registered by admin and guest has not confirmed yet
        const isAlreadyConfirmed = Boolean((found as any).is_confirmed || found.attended_at || found.jumlah_hadir_konfirmasi);
        setIsEditingConfirmation(!isAlreadyConfirmed);

        // Generate QR Code with Full Check-in Validation URL
        const checkinUrl = `${window.location.origin}/#/checkin?code=${encodeURIComponent(found.ticket_code)}`;
        const qrUrl = await QRCode.toDataURL(checkinUrl, {
          width: 340,
          margin: 2,
          color: {
            dark: '#6B0F1A', // Royal Maroon
            light: '#FFFFFF'
          }
        });
        setQrDataUrl(qrUrl);

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
    }
  }, [ticketCodeParam]);

  // Polling check attendance if ticket is open and not yet attended
  useEffect(() => {
    if (!ticket || ticket.is_attended) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('buku_tamu')
          .select('*')
          .eq('ticket_code', ticket.ticket_code);

        const updated = Array.isArray(data) ? data[0] : data;
        if (updated && updated.is_attended) {
          setTicket(updated);
          setJustAttended(true);
          prevAttendedRef.current = true;
          toast.success('🎉 Kehadiran Anda telah berhasil dikonfirmasi oleh penerima tamu!', {
            duration: 6000
          });
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
    navigator.clipboard.writeText(ticket.ticket_code);
    setCopiedCode(true);
    toast.success('Kode tiket disalin!');
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
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: Number(ticket.jatah_tamu || ticket.jumlah_tamu || 1) }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setConfirmedPax(num)}
                        className={`flex-1 min-w-[70px] py-3 rounded-xl font-bold text-xs border transition-all ${
                          confirmedPax === num
                            ? 'bg-maroon text-gold border-gold shadow-md ring-1 ring-gold'
                            : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        {num} Orang
                      </button>
                    ))}
                  </div>
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

        {/* VIEW 1B: TICKET PASS CARD WITH QR CODE (Ketika sudah konfirmasi) */}
        {!loadingTicket && ticket && !isEditingConfirmation && (
          <div className="space-y-5 animate-fade-in">
            
            {/* Live Attended Celebration Notification */}
            {ticket.is_attended && (
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
                    Alhamdulillah, barcode Anda telah berhasil diverifikasi oleh penerima tamu. Selamat menikmati momen bahagia bersama kami.
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

            {/* Waiting Check-in Notification */}
            {!ticket.is_attended && (
              <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center space-x-2 text-amber-900 font-semibold text-xs tracking-wide">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
                  <span>Siap Ditunjukkan di Meja Penerima Tamu</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Halaman ini akan otomatis terupdate saat barcode Anda discan di lokasi acara.
                </p>
              </div>
            )}

            {/* THE WEDDING PASS CARD */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-200/80 relative">
              {/* Header Card Pattern */}
              <div className="bg-gradient-to-r from-[#6B0F1A] via-[#800000] to-[#550B14] p-6 text-white text-center relative">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
                <div className="relative z-10">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-amber-200 text-[10px] font-bold tracking-[0.2em] uppercase backdrop-blur-sm border border-white/10">
                      Official Wedding Pass
                    </span>
                    {ticket.kategori_tamu === 'VIP' && (
                      <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-200 text-stone-900 text-[10px] font-black uppercase tracking-wider shadow-sm">
                        <Award size={12} className="text-stone-900" />
                        <span>VIP</span>
                      </span>
                    )}
                  </div>
                  <h2 className="font-serif text-2xl font-bold tracking-tight">Fikri &amp; Nadya</h2>
                  <p className="text-[11px] text-amber-100/90 font-light mt-0.5">Walimatul Ursy</p>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="p-6 md:p-8 text-center bg-gradient-to-b from-white to-[#fdfaf7]">
                <div className="inline-block p-4 bg-white rounded-2xl shadow-inner border border-stone-200/80 mb-4">
                  {qrDataUrl ? (
                    <img 
                      src={qrDataUrl} 
                      alt={`QR Code ${ticket.ticket_code}`} 
                      className="w-56 h-56 md:w-64 md:h-64 object-contain mx-auto"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center bg-stone-100 rounded-xl text-stone-400">
                      <QrIcon size={48} />
                    </div>
                  )}
                </div>

                {/* Ticket Code Pill */}
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-stone-100 rounded-full border border-stone-300/80 text-stone-800">
                  <span className="text-xs uppercase text-stone-500 font-semibold tracking-wider">Kode Tiket:</span>
                  <span className="font-mono font-bold text-sm text-[#6B0F1A] tracking-wider">{ticket.ticket_code}</span>
                  <button 
                    onClick={handleCopyCode} 
                    className="p-1 hover:text-[#6B0F1A] transition-colors"
                    title="Salin Kode"
                  >
                    {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>

                {/* Download QR Button (Highlight) */}
                <div className="pt-3">
                  <a
                    href={qrDataUrl}
                    download={`QR-Undangan-${ticket.ticket_code}.png`}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition-all shadow-sm active:scale-95"
                  >
                    <Download size={15} className="text-amber-700" />
                    <span>Download / Simpan Gambar QR Code</span>
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

                {/* Guest Details */}
                <div className="space-y-4 text-left">
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
    </div>
  );
};

export default GuestPass;
