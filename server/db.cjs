const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
};

const databaseName = process.env.MYSQL_DATABASE || 'wedding_system';

// Inisialisasi otomatis jika database belum dibuat di MySQL yang sedang aktif (Laragon / XAMPP)
async function ensureDatabase() {
  try {
    const tempConn = await mysql.createConnection(dbConfig);
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\`;`);
    await tempConn.query(`USE \`${databaseName}\`;`);

    // Periksa apakah tabel users sudah ada
    const [tables] = await tempConn.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users';`,
      [databaseName]
    );

    if (tables.length === 0) {
      console.log(`Database '${databaseName}' belum memiliki tabel, melakukan inisialisasi skema...`);
      const schemaPath = path.resolve(__dirname, '../schema_mysql.sql');
      if (fs.existsSync(schemaPath)) {
        const sqlContent = fs.readFileSync(schemaPath, 'utf-8');
        // Pisahkan query berdasarkan semicolon (;)
        const queries = sqlContent
          .split(';')
          .map(q => q.trim())
          .filter(q => q.length > 0 && !q.startsWith('--'));

        for (const query of queries) {
          try {
            await tempConn.query(query);
          } catch (qErr) {
            console.warn('Peringatan saat eksekusi query init:', qErr.message);
          }
        }
        console.log(`✅ Skema database '${databaseName}' berhasil diinisialisasi otomatis!`);
      }
    }
    await tempConn.end();
  } catch (err) {
    console.error(`⚠️ Gagal memeriksa/membuat database '${databaseName}':`, err.message);
  }
}

// Jalankan pemeriksaan di awal
ensureDatabase();

const pool = mysql.createPool({
  ...dbConfig,
  database: databaseName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
