import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, ShieldAlert, LogOut, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface SessionTimeoutManagerProps {
  session: any;
  onLogout: (reason?: string) => Promise<void> | void;
}

// 40 Menit masa tidak aktif sebelum modal peringatan muncul
const INACTIVITY_LIMIT_MS = 40 * 60 * 1000; 
// 60 Detik hitung mundur peringatan sebelum logout otomatis
const COUNTDOWN_SECONDS = 60; 

const SessionTimeoutManager: React.FC<SessionTimeoutManagerProps> = ({ session, onLogout }) => {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const lastActivityRef = useRef<number>(Date.now());
  const throttleTimerRef = useRef<number>(0);

  // Fungsi untuk memperbarui timestamp aktivitas user
  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    // Throttle 1 detik agar tidak membebani performa
    if (now - throttleTimerRef.current > 1000) {
      throttleTimerRef.current = now;
      if (!showWarning) {
        lastActivityRef.current = now;
        try {
          localStorage.setItem('wedding_last_active', String(now));
        } catch (_) {}
      }
    }
  }, [showWarning]);

  // Pasang event listener deteksi aktivitas
  useEffect(() => {
    if (!session) return;

    // Inisialisasi awal timestamp aktivitas
    const storedLastActive = localStorage.getItem('wedding_last_active');
    const now = Date.now();
    if (storedLastActive && !isNaN(Number(storedLastActive))) {
      const diff = now - Number(storedLastActive);
      if (diff >= INACTIVITY_LIMIT_MS) {
        setShowWarning(true);
        setCountdown(COUNTDOWN_SECONDS);
      } else {
        lastActivityRef.current = Number(storedLastActive);
      }
    } else {
      localStorage.setItem('wedding_last_active', String(now));
      lastActivityRef.current = now;
    }

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'wheel',
      'click'
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
    };
  }, [session, handleUserActivity]);

  // Interval pengecekan inaktivitas & countdown timer
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;

      if (!showWarning) {
        if (elapsed >= INACTIVITY_LIMIT_MS) {
          setShowWarning(true);
          setCountdown(COUNTDOWN_SECONDS);
        }
      } else {
        // Modal sedang terbuka, kurangi detik countdown
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setShowWarning(false);
            onLogout('Sesi Anda telah berakhir karena tidak ada aktivitas selama 40 menit. Silakan login kembali.');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session, showWarning, onLogout]);

  // Aksi tombol "Tetap Masuk" (Perpanjang Sesi)
  const handleExtendSession = () => {
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem('wedding_last_active', String(now));
    } catch (_) {}
    setShowWarning(false);
    setCountdown(COUNTDOWN_SECONDS);
    toast.success('Sesi Anda berhasil diperpanjang. Selamat melanjutkan! ✨', {
      id: 'session-extended-toast',
      icon: '🛡️',
      style: { background: '#800000', color: '#D4AF37', border: '1px solid #D4AF37' }
    });
  };

  // Aksi tombol "Logout Sekarang"
  const handleImmediateLogout = () => {
    setShowWarning(false);
    onLogout('Anda telah logout dari portal.');
  };

  if (!showWarning || !session) return null;

  const progressPercent = Math.max(0, Math.min(100, (countdown / COUNTDOWN_SECONDS) * 100));

  return (
    <div className="fixed inset-0 z-[9999] bg-stone-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-white rounded-[2rem] max-w-md w-full shadow-2xl border-2 border-amber-300/80 overflow-hidden relative text-center transform transition-all animate-scale-up">
        {/* Top Decorative Bar */}
        <div className="bg-gradient-to-r from-maroon via-maroon-800 to-maroon p-5 text-white relative">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-gold-300/40 text-gold-200 text-[10px] font-bold uppercase tracking-widest">
            <ShieldAlert size={12} className="text-gold" />
            <span>Peringatan Keamanan Sesi</span>
          </div>
          <h3 className="text-xl font-serif font-bold text-white mt-2">
            Sesi Akan Segera Berakhir
          </h3>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Animated Warning Icon with Countdown Badge */}
          <div className="relative inline-flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-300 flex items-center justify-center text-amber-600 shadow-inner">
              <Clock size={36} className="animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full border-2 border-white shadow">
              !
            </span>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">
              Tidak ada pergerakan atau aktivitas selama <span className="text-maroon font-bold">40 Menit</span>.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
              Demi menjaga privasi dan keamanan data pernikahan Fikri & Nadya, sistem akan otomatis mengeluarkan akun Anda dalam:
            </p>
          </div>

          {/* Large Countdown Digital Clock & Bar */}
          <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-amber-200/80 space-y-2.5">
            <div className="text-3xl font-mono font-bold text-maroon tracking-wider">
              00:{countdown < 10 ? `0${countdown}` : countdown}
            </div>
            {/* Progress bar */}
            <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-red-600 h-full rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-stone-500 font-medium">
              Detik tersisa sebelum logout otomatis
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleExtendSession}
              type="button"
              className="w-full py-3.5 px-6 rounded-2xl bg-maroon hover:bg-maroon-800 text-gold font-bold text-sm tracking-wide shadow-lg shadow-maroon/20 hover:shadow-xl border border-gold/40 flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-[0.99]"
            >
              <CheckCircle2 size={16} />
              <span>Tetap Masuk (Perpanjang Sesi)</span>
            </button>

            <button
              onClick={handleImmediateLogout}
              type="button"
              className="w-full py-3 px-6 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs tracking-wider transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              <LogOut size={14} />
              <span>Logout Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutManager;
