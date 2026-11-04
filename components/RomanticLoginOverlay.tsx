import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, Flower2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface RomanticLoginOverlayProps {
  user: any;
  onComplete: () => void;
}

const RomanticLoginOverlay: React.FC<RomanticLoginOverlayProps> = ({ user, onComplete }) => {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('Mengikat Niat Suci...');
  const [subText, setSubText] = useState('Bismillahir-Rahmanir-Rahim');
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

  let personalGreeting = `Selamat Datang, ${userName} ❤️`;
  let personalQuote = "Menyatukan dua hati, dua doa, dan dua takdir dalam ridho-Nya.";

  if (isFikri) {
    personalGreeting = "Selamat Datang, Calon Imamku (Fikri) 💍";
    personalQuote = "Bismillah, bersamamu setiap langkah terasa begitu bermakna & menenangkan jiwa.";
  } else if (isNadya) {
    personalGreeting = "Selamat Datang, Bidadari Surgaku (Nadya) 🌸";
    personalQuote = "Setiap detik bersamamu adalah jawaban terindah dari setiap doa dalam sujudku.";
  } else if (isStaffOrResepsi) {
    personalGreeting = "Selamat Datang di Hari Bahagia Fikri & Nadya ✨";
    personalQuote = "Terima kasih telah menjadi bagian berharga dalam menyukseskan hari istimewa kami.";
  }

  useEffect(() => {
    // Stage 1: Inisiasi
    setProgress(20);
    setStatusText('Mengikat Niat Suci...');
    setSubText('Bismillahir-Rahmanir-Rahim');

    // Stage 2: Menyatukan Dua Hati (650ms)
    const timer1 = setTimeout(() => {
      setProgress(55);
      setStatusText('Menyatukan Dua Hati Menuju Ridho-Nya...');
      setSubText('Dua Hati, Satu Doa, Selamanya Bersamamu...');
    }, 650);

    // Stage 3: Pesan Cinta Personal (1400ms)
    const timer2 = setTimeout(() => {
      setProgress(85);
      setStatusText(personalGreeting);
      setSubText(personalQuote);
    }, 1400);

    // Stage 4: Membuka Mahligai Cinta (2150ms)
    const timer3 = setTimeout(() => {
      setProgress(100);
      setStatusText('Membuka Mahligai Cinta Fikri & Nadya... ❤️');
      setSubText('Selamat Datang di Ruang Bahagia Kita...');
    }, 2150);

    // Stage 5: Fade Out & Selesai (2750ms)
    const timer4 = setTimeout(() => {
      setIsExiting(true);
    }, 2750);

    // Complete transition (3050ms)
    const timer5 = setTimeout(() => {
      toast.success(personalGreeting, { id: 'login-toast', duration: 4000 });
      onComplete();
    }, 3050);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [personalGreeting, personalQuote, onComplete]);

  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(() => {
      toast.success(personalGreeting, { id: 'login-toast', duration: 3000 });
      onComplete();
    }, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-gradient-to-b from-[#180205] via-[#35040a] to-[#120103] backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center font-serif text-white overflow-hidden transition-opacity duration-300 select-none ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* FLOATING ROMANTIC HEARTS & ROSE PETALS (ANIMATED PARTICLES) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { left: '6%', delay: '0s', duration: '5.8s', size: 16, opacity: 'opacity-40' },
          { left: '14%', delay: '1.6s', duration: '6.5s', size: 22, opacity: 'opacity-60' },
          { left: '22%', delay: '0.4s', duration: '5.2s', size: 14, opacity: 'opacity-35' },
          { left: '32%', delay: '2.2s', duration: '6.2s', size: 26, opacity: 'opacity-50' },
          { left: '42%', delay: '1.0s', duration: '7.5s', size: 20, opacity: 'opacity-65' },
          { left: '50%', delay: '0.2s', duration: '5.6s', size: 18, opacity: 'opacity-40' },
          { left: '60%', delay: '1.8s', duration: '7.0s', size: 24, opacity: 'opacity-50' },
          { left: '70%', delay: '0.8s', duration: '5.4s', size: 15, opacity: 'opacity-35' },
          { left: '80%', delay: '2.5s', duration: '6.5s', size: 28, opacity: 'opacity-60' },
          { left: '88%', delay: '1.2s', duration: '6.8s', size: 18, opacity: 'opacity-45' },
          { left: '94%', delay: '3.0s', duration: '5.9s', size: 20, opacity: 'opacity-40' },
          { left: '10%', delay: '3.2s', duration: '7.2s', size: 22, opacity: 'opacity-50' }
        ].map((p, idx) => (
          <div
            key={idx}
            className={`absolute bottom-0 text-rose-400 ${p.opacity}`}
            style={{
              left: p.left,
              animation: `floatUpRomantic ${p.duration} ease-in-out infinite`,
              animationDelay: p.delay
            }}
          >
            {idx % 2 === 0 ? (
              <Heart size={p.size} className="fill-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.85)]" />
            ) : (
              <Flower2 size={p.size} className="text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.85)]" />
            )}
          </div>
        ))}
      </div>

      {/* SOFT GOLDEN BOKEH ORB BEHIND CENTERPIECE */}
      <div className="absolute w-[30rem] h-[30rem] bg-gradient-to-r from-rose-600/20 via-amber-500/25 to-maroon-700/30 rounded-full blur-[110px] pointer-events-none animate-pulse-aura" />

      {/* CENTERPIECE: DUAL INTERTWINED WEDDING RINGS & GLOWING BEATING HEART */}
      <div className="relative mb-7 z-10">
        {/* Pulsing Aura Circle */}
        <div className="absolute inset-0 -m-6 rounded-full bg-gold/15 blur-xl animate-pulse-aura" />

        {/* Glowing Golden Outer Ring */}
        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border-2 border-gold-300/40 animate-ring-glow flex items-center justify-center relative">
          
          {/* Rotating Ring Indicator with Sparkle */}
          <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-gold-300 animate-spin" style={{ animationDuration: '3.8s' }} />

          {/* Central Glowing Seal */}
          <div className="w-24 h-24 sm:w-30 sm:h-30 rounded-3xl bg-gradient-to-br from-[#7a0c17] via-[#94111f] to-[#55070e] border-2 border-gold flex flex-col items-center justify-center shadow-[0_0_35px_rgba(212,175,55,0.6)] transform hover:scale-105 transition-transform relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />
            
            {/* Monogram */}
            <span className="font-serif text-3xl sm:text-4xl font-black text-gold tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] relative z-10">
              FN
            </span>
            <span className="text-[8px] uppercase tracking-[0.3em] text-amber-200/90 font-bold relative z-10">
              Forever
            </span>
          </div>

          {/* Left Interlocking Ring: Fikri's Gold Band */}
          <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border-2 border-gold-400 bg-black/60 backdrop-blur-xs flex items-center justify-center shadow-lg transform -rotate-12">
            <span className="text-xs font-serif font-black text-gold">F</span>
          </div>

          {/* Right Interlocking Ring: Nadya's Diamond Band */}
          <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border-2 border-amber-300 bg-black/60 backdrop-blur-xs flex items-center justify-center shadow-lg transform rotate-12">
            <span className="text-xs font-serif font-black text-amber-200">N</span>
          </div>

          {/* Top Beating Heart Badge */}
          <div className="absolute -top-3.5 w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-maroon border border-gold flex items-center justify-center shadow-lg animate-heartbeat">
            <Heart size={16} className="text-white fill-white" />
          </div>

          {/* Bottom Sparkle Badge */}
          <div className="absolute -bottom-3 px-3.5 py-0.5 rounded-full bg-black/70 border border-gold/70 text-gold text-[9px] font-sans font-bold uppercase tracking-widest shadow-md flex items-center space-x-1.5">
            <Sparkles size={11} className="text-gold" />
            <span>Walimatul Ursy</span>
          </div>
        </div>
      </div>

      {/* ARABIC BLESSING / DOA SNIPPET */}
      <div className="mb-3 z-10 max-w-lg">
        <p className="font-serif text-base sm:text-lg text-amber-300/95 tracking-wide drop-shadow-sm select-none" dir="rtl">
          بَارَكَ اللَّهُ لَكَ وَبَارَكَ عَلَيْكَ وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ
        </p>
      </div>

      {/* DYNAMIC ROMANTIC HEADING & SWEET QUOTE */}
      <div className="space-y-2 max-w-lg z-10 min-h-[96px] flex flex-col justify-center">
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide drop-shadow-md transition-all duration-300">
          {statusText}
        </h2>
        <p className="text-xs sm:text-sm text-amber-200/90 font-serif italic tracking-wide leading-relaxed px-4 transition-all duration-300">
          "{subText}"
        </p>
      </div>

      {/* ROMANTIC PROGRESS BAR WITH GLOWING HEART POINTER */}
      <div className="w-80 max-w-xs mt-6 z-10 relative">
        <div className="w-full bg-black/50 rounded-full h-2.5 p-0.5 border border-gold/40 overflow-hidden shadow-inner backdrop-blur-sm">
          <div
            className="bg-gradient-to-r from-amber-400 via-rose-400 to-amber-300 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_15px_rgba(251,191,36,0.9)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Floating percentage and love note */}
        <div className="flex items-center justify-between text-[10px] font-sans font-semibold text-amber-200/80 mt-2 px-1">
          <span>Menuju Bahtera Bahagia</span>
          <span className="font-mono text-gold font-bold flex items-center space-x-1">
            <Heart size={10} className="fill-rose-400 text-rose-400 inline" />
            <span>{progress}%</span>
          </span>
        </div>
      </div>

      <p className="text-[10px] text-stone-400 font-sans mt-5 uppercase tracking-[0.3em] z-10">
        Fikri &amp; Nadya Wedding Celebration
      </p>

      {/* Subtle Skip button in corner */}
      <button
        onClick={handleSkip}
        className="absolute bottom-5 right-6 z-20 text-[11px] font-sans text-white/40 hover:text-white/80 transition-colors uppercase tracking-wider py-1 px-2.5 rounded-full border border-white/10 hover:border-white/30 backdrop-blur-xs"
      >
        Lewati &rarr;
      </button>
    </div>
  );
};

export default RomanticLoginOverlay;
