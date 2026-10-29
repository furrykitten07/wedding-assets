const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('./db.cjs');

const router = express.Router();
router.use(express.json({ limit: '50mb' }));
router.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload folder exists
const uploadDir = path.resolve(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
    cb(null, unique);
  }
});
const upload = multer({ storage });

const JSON_COLUMNS = ['foto_urls', 'categories', 'image_urls'];
const BOOLEAN_COLUMNS = ['is_qty_enabled', 'membawa_pasangan', 'is_approved', 'is_read', 'is_attended'];
const ALLOWED_TABLES = [
  'activity_logs',
  'lamaran_items',
  'pernikahan_items',
  'tamu',
  'pendapatan',
  'ideas',
  'idea_comments',
  'messages',
  'settings',
  'users',
  'buku_tamu'
];

function transformRowFromDb(row) {
  if (!row) return row;
  const out = { ...row };
  for (const col of JSON_COLUMNS) {
    if (out[col] !== undefined) {
      if (typeof out[col] === 'string') {
        try {
          out[col] = JSON.parse(out[col]);
        } catch {
          out[col] = [];
        }
      } else if (!out[col]) {
        out[col] = [];
      }
    }
  }
  for (const col of BOOLEAN_COLUMNS) {
    if (out[col] !== undefined) {
      out[col] = Boolean(out[col]);
    }
  }
  return out;
}

function transformRowToDb(row) {
  const out = { ...row };
  for (const col of JSON_COLUMNS) {
    if (out[col] !== undefined) {
      out[col] = JSON.stringify(out[col] || []);
    }
  }
  for (const col of BOOLEAN_COLUMNS) {
    if (out[col] !== undefined) {
      out[col] = out[col] ? 1 : 0;
    }
  }
  return out;
}

// 1. Auth Login Endpoint
router.post('/auth/login', async (req, res) => {
  const { email, username, password } = req.body;
  const identifier = (email || username || '').trim();
  const rawUser = identifier.includes('@') ? identifier.split('@')[0].toLowerCase() : identifier.toLowerCase();
  const rawEmail = identifier.includes('@') ? identifier.toLowerCase() : `${identifier.toLowerCase()}@wedding.com`;

  // Fallback cepat untuk akun staff & resepsi jika tabel users belum sempat diupdate
  const isStaff1 = rawUser === 'staff1' || rawEmail === 'staff1@wedding.com';
  const isStaff2 = rawUser === 'staff2' || rawEmail === 'staff2@wedding.com';
  const isResepsi = rawUser === 'resepsi' || rawEmail === 'resepsi@wedding.com';
  const isAllowedPass = password === 'staff260918' || password === 'staff123' || password === 'resepsi260918' || password === 'fiinad260918' || password === 'staff';

  if ((isStaff1 || isStaff2 || isResepsi) && isAllowedPass) {
    const role = isResepsi ? 'resepsi' : 'staff';
    const name = isStaff1 ? 'Staff 1 (Meja Resepsi & Scan)' : isStaff2 ? 'Staff 2 (Meja Resepsi & Scan)' : 'Petugas Resepsi & Scan';
    const userEmail = isStaff1 ? 'staff1@wedding.com' : isStaff2 ? 'staff2@wedding.com' : 'resepsi@wedding.com';
    const sessionUser = {
      id: isStaff1 ? 'a1b2c3d4-staff-1111-9999-000000000001' : isStaff2 ? 'a1b2c3d4-staff-2222-9999-000000000002' : '9612015a-170f-4bc4-8421-a1aa281d3945',
      email: userEmail,
      username: rawUser,
      name,
      role
    };
    return res.json({
      data: {
        user: sessionUser,
        session: {
          user: sessionUser,
          access_token: 'local-mysql-token-' + sessionUser.id
        }
      },
      error: null
    });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, name, role, password FROM users WHERE username = ? OR email = ? LIMIT 1',
      [rawUser, rawEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: { message: 'Username tidak ditemukan!' } });
    }

    const user = rows[0];
    if (user.password !== password) {
      return res.status(401).json({ error: { message: 'Password salah!' } });
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role
    };

    return res.json({
      data: {
        user: sessionUser,
        session: {
          user: sessionUser,
          access_token: 'local-mysql-token-' + user.id
        }
      },
      error: null
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: { message: err.message } });
  }
});

// 2. Upload Endpoint
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: { message: 'File tidak ada' } });
  }
  const publicUrl = `/uploads/${req.file.filename}`;
  return res.json({ publicUrl, data: { path: publicUrl }, error: null });
});

