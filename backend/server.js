import "dotenv/config";
import express from "express";
import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
import nodemailer from "nodemailer";
import cron from "node-cron";

// ================== CONFIG ==================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_ME_SUPER_SECRET";
const DB_FILE = "database.db";

// ================== MIDDLEWARE ==================
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

// ================== FILE STORAGE ==================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("نوع الملف غير مسموح به (فقط صور، PDF، ملفات مكتبية)"));
    }
  }
});
app.use("/uploads", express.static("uploads"));

// ================== DATABASE ==================
const db = new Database(DB_FILE);

// USERS
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT CHECK(role IN ('viewer','entry','admin')) NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
`).run();

// SETTINGS (Property Types, Categories & Names)
// Check if table needs migration for Phase 14
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE name='settings'").get();
if (schema && !schema.sql.includes("'person'")) {
  console.log("🔄 Migrating settings table...");
  db.prepare("ALTER TABLE settings RENAME TO settings_old").run();
  db.prepare(`
    CREATE TABLE settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('property_type','category','person')) NOT NULL,
      UNIQUE(name, type)
    )
  `).run();
  db.prepare("INSERT INTO settings (id, name, type) SELECT id, name, type FROM settings_old").run();
  db.prepare("DROP TABLE settings_old").run();
  console.log("✅ Migration complete.");
} else {
  db.prepare(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('property_type','category','person')) NOT NULL,
    UNIQUE(name, type)
  )
  `).run();
}

// OPERATIONS (Enhanced for Phase 9)
db.prepare(`
CREATE TABLE IF NOT EXISTS operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  property_type TEXT,
  reference_number TEXT,
  amount REAL NOT NULL,
  category TEXT,
  description TEXT,
  attachment_path TEXT,
  type TEXT CHECK(type IN ('in','out')) NOT NULL,
  created_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(created_by) REFERENCES users(id)
)
`).run();

// TRANSFERS (Phase 14)
db.prepare(`
CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  person_name TEXT NOT NULL,
  amount REAL NOT NULL,
  attachment_path TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(created_by) REFERENCES users(id)
)
`).run();

// PLATFORMS
db.prepare(`
CREATE TABLE IF NOT EXISTS platforms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(created_by) REFERENCES users(id)
)
`).run();

// SERVICES
db.prepare(`
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  attachment_path TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(platform_id) REFERENCES platforms(id) ON DELETE CASCADE,
  FOREIGN KEY(created_by) REFERENCES users(id)
)
`).run();

// ================== CREATE DEFAULT ADMIN ==================
const adminUsername = "mohsen";
const adminExists = db
  .prepare("SELECT id FROM users WHERE username = ?")
  .get(adminUsername);

