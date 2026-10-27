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

class BukuTamuCloudBridge {
  private client: any;
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private selectCol: string = '*';
  private orderCol?: string;
  private orderAsc?: boolean;
  private eqFilters: Record<string, any> = {};
  private payload: any = null;

  constructor(client: any) {
    this.client = client;
  }

  select(columns: string = '*', _options?: any) {
    this.action = 'select';
    this.selectCol = columns;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderCol = column;
    this.orderAsc = options?.ascending !== false;
    return this;
  }

  eq(column: string, value: any) {
    this.eqFilters[column] = value;
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

  async execute(): Promise<{ data: any; error: any }> {
    const SYSTEM_GUEST_RECEIVER = 'guest_pass_data@wedding.system';

    // 1. Coba tabel native 'buku_tamu' terlebih dahulu jika sudah dibuat di Supabase
    try {
      if (this.action === 'select') {
        let q = this.client.from('buku_tamu').select(this.selectCol);
        if (this.orderCol) q = q.order(this.orderCol, { ascending: this.orderAsc });
        Object.entries(this.eqFilters).forEach(([col, val]) => {
          q = q.eq(col, val);
        });
        const res = await q;
        if (!res.error) return res;
        if (res.error?.code !== 'PGRST205' && !res.error?.message?.includes('public.buku_tamu')) {
          return res;
        }
      } else if (this.action === 'insert') {
        const res = await this.client.from('buku_tamu').insert(this.payload).select();
        if (!res.error) return res;
        if (res.error?.code !== 'PGRST205' && !res.error?.message?.includes('public.buku_tamu')) {
          return res;
        }
      } else if (this.action === 'update') {
        let q = this.client.from('buku_tamu').update(this.payload);
        Object.entries(this.eqFilters).forEach(([col, val]) => {
          q = q.eq(col, val);
        });
        const res = await q.select();
        if (!res.error) return res;
        if (res.error?.code !== 'PGRST205' && !res.error?.message?.includes('public.buku_tamu')) {
          return res;
        }
      } else if (this.action === 'delete') {
        let q = this.client.from('buku_tamu').delete();
        Object.entries(this.eqFilters).forEach(([col, val]) => {
          q = q.eq(col, val);
        });
        const res = await q;
        if (!res.error) return res;
        if (res.error?.code !== 'PGRST205' && !res.error?.message?.includes('public.buku_tamu')) {
          return res;
        }
      }
    } catch {
      // Abaikan dan gunakan Cloud Bridge cadangan
    }

    // 2. Cloud Fallback Bridge: Menggunakan tabel 'messages' yang sudah ada di Supabase
    if (this.action === 'select') {
      try {
        let q = this.client.from('messages').select('*').eq('receiver_email', SYSTEM_GUEST_RECEIVER);
        if (this.eqFilters.ticket_code) {
          q = q.eq('sender_email', this.eqFilters.ticket_code);
        }
        if (this.eqFilters.id) {
          q = q.eq('id', this.eqFilters.id);
        }
        if (this.orderCol === 'created_at') {
          q = q.order('created_at', { ascending: this.orderAsc ?? false });
        }
        const { data, error } = await q;
        if (error) return { data: [], error: null };

        const mapped = (data || []).map((row: any) => {
          let parsed: any = {};
          try {
            parsed = JSON.parse(row.content);
          } catch {
            parsed = {};
          }
          const jatah = Number(parsed.jatah_tamu || parsed.jumlah_tamu) || 1;
          const konfirmasi = Number(parsed.jumlah_hadir_konfirmasi || parsed.jumlah_tamu) || jatah;
          return {
            id: row.id,
            ticket_code: row.sender_email || parsed.ticket_code,
            nama_tamu: parsed.nama_tamu || parsed.nama_keluarga || 'Tamu Undangan',
            nama_keluarga: parsed.nama_keluarga || parsed.nama_tamu || 'Tamu Undangan',
            no_whatsapp: parsed.no_whatsapp || '',
            pihak: parsed.pihak || 'Pihak Fikri',
            jumlah_tamu: konfirmasi,
            jatah_tamu: jatah,
            jumlah_hadir_konfirmasi: konfirmasi,
            kategori_tamu: (parsed.kategori_tamu === 'VIP' ? 'VIP' : 'Reguler') as 'VIP' | 'Reguler',
            ucapan: parsed.ucapan || '',
            is_attended: Boolean(row.is_read || parsed.is_attended),
            attended_at: parsed.attended_at || null,
            is_souvenir_given: Boolean(parsed.is_souvenir_given),
            souvenir_given_at: parsed.souvenir_given_at || null,
            ...parsed,
            created_at: row.created_at
          };
        });

        return { data: mapped, error: null };
      } catch {
        return { data: [], error: null };
      }
    }

    if (this.action === 'insert') {
      try {
        const rawList = Array.isArray(this.payload) ? this.payload : [this.payload];
        const results: any[] = [];
        for (const item of rawList) {
          const code = item.ticket_code || `FN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          const msgPayload = {
            sender_email: code,
            receiver_email: SYSTEM_GUEST_RECEIVER,
            content: JSON.stringify(item),
            is_read: Boolean(item.is_attended)
          };
          const { data, error } = await this.client.from('messages').insert([msgPayload]).select();
          if (error) throw error;
          const insertedRow = data?.[0];
          results.push({
            ...item,
            id: insertedRow?.id || crypto.randomUUID(),
            ticket_code: code,
            created_at: insertedRow?.created_at || new Date().toISOString()
          });
        }
        return { data: results, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    }

    if (this.action === 'update') {
      try {
        let findQ = this.client.from('messages').select('*').eq('receiver_email', SYSTEM_GUEST_RECEIVER);
        if (this.eqFilters.id) {
          findQ = findQ.eq('id', this.eqFilters.id);
        } else if (this.eqFilters.ticket_code) {
          findQ = findQ.eq('sender_email', this.eqFilters.ticket_code);
        }

        const { data: rows } = await findQ;
        if (rows && rows.length > 0) {
          for (const row of rows) {
            let currentData: any = {};
            try {
              currentData = JSON.parse(row.content);
            } catch {
              currentData = {};
            }
            const merged = { ...currentData, ...this.payload };
            await this.client.from('messages').update({
              content: JSON.stringify(merged),
              is_read: this.payload.is_attended !== undefined ? Boolean(this.payload.is_attended) : row.is_read
            }).eq('id', row.id);
          }
        }
        return { data: rows || [], error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    }

    if (this.action === 'delete') {
      try {
        let delQ = this.client.from('messages').delete().eq('receiver_email', SYSTEM_GUEST_RECEIVER);
        if (this.eqFilters.id) {
          delQ = delQ.eq('id', this.eqFilters.id);
        } else if (this.eqFilters.ticket_code) {
          delQ = delQ.eq('sender_email', this.eqFilters.ticket_code);
        }
        await delQ;
        return { data: null, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    }

    return { data: null, error: null };
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

const cloudSupabase = isCloudMode ? createClient(rawUrl, rawKey) : null;

// Proxy client agar buku_tamu otomatis memiliki fallback jembatan aman ke database Supabase
// serta mendukung autentikasi akun khusus Petugas Resepsi & Scan tanpa hambatan
const wrappedCloudSupabase = cloudSupabase ? {
  ...cloudSupabase,
  auth: {
    ...cloudSupabase.auth,
    getSession: async () => {
      try {
        const stored = localStorage.getItem('wedding_user_session');
        if (stored) {
          const session = JSON.parse(stored);
          if (session?.user?.email?.includes('resepsi') || session?.user?.role === 'resepsi') {
            return { data: { session }, error: null };
          }
        }
      } catch (err) {
        // abaikan
      }
      return cloudSupabase.auth.getSession();
    },
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const clean = (email || '').toLowerCase().trim();
      const isResepsi = clean.includes('resepsi') || clean.includes('scanner') || clean.includes('panitia');
      
      // Kredensial akun khusus Petugas Resepsi
      if (isResepsi && (password === 'resepsi260918' || password === 'resepsi' || password === 'fiinad260918')) {
        const resepsiUser = {
          id: '9612015a-170f-4bc4-8421-a1aa281d3945',
          email: 'resepsi@wedding.com',
          name: 'Petugas Resepsi & Scan',
          user_metadata: {
            name: 'Petugas Resepsi & Scan',
            role: 'resepsi'
          },
          role: 'resepsi'
        };
        const session = {
          user: resepsiUser,
          access_token: 'resepsi-session-token-' + Date.now(),
          token_type: 'bearer'
        };
        localStorage.setItem('wedding_user_session', JSON.stringify(session));
        return { data: { user: resepsiUser, session }, error: null };
      }

      const res = await cloudSupabase.auth.signInWithPassword({ email, password });
      return res;
    },
    signOut: async () => {
      localStorage.removeItem('wedding_user_session');
      return cloudSupabase.auth.signOut();
    }
  },
  from: (tableName: string) => {
    if (tableName === 'buku_tamu') {
      return new BukuTamuCloudBridge(cloudSupabase);
    }
    return cloudSupabase.from(tableName);
  }
} : null;

// Export client: Menggunakan Supabase resmi jika di Cloud, atau adapter lokal jika di Lokal
export const supabase: any = isCloudMode ? wrappedCloudSupabase! : localSupabase;
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
