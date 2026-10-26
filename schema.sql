
-- ==========================================================
-- SCHEMA RESET & SETUP WEDDING MANAGEMENT SYSTEM (SUPABASE)
-- ==========================================================

-- Hapus tabel lama jika ingin reset total
DROP TABLE IF EXISTS idea_comments;
DROP TABLE IF EXISTS ideas;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS lamaran_items;
DROP TABLE IF EXISTS pernikahan_items;
DROP TABLE IF EXISTS tamu;
DROP TABLE IF EXISTS pendapatan;
DROP TABLE IF EXISTS messages;

-- 1. TABEL activity_logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    aksi TEXT NOT NULL, 
    modul TEXT NOT NULL, 
    detail TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABEL lamaran_items
CREATE TABLE IF NOT EXISTS lamaran_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_keperluan TEXT NOT NULL,
    kategori TEXT NOT NULL CHECK (kategori IN ('barang', 'vendor', 'mahar', 'seserahan')),
    harga NUMERIC DEFAULT 0 NOT NULL,
    qty INTEGER DEFAULT 1,
    is_qty_enabled BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'belum terbeli' CHECK (status IN ('belum terbeli', 'dicicil', 'done')),
    deskripsi TEXT,
    foto_urls TEXT[] DEFAULT '{}',
    pdf_url TEXT,
    wa_admin TEXT,
    link_sosmed TEXT,
    link_gmaps TEXT,
    link_belanja TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABEL pernikahan_items
CREATE TABLE IF NOT EXISTS pernikahan_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_keperluan TEXT NOT NULL,
    kategori TEXT NOT NULL CHECK (kategori IN ('barang', 'vendor', 'mahar', 'seserahan')),
    harga NUMERIC DEFAULT 0 NOT NULL,
    qty INTEGER DEFAULT 1,
    is_qty_enabled BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'belum terbeli' CHECK (status IN ('belum terbeli', 'dicicil', 'done')),
    deskripsi TEXT,
    foto_urls TEXT[] DEFAULT '{}',
    pdf_url TEXT,
    wa_admin TEXT,
    link_sosmed TEXT,
    link_gmaps TEXT,
    link_belanja TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABEL tamu
CREATE TABLE IF NOT EXISTS tamu (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_tamu TEXT NOT NULL,
    no_whatsapp TEXT,
    pihak TEXT NOT NULL CHECK (pihak IN ('Fikri', 'Nadya')),
    kategori TEXT NOT NULL,
    membawa_pasangan BOOLEAN DEFAULT FALSE,
    jumlah_tambahan INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABEL pendapatan
CREATE TABLE IF NOT EXISTS pendapatan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama TEXT NOT NULL,
    nominal NUMERIC DEFAULT 0 NOT NULL,
    tanggal DATE DEFAULT CURRENT_DATE NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABEL ideas
CREATE TABLE IF NOT EXISTS ideas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    categories TEXT[] DEFAULT '{}',
    image_urls TEXT[] DEFAULT '{}',
    pdf_url TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABEL idea_comments
CREATE TABLE IF NOT EXISTS idea_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES idea_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. TABEL messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_email TEXT NOT NULL,
    receiver_email TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. TABEL settings (Untuk menyimpan tanggal acara & konfigurasi bersama)
CREATE TABLE IF NOT EXISTS settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
