
export type UserRole = 'owner' | 'resepsi' | 'scanner';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
}

export enum ItemStatus {
  BELUM_TERBELI = 'belum terbeli',
  DICICIL = 'dicicil',
  DONE = 'done'
}

export enum ItemCategory {
  BARANG = 'barang',
  VENDOR = 'vendor',
  MAHAR = 'mahar',
  SESERAHAN = 'seserahan'
}

export interface BudgetItem {
  id: string;
  nama_keperluan: string;
  kategori: ItemCategory;
  harga: number;
  qty: number;
  is_qty_enabled: boolean;
  status: ItemStatus;
  deskripsi?: string;
  foto_urls: string[];
  pdf_url?: string;
  wa_admin?: string;
  link_sosmed?: string;
  link_gmaps?: string;
  link_belanja?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Guest {
  id: string;
  nama_tamu: string;
  nama_keluarga?: string;
  no_whatsapp?: string;
  pihak: 'Fikri' | 'Nadya';
  kategori: string;
  kategori_tamu?: 'VIP' | 'Reguler';
  jatah_tamu?: number;
  ticket_code?: string;
  membawa_pasangan: boolean;
  jumlah_tambahan: number;
  total_pax: number;
  is_attended?: boolean;
  is_souvenir_given?: boolean;
  created_at: string;
}

export interface Income {
  id: string;
  nama: string;
  nominal: number;
  tanggal: string;
  created_by: string;
  created_at: string;
}

export interface Idea {
  id: string;
  title: string;
  content: string;
  categories: string[];
  image_urls: string[];
  pdf_url?: string;
  is_approved: boolean;
  approved_by?: string;
  created_by: string;
  created_at: string;
}

export interface IdeaComment {
  id: string;
  idea_id: string;
  user_email: string;
  content: string;
  parent_id?: string;
  created_at: string;
  // Join data
  parent_content?: string;
}

export interface ActivityLog {
  id: string;
  user_email: string;
  aksi: 'create' | 'update' | 'delete' | 'login' | 'approve' | 'comment';
  modul: 'Lamaran' | 'Pernikahan' | 'Tamu' | 'Pendapatan' | 'Auth' | 'Message' | 'Settings' | 'Ideas';
  detail: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_email: string;
  receiver_email: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface BukuTamu {
  id: string;
  ticket_code: string;
  nama_tamu: string;
  nama_keluarga?: string;
  no_whatsapp?: string;
  pihak: 'Pihak Fikri' | 'Pihak Nadya' | 'Rekan Bersama' | string;
  jumlah_tamu: number;
  jatah_tamu?: number;
  jumlah_hadir_konfirmasi?: number;
  kategori_tamu?: 'VIP' | 'Reguler';
  ucapan?: string;
  is_attended: boolean;
  attended_at?: string | null;
  is_souvenir_given?: boolean;
  souvenir_given_at?: string | null;
  created_at: string;
}
