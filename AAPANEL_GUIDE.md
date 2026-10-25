# 🌐 aaPanel Deployment Guide - SecretHostess License API & Admin Server

This guide explains step-by-step how to host the **SecretHostess License & Credit Management Server** on **aaPanel** with SSL (`https://`).

---

## 📋 Prerequisites
1. An active server with **aaPanel** installed (Ubuntu/Debian/CentOS).
2. Domain pointed to server IP: **`mailszo.com`** (DNS A-Record pointing to your aaPanel server IP).
3. aaPanel **Node.js Version Manager** (or **PM2 Manager**) installed from aaPanel App Store.

---

## 🚀 Step 1: Install Node.js in aaPanel
1. Log into your aaPanel dashboard.
2. Go to **App Store** on the left menu.
3. Search for **"Node.js"** and install **"Node.js version manager"** (or **"PM2 Manager"**).
4. Open the Node.js version manager and install **Node v18.x** or **Node v20.x** (LTS).
5. Set it as the default CLI command version.

---

## 📂 Step 2: Upload or Clone the Server on aaPanel

### Option A: Using Git Clone (Recommended)
1. Open aaPanel **Terminal** (or SSH into your server).
2. Run:
   ```bash
   cd /www/wwwroot
   git clone https://github.com/edge-tec/secrethostess.git
   cd secrethostess/server
   ```

### Option B: Upload via aaPanel File Manager
1. In aaPanel, go to **Files** -> `/www/wwwroot/`.
2. Create a folder named `mailszo.com` (or inside your site root).
3. Upload the contents of the `server/` directory:
   - `server.js`
   - `package.json`
   - `licenses.json`

---

## ⚙️ Step 3: Create Node Project in aaPanel

1. In aaPanel, go to **Website** -> **Node project** tab.
2. Click **"Add Node project"**.
3. Fill in the configuration:
   - **Project Name:** `mailszo-license-server`
   - **Path:** `/www/wwwroot/secrethostess/server` (or the folder where `server.js` is located)
   - **Run Opt:** `npm start` (or `server.js`)
   - **Project Port:** `3000`
   - **Node Version:** Select `v18` or `v20`
   - **Auto start at boot:** Enabled (Check/Yes)
4. Click **Submit**.

> **Note:** The server has **zero npm dependencies**, so it starts instantly without needing to run `npm install`.

---

## 🔒 Step 4: Map Domain (mailszo.com) & Setup Free SSL (HTTPS)

1. In the Node project list, click **"Domain"** next to `mailszo-license-server`.
2. Add your domain name:
   - `mailszo.com`
   - `www.mailszo.com`
3. Click **Submit**.
4. Go to the project settings -> **SSL** tab:
   - Select **Let's Encrypt**.
   - Check `mailszo.com` and `www.mailszo.com` and click **Apply**.
   - Turn on **"Force HTTPS"**.
5. Now your license API is securely running live at:
   - **Admin Dashboard:** `https://mailszo.com/admin`
   - **Public API:** `https://mailszo.com/api/license/verify`

---

## 🛡️ Step 5: Change Admin Password

By default, the admin password is `admin123`.

To set a custom admin password on aaPanel:
1. In the aaPanel Node project settings, under **Environment variables**, add:
   ```text
   ADMIN_SECRET=your_super_secret_password_here
   ```
2. Or in terminal:
   ```bash
   export ADMIN_SECRET="your_password"
   ```
3. Restart the Node project.

---

## 🔌 Step 6: Chrome Extension is Pre-configured for mailszo.com

The Chrome Extension is already pre-configured to default to **`https://mailszo.com`**!

Your clients only need to:
1. Install/load the extension in Chrome.
2. Open **Dashboard** -> **License & Credits**.
3. Enter their License Key and click **"Activate & Verify"**.

🎉 **You're all set!** You can now manage client licenses, extend months, and recharge credits directly from:
👉 **`https://mailszo.com/admin`**