// 3. Data Query Endpoint (GET)
router.get('/data/:table', async (req, res) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ error: { message: 'Tabel tidak diizinkan' } });
  }

  const {
    select = '*',
    order,
    direction = 'ASC',
    limit,
    offset,
    search_col,
    search_val,
    count: countParam,
    ...filters
  } = req.query;

  try {
    let whereClauses = [];
    let params = [];

    // Search filter
    if (search_col && search_val) {
      whereClauses.push(`\`${search_col}\` LIKE ?`);
      params.push(`%${search_val}%`);
    }

    // Dynamic filters (e.g., status, kategori, pihak, receiver_email, sender_email, is_read, idea_id)
    for (const [key, val] of Object.entries(filters)) {
      if (val === undefined || val === null || val === '') continue;
      if (key === 'or') {
        // e.g. or=(sender_email.eq.X,receiver_email.eq.Y)
        continue;
      }
      if (BOOLEAN_COLUMNS.includes(key)) {
        whereClauses.push(`\`${key}\` = ?`);
        params.push(val === 'true' || val === '1' || val === true ? 1 : 0);
      } else {
        whereClauses.push(`\`${key}\` = ?`);
        params.push(val);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total count query
    let totalCount = 0;
    if (countParam === 'exact') {
      const [countResult] = await pool.query(
        `SELECT COUNT(*) AS total FROM \`${table}\` ${whereSql}`,
        params
      );
      totalCount = countResult[0]?.total || 0;
    }

    // Main select query
    let querySql = `SELECT ${select === '*' ? '*' : select} FROM \`${table}\` ${whereSql}`;

    if (order) {
      const safeDir = direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      querySql += ` ORDER BY \`${order}\` ${safeDir}`;
    }

    if (limit !== undefined) {
      querySql += ` LIMIT ?`;
      params.push(parseInt(limit, 10));

      if (offset !== undefined) {
        querySql += ` OFFSET ?`;
        params.push(parseInt(offset, 10));
      }
    }

    const [rows] = await pool.query(querySql, params);
    const data = (rows || []).map(transformRowFromDb);

    return res.json({
      data,
      count: countParam === 'exact' ? totalCount : data.length,
      error: null
    });
  } catch (err) {
    console.error(`Error querying ${table}:`, err);
    return res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// 4. Data Insert Endpoint (POST)
router.post('/data/:table', async (req, res) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ error: { message: 'Tabel tidak diizinkan' } });
  }

  const rawRecords = Array.isArray(req.body) ? req.body : [req.body];
  if (rawRecords.length === 0) {
    return res.json({ data: [], error: null });
  }

  try {
    const inserted = [];
    for (const record of rawRecords) {
      const toInsert = transformRowToDb(record);
      if (!toInsert.id) {
        toInsert.id = crypto.randomUUID();
      }

      const keys = Object.keys(toInsert);
      const values = Object.values(toInsert);
      const placeholders = keys.map(() => '?').join(', ');
      const sql = `INSERT INTO \`${table}\` (\`${keys.join('`, `')}\`) VALUES (${placeholders})`;

      await pool.query(sql, values);
      inserted.push(transformRowFromDb(toInsert));
    }

    return res.json({ data: inserted, error: null });
  } catch (err) {
    console.error(`Error inserting into ${table}:`, err);
    return res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// 5. Data Update Endpoint (PUT/PATCH)
router.put('/data/:table', async (req, res) => {
  const { table } = req.params;
  const { id, ticket_code, ...updates } = req.body;
  const queryId = req.query.id || id;
  const queryTicketCode = req.query.ticket_code || ticket_code;

  if (!queryId && !queryTicketCode) {
    return res.status(400).json({ error: { message: 'ID atau ticket_code target update diperlukan' } });
  }

  try {
    const toUpdate = transformRowToDb(updates);
    delete toUpdate.id; // jangan ubah id

    const keys = Object.keys(toUpdate);
    if (keys.length === 0) {
      return res.json({ data: null, error: null });
    }

    const setClauses = keys.map(k => `\`${k}\` = ?`).join(', ');

    if (queryId) {
      const values = [...Object.values(toUpdate), queryId];
      await pool.query(`UPDATE \`${table}\` SET ${setClauses} WHERE id = ?`, values);
      const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [queryId]);
      return res.json({
        data: rows[0] ? transformRowFromDb(rows[0]) : null,
        error: null
      });
    } else {
      const values = [...Object.values(toUpdate), queryTicketCode];
      await pool.query(`UPDATE \`${table}\` SET ${setClauses} WHERE ticket_code = ?`, values);
      const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE ticket_code = ?`, [queryTicketCode]);
      return res.json({
        data: rows[0] ? transformRowFromDb(rows[0]) : null,
        error: null
      });
    }
  } catch (err) {
    console.error(`Error updating ${table}:`, err);
    return res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// 6. Data Delete Endpoint (DELETE)
router.delete('/data/:table', async (req, res) => {
  const { table } = req.params;
  const id = req.query.id;

  if (!id) {
    return res.status(400).json({ error: { message: 'ID diperlukan untuk menghapus' } });
  }

  try {
    await pool.query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
    return res.json({ success: true, error: null });
  } catch (err) {
    console.error(`Error deleting from ${table}:`, err);
    return res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;

