import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, logActivity } from '../supabase';
import { 
  Heart, 
  Lock, 
  User, 
  Sparkles, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  Flower2,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LoginProps {
  onLoginSuccess?: (session: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputsReady, setInputsReady] = useState(false);

  // State untuk animasi transisi loading mewah & romantis menuju dashboard
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(15);
  const [transitionStatusText, setTransitionStatusText] = useState('Mengikat Niat Suci...');
  const [transitionSubText, setTransitionSubText] = useState('Bismillahir-Rahmanir-Rahim');
  const [authenticatedUserName, setAuthenticatedUserName] = useState('');

  const navigate = useNavigate();

  // Pengamanan Anti-Autofill: Pastikan field username dan password benar-benar kosong saat dimuat
  useEffect(() => {
    setEmail('');
    setPassword('');
    const timer = setTimeout(() => {
      setInputsReady(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Mohon masukkan username dan password');
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.includes('@') ? email.trim() : `${email.trim()}@wedding.com`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) throw error;
      
      const userEmail = data.user?.email || '';
      const resolvedName = data.user?.user_metadata?.name || data.user?.name || userEmail.split('@')[0];
      setAuthenticatedUserName(resolvedName);

      // Catat log aktivitas login
      await logActivity(userEmail, 'login', 'Auth', 'User berhasil login ke sistem');
      
      // Update session pada state induk secara sinkron
      if (data.session && onLoginSuccess) {
        onLoginSuccess(data.session);
      }

      // Deteksi identitas pengguna untuk pesan romantis personal
      const cleanEmail = userEmail.toLowerCase();
      const isFikri = cleanEmail.includes('fikri');
      const isNadya = cleanEmail.includes('nadya');
      const isStaffOrResepsi = 
        cleanEmail.includes('staff') ||
        cleanEmail.includes('resepsi') || 
        cleanEmail.includes('scanner') || 
        cleanEmail.includes('panitia') ||
        data.user?.role === 'staff' ||
        data.user?.role === 'resepsi' ||
        data.user?.user_metadata?.role === 'staff' ||
        data.user?.user_metadata?.role === 'resepsi';

      let personalGreeting = `Selamat Datang, ${resolvedName} ❤️`;
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

      const targetPath = isStaffOrResepsi ? '/scanner' : '/';

      // Aktifkan animasi transisi loading mewah & romantis menuju dashboard
      setIsTransitioning(true);
      setTransitionProgress(20);
      setTransitionStatusText('Mengikat Niat Suci...');
      setTransitionSubText('Bismillahir-Rahmanir-Rahim');

      // Tahap 2: Menyatukan Dua Hati (650ms)
      setTimeout(() => {
        setTransitionProgress(55);
        setTransitionStatusText('Menyatukan Dua Hati Menuju Ridho-Nya...');
        setTransitionSubText('Dua Hati, Satu Doa, Selamanya Bersamamu...');
      }, 650);

      // Tahap 3: Pesan Cinta Personal (1350ms)
      setTimeout(() => {
        setTransitionProgress(85);
        setTransitionStatusText(personalGreeting);
        setTransitionSubText(personalQuote);
      }, 1350);

      // Tahap 4: Membuka Mahligai Cinta (2050ms)
      setTimeout(() => {
        setTransitionProgress(100);
        setTransitionStatusText('Membuka Mahligai Cinta Fikri & Nadya...');
        setTransitionSubText('Menuju Ruang Bahagia Kita ❤️');
      }, 2050);

      // Tahap 5: Selesai & alihkan ke dashboard (2350ms)
      setTimeout(() => {
        toast.success(personalGreeting, { id: 'login-toast', duration: 4000 });
        navigate(targetPath, { replace: true });
      }, 2350);

    } catch (error: any) {
      toast.error(error.message || 'Login gagal. Periksa kembali username & password.');
      setLoading(false);
      setIsTransitioning(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f2] p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans selection:bg-maroon selection:text-gold">
      {/* Background Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-[34rem] h-[34rem] bg-rose-100/50 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-[38rem] h-[38rem] bg-amber-100/60 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[46rem] h-[46rem] bg-gold-50/40 rounded-full blur-[160px] pointer-events-none"></div>

      {/* Subtle Pattern Texture */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none bg-[radial-gradient(#800000_1px,transparent_1px)] [background-size:24px_24px]"></div>

      {/* OVERLAY ANIMASI LOADING ROMANTIS & SO-SWEET MENUJU DASHBOARD */}
      {isTransitioning && (
        <div className="fixed inset-0 z-[100] bg-gradient-to-b from-[#1b0205] via-[#36040a] to-[#120103] backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center animate-fade-in font-serif text-white overflow-hidden">
          
          {/* FLOATING ROMANTIC HEARTS & ROSE PETALS (ANIMATED PARTICLES) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[
              { left: '8%', delay: '0s', duration: '6s', size: 16, opacity: 'opacity-40' },
              { left: '16%', delay: '1.8s', duration: '7s', size: 22, opacity: 'opacity-60' },
              { left: '25%', delay: '0.6s', duration: '5.5s', size: 14, opacity: 'opacity-30' },
              { left: '35%', delay: '2.5s', duration: '6.5s', size: 26, opacity: 'opacity-50' },
              { left: '46%', delay: '1.2s', duration: '8s', size: 20, opacity: 'opacity-60' },
              { left: '55%', delay: '0.2s', duration: '6s', size: 18, opacity: 'opacity-40' },
              { left: '64%', delay: '2.1s', duration: '7.5s', size: 24, opacity: 'opacity-50' },
              { left: '74%', delay: '0.9s', duration: '5.8s', size: 15, opacity: 'opacity-35' },
              { left: '83%', delay: '2.8s', duration: '6.8s', size: 28, opacity: 'opacity-60' },
              { left: '92%', delay: '1.4s', duration: '7.2s', size: 18, opacity: 'opacity-45' },
              { left: '12%', delay: '3.5s', duration: '6.2s', size: 20, opacity: 'opacity-40' },
              { left: '88%', delay: '3.8s', duration: '7.8s', size: 22, opacity: 'opacity-50' }
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
                  <Heart size={p.size} className="fill-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                ) : (
                  <Flower2 size={p.size} className="text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.8)]" />
                )}
              </div>
            ))}
          </div>

          {/* SOFT GOLDEN BOKEH ORB BEHIND CENTERPIECE */}
          <div className="absolute w-96 h-96 bg-gradient-to-r from-rose-600/20 via-amber-500/25 to-maroon-700/30 rounded-full blur-[100px] pointer-events-none animate-pulse-aura" />

          {/* CENTERPIECE: DUAL INTERTWINED WEDDING RINGS & GLOWING BEATING HEART */}
          <div className="relative mb-8 z-10">
            {/* Pulsing Aura Circle */}
            <div className="absolute inset-0 -m-6 rounded-full bg-gold/15 blur-xl animate-pulse-aura" />

            {/* Glowing Golden Outer Ring */}
            <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-full border-2 border-gold-300/40 animate-ring-glow flex items-center justify-center relative">
              
              {/* Rotating Ring Indicator with Sparkle */}
              <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-gold-300 animate-spin" style={{ animationDuration: '4s' }} />

              {/* Central Glowing Seal */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-[#7a0c17] via-[#94111f] to-[#55070e] border-2 border-gold flex flex-col items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.5)] transform hover:scale-105 transition-transform relative overflow-hidden">
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
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-2 border-gold-400 bg-black/50 backdrop-blur-xs flex items-center justify-center shadow-lg transform -rotate-12">
                <span className="text-[10px] font-serif font-black text-gold">F</span>
              </div>

              {/* Right Interlocking Ring: Nadya's Diamond Band */}
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-2 border-amber-300 bg-black/50 backdrop-blur-xs flex items-center justify-center shadow-lg transform rotate-12">
                <span className="text-[10px] font-serif font-black text-amber-200">N</span>
              </div>

              {/* Top Beating Heart Badge */}
              <div className="absolute -top-3 w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-maroon border border-gold flex items-center justify-center shadow-lg animate-heartbeat">
                <Heart size={15} className="text-white fill-white" />
              </div>

              {/* Bottom Sparkle Badge */}
              <div className="absolute -bottom-2.5 px-3 py-0.5 rounded-full bg-black/60 border border-gold/60 text-gold text-[9px] font-sans font-bold uppercase tracking-widest shadow-md flex items-center space-x-1">
                <Sparkles size={10} className="text-gold" />
                <span>Walimatul Ursy</span>
              </div>
            </div>
          </div>

          {/* ARABIC BLESSING / DOA SNIPPET */}
          <div className="mb-3 z-10 max-w-lg">
            <p className="font-serif text-sm sm:text-base text-amber-300/90 tracking-wide drop-shadow-sm select-none" dir="rtl">
              بَارَكَ اللَّهُ لَكَ وَبَارَكَ عَلَيْكَ وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ
            </p>
          </div>

          {/* DYNAMIC ROMANTIC HEADING & SWEET QUOTE */}
          <div className="space-y-2 max-w-lg z-10 min-h-[90px] flex flex-col justify-center">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide drop-shadow-md transition-all duration-300">
              {transitionStatusText}
            </h2>
            <p className="text-xs sm:text-sm text-amber-200/90 font-serif italic tracking-wide leading-relaxed px-4 transition-all duration-300">
              "{transitionSubText}"
            </p>
          </div>

          {/* ROMANTIC PROGRESS BAR WITH GLOWING HEART POINTER */}
          <div className="w-72 max-w-xs mt-6 z-10 relative">
            <div className="w-full bg-black/40 rounded-full h-2.5 p-0.5 border border-gold/40 overflow-hidden shadow-inner backdrop-blur-sm">
              <div
                className="bg-gradient-to-r from-amber-400 via-rose-400 to-amber-300 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_15px_rgba(251,191,36,0.9)]"
                style={{ width: `${transitionProgress}%` }}
              />
            </div>
            
            {/* Floating percentage and love note */}
            <div className="flex items-center justify-between text-[10px] font-sans font-semibold text-amber-200/80 mt-2 px-1">
              <span>Menuju Bahtera Bahagia</span>
              <span className="font-mono text-gold font-bold flex items-center space-x-1">
                <Heart size={10} className="fill-rose-400 text-rose-400 inline" />
                <span>{transitionProgress}%</span>
              </span>
            </div>
          </div>

          <p className="text-[10px] text-stone-400 font-sans mt-5 uppercase tracking-[0.3em] z-10">
            Fikri &amp; Nadya Wedding Celebration
          </p>
        </div>
      )}

      {/* Main Container Card */}
      <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(128,0,0,0.12)] border border-gold-200/50 overflow-hidden relative z-10 transition-all grid grid-cols-1 lg:grid-cols-12 animate-fade-in">
        
        {/* Left Column: Rich Maroon Editorial Side */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#800000] via-[#6d0505] to-[#4c0202] text-white p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Arabesque Pattern Overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg width="100%" height="100%">
              <pattern id="lux-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 40L40 0M-10 10L10 -10M30 50L50 30" stroke="#D4AF37" strokeWidth="1.2" fill="none"/>
                <circle cx="20" cy="20" r="3" fill="#D4AF37" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#lux-pattern)"/>
            </svg>
          </div>

          <div className="relative z-10">
            {/* Top Badge */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-gold-300/30 text-gold-200 text-[10px] font-bold uppercase tracking-[0.25em]">
              <Sparkles size={12} className="text-gold" />
              <span>Private Wedding Portal</span>
            </div>

            {/* Monogram Seal */}
            <div className="mt-8 mb-6">
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-gold-300/20 to-maroon-900/60 border-2 border-gold/70 shadow-2xl backdrop-blur-md">
                <span className="font-serif text-3xl font-bold tracking-wider text-gold drop-shadow-md">FN</span>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-maroon border border-gold flex items-center justify-center">
                  <Heart size={12} className="text-gold fill-gold" />
                </div>
              </div>
            </div>

            {/* Couple Names & Tagline */}
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight leading-tight">
              Fikri <span className="text-gold font-light">&</span> Nadya
            </h1>
            <p className="mt-3 text-gold-200/80 text-xs sm:text-sm font-light leading-relaxed max-w-xs">
              Satu portal terpadu untuk merajut setiap detail hari bahagia kita berdua.
            </p>
          </div>

          {/* Bottom Romantic Quote */}
          <div className="mt-12 pt-6 border-t border-white/10 relative z-10 space-y-2">
            <div className="flex items-center space-x-1.5 text-gold-300 text-[11px] font-serif italic">
              <Flower2 size={13} className="text-gold shrink-0" />
              <span>"Menuju Sakinah, Mawaddah, Warahmah"</span>
            </div>
            <p className="text-[10px] text-white/50 font-medium uppercase tracking-[0.2em]">
              Bismillah • 2026 Management System
            </p>
          </div>
        </div>

        {/* Right Column: Clean Minimalist Secure Form */}
        <div className="lg:col-span-7 p-8 sm:p-14 flex flex-col justify-center bg-white">
          <div className="max-w-md mx-auto w-full">
            
            {/* Header Form Title */}
            <div className="mb-9">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-maroon-900 tracking-tight">
                Selamat Datang Kembali
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mt-2 font-normal">
                Silakan ketikkan akun Anda untuk mengakses portal:
              </p>
            </div>

            {/* Login Form with Anti-Autofill Protections */}
            <form onSubmit={handleLogin} autoComplete="off" className="space-y-6">
              
              {/* Dummy hidden inputs to divert Chromium aggressive autofill */}
              <input type="text" name="fake_wedding_user" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
              <input type="password" name="fake_wedding_pass" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

              {/* Username / Email Input */}
              <div className="space-y-2">
                <label 
                  htmlFor="wedding_auth_username_field" 
                  className="text-xs font-semibold text-gray-600 uppercase tracking-wider block ml-1"
                >
                  Username / Email
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-maroon transition-colors pointer-events-none">
                    <User size={18} />
                  </div>
                  <input
                    id="wedding_auth_username_field"
                    name="wedding_auth_username_field"
                    type="text"
                    required
                    readOnly={!inputsReady}
                    onFocus={(e) => e.target.removeAttribute('readonly')}
                    placeholder="Ketik username atau email"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50/70 hover:bg-white focus:bg-white border border-gray-200 rounded-2xl outline-none focus:border-maroon focus:ring-4 focus:ring-maroon/10 text-gray-900 font-medium text-sm transition-all shadow-inner placeholder:text-gray-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label 
                  htmlFor="wedding_auth_secret_field" 
                  className="text-xs font-semibold text-gray-600 uppercase tracking-wider block ml-1"
                >
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-maroon transition-colors pointer-events-none">
                    <Lock size={18} />
                  </div>
                  <input
                    id="wedding_auth_secret_field"
                    name="wedding_auth_secret_field"
                    type={showPassword ? 'text' : 'password'}
                    required
                    readOnly={!inputsReady}
                    onFocus={(e) => e.target.removeAttribute('readonly')}
                    placeholder="Ketik password Anda"
                    autoComplete="new-password"
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-50/70 hover:bg-white focus:bg-white border border-gray-200 rounded-2xl outline-none focus:border-maroon focus:ring-4 focus:ring-maroon/10 text-gray-900 font-medium text-sm transition-all shadow-inner placeholder:text-gray-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-maroon transition-colors p-1 cursor-pointer"
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Button with Loading Indicator */}
              <button
                type="submit"
                disabled={loading || isTransitioning}
                className="w-full mt-4 bg-maroon hover:bg-maroon-800 text-gold hover:text-white py-4 px-6 rounded-2xl font-bold text-sm tracking-wide shadow-lg shadow-maroon/20 hover:shadow-xl hover:shadow-maroon/30 border border-gold-400/40 hover:border-gold flex items-center justify-center space-x-2 transition-all duration-300 active:scale-[0.99] disabled:opacity-60 group cursor-pointer"
              >
                {loading || isTransitioning ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-gold" />
                    <span>Memverifikasi & Menyiapkan Portal...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Portal</span>
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform text-gold" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Security Status */}
            <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center space-x-2 text-emerald-700 font-medium text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Enkripsi Sesi Aktif</span>
              </div>
              <div className="flex items-center space-x-1.5 text-gray-400 text-xs">
                <ShieldCheck size={14} className="text-gold-600" />
                <span>Private & Encrypted</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
