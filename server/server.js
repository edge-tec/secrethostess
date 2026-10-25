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
const ADMIN_SECRET = process.env.ADMIN_SECRET || "admin123";

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

  // 3. Admin API: List all keys
  if (req.method === "POST" && cleanPath === "/api/admin/list") {
    try {
      const body = await parseJsonBody(req);
      if (body.adminSecret !== ADMIN_SECRET) {
        return sendJson(res, 401, { success: false, message: "Unauthorized: Invalid Admin Secret." });
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
      if (body.adminSecret !== ADMIN_SECRET) {
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
      if (body.adminSecret !== ADMIN_SECRET) {
        return sendJson(res, 401, { success: false, message: "Unauthorized." });
      }

      const key = body.key;
      const db = loadDatabase();
      const record = db.keys[key];

      if (!record) {
        return sendJson(res, 404, { success: false, message: "Key not found." });
      }

      // Add credits
      if (body.addCredits) {
        record.totalCredits += parseInt(body.addCredits, 10);
      }
      if (body.setCredits !== undefined) {
        record.totalCredits = parseInt(body.setCredits, 10);
        record.usedCredits = 0;
      }

      // Extend days
      if (body.addDays) {
        const curExp = new Date(record.expiresAt);
        const base = curExp.getTime() > Date.now() ? curExp : new Date();
        base.setDate(base.getDate() + parseInt(body.addDays, 10));
        record.expiresAt = base.toISOString();
      }

      // Toggle active status
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
      if (body.adminSecret !== ADMIN_SECRET) {
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
  <div class="container">
    <div class="header">
      <div class="brand">
        <div class="brand-logo">SH</div>
        <div>
          <h1>SecretHostess Auto Poster - License Admin</h1>
          <p class="sub">Manage Client License Keys, Validity (1 Month default), and Post Credits</p>
        </div>
      </div>
      <div>
        <label for="adminSecretInput" style="display:block;margin-bottom:4px;">Admin Secret:</label>
        <input type="password" id="adminSecretInput" value="admin123" placeholder="Enter admin password">
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
    const secretInput = document.getElementById('adminSecretInput');
    const tableBody = document.getElementById('keysTableBody');

    async function fetchKeys() {
      try {
        const res = await fetch('/api/admin/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminSecret: secretInput.value.trim() })
        });
        const data = await res.json();
        if (!data.success) {
          tableBody.innerHTML = '<tr><td colspan="7" style="color:var(--red);text-align:center;padding:20px;">' + (data.message || 'Error loading') + '</td></tr>';
          return;
        }

        renderKeys(data.keys || []);
      } catch (err) {
        tableBody.innerHTML = '<tr><td colspan="7" style="color:var(--red);text-align:center;padding:20px;">Server connection error: ' + err.message + '</td></tr>';
      }
    }

    function renderKeys(keys) {
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
          adminSecret: secretInput.value.trim(),
          clientName: name,
          validityDays: days,
          credits,
          isUnlimited
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('License Key Created Successfully!\\nKey: ' + data.record.key);
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
          adminSecret: secretInput.value.trim(),
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
          adminSecret: secretInput.value.trim(),
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
          adminSecret: secretInput.value.trim(),
          key
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchKeys();
      }
    };

    document.getElementById('refreshBtn').addEventListener('click', fetchKeys);
    secretInput.addEventListener('change', fetchKeys);
    fetchKeys();
  </script>
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
