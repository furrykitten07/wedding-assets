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
  QrCode as QrIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../supabase';
import { BukuTamu } from '../types';

const GuestPass: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketCodeParam = searchParams.get('code');
  const navigate = useNavigate();

  // Form States
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

  // Attendance celebratory flag
  const [justAttended, setJustAttended] = useState(false);
  const prevAttendedRef = useRef<boolean>(false);

  // Load ticket if code is in URL
  const fetchTicket = async (code: string) => {
    try {
      setLoadingTicket(true);
      const { data, error } = await supabase
        .from('buku_tamu')
        .select('*')
        .eq('ticket_code', code.toUpperCase().trim());

      if (error) throw error;
      const found = Array.isArray(data) ? data[0] : data;
      if (found) {
        setTicket(found);
        // Generate QR Code
        const qrUrl = await QRCode.toDataURL(found.ticket_code, {
          width: 320,
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
        toast.error('Kode tiket tidak ditemukan');
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

  // Handle Form Submit
  const handleSaveRSVP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaTamu.trim()) {
      toast.error('Mohon isi nama lengkap / panggilan');
      return;
    }

    try {
      setSubmitting(true);
      // Generate Unique Ticket Code FN-XXXXXX
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newTicketCode = `FN-${randomCode}`;

      const payload = {
        ticket_code: newTicketCode,
        nama_tamu: namaTamu.trim(),
        no_whatsapp: noWhatsapp.trim() || null,
        pihak,
        jumlah_tamu: Number(jumlahTamu) || 1,
        ucapan: ucapan.trim() || null,
        is_attended: false
      };

      const { data, error } = await supabase.from('buku_tamu').insert([payload]);
      if (error) throw error;

      toast.success('Berhasil mengisi buku tamu! Barcode Anda siap.');

      // Update URL query param to ticket code
      setSearchParams({ code: newTicketCode });
    } catch (err: any) {
      console.error('RSVP save error:', err);
      toast.error(err.message || 'Gagal menyimpan data buku tamu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/#/guest-pass?code=${ticket?.ticket_code}`;
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
    prevAttendedRef.current = false;
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
            <span>Digital Guest Pass & RSVP</span>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#6B0F1A] tracking-tight">
            Fikri & Nadya
          </h1>
          <p className="text-xs uppercase tracking-[0.25em] text-amber-800/80 font-medium mt-1">
            The Wedding Celebration
          </p>
        </div>

        {/* LOADING SPINNER */}
        {loadingTicket && (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-12 text-center border border-amber-100 shadow-xl">
            <div className="w-12 h-12 border-3 border-amber-300 border-t-[#6B0F1A] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-stone-600">Memuat data tiket kehadiran...</p>
          </div>
        )}

        {/* VIEW 1: TICKET PASS CARD (When ticket is loaded) */}
        {!loadingTicket && ticket && (
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
                  Halaman ini akan otomatis terupdate saat barcode Anda discan di lokasi.
                </p>
              </div>
            )}

            {/* THE WEDDING PASS CARD */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-amber-200/80 relative">
              {/* Header Card Pattern */}
              <div className="bg-gradient-to-r from-[#6B0F1A] via-[#800000] to-[#550B14] p-6 text-white text-center relative">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
                <div className="relative z-10">
                  <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-amber-200 text-[10px] font-bold tracking-[0.2em] uppercase backdrop-blur-sm border border-white/10 mb-2">
                    Official Wedding Pass
                  </span>
                  <h2 className="font-serif text-2xl font-bold tracking-tight">Fikri & Nadya</h2>
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
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Nama Tamu Undangan</p>
                    <p className="font-serif text-xl font-bold text-stone-900 leading-tight mt-0.5">{ticket.nama_tamu}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Pihak Mempelai</p>
                      <span className="inline-block mt-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold">
                        {ticket.pihak}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Jumlah Kehadiran</p>
                      <p className="text-sm font-bold text-stone-800 mt-1 flex items-center space-x-1.5">
                        <Users size={15} className="text-[#6B0F1A]" />
                        <span>{ticket.jumlah_tamu} Orang (Pax)</span>
                      </p>
                    </div>
                  </div>

                  {ticket.ucapan && (
                    <div className="pt-3 border-t border-stone-100">
                      <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold flex items-center space-x-1">
                        <MessageSquareHeart size={12} className="text-amber-600" />
                        <span>Doa & Ucapan Anda</span>
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
                <span>Isi Tamu Lain</span>
              </button>
            </div>

            <p className="text-center text-[11px] text-stone-400 pt-2">
              💡 Tip: Simpan tautan ini atau tangkap layar (screenshot) untuk ditunjukkan saat tiba di resepsi.
            </p>
          </div>
        )}

        {/* VIEW 2: RSVP FORM (When no ticket is loaded yet) */}
        {!loadingTicket && !ticket && (
          <div className="bg-white rounded-3xl shadow-xl border border-amber-100 overflow-hidden animate-fade-in">
            {/* Form Top Banner */}
            <div className="bg-gradient-to-r from-[#6B0F1A] to-[#800000] p-6 text-white text-center relative">
              <Heart size={20} className="mx-auto text-amber-300 fill-amber-300/40 mb-2" />
              <h2 className="font-serif text-xl font-bold">Konfirmasi Kehadiran Tamu</h2>
              <p className="text-xs text-amber-100/90 mt-1 max-w-sm mx-auto font-light">
                Mohon lengkapi formulir di bawah ini untuk mendapatkan Barcode Masuk Digital Anda.
              </p>
            </div>

            <form onSubmit={handleSaveRSVP} className="p-6 md:p-8 space-y-5">
              {/* Nama Tamu */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-stone-700 mb-1.5">
                  Nama Tamu / Undangan <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bpk. Ahmad Hidayat & Istri"
                  value={namaTamu}
                  onChange={(e) => setNamaTamu(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-[#6B0F1A] focus:ring-2 focus:ring-[#6B0F1A]/10 outline-none text-sm transition-all bg-stone-50/50 focus:bg-white"
                />
              </div>

              {/* Nomor WhatsApp */}
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:border-[#6B0F1A] focus:ring-2 focus:ring-[#6B0F1A]/10 outline-none text-sm transition-all bg-stone-50/50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Pihak Mempelai Chips */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-stone-700 mb-2">
                  Tamu dari Pihak <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'Pihak Fikri', label: '🤵 Fikri' },
                    { key: 'Pihak Nadya', label: '👰 Nadya' },
                    { key: 'Rekan Bersama', label: '🤝 Bersama' }
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setPihak(item.key as any)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                        pihak === item.key
                          ? 'bg-[#6B0F1A] text-white border-[#6B0F1A] shadow-md'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jumlah Tamu (Pax) Counter */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-stone-700 mb-1.5">
                  Jumlah Kehadiran (Pax) <span className="text-rose-600">*</span>
                </label>
                <div className="flex items-center space-x-3">
                  <div className="inline-flex items-center border border-stone-200 rounded-xl bg-stone-50 p-1">
                    <button
                      type="button"
                      onClick={() => setJumlahTamu((prev) => Math.max(1, prev - 1))}
                      className="w-9 h-9 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-700 font-bold hover:bg-stone-100 transition-colors shadow-sm"
                    >
                      -
                    </button>
                    <span className="w-14 text-center font-bold text-stone-900 text-base">
                      {jumlahTamu}
                    </span>
                    <button
                      type="button"
                      onClick={() => setJumlahTamu((prev) => Math.min(10, prev + 1))}
                      className="w-9 h-9 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-700 font-bold hover:bg-stone-100 transition-colors shadow-sm"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-stone-500">Orang yang akan hadir bersama Anda</span>
                </div>
              </div>

              {/* Ucapan & Doa */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-stone-700 mb-1.5">
                  Ucapan & Doa Restu <span className="text-stone-400 font-normal text-[11px]">(Opsional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan ucapan selamat atau doa berkah untuk Fikri & Nadya..."
                  value={ucapan}
                  onChange={(e) => setUcapan(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-[#6B0F1A] focus:ring-2 focus:ring-[#6B0F1A]/10 outline-none text-sm transition-all bg-stone-50/50 focus:bg-white resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#6B0F1A] via-[#800000] to-[#550B14] text-white font-bold text-sm tracking-wide shadow-lg hover:shadow-xl hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <QrIcon size={18} className="text-amber-300" />
                    <span>Simpan & Buat Barcode Masuk</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-stone-400 text-xs">
          <p className="font-serif italic">"Menuju Sakinah, Mawaddah, Warahmah"</p>
          <p className="text-[10px] uppercase tracking-widest text-stone-400/80 mt-1 font-semibold">
            Bismillah • Wedding of Fikri & Nadya
          </p>
        </div>
      </div>
    </div>
  );
};

export default GuestPass;
