import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
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
  ChevronRight,
  MessageSquareHeart
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, logActivity } from '../supabase';
import { BukuTamu } from '../types';

// Web Audio API feedback chime
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

  // Scanner state
  const [isScanning, setIsScanning] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  // Result Modal State
  const [scanResult, setScanResult] = useState<{
    guest: BukuTamu;
    wasAlreadyAttended: boolean;
  } | null>(null);

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
        playChime(false);
        toast.error(`Kode "${code}" tidak ditemukan!`);
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 2200);
        return;
      }

      if (target.is_attended) {
        playChime(false);
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

        playChime(true);
        setScanResult({ guest: updatedGuest, wasAlreadyAttended: false });
        toast.success(`Check-in Berhasil: ${target.nama_tamu} (${target.jumlah_tamu} Pax)`);

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

  // Camera Lifecycle
  useEffect(() => {
    let mounted = true;

    if (isScanning) {
      const html5QrCode = new Html5Qrcode('scanner-desk-reader');
      scannerRef.current = html5QrCode;

      html5QrCode
        .start(
          { facingMode: 'environment' },
          {
            fps: 12,
            qrbox: { width: 260, height: 260 }
          },
          (decodedText) => {
            if (mounted && !isProcessingRef.current) {
              handleProcessScan(decodedText);
            }
          },
          () => {}
        )
        .catch((err) => {
          console.warn('Camera error:', err);
          setIsScanning(false);
        });
    }

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
  }, [isScanning]);

  // Statistics
  const totalRegistered = guests.length;
  const totalPaxRegistered = guests.reduce((acc, g) => acc + (Number(g.jumlah_tamu) || 1), 0);
  const totalAttended = guests.filter((g) => g.is_attended).length;
  const totalPaxAttended = guests
    .filter((g) => g.is_attended)
    .reduce((acc, g) => acc + (Number(g.jumlah_tamu) || 1), 0);
  const recentAttended = guests.filter((g) => g.is_attended).slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in font-sans">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-3xl border border-gold-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-maroon/10 text-maroon text-xs font-bold tracking-widest uppercase mb-2">
            <ShieldCheck size={14} className="text-gold-600" />
            <span>Portal Khusus Petugas Resepsi</span>
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-maroon">
            Scanner Kehadiran Tamu
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Akun Petugas: <span className="font-bold text-maroon">{userEmail.split('@')[0].toUpperCase()}</span> • Arahkan kamera ke barcode tiket tamu
          </p>
        </div>

        <div className="flex items-center gap-2">
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

          <button
            onClick={fetchGuests}
            className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Real-time Metrics 3-Card Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Undangan</span>
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

        <div className="bg-white p-5 rounded-2xl border border-gold-200/70 shadow-sm">
          <span className="text-[11px] font-bold text-maroon uppercase tracking-wider block">Persentase Kehadiran</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-bold text-maroon">
              {totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0}%
            </span>
            <span className="text-xs text-stone-400">tamu hadir</span>
          </div>
        </div>
      </div>

      {/* LIVE CAMERA SCANNER VIEWPORT */}
      <div className="bg-stone-900 text-white p-6 md:p-8 rounded-3xl shadow-2xl border border-stone-800 relative overflow-hidden">
        <div className="max-w-md mx-auto text-center space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800 text-xs text-gold">
            <div className="flex items-center space-x-2 font-bold tracking-wider uppercase">
              <Camera size={16} />
              <span>Kamera Scanner Stand Resepsi</span>
            </div>
            <span className="text-[11px] text-stone-400">Siap Deteksi Barcode</span>
          </div>

          {/* Scanner Video Box */}
          <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-dashed border-gold/40 shadow-inner">
            <div id="scanner-desk-reader" className="w-full" />
            {!isScanning && (
              <div className="p-12 text-center text-stone-400 text-xs">
                Kamera sedang dinonaktifkan. Klik "Buka Kamera" di atas untuk memulai scan.
              </div>
            )}
          </div>

          {/* Manual Input Fallback */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCode) {
                handleProcessScan(manualCode);
                setManualCode('');
              }
            }}
            className="flex gap-2 pt-2"
          >
            <input
              type="text"
              placeholder="Atau ketik Kode Tiket: FN-XXXXXX"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              className="flex-1 px-4 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-white font-mono text-xs uppercase outline-none focus:border-gold"
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

      {/* SCAN RESULT POPUP BANNER (When a code is scanned) */}
      {scanResult && (
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-amber-200 animate-fade-in relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start space-x-4">
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
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                  {scanResult.wasAlreadyAttended
                    ? 'Peringatan: Sudah Pernah Hadir'
                    : 'Check-in Berhasil Dikonfirmasi'}
                </span>
                <h3 className="font-serif text-2xl font-bold text-gray-900 mt-0.5">
                  {scanResult.guest.nama_tamu}
                </h3>
                <div className="flex items-center space-x-2 mt-1.5">
                  <span className="font-mono text-xs bg-stone-100 px-2 py-0.5 rounded text-maroon font-bold">
                    {scanResult.guest.ticket_code}
                  </span>
                  <span className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-bold">
                    {scanResult.guest.pihak}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-bold">
                    {scanResult.guest.jumlah_tamu} Pax
                  </span>
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
              className="px-5 py-3 rounded-xl bg-maroon text-gold font-bold text-xs uppercase tracking-wider hover:bg-maroon/90 shadow-md shrink-0 w-full sm:w-auto"
            >
              Lanjutkan Scan
            </button>
          </div>
        </div>
      )}

      {/* RECENT CHECK-INS FEED */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2 text-maroon">
            <UserCheck size={18} />
            <h3 className="font-serif font-bold text-base">Tamu Terakhir yang Masuk</h3>
          </div>
          <span className="text-xs text-gray-400 font-medium">Real-time Feed</span>
        </div>

        {recentAttended.length === 0 ? (
          <p className="text-center py-6 text-xs text-gray-400 italic">
            Belum ada tamu yang check-in.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentAttended.map((tamu) => (
              <div key={tamu.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{tamu.nama_tamu}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {tamu.pihak} • {tamu.jumlah_tamu} Pax
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs text-maroon font-bold bg-stone-50 px-2 py-1 rounded border border-stone-200">
                    {tamu.ticket_code}
                  </span>
                  {tamu.attended_at && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(tamu.attended_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}{' '}
                      WIB
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScannerDesk;
