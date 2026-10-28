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

  // State untuk animasi transisi loading mewah menuju dashboard
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(15);
  const [transitionStatusText, setTransitionStatusText] = useState('Memverifikasi akun...');
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

      // Aktifkan animasi transisi loading mewah menuju dashboard
      setIsTransitioning(true);
      setTransitionProgress(35);
      setTransitionStatusText('Kredensial Terverifikasi...');

      const isResepsi = userEmail.toLowerCase().includes('resepsi') || 
                        userEmail.toLowerCase().includes('scanner') || 
                        userEmail.toLowerCase().includes('panitia');

      const targetPath = isResepsi ? '/scanner' : '/';

      // Tahap 2 animasi loading
      setTimeout(() => {
        setTransitionProgress(75);
        setTransitionStatusText(`Selamat Datang, ${resolvedName}! Mempersiapkan Portal...`);
      }, 450);

      // Tahap 3: Selesai & alihkan langsung ke dashboard tanpa perlu refresh manual
      setTimeout(() => {
        setTransitionProgress(100);
        setTransitionStatusText('Mengalihkan ke Dashboard...');
        toast.success(`Selamat datang, ${resolvedName}! ❤️`, { id: 'login-toast' });
        navigate(targetPath, { replace: true });
      }, 1050);

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

      {/* OVERLAY ANIMASI LOADING MEWAH MENUJU DASHBOARD */}
      {isTransitioning && (
        <div className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-fade-in font-serif">
          <div className="relative mb-8">
            {/* Spinning Gold Outer Ring */}
            <div className="w-28 h-28 border-4 border-gold-300/30 border-t-gold-400 rounded-full animate-spin shadow-2xl"></div>
            {/* Inner Glowing Monogram */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-maroon via-maroon-800 to-maroon-900 border border-gold/70 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                <span className="text-gold font-serif text-2xl font-bold tracking-widest drop-shadow">FN</span>
              </div>
            </div>
            {/* Beating Heart Badge */}
            <div className="absolute -bottom-2 right-2 w-7 h-7 rounded-full bg-maroon border border-gold flex items-center justify-center shadow-md animate-pulse">
              <Heart size={13} className="text-gold fill-gold" />
            </div>
          </div>

          {/* Heading Greetings */}
          <div className="space-y-2 max-w-md">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 border border-gold/30 text-gold-300 text-xs font-sans font-semibold tracking-wider">
              <Sparkles size={12} className="text-gold" />
              <span>Autentikasi Berhasil</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
              {authenticatedUserName ? `Selamat Datang, ${authenticatedUserName}` : 'Memuat Portal Fikri & Nadya'}
            </h2>
            <p className="text-xs sm:text-sm text-gold-200/80 font-sans font-normal tracking-wide animate-pulse">
              {transitionStatusText}
            </p>
          </div>

          {/* Luxury Progress Bar */}
          <div className="w-64 max-w-xs mt-6 bg-white/10 rounded-full h-2 p-0.5 border border-gold/30 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-gold-400 via-amber-300 to-gold-500 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(212,175,55,0.8)]"
              style={{ width: `${transitionProgress}%` }}
            />
          </div>

          <p className="text-[10px] text-stone-400 font-sans mt-4 uppercase tracking-[0.25em]">
            Menata Kebahagiaan Menuju Hari Bahagia
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
