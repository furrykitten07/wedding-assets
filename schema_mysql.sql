-- ==========================================================
-- SCHEMA MYSQL WEDDING MANAGEMENT SYSTEM (LOCAL LARAGON)
-- ==========================================================

CREATE DATABASE IF NOT EXISTS wedding_system;
USE wedding_system;

-- 1. TABEL users (Untuk login lokal)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'owner',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hapus user lama jika ada lalu isi akun Fikri dan Nadya
DELETE FROM users WHERE username IN ('fikri', 'nadya');

INSERT INTO users (id, username, email, password, name, role) VALUES
(UUID(), 'fikri', 'fikri@wedding.com', 'fiinad260918', 'Fikri', 'owner'),
(UUID(), 'nadya', 'nadya@wedding.com', 'nadya260918', 'Nadya', 'owner');

-- 2. TABEL activity_logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_email VARCHAR(100) NOT NULL,
    aksi VARCHAR(50) NOT NULL, 
    modul VARCHAR(50) NOT NULL, 
    detail TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABEL lamaran_items
CREATE TABLE IF NOT EXISTS lamaran_items (
    id VARCHAR(36) PRIMARY KEY,
    nama_keperluan VARCHAR(255) NOT NULL,
    kategori VARCHAR(50) NOT NULL,
    harga DECIMAL(15,2) DEFAULT 0 NOT NULL,
    qty INT DEFAULT 1,
    is_qty_enabled BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'belum terbeli',
    deskripsi TEXT,
    foto_urls JSON,
    pdf_url TEXT,
    wa_admin VARCHAR(50),
    link_sosmed TEXT,
    link_gmaps TEXT,
    link_belanja TEXT,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. TABEL pernikahan_items
CREATE TABLE IF NOT EXISTS pernikahan_items (
    id VARCHAR(36) PRIMARY KEY,
    nama_keperluan VARCHAR(255) NOT NULL,
    kategori VARCHAR(50) NOT NULL,
    harga DECIMAL(15,2) DEFAULT 0 NOT NULL,
    qty INT DEFAULT 1,
    is_qty_enabled BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'belum terbeli',
    deskripsi TEXT,
    foto_urls JSON,
    pdf_url TEXT,
    wa_admin VARCHAR(50),
    link_sosmed TEXT,
    link_gmaps TEXT,
    link_belanja TEXT,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 5. TABEL tamu
CREATE TABLE IF NOT EXISTS tamu (
    id VARCHAR(36) PRIMARY KEY,
    nama_tamu VARCHAR(255) NOT NULL,
    no_whatsapp VARCHAR(50),
    pihak ENUM('Fikri', 'Nadya') NOT NULL,
    kategori VARCHAR(100) NOT NULL,
    membawa_pasangan BOOLEAN DEFAULT FALSE,
    jumlah_tambahan INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABEL pendapatan
CREATE TABLE IF NOT EXISTS pendapatan (
    id VARCHAR(36) PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    nominal DECIMAL(15,2) DEFAULT 0 NOT NULL,
    tanggal DATE NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABEL ideas
CREATE TABLE IF NOT EXISTS ideas (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    categories JSON,
    image_urls JSON,
    pdf_url TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by VARCHAR(100),
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABEL idea_comments
CREATE TABLE IF NOT EXISTS idea_comments (
    id VARCHAR(36) PRIMARY KEY,
    idea_id VARCHAR(36) NOT NULL,
    user_email VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    parent_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABEL messages
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(36) PRIMARY KEY,
    sender_email VARCHAR(100) NOT NULL,
    receiver_email VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABEL settings
CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

