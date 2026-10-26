/**
 * Hybrid Client Layer:
 * - Mode Cloud (Vercel/Production): Menggunakan Supabase Cloud (@supabase/supabase-js) jika VITE_SUPABASE_URL terisi.
 * - Mode Lokal: Menggunakan MySQL Lokal (via Express API /api) jika VITE_SUPABASE_URL kosong.
 */

import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const rawKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const isCloudMode = Boolean(
  rawUrl && 
  rawKey && 
  !rawUrl.includes('placeholder') && 
  typeof rawUrl === 'string' &&
  rawUrl.startsWith('https://')
);

// Listener untuk auth state change pada mode lokal
let authListeners: Array<(event: string, session: any) => void> = [];

class MySqlQueryBuilder {
  private tableName: string;
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;
  private queryParams: Record<string, any> = {};

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*', options?: { count?: string }) {
    this.action = 'select';
    this.queryParams.select = columns;
    if (options?.count) {
      this.queryParams.count = options.count;
    }
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.queryParams.order = column;
    this.queryParams.direction = options?.ascending === false ? 'DESC' : 'ASC';
    return this;
  }

  range(from: number, to: number) {
    this.queryParams.offset = from;
    this.queryParams.limit = to - from + 1;
    return this;
  }

  limit(count: number) {
    this.queryParams.limit = count;
    return this;
  }

  eq(column: string, value: any) {
    this.queryParams[column] = value;
    return this;
  }

  ilike(column: string, pattern: string) {
    const cleanPattern = pattern.replace(/^%+|%+$/g, '');
    this.queryParams.search_col = column;
    this.queryParams.search_val = cleanPattern;
    return this;
  }

  insert(records: any | any[]) {
    this.action = 'insert';
    this.payload = records;
    return this;
  }

  update(updates: any) {
    this.action = 'update';
    this.payload = updates;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  async execute(): Promise<{ data: any; count?: number; error: any }> {
    try {
      const url = new URL(`/api/data/${this.tableName}`, window.location.origin);
      Object.entries(this.queryParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          url.searchParams.append(k, String(v));
        }
      });

      let method = 'GET';
      let body: any = undefined;

      if (this.action === 'insert') {
        method = 'POST';
        body = JSON.stringify(this.payload);
      } else if (this.action === 'update') {
        method = 'PUT';
        body = JSON.stringify(this.payload);
      } else if (this.action === 'delete') {
        method = 'DELETE';
      }

      const res = await fetch(url.toString(), {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        return { data: null, error: json.error || { message: res.statusText } };
      }
      return { data: json.data, count: json.count, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Koneksi gagal ke MySQL Lokal' } };
    }
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

const localSupabase = {
  auth: {
    getSession: async () => {
      try {
        const stored = localStorage.getItem('wedding_user_session');
        if (stored) {
          const session = JSON.parse(stored);
          return { data: { session }, error: null };
        }
      } catch (err) {
        console.error('Error parse session:', err);
      }
      return { data: { session: null }, error: null };
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      authListeners.push(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners = authListeners.filter(fn => fn !== callback);
            }
          }
        }
      };
    },

    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          return { data: { user: null, session: null }, error: json.error || { message: 'Login gagal' } };
        }
        const session = json.data.session;
        localStorage.setItem('wedding_user_session', JSON.stringify(session));
        authListeners.forEach(fn => fn('SIGNED_IN', session));
        return { data: json.data, error: null };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: { message: err.message || 'Gagal terhubung ke MySQL' } };
      }
    },

    signOut: async () => {
      localStorage.removeItem('wedding_user_session');
      authListeners.forEach(fn => fn('SIGNED_OUT', null));
      return { error: null };
    }
  },

  from: (tableName: string) => {
    return new MySqlQueryBuilder(tableName);
  },

  storage: {
    from: (_bucket: string) => ({
      upload: async (filePath: string, file: File) => {
        const publicUrl = await uploadFile(file, filePath);
        return { data: { path: publicUrl }, error: null };
      },
      getPublicUrl: (filePath: string) => {
        return { data: { publicUrl: filePath } };
      }
    })
  }
};

const cloudSupabase = isCloudMode ? createClient(rawUrl, rawKey) : null;

// Export client: Menggunakan Supabase resmi jika di Cloud, atau adapter lokal jika di Lokal
export const supabase: any = isCloudMode ? cloudSupabase! : localSupabase;
export const isSupabaseConfigured = isCloudMode;

/**
 * Fungsi untuk mencatat aktivitas
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
 * Fungsi helper untuk upload file
 */
export const uploadFile = async (file: File, folder: string) => {
  if (isCloudMode && cloudSupabase) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await cloudSupabase.storage
      .from('wedding-assets')
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = cloudSupabase.storage
      .from('wedding-assets')
      .getPublicUrl(data.path);

    return publicUrl;
  } else {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error?.message || 'Gagal upload file');
    }

    return json.publicUrl;
  }
};
