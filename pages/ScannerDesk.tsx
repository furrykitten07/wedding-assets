import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
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
  PackageCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, logActivity } from '../supabase';
import { BukuTamu } from '../types';
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

  // Result popup state inside modal
  const [scanResult, setScanResult] = useState<{
    guest: BukuTamu;
    wasAlreadyAttended: boolean;
  } | null>(null);

  // Preview Barcode Modal state
  const [previewGuest, setPreviewGuest] = useState<BukuTamu | null>(null);
  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');

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
      if (last.toUpperCase().startsWith('FN-')) {
        clean = last;
      }
    }
    return clean.toUpperCase();
  };

  // Check-in Execution
  const handleProcessScan = async (rawInput: string) => {
    const code = extractCode(rawInput);
    if (!code) return;

    isProcessingRef.current = true;

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
        toast.error(`Kode "${code}" tidak ditemukan!`);
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 2000);
        return;
      }

      if (target.is_attended) {
        if (soundEnabled) playChime(false);
        setScanResult({ guest: target, wasAlreadyAttended: true });
        toast('Tamu ini sudah pernah check-in!', {
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
    } catch (err: any) {
      console.error('Scan error:', err);
      toast.error('Gagal memproses check-in: ' + err.message);
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 2500);
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

  // Open Preview Modal
  const handleOpenPreview = async (guest: BukuTamu) => {
    try {
      setPreviewGuest(guest);
      const checkinUrl = `${window.location.origin}/#/checkin?code=${encodeURIComponent(guest.ticket_code)}`;
      const url = await QRCode.toDataURL(checkinUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#6B0F1A', light: '#FFFFFF' }
      });
      setPreviewQrUrl(url);
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
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            },
            verbose: false
          });
          scannerRef.current = html5QrCode;

          const cameraConfig = selectedCameraId
            ? selectedCameraId
            : { facingMode: 'environment' };

          await html5QrCode.start(
            cameraConfig,
            {
              fps: 15,
              qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                const size = Math.floor(minEdge * 0.75);
                return { width: Math.max(size, 260), height: Math.max(size, 260) };
              }
            },
            (decodedText) => {
              if (isMounted && !isProcessingRef.current) {
                handleProcessScan(decodedText);
              }
            },
            () => {}
          );
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
            Akun Petugas: <span className="font-bold text-maroon">{(userEmail || 'Petugas').split('@')[0].toUpperCase()}</span> • Buka scanner kamera atau cari nama di tabel
          </p>
        </div>

        {/* Primary Action Button: Open Scanner Modal */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsScannerModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-maroon via-maroon-800 to-[#550B14] hover:opacity-95 text-gold border border-gold-400 font-bold text-xs shadow-lg shadow-maroon/20 transition-all flex items-center space-x-2 active:scale-95 cursor-pointer"
          >
            <Camera size={18} />
            <span className="tracking-wide uppercase">Buka Scanner Kamera</span>
          </button>

          <button
            onClick={fetchGuests}
            className="p-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            title="Refresh Data Tamu"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
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
          <span className="text-[11px] font-bold text-maroon uppercase tracking-wider block">Souvenir Diserahkan</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-bold text-maroon">{totalSouvenirsGiven}</span>
            <span className="text-xs text-gray-500 font-medium">/ {totalRegistered} Undangan</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mt-2">
            <div
              className="bg-maroon h-full rounded-full transition-all duration-700"
              style={{ width: `${totalRegistered > 0 ? Math.round((totalSouvenirsGiven / totalRegistered) * 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. QUICK MANUAL CHECK-IN BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 text-gray-800 text-xs font-bold uppercase tracking-wider">
          <QrCode size={18} className="text-maroon" />
          <span>Check-in Cepat Manual (Ketik Kode Tiket)</span>
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
            placeholder="Contoh: FN-A8K9Z2"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            className="px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:border-maroon outline-none font-mono uppercase w-full sm:w-60 shadow-inner"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-maroon hover:bg-maroon-800 text-gold text-xs font-bold rounded-xl transition-all shadow-sm flex items-center space-x-1.5 shrink-0"
          >
            <Send size={13} />
            <span>Check-in</span>
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

            {/* Status Filter Chips */}
            <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
              {[
                { key: 'all', label: `Semua (${totalRegistered})` },
                { key: 'attended', label: `Hadir (${totalAttended})` },
                { key: 'pending', label: `Belum (${totalPending})` }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterStatus(tab.key as any)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterStatus === tab.key
                      ? 'bg-maroon text-gold shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
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
                      <p className="font-bold text-gray-900">{guest.nama_keluarga || guest.nama_tamu}</p>
                      {guest.no_whatsapp ? (
                        <a
                          href={`https://wa.me/${guest.no_whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 text-emerald-600 hover:underline text-[11px] mt-0.5"
                        >
                          <Phone size={11} />
                          <span>{guest.no_whatsapp}</span>
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

                    {/* Pax (Konfirmasi / Jatah) */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span className="font-bold text-gray-900 block">
                        {guest.jumlah_hadir_konfirmasi || guest.jumlah_tamu} Pax
                      </span>
                      {guest.jatah_tamu && (
                        <span className="text-[10px] text-gray-400 block font-normal">
                          (Jatah: {guest.jatah_tamu})
                        </span>
                      )}
                    </td>

                    {/* Status Kehadiran */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {guest.is_attended ? (
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

                    {/* Status Souvenir (1 per undangan) */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {guest.is_souvenir_given ? (
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
                        {/* 1-Click Check-in Toggle */}
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

            {/* Modal Body: Single Large Camera Viewport */}
            <div className="relative flex-1 bg-black flex items-center justify-center min-h-[420px] sm:min-h-[500px] md:h-[62vh] overflow-hidden">
              {/* Single Video Container (Forced single stream & full cover) */}
              <div 
                id="scanner-modal-reader" 
                className="w-full h-full flex items-center justify-center [&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover [&_video:not(:first-of-type)]:!hidden [&>div]:!w-full [&>div]:!h-full [&>div]:!border-none" 
              />

              {/* Scanning Target Reticles & Active Laser Line */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Golden Corner Reticles */}
                <div className="w-64 h-64 sm:w-80 sm:h-80 border-2 border-gold/40 rounded-3xl relative flex items-center justify-center">
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-gold rounded-tl-xl" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-gold rounded-tr-xl" />
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-gold rounded-bl-xl" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-gold rounded-br-xl" />
                  
                  {/* Active Laser Sweep */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#f59e0b] animate-pulse" />
                </div>
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
                            Terkonfirmasi: {scanResult.guest.jumlah_hadir_konfirmasi || scanResult.guest.jumlah_tamu} Orang
                            {scanResult.guest.jatah_tamu ? ` (Jatah: ${scanResult.guest.jatah_tamu})` : ''}
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
                        onClick={() => setScanResult(null)}
                        className="px-4 py-2.5 rounded-xl bg-maroon text-gold font-bold text-xs hover:bg-maroon-800 shadow-md shrink-0 uppercase tracking-wider"
                      >
                        Lanjutkan
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
                  <span>Jarak HP tamu ideal: <strong>15–25 cm</strong> di depan kamera.</span>
                </span>
                <span className="text-stone-500 font-mono text-[11px]">
                  Sensor: 15 FPS • GPU Active
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
      {/* 6. MODAL PREVIEW BARCODE TAMU                                 */}
      {/* ============================================================== */}
      {previewGuest && (
        <Modal
          isOpen={Boolean(previewGuest)}
          onClose={() => setPreviewGuest(null)}
          title="Tiket & Barcode Tamu"
        >
          <div className="text-center p-4 space-y-4">
            <div className="p-4 bg-white rounded-2xl border border-stone-200 inline-block shadow-inner">
              {previewQrUrl && (
                <img
                  src={previewQrUrl}
                  alt={`QR ${previewGuest.ticket_code}`}
                  className="w-60 h-60 mx-auto object-contain"
                />
              )}
            </div>

            <div>
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Kode Tiket</p>
              <p className="font-mono text-xl font-bold text-maroon">{previewGuest.ticket_code}</p>
              <h3 className="font-serif text-lg font-bold text-gray-900 mt-1">{previewGuest.nama_tamu}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {previewGuest.pihak} • {previewGuest.jumlah_tamu} Pax
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={() => {
                  window.open(
                    `${window.location.origin}/#/checkin?code=${previewGuest.ticket_code}`,
                    '_blank'
                  );
                }}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-maroon text-gold font-bold text-xs hover:bg-maroon-800 shadow-sm"
              >
                <CheckCircle2 size={14} />
                <span>Validasi / Check-in</span>
              </button>

              <button
                onClick={() => {
                  window.open(
                    `${window.location.origin}/#/guest-pass?code=${previewGuest.ticket_code}`,
                    '_blank'
                  );
                }}
                className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-gold-50 text-gold-900 border border-gold-300 font-bold text-xs hover:bg-gold-100"
              >
                <ExternalLink size={14} />
                <span>Tiket Tamu</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs"
              >
                <Printer size={14} />
                <span>Cetak</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default ScannerDesk;
