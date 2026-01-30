

import { createClient } from '@supabase/supabase-js';

// Di Vite, kita harus menggunakan import.meta.env, bukan process.env
// Fix: Use type casting to any to allow access to Vite-injected .env property on import.meta
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL atau Anon Key tidak ditemukan! Pastikan sudah setting di Vercel Environment Variables dengan prefix VITE_");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

/**
 * Fungsi untuk mencatat aktivitas ke database Supabase
 */
export const logActivity = async (userEmail: string, aksi: string, modul: string, detail: string) => {
  try {
    await supabase.from('activity_logs').insert([{
      user_email: userEmail,
      aksi,
      modul,
      detail
    }]);
  } catch (err) {
    console.error("Gagal mencatat log:", err);
  }
};

/**
 * Fungsi helper untuk upload file ke Supabase Storage
 */
export const uploadFile = async (file: File, folder: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('wedding-assets')
    .upload(filePath, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('wedding-assets')
    .getPublicUrl(data.path);

  return publicUrl;
};
