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
  Filter,
  Maximize2,
  Volume2,
  VolumeX,
  Printer,
  ExternalLink,
  SlidersHorizontal,
  Info
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
    // ignore audio block
  }
};

interface ScannerDeskProps {
  userEmail: string;
}

const ScannerDesk: React.FC<ScannerDeskProps> = ({ userEmail }) => {
  const [guests, setGuests] = useState<BukuTamu[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualCode, setManualCode] = useState('');

  // Scanner state
  const [isScanning, setIsScanning] = useState(true);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  // Result popup state
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

  // Enumerate available cameras
  useEffect(() => {
    const detectCameras = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if available, otherwise first camera (laptop webcam)
          const backCam = devices.find((d) =>
            d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')
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
        }, 2200);
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

  // Toggle Attendance directly from table
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

  // Camera Lifecycle
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      if (!isScanning) return;

      // Stop previous instance if running
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

      try {
        // Initialize with hardware BarcodeDetector acceleration
        const html5QrCode = new Html5Qrcode('scanner-desk-reader', {
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          },
          verbose: false
        });
        scannerRef.current = html5QrCode;

        // Configuration: Dynamic large scanbox for laptop/desktop
        const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          // Large scanning zone (80% of viewport) so phone can be held naturally
          const size = Math.floor(minEdge * 0.8);
          return { width: Math.max(size, 260), height: Math.max(size, 260) };
        };

        const cameraConfig = selectedCameraId
          ? selectedCameraId
          : { facingMode: 'environment' };

        await html5QrCode.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: qrboxFunction
          },
          (decodedText) => {
            if (mounted && !isProcessingRef.current) {
              handleProcessScan(decodedText);
            }
          },
          () => {}
        );
      } catch (err: any) {
        console.warn('Camera start error:', err);
        if (mounted) {
          toast.error('Tidak dapat mengakses kamera: ' + (err?.message || err));
          setIsScanning(false);
        }
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current
            .stop()
            .then(() => {
              scannerRef.current?.clear();
              scannerRef.current = null;
            })
            .catch(() => {});
        }
      }
    };
  }, [isScanning, selectedCameraId]);

  // Calculations & Metrics
  const totalRegistered = guests.length;
  const totalPaxRegistered = guests.reduce((acc, g) => acc + (Number(g.jumlah_tamu) || 1), 0);
  const totalAttended = guests.filter((g) => g.is_attended).length;
  const totalPaxAttended = guests
    .filter((g) => g.is_attended)
    .reduce((acc, g) => acc + (Number(g.jumlah_tamu) || 1), 0);
  const totalPending = totalRegistered - totalAttended;
  const attendanceRate = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;

  // Filtered Guests
  const filteredGuests = guests.filter((g) => {
    const matchesSearch =
      g.nama_tamu.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.ticket_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.no_whatsapp && g.no_whatsapp.includes(searchTerm));

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'attended' && g.is_attended) ||
      (filterStatus === 'pending' && !g.is_attended);

    const matchesPihak = filterPihak === 'all' || g.pihak === filterPihak;

    return matchesSearch && matchesStatus && matchesPihak;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredGuests.length / pageSize) || 1;
  const paginatedGuests = pageSize === -1 
    ? filteredGuests 
    : filteredGuests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterPihak, pageSize]);

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
            Scanner Kehadiran Tamu (Grand Screen)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Akun Petugas: <span className="font-bold text-maroon">{userEmail.split('@')[0].toUpperCase()}</span> • Arahkan kamera ke barcode tamu undangan
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Camera Selector Dropdown (Laptop & Multi-Camera support) */}
          {cameras.length > 1 && (
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-maroon max-w-[200px] truncate"
              title="Pilih Kamera / Webcam"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  📷 {c.label || `Kamera ${c.id.substring(0, 5)}`}
                </option>
              ))}
            </select>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              toast(soundEnabled ? 'Bunyi Chime Dinonaktifkan' : 'Bunyi Chime Diaktifkan', { icon: '🔔' });
            }}
            className={`p-2.5 rounded-xl border transition-colors ${
              soundEnabled
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
            }`}
            title={soundEnabled ? 'Matikan Suara Chime' : 'Nyalakan Suara Chime'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Camera Power Toggle */}
          <button
            onClick={() => setIsScanning(!isScanning)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-sm ${
              isScanning
                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                : 'bg-maroon text-gold border border-gold-400 hover:bg-maroon/90'
            }`}
          >
            {isScanning ? <CameraOff size={15} /> : <Camera size={15} />}
            <span>{isScanning ? 'Jeda Kamera' : 'Buka Kamera'}</span>
          </button>

          {/* Refresh Data */}
          <button
            onClick={fetchGuests}
            className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            title="Refresh Data Tamu"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. REAL-TIME STATS 4-CARD BENTO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Terdaftar</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-bold text-gray-900">{totalRegistered}</span>
            <span className="text-xs text-gray-500 font-medium">({totalPaxRegistered} Pax)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Sudah Hadir</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-bold text-emerald-700">{totalAttended}</span>
            <span className="text-xs text-emerald-800 font-bold">({totalPaxAttended} Pax Telah Tiba)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Belum Hadir</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-bold text-gray-700">{totalPending}</span>
            <span className="text-xs text-gray-400 font-medium">Undangan</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gold-200/70 shadow-sm">
          <span className="text-[11px] font-bold text-maroon uppercase tracking-wider block">Tingkat Kehadiran</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-bold text-maroon">{attendanceRate}%</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden ml-2">
              <div
                className="bg-gradient-to-r from-gold-500 to-maroon h-full rounded-full transition-all duration-700"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. GRAND SCREEN SCANNER STAGE (TAMPILAN GEDE KHUSUS LAPTOP) */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-stone-800 relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto space-y-5">
          {/* Stage Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-800 text-xs">
            <div className="flex items-center space-x-2 text-gold">
              <Camera size={18} />
              <span className="font-bold tracking-wider uppercase">Grand Viewport Scanner Resepsi</span>
            </div>
            <div className="flex items-center space-x-2 text-stone-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sensor Kamera HD Aktif • Deteksi Cepat GPU</span>
            </div>
          </div>

          {/* LARGE CAMERA VIEWPORT CONTAINER */}
          <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-stone-700 shadow-inner w-full min-h-[360px] md:min-h-[460px] flex items-center justify-center">
            {/* HTML5 QRCODE CONTAINER */}
            <div id="scanner-desk-reader" className="w-full h-full" />

            {/* Target Reticle Overlay & Scanning Laser Line (Active when scanning) */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Laser scan line animation */}
                <div className="absolute w-3/4 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#f59e0b] animate-pulse" />
              </div>
            )}

            {/* Inactive State Message */}
            {!isScanning && (
              <div className="p-12 text-center text-stone-400 space-y-3 z-10">
                <CameraOff size={48} className="mx-auto text-stone-600" />
                <p className="text-sm font-bold text-stone-300">Kamera Scanner Sedang Dijeda</p>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Klik tombol "Buka Kamera" di atas untuk menyalakan kembali sensor kamera laptop Anda.
                </p>
              </div>
            )}
          </div>

          {/* LAPTOP SCANNING TIPS CARD */}
          <div className="p-3.5 bg-stone-800/80 rounded-2xl border border-stone-700/60 flex items-start space-x-3 text-xs text-stone-300">
            <Info size={18} className="text-gold shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-gold block">💡 Tips Memindai Barcode di Laptop:</span>
              Jaga jarak HP tamu sekitar <strong className="text-white">15–25 cm</strong> di depan webcam. Posisikan barcode tepat di tengah layar kamera. Jika barcode tidak langsung terbaca, coba turunkan sedikit kecerahan layar HP tamu agar tidak silau/pantulan cahaya.
            </div>
          </div>

          {/* MANUAL TICKET CODE INPUT BAR */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCode) {
                handleProcessScan(manualCode);
                setManualCode('');
              }
            }}
            className="flex flex-col sm:flex-row gap-2.5 pt-1"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Atau ketik Kode Tiket: FN-XXXXXX"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl bg-stone-800 border border-stone-700 text-white font-mono text-xs uppercase tracking-wider outline-none focus:border-gold placeholder:text-stone-500 shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-gold via-amber-400 to-gold-500 hover:opacity-90 text-maroon font-bold text-xs shadow-lg transition-all flex items-center justify-center space-x-1.5 active:scale-95"
            >
              <Send size={14} />
              <span>Check-in Cepat</span>
            </button>
          </form>
        </div>
      </div>

      {/* 4. SCAN RESULT POPUP BANNER */}
      {scanResult && (
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-amber-200 animate-fade-in relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                  scanResult.wasAlreadyAttended
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {scanResult.wasAlreadyAttended ? (
                  <AlertCircle size={32} />
                ) : (
                  <CheckCircle2 size={32} />
                )}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                  {scanResult.wasAlreadyAttended
                    ? 'Peringatan: Sudah Pernah Hadir'
                    : 'Check-in Berhasil Dikonfirmasi'}
                </span>
                <h3 className="font-serif text-2xl font-bold text-gray-900 mt-0.5">
                  {scanResult.guest.nama_tamu}
                </h3>
                <div className="flex items-center space-x-2 mt-1.5">
                  <span className="font-mono text-xs bg-stone-100 px-2.5 py-0.5 rounded text-maroon font-bold">
                    {scanResult.guest.ticket_code}
                  </span>
                  <span className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded font-bold">
                    {scanResult.guest.pihak}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded font-bold">
                    {scanResult.guest.jumlah_tamu} Pax
                  </span>
                  {scanResult.guest.attended_at && (
                    <span className="text-xs text-gray-400 flex items-center space-x-1">
                      <Clock size={12} />
                      <span>
                        Pukul {new Date(scanResult.guest.attended_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                    </span>
                  )}
                </div>
                {scanResult.guest.ucapan && (
                  <p className="text-xs text-gray-600 italic mt-2 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                    "{scanResult.guest.ucapan}"
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => setScanResult(null)}
              className="px-6 py-3.5 rounded-xl bg-maroon text-gold font-bold text-xs uppercase tracking-wider hover:bg-maroon/90 shadow-md shrink-0 w-full sm:w-auto"
            >
              Lanjutkan Scan
            </button>
          </div>
        </div>
      )}

      {/* 5. GUESTBOOK TABLE SECTION (WITH FILTER, SEARCH, SCROLL, AND PAGINATION) */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden space-y-4">
        
        {/* Table Controls (Search & Filters) */}
        <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif font-bold text-lg text-maroon">
              Daftar Tamu Undangan & Status Kehadiran
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Cari data tamu, filter berdasarkan status/pihak, dan periksa kehadiran secara langsung
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama, WA, tiket..."
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
        <div className="overflow-x-auto overflow-y-auto max-h-[460px] custom-scrollbar px-6 pb-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#FAF7F2] text-maroon uppercase tracking-wider font-serif font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3.5 rounded-l-xl">Kode Tiket</th>
                <th className="px-4 py-3.5">Nama Tamu & WhatsApp</th>
                <th className="px-4 py-3.5">Pihak</th>
                <th className="px-4 py-3.5 text-center">Pax</th>
                <th className="px-4 py-3.5">Status Kehadiran</th>
                <th className="px-4 py-3.5">Ucapan Tamu</th>
                <th className="px-4 py-3.5 text-right rounded-r-xl">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <div className="w-8 h-8 border-2 border-gold-300 border-t-maroon rounded-full animate-spin mx-auto mb-2" />
                    Memuat data tamu...
                  </td>
                </tr>
              ) : paginatedGuests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Tidak ada data tamu yang cocok dengan filter.
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

                    {/* Nama Tamu */}
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-gray-900">{guest.nama_tamu}</p>
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

                    {/* Pax */}
                    <td className="px-4 py-3.5 text-center font-bold text-gray-800 whitespace-nowrap">
                      {guest.jumlah_tamu} Orang
                    </td>

                    {/* Status Kehadiran */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
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

                    {/* Ucapan */}
                    <td className="px-4 py-3.5 max-w-xs truncate text-gray-600 italic">
                      {guest.ucapan ? `"${guest.ucapan}"` : <span className="text-gray-300 italic">Tidak ada pesan</span>}
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* 1-Click Check-in Toggle */}
                        <button
                          onClick={() => handleToggleAttendance(guest)}
                          className={`p-1.5 rounded-lg transition-colors ${
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
                          className="p-1.5 rounded-lg bg-gold-50 text-gold-800 hover:bg-gold-100 transition-colors"
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

      {/* 6. MODAL PREVIEW BARCODE TAMU */}
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
