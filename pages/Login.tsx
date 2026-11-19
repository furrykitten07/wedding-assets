import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, logActivity, setLoginInProgress } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';
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
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LoginProps {
  onLoginSuccess?: (session: any, user?: any) => void;
}

const leftContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

const rightContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 280,
      damping: 24,
    },
  },
};

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputsReady, setInputsReady] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [shakeTrigger, setShakeTrigger] = useState(0);

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

  const triggerFormShake = () => {
    setShakeTrigger((prev) => prev + 1);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      triggerFormShake();
      toast.error('Mohon masukkan username dan password');
      return;
    }

    setLoading(true);
    setLoginInProgress(true);

    try {
      const normalizedEmail = email.includes('@') ? email.trim() : `${email.trim()}@wedding.com`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) throw error;
      
      const userEmail = data.user?.email || '';

      // Dispatch event transisi loading romantis secara instan ke level aplikasi (App.tsx)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wedding_start_login_transition', {
          detail: { session: data.session, user: data.user }
        }));
      }

      // Update session pada state induk secara sinkron
      if (data.session && onLoginSuccess) {
        onLoginSuccess(data.session, data.user);
      }

      // Catat log aktivitas login di background
      logActivity(userEmail, 'login', 'Auth', 'User berhasil login ke sistem').catch(() => {});

    } catch (error: any) {
      setLoginInProgress(false);
      triggerFormShake();
      toast.error(error.message || 'Login gagal. Periksa kembali username & password.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f2] p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans selection:bg-maroon selection:text-gold">
      {/* Animated Ambient Background Glows */}
      <motion.div
        animate={{
          x: [0, 30, -15, 0],
          y: [0, -20, 25, 0],
          scale: [1, 1.08, 0.96, 1],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-40 -left-40 w-[34rem] h-[34rem] bg-rose-100/60 rounded-full blur-[130px] pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -35, 20, 0],
          y: [0, 25, -20, 0],
          scale: [1, 0.95, 1.1, 1],
        }}
        transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-40 -right-40 w-[38rem] h-[38rem] bg-amber-100/65 rounded-full blur-[140px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1, 1.06, 1],
          opacity: [0.35, 0.55, 0.35],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[46rem] h-[46rem] bg-gold-50/50 rounded-full blur-[160px] pointer-events-none"
      />

      {/* Subtle Pattern Texture */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none bg-[radial-gradient(#800000_1px,transparent_1px)] [background-size:24px_24px]"></div>

      {/* Main Container Card with Spring Entrance */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24, mass: 0.9 }}
        className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-[0_24px_70px_-15px_rgba(128,0,0,0.16)] border border-gold-200/60 overflow-hidden relative z-10 grid grid-cols-1 lg:grid-cols-12"
      >
        
        {/* Left Column: Rich Maroon Editorial Side */}
        <motion.div
          variants={leftContainerVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-5 bg-gradient-to-br from-[#800000] via-[#6d0505] to-[#4c0202] text-white p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden"
        >
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

          {/* Floating Golden Light Accent inside Maroon Panel */}
          <motion.div
            animate={{
              opacity: [0.12, 0.26, 0.12],
              scale: [1, 1.15, 1],
            }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-gold/25 blur-3xl pointer-events-none"
          />

          <div className="relative z-10">
            {/* Top Badge */}
            <motion.div
              variants={fadeUpItem}
              whileHover={{ scale: 1.04 }}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-gold-300/30 text-gold-200 text-[10px] font-bold uppercase tracking-[0.25em] cursor-default"
            >
              <motion.span
                animate={{ rotate: [0, 15, -10, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-flex"
              >
                <Sparkles size={12} className="text-gold" />
              </motion.span>
              <span>Private Wedding Portal</span>
            </motion.div>

            {/* Monogram Seal with Interactive Spring */}
            <motion.div variants={fadeUpItem} className="mt-8 mb-6">
              <motion.div
                whileHover={{ scale: 1.07, rotate: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 360, damping: 18 }}
                className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-gold-300/20 to-maroon-900/60 border-2 border-gold/70 shadow-2xl backdrop-blur-md cursor-pointer select-none"
              >
                {/* Soft Breathing Gold Halo */}
                <motion.div
                  animate={{ scale: [1, 1.16, 1], opacity: [0.35, 0, 0.35] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-3xl border border-gold/60 pointer-events-none"
                />
                <span className="font-serif text-3xl font-bold tracking-wider text-gold drop-shadow-md">FN</span>
                <motion.div
                  animate={{ scale: [1, 1.18, 1, 1.12, 1] }}
                  transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-maroon border border-gold flex items-center justify-center shadow-md"
                >
                  <Heart size={12} className="text-gold fill-gold" />
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Couple Names & Tagline */}
            <motion.h1
              variants={fadeUpItem}
              className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight leading-tight"
            >
              Fikri <span className="text-gold font-light">&</span> Nadya
            </motion.h1>
            <motion.p
              variants={fadeUpItem}
              className="mt-3 text-gold-200/80 text-xs sm:text-sm font-light leading-relaxed max-w-xs"
            >
              Satu portal terpadu untuk merajut setiap detail hari bahagia kita berdua.
            </motion.p>
          </div>

          {/* Bottom Romantic Quote */}
          <motion.div variants={fadeUpItem} className="mt-12 relative z-10 space-y-2">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{ originX: 0 }}
              className="h-px bg-gradient-to-r from-gold/40 via-white/15 to-transparent mb-6"
            />
            <div className="flex items-center space-x-1.5 text-gold-300 text-[11px] font-serif italic">
              <Flower2 size={13} className="text-gold shrink-0" />
              <span>"Menuju Sakinah, Mawaddah, Warahmah"</span>
            </div>
            <p className="text-[10px] text-white/50 font-medium uppercase tracking-[0.2em]">
              Bismillah • 2026 Management System
            </p>
          </motion.div>
        </motion.div>

        {/* Right Column: Clean Minimalist Secure Form */}
        <motion.div
          variants={rightContainerVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-7 p-8 sm:p-14 flex flex-col justify-center bg-white"
        >
          <motion.div
            key={shakeTrigger}
            animate={shakeTrigger > 0 ? { x: [0, -10, 10, -7, 7, -3, 3, 0] } : { x: 0 }}
            transition={{ duration: 0.42, ease: 'easeInOut' }}
            className="max-w-md mx-auto w-full"
          >
            
            {/* Header Form Title */}
            <motion.div variants={fadeUpItem} className="mb-9">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-maroon-900 tracking-tight">
                Selamat Datang Kembali
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mt-2 font-normal">
                Silakan ketikkan akun Anda untuk mengakses portal:
              </p>
            </motion.div>

            {/* Login Form with Anti-Autofill Protections */}
            <form onSubmit={handleLogin} autoComplete="off" className="space-y-6">
              
              {/* Dummy hidden inputs to divert Chromium aggressive autofill */}
              <input type="text" name="fake_wedding_user" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
              <input type="password" name="fake_wedding_pass" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

              {/* Username / Email Input */}
              <motion.div variants={fadeUpItem} className="space-y-2">
                <label 
                  htmlFor="wedding_auth_username_field" 
                  className="text-xs font-semibold text-gray-600 uppercase tracking-wider block ml-1"
                >
                  Username / Email
                </label>
                <motion.div
                  animate={{
                    scale: focusedField === 'email' ? 1.01 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className="relative group"
                >
                  <motion.div
                    animate={{
                      scale: focusedField === 'email' ? 1.12 : 1,
                      color: focusedField === 'email' ? '#800000' : '#9ca3af',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  >
                    <User size={18} />
                  </motion.div>
                  <input
                    id="wedding_auth_username_field"
                    name="wedding_auth_username_field"
                    type="text"
                    required
                    readOnly={!inputsReady}
                    onFocus={(e) => {
                      e.target.removeAttribute('readonly');
                      setFocusedField('email');
                    }}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Ketik username atau email"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50/70 hover:bg-white focus:bg-white border border-gray-200 rounded-2xl outline-none focus:border-maroon focus:ring-4 focus:ring-maroon/10 text-gray-900 font-medium text-sm transition-all shadow-inner placeholder:text-gray-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </motion.div>
              </motion.div>

              {/* Password Input */}
              <motion.div variants={fadeUpItem} className="space-y-2">
                <label 
                  htmlFor="wedding_auth_secret_field" 
                  className="text-xs font-semibold text-gray-600 uppercase tracking-wider block ml-1"
                >
                  Password
                </label>
                <motion.div
                  animate={{
                    scale: focusedField === 'password' ? 1.01 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className="relative group"
                >
                  <motion.div
                    animate={{
                      scale: focusedField === 'password' ? 1.12 : 1,
                      color: focusedField === 'password' ? '#800000' : '#9ca3af',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  >
                    <Lock size={18} />
                  </motion.div>
                  <input
                    id="wedding_auth_secret_field"
                    name="wedding_auth_secret_field"
                    type={showPassword ? 'text' : 'password'}
                    required
                    readOnly={!inputsReady}
                    onFocus={(e) => {
                      e.target.removeAttribute('readonly');
                      setFocusedField('password');
                    }}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Ketik password Anda"
                    autoComplete="new-password"
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-50/70 hover:bg-white focus:bg-white border border-gray-200 rounded-2xl outline-none focus:border-maroon focus:ring-4 focus:ring-maroon/10 text-gray-900 font-medium text-sm transition-all shadow-inner placeholder:text-gray-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.88 }}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-maroon transition-colors p-1 cursor-pointer"
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={showPassword ? 'hide' : 'show'}
                        initial={{ opacity: 0, scale: 0.7, rotate: -15 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.7, rotate: 15 }}
                        transition={{ duration: 0.16 }}
                        className="block"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>
                </motion.div>
              </motion.div>

              {/* Submit Button with Spring Physics & Sheen */}
              <motion.div variants={fadeUpItem}>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={loading ? {} : { scale: 1.015, y: -1 }}
                  whileTap={loading ? {} : { scale: 0.975, y: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                  className="relative overflow-hidden w-full mt-4 bg-maroon hover:bg-maroon-800 text-gold hover:text-white py-4 px-6 rounded-2xl font-bold text-sm tracking-wide shadow-lg shadow-maroon/20 hover:shadow-xl hover:shadow-maroon/30 border border-gold-400/40 hover:border-gold flex items-center justify-center space-x-2 transition-colors duration-300 disabled:opacity-60 group cursor-pointer"
                >
                  {/* Subtle Golden Shimmer Sweep on Hover */}
                  <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-gold/15 to-transparent" />

                  <AnimatePresence mode="wait" initial={false}>
                    {loading ? (
                      <motion.span
                        key="loading"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        className="relative z-10 flex items-center space-x-2"
                      >
                        <Loader2 size={18} className="animate-spin text-gold" />
                        <span>Memverifikasi & Menyiapkan Portal...</span>
                      </motion.span>
                    ) : (
                      <motion.span
                        key="idle"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        className="relative z-10 flex items-center space-x-2"
                      >
                        <span>Masuk ke Portal</span>
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform text-gold" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>
            </form>

            {/* Footer Security Status */}
            <motion.div
              variants={fadeUpItem}
              className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400"
            >
              <div className="flex items-center space-x-2 text-emerald-700 font-medium text-xs">
                <span className="relative flex h-2 w-2">
                  <motion.span
                    animate={{ scale: [1, 2.2, 1], opacity: [0.75, 0, 0.75] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
                  />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>Enkripsi Sesi Aktif</span>
              </div>
              <div className="flex items-center space-x-1.5 text-gray-400 text-xs">
                <ShieldCheck size={14} className="text-gold-600" />
                <span>Private & Encrypted</span>
              </div>
            </motion.div>

          </motion.div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default Login;
