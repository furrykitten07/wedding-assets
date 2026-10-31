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
  PackageCheck,
  Building2,
  Users2,
  Plus,
  Minus,
  History
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, logActivity } from '../supabase';
import { BukuTamu, CheckinTransaction, SouvenirTransaction } from '../types';

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

  // Division Multi-Kloter Check-in & Souvenir states
  const [divisiPaxInput, setDivisiPaxInput] = useState<number>(1);
  const [divisiNoteInput, setDivisiNoteInput] = useState<string>('');
  const [divisiSouvenirCountInput, setDivisiSouvenirCountInput] = useState<number>(1);
  const [divisiSouvenirNoteInput, setDivisiSouvenirNoteInput] = useState<string>('');
  const [isSubmittingDivision, setIsSubmittingDivision] = useState<boolean>(false);

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

      // Handle Undangan Divisi / Kelompok (Multi-Kloter Check-in & Souvenir Bertahap)
      if (target.is_divisi) {
        if (isSouvenirMode) {
          const policy = target.souvenir_policy || 'per_pax';
          const taken = Number(target.souvenir_taken || 0);
          const hadir = Number(target.pax_hadir || 0);
          const maxEntitled = policy === 'per_undangan'
            ? Math.max(0, 1 - taken)
            : Math.max(0, hadir - taken);

          setDivisiSouvenirCountInput(maxEntitled > 0 ? 1 : 0);
          setWasAlreadyAttended(maxEntitled <= 0);
          setProcessed(false);
        } else {
          const totalQ = Number(target.kuota_pax || target.jumlah_tamu) || 1;
          const hadir = Number(target.pax_hadir || 0);
          const sisa = Math.max(0, totalQ - hadir);

          setDivisiPaxInput(sisa > 0 ? 1 : 0);
          setWasAlreadyAttended(sisa <= 0);
          setProcessed(false);
        }
        return;
      }

      // Handle Souvenir Mode (Individu)
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

  // Konfirmasi Check-in Kloter Divisi (Direct URL)
  const handleConfirmDivisiCheckinDirect = async () => {
    if (!guest || isSubmittingDivision) return;
    try {
      setIsSubmittingDivision(true);

      const { data: latestRaw, error: fetchErr } = await supabase
        .from('buku_tamu')
        .select('*')
        .eq('id', guest.id);

      if (fetchErr && !fetchErr.message?.includes('schema cache')) throw fetchErr;
      const latest = (Array.isArray(latestRaw) ? latestRaw[0] : latestRaw) || guest;

      const totalQ = Number(latest.kuota_pax || latest.jumlah_tamu) || 1;
      const hadir = Number(latest.pax_hadir || 0);
      const sisa = Math.max(0, totalQ - hadir);

      if (sisa <= 0) {
        toast.error('Kuota undangan divisi ini sudah penuh!');
        return;
      }

      const inputPax = Number(divisiPaxInput);
      if (isNaN(inputPax) || inputPax < 1 || inputPax > sisa) {
        toast.error(`Jumlah pax harus antara 1 sampai ${sisa}!`);
        return;
      }

      const nowIso = new Date().toISOString();
      const officerEmail = session?.user?.email || 'resepsi@wedding.com';
      const officerName = session?.user?.email?.toLowerCase().includes('staff1')
        ? 'Staff 1'
        : session?.user?.email?.toLowerCase().includes('staff2')
        ? 'Staff 2'
        : officerEmail.split('@')[0];

      const newTx: CheckinTransaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        waktu: nowIso,
        pax: inputPax,
        petugas: officerName,
        catatan: divisiNoteInput.trim() || undefined
      };

      const newHistory = [...(latest.checkin_history || []), newTx];
      const newHadir = hadir + inputPax;
      const newSisa = Math.max(0, totalQ - newHadir);

      const updatePayload = {
        pax_hadir: newHadir,
        sisa_kuota: newSisa,
        is_attended: true,
        attended_at: latest.attended_at || nowIso,
        checkin_history: newHistory
      };

      const { error: updateError } = await supabase
        .from('buku_tamu')
        .update(updatePayload)
        .eq('id', latest.id);

      if (updateError && !updateError.message?.includes('schema cache')) throw updateError;

      try {
        await supabase
          .from('tamu')
          .update({
            pax_hadir: newHadir,
            sisa_kuota: newSisa,
            checkin_history: newHistory
          })
          .eq('ticket_code', latest.ticket_code);
      } catch (tSync) {
        console.warn('Sync tamu warn:', tSync);
      }

      const updated = {
        ...latest,
        ...updatePayload
      };

      setGuest(updated);
      setProcessed(true);
      playChime(true);
      toast.success(`✅ Check-in +${inputPax} Pax berhasil untuk ${latest.nama_divisi || latest.nama_tamu}! Sisa: ${newSisa} Pax.`);

      logActivity(
        officerEmail,
        'update',
        'Tamu',
        `Check-in Kloter Divisi (Direct URL): ${latest.nama_divisi || latest.nama_tamu} (+${inputPax} Pax • Sisa: ${newSisa})`
      );
    } catch (err: any) {
      toast.error('Gagal memproses check-in kloter: ' + (err?.message || err));
    } finally {
      setIsSubmittingDivision(false);
    }
  };

  // Konfirmasi Serah Terima Souvenir Divisi (Direct URL)
  const handleConfirmDivisiSouvenirDirect = async () => {
    if (!guest || isSubmittingDivision) return;
    try {
      setIsSubmittingDivision(true);

      const { data: latestRaw, error: fetchErr } = await supabase
        .from('buku_tamu')
        .select('*')
        .eq('id', guest.id);

      if (fetchErr && !fetchErr.message?.includes('schema cache')) throw fetchErr;
      const latest = (Array.isArray(latestRaw) ? latestRaw[0] : latestRaw) || guest;

      const policy = latest.souvenir_policy || 'per_pax';
      const taken = Number(latest.souvenir_taken || 0);
      const hadir = Number(latest.pax_hadir || 0);
      const totalQ = Number(latest.kuota_pax || latest.jumlah_tamu) || 1;
      const maxEntitled = policy === 'per_undangan'
        ? Math.max(0, 1 - taken)
        : Math.max(0, hadir - taken);

      if (maxEntitled <= 0) {
        toast.error('Hak pengambilan souvenir saat ini sudah habis!');
        return;
      }

      const inputCount = Number(divisiSouvenirCountInput);
      if (isNaN(inputCount) || inputCount < 1 || inputCount > maxEntitled) {
        toast.error(`Jumlah souvenir harus antara 1 sampai ${maxEntitled}!`);
        return;
      }

      const nowIso = new Date().toISOString();
      const officerEmail = session?.user?.email || 'resepsi@wedding.com';
      const officerName = session?.user?.email?.toLowerCase().includes('staff1')
        ? 'Staff 1'
        : session?.user?.email?.toLowerCase().includes('staff2')
        ? 'Staff 2'
        : officerEmail.split('@')[0];

      const newSvTx: SouvenirTransaction = {
        id: `sv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        waktu: nowIso,
        jumlah: inputCount,
        petugas: officerName,
        catatan: divisiSouvenirNoteInput.trim() || undefined
      };

      const newHistory = [...(latest.souvenir_history || []), newSvTx];
      const newTaken = taken + inputCount;
      const isFullyGiven = policy === 'per_undangan' ? newTaken >= 1 : newTaken >= totalQ;

      const updatePayload = {
        souvenir_taken: newTaken,
        is_souvenir_given: isFullyGiven,
        souvenir_given_at: latest.souvenir_given_at || nowIso,
        souvenir_history: newHistory
      };

      const { error: updateError } = await supabase
        .from('buku_tamu')
        .update(updatePayload)
        .eq('id', latest.id);

      if (updateError && !updateError.message?.includes('schema cache')) throw updateError;

      try {
        await supabase
          .from('tamu')
          .update({
            souvenir_taken: newTaken,
            souvenir_history: newHistory
          })
          .eq('ticket_code', latest.ticket_code);
      } catch (tSync) {
        console.warn('Sync tamu warn:', tSync);
      }

      const updated = {
        ...latest,
        ...updatePayload
      };

      setGuest(updated);
      setProcessed(true);
      playChime(true);
      toast.success(`🎁 Berhasil menyerahkan ${inputCount} paket souvenir untuk ${latest.nama_divisi || latest.nama_tamu}! Total: ${newTaken} paket.`);

      logActivity(
        officerEmail,
        'update',
        'Tamu',
        `Serah Souvenir Divisi (Direct URL): ${latest.nama_divisi || latest.nama_tamu} (+${inputCount} Paket • Total: ${newTaken})`
      );
    } catch (err: any) {
      toast.error('Gagal memproses penyerahan souvenir: ' + (err?.message || err));
    } finally {
      setIsSubmittingDivision(false);
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
            {guest.is_divisi ? (
              <div className="bg-gradient-to-r from-amber-50 to-stone-50 border border-gold-300 rounded-2xl p-5 text-center shadow-sm relative overflow-hidden">
                <div className="w-12 h-12 bg-maroon/10 text-maroon rounded-full flex items-center justify-center mx-auto mb-2">
                  <Building2 size={26} className="text-[#6B0F1A]" />
                </div>
                <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-maroon text-gold font-bold text-[10px] uppercase tracking-wider mb-1">
                  <span>🏢 Undangan Divisi / Kelompok</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-stone-900 mt-1">
                  {guest.nama_divisi || guest.nama_keluarga || guest.nama_tamu}
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  {isSouvenirMode ? 'Penyerahan Souvenir Anggota Divisi' : 'Sistem Check-in Multi-Kloter / Rombongan Terpisah'}
                </p>
              </div>
            ) : wasAlreadyAttended ? (
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
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
                    {guest.is_divisi ? 'Undangan Divisi' : 'Data Undangan Terdaftar'}
                  </span>
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
                <p className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">
                  {guest.is_divisi ? 'Nama Divisi / Kelompok' : 'Nama Tamu / Keluarga'}
                </p>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-stone-900 leading-tight mt-0.5">
                  {guest.nama_divisi || guest.nama_keluarga || guest.nama_tamu}
                </h2>
              </div>

              {/* JIKA DIVISI: TAMPILKAN BENTO KUOTA & KONTROL MULTI-KLOTER */}
              {guest.is_divisi ? (
                (() => {
                  const totalQ = Number(guest.kuota_pax || guest.jumlah_tamu) || 1;
                  const hadir = Number(guest.pax_hadir || 0);
                  const sisa = Math.max(0, totalQ - hadir);
                  const policy = guest.souvenir_policy || 'per_pax';
                  const taken = Number(guest.souvenir_taken || 0);
                  const maxEntitled = policy === 'per_undangan'
                    ? Math.max(0, 1 - taken)
                    : Math.max(0, hadir - taken);

                  return (
                    <div className="space-y-4 pt-1">
                      {/* Bento Cards */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                          <span className="text-[10px] text-stone-500 font-bold uppercase block">Total Kuota</span>
                          <span className="text-xl font-serif font-bold text-maroon block mt-0.5">{totalQ}</span>
                          <span className="text-[10px] text-stone-400">Pax Anggota</span>
                        </div>

                        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                          <span className="text-[10px] text-emerald-800 font-bold uppercase block">Sudah Hadir</span>
                          <span className="text-xl font-serif font-bold text-emerald-800 block mt-0.5">{hadir}</span>
                          <span className="text-[10px] text-emerald-600">Pax Check-in</span>
                        </div>

                        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                          <span className="text-[10px] text-amber-900 font-bold uppercase block">Sisa Kuota</span>
                          <span className="text-xl font-serif font-bold text-amber-900 block mt-0.5">{sisa}</span>
                          <span className="text-[10px] text-amber-700">Pax Tersedia</span>
                        </div>
                      </div>

                      {/* MODE SOUVENIR DIVISI */}
                      {isSouvenirMode ? (
                        <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-purple-900 flex items-center space-x-1.5">
                              <Gift size={16} className="text-purple-700" />
                              <span>Hak Souvenir: <strong>{maxEntitled} Paket Boleh Diambil</strong></span>
                            </span>
                            <span className="font-mono text-[11px] text-purple-700">
                              Total Diambil: {taken}
                            </span>
                          </div>

                          {maxEntitled <= 0 ? (
                            <p className="text-xs text-purple-800 italic bg-white p-3 rounded-xl border border-purple-200 text-center">
                              {hadir === 0
                                ? 'Belum ada anggota yang check-in! Souvenir diberikan sesuai jumlah pax yang hadir.'
                                : 'Semua hak souvenir untuk anggota yang sudah hadir telah diserahkan.'}
                            </p>
                          ) : isAuthorized ? (
                            <div className="space-y-3 pt-1">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-stone-700">Jumlah Diserahkan:</label>
                                <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded-xl border border-purple-300">
                                  <button
                                    type="button"
                                    onClick={() => setDivisiSouvenirCountInput((prev) => Math.max(1, prev - 1))}
                                    disabled={divisiSouvenirCountInput <= 1}
                                    className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center cursor-pointer"
                                  >
                                    <Minus size={13} />
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    max={maxEntitled}
                                    value={divisiSouvenirCountInput}
                                    onChange={(e) => {
                                      const v = parseInt(e.target.value, 10);
                                      if (!isNaN(v)) setDivisiSouvenirCountInput(Math.min(maxEntitled, Math.max(1, v)));
                                    }}
                                    className="w-12 text-center font-bold text-purple-950 font-mono outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setDivisiSouvenirCountInput((prev) => Math.min(maxEntitled, prev + 1))}
                                    disabled={divisiSouvenirCountInput >= maxEntitled}
                                    className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center cursor-pointer"
                                  >
                                    <Plus size={13} />
                                  </button>
                                </div>
                              </div>

                              <input
                                type="text"
                                placeholder="Nama perwakilan pengambil (opsional)"
                                value={divisiSouvenirNoteInput}
                                onChange={(e) => setDivisiSouvenirNoteInput(e.target.value)}
                                className="w-full px-3 py-2 bg-white rounded-xl border border-purple-200 text-xs outline-none"
                              />

                              <button
                                onClick={handleConfirmDivisiSouvenirDirect}
                                disabled={isSubmittingDivision}
                                className="w-full py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                              >
                                <Gift size={15} />
                                <span>{isSubmittingDivision ? 'Menyimpan...' : `Serahkan ${divisiSouvenirCountInput} Paket Souvenir`}</span>
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        /* MODE KEHADIRAN KLOTER DIVISI */
                        <div className="p-4 bg-amber-50/60 rounded-2xl border border-gold-300 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-maroon flex items-center space-x-1.5">
                              <Users2 size={16} className="text-maroon" />
                              <span>Input Kloter Kehadiran</span>
                            </span>
                            <span className="font-mono text-[11px] text-amber-900 font-bold">
                              Sisa Kuota: {sisa} Pax
                            </span>
                          </div>

                          {sisa <= 0 ? (
                            <p className="text-xs text-rose-700 font-bold italic bg-white p-3 rounded-xl border border-rose-200 text-center">
                              Seluruh kuota ({totalQ} Pax) untuk divisi ini telah digunakan!
                            </p>
                          ) : isAuthorized ? (
                            <div className="space-y-3 pt-1">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-stone-700">Pax Hadir Saat Ini:</label>
                                <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded-xl border border-gold-300">
                                  <button
                                    type="button"
                                    onClick={() => setDivisiPaxInput((prev) => Math.max(1, prev - 1))}
                                    disabled={divisiPaxInput <= 1}
                                    className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center cursor-pointer"
                                  >
                                    <Minus size={13} />
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    max={sisa}
                                    value={divisiPaxInput}
                                    onChange={(e) => {
                                      const v = parseInt(e.target.value, 10);
                                      if (!isNaN(v)) setDivisiPaxInput(Math.min(sisa, Math.max(1, v)));
                                    }}
                                    className="w-12 text-center font-bold text-maroon font-mono outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setDivisiPaxInput((prev) => Math.min(sisa, prev + 1))}
                                    disabled={divisiPaxInput >= sisa}
                                    className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center cursor-pointer"
                                  >
                                    <Plus size={13} />
                                  </button>
                                </div>
                              </div>

                              <input
                                type="text"
                                placeholder="Catatan rombongan (cth: Kloter 1 Bpk. Budi, dll.)"
                                value={divisiNoteInput}
                                onChange={(e) => setDivisiNoteInput(e.target.value)}
                                className="w-full px-3 py-2 bg-white rounded-xl border border-stone-200 text-xs outline-none"
                              />

                              <button
                                onClick={handleConfirmDivisiCheckinDirect}
                                disabled={isSubmittingDivision}
                                className="w-full py-3.5 rounded-xl bg-maroon hover:bg-maroon-800 text-gold font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                              >
                                <CheckCircle2 size={16} />
                                <span>{isSubmittingDivision ? 'Menyimpan...' : `Konfirmasi Check-in Kloter (+${divisiPaxInput} Pax)`}</span>
                              </button>
                            </div>
                          ) : null}
                        </div>
                      )}

                      {/* Riwayat Check-in Kloter */}
                      {guest.checkin_history && guest.checkin_history.length > 0 && (
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
                          <span className="text-[10px] font-bold text-maroon uppercase tracking-wider flex items-center space-x-1">
                            <History size={12} />
                            <span>Riwayat Check-in ({guest.checkin_history.length} Kloter)</span>
                          </span>
                          <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
                            {guest.checkin_history.map((tx, idx) => (
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
                    </div>
                  );
                })()
              ) : (
                /* JIKA BUKAN DIVISI: TAMPILKAN FLOW INDIVIDU NORMAL */
                <>
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
                </>
              )}

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
