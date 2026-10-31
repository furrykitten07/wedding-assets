import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import QRCode from 'qrcode';
import { 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  UserCheck, 
  Clock, 
  QrCode, 
  Send, 
  RefreshCw, 
  RotateCcw,
  Sparkles,
  Phone,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Search,
  Volume2,
  VolumeX,
  Printer,
  ExternalLink,
  X,
  Info,
  Maximize2,
  Check,
  Gift,
  Award,
  PackageCheck,
  Building2,
  Users2,
  Plus,
  Minus,
  History,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, logActivity } from '../supabase';
import { BukuTamu, CheckinTransaction, SouvenirTransaction } from '../types';
import Modal from '../components/Modal';

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
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
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

interface ScannerDeskProps {
  userEmail: string;
}

const ScannerDesk: React.FC<ScannerDeskProps> = ({ userEmail }) => {
  const [guests, setGuests] = useState<BukuTamu[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualCode, setManualCode] = useState('');

  // Scanner Modal state
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  // Desk Sub-Navigation & Scanner Mode
  const [activeDeskTab, setActiveDeskTab] = useState<'semua' | 'kehadiran' | 'souvenir'>('semua');
  const [scannerMode, setScannerMode] = useState<'auto' | 'kehadiran' | 'souvenir'>('auto');

  // Result popup states inside modal
  const [scanResult, setScanResult] = useState<{
    guest: BukuTamu;
    wasAlreadyAttended: boolean;
  } | null>(null);

  const [souvenirScanResult, setSouvenirScanResult] = useState<{
    guest: BukuTamu;
    wasAlreadyGiven: boolean;
  } | null>(null);

  // Division Check-in & Souvenir Modal states
  const [divisiCheckinTarget, setDivisiCheckinTarget] = useState<BukuTamu | null>(null);
  const [divisiCheckinPax, setDivisiCheckinPax] = useState<number>(1);
  const [divisiCheckinNote, setDivisiCheckinNote] = useState<string>('');
  const [isSubmittingDivisiCheckin, setIsSubmittingDivisiCheckin] = useState<boolean>(false);

  const [divisiSouvenirTarget, setDivisiSouvenirTarget] = useState<BukuTamu | null>(null);
  const [divisiSouvenirCount, setDivisiSouvenirCount] = useState<number>(1);
  const [divisiSouvenirNote, setDivisiSouvenirNote] = useState<string>('');
  const [isSubmittingDivisiSouvenir, setIsSubmittingDivisiSouvenir] = useState<boolean>(false);

  // Preview Barcode Modal state (Supports Both Barcodes)
  const [previewGuest, setPreviewGuest] = useState<BukuTamu | null>(null);
  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');
  const [previewQrKehadiran, setPreviewQrKehadiran] = useState<string>('');
  const [previewQrSouvenir, setPreviewQrSouvenir] = useState<string>('');
  const [previewTab, setPreviewTab] = useState<'kehadiran' | 'souvenir'>('kehadiran');

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'attended' | 'pending'>('all');
  const [filterPihak, setFilterPihak] = useState<string>('all');
  const [filterKategori, setFilterKategori] = useState<'all' | 'VIP' | 'Reguler'>('all');
  const [filterSouvenir, setFilterSouvenir] = useState<'all' | 'given' | 'pending'>('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch all guests
  const fetchGuests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('buku_tamu')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && !error.message?.includes('schema cache')) {
        throw error;
      }
      setGuests(data || []);
    } catch (err: any) {
      console.error('Fetch scanner error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  // Enumerate available cameras on initial load
  useEffect(() => {
    const detectCameras = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find((d) =>
            (d.label || '').toLowerCase().includes('back') || (d.label || '').toLowerCase().includes('rear')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      } catch (err) {
        console.warn('Unable to query cameras:', err);
      }
    };
    detectCameras();
  }, []);

  // Helper to extract ticket code from URL or text
  const extractCode = (raw: string): string => {
    if (!raw) return '';
    let clean = raw.trim();
    if (clean.includes('code=')) {
      const match = clean.match(/[?&]code=([A-Za-z0-9_-]+)/i);
      if (match && match[1]) {
        clean = match[1];
      }
    } else if (clean.includes('/')) {
      const parts = clean.split('/');
      const last = parts[parts.length - 1];
      if (last.toUpperCase().startsWith('FN-') || last.toUpperCase().startsWith('SV-')) {
        clean = last;
      }
    }
    // Clean query parameters if appended directly (e.g., FN-XXXXXX?pax=2 or FN-XXXXXX&pax=2)
    if (clean.includes('?') || clean.includes('&')) {
      clean = clean.split(/[?&]/)[0];
    }
    if (clean.toUpperCase().startsWith('SV-')) {
      clean = clean.substring(3);
    }
    return clean.toUpperCase();
  };

  // Helper untuk mengekstrak jumlah pax / count dari URL atau parameter teks barcode
  const extractPax = (raw: string): number | null => {
    if (!raw) return null;
    const match = raw.match(/(?:[?&;]|^)(?:pax|count)=(\d+)/i);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  // Helper to detect if the scanned input represents a Souvenir action
  const isSouvenirAction = (raw: string): boolean => {
    if (!raw) return false;
    const upper = raw.toUpperCase();
    return (
      scannerMode === 'souvenir' ||
      activeDeskTab === 'souvenir' ||
      upper.includes('MODE=SOUVENIR') ||
      upper.startsWith('SV-') ||
      upper.includes('SV-FN-')
    );
  };

  // Eksekusi Check-in Otomatis ketika jumlah orang telah ditentukan langsung oleh tamu
  const executeDirectDivisiCheckin = async (target: BukuTamu, inputPax: number, note?: string) => {
    try {
      // Ambil data terbaru untuk mencegah race condition
      const { data: latestRaw, error: fetchErr } = await supabase
        .from('buku_tamu')
        .select('*')
        .eq('id', target.id);

      if (fetchErr && !fetchErr.message?.includes('schema cache')) throw fetchErr;
      const latest = (Array.isArray(latestRaw) ? latestRaw[0] : latestRaw) || target;

      const totalQuota = Number(latest.kuota_pax || latest.jumlah_tamu) || 1;
      const currentHadir = Number(latest.pax_hadir || 0);
      const currentSisa = Math.max(0, totalQuota - currentHadir);

      if (currentSisa <= 0) {
        if (soundEnabled) playChime(false);
        toast.error(`⚠️ Kuota rombongan divisi ${latest.nama_divisi || latest.nama_tamu} sudah habis! (${currentHadir}/${totalQuota} Pax)`);
        return;
      }

      const finalPax = Math.min(inputPax, currentSisa);
      const nowIso = new Date().toISOString();
      const officerName = userEmail.toLowerCase().includes('staff1')
        ? 'Staff 1'
        : userEmail.toLowerCase().includes('staff2')
        ? 'Staff 2'
        : userEmail.split('@')[0];

      const newTx: CheckinTransaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        waktu: nowIso,
        pax: finalPax,
        petugas: officerName,
        catatan: note || `Ditentukan oleh tamu (+${finalPax} Pax)`
      };

      const newHistory = [...(latest.checkin_history || []), newTx];
      const newPaxHadir = currentHadir + finalPax;
      const newSisa = Math.max(0, totalQuota - newPaxHadir);

      const updatePayload = {
        pax_hadir: newPaxHadir,
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
            pax_hadir: newPaxHadir,
            sisa_kuota: newSisa,
            checkin_history: newHistory
          })
          .eq('ticket_code', latest.ticket_code);
      } catch (_) {}

      const updatedGuest: BukuTamu = {
        ...latest,
        ...updatePayload
      };

      setGuests((prev) => prev.map((g) => (g.id === latest.id ? updatedGuest : g)));

      if (soundEnabled) playChime(true);
      setScanResult({ guest: updatedGuest, wasAlreadyAttended: false });

      toast.success(
        `✅ Check-in +${finalPax} Pax Berhasil untuk ${latest.nama_divisi || latest.nama_tamu}! (Ditentukan Tamu • Sisa: ${newSisa} Pax)`,
        { duration: 5000 }
      );

      logActivity(
        userEmail,
        'update',
        'Tamu',
        `Check-in Kloter Divisi (Ditentukan Tamu): ${latest.nama_divisi || latest.nama_tamu} (+${finalPax} Pax • Sisa: ${newSisa} Pax - ${latest.ticket_code})`
      );
    } catch (err: any) {
      console.error('Direct divisi check-in error:', err);
      toast.error('Gagal memproses check-in: ' + (err?.message || err));
    }
  };

  // Eksekusi Serah Terima Souvenir Otomatis ketika jumlah souvenir telah ditentukan langsung oleh tamu
  const executeDirectDivisiSouvenir = async (target: BukuTamu, count: number, note?: string) => {
    try {
      const { data: latestRaw, error: fetchErr } = await supabase
        .from('buku_tamu')
        .select('*')
        .eq('id', target.id);

      if (fetchErr && !fetchErr.message?.includes('schema cache')) throw fetchErr;
      const latest = (Array.isArray(latestRaw) ? latestRaw[0] : latestRaw) || target;

      const policy = latest.souvenir_policy || 'per_pax';
      const alreadyTaken = Number(latest.souvenir_taken || 0);
      const totalQuota = Number(latest.kuota_pax || latest.jumlah_tamu) || 1;
      const maxEntitled = policy === 'per_undangan'
        ? Math.max(0, 1 - alreadyTaken)
        : Math.max(0, totalQuota - alreadyTaken);

      if (maxEntitled <= 0) {
        if (soundEnabled) playChime(false);
        toast.error(`⚠️ Seluruh hak souvenir untuk rombongan divisi ${latest.nama_divisi || latest.nama_tamu} telah diserahkan!`);
        return;
      }

      const finalCount = Math.min(count, maxEntitled);
      const nowIso = new Date().toISOString();
      const officerName = userEmail.toLowerCase().includes('staff1')
        ? 'Staff 1'
        : userEmail.toLowerCase().includes('staff2')
        ? 'Staff 2'
        : userEmail.split('@')[0];

      const newTx: SouvenirTransaction = {
        id: `sv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        waktu: nowIso,
        jumlah: finalCount,
        petugas: officerName,
        catatan: note || `Ditentukan oleh tamu (${finalCount} Paket)`
      };

      const newHistory = [...(latest.souvenir_history || []), newTx];
      const newTaken = alreadyTaken + finalCount;
      const isFullyGiven = policy === 'per_undangan' ? newTaken >= 1 : newTaken >= totalQuota;

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
      } catch (_) {}

      const updatedGuest: BukuTamu = {
        ...latest,
        ...updatePayload
      };

      setGuests((prev) => prev.map((g) => (g.id === latest.id ? updatedGuest : g)));

      if (soundEnabled) playChime(true);
      setSouvenirScanResult({ guest: updatedGuest, wasAlreadyGiven: false });

      toast.success(
        `🎁 Berhasil menyerahkan ${finalCount} Souvenir untuk ${latest.nama_divisi || latest.nama_tamu}! (Ditentukan Tamu • Sisa: ${maxEntitled - finalCount} Paket)`,
        { duration: 5000 }
      );

      logActivity(
        userEmail,
        'update',
        'Tamu',
        `Serah Souvenir Divisi (Ditentukan Tamu): ${latest.nama_divisi || latest.nama_tamu} (+${finalCount} Paket • Total: ${newTaken} - ${latest.ticket_code})`
      );
    } catch (err: any) {
      console.error('Direct divisi souvenir error:', err);
      toast.error('Gagal memproses serah souvenir: ' + (err?.message || err));
    }
  };

  // Check-in & Souvenir Claim Execution
  const handleProcessScan = async (rawInput: string) => {
    const code = extractCode(rawInput);
    if (!code) return;

    isProcessingRef.current = true;
    const isSouvenir = isSouvenirAction(rawInput);
    const guestPaxParam = extractPax(rawInput);

    try {
      const { data, error } = await supabase
        .from('buku_tamu')
        .select('*')
        .eq('ticket_code', code);

      if (error && !error.message?.includes('schema cache')) {
        throw error;
      }

      const target = Array.isArray(data) ? data[0] : data;

      if (!target) {
        if (soundEnabled) playChime(false);
        toast.error(`Kode "${code}" tidak ditemukan di database tamu!`);
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 2000);
        return;
      }

      // -------------------------------------------------------------
      // ACTION: DIVISION / GROUP INVITATIONS (MULTI-KLOTER CHECK-IN & SOUVENIR)
      // -------------------------------------------------------------
      if (target.is_divisi) {
        setScanResult(null);
        setSouvenirScanResult(null);

        if (isSouvenir) {
          const policy = target.souvenir_policy || 'per_pax';
          const taken = Number(target.souvenir_taken || 0);
          const totalQuota = Number(target.kuota_pax || target.jumlah_tamu) || 1;
          const maxEntitled = policy === 'per_undangan'
            ? Math.max(0, 1 - taken)
            : Math.max(0, totalQuota - taken);

          if (maxEntitled <= 0) {
            if (soundEnabled) playChime(false);
            toast.error(`⚠️ Seluruh hak souvenir untuk rombongan ${target.nama_divisi || target.nama_tamu} telah diserahkan! (${taken} Paket)`, { duration: 5000 });
            return;
          }

          // JIKA JUMLAH SOUVENIR TELAH DITENTUKAN OLEH TAMU DARI BARCODE HP-NYA
          if (guestPaxParam !== null && guestPaxParam > 0) {
            const finalCount = Math.min(guestPaxParam, maxEntitled);
            await executeDirectDivisiSouvenir(target, finalCount, `Ditentukan oleh tamu (${finalCount} Paket)`);
            return;
          }

          // Fallback jika scan kode tanpa parameter jumlah: buka modal input staff
          setDivisiSouvenirTarget(target);
          setDivisiSouvenirCount(maxEntitled > 0 ? 1 : 0);
          setDivisiSouvenirNote('');
          if (soundEnabled) playChime(maxEntitled > 0);
          toast.success(`🎁 Undangan Divisi: ${target.nama_divisi || target.nama_tamu} (${maxEntitled} Souvenir Tersedia)`, { duration: 4000 });
          return;
        } else {
          const totalQ = Number(target.kuota_pax || target.jumlah_tamu) || 1;
          const currentHadir = Number(target.pax_hadir || 0);
          const sisa = Math.max(0, totalQ - currentHadir);

          if (sisa <= 0) {
            if (soundEnabled) playChime(false);
            toast.error(`⚠️ Kuota rombongan divisi ${target.nama_divisi || target.nama_tamu} sudah PENUH (${currentHadir}/${totalQ} Pax Hadir)!`, { duration: 5000 });
            return;
          }

          // JIKA JUMLAH ORANG / PAX TELAH DITENTUKAN OLEH TAMU DARI BARCODE HP-NYA
          if (guestPaxParam !== null && guestPaxParam > 0) {
            const finalPax = Math.min(guestPaxParam, sisa);
            await executeDirectDivisiCheckin(target, finalPax, `Ditentukan oleh tamu (+${finalPax} Pax)`);
            return;
          }

          // Fallback jika scan kode tanpa parameter pax: buka modal input staff
          setDivisiCheckinTarget(target);
          setDivisiCheckinPax(sisa > 0 ? 1 : 0);
          setDivisiCheckinNote('');
          if (soundEnabled) playChime(sisa > 0);
          toast.success(`🏢 Undangan Divisi: ${target.nama_divisi || target.nama_tamu} (Sisa Kuota: ${sisa} Pax)`, { duration: 4000 });
          return;
        }
      }

      // -------------------------------------------------------------
      // ACTION 1: SOUVENIR HANDOVER FLOW (INDIVIDU)
      // -------------------------------------------------------------
      if (isSouvenir) {
        setScanResult(null);

        if (target.is_souvenir_given) {
          if (soundEnabled) playChime(false);
          setSouvenirScanResult({ guest: target, wasAlreadyGiven: true });
          toast.error(`⚠️ Souvenir SUDAH PERNAH DIAMBIL sebelumnya!`, { duration: 5000 });
        } else {
          const nowIso = new Date().toISOString();
          const { error: updateError } = await supabase
            .from('buku_tamu')
            .update({
              is_souvenir_given: true,
              souvenir_given_at: nowIso,
              is_attended: true,
              attended_at: target.attended_at || nowIso
            })
            .eq('id', target.id);

          if (updateError && !updateError.message?.includes('schema cache')) {
            throw updateError;
          }

          const updatedGuest: BukuTamu = {
            ...target,
            is_souvenir_given: true,
            souvenir_given_at: nowIso,
            is_attended: true,
            attended_at: target.attended_at || nowIso
          };

          if (soundEnabled) playChime(true);
          setSouvenirScanResult({ guest: updatedGuest, wasAlreadyGiven: false });
          toast.success(`🎁 Souvenir Berhasil Diserahkan: ${target.nama_keluarga || target.nama_tamu}!`, {
            duration: 5000
          });

          logActivity(
            userEmail,
            'update',
            'Tamu',
            `Klaim Barcode Souvenir: ${target.nama_keluarga || target.nama_tamu} (${target.ticket_code})`
          );

          setGuests((prev) =>
            prev.map((g) => (g.id === target.id ? updatedGuest : g))
          );
        }
      } else {
        // -------------------------------------------------------------
        // ACTION 2: ATTENDANCE CHECK-IN FLOW
        // -------------------------------------------------------------
        setSouvenirScanResult(null);

        if (target.is_attended) {
          if (soundEnabled) playChime(false);
          setScanResult({ guest: target, wasAlreadyAttended: true });
          toast('Tamu ini sudah pernah check-in sebelumnya!', {
            icon: '⚠️',
            style: { background: '#FFFBEB', color: '#92400E', border: '1px solid #FCD34D' }
          });
        } else {
          const nowIso = new Date().toISOString();
          const { error: updateError } = await supabase
            .from('buku_tamu')
            .update({
              is_attended: true,
              attended_at: nowIso
            })
            .eq('id', target.id);

          if (updateError && !updateError.message?.includes('schema cache')) {
            throw updateError;
          }

          const updatedGuest: BukuTamu = {
            ...target,
            is_attended: true,
            attended_at: nowIso
          };

          if (soundEnabled) playChime(true);
          setScanResult({ guest: updatedGuest, wasAlreadyAttended: false });
          toast.success(`Check-in Berhasil: ${target.nama_tamu} (${target.jumlah_tamu} Pax)!`);

          logActivity(
            userEmail,
            'update',
            'Tamu',
            `Check-in Meja Resepsi: ${target.nama_tamu} (${target.jumlah_tamu} Pax - ${target.ticket_code})`
          );

          setGuests((prev) =>
            prev.map((g) => (g.id === target.id ? updatedGuest : g))
          );
        }
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      toast.error('Gagal memproses barcode: ' + err.message);
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1200);
    }
  };

  // -------------------------------------------------------------
  // KONFIRMASI CHECK-IN KLOTER DIVISI / KELOMPOK
  // -------------------------------------------------------------
  const handleConfirmDivisiCheckin = async () => {
    if (!divisiCheckinTarget || isSubmittingDivisiCheckin) return;
    try {
      setIsSubmittingDivisiCheckin(true);

      // Re-fetch latest data from database to prevent race condition
      const { data: latestRaw, error: fetchErr } = await supabase
        .from('buku_tamu')
        .select('*')
        .eq('id', divisiCheckinTarget.id);

      if (fetchErr && !fetchErr.message?.includes('schema cache')) {
        throw fetchErr;
      }
      const latest = (Array.isArray(latestRaw) ? latestRaw[0] : latestRaw) || divisiCheckinTarget;

      const totalQuota = Number(latest.kuota_pax || latest.jumlah_tamu) || 1;
      const currentHadir = Number(latest.pax_hadir || 0);
      const currentSisa = Math.max(0, totalQuota - currentHadir);

      if (currentSisa <= 0) {
        toast.error('Kuota undangan divisi ini sudah habis terpakai!');
        return;
      }

      const inputPax = Number(divisiCheckinPax);
      if (isNaN(inputPax) || inputPax < 1) {
        toast.error('Jumlah pax hadir minimal 1 orang!');
        return;
      }

      if (inputPax > currentSisa) {
        toast.error(`Jumlah pax (${inputPax}) melebihi sisa kuota yang tersedia (${currentSisa} Pax)!`);
        return;
      }

      const nowIso = new Date().toISOString();
      const officerName = userEmail.toLowerCase().includes('staff1')
        ? 'Staff 1'
        : userEmail.toLowerCase().includes('staff2')
        ? 'Staff 2'
        : userEmail.split('@')[0];

      const newTx: CheckinTransaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        waktu: nowIso,
        pax: inputPax,
        petugas: officerName,
        catatan: divisiCheckinNote.trim() || undefined
      };

      const newHistory = [...(latest.checkin_history || []), newTx];
      const newPaxHadir = currentHadir + inputPax;
      const newSisa = Math.max(0, totalQuota - newPaxHadir);

      const updatePayload = {
        pax_hadir: newPaxHadir,
        sisa_kuota: newSisa,
        is_attended: true,
        attended_at: latest.attended_at || nowIso,
        checkin_history: newHistory
      };

      const { error: updateError } = await supabase
        .from('buku_tamu')
        .update(updatePayload)
        .eq('id', latest.id);

      if (updateError && !updateError.message?.includes('schema cache')) {
        throw updateError;
      }

      // Sync to tamu table
      try {
        await supabase
          .from('tamu')
          .update({
            pax_hadir: newPaxHadir,
            sisa_kuota: newSisa,
            checkin_history: newHistory
          })
          .eq('ticket_code', latest.ticket_code);
      } catch (tamuSyncErr) {
        console.warn('Sync to tamu warning:', tamuSyncErr);
      }

      const updatedGuest: BukuTamu = {
        ...latest,
        ...updatePayload
      };

      setGuests((prev) => prev.map((g) => (g.id === latest.id ? updatedGuest : g)));

      if (soundEnabled) playChime(true);
      toast.success(
        `✅ Check-in +${inputPax} Pax tercatat untuk ${latest.nama_divisi || latest.nama_tamu}! Sisa kuota: ${newSisa} Pax.`,
        { duration: 5000 }
      );

      logActivity(
        userEmail,
        'update',
        'Tamu',
        `Check-in Kloter Divisi: ${latest.nama_divisi || latest.nama_tamu} (+${inputPax} Pax • Sisa: ${newSisa} Pax - ${latest.ticket_code})`
      );

      setDivisiCheckinTarget(null);
    } catch (err: any) {
      console.error('Divisi check-in error:', err);
      toast.error('Gagal memproses check-in rombongan: ' + (err?.message || err));
    } finally {
      setIsSubmittingDivisiCheckin(false);
    }
  };

  // -------------------------------------------------------------
  // KONFIRMASI SERAH TERIMA SOUVENIR DIVISI / KELOMPOK
  // -------------------------------------------------------------
  const handleConfirmDivisiSouvenir = async () => {
    if (!divisiSouvenirTarget || isSubmittingDivisiSouvenir) return;
    try {
      setIsSubmittingDivisiSouvenir(true);

      const { data: latestRaw, error: fetchErr } = await supabase
        .from('buku_tamu')
        .select('*')
        .eq('id', divisiSouvenirTarget.id);

      if (fetchErr && !fetchErr.message?.includes('schema cache')) {
        throw fetchErr;
      }
      const latest = (Array.isArray(latestRaw) ? latestRaw[0] : latestRaw) || divisiSouvenirTarget;

      const policy = latest.souvenir_policy || 'per_pax';
      const alreadyTaken = Number(latest.souvenir_taken || 0);
      const totalHadir = Number(latest.pax_hadir || 0);

      // Hak souvenir tersedia
      let maxEntitled = 0;
      if (policy === 'per_undangan') {
        maxEntitled = Math.max(0, 1 - alreadyTaken);
      } else {
        // 1 Souvenir per Pax Hadir (hanya yang sudah check-in)
        maxEntitled = Math.max(0, totalHadir - alreadyTaken);
      }

      if (maxEntitled <= 0) {
        if (policy === 'per_pax' && totalHadir === 0) {
          toast.error('Belum ada anggota rombongan yang check-in! Souvenir diberikan sesuai jumlah pax hadir.');
        } else {
          toast.error('Seluruh hak souvenir untuk rombongan yang sudah hadir telah diserahkan!');
        }
        return;
      }

      const inputCount = Number(divisiSouvenirCount);
      if (isNaN(inputCount) || inputCount < 1) {
        toast.error('Jumlah souvenir minimal 1 paket!');
        return;
      }

      if (inputCount > maxEntitled) {
        toast.error(`Jumlah souvenir (${inputCount}) melebihi hak yang tersedia saat ini (${maxEntitled} paket)!`);
        return;
      }

      const nowIso = new Date().toISOString();
      const officerName = userEmail.toLowerCase().includes('staff1')
        ? 'Staff 1'
        : userEmail.toLowerCase().includes('staff2')
        ? 'Staff 2'
        : userEmail.split('@')[0];

      const newTx: SouvenirTransaction = {
        id: `sv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        waktu: nowIso,
        jumlah: inputCount,
        petugas: officerName,
        catatan: divisiSouvenirNote.trim() || undefined
      };

      const newHistory = [...(latest.souvenir_history || []), newTx];
      const newTaken = alreadyTaken + inputCount;
      const totalPaxQuota = Number(latest.kuota_pax || latest.jumlah_tamu) || 1;
      const isFullyGiven = policy === 'per_undangan' ? newTaken >= 1 : newTaken >= totalPaxQuota;

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

      if (updateError && !updateError.message?.includes('schema cache')) {
        throw updateError;
      }

      // Sync to tamu table
      try {
        await supabase
          .from('tamu')
          .update({
            souvenir_taken: newTaken,
            souvenir_history: newHistory
          })
          .eq('ticket_code', latest.ticket_code);
      } catch (tamuSyncErr) {
        console.warn('Sync to tamu warning:', tamuSyncErr);
      }

      const updatedGuest: BukuTamu = {
        ...latest,
        ...updatePayload
      };

      setGuests((prev) => prev.map((g) => (g.id === latest.id ? updatedGuest : g)));

      if (soundEnabled) playChime(true);
      toast.success(
        `🎁 Berhasil menyerahkan ${inputCount} Souvenir untuk ${latest.nama_divisi || latest.nama_tamu}! Total diambil: ${newTaken} paket.`,
        { duration: 5000 }
      );

      logActivity(
        userEmail,
        'update',
        'Tamu',
        `Serah Souvenir Divisi: ${latest.nama_divisi || latest.nama_tamu} (+${inputCount} Paket • Total: ${newTaken} - ${latest.ticket_code})`
      );

      setDivisiSouvenirTarget(null);
    } catch (err: any) {
      console.error('Divisi souvenir error:', err);
      toast.error('Gagal memproses serah souvenir: ' + (err?.message || err));
    } finally {
      setIsSubmittingDivisiSouvenir(false);
    }
  };

  // Toggle Attendance from table
  const handleToggleAttendance = async (guest: BukuTamu) => {
    try {
      const newStatus = !guest.is_attended;
      const newAttendedAt = newStatus ? new Date().toISOString() : null;

      const { error } = await supabase
        .from('buku_tamu')
        .update({
          is_attended: newStatus,
          attended_at: newAttendedAt
        })
        .eq('id', guest.id);

      if (error && !error.message?.includes('schema cache')) {
        throw error;
      }

      const updated = {
        ...guest,
        is_attended: newStatus,
        attended_at: newAttendedAt
      };

      setGuests((prev) =>
        prev.map((g) => (g.id === guest.id ? updated : g))
      );

      if (newStatus) {
        if (soundEnabled) playChime(true);
        toast.success(`Tamu ${guest.nama_tamu} ditandai Hadir`);
        logActivity(userEmail, 'update', 'Tamu', `Manual Check-in: ${guest.nama_tamu}`);
      } else {
        toast('Status kehadiran dibatalkan', { icon: 'ℹ️' });
        logActivity(userEmail, 'update', 'Tamu', `Batal Check-in: ${guest.nama_tamu}`);
      }
    } catch (err: any) {
      toast.error('Gagal memperbarui status: ' + err.message);
    }
  };

  // Toggle Souvenir (1 per family/invitation, prevents double giveaway)
  const handleToggleSouvenir = async (guest: BukuTamu) => {
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

      if (error && !error.message?.includes('schema cache')) {
        throw error;
      }

      const updated: BukuTamu = {
        ...guest,
        is_souvenir_given: newStatus,
        souvenir_given_at: newGivenAt
      };

      setGuests((prev) =>
        prev.map((g) => (g.id === guest.id ? updated : g))
      );

      if (scanResult && scanResult.guest.id === guest.id) {
        setScanResult({
          ...scanResult,
          guest: updated
        });
      }

      if (newStatus) {
        if (soundEnabled) playChime(true);
        toast.success(`🎁 Souvenir diserahkan untuk ${guest.nama_keluarga || guest.nama_tamu}`);
        logActivity(userEmail, 'update', 'Tamu', `Serah Souvenir: ${guest.nama_tamu} (${guest.ticket_code})`);
      } else {
        toast('Status souvenir dibatalkan', { icon: 'ℹ️' });
        logActivity(userEmail, 'update', 'Tamu', `Batal Souvenir: ${guest.nama_tamu}`);
      }
    } catch (err: any) {
      toast.error('Gagal memperbarui status souvenir: ' + err.message);
    }
  };

  // Open Preview Modal (Generates Both Barcodes)
  const handleOpenPreview = async (guest: BukuTamu) => {
    try {
      setPreviewGuest(guest);
      setPreviewTab('kehadiran');
      const checkinUrl = `${window.location.origin}/#/checkin?code=${encodeURIComponent(guest.ticket_code)}`;
      const urlKehadiran = await QRCode.toDataURL(checkinUrl, {
        width: 380,
        margin: 2,
        errorCorrectionLevel: 'L',
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      setPreviewQrKehadiran(urlKehadiran);
      setPreviewQrUrl(urlKehadiran);

      const souvenirUrl = `${window.location.origin}/#/checkin?code=${encodeURIComponent(guest.ticket_code)}&mode=souvenir`;
      const urlSouvenir = await QRCode.toDataURL(souvenirUrl, {
        width: 380,
        margin: 2,
        errorCorrectionLevel: 'L',
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      setPreviewQrSouvenir(urlSouvenir);
    } catch (err) {
      toast.error('Gagal membuat preview barcode');
    }
  };

  // Stop camera helper
  const stopAndClearScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        // ignore
      }
      scannerRef.current = null;
    }
    const el = document.getElementById('scanner-modal-reader');
    if (el) el.innerHTML = '';
  };

  // Single Camera Lifecycle inside Modal
  useEffect(() => {
    let isMounted = true;

    if (isScannerModalOpen) {
      const startScanner = async () => {
        await stopAndClearScanner();
        if (!isMounted) return;

        const container = document.getElementById('scanner-modal-reader');
        if (!container) return;
        container.innerHTML = '';

        try {
          const html5QrCode = new Html5Qrcode('scanner-modal-reader', {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            useBarCodeDetectorIfSupported: true,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            },
            verbose: false
          });
          scannerRef.current = html5QrCode;

          const cameraConfig = selectedCameraId
            ? selectedCameraId
            : { facingMode: 'environment' };

          try {
            await html5QrCode.start(
              cameraConfig,
              {
                fps: 25,
                videoConstraints: selectedCameraId
                  ? {
                      deviceId: { exact: selectedCameraId },
                      width: { min: 640, ideal: 1280, max: 1920 },
                      height: { min: 480, ideal: 720, max: 1080 }
                    }
                  : {
                      facingMode: { ideal: 'environment' },
                      width: { min: 640, ideal: 1280, max: 1920 },
                      height: { min: 480, ideal: 720, max: 1080 }
                    }
              },
              (decodedText) => {
                if (isMounted && !isProcessingRef.current) {
                  handleProcessScan(decodedText);
                }
              },
              () => {}
            );
          } catch (highResErr) {
            console.warn('Fallback to standard resolution camera config:', highResErr);
            await html5QrCode.start(
              cameraConfig,
              { fps: 25 },
              (decodedText) => {
                if (isMounted && !isProcessingRef.current) {
                  handleProcessScan(decodedText);
                }
              },
              () => {}
            );
          }
        } catch (err: any) {
          console.warn('Failed to start camera in modal:', err);
          if (isMounted) {
            toast.error('Gagal membuka kamera: ' + (err?.message || err));
          }
        }
      };

      const timer = setTimeout(() => {
        startScanner();
      }, 150);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        stopAndClearScanner();
      };
    } else {
      stopAndClearScanner();
    }
  }, [isScannerModalOpen, selectedCameraId]);

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isScannerModalOpen) {
        setIsScannerModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScannerModalOpen]);

  // Calculations & Metrics
  const totalRegistered = guests.length;
  const totalPaxRegistered = guests.reduce((acc, g) => acc + (Number(g.jumlah_hadir_konfirmasi || g.jumlah_tamu) || 1), 0);
  const totalAttended = guests.filter((g) => g.is_attended).length;
  const totalPaxAttended = guests
    .filter((g) => g.is_attended)
    .reduce((acc, g) => acc + (Number(g.jumlah_hadir_konfirmasi || g.jumlah_tamu) || 1), 0);
  const totalPending = totalRegistered - totalAttended;
  const attendanceRate = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;

  // VIP & Souvenir Metrics
  const totalVip = guests.filter((g) => g.kategori_tamu === 'VIP').length;
  const vipAttended = guests.filter((g) => g.kategori_tamu === 'VIP' && g.is_attended).length;
  const totalSouvenirsGiven = guests.filter((g) => g.is_souvenir_given).length;

  // Filtered Guests
  const filteredGuests = guests.filter((g) => {
    const search = searchTerm.toLowerCase().trim();
    const guestName = (g.nama_keluarga || g.nama_tamu || '').toLowerCase();
    const matchesSearch =
      !search ||
      guestName.includes(search) ||
      (g.ticket_code || '').toLowerCase().includes(search) ||
      (g.no_whatsapp && g.no_whatsapp.includes(search));

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'attended' && g.is_attended) ||
      (filterStatus === 'pending' && !g.is_attended);

    const matchesPihak = filterPihak === 'all' || g.pihak === filterPihak;

    const matchesKategori =
      filterKategori === 'all' ||
      (filterKategori === 'VIP' && g.kategori_tamu === 'VIP') ||
      (filterKategori === 'Reguler' && g.kategori_tamu !== 'VIP');

    const matchesSouvenir =
      filterSouvenir === 'all' ||
      (filterSouvenir === 'given' && g.is_souvenir_given) ||
      (filterSouvenir === 'pending' && !g.is_souvenir_given);

    return matchesSearch && matchesStatus && matchesPihak && matchesKategori && matchesSouvenir;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredGuests.length / pageSize) || 1;
  const paginatedGuests = pageSize === -1 
    ? filteredGuests 
    : filteredGuests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterPihak, filterKategori, filterSouvenir, pageSize]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-fade-in font-sans">
      
      {/* 1. TOP CONTROL & HEADER BAR */}
      <div className="bg-white p-6 rounded-3xl border border-gold-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-maroon/10 text-maroon text-xs font-bold tracking-widest uppercase mb-2">
            <ShieldCheck size={14} className="text-gold-600" />
            <span>Portal Petugas Meja Resepsi</span>
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-maroon">
            Scanner Kehadiran Tamu
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Akun Petugas: <span className="font-bold text-maroon">{userEmail.toLowerCase().includes('staff1') ? 'STAFF 1' : userEmail.toLowerCase().includes('staff2') ? 'STAFF 2' : (userEmail || 'Petugas').split('@')[0].toUpperCase()}</span> • Buka scanner kamera atau cari nama di tabel
          </p>
        </div>

        {/* Primary Action Buttons: Double Scanner System */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setScannerMode('kehadiran');
              setIsScannerModalOpen(true);
            }}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-maroon via-maroon-800 to-[#550B14] hover:opacity-95 text-gold border border-gold-400 font-bold text-xs shadow-lg shadow-maroon/20 transition-all flex items-center space-x-2 active:scale-95 cursor-pointer"
          >
            <Camera size={17} />
            <span className="tracking-wide uppercase">Scan Kehadiran</span>
          </button>

          <button
            onClick={() => {
              setScannerMode('souvenir');
              setIsScannerModalOpen(true);
            }}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:opacity-95 text-maroon font-black text-xs shadow-lg shadow-amber-500/20 border border-amber-300 transition-all flex items-center space-x-2 active:scale-95 cursor-pointer"
          >
            <Gift size={17} />
            <span className="tracking-wide uppercase">Scan Souvenir</span>
          </button>

          <button
            onClick={fetchGuests}
            className="p-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
            title="Refresh Data Tamu"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* SUB-MENU TABS: SEMUA TAMU | MEJA KEHADIRAN | MEJA SOUVENIR */}
      <div className="bg-white p-2.5 rounded-2xl border border-gold-200/60 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => {
              setActiveDeskTab('semua');
              setFilterStatus('all');
              setFilterSouvenir('all');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeDeskTab === 'semua'
                ? 'bg-maroon text-gold shadow-md'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Users size={15} />
            <span>Semua Tamu ({totalRegistered})</span>
          </button>

          <button
            onClick={() => {
              setActiveDeskTab('kehadiran');
              setFilterStatus('all');
              setFilterSouvenir('all');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeDeskTab === 'kehadiran'
                ? 'bg-maroon text-gold shadow-md'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <UserCheck size={15} />
            <span>Meja Kehadiran ({totalAttended}/{totalRegistered})</span>
          </button>

          <button
            onClick={() => {
              setActiveDeskTab('souvenir');
              setFilterStatus('all');
              setFilterSouvenir('all');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeDeskTab === 'souvenir'
                ? 'bg-gradient-to-r from-amber-600 to-amber-800 text-white shadow-md ring-1 ring-amber-400'
                : 'text-amber-900 hover:bg-amber-50'
            }`}
          >
            <Gift size={15} />
            <span>Meja Souvenir ({totalSouvenirsGiven}/{totalRegistered})</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeDeskTab === 'souvenir' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {totalRegistered > 0 ? Math.round((totalSouvenirsGiven / totalRegistered) * 100) : 0}%
            </span>
          </button>
        </div>

        <div className="text-xs text-stone-500 hidden md:flex items-center space-x-2">
          <Sparkles size={14} className="text-gold" />
          <span>
            {activeDeskTab === 'souvenir'
              ? 'Mode Meja Souvenir: Fokus verifikasi dan serah terima paket souvenir'
              : 'Mode Meja Resepsi: Pencatatan kehadiran dan data buku tamu'}
          </span>
        </div>
      </div>

      {/* 2. REAL-TIME STATS 4-CARD BENTO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Terdaftar */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Terdaftar</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-bold text-gray-900">{totalRegistered}</span>
            <span className="text-xs text-gray-500 font-medium">({totalPaxRegistered} Pax)</span>
          </div>
        </div>

        {/* Sudah Hadir */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Sudah Hadir</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-bold text-emerald-700">{totalAttended}</span>
            <span className="text-xs text-emerald-800 font-bold">({totalPaxAttended} Pax Telah Tiba)</span>
          </div>
        </div>

        {/* Tamu VIP */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200/70 shadow-sm">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Tamu Undangan VIP</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-bold text-amber-900">{totalVip}</span>
            <span className="text-xs text-amber-800 font-bold">({vipAttended} Hadir)</span>
          </div>
        </div>

        {/* Souvenir Diserahkan */}
        <div className="bg-white p-5 rounded-2xl border border-gold-200/70 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-maroon uppercase tracking-wider block">Souvenir Diserahkan</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {totalRegistered > 0 ? Math.round((totalSouvenirsGiven / totalRegistered) * 100) : 0}%
            </span>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-bold text-maroon">{totalSouvenirsGiven}</span>
            <span className="text-xs text-gray-500 font-medium">/ {totalRegistered} Undangan</span>
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            <strong>{totalRegistered - totalSouvenirsGiven}</strong> Undangan Belum Mengambil
          </p>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mt-2">
            <div
              className="bg-maroon h-full rounded-full transition-all duration-700"
              style={{ width: `${totalRegistered > 0 ? Math.round((totalSouvenirsGiven / totalRegistered) * 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. QUICK MANUAL CODE SCAN / INPUT BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 text-gray-800 text-xs font-bold uppercase tracking-wider">
          {activeDeskTab === 'souvenir' ? (
            <Gift size={18} className="text-amber-700" />
          ) : (
            <QrCode size={18} className="text-maroon" />
          )}
          <span>
            {activeDeskTab === 'souvenir'
              ? 'Klaim Cepat Souvenir (Ketik Kode Tiket / Souvenir)'
              : 'Check-in Cepat Manual (Ketik Kode Tiket / Souvenir)'}
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualCode) {
              handleProcessScan(manualCode);
              setManualCode('');
            }
          }}
          className="flex items-center space-x-2 w-full sm:w-auto"
        >
          <input
            type="text"
            placeholder={activeDeskTab === 'souvenir' ? "Contoh: SV-FN-A8K9Z2 atau FN-A8K9Z2" : "Contoh: FN-A8K9Z2"}
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            className="px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:border-maroon outline-none font-mono uppercase w-full sm:w-64 shadow-inner"
          />
          <button
            type="submit"
            className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              activeDeskTab === 'souvenir'
                ? 'bg-amber-500 hover:bg-amber-600 text-maroon'
                : 'bg-maroon hover:bg-maroon-800 text-gold'
            }`}
          >
            {activeDeskTab === 'souvenir' ? <Gift size={14} /> : <Send size={13} />}
            <span>{activeDeskTab === 'souvenir' ? 'Klaim Souvenir' : 'Check-in'}</span>
          </button>
        </form>
      </div>

      {/* 4. GUESTBOOK TABLE SECTION (WITH FILTER, SEARCH, SCROLL, AND PAGINATION) */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden space-y-4">
        
        {/* Table Controls (Search & Filters) */}
        <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif font-bold text-lg text-maroon">
              Daftar Tamu Undangan & Status Kehadiran
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Kelola daftar hadir, cari tamu, tandai check-in, dan serahkan souvenir secara instan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative w-full sm:w-60">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama keluarga, WA, tiket..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-maroon focus:bg-white"
              />
            </div>

            {/* Status & Souvenir Filter Chips */}
            <div className="flex flex-wrap items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
              {[
                { key: 'all', label: `Semua (${totalRegistered})`, action: () => { setFilterStatus('all'); setFilterSouvenir('all'); } },
                { key: 'attended', label: `Hadir (${totalAttended})`, action: () => { setFilterStatus('attended'); setFilterSouvenir('all'); } },
                { key: 'pending', label: `Belum Hadir (${totalPending})`, action: () => { setFilterStatus('pending'); setFilterSouvenir('all'); } },
                { key: 'souvenir_given', label: `✓ Souvenir Diambil (${totalSouvenirsGiven})`, action: () => { setFilterSouvenir('given'); setFilterStatus('all'); } },
                { key: 'souvenir_pending', label: `🎁 Belum Ambil Souvenir (${totalRegistered - totalSouvenirsGiven})`, action: () => { setFilterSouvenir('pending'); setFilterStatus('all'); } }
              ].map((tab) => {
                const isActive = (tab.key === 'all' && filterStatus === 'all' && filterSouvenir === 'all') ||
                                 (tab.key === 'attended' && filterStatus === 'attended') ||
                                 (tab.key === 'pending' && filterStatus === 'pending') ||
                                 (tab.key === 'souvenir_given' && filterSouvenir === 'given') ||
                                 (tab.key === 'souvenir_pending' && filterSouvenir === 'pending');
                return (
                  <button
                    key={tab.key}
                    onClick={tab.action}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      isActive
                        ? 'bg-maroon text-gold shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Kategori Selector (VIP / Reguler) */}
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value as any)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:border-maroon"
            >
              <option value="all">Semua Kategori</option>
              <option value="VIP">★ Tamu VIP</option>
              <option value="Reguler">Tamu Reguler</option>
            </select>

            {/* Souvenir Selector */}
            <select
              value={filterSouvenir}
              onChange={(e) => setFilterSouvenir(e.target.value as any)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:border-maroon"
            >
              <option value="all">Semua Souvenir</option>
              <option value="given">✓ Sudah Diambil</option>
              <option value="pending">🎁 Belum Diambil</option>
            </select>

            {/* Pihak Selector */}
            <select
              value={filterPihak}
              onChange={(e) => setFilterPihak(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:border-maroon"
            >
              <option value="all">Semua Pihak</option>
              <option value="Pihak Fikri">Pihak Fikri</option>
              <option value="Pihak Nadya">Pihak Nadya</option>
              <option value="Rekan Bersama">Rekan Bersama</option>
            </select>
          </div>
        </div>

        {/* SCROLLABLE TABLE CONTAINER */}
        <div className="overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar px-6 pb-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#FAF7F2] text-maroon uppercase tracking-wider font-serif font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3.5 rounded-l-xl">Kode Tiket</th>
                <th className="px-4 py-3.5">Nama Tamu / Keluarga</th>
                <th className="px-4 py-3.5 text-center">Kategori</th>
                <th className="px-4 py-3.5">Pihak</th>
                <th className="px-4 py-3.5 text-center">Pax (Hadir/Jatah)</th>
                <th className="px-4 py-3.5 text-center">Status Kehadiran</th>
                <th className="px-4 py-3.5 text-center">Souvenir</th>
                <th className="px-4 py-3.5 text-right rounded-r-xl">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    <div className="w-8 h-8 border-2 border-gold-300 border-t-maroon rounded-full animate-spin mx-auto mb-2" />
                    Memuat data tamu...
                  </td>
                </tr>
              ) : paginatedGuests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    Tidak ada data tamu yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                paginatedGuests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-amber-50/30 transition-colors">
                    {/* Kode Tiket */}
                    <td className="px-4 py-3.5 font-mono font-bold text-maroon whitespace-nowrap">
                      <span className="bg-stone-100 px-2 py-1 rounded border border-stone-200">
                        {guest.ticket_code}
                      </span>
                    </td>

                    {/* Nama Tamu / Keluarga */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <p className="font-bold text-gray-900">
                          {guest.nama_divisi || guest.nama_keluarga || guest.nama_tamu}
                        </p>
                        {guest.is_divisi && (
                          <span className="px-2 py-0.5 rounded-md bg-maroon text-gold font-black text-[9px] tracking-wider uppercase shadow-xs">
                            🏢 Divisi
                          </span>
                        )}
                      </div>
                      {guest.no_whatsapp ? (
                        <a
                          href={`https://wa.me/${guest.no_whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 text-emerald-600 hover:underline text-[11px] mt-0.5"
                        >
                          <Phone size={11} />
                          <span>{guest.no_whatsapp} {guest.is_divisi ? '(PIC)' : ''}</span>
                        </a>
                      ) : (
                        <span className="text-gray-400 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Kategori (VIP / Reguler) */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {guest.kategori_tamu === 'VIP' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] uppercase tracking-wider">
                          <Award size={11} className="text-amber-700" />
                          <span>VIP</span>
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 font-semibold text-[10px] uppercase">
                          Reguler
                        </span>
                      )}
                    </td>

                    {/* Pihak */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          guest.pihak === 'Pihak Fikri'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : guest.pihak === 'Pihak Nadya'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {guest.pihak}
                      </span>
                    </td>

                    {/* Pax (Konfirmasi / Jatah / Kuota Divisi) */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {guest.is_divisi ? (
                        <div>
                          <span className="font-bold text-gray-900 block font-mono">
                            {guest.pax_hadir || 0} / {guest.kuota_pax || guest.jumlah_tamu} Pax
                          </span>
                          <span className="text-[10px] text-amber-800 font-semibold block">
                            Sisa: {guest.sisa_kuota ?? Math.max(0, (guest.kuota_pax || guest.jumlah_tamu || 1) - (guest.pax_hadir || 0))} Pax
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-bold text-gray-900 block">
                            {guest.jumlah_hadir_konfirmasi || guest.jumlah_tamu} Pax
                          </span>
                          {guest.jatah_tamu && (
                            <span className="text-[10px] text-gray-400 block font-normal">
                              (Jatah: {guest.jatah_tamu})
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Status Kehadiran (Individu vs Multi-Kloter Divisi) */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {guest.is_divisi ? (
                        (() => {
                          const totalQ = Number(guest.kuota_pax || guest.jumlah_tamu) || 1;
                          const hadir = Number(guest.pax_hadir || 0);
                          const sisa = Math.max(0, totalQ - hadir);

                          if (sisa <= 0) {
                            return (
                              <button
                                onClick={() => {
                                  setDivisiCheckinTarget(guest);
                                  setDivisiCheckinPax(1);
                                  setDivisiCheckinNote('');
                                }}
                                className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] cursor-pointer"
                                title="Lihat riwayat kloter"
                              >
                                <CheckCircle2 size={12} className="text-emerald-600" />
                                <span>✓ Kuota Penuh ({hadir} Pax)</span>
                              </button>
                            );
                          }

                          if (hadir > 0) {
                            return (
                              <button
                                onClick={() => {
                                  setDivisiCheckinTarget(guest);
                                  setDivisiCheckinPax(1);
                                  setDivisiCheckinNote('');
                                }}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold text-[11px] shadow-2xs transition-all cursor-pointer"
                                title="Tambah kloter rombongan yang hadir"
                              >
                                <Users2 size={12} className="text-amber-700" />
                                <span>+ Kloter ({hadir} Hadir)</span>
                              </button>
                            );
                          }

                          return (
                            <button
                              onClick={() => {
                                setDivisiCheckinTarget(guest);
                                setDivisiCheckinPax(1);
                                setDivisiCheckinNote('');
                              }}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-maroon hover:bg-maroon-800 text-gold border border-gold/40 font-bold text-[11px] shadow-xs transition-all cursor-pointer"
                              title="Input rombongan kloter pertama"
                            >
                              <Plus size={12} />
                              <span>+ Kloter Check-in</span>
                            </button>
                          );
                        })()
                      ) : guest.is_attended ? (
                        <div>
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span>Hadir</span>
                          </span>
                          {guest.attended_at && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {new Date(guest.attended_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}{' '}
                              WIB
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-500 font-semibold text-[11px]">
                          <Clock size={11} />
                          <span>Belum Hadir</span>
                        </span>
                      )}
                    </td>

                    {/* Status Souvenir */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {guest.is_divisi ? (
                        (() => {
                          const policy = guest.souvenir_policy || 'per_pax';
                          const taken = Number(guest.souvenir_taken || 0);
                          const totalHadir = Number(guest.pax_hadir || 0);
                          const maxEntitled = policy === 'per_undangan'
                            ? Math.max(0, 1 - taken)
                            : Math.max(0, totalHadir - taken);

                          return (
                            <button
                              onClick={() => {
                                setDivisiSouvenirTarget(guest);
                                setDivisiSouvenirCount(Math.min(1, Math.max(1, maxEntitled)));
                                setDivisiSouvenirNote('');
                              }}
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl border font-bold text-[11px] shadow-xs transition-all cursor-pointer ${
                                maxEntitled > 0
                                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                              }`}
                              title="Kelola serah terima souvenir divisi"
                            >
                              <Gift size={13} className={maxEntitled > 0 ? 'text-amber-800' : 'text-emerald-600'} />
                              <span>{taken} Diambil {maxEntitled > 0 ? `(${maxEntitled} Hak)` : '✓'}</span>
                            </button>
                          );
                        })()
                      ) : guest.is_souvenir_given ? (
                        <button
                          onClick={() => handleToggleSouvenir(guest)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[11px] hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="Klik untuk membatalkan status souvenir"
                        >
                          <PackageCheck size={13} className="text-emerald-600" />
                          <span>✓ Diberikan</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleSouvenir(guest)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] shadow-sm transition-all cursor-pointer"
                          title="Serahkan 1 paket souvenir"
                        >
                          <Gift size={13} className="text-amber-700" />
                          <span>Beri Souvenir</span>
                        </button>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        {guest.is_divisi ? (
                          <button
                            onClick={() => {
                              setDivisiCheckinTarget(guest);
                              setDivisiCheckinPax(1);
                              setDivisiCheckinNote('');
                            }}
                            className="p-1.5 rounded-lg bg-maroon/10 text-maroon hover:bg-maroon hover:text-gold transition-colors cursor-pointer"
                            title="Check-in Kloter Divisi"
                          >
                            <Building2 size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleAttendance(guest)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              guest.is_attended
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title={guest.is_attended ? 'Batalkan Hadir' : 'Tandai Hadir'}
                          >
                            <CheckCircle2 size={15} />
                          </button>
                        )}

                        {/* View Barcode */}
                        <button
                          onClick={() => handleOpenPreview(guest)}
                          className="p-1.5 rounded-lg bg-gold-50 text-gold-800 hover:bg-gold-100 transition-colors cursor-pointer"
                          title="Lihat Barcode & Tiket"
                        >
                          <QrCode size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER CONTROLS */}
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <span>Baris per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={-1}>Semua</option>
            </select>
            <span className="text-gray-400">
              | Menampilkan{' '}
              {pageSize === -1
                ? filteredGuests.length
                : Math.min(filteredGuests.length, (currentPage - 1) * pageSize + 1)}{' '}
              -{' '}
              {pageSize === -1
                ? filteredGuests.length
                : Math.min(filteredGuests.length, currentPage * pageSize)}{' '}
              dari {filteredGuests.length} tamu
            </span>
          </div>

          {pageSize !== -1 && totalPages > 1 && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center space-x-1 px-2">
                <span className="font-bold text-maroon">Halaman {currentPage}</span>
                <span>dari {totalPages}</span>
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none"
                title="Halaman Berikutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. DEDICATED SCANNER MODAL (FULL SCREENSHOT SINGLE FEED)      */}
      {/* ============================================================== */}
      {isScannerModalOpen && (
        <div 
          onClick={() => setIsScannerModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 border border-gold-400/40 rounded-[2rem] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col relative max-h-[92vh]"
          >
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between text-white bg-stone-900/95 z-20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold">
                  <Camera size={20} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-gold leading-tight">
                    Scanner Kamera Meja Resepsi
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Arahkan barcode tiket tamu tepat ke depan kamera
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Scanner Mode Toggle */}
                <div className="flex items-center bg-stone-800 p-1 rounded-xl border border-stone-700 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setScannerMode('auto')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      scannerMode === 'auto' ? 'bg-gold text-maroon shadow font-black' : 'text-stone-300 hover:text-white'
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => setScannerMode('kehadiran')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      scannerMode === 'kehadiran' ? 'bg-maroon text-gold shadow border border-gold/40' : 'text-stone-300 hover:text-white'
                    }`}
                  >
                    Kehadiran
                  </button>
                  <button
                    type="button"
                    onClick={() => setScannerMode('souvenir')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      scannerMode === 'souvenir' ? 'bg-amber-500 text-maroon shadow font-black' : 'text-stone-300 hover:text-white'
                    }`}
                  >
                    Souvenir
                  </button>
                </div>

                {/* Camera Switcher Dropdown */}
                {cameras.length > 1 && (
                  <select
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    className="px-2.5 py-1.5 bg-stone-800 border border-stone-700 rounded-xl text-xs font-bold text-stone-200 outline-none max-w-[160px] truncate"
                  >
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        📷 {c.label || 'Kamera'}
                      </option>
                    ))}
                  </select>
                )}

                {/* Sound Toggle */}
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-2 rounded-xl border transition-colors ${
                    soundEnabled
                      ? 'bg-amber-500/20 text-gold border-amber-500/40'
                      : 'bg-stone-800 text-stone-500 border-stone-700'
                  }`}
                  title={soundEnabled ? 'Matikan Suara Chime' : 'Nyalakan Suara Chime'}
                >
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setIsScannerModalOpen(false)}
                  className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors"
                  title="Tutup Scanner (Esc)"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body: Single Large Camera Viewport (Full-Frame Scanning Without Restrictive Box) */}
            <div className="relative flex-1 bg-black flex items-center justify-center min-h-[420px] sm:min-h-[500px] md:h-[62vh] overflow-hidden">
              {/* Single Video Container (Forced single stream & full cover) */}
              <div 
                id="scanner-modal-reader" 
                className="w-full h-full flex items-center justify-center [&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover [&_video:not(:first-of-type)]:!hidden [&>div]:!w-full [&>div]:!h-full [&>div]:!border-none [&_*]:!border-none [&_#qr-shaded-region]:!hidden" 
              />

              {/* Full-Frame Scan Mode Badge */}
              <div className="absolute top-4 left-4 pointer-events-none z-10 flex items-center space-x-2 bg-black/65 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-gold/40 text-gold text-xs font-semibold shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Scan Seluruh Layar Aktif (Bebas Sudut)</span>
              </div>

              {/* Scan Result Popup Overlay inside Modal */}
              {scanResult && (
                <div className="absolute inset-x-4 bottom-4 z-30 bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-amber-200 animate-fade-in text-gray-900">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start space-x-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          scanResult.wasAlreadyAttended
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {scanResult.wasAlreadyAttended ? (
                          <AlertCircle size={28} />
                        ) : (
                          <CheckCircle2 size={28} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                            {scanResult.wasAlreadyAttended
                              ? 'Peringatan: Sudah Pernah Check-in'
                              : 'Check-in Berhasil Terverifikasi'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            scanResult.guest.kategori_tamu === 'VIP'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-stone-100 text-stone-700'
                          }`}>
                            {scanResult.guest.kategori_tamu === 'VIP' ? '★ VIP' : 'Reguler'}
                          </span>
                        </div>
                        <h4 className="font-serif text-xl font-bold text-gray-900 mt-0.5">
                          {scanResult.guest.nama_keluarga || scanResult.guest.nama_tamu}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                          <span className="font-mono bg-stone-100 px-2 py-0.5 rounded text-maroon font-bold">
                            {scanResult.guest.ticket_code}
                          </span>
                          <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-bold">
                            {scanResult.guest.pihak}
                          </span>
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                            {scanResult.guest.is_divisi ? (
                              <>🏢 Rombongan: {scanResult.guest.pax_hadir} / {scanResult.guest.kuota_pax || scanResult.guest.jumlah_tamu} Pax Hadir (Sisa: {scanResult.guest.sisa_kuota} Pax)</>
                            ) : (
                              <>Terkonfirmasi: {scanResult.guest.jumlah_hadir_konfirmasi || scanResult.guest.jumlah_tamu} Orang {scanResult.guest.jatah_tamu ? `(Jatah: ${scanResult.guest.jatah_tamu})` : ''}</>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Souvenir Button & Action */}
                    <div className="flex items-center space-x-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200">
                      {/* Souvenir status & toggle */}
                      {scanResult.guest.is_souvenir_given ? (
                        <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center space-x-1.5 shadow-sm">
                          <PackageCheck size={16} className="text-emerald-600" />
                          <span>✓ Souvenir Sudah Diberikan</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleToggleSouvenir(scanResult.guest)}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                          title="Serahkan 1 souvenir per keluarga"
                        >
                          <Gift size={16} />
                          <span>Berikan Souvenir (1 Paket)</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setScanResult(null);
                          isProcessingRef.current = false;
                        }}
                        className="px-4 py-2.5 rounded-xl bg-maroon text-gold font-bold text-xs hover:bg-maroon-800 shadow-md shrink-0 uppercase tracking-wider cursor-pointer"
                      >
                        Lanjutkan
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Souvenir Scan Result Popup Overlay inside Modal */}
              {souvenirScanResult && (
                <div className="absolute inset-x-4 bottom-4 z-30 bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border-2 border-amber-300 animate-fade-in text-gray-900">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start space-x-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          souvenirScanResult.wasAlreadyGiven
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {souvenirScanResult.wasAlreadyGiven ? (
                          <AlertCircle size={28} />
                        ) : (
                          <Gift size={28} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] uppercase font-black tracking-wider block ${
                            souvenirScanResult.wasAlreadyGiven ? 'text-rose-700' : 'text-emerald-700'
                          }`}>
                            {souvenirScanResult.wasAlreadyGiven
                              ? '⚠️ PERINGATAN: SOUVENIR SUDAH PERNAH DIAMBIL!'
                              : '🎁 SOUVENIR BERHASIL DISERAHKAN (1 PAKET)'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                            {souvenirScanResult.guest.kategori_tamu === 'VIP' ? '★ VIP' : 'Reguler'}
                          </span>
                        </div>
                        <h4 className="font-serif text-xl font-bold text-gray-900 mt-0.5">
                          {souvenirScanResult.guest.nama_keluarga || souvenirScanResult.guest.nama_tamu}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                          <span className="font-mono bg-stone-100 px-2 py-0.5 rounded text-amber-900 font-bold">
                            SV-{souvenirScanResult.guest.ticket_code}
                          </span>
                          <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-bold">
                            {souvenirScanResult.guest.pihak}
                          </span>
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                            {souvenirScanResult.guest.jumlah_hadir_konfirmasi || souvenirScanResult.guest.jumlah_tamu} Orang
                          </span>
                          {souvenirScanResult.wasAlreadyGiven && souvenirScanResult.guest.souvenir_given_at && (
                            <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-bold">
                              Diambil: {new Date(souvenirScanResult.guest.souvenir_given_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200">
                      <button
                        type="button"
                        onClick={() => {
                          setSouvenirScanResult(null);
                          isProcessingRef.current = false;
                        }}
                        className="px-4 py-2.5 rounded-xl bg-maroon hover:bg-maroon-800 text-gold font-bold text-xs shadow-md transition-all cursor-pointer"
                      >
                        Lanjut Scan Berikutnya
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer (Tips & Manual Input) */}
            <div className="p-4 bg-stone-900 border-t border-stone-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span className="flex items-center space-x-1.5">
                  <Info size={14} className="text-gold" />
                  <span>Deteksi barcode bebas di seluruh layar (jarak ideal: <strong>15–25 cm</strong>).</span>
                </span>
                <span className="text-gold/90 font-mono text-[11px] font-bold">
                  Sensor: 25 FPS (Ultra-Fast) • Native AI/GPU Active
                </span>
              </div>

              {/* Fast code input inside modal */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualCode) {
                    handleProcessScan(manualCode);
                    setManualCode('');
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Atau ketik Kode Tiket: FN-XXXXXX"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-white font-mono text-xs uppercase outline-none focus:border-gold placeholder:text-stone-500"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gold hover:bg-gold-400 text-maroon font-bold text-xs shadow-md transition-all flex items-center space-x-1.5"
                >
                  <Send size={13} />
                  <span>Check-in</span>
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. MODAL PREVIEW BARCODE TAMU (DUAL BARCODE PREVIEW)          */}
      {/* ============================================================== */}
      {previewGuest && (
        <Modal
          isOpen={Boolean(previewGuest)}
          onClose={() => setPreviewGuest(null)}
          title="Tiket & Barcode Tamu"
        >
          <div className="text-center p-2 sm:p-4 space-y-4">
            {/* 2 Tabs Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={() => setPreviewTab('kehadiran')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  previewTab === 'kehadiran'
                    ? 'bg-maroon text-gold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <QrCode size={14} />
                <span>1. Barcode Kehadiran</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('souvenir')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  previewTab === 'souvenir'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Gift size={14} />
                <span>2. Barcode Souvenir</span>
              </button>
            </div>

            <div className={`p-4 bg-white rounded-2xl border-2 inline-block shadow-inner ${
              previewTab === 'souvenir' ? 'border-amber-400' : 'border-gold-300'
            }`}>
              <img
                src={previewTab === 'souvenir' ? (previewQrSouvenir || previewQrUrl) : (previewQrKehadiran || previewQrUrl)}
                alt={`QR ${previewGuest.ticket_code}`}
                className="w-64 h-64 mx-auto object-contain"
              />
            </div>

            <div>
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                {previewTab === 'souvenir' ? 'Kode Souvenir' : 'Kode Tiket'}
              </p>
              <p className={`font-mono text-xl font-bold ${
                previewTab === 'souvenir' ? 'text-amber-800' : 'text-maroon'
              }`}>
                {previewTab === 'souvenir' ? `SV-${previewGuest.ticket_code}` : previewGuest.ticket_code}
              </p>
              <h3 className="font-serif text-lg font-bold text-gray-900 mt-1 flex items-center justify-center gap-2">
                <span>{previewGuest.nama_divisi || previewGuest.nama_keluarga || previewGuest.nama_tamu}</span>
                {previewGuest.is_divisi && (
                  <span className="px-2 py-0.5 rounded-md bg-maroon text-gold font-black text-[9px] uppercase tracking-wider">
                    🏢 Divisi
                  </span>
                )}
              </h3>
              {previewGuest.is_divisi ? (
                <div className="mt-1 space-y-1 text-xs">
                  <p className="font-semibold text-stone-600">
                    {previewGuest.pihak} • {previewGuest.kategori_tamu === 'VIP' ? '★ Tamu VIP' : 'Tamu Reguler'}
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-mono text-xs">
                    <span>Kuota: <strong>{previewGuest.kuota_pax || previewGuest.jumlah_tamu} Pax</strong></span>
                    <span>•</span>
                    <span>Hadir: <strong>{previewGuest.pax_hadir || 0} Pax</strong></span>
                    <span>•</span>
                    <span>Sisa: <strong>{previewGuest.sisa_kuota ?? Math.max(0, (previewGuest.kuota_pax || previewGuest.jumlah_tamu || 1) - (previewGuest.pax_hadir || 0))} Pax</strong></span>
                  </div>
                  <p className="text-[10px] text-stone-400 italic">
                    1 QR Code bersama digunakan untuk seluruh anggota rombongan secara multi-kloter.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-500 mt-0.5">
                  {previewGuest.pihak} • {previewGuest.jumlah_tamu} Pax • {previewGuest.kategori_tamu === 'VIP' ? '★ VIP' : 'Reguler'}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={() => {
                  window.open(
                    `${window.location.origin}/#/checkin?code=${previewGuest.ticket_code}${previewTab === 'souvenir' ? '&mode=souvenir' : ''}`,
                    '_blank'
                  );
                }}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-maroon text-gold font-bold text-xs hover:bg-maroon-800 shadow-sm cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>{previewTab === 'souvenir' ? 'Klaim Souvenir' : 'Validasi Check-in'}</span>
              </button>

              <button
                onClick={() => {
                  window.open(
                    `${window.location.origin}/#/guest-pass?code=${previewGuest.ticket_code}`,
                    '_blank'
                  );
                }}
                className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-gold-50 text-gold-900 border border-gold-300 font-bold text-xs hover:bg-gold-100 cursor-pointer"
              >
                <ExternalLink size={14} />
                <span>Buka Pass Tamu</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs cursor-pointer"
              >
                <Printer size={14} />
                <span>Cetak</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* 7. MODAL CHECK-IN KLOTER ROMBONGAN DIVISI                     */}
      {/* ============================================================== */}
      {divisiCheckinTarget && (
        <Modal
          isOpen={Boolean(divisiCheckinTarget)}
          onClose={() => setDivisiCheckinTarget(null)}
          title="Check-in Kloter Rombongan Divisi"
          maxWidth="max-w-xl"
        >
          <div className="space-y-5">
            {/* Header Divisi */}
            <div className="p-4 bg-gradient-to-r from-amber-50 to-stone-50 rounded-2xl border border-gold-300/80">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center space-x-2">
                  <span className="p-2 bg-maroon text-gold rounded-xl shadow-xs">
                    <Building2 size={20} />
                  </span>
                  <div>
                    <span className="text-[10px] text-amber-800 font-black uppercase tracking-wider block">
                      Undangan Divisi / Kelompok
                    </span>
                    <h3 className="font-serif text-lg font-bold text-maroon leading-tight">
                      {divisiCheckinTarget.nama_divisi || divisiCheckinTarget.nama_keluarga || divisiCheckinTarget.nama_tamu}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 bg-white rounded-lg border border-gold-300 text-maroon shadow-2xs">
                    {divisiCheckinTarget.ticket_code}
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    divisiCheckinTarget.kategori_tamu === 'VIP'
                      ? 'bg-amber-500 text-white'
                      : 'bg-stone-200 text-stone-700'
                  }`}>
                    {divisiCheckinTarget.kategori_tamu === 'VIP' ? '★ VIP' : 'Reguler'}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Quota Bento */}
            {(() => {
              const totalQ = Number(divisiCheckinTarget.kuota_pax || divisiCheckinTarget.jumlah_tamu) || 1;
              const hadir = Number(divisiCheckinTarget.pax_hadir || 0);
              const sisa = Math.max(0, totalQ - hadir);
              const inputPax = Number(divisiCheckinPax) || 0;
              const sisaSetelah = Math.max(0, sisa - inputPax);

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                      <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">
                        Total Kuota
                      </span>
                      <span className="text-2xl font-serif font-bold text-maroon block mt-0.5">
                        {totalQ}
                      </span>
                      <span className="text-[10px] text-stone-400">Pax Anggota</span>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                      <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                        Sudah Hadir
                      </span>
                      <span className="text-2xl font-serif font-bold text-emerald-800 block mt-0.5">
                        {hadir}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold">Pax Check-in</span>
                    </div>

                    <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                      <span className="text-[10px] text-amber-900 font-bold uppercase tracking-wider block">
                        Sisa Kuota
                      </span>
                      <span className="text-2xl font-serif font-bold text-amber-900 block mt-0.5">
                        {sisa}
                      </span>
                      <span className="text-[10px] text-amber-700 font-semibold">Pax Tersedia</span>
                    </div>
                  </div>

                  {/* Input Kloter Kehadiran */}
                  {sisa <= 0 ? (
                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-800 text-xs text-center space-y-1">
                      <AlertCircle size={22} className="mx-auto text-rose-600" />
                      <p className="font-bold">Seluruh Kuota Divisi Ini Telah Habis!</p>
                      <p className="text-[11px] text-rose-600">
                        Total {totalQ} pax anggota rombongan telah melakukan check-in.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50/50 rounded-2xl border border-gold-300 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
                            Jumlah Orang Hadir di Kloter Ini <span className="text-red-500">*</span>
                          </label>
                          <span className="text-[11px] text-stone-500">
                            Masukkan jumlah anggota yang datang saat ini (Maks. {sisa} Pax)
                          </span>
                        </div>

                        {/* Stepper Controls */}
                        <div className="flex items-center space-x-1.5 bg-white p-1 rounded-xl border border-gold-300 shadow-sm">
                          <button
                            type="button"
                            onClick={() => setDivisiCheckinPax((prev) => Math.max(1, prev - 1))}
                            disabled={divisiCheckinPax <= 1}
                            className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={sisa}
                            value={divisiCheckinPax}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (isNaN(val)) setDivisiCheckinPax(1);
                              else setDivisiCheckinPax(Math.min(sisa, Math.max(1, val)));
                            }}
                            className="w-14 text-center font-mono font-bold text-lg text-maroon outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setDivisiCheckinPax((prev) => Math.min(sisa, prev + 1))}
                            disabled={divisiCheckinPax >= sisa}
                            className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Quick Selector Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gold-200/50">
                        <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mr-1">
                          Pilihan Cepat:
                        </span>
                        {[1, 2, 3, 5, 10, 15, 20].filter((val) => val <= sisa).map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setDivisiCheckinPax(val)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                              divisiCheckinPax === val
                                ? 'bg-maroon text-gold border-gold shadow-xs'
                                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                            }`}
                          >
                            +{val} Pax
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setDivisiCheckinPax(sisa)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            divisiCheckinPax === sisa
                              ? 'bg-maroon text-gold border-gold'
                              : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                          }`}
                        >
                          Semua Sisa ({sisa} Pax)
                        </button>
                      </div>

                      {/* Catatan Kloter Opsional */}
                      <div className="space-y-1 pt-1">
                        <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                          Catatan Rombongan (Opsional)
                        </label>
                        <input
                          type="text"
                          placeholder="Cth: Kloter 1 Bpk. Budi, Rombongan Tim Backend, dll."
                          value={divisiCheckinNote}
                          onChange={(e) => setDivisiCheckinNote(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-stone-200 focus:border-maroon rounded-xl text-xs outline-none shadow-2xs"
                        />
                      </div>

                      {/* Live Calculation Preview Banner */}
                      <div className="p-3 bg-white rounded-xl border border-dashed border-gold-400 flex items-center justify-between text-xs text-stone-700">
                        <div>
                          <span>Check-in Sekarang: </span>
                          <strong className="text-maroon font-serif text-sm">+{inputPax} Pax</strong>
                        </div>
                        <div className="text-right">
                          <span>Sisa Kuota Berikutnya: </span>
                          <strong className="text-amber-900 font-serif text-sm">{sisaSetelah} Pax</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Riwayat Check-in Kloter Sebelumnya */}
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                    <span className="text-xs font-bold text-maroon uppercase tracking-wider flex items-center space-x-1.5">
                      <History size={14} />
                      <span>Riwayat Check-in Rombongan ({divisiCheckinTarget.checkin_history?.length || 0} Transaksi)</span>
                    </span>

                    {(!divisiCheckinTarget.checkin_history || divisiCheckinTarget.checkin_history.length === 0) ? (
                      <p className="text-xs text-stone-400 italic p-2 text-center">
                        Belum ada anggota yang check-in untuk rombongan ini.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                        {divisiCheckinTarget.checkin_history.map((tx, idx) => (
                          <div key={tx.id || idx} className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between text-xs shadow-2xs">
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-full bg-maroon text-gold font-bold text-[10px] flex items-center justify-center shrink-0">
                                #{idx + 1}
                              </span>
                              <div>
                                <span className="font-bold text-stone-800">+{tx.pax} Pax Hadir</span>
                                {tx.catatan && <span className="text-stone-500 text-[11px]"> • {tx.catatan}</span>}
                                <p className="text-[10px] text-stone-400">Petugas: {tx.petugas || 'Resepsi'}</p>
                              </div>
                            </div>
                            <span className="text-[11px] font-mono text-stone-500 shrink-0">
                              {new Date(tx.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => setDivisiCheckinTarget(null)}
                      className="px-5 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      Batal
                    </button>

                    {sisa > 0 && (
                      <button
                        type="button"
                        onClick={handleConfirmDivisiCheckin}
                        disabled={isSubmittingDivisiCheckin || inputPax < 1 || inputPax > sisa}
                        className="px-6 py-2.5 rounded-xl bg-maroon hover:bg-maroon-800 disabled:opacity-50 text-gold text-xs font-bold uppercase tracking-wider shadow-lg border border-gold/40 transition-all flex items-center space-x-2 cursor-pointer active:scale-95"
                      >
                        <Check size={16} />
                        <span>{isSubmittingDivisiCheckin ? 'Menyimpan...' : `Konfirmasi Check-in (+${inputPax} Pax)`}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* 8. MODAL SERAH TERIMA SOUVENIR DIVISI                         */}
      {/* ============================================================== */}
      {divisiSouvenirTarget && (
        <Modal
          isOpen={Boolean(divisiSouvenirTarget)}
          onClose={() => setDivisiSouvenirTarget(null)}
          title="Serah Terima Souvenir Divisi"
          maxWidth="max-w-xl"
        >
          <div className="space-y-5">
            {/* Header Divisi */}
            <div className="p-4 bg-gradient-to-r from-amber-50 to-stone-50 rounded-2xl border border-amber-300">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center space-x-2">
                  <span className="p-2 bg-amber-600 text-white rounded-xl shadow-xs">
                    <Gift size={20} />
                  </span>
                  <div>
                    <span className="text-[10px] text-amber-800 font-black uppercase tracking-wider block">
                      Serah Terima Souvenir Divisi
                    </span>
                    <h3 className="font-serif text-lg font-bold text-gray-900 leading-tight">
                      {divisiSouvenirTarget.nama_divisi || divisiSouvenirTarget.nama_keluarga || divisiSouvenirTarget.nama_tamu}
                    </h3>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold px-2.5 py-1 bg-white rounded-lg border border-amber-300 text-amber-900 shadow-2xs">
                  SV-{divisiSouvenirTarget.ticket_code}
                </span>
              </div>
            </div>

            {/* Calculations & Policy Breakdown */}
            {(() => {
              const policy = divisiSouvenirTarget.souvenir_policy || 'per_pax';
              const taken = Number(divisiSouvenirTarget.souvenir_taken || 0);
              const hadir = Number(divisiSouvenirTarget.pax_hadir || 0);
              const totalQ = Number(divisiSouvenirTarget.kuota_pax || divisiSouvenirTarget.jumlah_tamu) || 1;
              const maxEntitled = policy === 'per_undangan'
                ? Math.max(0, 1 - taken)
                : Math.max(0, hadir - taken);
              const inputCount = Number(divisiSouvenirCount) || 0;

              return (
                <div className="space-y-4">
                  {/* Bento Metrics */}
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                      <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">
                        Anggota Hadir
                      </span>
                      <span className="text-2xl font-serif font-bold text-maroon block mt-0.5">
                        {hadir}
                      </span>
                      <span className="text-[10px] text-stone-400">/{totalQ} Pax Check-in</span>
                    </div>

                    <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200">
                      <span className="text-[10px] text-purple-900 font-bold uppercase tracking-wider block">
                        Sudah Diambil
                      </span>
                      <span className="text-2xl font-serif font-bold text-purple-900 block mt-0.5">
                        {taken}
                      </span>
                      <span className="text-[10px] text-purple-700 font-semibold">Paket Diserahkan</span>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                      <span className="text-[10px] text-emerald-900 font-bold uppercase tracking-wider block">
                        Hak Tersedia
                      </span>
                      <span className="text-2xl font-serif font-bold text-emerald-800 block mt-0.5">
                        {maxEntitled}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">Boleh Diambil</span>
                    </div>
                  </div>

                  {/* Policy Notice */}
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-300 text-xs text-amber-950 flex items-start space-x-2">
                    <Sparkles size={16} className="text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block">
                        Kebijakan: {policy === 'per_undangan' ? '1 Souvenir / Rombongan Divisi' : '1 Souvenir / Pax Hadir (Bertahap)'}
                      </strong>
                      <p className="text-[11px] text-amber-900 mt-0.5">
                        {policy === 'per_undangan'
                          ? 'Hanya 1 paket souvenir simbolis yang dialokasikan untuk seluruh rombongan divisi ini.'
                          : 'Hak souvenir bertambah secara otomatis setiap kali anggota divisi melakukan check-in kehadiran.'}
                      </p>
                    </div>
                  </div>

                  {/* Input Form or Zero Entitlement Notice */}
                  {maxEntitled <= 0 ? (
                    <div className="p-4 bg-stone-100 rounded-2xl border border-stone-300 text-center text-xs space-y-1">
                      <AlertCircle size={22} className="mx-auto text-amber-700" />
                      {hadir === 0 ? (
                        <>
                          <p className="font-bold text-stone-800">Belum Ada Anggota yang Check-in Kehadiran!</p>
                          <p className="text-stone-500 text-[11px]">
                            Souvenir hanya dapat diambil setelah anggota divisi melakukan scan check-in kehadiran di meja resepsi.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-stone-800">Semua Hak Souvenir Telah Diambil!</p>
                          <p className="text-stone-500 text-[11px]">
                            Total {taken} paket souvenir untuk {hadir} pax yang telah hadir sudah diserahkan seluruhnya.
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50/50 rounded-2xl border border-gold-300 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
                            Jumlah Souvenir yang Diserahkan <span className="text-red-500">*</span>
                          </label>
                          <span className="text-[11px] text-stone-500">
                            Pilih jumlah souvenir yang akan diberikan ke perwakilan (Maks. {maxEntitled} paket)
                          </span>
                        </div>

                        {/* Stepper */}
                        <div className="flex items-center space-x-1.5 bg-white p-1 rounded-xl border border-gold-300 shadow-sm">
                          <button
                            type="button"
                            onClick={() => setDivisiSouvenirCount((prev) => Math.max(1, prev - 1))}
                            disabled={divisiSouvenirCount <= 1}
                            className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={maxEntitled}
                            value={divisiSouvenirCount}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (isNaN(val)) setDivisiSouvenirCount(1);
                              else setDivisiSouvenirCount(Math.min(maxEntitled, Math.max(1, val)));
                            }}
                            className="w-14 text-center font-mono font-bold text-lg text-maroon outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setDivisiSouvenirCount((prev) => Math.min(maxEntitled, prev + 1))}
                            disabled={divisiSouvenirCount >= maxEntitled}
                            className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Quick Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gold-200/50">
                        <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mr-1">
                          Pilihan Cepat:
                        </span>
                        {[1, 2, 3, 5, 10].filter((val) => val <= maxEntitled).map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setDivisiSouvenirCount(val)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                              divisiSouvenirCount === val
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                            }`}
                          >
                            {val} Paket
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setDivisiSouvenirCount(maxEntitled)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            divisiSouvenirCount === maxEntitled
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                          }`}
                        >
                          Semua Hak ({maxEntitled} Paket)
                        </button>
                      </div>

                      {/* Catatan Perwakilan */}
                      <div className="space-y-1 pt-1">
                        <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                          Nama Perwakilan Pengambil (Opsional)
                        </label>
                        <input
                          type="text"
                          placeholder="Cth: Diambil Bpk. Hendra untuk 4 orang"
                          value={divisiSouvenirNote}
                          onChange={(e) => setDivisiSouvenirNote(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-stone-200 focus:border-maroon rounded-xl text-xs outline-none shadow-2xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Riwayat Serah Terima Souvenir */}
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                      <History size={14} />
                      <span>Riwayat Serah Terima ({divisiSouvenirTarget.souvenir_history?.length || 0} Transaksi)</span>
                    </span>

                    {(!divisiSouvenirTarget.souvenir_history || divisiSouvenirTarget.souvenir_history.length === 0) ? (
                      <p className="text-xs text-stone-400 italic p-2 text-center">
                        Belum ada penyerahan souvenir yang tercatat.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                        {divisiSouvenirTarget.souvenir_history.map((tx, idx) => (
                          <div key={tx.id || idx} className="p-2.5 bg-white rounded-xl border border-amber-200 flex items-center justify-between text-xs shadow-2xs">
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                #{idx + 1}
                              </span>
                              <div>
                                <span className="font-bold text-gray-900">{tx.jumlah} Paket Diserahkan</span>
                                {tx.catatan && <span className="text-stone-500 text-[11px]"> • {tx.catatan}</span>}
                                <p className="text-[10px] text-stone-400">Petugas: {tx.petugas || 'Resepsi'}</p>
                              </div>
                            </div>
                            <span className="text-[11px] font-mono text-stone-500 shrink-0">
                              {new Date(tx.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => setDivisiSouvenirTarget(null)}
                      className="px-5 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      Tutup
                    </button>

                    {maxEntitled > 0 && (
                      <button
                        type="button"
                        onClick={handleConfirmDivisiSouvenir}
                        disabled={isSubmittingDivisiSouvenir || inputCount < 1 || inputCount > maxEntitled}
                        className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider shadow-lg border border-amber-400 transition-all flex items-center space-x-2 cursor-pointer active:scale-95"
                      >
                        <Gift size={16} />
                        <span>{isSubmittingDivisiSouvenir ? 'Menyimpan...' : `Serahkan ${inputCount} Souvenir`}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

    </div>
  );
};

export default ScannerDesk;
