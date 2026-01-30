
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, logActivity } from '../supabase';
import { Heart, Mail, Lock, Sparkles, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.includes('@') ? email : `${email}@wedding.com`,
        password,
      });

      if (error) throw error;
      
      const userEmail = data.user?.email || '';
      await logActivity(userEmail, 'login', 'Auth', 'User berhasil login ke sistem');
      
      toast.success(`Selamat datang, ${userEmail.split('@')[0]}!`);
      
      // Explicitly navigate to the dashboard root
      navigate('/', { replace: true });
    } catch (error: any) {
      toast.error(error.message || 'Login gagal. Periksa kembali email & password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-maroon-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gold-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-700"></div>

      <div className="max-w-md w-full animate-fade-in relative z-10">
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gold-100">
          <div className="bg-maroon p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <svg width="100%" height="100%"><pattern id="pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 40L40 0M-10 10L10 -10M30 50L50 30" stroke="white" strokeWidth="1" fill="none"/></pattern><rect width="100%" height="100%" fill="url(#pattern)"/></svg>
            </div>
            
            <div className="inline-flex p-4 bg-white/10 rounded-2xl backdrop-blur-md mb-6">
              <Heart className="text-gold fill-gold" size={32} />
            </div>
            <h1 className="text-3xl font-serif font-bold text-white mb-2">Fikri & Nadya</h1>
            <p className="text-gold-200 text-xs font-semibold uppercase tracking-[0.3em]">Wedding Management</p>
          </div>

          <form onSubmit={handleLogin} className="p-10 space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Username / Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-maroon transition-colors" size={18} />
                  <input
                    type="text"
                    required
                    placeholder="fikri / nadya"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-maroon/5 focus:border-maroon outline-none transition-all text-maroon-900 font-semibold placeholder:text-gray-300"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-maroon transition-colors" size={18} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-maroon/5 focus:border-maroon outline-none transition-all text-maroon-900 font-semibold placeholder:text-gray-300"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-maroon text-gold hover:bg-maroon-800 py-4 rounded-2xl font-bold shadow-xl shadow-maroon/20 flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50 group"
            >
              <span>{loading ? 'Masuk ke Sistem...' : 'Masuk ke Portal'}</span>
              {!loading && <ChevronRight className="group-hover:translate-x-1 transition-transform" size={18} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