if (!adminExists) {
  const hash = bcrypt.hashSync("mohsen", 10);
  db.prepare(`
    INSERT INTO users (username, name, email, password, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(adminUsername, "محسن", "mohsen@wallet.local", hash, "admin");

  // Initial Settings
  const initTypes = ["سكني", "تجاري", "صناعي"];
  const initCats = ["صيانة", "إيجار", "فواتير", "أخرى"];

  const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (name, type) VALUES (?, ?)");
  initTypes.forEach(t => insertSetting.run(t, "property_type"));
  initCats.forEach(c => insertSetting.run(c, "category"));

  console.log("✅ Admin user created: mohsen / Aa@0555252341");
}

// ================== EMAIL BACKUP LOGIC ==================
async function sendBackupEmail() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const recipient = process.env.BACKUP_EMAIL || "a.abdulmosen@gmail.com";

  if (!smtpUser || !smtpPass) {
    console.warn("⚠️ SMTP credentials missing. Backup skipped.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: smtpUser, pass: smtpPass },
  });

  const mailOptions = {
    from: `"Smart Wallet Backup" <${smtpUser}>`,
    to: recipient,
    subject: `Daily Backup - ${new Date().toLocaleDateString()}`,
    text: "Attached is the daily database backup.",
    attachments: [{ filename: "database.db", path: path.join(__dirname, DB_FILE) }],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("📧 Backup email sent successfully to", recipient);
  } catch (err) {
    console.error("❌ Failed to send backup email:", err);
    throw err;
  }
}

// Schedule: Daily at 3:00 AM
cron.schedule("0 3 * * *", () => {
  console.log("⏰ Running scheduled backup...");
  sendBackupEmail().catch(console.error);
});

// ================== AUTH HELPERS ==================
function auth(requiredRoles = []) {
  return (req, res, next) => {
    try {
      const token = req.cookies.token;
      if (!token) return res.status(401).json({ message: "Unauthorized" });

      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;

      if (
        requiredRoles.length &&
        !requiredRoles.includes(decoded.role)
      ) {
        return res.status(403).json({ message: "Forbidden" });
      }

      next();
    } catch {
      res.status(401).json({ message: "Invalid token" });
    }
  };
}

// ================== VALIDATION ==================
const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

const operationSchema = z.object({
  date: z.string(),
  property_type: z.string().optional(),
  reference_number: z.string().optional(),
  amount: z.number(),
  category: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(["in", "out"]),
});


// ================== ROUTES ==================

// LOGIN
app.post("/api/login", (req, res) => {
  console.log("Login attempt:", req.body);
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: "Invalid data" });

  const { username, password } = parsed.data;

  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username);

  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.json({
    message: "Logged in",
    user: { id: user.id, name: user.name, role: user.role },
  });
});

// LOGOUT
app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

// ME
app.get("/api/me", auth(), (req, res) => {
  res.json(req.user);
});

// BACKUP TEST
app.post("/api/admin/backup-now", auth(["admin"]), async (req, res) => {
  try {
    await sendBackupEmail();
    res.json({ message: "تم إرسال النسخة الاحتياطية بنجاح إلى بريدك" });
  } catch (err) {
    res.status(500).json({ message: "فشل إرسال النسخة الاحتياطية: " + err.message });
  }
});

// ================== SETTINGS ==================
app.get("/api/settings", auth(), (req, res) => {
  const rows = db.prepare("SELECT * FROM settings").all();
  res.json(rows);
});

app.post("/api/settings", auth(["admin"]), (req, res) => {
  const { name, type } = req.body;
  try {
    db.prepare("INSERT INTO settings (name, type) VALUES (?, ?)").run(name, type);
    res.json({ message: "Setting added" });
  } catch {
    res.status(400).json({ message: "Already exists" });
  }
});

app.delete("/api/settings/:id", auth(["admin"]), (req, res) => {
  db.prepare("DELETE FROM settings WHERE id = ?").run(req.params.id);
  res.json({ message: "Deleted" });
});

// ================== OPERATIONS ==================

// ADD OPERATION
app.post("/api/operations", auth(["entry", "admin"]), upload.single("attachment"), (req, res) => {
  const body = req.body;

  // Basic validation
  if (!body.date || !body.type) {
    return res.status(400).json({ message: "التاريخ ونوع العملية مطلوبان" });
  }

  const amount = (body.amount === "" || body.amount === undefined) ? 0 : parseFloat(body.amount);
  if (isNaN(amount)) {
    return res.status(400).json({ message: "المبلغ يجب أن يكون رقماً" });
  }

  const attachment_path = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    db.prepare(`
      INSERT INTO operations (date, property_type, reference_number, amount, category, description, attachment_path, type, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      body.date,
      body.property_type || null,
      body.reference_number || null,
      amount,
      body.category || null,
      body.description || null,
      attachment_path,
      body.type,
      req.user.id
    );
    res.json({ message: "تم إضافة العملية بنجاح" });
  } catch (err) {
    console.error("Add operation error:", err);
    res.status(500).json({ message: "خطأ داخلي في الخادم" });
  }
});

