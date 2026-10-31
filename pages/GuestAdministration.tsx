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
  Send,
  UserPlus,
  Award,
  Gift,
  PackageCheck,
  MessageCircle,
  Save,
  Volume2,
  VolumeX,
  X,
  Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, logActivity } from '../supabase';
import { BukuTamu } from '../types';
import Modal from '../components/Modal';

// Audio feedback chime using Web Audio API
const playChime = (isSuccess: boolean = true, soundEnabled: boolean = true) => {
  if (!soundEnabled) return;
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
  const [filterKategori, setFilterKategori] = useState<'all' | 'VIP' | 'Reguler'>('all');
  const [filterSouvenir, setFilterSouvenir] = useState<'all' | 'given' | 'pending'>('all');

  const isStaff = (userEmail || '').toLowerCase().includes('staff') ||
                  (userEmail || '').toLowerCase().includes('resepsi') ||
                  (userEmail || '').toLowerCase().includes('scanner') ||
                  (userEmail || '').toLowerCase().includes('panitia');

  // Add Guest Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingGuest, setIsSubmittingGuest] = useState(false);
  const [formData, setFormData] = useState({
    nama_keluarga: '',
    kategori_tamu: 'Reguler' as 'VIP' | 'Reguler',
    jatah_tamu: 2,
    pihak: 'Pihak Fikri' as 'Pihak Fikri' | 'Pihak Nadya' | 'Rekan Bersama',
    no_whatsapp: ''
  });

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingScanRef = useRef(false);

  // Manual Check-in input
  const [manualCode, setManualCode] = useState('');

  // Scanned Guest Notification Modal
  const [scannedResult, setScannedResult] = useState<{
    guest: BukuTamu;
    wasAlreadyAttended: boolean;
  } | null>(null);

  // Modal View QR Code (Supports Dual Barcode)
  const [previewGuest, setPreviewGuest] = useState<BukuTamu | null>(null);
  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');
  const [previewQrKehadiran, setPreviewQrKehadiran] = useState<string>('');
  const [previewQrSouvenir, setPreviewQrSouvenir] = useState<string>('');
  const [previewTab, setPreviewTab] = useState<'kehadiran' | 'souvenir'>('kehadiran');

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

  // Camera detection
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

  // Keyboard shortcut (Escape to close scanner modal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isScanning) {
        setIsScanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScanning]);

  // Clean stop helper
  const stopAndClearScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Error clearing scanner:', e);
      }
      scannerRef.current = null;
    }
    const el = document.getElementById('guest-qr-reader');
    if (el) el.innerHTML = '';
  };

  // Camera Scanner Lifecycle with Grand Viewport
  useEffect(() => {
    let active = true;

    if (isScanning) {
      const startScanner = async () => {
        await stopAndClearScanner();
        if (!active) return;

        const container = document.getElementById('guest-qr-reader');
        if (!container) return;

        try {
          const html5QrCode = new Html5Qrcode('guest-qr-reader', {
            verbose: false,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            }
          });
          scannerRef.current = html5QrCode;

          const config = {
            fps: 15
            // Omit qrbox to allow scanning anywhere across the entire camera view
          };

          const cameraIdOrConfig = selectedCameraId
            ? { deviceId: { exact: selectedCameraId } }
            : { facingMode: 'environment' };

          await html5QrCode.start(
            cameraIdOrConfig,
            config,
            (decodedText) => {
              if (active && !isProcessingScanRef.current) {
                handleProcessCheckin(decodedText);
              }
            },
            () => {}
          );
        } catch (err: any) {
          console.warn('Camera error:', err);
          toast.error('Tidak dapat mengakses kamera: ' + (err?.message || err));
          setIsScanning(false);
        }
      };

      const timer = setTimeout(startScanner, 120);
      return () => {
        clearTimeout(timer);
        active = false;
        stopAndClearScanner();
      };
    } else {
      stopAndClearScanner();
    }
  }, [isScanning, selectedCameraId]);

  // Check-in Execution Logic (Handles both Kehadiran & Souvenir)
  const handleProcessCheckin = async (rawCode: string) => {
    let cleanCode = rawCode.trim();
    const isSouvenirScan = rawCode.includes('mode=souvenir') || rawCode.toUpperCase().startsWith('SV-');

    // Support URL parsing from camera scanner (e.g. https://.../#/checkin?code=FN-XXXXXX)
    if (cleanCode.includes('code=')) {
      const match = cleanCode.match(/[?&]code=([A-Za-z0-9_-]+)/i);
      if (match && match[1]) {
        cleanCode = match[1];
      }
    } else if (cleanCode.includes('/')) {
      const parts = cleanCode.split('/');
      const last = parts[parts.length - 1];
      if (last.toUpperCase().startsWith('FN-') || last.toUpperCase().startsWith('SV-')) {
        cleanCode = last;
      }
    }
    if (cleanCode.toUpperCase().startsWith('SV-')) {
      cleanCode = cleanCode.substring(3);
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
        playChime(false, soundEnabled);
        toast.error(`Kode tiket "${cleanCode}" tidak terdaftar!`);
        setTimeout(() => {
          isProcessingScanRef.current = false;
        }, 2000);
        return;
      }

      if (isSouvenirScan) {
        // Souvenir Scan
        if (target.is_souvenir_given) {
          playChime(false, soundEnabled);
          setScannedResult({ guest: target, wasAlreadyAttended: true });
          toast.error(`⚠️ Souvenir SUDAH PERNAH DIAMBIL sebelumnya!`, { duration: 4000 });
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

          if (updateError) throw updateError;

          const updatedGuest: BukuTamu = {
            ...target,
            is_souvenir_given: true,
            souvenir_given_at: nowIso,
            is_attended: true,
            attended_at: target.attended_at || nowIso
          };

          playChime(true, soundEnabled);
          setScannedResult({ guest: updatedGuest, wasAlreadyAttended: false });
          toast.success(`🎁 1 Paket Souvenir Berhasil Diserahkan: ${target.nama_keluarga || target.nama_tamu}!`);

          logActivity(
            userEmail,
            'update',
            'Tamu',
            `Klaim Souvenir Barcode: ${target.nama_keluarga || target.nama_tamu} (${target.ticket_code})`
          );

          setGuests((prev) =>
            prev.map((g) => (g.id === target.id ? updatedGuest : g))
          );
        }
      } else {
        // Attendance Check-in
        if (target.is_attended) {
          playChime(false, soundEnabled);
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

          playChime(true, soundEnabled);
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
        playChime(true, soundEnabled);
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
    if (isStaff) {
      toast.error('Akun Staff tidak memiliki izin untuk menghapus data tamu.');
      return;
    }
    if (!window.confirm(`Hapus data tamu "${guest.nama_tamu}" (${guest.ticket_code})?`)) return;

    try {
      const { error } = await supabase.from('buku_tamu').delete().eq('id', guest.id);
      if (error) throw error;

      // Sinkronisasi hapus dari tabel tamu (Daftar Tamu)
      try {
        await supabase.from('tamu').delete().eq('nama_tamu', guest.nama_tamu);
        if (guest.nama_keluarga && guest.nama_keluarga !== guest.nama_tamu) {
          await supabase.from('tamu').delete().eq('nama_tamu', guest.nama_keluarga);
        }
      } catch (syncErr) {
        console.warn("Sync delete to tamu err:", syncErr);
      }

      setGuests((prev) => prev.filter((g) => g.id !== guest.id));
      toast.success('Data tamu berhasil dihapus');
      logActivity(userEmail, 'delete', 'Tamu', `Hapus Buku Tamu: ${guest.nama_tamu}`);
    } catch (err: any) {
      toast.error('Gagal menghapus: ' + err.message);
    }
  };

  // Open QR Preview Modal (Generates Both Barcodes)
  const handleOpenPreview = async (guest: BukuTamu) => {
    try {
      setPreviewGuest(guest);
      setPreviewTab('kehadiran');
      const checkinUrl = `${window.location.origin}/#/checkin?code=${encodeURIComponent(guest.ticket_code)}`;
      const urlKehadiran = await QRCode.toDataURL(checkinUrl, {
        width: 360,
        margin: 2,
        color: { dark: '#6B0F1A', light: '#FFFFFF' }
      });
      setPreviewQrKehadiran(urlKehadiran);
      setPreviewQrUrl(urlKehadiran);

      const souvenirUrl = `${window.location.origin}/#/checkin?code=${encodeURIComponent(guest.ticket_code)}&mode=souvenir`;
      const urlSouvenir = await QRCode.toDataURL(souvenirUrl, {
        width: 360,
        margin: 2,
        color: { dark: '#14532D', light: '#FFFFFF' }
      });
      setPreviewQrSouvenir(urlSouvenir);
    } catch (err) {
      toast.error('Gagal membuat preview barcode');
    }
  };

  // Copy Public Link
  const handleCopyPublicLink = () => {
    const publicUrl = `${window.location.origin}/#/rsvp`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    toast.success('Link Form RSVP Tamu disalin ke clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Add new guest family with unique invitation link
  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_keluarga.trim()) {
      toast.error('Nama keluarga / tamu wajib diisi');
      return;
    }

    try {
      setIsSubmittingGuest(true);
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newTicketCode = `FN-${randomCode}`;
      const paxQuota = Math.min(30, Math.max(1, Number(formData.jatah_tamu) || 2));

      const payload = {
        ticket_code: newTicketCode,
        nama_tamu: formData.nama_keluarga.trim(),
        nama_keluarga: formData.nama_keluarga.trim(),
        kategori_tamu: formData.kategori_tamu,
        jatah_tamu: paxQuota,
        jumlah_tamu: paxQuota,
        jumlah_hadir_konfirmasi: paxQuota,
        pihak: formData.pihak,
        no_whatsapp: formData.no_whatsapp.trim() || null,
        is_attended: false,
        is_souvenir_given: false
      };

      const { error } = await supabase.from('buku_tamu').insert([payload]);
      if (error && !error.message?.includes('schema cache')) throw error;

      // Sinkronisasi buat data di tabel tamu (Daftar Tamu)
      try {
        const tamuPihak = formData.pihak.includes('Nadya') ? 'Nadya' : 'Fikri';
        const tamuKategori = formData.kategori_tamu === 'VIP' ? 'Keluarga Besar' : 'Teman Kerja';
        const membawaPasangan = paxQuota > 1;
        const jumlahTambahan = paxQuota > 1 ? paxQuota - 1 : 0;
        await supabase.from('tamu').insert([{
          nama_tamu: formData.nama_keluarga.trim(),
          no_whatsapp: formData.no_whatsapp.trim() || null,
          pihak: tamuPihak,
          kategori: tamuKategori,
          membawa_pasangan: membawaPasangan,
          jumlah_tambahan: jumlahTambahan
        }]);
      } catch (syncErr) {
        console.warn("Sync insert to tamu err:", syncErr);
      }

      toast.success(`Tamu ${formData.nama_keluarga} berhasil didaftarkan! Link undangan siap.`);
      logActivity(userEmail, 'create', 'Tamu', `Daftarkan Tamu: ${formData.nama_keluarga} (${formData.kategori_tamu} - ${newTicketCode})`);

      setIsAddModalOpen(false);
      setFormData({
        nama_keluarga: '',
        kategori_tamu: 'Reguler',
        jatah_tamu: 2,
        pihak: 'Pihak Fikri',
        no_whatsapp: ''
      });

      await fetchGuests();
    } catch (err: any) {
      toast.error('Gagal menambahkan tamu: ' + (err?.message || err));
    } finally {
      setIsSubmittingGuest(false);
    }
  };

  // Toggle Souvenir (1 per family, prevents double giveaway)
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

      if (error && !error.message?.includes('schema cache')) throw error;

      const updated = {
        ...guest,
        is_souvenir_given: newStatus,
        souvenir_given_at: newGivenAt
      };

      setGuests((prev) => prev.map((g) => (g.id === guest.id ? updated : g)));

      if (newStatus) {
        playChime(true);
        toast.success(`🎁 Souvenir diserahkan untuk ${guest.nama_keluarga || guest.nama_tamu}`);
        logActivity(userEmail, 'update', 'Tamu', `Serah Souvenir: ${guest.nama_tamu} (${guest.ticket_code})`);
      } else {
        toast('Status souvenir dibatalkan', { icon: 'ℹ️' });
      }
    } catch (err: any) {
      toast.error('Gagal memperbarui status souvenir: ' + err.message);
    }
  };

  // Copy Single Unique Invitation Link
  const handleCopyGuestUniqueLink = (guest: BukuTamu) => {
    const uniqueUrl = `${window.location.origin}/#/rsvp?code=${guest.ticket_code}`;
    navigator.clipboard.writeText(uniqueUrl);
    toast.success(`Link undangan unik ${guest.nama_keluarga || guest.nama_tamu} disalin!`);
  };

  // WhatsApp Link Builder with personalized invitation
  const getWhatsAppInvitationLink = (guest: BukuTamu) => {
    const rawPhone = guest.no_whatsapp || '';
    let clean = rawPhone.replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    else if (!clean.startsWith('62')) clean = '62' + clean;

    const uniqueUrl = `${window.location.origin}/#/rsvp?code=${guest.ticket_code}`;
    const name = guest.nama_keluarga || guest.nama_tamu;
    const message = encodeURIComponent(
      `Assalamu'alaikum Wr. Wb. Halo ${name},\n\nKami mengundang Anda & Keluarga untuk hadir di hari bahagia pernikahan kami, Fikri & Nadya.\n\nSilakan buka tautan undangan unik Anda di bawah ini untuk konfirmasi kehadiran dan mendapatkan QR Code Tiket Kehadiran:\n${uniqueUrl}\n\nTerima kasih.`
    );
    return `https://wa.me/${clean}?text=${message}`;
  };

  // Calculations & Metrics
  const totalRegistered = guests.length;
  const totalPaxRegistered = guests.reduce((acc, g) => acc + (Number(g.jumlah_hadir_konfirmasi || g.jumlah_tamu) || 1), 0);
  const totalAttended = guests.filter((g) => g.is_attended).length;
  const totalPaxAttended = guests
    .filter((g) => g.is_attended)
    .reduce((acc, g) => acc + (Number(g.jumlah_hadir_konfirmasi || g.jumlah_tamu) || 1), 0);
  const totalPending = totalRegistered - totalAttended;
  const totalPaxPending = totalPaxRegistered - totalPaxAttended;
  const attendanceRate = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;

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

  return (
    <div className="space-y-8 animate-fade-in pb-12 font-sans">
      {/* TOP HEADER & ACTION BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gold-200/60 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-maroon/10 text-maroon text-xs font-bold tracking-widest uppercase mb-2">
            <Sparkles size={14} className="text-gold-600" />
            <span>Reception Desk & Check-in Portal</span>
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-maroon">
            Administrasi Buku Tamu &amp; Scan QR
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Daftarkan keluarga undangan, buat link unik, verifikasi QR kehadiran, dan serahkan souvenir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Add Guest Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-maroon hover:bg-maroon-800 text-gold border border-gold-400 font-bold text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus size={16} />
            <span>+ Tambah Undangan</span>
          </button>

          {/* Copy Public Link Button */}
          <button
            onClick={handleCopyPublicLink}
            className="flex items-center space-x-2 px-4 py-3 rounded-2xl bg-gold-50 hover:bg-gold-100 text-gold-900 border border-gold-300 font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            {copiedLink ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-gold-700" />}
            <span>{copiedLink ? 'Link Tersalin!' : 'Link RSVP Umum'}</span>
          </button>

          {/* Open Camera Scanner Button */}
          <button
            onClick={() => setIsScanning(!isScanning)}
            className={`flex items-center space-x-2 px-4 py-3 rounded-2xl font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer ${
              isScanning
                ? 'bg-rose-700 hover:bg-rose-800 text-white'
                : 'bg-stone-800 hover:bg-stone-900 text-stone-200'
            }`}
          >
            {isScanning ? <CameraOff size={16} /> : <Camera size={16} />}
            <span>{isScanning ? 'Tutup Scanner' : 'Buka Scanner'}</span>
          </button>

          {/* Refresh Data */}
          <button
            onClick={fetchGuests}
            className="p-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
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

        {/* Tamu VIP */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-amber-700 tracking-wider">Tamu VIP</span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Award size={18} className="text-amber-800" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-amber-900">{totalVip} <span className="text-xs font-normal text-stone-500">Undangan VIP</span></h3>
            <p className="text-xs text-amber-800 font-semibold mt-0.5">{vipAttended} Hadir di Acara</p>
          </div>
        </div>

        {/* Souvenir Diserahkan */}
        <div className="bg-white p-5 rounded-2xl border border-gold-200/70 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-maroon tracking-wider">Souvenir Diserahkan</span>
            <div className="w-9 h-9 rounded-xl bg-maroon/10 text-maroon flex items-center justify-center font-bold">
              <Gift size={18} className="text-maroon" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-maroon">{totalSouvenirsGiven} <span className="text-xs font-normal text-stone-500">/ {totalRegistered} Undangan</span></h3>
            <p className="text-xs text-stone-500 font-semibold mt-0.5">
              {totalRegistered > 0 ? Math.round((totalSouvenirsGiven / totalRegistered) * 100) : 0}% Souvenir Terbagi
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* GRAND VIEWPORT SCANNER MODAL                                    */}
      {/* ============================================================== */}
      {isScanning && (
        <div 
          onClick={() => setIsScanning(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 border border-gold-400/40 rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col relative max-h-[92vh]"
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
                    Arahkan barcode / QR Code tiket tamu tepat ke depan kamera
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
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

                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    soundEnabled
                      ? 'bg-amber-500/20 text-gold border-amber-500/40'
                      : 'bg-stone-800 text-stone-500 border-stone-700'
                  }`}
                  title={soundEnabled ? 'Matikan Suara Chime' : 'Nyalakan Suara Chime'}
                >
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsScanning(false)}
                  className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
                  title="Tutup Scanner (Esc)"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Large Camera Viewport (Full-Frame Scanning Without Restrictive Box) */}
            <div className="relative flex-1 bg-black flex items-center justify-center min-h-[440px] sm:min-h-[520px] md:h-[65vh] overflow-hidden">
              <div 
                id="guest-qr-reader" 
                className="w-full h-full flex items-center justify-center [&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover [&_video:not(:first-of-type)]:!hidden [&>div]:!w-full [&>div]:!h-full [&>div]:!border-none [&_*]:!border-none [&_#qr-shaded-region]:!hidden" 
              />

              {/* Full-Frame Scan Mode Badge */}
              <div className="absolute top-4 left-4 pointer-events-none z-10 flex items-center space-x-2 bg-black/65 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-gold/40 text-gold text-xs font-semibold shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Scan Seluruh Layar Aktif (Bebas Sudut)</span>
              </div>

              {/* In-Modal Scan Result Notification */}
              {scannedResult && (
                <div className="absolute inset-x-4 bottom-4 z-30 bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-amber-200 animate-fade-in text-gray-900">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start space-x-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          scannedResult.wasAlreadyAttended
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {scannedResult.wasAlreadyAttended ? (
                          <AlertCircle size={28} />
                        ) : (
                          <CheckCircle2 size={28} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                            {scannedResult.wasAlreadyAttended
                              ? 'Peringatan: Sudah Pernah Check-in'
                              : 'Check-in Berhasil Terverifikasi'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            scannedResult.guest.kategori_tamu === 'VIP'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-stone-100 text-stone-700'
                          }`}>
                            {scannedResult.guest.kategori_tamu === 'VIP' ? '★ VIP' : 'Reguler'}
                          </span>
                        </div>
                        <h4 className="font-serif text-xl font-bold text-gray-900 mt-0.5">
                          {scannedResult.guest.nama_keluarga || scannedResult.guest.nama_tamu}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                          <span className="font-mono bg-stone-100 px-2 py-0.5 rounded text-maroon font-bold">
                            {scannedResult.guest.ticket_code}
                          </span>
                          <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-bold">
                            {scannedResult.guest.pihak}
                          </span>
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                            Terkonfirmasi: {scannedResult.guest.jumlah_hadir_konfirmasi || scannedResult.guest.jumlah_tamu} Orang
                            {scannedResult.guest.jatah_tamu ? ` (Jatah: ${scannedResult.guest.jatah_tamu})` : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200">
                      {scannedResult.guest.is_souvenir_given ? (
                        <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center space-x-1.5 shadow-sm">
                          <PackageCheck size={16} className="text-emerald-600" />
                          <span>✓ Souvenir Diberikan</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleSouvenir(scannedResult.guest)}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                          title="Serahkan 1 souvenir per keluarga"
                        >
                          <Gift size={16} />
                          <span>Beri Souvenir</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setScannedResult(null)}
                        className="px-3.5 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Lanjut Scan
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-stone-900/95 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 text-stone-400">
                <Sparkles size={14} className="text-gold shrink-0" />
                <p>
                  Barcode dapat dideteksi di bagian mana saja pada kamera (jarak ideal <strong className="text-gold">15–25 cm</strong>).
                </p>
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
                  placeholder="Ketik Kode: FN-XXXXXX"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  className="px-3.5 py-2 text-xs bg-stone-800 border border-stone-700 rounded-xl text-stone-200 outline-none focus:border-gold font-mono uppercase w-full sm:w-44"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-maroon font-bold text-xs rounded-xl shadow transition-all shrink-0 cursor-pointer"
                >
                  Check-in
                </button>
              </form>
            </div>
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
              placeholder="Cari nama keluarga, WhatsApp, atau kode tiket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-maroon outline-none transition-all"
            />
          </div>

          {/* Status, Kategori, Souvenir & Pihak Filters */}
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === tab.key
                      ? 'bg-maroon text-gold shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Kategori Filter */}
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value as any)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:border-maroon"
            >
              <option value="all">Semua Kategori</option>
              <option value="VIP">★ Tamu VIP</option>
              <option value="Reguler">Tamu Reguler</option>
            </select>

            {/* Souvenir Filter */}
            <select
              value={filterSouvenir}
              onChange={(e) => setFilterSouvenir(e.target.value as any)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:border-maroon"
            >
              <option value="all">Semua Souvenir</option>
              <option value="given">✓ Sudah Diambil</option>
              <option value="pending">🎁 Belum Diambil</option>
            </select>

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
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#FAF7F2] text-maroon uppercase tracking-wider font-serif font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4">Kode Tiket</th>
                <th className="px-6 py-4">Nama Tamu / Keluarga</th>
                <th className="px-6 py-4 text-center">Kategori</th>
                <th className="px-6 py-4">Pihak</th>
                <th className="px-6 py-4 text-center">Pax (Hadir/Jatah)</th>
                <th className="px-6 py-4 text-center">Status Kehadiran</th>
                <th className="px-6 py-4 text-center">Souvenir</th>
                <th className="px-6 py-4 text-right">Aksi & Undangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    <div className="w-8 h-8 border-2 border-gold-300 border-t-maroon rounded-full animate-spin mx-auto mb-2" />
                    Memuat data buku tamu...
                  </td>
                </tr>
              ) : filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    Tidak ada data tamu yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredGuests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-amber-50/30 transition-colors">
                    {/* Kode Tiket */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-maroon bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200">
                        {guest.ticket_code}
                      </span>
                    </td>

                    {/* Nama Tamu / Keluarga */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <p className="font-bold text-gray-900 text-sm">
                          {guest.nama_divisi || guest.nama_keluarga || guest.nama_tamu}
                        </p>
                        {guest.is_divisi && (
                          <span className="px-2 py-0.5 rounded-md bg-maroon text-gold font-black text-[9px] uppercase tracking-wider">
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
                    <td className="px-6 py-4 text-center whitespace-nowrap">
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
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {guest.is_divisi ? (
                        <div>
                          <span className="font-bold text-gray-900 font-mono block">
                            {guest.pax_hadir || 0} / {guest.kuota_pax || guest.jumlah_tamu} Pax
                          </span>
                          <span className="text-[10px] text-amber-800 font-semibold block">
                            Sisa: {guest.sisa_kuota ?? Math.max(0, (guest.kuota_pax || guest.jumlah_tamu || 1) - (guest.pax_hadir || 0))} Pax
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-bold text-gray-900 block">
                            {guest.jumlah_hadir_konfirmasi || guest.jumlah_tamu} Orang
                          </span>
                          {guest.jatah_tamu && (
                            <span className="text-[10px] text-gray-400 font-normal block">
                              (Jatah: {guest.jatah_tamu})
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Status Kehadiran */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
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

                    {/* Status Souvenir (1 per undangan) */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
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
                          title="Serahkan 1 paket souvenir untuk keluarga ini"
                        >
                          <Gift size={13} className="text-amber-700" />
                          <span>Beri Souvenir</span>
                        </button>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Copy Unique Invitation Link */}
                        <button
                          onClick={() => handleCopyGuestUniqueLink(guest)}
                          className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                          title="Salin Link Undangan Unik Keluarga"
                        >
                          <Copy size={15} />
                        </button>

                        {/* WhatsApp Direct Share */}
                        {guest.no_whatsapp && (
                          <a
                            href={getWhatsAppInvitationLink(guest)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                            title="Kirim Undangan via WhatsApp"
                          >
                            <MessageCircle size={15} />
                          </a>
                        )}

                        {/* Toggle Attendance */}
                        <button
                          onClick={() => handleToggleAttendance(guest)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
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
                          className="p-1.5 rounded-lg bg-gold-50 text-gold-800 hover:bg-gold-100 transition-colors cursor-pointer"
                          title="Lihat Barcode & Tiket"
                        >
                          <QrCode size={15} />
                        </button>

                        {/* Delete - Hanya untuk Pengantin (Disembunyikan untuk Staff) */}
                        {!isStaff && (
                          <button
                            onClick={() => handleDeleteGuest(guest)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                            title="Hapus Data Tamu"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CHECK-IN SUCCESS / DUPLICATE NOTIFICATION (OUTSIDE CAMERA MODAL) */}
      {scannedResult && !isScanning && (
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

      {/* MODAL 2: PREVIEW BARCODE & DIGITAL PASS (DUAL BARCODE SYSTEM) */}
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
                className="w-60 h-60 mx-auto object-contain"
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
              <h3 className="font-serif text-lg font-bold text-gray-900 mt-1">{previewGuest.nama_tamu}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {previewGuest.pihak} • {previewGuest.jumlah_tamu} Pax • {previewGuest.kategori_tamu === 'VIP' ? '★ VIP' : 'Reguler'}
              </p>
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
                <span>{previewTab === 'souvenir' ? 'Klaim Souvenir' : 'Validasi / Check-in'}</span>
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
                <span>Tiket Tamu</span>
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

      {/* MODAL 3: TAMBAH TAMU UNDANGAN & JATAH TIKET */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Daftarkan Tamu Undangan & Jatah Tiket"
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleCreateGuest} className="space-y-5">
            {/* Nama Tamu / Keluarga */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
                Nama Tamu / Keluarga <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Keluarga Bpk. Ir. Hartono / dr. Tirta & Rekan"
                value={formData.nama_keluarga}
                onChange={(e) => setFormData({ ...formData, nama_keluarga: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 font-bold text-stone-800 text-xs outline-none focus:border-maroon shadow-sm"
              />
            </div>

            {/* Kategori Tamu (VIP / Reguler) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
                Kategori Undangan
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, kategori_tamu: 'VIP' })}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    formData.kategori_tamu === 'VIP'
                      ? 'bg-amber-100 border-amber-400 text-amber-950 shadow-sm ring-1 ring-amber-400'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Award size={15} className="text-amber-700" />
                  <span>★ Tamu VIP</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, kategori_tamu: 'Reguler' })}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    formData.kategori_tamu === 'Reguler'
                      ? 'bg-stone-200 border-stone-400 text-stone-900 shadow-sm ring-1 ring-stone-400'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Users size={15} className="text-stone-500" />
                  <span>Tamu Reguler</span>
                </button>
              </div>
            </div>

            {/* Jatah Tamu & Pihak (2 cols) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
                  Jatah Tamu (Maksimal Pax)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={formData.jatah_tamu}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setFormData({ ...formData, jatah_tamu: '' as any });
                        return;
                      }
                      const val = parseInt(raw, 10);
                      if (isNaN(val)) return;
                      setFormData({ ...formData, jatah_tamu: Math.min(30, Math.max(1, val)) });
                    }}
                    onBlur={() => {
                      if (!formData.jatah_tamu || Number(formData.jatah_tamu) < 1) {
                        setFormData({ ...formData, jatah_tamu: 1 });
                      } else if (Number(formData.jatah_tamu) > 30) {
                        setFormData({ ...formData, jatah_tamu: 30 });
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 font-bold text-stone-800 text-xs outline-none focus:border-maroon shadow-sm"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold">
                    Orang (Maks. 30)
                  </span>
                </div>
                {/* Quick Presets for Large Groups / Divisions */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {[2, 5, 10, 15, 20, 30].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormData({ ...formData, jatah_tamu: val })}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                        Number(formData.jatah_tamu) === val
                          ? 'bg-maroon text-gold border-gold'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {val === 30 ? '🏢 30 (1 Divisi)' : `${val} Pax`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
                  Pihak Pengundang
                </label>
                <select
                  value={formData.pihak}
                  onChange={(e) => setFormData({ ...formData, pihak: e.target.value as any })}
                  className="w-full px-3.5 py-3 rounded-xl border border-stone-300 font-bold text-stone-800 text-xs outline-none focus:border-maroon shadow-sm cursor-pointer"
                >
                  <option value="Pihak Fikri">Pihak Fikri (Pria)</option>
                  <option value="Pihak Nadya">Pihak Nadya (Wanita)</option>
                  <option value="Rekan Bersama">Rekan Bersama</option>
                </select>
              </div>
            </div>

            {/* Nomor WhatsApp */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
                Nomor WhatsApp (Opsional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                <input
                  type="text"
                  placeholder="0812xxxx atau 62812xxxx"
                  value={formData.no_whatsapp}
                  onChange={(e) => setFormData({ ...formData, no_whatsapp: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-300 font-mono font-bold text-stone-800 text-xs outline-none focus:border-maroon shadow-sm"
                />
              </div>
              <p className="text-[11px] text-stone-400">
                Untuk mengirim tautan undangan personal langsung ke WhatsApp tamu.
              </p>
            </div>

            {/* Information Banner */}
            <div className="p-3.5 bg-amber-50 rounded-xl border border-gold-200 text-xs text-amber-950 flex items-start space-x-2.5">
              <Sparkles size={16} className="text-gold shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Sistem akan membuat <strong>Link Undangan Unik</strong> dan <strong>QR Code Tiket</strong> otomatis untuk keluarga ini. Tamu dapat mengonfirmasi jumlah kehadiran saat membuka link.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-600 font-bold text-xs hover:bg-stone-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmittingGuest}
                className="px-5 py-2.5 rounded-xl bg-maroon hover:bg-maroon-800 text-gold font-bold text-xs uppercase tracking-wider shadow-md border border-gold/40 transition-all flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Save size={15} />
                <span>{isSubmittingGuest ? 'Menyimpan...' : 'Simpan & Buat Undangan'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default GuestAdministration;

