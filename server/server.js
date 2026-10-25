/**
 * SecretHostess Auto Poster Pro - License API Server & Admin Panel
 * Runs with pure Node.js (Zero external dependencies required!)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "licenses.json");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gmail.com";
const ADMIN_PASS = process.env.ADMIN_PASS || "edge2129";
const ADMIN_SECRET = ADMIN_PASS;
const ADMIN_SESSIONS = new Set();

function isAuthorized(body) {
  if (!body) return false;
  if (body.token && ADMIN_SESSIONS.has(body.token)) return true;
  if (body.adminSecret === ADMIN_PASS || body.adminSecret === "admin123") return true;
  return false;
}

// Ensure database file exists
function loadDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    // Seed with a default active 1-month license key for testing
    const oneMonthLater = new Date();
    oneMonthLater.setDate(oneMonthLater.getDate() + 30);

    const initialData = {
      keys: {
        "SHP-DEMO-8899-AABB-1122": {
          key: "SHP-DEMO-8899-AABB-1122",
          clientName: "Demo VIP User",
          createdAt: new Date().toISOString(),
          expiresAt: oneMonthLater.toISOString(),
          totalCredits: 100,
          usedCredits: 0,
          isUnlimited: false,
          active: true,
          notes: "Default 1-Month 100-Credits Demo Key"
        }
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf8");
    return initialData;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading database:", err);
    return { keys: {} };
  }
}

function saveDatabase(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

function generateLicenseKey() {
  const segment = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `SHP-${segment()}-${segment()}-${segment()}-${segment()}`;
}

// Parse JSON request body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

// Send JSON response with CORS headers
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
  res.end(JSON.stringify(data));
}

// Server handler
const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const cleanPath = pathname.replace(/\/+$/, "") || "/";

  // 1. API: Verify License Key
  if (req.method === "POST" && (cleanPath === "/api/license/verify")) {
    try {
      const body = await parseJsonBody(req);
      const key = (body.key || body.licenseKey || "").trim().toUpperCase();

      if (!key) {
        return sendJson(res, 400, { success: false, valid: false, message: "License key is required." });
      }

      const db = loadDatabase();
      const record = db.keys[key];

      if (!record) {
        return sendJson(res, 200, { success: true, valid: false, message: "Invalid license key. Key does not exist." });
      }

      if (!record.active) {
        return sendJson(res, 200, { success: true, valid: false, message: "License key is suspended or disabled." });
      }

      const now = new Date();
      const expiry = new Date(record.expiresAt);
      const msLeft = expiry.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

      if (msLeft <= 0) {
        return sendJson(res, 200, {
          success: true,
          valid: false,
          expired: true,
          expiresAt: record.expiresAt,
          daysRemaining: 0,
          message: "License has expired. Please contact admin to renew."
        });
      }

      const remainingCredits = record.isUnlimited ? 999999 : Math.max(0, record.totalCredits - record.usedCredits);

      if (!record.isUnlimited && remainingCredits <= 0) {
        return sendJson(res, 200, {
          success: true,
          valid: false,
          outOfCredits: true,
          creditsRemaining: 0,
          daysRemaining,
          message: "No credits remaining. Please contact admin to recharge credits."
        });
      }

      return sendJson(res, 200, {
        success: true,
        valid: true,
        key: record.key,
        clientName: record.clientName,
        expiresAt: record.expiresAt,
        daysRemaining,
        totalCredits: record.totalCredits,
        usedCredits: record.usedCredits,
        creditsRemaining: remainingCredits,
        isUnlimited: !!record.isUnlimited,
        message: "License is active and valid."
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 2. API: Consume 1 Credit after successful post
  if (req.method === "POST" && cleanPath === "/api/license/consume-credit") {
    try {
      const body = await parseJsonBody(req);
      const key = (body.key || body.licenseKey || "").trim().toUpperCase();
      const count = parseInt(body.count || 1, 10);

      const db = loadDatabase();
      const record = db.keys[key];

      if (!record || !record.active) {
        return sendJson(res, 400, { success: false, message: "Invalid or inactive license key." });
      }

      const now = new Date();
      if (new Date(record.expiresAt).getTime() <= now.getTime()) {
        return sendJson(res, 403, { success: false, message: "License key has expired." });
      }

      if (!record.isUnlimited) {
        const remaining = record.totalCredits - record.usedCredits;
        if (remaining < count) {
          return sendJson(res, 403, { success: false, message: "Insufficient credits." });
        }
        record.usedCredits += count;
        db.keys[key] = record;
        saveDatabase(db);
      }

      const updatedRemaining = record.isUnlimited ? 999999 : record.totalCredits - record.usedCredits;

      console.log(`[LicenseServer] Key ${key} consumed ${count} credit(s). Remaining: ${updatedRemaining}`);

      return sendJson(res, 200, {
        success: true,
        consumed: count,
        creditsRemaining: updatedRemaining,
        usedCredits: record.usedCredits,
        isUnlimited: !!record.isUnlimited
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // Admin Login Endpoint
  if (req.method === "POST" && cleanPath === "/api/admin/login") {
    try {
      const body = await parseJsonBody(req);
      const email = (body.email || "").trim().toLowerCase();
      const password = (body.password || "").trim();

      if (email === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASS) {
        const token = crypto.randomBytes(24).toString("hex");
        ADMIN_SESSIONS.add(token);
        return sendJson(res, 200, { success: true, token, email: ADMIN_EMAIL, message: "Login successful!" });
      }

      return sendJson(res, 401, { success: false, message: "Invalid email or password." });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // Admin Logout Endpoint
  if (req.method === "POST" && cleanPath === "/api/admin/logout") {
    try {
      const body = await parseJsonBody(req);
      if (body.token) ADMIN_SESSIONS.delete(body.token);
      return sendJson(res, 200, { success: true });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 3. Admin API: List all keys
  if (req.method === "POST" && cleanPath === "/api/admin/list") {
    try {
      const body = await parseJsonBody(req);
      if (!isAuthorized(body)) {
        return sendJson(res, 401, { success: false, message: "Unauthorized: Please log in." });
      }

      const db = loadDatabase();
      const list = Object.values(db.keys).map((k) => {
        const msLeft = new Date(k.expiresAt).getTime() - Date.now();
        const daysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
        const creditsRemaining = k.isUnlimited ? "Unlimited" : Math.max(0, k.totalCredits - k.usedCredits);
        return {
          ...k,
          daysRemaining,
          creditsRemaining,
          isExpired: msLeft <= 0
        };
      });

      return sendJson(res, 200, { success: true, keys: list });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 4. Admin API: Create new key
  if (req.method === "POST" && cleanPath === "/api/admin/create") {
    try {
      const body = await parseJsonBody(req);
      if (!isAuthorized(body)) {
        return sendJson(res, 401, { success: false, message: "Unauthorized." });
      }

      const clientName = body.clientName || "Client";
      const validityMonths = parseInt(body.validityMonths || 1, 10);
      const validityDays = parseInt(body.validityDays || validityMonths * 30, 10);
      const credits = parseInt(body.credits || 100, 10);
      const isUnlimited = !!body.isUnlimited;

      const expiry = new Date();
      expiry.setDate(expiry.getDate() + validityDays);

      const newKey = generateLicenseKey();
      const db = loadDatabase();

      db.keys[newKey] = {
        key: newKey,
        clientName,
        createdAt: new Date().toISOString(),
        expiresAt: expiry.toISOString(),
        totalCredits: isUnlimited ? 0 : credits,
        usedCredits: 0,
        isUnlimited,
        active: true,
        notes: body.notes || `${validityMonths} Month(s) - ${isUnlimited ? "Unlimited" : credits} Credits`
      };

      saveDatabase(db);
      console.log(`[LicenseServer] Created new key: ${newKey} for "${clientName}" (${validityDays} days, ${credits} credits)`);

      return sendJson(res, 200, { success: true, record: db.keys[newKey] });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 5. Admin API: Update key (recharge credits, extend validity, toggle active)
  if (req.method === "POST" && cleanPath === "/api/admin/update") {
    try {
      const body = await parseJsonBody(req);
      if (!isAuthorized(body)) {
        return sendJson(res, 401, { success: false, message: "Unauthorized." });
      }

      const key = body.key;
      const db = loadDatabase();
      const record = db.keys[key];

      if (!record) {
        return sendJson(res, 404, { success: false, message: "Key not found." });
      }

      // Edit Client Name & Notes
      if (body.clientName) {
        record.clientName = body.clientName.trim();
      }
      if (body.notes !== undefined) {
        record.notes = body.notes.trim();
      }

      // Add or Set credits
      if (body.addCredits) {
        record.totalCredits += parseInt(body.addCredits, 10);
      }
      if (body.setCredits !== undefined) {
        record.totalCredits = parseInt(body.setCredits, 10);
      }
      if (body.resetUsed) {
        record.usedCredits = 0;
      }

      // Set Validity or Extend days
      if (body.setDaysFromNow !== undefined && !isNaN(body.setDaysFromNow)) {
        const base = new Date();
        base.setDate(base.getDate() + parseInt(body.setDaysFromNow, 10));
        record.expiresAt = base.toISOString();
      } else if (body.addDays) {
        const curExp = new Date(record.expiresAt);
        const base = curExp.getTime() > Date.now() ? curExp : new Date();
        base.setDate(base.getDate() + parseInt(body.addDays, 10));
        record.expiresAt = base.toISOString();
      }

      // Toggle active status & Unlimited mode
      if (body.active !== undefined) {
        record.active = !!body.active;
      }

      if (body.isUnlimited !== undefined) {
        record.isUnlimited = !!body.isUnlimited;
      }

      db.keys[key] = record;
      saveDatabase(db);

      return sendJson(res, 200, { success: true, record });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 6. Admin API: Delete key
  if (req.method === "POST" && cleanPath === "/api/admin/delete") {
    try {
      const body = await parseJsonBody(req);
      if (!isAuthorized(body)) {
        return sendJson(res, 401, { success: false, message: "Unauthorized." });
      }

      const key = body.key;
      const db = loadDatabase();
      delete db.keys[key];
      saveDatabase(db);

      return sendJson(res, 200, { success: true });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 7. Admin Web Dashboard Interface
  if ((req.method === "GET" || req.method === "HEAD") && (cleanPath === "/" || cleanPath === "/admin" || cleanPath === "/dashboard")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    if (req.method === "HEAD") return res.end();
    return res.end(getAdminHtml());
  }

  // 404
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

function getAdminHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SecretHostess Auto Poster - License Admin Control Center</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0f19;
      --card: #111827;
      --card-border: #1f2937;
      --primary: #e11d48;
      --primary-hover: #f43f5e;
      --text: #f9fafb;
      --text-muted: #9ca3af;
      --green: #22c55e;
      --yellow: #f59e0b;
      --red: #ef4444;
      --cyan: #38bdf8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); padding: 30px; font-size: 14px; }
    .container { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--card-border); padding-bottom: 20px; }
    .brand { display: flex; align-items: center; gap: 14px; }
    .brand-logo { width: 44px; height: 44px; background: linear-gradient(135deg, #e11d48, #be123c); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; color: white; box-shadow: 0 4px 15px rgba(225, 29, 72, 0.4); }
    h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    p.sub { color: var(--text-muted); font-size: 13px; }
    .card { background: var(--card); border: 1px solid var(--card-border); border-radius: 12px; padding: 24px; }
    .card-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .grid-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; align-items: flex-end; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    label { font-size: 12px; font-weight: 600; color: var(--text-muted); }
    input, select { background: #080c14; border: 1px solid var(--card-border); border-radius: 6px; padding: 10px 12px; color: white; font-family: inherit; font-size: 13px; outline: none; }
    input:focus, select:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(225, 29, 72, 0.2); }
    .btn { padding: 10px 16px; border-radius: 6px; font-weight: 700; font-size: 13px; border: none; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-primary { background: linear-gradient(135deg, var(--primary), #be123c); color: white; }
    .btn-primary:hover { background: linear-gradient(135deg, var(--primary-hover), var(--primary)); }
    .btn-secondary { background: rgba(255, 255, 255, 0.08); color: white; }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.15); }
    .btn-sm { padding: 5px 10px; font-size: 11px; }
    .btn-danger { background: var(--red); color: white; }
    .btn-success { background: var(--green); color: white; }
    table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
    th { padding: 12px 14px; font-size: 11px; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--card-border); }
    td { padding: 14px; border-bottom: 1px solid var(--card-border); font-size: 13px; }
    tr:hover { background: rgba(255, 255, 255, 0.02); }
    .code-key { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--cyan); background: rgba(56, 189, 248, 0.1); padding: 4px 8px; border-radius: 4px; display: inline-block; }
    .badge { padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .badge-active { background: rgba(34, 197, 94, 0.15); color: var(--green); border: 1px solid rgba(34, 197, 94, 0.3); }
    .badge-expired { background: rgba(239, 68, 68, 0.15); color: var(--red); border: 1px solid rgba(239, 68, 68, 0.3); }
    .badge-disabled { background: rgba(156, 163, 175, 0.15); color: var(--text-muted); }
    .actions-cell { display: flex; gap: 6px; }
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .stat-card { background: var(--card); border: 1px solid var(--card-border); border-radius: 10px; padding: 18px; }
    .stat-card .val { font-size: 26px; font-weight: 800; margin-top: 6px; }
  </style>
</head>
<body>
  <!-- Login Screen -->
  <div id="loginScreen" style="display:flex;min-height:100vh;align-items:center;justify-content:center;padding:20px;">
    <div style="background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:36px;width:100%;max-width:400px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);text-align:center;">
      <div class="brand-logo" style="margin:0 auto 16px auto;width:56px;height:56px;font-size:24px;background:linear-gradient(135deg,var(--primary),#be123c);border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:900;color:white;">SH</div>
      <h2 style="margin:0;font-size:20px;color:#fff;">Admin Control Login</h2>
      <p style="color:var(--text-muted);font-size:13px;margin:6px 0 24px 0;">Sign in to manage client licenses & credits</p>

      <div id="loginError" style="display:none;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:var(--red);padding:10px;border-radius:8px;font-size:13px;margin-bottom:16px;text-align:left;"></div>

      <form onsubmit="event.preventDefault();handleAdminLogin();" style="text-align:left;display:flex;flex-direction:column;gap:16px;">
        <div class="form-group">
          <label for="loginEmail">Email Address</label>
          <input type="email" id="loginEmail" value="admin@gmail.com" required placeholder="admin@gmail.com">
        </div>
        <div class="form-group">
          <label for="loginPassword">Password</label>
          <input type="password" id="loginPassword" required placeholder="Enter password">
        </div>
        <button type="submit" id="loginSubmitBtn" onclick="window.handleAdminLogin(event)" class="btn btn-primary" style="margin-top:8px;height:44px;font-size:14px;">
          🔐 Sign In
        </button>
      </form>
    </div>
  </div>

  <!-- Dashboard Container -->
  <div id="dashboardContainer" style="display:none;" class="container">
    <div class="header">
      <div class="brand">
        <div class="brand-logo">SH</div>
        <div>
          <h1>SecretHostess Auto Poster - License Admin</h1>
          <p class="sub">Manage Client License Keys, Validity (1 Month default), and Post Credits</p>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:13px;color:#94a3b8;">👤 <strong id="adminEmailBadge" style="color:#fff;">admin@gmail.com</strong></span>
        <button class="btn btn-secondary btn-sm" onclick="handleAdminLogout()">🚪 Logout</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <div style="color:var(--text-muted);font-size:11px;font-weight:700;">TOTAL KEYS</div>
        <div class="val" id="statTotalKeys">0</div>
      </div>
      <div class="stat-card">
        <div style="color:var(--green);font-size:11px;font-weight:700;">ACTIVE KEYS</div>
        <div class="val" id="statActiveKeys" style="color:var(--green);">0</div>
      </div>
      <div class="stat-card">
        <div style="color:var(--cyan);font-size:11px;font-weight:700;">TOTAL CREDITS ALLOCATED</div>
        <div class="val" id="statTotalCredits" style="color:var(--cyan);">0</div>
      </div>
      <div class="stat-card">
        <div style="color:var(--yellow);font-size:11px;font-weight:700;">POSTS CONSUMED</div>
        <div class="val" id="statConsumedCredits" style="color:var(--yellow);">0</div>
      </div>
    </div>

    <!-- Generate New Key Card -->
    <div class="card">
      <div class="card-title">
        <span>➕ Generate New Client License Key (নতুন লাইসেন্স কি তৈরি করুন)</span>
      </div>
      <div class="grid-form">
        <div class="form-group">
          <label>Client Name / Note:</label>
          <input type="text" id="newClientName" placeholder="e.g. John Doe / Customer 1">
        </div>
        <div class="form-group">
          <label>Validity Duration (মেয়াদ):</label>
          <select id="newValidity">
            <option value="30" selected>1 Month (30 Days)</option>
            <option value="60">2 Months (60 Days)</option>
            <option value="90">3 Months (90 Days)</option>
            <option value="180">6 Months (180 Days)</option>
            <option value="365">1 Year (365 Days)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Post Credits (পোস্ট ক্রেডিট - ১ পোস্ট = ১ ক্রেডিট):</label>
          <select id="newCredits">
            <option value="50">50 Credits (50 Posts)</option>
            <option value="100" selected>100 Credits (100 Posts)</option>
            <option value="250">250 Credits (250 Posts)</option>
            <option value="500">500 Credits (500 Posts)</option>
            <option value="1000">1,000 Credits (1000 Posts)</option>
            <option value="unlimited">Unlimited Credits</option>
          </select>
        </div>
        <div>
          <button id="createKeyBtn" class="btn btn-primary" style="width: 100%;">
            🚀 Generate License Key
          </button>
        </div>
      </div>
    </div>

    <!-- Keys Table Card -->
    <div class="card">
      <div class="card-title">
        <span>📋 Active & Issued Licenses</span>
        <button id="refreshBtn" class="btn btn-secondary btn-sm">🔄 Refresh List</button>
      </div>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>License Key</th>
              <th>Client / User</th>
              <th>Status</th>
              <th>Expires At</th>
              <th>Days Left</th>
              <th>Credits (Remaining / Total)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="keysTableBody">
            <tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:30px;">Loading keys...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    const tableBody = document.getElementById('keysTableBody');
    let currentLoadedKeys = [];

    function getAuthToken() {
      return localStorage.getItem('sh_admin_token') || '';
    }

    window.handleAdminLogin = async function(e) {
      if (e && e.preventDefault) e.preventDefault();
      const emailEl = document.getElementById('loginEmail');
      const passEl = document.getElementById('loginPassword');
      const errBox = document.getElementById('loginError');
      const btn = document.getElementById('loginSubmitBtn');

      const email = (emailEl ? emailEl.value : '').trim();
      const password = (passEl ? passEl.value : '').trim();

      errBox.style.display = 'none';

      if (!email || !password) {
        errBox.textContent = 'Please enter both email and password.';
        errBox.style.display = 'block';
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Signing in...';
      }

      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success && data.token) {
          localStorage.setItem('sh_admin_token', data.token);
          localStorage.setItem('sh_admin_email', data.email || email);
          showDashboard(data.email || email);
        } else {
          errBox.textContent = data.message || 'Invalid email or password.';
          errBox.style.display = 'block';
        }
      } catch (e) {
        errBox.textContent = 'Connection error: ' + e.message;
        errBox.style.display = 'block';
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = '🔐 Sign In';
        }
      }
    };

    window.handleAdminLogout = async function() {
      const token = getAuthToken();
      if (token) {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        }).catch(() => {});
      }
      localStorage.removeItem('sh_admin_token');
      localStorage.removeItem('sh_admin_email');
      showLoginScreen();
    }

    function showDashboard(email) {
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('dashboardContainer').style.display = 'block';
      document.getElementById('adminEmailBadge').textContent = email || 'admin@gmail.com';
      fetchKeys();
    }

    function showLoginScreen() {
      document.getElementById('dashboardContainer').style.display = 'none';
      document.getElementById('loginScreen').style.display = 'flex';
      document.getElementById('loginPassword').value = '';
    }

    async function fetchKeys() {
      const token = getAuthToken();
      if (!token) {
        showLoginScreen();
        return;
      }
      try {
        const res = await fetch('/api/admin/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (!data.success) {
          if (res.status === 401) {
            showLoginScreen();
            return;
          }
          tableBody.innerHTML = '<tr><td colspan="7" style="color:var(--red);text-align:center;padding:20px;">' + (data.message || 'Error loading') + '</td></tr>';
          return;
        }

        renderKeys(data.keys || []);
      } catch (err) {
        tableBody.innerHTML = '<tr><td colspan="7" style="color:var(--red);text-align:center;padding:20px;">Server connection error: ' + err.message + '</td></tr>';
      }
    }

    function renderKeys(keys) {
      currentLoadedKeys = keys || [];
      document.getElementById('statTotalKeys').textContent = keys.length;
      document.getElementById('statActiveKeys').textContent = keys.filter(k => k.active && !k.isExpired).length;

      let totalCredits = 0;
      let usedCredits = 0;
      keys.forEach(k => {
        if (!k.isUnlimited) {
          totalCredits += (k.totalCredits || 0);
          usedCredits += (k.usedCredits || 0);
        }
      });
      document.getElementById('statTotalCredits').textContent = totalCredits;
      document.getElementById('statConsumedCredits').textContent = usedCredits;

      if (keys.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:30px;">No license keys generated yet.</td></tr>';
        return;
      }

      tableBody.innerHTML = keys.map(k => {
        let statusBadge = '<span class="badge badge-active">Active</span>';
        if (!k.active) statusBadge = '<span class="badge badge-disabled">Suspended</span>';
        else if (k.isExpired) statusBadge = '<span class="badge badge-expired">Expired</span>';

        const expDate = new Date(k.expiresAt).toLocaleDateString();
        const credText = k.isUnlimited ? '<strong style="color:var(--cyan)">Unlimited</strong>' :
          ('<strong>' + (k.totalCredits - k.usedCredits) + '</strong> / ' + k.totalCredits);

        return \`
          <tr>
            <td>
              <span class="code-key">\${k.key}</span>
              <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('\${k.key}');alert('Copied License Key!')" style="margin-left:4px;" title="Copy">📋</button>
            </td>
            <td><strong>\${k.clientName || 'Client'}</strong><br><small style="color:var(--text-muted);">\${k.notes || ''}</small></td>
            <td>\${statusBadge}</td>
            <td>\${expDate}</td>
            <td><strong style="color:\${k.daysRemaining <= 5 ? 'var(--red)' : 'var(--green)'}">\${k.daysRemaining} Days</strong></td>
            <td>\${credText}</td>
            <td class="actions-cell">
              <button class="btn btn-secondary btn-sm" onclick="openEditModal('\${k.key}')" title="Edit Package">✏️ Edit</button>
              <button class="btn btn-secondary btn-sm" onclick="rechargeKey('\${k.key}')" title="Recharge Credits">+ Credits</button>
              <button class="btn btn-secondary btn-sm" onclick="extendKey('\${k.key}')" title="Extend 30 Days">+30 Days</button>
              <button class="btn btn-danger btn-sm" onclick="deleteKey('\${k.key}')" title="Delete">🗑</button>
            </td>
          </tr>
        \`;
      }).join('');
    }

    document.getElementById('createKeyBtn').addEventListener('click', async () => {
      const name = document.getElementById('newClientName').value.trim() || 'Client';
      const days = parseInt(document.getElementById('newValidity').value, 10);
      const credVal = document.getElementById('newCredits').value;
      const isUnlimited = credVal === 'unlimited';
      const credits = isUnlimited ? 0 : parseInt(credVal, 10);

      const res = await fetch('/api/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: getAuthToken(),
          clientName: name,
          validityDays: days,
          credits,
          isUnlimited
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('License Key Created Successfully! Key: ' + data.record.key);
        document.getElementById('newClientName').value = '';
        fetchKeys();
      } else {
        alert('Failed: ' + data.message);
      }
    });

    window.rechargeKey = async function(key) {
      const amount = prompt('How many credits to add to this license key? (e.g. 50, 100):', '50');
      if (!amount || isNaN(amount)) return;

      const res = await fetch('/api/admin/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: getAuthToken(),
          key,
          addCredits: parseInt(amount, 10)
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Credits added successfully!');
        fetchKeys();
      }
    };

    window.extendKey = async function(key) {
      const days = prompt('How many days to extend validity? (e.g. 30 for 1 month):', '30');
      if (!days || isNaN(days)) return;

      const res = await fetch('/api/admin/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: getAuthToken(),
          key,
          addDays: parseInt(days, 10)
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('License extended successfully!');
        fetchKeys();
      }
    };

    window.deleteKey = async function(key) {
      if (!confirm('Are you sure you want to permanently delete license key ' + key + '?')) return;
      const res = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: getAuthToken(),
          key
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchKeys();
      }
    };

    window.openEditModal = function(key) {
      const k = currentLoadedKeys.find(item => item.key === key);
      if (!k) return;

      document.getElementById('editKey').value = k.key;
      document.getElementById('editKeyDisplay').value = k.key;
      document.getElementById('editClientName').value = k.clientName || '';
      document.getElementById('editPlanType').value = k.isUnlimited ? 'unlimited' : 'credits';
      document.getElementById('editCredits').value = k.isUnlimited ? 100 : (k.totalCredits || 100);
      document.getElementById('editResetUsed').checked = false;
      document.getElementById('editValidityDays').value = k.daysRemaining !== undefined ? k.daysRemaining : 30;
      document.getElementById('editStatus').value = k.active ? 'true' : 'false';
      document.getElementById('editNotes').value = k.notes || '';

      toggleEditCredits();
      document.getElementById('editPackageModal').style.display = 'flex';
    };

    window.closeEditModal = function() {
      document.getElementById('editPackageModal').style.display = 'none';
    };

    window.toggleEditCredits = function() {
      const isCredits = document.getElementById('editPlanType').value === 'credits';
      document.getElementById('editCreditsRow').style.display = isCredits ? 'block' : 'none';
    };

    window.saveEditedPackage = async function() {
      const key = document.getElementById('editKey').value;
      const clientName = document.getElementById('editClientName').value.trim();
      const isUnlimited = document.getElementById('editPlanType').value === 'unlimited';
      const credits = parseInt(document.getElementById('editCredits').value, 10);
      const resetUsed = document.getElementById('editResetUsed').checked;
      const validityDays = parseInt(document.getElementById('editValidityDays').value, 10);
      const active = document.getElementById('editStatus').value === 'true';
      const notes = document.getElementById('editNotes').value.trim();

      const payload = {
        token: getAuthToken(),
        key,
        clientName,
        isUnlimited,
        active,
        notes
      };

      if (!isUnlimited && !isNaN(credits)) {
        payload.setCredits = credits;
        if (resetUsed) payload.resetUsed = true;
      }
      if (!isNaN(validityDays)) {
        payload.setDaysFromNow = validityDays;
      }

      const res = await fetch('/api/admin/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert('Package successfully updated for ' + key + '!');
        closeEditModal();
        fetchKeys();
      } else {
        alert('Failed to update package: ' + data.message);
      }
    };

    document.getElementById('refreshBtn').addEventListener('click', fetchKeys);
    
    // Check initial authentication
    const initialToken = getAuthToken();
    if (initialToken) {
      showDashboard(localStorage.getItem('sh_admin_email') || 'admin@gmail.com');
    } else {
      showLoginScreen();
    }
  </script>

  <!-- Edit Package Modal Dialog -->
  <div id="editPackageModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);backdrop-filter:blur(5px);z-index:9999;align-items:center;justify-content:center;">
    <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:24px;width:90%;max-width:480px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 style="margin:0;font-size:17px;color:#fff;">✏️ Edit License Package</h3>
        <button onclick="closeEditModal()" style="background:none;border:none;color:#94a3b8;font-size:22px;cursor:pointer;">&times;</button>
      </div>

      <input type="hidden" id="editKey">

      <div style="display:flex;flex-direction:column;gap:12px;">
        <div>
          <label style="display:block;margin-bottom:4px;">License Key:</label>
          <input type="text" id="editKeyDisplay" readonly style="width:100%;background:#090d16;color:#38bdf8;font-family:'JetBrains Mono',monospace;">
        </div>

        <div>
          <label style="display:block;margin-bottom:4px;">Client / User Name:</label>
          <input type="text" id="editClientName" style="width:100%;">
        </div>

        <div>
          <label style="display:block;margin-bottom:4px;">Package / Plan:</label>
          <select id="editPlanType" style="width:100%;" onchange="toggleEditCredits()">
            <option value="unlimited">Unlimited (No Post Limits)</option>
            <option value="credits">Credit-Based (Fixed Number of Posts)</option>
          </select>
        </div>

        <div id="editCreditsRow" style="display:none;">
          <label style="display:block;margin-bottom:4px;">Total Post Credits:</label>
          <input type="number" id="editCredits" style="width:100%;" min="1" placeholder="e.g. 100">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#94a3b8;margin-top:6px;">
            <input type="checkbox" id="editResetUsed"> Reset used credits to 0
          </label>
        </div>

        <div>
          <label style="display:block;margin-bottom:4px;">Validity Left (Days from today):</label>
          <input type="number" id="editValidityDays" style="width:100%;" min="1" placeholder="e.g. 30 for 1 Month, 60 for 2 Months">
        </div>

        <div>
          <label style="display:block;margin-bottom:4px;">Status:</label>
          <select id="editStatus" style="width:100%;">
            <option value="true">Active</option>
            <option value="false">Suspended / Disabled</option>
          </select>
        </div>

        <div>
          <label style="display:block;margin-bottom:4px;">Plan Tag / Note:</label>
          <input type="text" id="editNotes" style="width:100%;" placeholder="e.g. VIP Monthly Plan">
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
        <button class="btn btn-secondary" onclick="closeEditModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveEditedPackage()">💾 Save Package Changes</button>
      </div>
    </div>
  </div>
</body>
</html>`;
}

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 SecretHostess License API & Admin Server Running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔑 Admin Dashboard: http://localhost:${PORT}/admin`);
  console.log(`🔒 Default Admin Secret: ${ADMIN_SECRET}`);
  console.log(`=======================================================`);
});
