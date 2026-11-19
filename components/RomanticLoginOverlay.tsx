import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

interface RomanticLoginOverlayProps {
  user: any;
  onComplete: () => void;
}

const STAGES = [
  { key: 'niat', label: 'Niat' },
  { key: 'doa', label: 'Doa' },
  { key: 'sambutan', label: 'Sambutan' },
  { key: 'portal', label: 'Portal' },
];

const RomanticLoginOverlay: React.FC<RomanticLoginOverlayProps> = ({ user, onComplete }) => {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(12);
  const [isExiting, setIsExiting] = useState(false);

  // Deteksi identitas pengguna untuk pesan romantis personal
  const userEmail = (user?.email || '').toLowerCase();
  const userName = user?.user_metadata?.name || user?.name || userEmail.split('@')[0] || 'Keluarga Bahagia';

  const isFikri = userEmail.includes('fikri');
  const isNadya = userEmail.includes('nadya');
  const isStaffOrResepsi =
    userEmail.includes('staff') ||
    userEmail.includes('resepsi') ||
    userEmail.includes('scanner') ||
    userEmail.includes('panitia') ||
    user?.role === 'staff' ||
    user?.role === 'resepsi' ||
    user?.user_metadata?.role === 'staff' ||
    user?.user_metadata?.role === 'resepsi';

  const { personalGreeting, personalQuote, roleBadge } = useMemo(() => {
    if (isFikri) {
      return {
        personalGreeting: 'Selamat Datang, Calon Imamku',
        personalQuote: 'Bismillah, bersamamu setiap langkah terasa begitu bermakna & menenangkan jiwa.',
        roleBadge: 'GROOM • FIKRI',
      };
    }
    if (isNadya) {
      return {
        personalGreeting: 'Selamat Datang, Bidadari Surgaku',
        personalQuote: 'Setiap detik bersamamu adalah jawaban terindah dari setiap doa dalam sujudku.',
        roleBadge: 'BRIDE • NADYA',
      };
    }
    if (isStaffOrResepsi) {
      return {
        personalGreeting: 'Selamat Datang di Hari Bahagia',
        personalQuote: 'Terima kasih telah menjadi bagian berharga dalam menyukseskan hari istimewa Fikri & Nadya.',
        roleBadge: 'RECEPTION TEAM',
      };
    }
    return {
      personalGreeting: `Selamat Datang, ${userName}`,
      personalQuote: 'Menyatukan dua hati, dua doa, dan dua takdir dalam ridho-Nya.',
      roleBadge: 'PRIVATE PORTAL',
    };
  }, [isFikri, isNadya, isStaffOrResepsi, userName]);

  const stageContent = useMemo(
    () => [
      {
        title: 'Mengikat Niat Suci',
        subtitle: 'Bismillahir-Rahmanir-Rahim — memulai langkah penuh berkah.',
      },
      {
        title: 'Menyatukan Dua Hati',
        subtitle: 'Dua hati, satu doa, melangkah bersama menuju ridho-Nya.',
      },
      {
        title: personalGreeting,
        subtitle: personalQuote,
      },
      {
        title: 'Membuka Portal Bahagia',
        subtitle: 'Menyiapkan ruang kerja & kendali pernikahan Fikri & Nadya...',
      },
    ],
    [personalGreeting, personalQuote]
  );

  // Partikel cahaya emas lembut (stabil lewat useMemo agar tidak reset saat re-render)
  const goldenDust = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: `${6 + ((i * 5.3) % 88)}%`,
        top: `${12 + ((i * 17.7) % 78)}%`,
        size: 2 + (i % 3) * 1.5,
        duration: 4.5 + (i % 5) * 1.1,
        delay: (i % 6) * 0.4,
        driftX: i % 2 === 0 ? 16 : -16,
      })),
    []
  );

  useEffect(() => {
    // Stage 1 (0ms)
    setStageIndex(0);
    setProgress(22);

    // Stage 2 (680ms)
    const t1 = setTimeout(() => {
      setStageIndex(1);
      setProgress(52);
    }, 680);

    // Stage 3 (1420ms)
    const t2 = setTimeout(() => {
      setStageIndex(2);
      setProgress(82);
    }, 1420);

    // Stage 4 (2250ms)
    const t3 = setTimeout(() => {
      setStageIndex(3);
      setProgress(100);
    }, 2250);

    // Trigger exit choreography (2850ms)
    const t4 = setTimeout(() => {
      setIsExiting(true);
    }, 2850);

    // Complete & unmount (3250ms)
    const t5 = setTimeout(() => {
      toast.success(personalGreeting, { id: 'login-toast', duration: 4000 });
      onComplete();
    }, 3250);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [personalGreeting, onComplete]);

  const handleSkip = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      toast.success(personalGreeting, { id: 'login-toast', duration: 3000 });
      onComplete();
    }, 320);
  };

  const currentStage = stageContent[stageIndex] || stageContent[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={
        isExiting
          ? { opacity: 0, scale: 1.04, filter: 'blur(10px)' }
          : { opacity: 1, scale: 1, filter: 'blur(0px)' }
      }
      transition={{ duration: isExiting ? 0.38 : 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-0 z-[99999] bg-[#140204] flex flex-col items-center justify-center p-6 text-center font-serif text-white overflow-hidden select-none ${
        isExiting ? 'pointer-events-none' : ''
      }`}
    >
      {/* LAYER 1: Royal Velvet Radial Gradient & Organic Breathing Auras */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#3b060d_0%,_#1d0206_52%,_#0d0102_100%)] pointer-events-none" />

      <motion.div
        animate={{
          scale: [1, 1.15, 0.96, 1],
          opacity: [0.28, 0.46, 0.28],
          x: [0, 24, -18, 0],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute w-[34rem] h-[34rem] rounded-full bg-gradient-to-tr from-[#800000]/40 via-[#d4af37]/20 to-rose-500/20 blur-[120px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1.05, 0.92, 1.12, 1.05],
          opacity: [0.16, 0.3, 0.16],
          y: [0, -28, 18, 0],
        }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute w-[24rem] h-[24rem] rounded-full bg-amber-300/15 blur-[100px] pointer-events-none"
      />

      {/* Subtle Luxury Dot Texture */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:28px_28px]" />

      {/* LAYER 2: Animated Corner Filigree Frame Lines */}
      <div className="absolute inset-5 sm:inset-8 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="w-full h-full border border-gold/15 rounded-[2rem] relative"
        >
          {/* Corner Accent Dots */}
          <span className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-gold/60" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-gold/60" />
          <span className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-gold/60" />
          <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-gold/60" />
        </motion.div>
      </div>

      {/* LAYER 3: Ethereal Floating Champagne Gold Stardust */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {goldenDust.map((dot) => (
          <motion.span
            key={dot.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: [0, 0.75, 0],
              y: [20, -70],
              x: [0, dot.driftX, 0],
              scale: [0.6, 1.2, 0.6],
            }}
            transition={{
              duration: dot.duration,
              delay: dot.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              left: dot.left,
              top: dot.top,
              width: dot.size,
              height: dot.size,
            }}
            className="absolute rounded-full bg-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.9)]"
          />
        ))}
      </div>

      {/* LAYER 4: Main Content Stack */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-lg">
        {/* Top Role / Ceremony Pill */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.05 }}
          className="mb-7 inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-gold/30 backdrop-blur-md shadow-[0_0_24px_rgba(212,175,55,0.12)]"
        >
          <Sparkles size={12} className="text-gold" />
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.28em] text-amber-200/90">
            {roleBadge}
          </span>
        </motion.div>

        {/* CENTERPIECE: Bespoke SVG Animated Golden Crest + Monogram */}
        <motion.div
          initial={{ opacity: 0, scale: 0.82 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.1 }}
          className="relative mb-8 flex items-center justify-center"
        >
          {/* Breathing Halo */}
          <motion.div
            animate={{ scale: [1, 1.18, 1], opacity: [0.22, 0.45, 0.22] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-44 h-44 rounded-full bg-gold/20 blur-2xl pointer-events-none"
          />

          {/* Outer Orbiting Ring with Golden Star Node */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center"
          >
            <svg viewBox="0 0 180 180" className="w-full h-full">
              {/* Outer Dashed Celestial Orbit */}
              <circle
                cx="90"
                cy="90"
                r="84"
                fill="none"
                stroke="rgba(212,175,55,0.28)"
                strokeWidth="1"
                strokeDasharray="3 6"
              />
              {/* Animated Drawing Gold Arc */}
              <motion.circle
                cx="90"
                cy="90"
                r="76"
                fill="none"
                stroke="url(#goldCrestGrad)"
                strokeWidth="1.8"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0.3 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
              />
              <defs>
                <linearGradient id="goldCrestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FDE68A" />
                  <stop offset="50%" stopColor="#D4AF37" />
                  <stop offset="100%" stopColor="#B45309" />
                </linearGradient>
              </defs>
            </svg>
            {/* Glowing Orbit Star */}
            <span className="absolute top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-amber-200 shadow-[0_0_14px_rgba(253,230,138,1)]" />
          </motion.div>

          {/* Counter-Rotating Inner Fine Ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
            className="absolute w-32 h-32 sm:w-36 sm:h-36 rounded-full border border-gold/25 pointer-events-none"
          />

          {/* Central Floating Monogram Medallion */}
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-[1.75rem] bg-gradient-to-br from-[#7c0b16] via-[#53050d] to-[#2d0207] border border-gold/70 shadow-[0_12px_40px_rgba(212,175,55,0.35),inset_0_1px_1px_rgba(255,255,255,0.25)] flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Animated Metallic Sheen Sweep */}
            <motion.div
              animate={{ x: ['-140%', '160%'] }}
              transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1.8, ease: 'easeInOut' }}
              className="absolute inset-0 w-1/2 skew-x-[-20deg] bg-gradient-to-r from-transparent via-amber-200/25 to-transparent pointer-events-none"
            />
            <span className="font-serif text-3xl sm:text-4xl font-bold tracking-[0.14em] bg-gradient-to-b from-amber-100 via-gold to-amber-500 bg-clip-text text-transparent drop-shadow-sm relative z-10">
              FN
            </span>
            <div className="flex items-center space-x-1 mt-0.5 relative z-10">
              <span className="w-3 h-px bg-gold/60" />
              <Heart size={8} className="text-rose-300 fill-rose-300" />
              <span className="w-3 h-px bg-gold/60" />
            </div>
          </motion.div>
        </motion.div>

        {/* Arabic Blessing with Blur-to-Sharp Reveal */}
        <motion.p
          initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-serif text-sm sm:text-base text-amber-200/90 tracking-wide drop-shadow-sm mb-4"
          dir="rtl"
        >
          بَارَكَ اللَّهُ لَكَ وَبَارَكَ عَلَيْكَ وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ
        </motion.p>

        {/* Animated Stage Title & Subtitle via AnimatePresence */}
        <div className="min-h-[96px] flex flex-col items-center justify-center w-full px-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={stageIndex}
              initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="space-y-2"
            >
              <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight bg-gradient-to-r from-white via-amber-100 to-white bg-clip-text text-transparent">
                {currentStage.title}
              </h2>
              <p className="text-xs sm:text-sm text-amber-100/75 font-serif italic leading-relaxed max-w-md mx-auto">
                &ldquo;{currentStage.subtitle}&rdquo;
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Modern Minimalist Progress Track + Stage Indicator Pills */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.5 }}
          className="w-full max-w-xs mt-7 space-y-3"
        >
          {/* Sleek Progress Track */}
          <div className="relative h-1.5 w-full rounded-full bg-white/10 overflow-hidden border border-gold/20">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 75, damping: 18 }}
              className="relative h-full rounded-full bg-gradient-to-r from-amber-500 via-gold to-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.9)]"
            >
              {/* Bright Glowing Tip */}
              <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,1)]" />
            </motion.div>
          </div>

          {/* Stage Dots & Live Percentage */}
          <div className="flex items-center justify-between text-[10px] font-sans">
            <div className="flex items-center space-x-1.5">
              {STAGES.map((st, idx) => {
                const isActive = idx === stageIndex;
                const isPassed = idx < stageIndex;
                return (
                  <div key={st.key} className="relative flex items-center">
                    <motion.span
                      layout
                      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                      className={`h-1.5 rounded-full transition-colors ${
                        isActive
                          ? 'w-5 bg-gold shadow-[0_0_8px_rgba(212,175,55,0.9)]'
                          : isPassed
                          ? 'w-1.5 bg-amber-300/80'
                          : 'w-1.5 bg-white/20'
                      }`}
                    />
                  </div>
                );
              })}
              <span className="ml-2 text-amber-200/70 tracking-wider uppercase font-medium">
                {STAGES[stageIndex]?.label}
              </span>
            </div>

            <span className="font-mono font-bold text-gold tabular-nums tracking-wider">
              {progress}%
            </span>
          </div>
        </motion.div>

        {/* Bottom Editorial Signature */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="text-[10px] text-amber-100 font-sans mt-8 uppercase tracking-[0.34em]"
        >
          Fikri &amp; Nadya • Walimatul Ursy
        </motion.p>
      </div>

      {/* Tactile Skip Button */}
      <motion.button
        type="button"
        onClick={handleSkip}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.12)' }}
        whileTap={{ scale: 0.95 }}
        className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-20 inline-flex items-center space-x-1.5 text-[11px] font-sans font-medium text-amber-100/70 hover:text-white uppercase tracking-[0.2em] py-2 px-4 rounded-full border border-gold/25 hover:border-gold/60 bg-white/[0.04] backdrop-blur-md transition-colors cursor-pointer"
      >
        <span>Lewati</span>
        <ArrowRight size={13} className="text-gold" />
      </motion.button>
    </motion.div>
  );
};

export default RomanticLoginOverlay;