// UPDATE OPERATION
app.put("/api/operations/:id", auth(["admin"]), upload.single("attachment"), (req, res) => {
  const { id } = req.params;
  const body = req.body;

  const existing = db.prepare("SELECT * FROM operations WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ message: "العملية غير موجودة" });

  const amount = (body.amount === "" || body.amount === undefined) ? 0 : parseFloat(body.amount);
  if (isNaN(amount)) {
    return res.status(400).json({ message: "المبلغ يجب أن يكون رقماً" });
  }

  let attachment_path = existing.attachment_path;
  if (req.file) {
    attachment_path = `/uploads/${req.file.filename}`;
  }

  try {
    db.prepare(`
      UPDATE operations 
      SET date = ?, property_type = ?, reference_number = ?, amount = ?, category = ?, description = ?, attachment_path = ?, type = ?
      WHERE id = ?
    `).run(
      body.date || existing.date,
      body.property_type || null,
      body.reference_number || null,
      amount,
      body.category || null,
      body.description || null,
      attachment_path,
      body.type || existing.type,
      id
    );
    res.json({ message: "تم تحديث العملية بنجاح" });
  } catch (err) {
    console.error("Update operation error:", err);
    res.status(500).json({ message: "خطأ في التحديث" });
  }
});

// LIST + SEARCH OPERATIONS
app.get("/api/operations", auth(), (req, res) => {
  const q = req.query.q || "";
  const category = req.query.category;
  const property_type = req.query.property_type;

  let sql = `
    SELECT o.*, u.name AS created_by_name
    FROM operations o
    LEFT JOIN users u ON u.id = o.created_by
    WHERE (COALESCE(o.reference_number, '') LIKE ? OR COALESCE(o.description, '') LIKE ?)
  `;
  const params = [`%${q}%`, `%${q}%`];

  if (category) {
    sql += " AND o.category = ?";
    params.push(category);
  }
  if (property_type) {
    sql += " AND o.property_type = ?";
    params.push(property_type);
  }

  sql += " ORDER BY o.date DESC";

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// DELETE OPERATION
app.delete("/api/operations/:id", auth(["admin"]), (req, res) => {
  db.prepare("DELETE FROM operations WHERE id = ?")
    .run(req.params.id);

  res.json({ message: "Deleted" });
});

// STATS (Dashboard)
app.get("/api/stats", auth(), (req, res) => {
  const opStats = db.prepare(`
    SELECT 
      SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END) as total_in,
      SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END) as total_out
    FROM operations
  `).get();

  const transferStats = db.prepare(`
    SELECT SUM(amount) as total_transfers FROM transfers
  `).get();

  // Category breakdown
  const categoryStats = db.prepare(`
    SELECT category, SUM(amount) as total
    FROM operations 
    WHERE type = 'out' 
    GROUP BY category 
    ORDER BY total DESC
  `).all();

  // Person breakdown
  const personStats = db.prepare(`
    SELECT person_name, SUM(amount) as total
    FROM transfers
    GROUP BY person_name
    ORDER BY total DESC
  `).all();

  // Property breakdown
  const propertyStats = db.prepare(`
    SELECT property_type, SUM(amount) as total
    FROM operations
    GROUP BY property_type
    ORDER BY total DESC
  `).all();

  // Recent Activity (mixed)
  const recentOps = db.prepare(`
    SELECT date, amount, type, category as details, 'op' as origin
    FROM operations
    ORDER BY created_at DESC LIMIT 5
  `).all();

  const recentTrans = db.prepare(`
    SELECT date, amount, 'out' as type, person_name as details, 'tra' as origin
    FROM transfers
    ORDER BY created_at DESC LIMIT 5
  `).all();

  const total_in = opStats.total_in || 0;
  const total_out = opStats.total_out || 0;
  const total_transfers = transferStats.total_transfers || 0;

  // Balance calculation: Incomes - (Expenses + Transfers)
  const balance = total_in - (total_out + total_transfers);

  res.json({
    total_in, total_out, total_transfers, balance,
    categories: categoryStats,
    persons: personStats,
    properties: propertyStats.filter(p => p.property_type), // Skip nulls
    recent: [...recentOps, ...recentTrans].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8)
  });
});

// ================== TRANSFERS ==================

// ADD TRANSFER
app.post("/api/transfers", auth(["entry", "admin"]), upload.single("attachment"), (req, res) => {
  const body = req.body;
  const amount = parseFloat(body.amount);

  if (!body.date || isNaN(amount) || !body.person_name) {
    return res.status(400).json({ message: "Invalid data" });
  }

  const attachment_path = req.file ? `/uploads/${req.file.filename}` : null;

  db.prepare(`
    INSERT INTO transfers (date, person_name, amount, attachment_path, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(body.date, body.person_name, amount, attachment_path, req.user.id);

  res.json({ message: "Transfer added" });
});

// LIST TRANSFERS
app.get("/api/transfers", auth(), (req, res) => {
  const person_name = req.query.person_name;
  let sql = `
    SELECT t.*, u.name AS created_by_name
    FROM transfers t
    LEFT JOIN users u ON u.id = t.created_by
  `;
  const params = [];

  if (person_name) {
    sql += " WHERE t.person_name = ?";
    params.push(person_name);
  }

  sql += " ORDER BY t.date DESC";

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// DELETE TRANSFER
app.delete("/api/transfers/:id", auth(["admin"]), (req, res) => {
  db.prepare("DELETE FROM transfers WHERE id = ?").run(req.params.id);
  res.json({ message: "Deleted" });
});

// ================== PLATFORMS & SERVICES ==================

// LIST PLATFORMS
app.get("/api/platforms", auth(), (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, u.name as created_by_name 
    FROM platforms p 
    LEFT JOIN users u ON u.id = p.created_by 
    ORDER BY p.id DESC
  `).all();

  // Get services for each platform
  const platforms = rows.map(p => {
    const services = db.prepare(`SELECT * FROM services WHERE platform_id = ? ORDER BY id DESC`).all(p.id);
    return { ...p, services };
  });

  res.json(platforms);
});

// ADD PLATFORM
app.post("/api/platforms", auth(["entry", "admin"]), (req, res) => {
  const { name, category } = req.body;
  if (!name) return res.status(400).json({ message: "الاسم مطلوب" });

  db.prepare("INSERT INTO platforms (name, category, created_by) VALUES (?, ?, ?)")
    .run(name, category || null, req.user.id);
  res.json({ message: "تمت إضافة المنصة" });
});

// DELETE PLATFORM
app.delete("/api/platforms/:id", auth(["admin"]), (req, res) => {
  db.prepare("DELETE FROM platforms WHERE id = ?").run(req.params.id);
  res.json({ message: "تم حذف المنصة" });
});

// ADD SERVICE TO PLATFORM
app.post("/api/services", auth(["entry", "admin"]), upload.single("attachment"), (req, res) => {
  const { platform_id, name, start_date, end_date } = req.body;
  if (!platform_id || !name) return res.status(400).json({ message: "البيانات غير مكتملة" });

  const attachment_path = req.file ? `/uploads/${req.file.filename}` : null;

  db.prepare(`
    INSERT INTO services (platform_id, name, start_date, end_date, attachment_path, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(platform_id, name, start_date || null, end_date || null, attachment_path, req.user.id);

  res.json({ message: "تمت إضافة الخدمة" });
});

// DELETE SERVICE
app.delete("/api/services/:id", auth(["admin"]), (req, res) => {
  db.prepare("DELETE FROM services WHERE id = ?").run(req.params.id);
  res.json({ message: "تم حذف الخدمة" });
});

// ================== USERS ==================

// CREATE USER
app.post("/api/users", auth(["admin"]), (req, res) => {
  const schema = z.object({
    username: z.string().min(3),
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["viewer", "entry", "admin"]),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: "Invalid data" });

  const { username, name, email, password, role } = parsed.data;

  const hash = bcrypt.hashSync(password, 10);

  try {
    db.prepare(`
      INSERT INTO users (username, name, email, password, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(username, name, email, hash, role);

    res.json({ message: "User created" });
  } catch {
    res.status(400).json({ message: "Email exists" });
  }
});

// LIST USERS
app.get("/api/users", auth(["admin"]), (req, res) => {
  const users = db.prepare(`
    SELECT id, name, email, role, created_at
    FROM users
    ORDER BY id DESC
  `).all();

  res.json(users);
});

// DELETE USER
app.delete("/api/users/:id", auth(["admin"]), (req, res) => {
  db.prepare("DELETE FROM users WHERE id = ?")
    .run(req.params.id);

  res.json({ message: "User deleted" });
});

// ================== STATIC SERVING ==================
const frontendDist = path.join(__dirname, "..", "frontend", "dist");

app.use(express.static(frontendDist));

app.get(/.*/, (req, res) => {
  // If request is for an API or upload, let it pass (though static should handle file requests first)
  if (req.url.startsWith("/api") || req.url.startsWith("/uploads")) {
    return;
  }
  res.sendFile(path.join(frontendDist, "index.html"));
});

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: process.env.NODE_ENV === "production"
      ? "حدث خطأ داخلي في الخادم"
      : err.message
  });
});

// ================== START ==================
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
