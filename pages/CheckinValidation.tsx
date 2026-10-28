import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Users, 
  Sparkles, 
  ArrowLeft, 
  Camera, 
  RotateCcw, 
  Phone, 
  MessageSquareHeart, 
  ExternalLink,
  ShieldCheck,
  Check,
  Send,
  Lock,
  Unlock,
  UserCheck,
  Gift,
  Award,
  PackageCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, logActivity } from '../supabase';
import { BukuTamu } from '../types';

// Audio feedback chime using Web Audio API
const playChime = (isSuccess: boolean = true) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isSuccess) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // ignore
  }
};

const CheckinValidation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rawCode = searchParams.get('code') || '';
  const modeParam = searchParams.get('mode') || '';
  const isSouvenirMode = modeParam.toLowerCase() === 'souvenir' || rawCode.toUpperCase().startsWith('SV-');

  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const initialCode = rawCode.trim().toUpperCase().startsWith('SV-') 
    ? rawCode.trim().toUpperCase().substring(3) 
    : rawCode.trim().toUpperCase();
  const [ticketCode, setTicketCode] = useState(initialCode);
  const [guest, setGuest] = useState<BukuTamu | null>(null);
  const [loading, setLoading] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [wasAlreadyAttended, setWasAlreadyAttended] = useState(false);
  const [errorNotFound, setErrorNotFound] = useState(false);
  const hasAutoCheckedRef = useRef(false);

  // Manual input state
  const [inputCode, setInputCode] = useState('');

  // Officer Login Form state
  const [officerUser, setOfficerUser] = useState('resepsi');
  const [officerPassword, setOfficerPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Check auth session
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data?.session || null);
      } catch (err) {
        setSession(null);
      } finally {
        setSessionLoading(false);
      }
    };
    initAuth();
  }, []);

  const fetchAndValidate = async (codeToVerify: string, activeSession?: any) => {
    if (!codeToVerify) return;
    try {
      setLoading(true);
      setErrorNotFound(false);
      setGuest(null);

      let cleanCode = codeToVerify.trim().toUpperCase();
      if (cleanCode.startsWith('SV-')) {
        cleanCode = cleanCode.substring(3);
      }

      const { data, error } = await supabase
        .from('buku_tamu')
        .select('*')
        .eq('ticket_code', cleanCode);

      if (error && !error.message?.includes('schema cache')) {
        throw error;
      }

      const target = Array.isArray(data) ? data[0] : data;

      if (!target) {
        playChime(false);
        setErrorNotFound(true);
        toast.error(`Kode tiket "${cleanCode}" tidak ditemukan!`);
        return;
      }

      setGuest(target);
      const currentSess = activeSession !== undefined ? activeSession : session;

      // Handle Souvenir Mode
      if (isSouvenirMode && currentSess?.user) {
        if (target.is_souvenir_given) {
          setWasAlreadyAttended(true);
          setProcessed(true);
          playChime(false);
          toast.error('⚠️ Souvenir untuk tamu ini sudah pernah diambil sebelumnya!');
        } else {
          const nowIso = new Date().toISOString();
          await supabase
            .from('buku_tamu')
            .update({
              is_souvenir_given: true,
              souvenir_given_at: nowIso,
              is_attended: true,
              attended_at: target.attended_at || nowIso
            })
            .eq('id', target.id);

          const updated: BukuTamu = {
            ...target,
            is_souvenir_given: true,
            souvenir_given_at: nowIso,
            is_attended: true,
            attended_at: target.attended_at || nowIso
          };
          setGuest(updated);
          setProcessed(true);
          playChime(true);
          toast.success(`🎁 1 Paket Souvenir Berhasil Diserahkan: ${target.nama_keluarga || target.nama_tamu}!`);
        }
        return;
      }

      // Normal Attendance Check
      if (target.is_attended) {
        setWasAlreadyAttended(true);
        setProcessed(true);
        playChime(false);
      } else {
        if (currentSess?.user) {
          // Authorized officer logged in: Confirm check-in immediately!
          setWasAlreadyAttended(false);
          await handleConfirmCheckin(target, currentSess.user.email);
        } else {
          // Not logged in: Show officer authorization prompt
          setWasAlreadyAttended(false);
          setProcessed(false);
        }
      }
    } catch (err: any) {
      console.error('Validation error:', err);
      toast.error('Gagal memvalidasi tiket: ' + (err?.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCheckin = async (targetGuest: BukuTamu, officerEmail?: string) => {
    try {
      const nowIso = new Date().toISOString();

      const { error } = await supabase
        .from('buku_tamu')
        .update({
          is_attended: true,
          attended_at: nowIso
        })
        .eq('id', targetGuest.id);

      if (error && !error.message?.includes('schema cache')) {
        throw error;
      }

      const updated = {
        ...targetGuest,
        is_attended: true,
        attended_at: nowIso
      };

      setGuest(updated);
      setProcessed(true);
      playChime(true);
      toast.success(`✅ Check-in Berhasil: ${targetGuest.nama_tamu} (${targetGuest.jumlah_tamu} Pax)!`, {
        duration: 5000
      });

      logActivity(
        officerEmail || session?.user?.email || 'resepsi@wedding.com',
        'update',
        'Tamu',
        `Check-in QR Scan: ${targetGuest.nama_tamu} (${targetGuest.jumlah_tamu} Pax - ${targetGuest.ticket_code})`
      );
    } catch (err: any) {
      console.error('Confirm check-in error:', err);
      toast.error('Gagal mengonfirmasi kehadiran: ' + err.message);
    }
  };

  const handleToggleSouvenir = async () => {
    if (!guest) return;
    try {
      const newStatus = !guest.is_souvenir_given;
      const newGivenAt = newStatus ? new Date().toISOString() : null;

      const { error } = await supabase
        .from('buku_tamu')
        .update({
          is_souvenir_given: newStatus,
          souvenir_given_at: newGivenAt
        })
        .eq('id', guest.id);

      if (error && !error.message?.includes('schema cache')) throw error;

      const updated: BukuTamu = {
        ...guest,
        is_souvenir_given: newStatus,
        souvenir_given_at: newGivenAt
      };

      setGuest(updated);

      if (newStatus) {
        playChime(true);
        toast.success(`🎁 Souvenir berhasil diserahkan untuk ${guest.nama_keluarga || guest.nama_tamu}!`);
        logActivity(
          session?.user?.email || 'resepsi@wedding.com',
          'update',
          'Tamu',
          `Serah Souvenir: ${guest.nama_tamu} (${guest.ticket_code})`
        );
      } else {
        toast('Status souvenir dibatalkan', { icon: 'ℹ️' });
      }
    } catch (err: any) {
      toast.error('Gagal memperbarui status souvenir: ' + err.message);
    }
  };

  const handleOfficerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerUser.trim() || !officerPassword) {
      toast.error('Masukkan username & password petugas');
      return;
    }

    try {
      setLoggingIn(true);
      const normalizedEmail = officerUser.includes('@')
        ? officerUser.trim()
        : `${officerUser.trim()}@wedding.com`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: officerPassword
      });

      if (error) throw error;

      setSession(data.session);
      toast.success(`Login Petugas Berhasil: ${data.user?.name || officerUser}!`);

      if (guest && !guest.is_attended) {
        await handleConfirmCheckin(guest, data.user?.email || normalizedEmail);
      }
    } catch (err: any) {
      toast.error(err.message || 'Login petugas gagal. Periksa username & password.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleCancelCheckin = async () => {
    if (!guest) return;
    try {
      const { error } = await supabase
        .from('buku_tamu')
        .update({
          is_attended: false,
          attended_at: null
        })
        .eq('id', guest.id);

      if (error) throw error;

      setGuest({
        ...guest,
        is_attended: false,
        attended_at: null
      });
      setWasAlreadyAttended(false);
      setProcessed(false);
      toast('Status kehadiran dibatalkan', { icon: 'ℹ️' });
    } catch (err: any) {
      toast.error('Gagal membatalkan: ' + err.message);
    }
  };

  useEffect(() => {
    if (rawCode && !hasAutoCheckedRef.current && !sessionLoading) {
      hasAutoCheckedRef.current = true;
      fetchAndValidate(rawCode, session);
    }
  }, [rawCode, sessionLoading]);

  const isAuthorized = Boolean(session?.user);

  return (
    <div className="min-h-screen bg-[#fcf9f5] text-[#2c1810] font-sans relative overflow-x-hidden selection:bg-amber-200">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-amber-200/50 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-red-200/40 rounded-full blur-3xl" />
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 md:py-12 relative z-10">
        
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-semibold tracking-widest uppercase mb-3 shadow-sm">
            <ShieldCheck size={14} className="text-[#6B0F1A]" />
            <span>Pemeriksaan Tiket & Meja Resepsi</span>
          </div>

          <h1 className="font-serif text-3xl font-bold text-[#6B0F1A] tracking-tight">
            Fikri & Nadya
          </h1>
          <p className="text-xs uppercase tracking-[0.25em] text-amber-800/80 font-medium mt-1">
            Validasi Kehadiran Tamu Undangan
          </p>

          {isAuthorized && (
            <div className="inline-flex items-center space-x-1.5 mt-3 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Petugas Aktif: {session.user?.name || (session.user?.email ? session.user.email.split('@')[0] : 'Petugas')}</span>
            </div>
          )}
        </div>

        {/* LOADING STATE */}
        {(loading || sessionLoading) && (
          <div className="bg-white rounded-3xl p-10 text-center border border-amber-100 shadow-xl space-y-3">
            <div className="w-12 h-12 border-3 border-amber-300 border-t-[#6B0F1A] rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-stone-700">Memverifikasi Barcode Tiket...</p>
            <p className="text-xs text-stone-400">Menghubungkan ke sistem resepsi pernikahan...</p>
          </div>
        )}

        {/* NOT FOUND STATE */}
        {!loading && !sessionLoading && errorNotFound && (
          <div className="bg-white rounded-3xl p-8 text-center border border-rose-200 shadow-xl space-y-5">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle size={36} />
            </div>

            <div>
              <h3 className="font-serif text-2xl font-bold text-gray-900">Tiket Tidak Ditemukan</h3>
              <p className="text-xs text-gray-500 mt-1">
                Kode tiket <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">{ticketCode || 'KOSONG'}</span> tidak terdaftar di buku tamu digital.
              </p>
            </div>

            {/* Manual input retry */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (inputCode) {
                  setTicketCode(inputCode);
                  fetchAndValidate(inputCode);
                }
              }}
              className="flex gap-2 pt-2"
            >
              <input
                type="text"
                placeholder="Masukkan Kode Tiket (FN-...)"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-3 rounded-xl border border-stone-200 text-xs font-mono uppercase outline-none focus:border-[#6B0F1A]"
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-xl bg-[#6B0F1A] text-white text-xs font-bold hover:bg-[#800000]"
              >
                Cari
              </button>
            </form>

            <button
              onClick={() => navigate('/scanner')}
              className="text-xs font-bold text-[#6B0F1A] hover:underline block mx-auto pt-2"
            >
              Buka Portal Scanner Petugas →
            </button>
          </div>
        )}

        {/* GUEST VALIDATED STATE */}
        {!loading && !sessionLoading && guest && (
          <div className="space-y-5 animate-fade-in">
            
            {/* Status Banner */}
            {wasAlreadyAttended ? (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 text-center shadow-sm relative overflow-hidden">
                <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto mb-2">
                  <AlertCircle size={28} />
                </div>
                <h3 className="font-serif text-lg font-bold text-amber-900">Tamu Sudah Pernah Check-in</h3>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Tamu ini sebelumnya telah terverifikasi hadir di lokasi acara.
                </p>
                {guest.attended_at && (
                  <div className="inline-flex items-center space-x-1.5 mt-3 px-3 py-1 bg-amber-100/80 rounded-full text-xs font-bold text-amber-900">
                    <Clock size={13} />
                    <span>Check-in: {new Date(guest.attended_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                  </div>
                )}
              </div>
            ) : guest.is_attended ? (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-6 text-center shadow-lg relative overflow-hidden">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={32} className="text-white" />
                </div>
                <h3 className="font-serif text-2xl font-bold tracking-tight">Check-in Berhasil!</h3>
                <p className="text-emerald-50 text-xs mt-1">
                  Kehadiran tamu telah tercatat ke dalam sistem buku tamu digital.
                </p>
                <div className="inline-flex items-center space-x-1.5 mt-3 px-3.5 py-1 bg-black/20 rounded-full text-xs font-medium text-emerald-100">
                  <Clock size={13} />
                  <span>Pukul {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                </div>
              </div>
            ) : (
              /* Tamu Belum Hadir & Butuh Login Petugas */
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 text-center shadow-sm">
                <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Lock size={24} />
                </div>
                <h3 className="font-serif text-lg font-bold text-stone-900">Tiket Terverifikasi Valid</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Masukkan akun petugas di bawah ini untuk mencatat kehadiran resmi di meja penerima tamu.
                </p>
              </div>
            )}

            {/* Guest Identity Card */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-amber-200/80 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Data Undangan Terdaftar</span>
                  {guest.kategori_tamu === 'VIP' ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-200 text-stone-900 font-black text-[10px] uppercase tracking-wider shadow-sm">
                      <Award size={11} className="text-stone-900" />
                      <span>VIP</span>
                    </span>
                  ) : (
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold uppercase">
                      Reguler
                    </span>
                  )}
                </div>
                <span className="font-mono font-bold text-xs bg-stone-100 px-3 py-1 rounded-full text-[#6B0F1A] border border-stone-200">
                  {guest.ticket_code}
                </span>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">Nama Tamu / Keluarga</p>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-stone-900 leading-tight mt-0.5">
                  {guest.nama_keluarga || guest.nama_tamu}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 py-2 border-y border-stone-100">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Tamu dari Pihak</p>
                  <span className="inline-block mt-1 px-3 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
                    {guest.pihak}
                  </span>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Jumlah Kehadiran</p>
                  <p className="text-sm font-bold text-stone-900 mt-1 flex items-center space-x-1.5">
                    <Users size={16} className="text-[#6B0F1A]" />
                    <span>
                      {guest.jumlah_hadir_konfirmasi || guest.jumlah_tamu} Orang
                      {guest.jatah_tamu ? ` (Jatah: ${guest.jatah_tamu})` : ''}
                    </span>
                  </p>
                </div>
              </div>

              {/* SOUVENIR STATUS CARD (1 PER UNDANGAN/KELUARGA) */}
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <Gift size={20} className="text-amber-700 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-stone-900 block">Status Souvenir (1 Paket per Keluarga)</span>
                    <span className="text-[11px] text-stone-600 block">
                      {guest.is_souvenir_given 
                        ? `✓ Sudah diserahkan pada ${guest.souvenir_given_at ? new Date(guest.souvenir_given_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : 'lokasi'}` 
                        : 'Belum diserahkan'}
                    </span>
                  </div>
                </div>

                {isAuthorized && (
                  <div>
                    {guest.is_souvenir_given ? (
                      <div className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold">
                        <PackageCheck size={14} className="text-emerald-700" />
                        <span>✓ Souvenir Diberikan</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleToggleSouvenir}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5"
                      >
                        <Gift size={14} />
                        <span>Berikan Souvenir</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {guest.no_whatsapp && (
                <div className="flex items-center space-x-2 text-xs text-stone-600">
                  <Phone size={14} className="text-emerald-600" />
                  <span>WhatsApp: </span>
                  <a 
                    href={`https://wa.me/${guest.no_whatsapp.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="font-bold text-emerald-700 hover:underline"
                  >
                    {guest.no_whatsapp}
                  </a>
                </div>
              )}

              {guest.ucapan && (
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold flex items-center space-x-1">
                    <MessageSquareHeart size={12} className="text-amber-600" />
                    <span>Ucapan / Doa Tamu</span>
                  </p>
                  <p className="text-xs text-stone-700 italic">
                    "{guest.ucapan}"
                  </p>
                </div>
              )}

              {/* GATEKEEPER: JIKA BELUM HADIR & BELUM LOGIN PETUGAS */}
              {!guest.is_attended && !isAuthorized && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                    <Lock size={15} />
                    <span>Otorisasi Petugas Resepsi</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Untuk keamanan dan akurasi daftar hadir, hanya akun khusus Petugas Resepsi yang dapat mengonfirmasi kehadiran tamu ini.
                  </p>

                  <form onSubmit={handleOfficerLogin} className="space-y-2.5 pt-1">
                    <div>
                      <input
                        type="text"
                        placeholder="Username Petugas (e.g. resepsi)"
                        value={officerUser}
                        onChange={(e) => setOfficerUser(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 text-xs font-medium outline-none bg-white focus:ring-2 focus:ring-[#6B0F1A]/20"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        placeholder="Password Petugas"
                        value={officerPassword}
                        onChange={(e) => setOfficerPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 text-xs font-medium outline-none bg-white focus:ring-2 focus:ring-[#6B0F1A]/20"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loggingIn}
                      className="w-full py-3 rounded-xl bg-[#6B0F1A] hover:bg-[#800000] text-gold font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
                    >
                      <Unlock size={14} />
                      <span>{loggingIn ? 'Memverifikasi Akun...' : 'Konfirmasi Kehadiran Tamu Sekarang'}</span>
                    </button>
                  </form>
                </div>
              )}

              {/* JIKA SUDAH LOGIN PETUGAS TAPI BELUM CHECK-IN (Bisa tombol manual) */}
              {!guest.is_attended && isAuthorized && (
                <button
                  onClick={() => handleConfirmCheckin(guest)}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 size={16} />
                  <span>Konfirmasi Kehadiran Tamu ({guest.jumlah_hadir_konfirmasi || guest.jumlah_tamu} Pax)</span>
                </button>
              )}

              {/* Toggle or Cancel action */}
              {guest.is_attended && isAuthorized && (
                <button
                  onClick={handleCancelCheckin}
                  className="w-full py-2.5 px-4 rounded-xl border border-stone-200 text-stone-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-all flex items-center justify-center space-x-1.5"
                >
                  <RotateCcw size={13} />
                  <span>Batalkan Status Hadir</span>
                </button>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => navigate('/scanner')}
                className="w-full py-3.5 px-4 rounded-xl bg-[#6B0F1A] hover:bg-[#800000] text-gold font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <Camera size={15} />
                <span>Buka Kamera Scanner Meja Resepsi</span>
              </button>

              <button
                onClick={() => navigate(`/guest-pass?code=${guest.ticket_code}`)}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-semibold text-xs transition-all flex items-center justify-center space-x-1.5"
              >
                <ExternalLink size={14} />
                <span>Lihat Tampilan Tiket Tamu</span>
              </button>
            </div>
          </div>
        )}

        {/* NO CODE PARAM PROVIDED */}
        {!loading && !sessionLoading && !rawCode && !guest && !errorNotFound && (
          <div className="bg-white rounded-3xl p-8 text-center border border-stone-200 shadow-xl space-y-5">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-[#6B0F1A] flex items-center justify-center mx-auto">
              <Camera size={32} />
            </div>

            <div>
              <h3 className="font-serif text-2xl font-bold text-gray-900">Validasi Barcode Tiket</h3>
              <p className="text-xs text-gray-500 mt-1">
                Scan barcode pada tiket tamu atau masukkan kode tiket di bawah untuk mencatat kehadiran.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (inputCode) {
                  setTicketCode(inputCode);
                  fetchAndValidate(inputCode);
                }
              }}
              className="space-y-3"
            >
              <input
                type="text"
                placeholder="Contoh: FN-A8K9Z2"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm font-mono uppercase text-center outline-none focus:border-[#6B0F1A]"
              />
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#6B0F1A] text-gold font-bold text-xs shadow-md hover:bg-[#800000]"
              >
                Validasi Kehadiran
              </button>
            </form>

            <button
              onClick={() => navigate('/scanner')}
              className="text-xs font-bold text-stone-500 hover:text-[#6B0F1A] block mx-auto pt-2"
            >
              Buka Scanner Kamera Petugas →
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-stone-400 text-xs">
          <p className="text-[10px] uppercase tracking-widest text-stone-400/80 font-semibold">
            Bismillah • Wedding of Fikri & Nadya
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckinValidation;
