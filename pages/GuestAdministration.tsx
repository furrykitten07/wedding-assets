import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'qrcode';
import { 
  QrCode, 
  Camera, 
  CameraOff, 
  Copy, 
  Check, 
  Users, 
  UserCheck, 
  Clock, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ExternalLink, 
  Sparkles,
  RefreshCw,
  Phone,
  MessageSquareHeart,
  Printer,
  ChevronRight,
  Send
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
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
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
  } catch (e) {
    // ignore audio block
  }
};

interface GuestAdministrationProps {
  userEmail: string;
}

const GuestAdministration: React.FC<GuestAdministrationProps> = ({ userEmail }) => {
  const [guests, setGuests] = useState<BukuTamu[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'attended' | 'pending'>('all');
  const [filterPihak, setFilterPihak] = useState<string>('all');

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingScanRef = useRef(false);

  // Manual Check-in input
  const [manualCode, setManualCode] = useState('');

  // Scanned Guest Notification Modal
  const [scannedResult, setScannedResult] = useState<{
    guest: BukuTamu;
    wasAlreadyAttended: boolean;
  } | null>(null);

  // Modal View QR Code
  const [previewGuest, setPreviewGuest] = useState<BukuTamu | null>(null);
  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');

  // Copy state
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch Guestbook data
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
      console.error('Fetch buku tamu error:', err);
      if (!err?.message?.includes('schema cache')) {
        toast.error('Gagal mengambil data buku tamu: ' + (err?.message || 'Error'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  // Camera Scanner Lifecycle
  useEffect(() => {
    let mounted = true;

    if (isScanning) {
      const html5QrCode = new Html5Qrcode('guest-qr-reader');
      scannerRef.current = html5QrCode;

      html5QrCode
        .start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            if (mounted && !isProcessingScanRef.current) {
              handleProcessCheckin(decodedText);
            }
          },
          () => {
            // parse error ignored
          }
        )
        .catch((err) => {
          console.warn('Camera error:', err);
          toast.error('Tidak dapat mengakses kamera: ' + (err?.message || err));
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

  // Check-in Execution Logic
  const handleProcessCheckin = async (rawCode: string) => {
    let cleanCode = rawCode.trim();
    // Support URL parsing from camera scanner (e.g. https://.../#/checkin?code=FN-XXXXXX)
    if (cleanCode.includes('code=')) {
      const match = cleanCode.match(/[?&]code=([A-Za-z0-9_-]+)/i);
      if (match && match[1]) {
        cleanCode = match[1];
      }
    } else if (cleanCode.includes('/')) {
      const parts = cleanCode.split('/');
      const last = parts[parts.length - 1];
      if (last.toUpperCase().startsWith('FN-')) {
        cleanCode = last;
      }
    }
    cleanCode = cleanCode.toUpperCase();
    if (!cleanCode) return;

    isProcessingScanRef.current = true;

    try {
      // Find guest in database
      const { data, error } = await supabase
        .from('buku_tamu')
        .select('*')
        .eq('ticket_code', cleanCode);

      if (error) throw error;
      const target = Array.isArray(data) ? data[0] : data;

      if (!target) {
        playChime(false);
        toast.error(`Kode tiket "${cleanCode}" tidak terdaftar!`);
        setTimeout(() => {
          isProcessingScanRef.current = false;
        }, 2000);
        return;
      }

      if (target.is_attended) {
        playChime(false);
        setScannedResult({ guest: target, wasAlreadyAttended: true });
        toast('Tamu ini sudah pernah check-in sebelumnya.', {
          icon: '⚠️',
          style: { background: '#FFFBEB', color: '#92400E', border: '1px solid #FCD34D' }
        });
      } else {
        // Mark as attended
        const nowIso = new Date().toISOString();
        const { error: updateError } = await supabase
          .from('buku_tamu')
          .update({
            is_attended: true,
            attended_at: nowIso
          })
          .eq('id', target.id);

        if (updateError) throw updateError;

        const updatedGuest: BukuTamu = {
          ...target,
          is_attended: true,
          attended_at: nowIso
        };

        playChime(true);
        setScannedResult({ guest: updatedGuest, wasAlreadyAttended: false });
        toast.success(`Check-in berhasil: ${target.nama_tamu} (${target.jumlah_tamu} Pax)`);

        // Log activity
        logActivity(
          userEmail,
          'update',
          'Tamu',
          `Check-in Tamu: ${target.nama_tamu} (${target.jumlah_tamu} Pax - ${target.ticket_code})`
        );

        // Update local state immediately
        setGuests((prev) =>
          prev.map((g) => (g.id === target.id ? updatedGuest : g))
        );
      }
    } catch (err: any) {
      console.error('Check-in error:', err);
      toast.error('Gagal memproses check-in: ' + err.message);
    } finally {
      // Delay before allowing next scan to prevent duplicate trigger
      setTimeout(() => {
        isProcessingScanRef.current = false;
      }, 2500);
    }
  };

  // Toggle Attendance from table manually
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

      if (error) throw error;

      setGuests((prev) =>
        prev.map((g) =>
          g.id === guest.id ? { ...g, is_attended: newStatus, attended_at: newAttendedAt } : g
        )
      );

      if (newStatus) {
        playChime(true);
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

  // Delete Guest Record
  const handleDeleteGuest = async (guest: BukuTamu) => {
    if (!window.confirm(`Hapus data tamu "${guest.nama_tamu}" (${guest.ticket_code})?`)) return;

    try {
      const { error } = await supabase.from('buku_tamu').delete().eq('id', guest.id);
      if (error) throw error;

      setGuests((prev) => prev.filter((g) => g.id !== guest.id));
      toast.success('Data tamu berhasil dihapus');
      logActivity(userEmail, 'delete', 'Tamu', `Hapus Buku Tamu: ${guest.nama_tamu}`);
    } catch (err: any) {
      toast.error('Gagal menghapus: ' + err.message);
    }
  };

  // Open QR Preview Modal
  const handleOpenPreview = async (guest: BukuTamu) => {
    try {
      setPreviewGuest(guest);
      // Generate QR Code with Full Live Check-in Validation URL
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

  // Copy Public Link
  const handleCopyPublicLink = () => {
    const publicUrl = `${window.location.origin}/#/guest-pass`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    toast.success('Link Form Buku Tamu disalin ke clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Calculations & Metrics
  const totalRegistered = guests.length;
  const totalPaxRegistered = guests.reduce((acc, g) => acc + (Number(g.jumlah_tamu) || 1), 0);
  const totalAttended = guests.filter((g) => g.is_attended).length;
  const totalPaxAttended = guests
    .filter((g) => g.is_attended)
    .reduce((acc, g) => acc + (Number(g.jumlah_tamu) || 1), 0);
  const totalPending = totalRegistered - totalAttended;
  const totalPaxPending = totalPaxRegistered - totalPaxAttended;
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

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* TOP HEADER & ACTION BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gold-200/60 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-maroon/10 text-maroon text-xs font-bold tracking-widest uppercase mb-2">
            <Sparkles size={14} className="text-gold-600" />
            <span>Reception Desk & Check-in Portal</span>
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-maroon">
            Administrasi Buku Tamu & Scan QR
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Kelola tamu undangan, salin link formulir publik, dan verifikasi barcode kehadiran di lokasi acara.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Copy Public Link Button */}
          <button
            onClick={handleCopyPublicLink}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gold-50 hover:bg-gold-100 text-gold-900 border border-gold-300 font-bold text-xs transition-all shadow-sm active:scale-95"
          >
            {copiedLink ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-gold-700" />}
            <span>{copiedLink ? 'Link Tersalin!' : 'Salin Link Form Tamu'}</span>
          </button>

          {/* Open Camera Scanner Button */}
          <button
            onClick={() => setIsScanning(!isScanning)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 ${
              isScanning
                ? 'bg-rose-700 hover:bg-rose-800 text-white'
                : 'bg-maroon hover:bg-maroon/90 text-gold border border-gold-400'
            }`}
          >
            {isScanning ? <CameraOff size={16} /> : <Camera size={16} />}
            <span>{isScanning ? 'Tutup Scanner Kamera' : 'Buka Scanner QR'}</span>
          </button>

          {/* Refresh Data */}
          <button
            onClick={fetchGuests}
            className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Undangan */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">Total Terdaftar</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">{totalRegistered} <span className="text-xs font-normal text-gray-500">Undangan</span></h3>
            <p className="text-xs text-amber-800 font-semibold mt-0.5">{totalPaxRegistered} Total Estimasi Pax</p>
          </div>
        </div>

        {/* Sudah Hadir */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-emerald-600 tracking-wider">Sudah Check-in</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <UserCheck size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-emerald-700">{totalAttended} <span className="text-xs font-normal text-emerald-600">Undangan</span></h3>
            <p className="text-xs text-emerald-800 font-semibold mt-0.5">{totalPaxAttended} Pax Telah Hadir</p>
          </div>
        </div>

        {/* Belum Hadir */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">Belum Hadir</span>
            <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center font-bold">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-700">{totalPending} <span className="text-xs font-normal text-gray-400">Undangan</span></h3>
            <p className="text-xs text-stone-500 font-semibold mt-0.5">{totalPaxPending} Pax Pending</p>
          </div>
        </div>

        {/* Persentase Kehadiran */}
        <div className="bg-white p-5 rounded-2xl border border-gold-200/70 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-maroon tracking-wider">Tingkat Kehadiran</span>
            <span className="text-xs font-bold text-gold-700">{attendanceRate}%</span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-maroon">{attendanceRate}%</h3>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-gold-500 to-maroon h-full rounded-full transition-all duration-700"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CAMERA SCANNER & MANUAL SEARCH DRAWER */}
      {isScanning && (
        <div className="bg-stone-900 text-white p-6 md:p-8 rounded-3xl shadow-2xl border border-stone-800 animate-fade-in relative overflow-hidden">
          <div className="max-w-md mx-auto text-center space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center space-x-2 text-gold">
                <Camera size={18} />
                <span className="text-xs font-bold tracking-wider uppercase">Live Camera Scanner</span>
              </div>
              <button
                onClick={() => setIsScanning(false)}
                className="text-stone-400 hover:text-white text-xs font-semibold"
              >
                Tutup [X]
              </button>
            </div>

            {/* Html5Qrcode video container */}
            <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-dashed border-gold/40 shadow-inner">
              <div id="guest-qr-reader" className="w-full" />
            </div>

            <p className="text-xs text-stone-300">
              Arahkan kamera ke Barcode / QR Code pada tiket digital tamu.
            </p>
          </div>
        </div>
      )}

      {/* QUICK MANUAL CODE CHECK-IN BAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-gray-700 text-xs font-bold uppercase tracking-wider">
          <QrCode size={18} className="text-maroon" />
          <span>Check-in Cepat Manual (Kode Tiket)</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualCode) {
              handleProcessCheckin(manualCode);
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
            className="px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:border-maroon outline-none font-mono uppercase w-full sm:w-52"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-maroon hover:bg-maroon/90 text-gold text-xs font-bold rounded-xl transition-all shadow-sm flex items-center space-x-1.5 shrink-0"
          >
            <Send size={13} />
            <span>Check-in</span>
          </button>
        </form>
      </div>

      {/* TABLE FILTERS & SEARCH */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama tamu, WhatsApp, atau kode tiket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-maroon outline-none transition-all"
            />
          </div>

          {/* Status & Pihak Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl">
              {[
                { key: 'all', label: 'Semua' },
                { key: 'attended', label: 'Hadir' },
                { key: 'pending', label: 'Belum' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterStatus(tab.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterStatus === tab.key
                      ? 'bg-maroon text-gold shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Pihak Filter */}
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

        {/* DATA TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-maroon uppercase tracking-wider font-serif font-bold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Kode Tiket</th>
                <th className="px-6 py-4">Nama Tamu & WhatsApp</th>
                <th className="px-6 py-4">Pihak</th>
                <th className="px-6 py-4 text-center">Pax</th>
                <th className="px-6 py-4">Ucapan & Doa</th>
                <th className="px-6 py-4">Status Kehadiran</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    <div className="w-8 h-8 border-2 border-gold-300 border-t-maroon rounded-full animate-spin mx-auto mb-2" />
                    Memuat data buku tamu...
                  </td>
                </tr>
              ) : filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    Tidak ada data tamu yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredGuests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-amber-50/30 transition-colors">
                    {/* Kode Tiket */}
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-maroon bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200">
                        {guest.ticket_code}
                      </span>
                    </td>

                    {/* Nama Tamu */}
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 text-sm">{guest.nama_tamu}</p>
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
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
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

                    {/* Jumlah Tamu (Pax) */}
                    <td className="px-6 py-4 text-center font-bold text-gray-800">
                      {guest.jumlah_tamu} Orang
                    </td>

                    {/* Ucapan */}
                    <td className="px-6 py-4 max-w-xs truncate text-gray-600 italic">
                      {guest.ucapan ? `"${guest.ucapan}"` : <span className="text-gray-300 italic">Tidak ada pesan</span>}
                    </td>

                    {/* Status Kehadiran */}
                    <td className="px-6 py-4">
                      {guest.is_attended ? (
                        <div>
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>Hadir</span>
                          </span>
                          {guest.attended_at && (
                            <p className="text-[10px] text-gray-400 mt-1">
                              {new Date(guest.attended_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}{' '}
                              WIB
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-500 font-semibold text-[11px]">
                          <Clock size={12} />
                          <span>Belum Hadir</span>
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Toggle Attendance */}
                        <button
                          onClick={() => handleToggleAttendance(guest)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            guest.is_attended
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title={guest.is_attended ? 'Batalkan Status Hadir' : 'Tandai Sudah Hadir'}
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

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteGuest(guest)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          title="Hapus Data Tamu"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CHECK-IN SUCCESS / DUPLICATE NOTIFICATION */}
      {scannedResult && (
        <Modal
          isOpen={Boolean(scannedResult)}
          onClose={() => setScannedResult(null)}
          title={scannedResult.wasAlreadyAttended ? 'Informasi Check-in' : 'Konfirmasi Check-in Tamu'}
        >
          <div className="text-center p-4 space-y-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-md ${
                scannedResult.wasAlreadyAttended ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {scannedResult.wasAlreadyAttended ? (
                <AlertCircle size={36} />
              ) : (
                <CheckCircle2 size={36} className="text-emerald-600" />
              )}
            </div>

            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-gray-400">
                {scannedResult.wasAlreadyAttended ? 'Status: Pernah Check-in' : 'Status: Berhasil Diverifikasi'}
              </span>
              <h2 className="font-serif text-2xl font-bold text-gray-900 mt-1">
                {scannedResult.guest.nama_tamu}
              </h2>
              <div className="flex items-center justify-center space-x-2 mt-2">
                <span className="font-mono text-xs bg-gray-100 px-2.5 py-0.5 rounded text-gray-700 font-bold">
                  {scannedResult.guest.ticket_code}
                </span>
                <span className="text-xs bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded font-bold border border-amber-200">
                  {scannedResult.guest.pihak}
                </span>
                <span className="text-xs bg-stone-100 text-stone-800 px-2.5 py-0.5 rounded font-bold">
                  {scannedResult.guest.jumlah_tamu} Pax
                </span>
              </div>
            </div>

            {scannedResult.wasAlreadyAttended ? (
              <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
                ⚠️ Tamu ini sudah pernah tercatat hadir pada pukul{' '}
                <strong>
                  {scannedResult.guest.attended_at
                    ? new Date(scannedResult.guest.attended_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '-'}
                </strong>{' '}
                WIB.
              </p>
            ) : (
              <p className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                ✅ Kehadiran tamu berhasil diverifikasi dan tercatat ke buku tamu. Selamat datang!
              </p>
            )}

            {scannedResult.guest.ucapan && (
              <div className="text-left bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-xs text-gray-600">
                <span className="font-bold text-gray-700 block mb-1">Pesan Tamu:</span>
                <p className="italic">"{scannedResult.guest.ucapan}"</p>
              </div>
            )}

            <button
              onClick={() => setScannedResult(null)}
              className="w-full py-3 bg-maroon text-gold font-bold rounded-xl hover:bg-maroon/90 shadow-md text-xs uppercase tracking-wider"
            >
              Tutup & Lanjutkan Scan
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL 2: PREVIEW BARCODE & DIGITAL PASS */}
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
                  className="w-56 h-56 mx-auto object-contain"
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
                className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs"
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

export default GuestAdministration;

