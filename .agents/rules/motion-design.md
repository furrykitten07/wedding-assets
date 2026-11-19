# Aturan & Standar Desain Proyek: Motion (Framer Motion)
Repository Sumber: https://github.com/motiondivision/motion.git

Proyek ini terhubung dan menggunakan library resmi **Motion** (sebelumnya Framer Motion) dari `motiondivision/motion` (`motion` package di npm) sebagai standar utama untuk seluruh desain animasi, transisi visual, dan micro-interactions.

## 1. Aturan Penggunaan Motion
1. **Import Resmi**: Selalu gunakan import dari `motion/react`:
   ```tsx
   import { motion, AnimatePresence } from "motion/react";
   ```
2. **Karakter Animasi**:
   - Gunakan animasi berbasis fisika pegas (*spring physics*) untuk interaksi UI agar terasa hidup, responsif, dan natural (terutama saat dijalankan di aplikasi mobile APK).
   - Hindari transisi CSS kaku atau transisi linier biasa jika bisa menggunakan `motion`.

## 2. Standar Preset Animasi Proyek
- **Modal / Popup / Dialog**:
  - Bungkus dengan `<AnimatePresence>`
  - `initial={{ opacity: 0, scale: 0.95, y: 10 }}`
  - `animate={{ opacity: 1, scale: 1, y: 0 }}`
  - `exit={{ opacity: 0, scale: 0.95, y: 10 }}`
  - `transition={{ type: "spring", stiffness: 350, damping: 25 }}`
- **Tombol / Kartu Interaktif**:
  - `whileHover={{ scale: 1.02 }}`
  - `whileTap={{ scale: 0.97 }}`
- **Daftar / List Tamu & Kartu Stat**:
  - Staggered fade in: `initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}`
- **Tab & Filter Kategori**:
  - Gunakan `layout` atau `layoutId` untuk perpindahan indikator aktif secara mulus.
