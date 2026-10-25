/**
 * SecretHostess Auto Poster Pro - Dashboard Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
  let currentState = null;

  // DOM Elements
  const navItems = document.querySelectorAll(".nav-item");
  const tabPanes = document.querySelectorAll(".tab-pane");
  const pageTitle = document.getElementById("page-title");
  const pageSubtitle = document.getElementById("page-subtitle");
  const navCountAccounts = document.getElementById("nav-count-accounts");

  const globalPulse = document.getElementById("global-pulse");
  const globalStatusText = document.getElementById("global-status-text");
  const globalCurrInfo = document.getElementById("global-curr-info");
  const quickStartBtn = document.getElementById("quick-start-btn");
  const quickStopBtn = document.getElementById("quick-stop-btn");
  const topCityVal = document.getElementById("top-city-val");
  const saveAllBtn = document.getElementById("save-all-btn");
  const toast = document.getElementById("toast");

  // Metrics
  const metricTotal = document.getElementById("metric-total");
  const metricPending = document.getElementById("metric-pending");
  const metricCompleted = document.getElementById("metric-completed");
  const metricFailed = document.getElementById("metric-failed");

  // Accounts Tab
  const bulkAccountsInput = document.getElementById("bulk-accounts-input");
  const addBulkAccountsBtn = document.getElementById("add-bulk-accounts-btn");
  const clearAccountsInputBtn = document.getElementById("clear-accounts-input-btn");
  const resetStatusesBtn = document.getElementById("reset-statuses-btn");
  const clearAllAccountsBtn = document.getElementById("clear-all-accounts-btn");
  const accountsTbody = document.getElementById("accounts-tbody");

  // Template Form Fields
  const tmplTitle = document.getElementById("tmpl-title");
  const tmplDesc = document.getElementById("tmpl-desc");
  const tmplShortDesc = document.getElementById("tmpl-short-desc");
  const tmplAge = document.getElementById("tmpl-age");
  const tmplCategory = document.getElementById("tmpl-category");

  const tmplCountry = document.getElementById("tmpl-country");
  const tmplMobile = document.getElementById("tmpl-mobile");
  const tmplSuburb = document.getElementById("tmpl-suburb");
  const modeSeq = document.getElementById("mode-seq");
  const modeCustom = document.getElementById("mode-custom");
  const customCitiesWrapper = document.getElementById("custom-cities-wrapper");
  const tmplCustomCities = document.getElementById("tmpl-custom-cities");

  const tmplLocation = document.getElementById("tmpl-location");
  const tmplEmail = document.getElementById("tmpl-email");
  const tmplWebsite = document.getElementById("tmpl-website");
  const tmplFacebook = document.getElementById("tmpl-facebook");

  const tmplHeight = document.getElementById("tmpl-height");
  const tmplWeight = document.getElementById("tmpl-weight");
  const tmplBust = document.getElementById("tmpl-bust");
  const tmplBodyType = document.getElementById("tmpl-body-type");
  const tmplEthnicity = document.getElementById("tmpl-ethnicity");
  const tmplHair = document.getElementById("tmpl-hair");
  const tmplEye = document.getElementById("tmpl-eye");
  const tmplSkin = document.getElementById("tmpl-skin");
  const tmplDress = document.getElementById("tmpl-dress");
  const tmplBreast = document.getElementById("tmpl-breast");

  const tmplIncall = document.getElementById("tmpl-incall");
  const tmplOutcall = document.getElementById("tmpl-outcall");

  // Clients
  const clCouples = document.getElementById("cl-couples");
  const clDisabled = document.getElementById("cl-disabled");
  const clGroups = document.getElementById("cl-groups");
  const clLadies = document.getElementById("cl-ladies");
  const clMen = document.getElementById("cl-men");
  const clTrans = document.getElementById("cl-trans");

  // Services
  const srvBdsm = document.getElementById("srv-bdsm");
  const srvBodyrub = document.getElementById("srv-bodyrub");
  const srvFull = document.getElementById("srv-full");
  const srvStrip = document.getElementById("srv-strip");

  // Working Hours
  const workingHoursContainer = document.getElementById("working-hours-container");

  // Settings
  const confCityIndex = document.getElementById("conf-city-index");
  const resetCityCounterBtn = document.getElementById("reset-city-counter-btn");
  const confStepDelay = document.getElementById("conf-step-delay");
  const imgAuto = document.getElementById("img-auto");
  const imgPause = document.getElementById("img-pause");

  // Logs
  const logsContainer = document.getElementById("logs-container");
  const clearLogsBtn = document.getElementById("clear-logs-btn");

  // License Tab Elements
  const dashLicStatus = document.getElementById("dash-lic-status");
  const dashLicCredits = document.getElementById("dash-lic-credits");
  const dashLicDays = document.getElementById("dash-lic-days");
  const dashLicConsumed = document.getElementById("dash-lic-consumed");
  const licKeyInput = document.getElementById("lic-key-input");
  const licServerUrl = document.getElementById("lic-server-url");
  const verifyLicenseBtn = document.getElementById("verify-license-btn");
  const licClientName = document.getElementById("lic-client-name");
  const licExpiryText = document.getElementById("lic-expiry-text");
  const licValidPill = document.getElementById("lic-valid-pill");
  const topLicenseCredits = document.getElementById("top-license-credits");
  const topLicenseDays = document.getElementById("top-license-days");
  const navBadgeCredits = document.getElementById("nav-badge-credits");

  // Tab Title Map
  const tabMetadata = {
    "tab-accounts": {
      title: "Accounts Queue",
      subtitle: "Manage accounts, track posting progress, and run multi-city queue."
    },
    "tab-license": {
      title: "License & Credits Management",
      subtitle: "Verify license key, monitor validity expiration and post credits."
    },
    "tab-template": {
      title: "Listing Content Template",
      subtitle: "Configure form fields, appearance, contact info, and USA city rotation."
    },
    "tab-settings": {
      title: "City & Automation Settings",
      subtitle: "Customize step delays, starting city counter, and image handling."
    },
    "tab-logs": {
      title: "Activity Logs",
      subtitle: "Real-time background execution status and submission verification."
    }
  };

  // Switch Tab
  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");
      navItems.forEach((n) => n.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(targetId)?.classList.add("active");

      const meta = tabMetadata[targetId];
      if (meta) {
        pageTitle.textContent = meta.title;
        pageSubtitle.textContent = meta.subtitle;
      }

      if (targetId === "tab-license" && typeof syncLicense === "function") {
        syncLicense(false);
      }
    });
  });

  // Radio toggle for Custom Cities
  function toggleCustomCities() {
    if (modeCustom.checked) {
      customCitiesWrapper.style.display = "block";
    } else {
      customCitiesWrapper.style.display = "none";
    }
  }
  modeSeq.addEventListener("change", toggleCustomCities);
  modeCustom.addEventListener("change", toggleCustomCities);

  // Generate Working Hours Rows
  const timeOptions = [
    "00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00",
    "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
    "20:00", "21:00", "22:00", "23:00"
  ];

  function renderWorkingHours(hoursConfig = {}) {
    const days = [
      { key: "mon", label: "Mon:" },
      { key: "tue", label: "Tue:" },
      { key: "wed", label: "Wed:" },
      { key: "thu", label: "Thu:" },
      { key: "fri", label: "Fri:" },
      { key: "sat", label: "Sat:" },
      { key: "sun", label: "Sun:" }
    ];

    workingHoursContainer.innerHTML = days
      .map((day) => {
        const conf = hoursConfig[day.key] || { start: "09:00", finish: "23:00", is24Hr: false };
        const startOpts = timeOptions
          .map((t) => `<option value="${t}" ${conf.start === t ? "selected" : ""}>${t}</option>`)
          .join("");
        const finishOpts = timeOptions
          .map((t) => `<option value="${t}" ${conf.finish === t ? "selected" : ""}>${t}</option>`)
          .join("");

        return `
          <div class="hours-row" data-day="${day.key}">
            <span class="hours-day-label">${day.label}</span>
            <select class="form-select hours-start" ${conf.is24Hr ? "disabled" : ""}>${startOpts}</select>
            <select class="form-select hours-finish" ${conf.is24Hr ? "disabled" : ""}>${finishOpts}</select>
            <label class="custom-checkbox">
              <input type="checkbox" class="hours-24hr" ${conf.is24Hr ? "checked" : ""}>
              <span class="text-xs">24Hr</span>
            </label>
          </div>
        `;
      })
      .join("");

    // Toggle disables on 24hr checkbox
    workingHoursContainer.querySelectorAll(".hours-24hr").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const row = e.target.closest(".hours-row");
        const selects = row.querySelectorAll("select");
        selects.forEach((s) => (s.disabled = e.target.checked));
      });
    });
  }

  function getWorkingHoursData() {
    const data = {};
    const rows = workingHoursContainer.querySelectorAll(".hours-row");
    rows.forEach((row) => {
      const day = row.getAttribute("data-day");
      const is24Hr = row.querySelector(".hours-24hr").checked;
      const start = row.querySelector(".hours-start").value;
      const finish = row.querySelector(".hours-finish").value;
      data[day] = { start, finish, is24Hr };
    });
    return data;
  }

  // Show Toast
  function showToast(msg = "Settings Saved Successfully!") {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  // Fetch State from background
  async function loadState(isInitial = false) {
    try {
      const res = await chrome.runtime.sendMessage({ type: "GET_STATE" });
      if (!res || !res.success) return;
      currentState = res.state;

      renderGlobalStatus();
      renderAccountsTable();
      renderLogs();

      if (isInitial) {
        populateFormFromState();
      }
    } catch (err) {
      console.error("Dashboard error loading state:", err);
    }
  }

  // Populate Form Fields
  function populateFormFromState() {
    const t = currentState.template || {};

    tmplTitle.value = t.title || "";
    tmplDesc.value = t.description || "";
    tmplShortDesc.value = t.shortDescription || "";
    tmplAge.value = t.age || "26";
    tmplCategory.value = t.category || "Escorts";

    tmplCountry.value = t.country || "USA";
    tmplMobile.value = t.mobile || "";
    tmplSuburb.value = t.suburb || "";

    if (t.cityRotationMode === "custom") {
      modeCustom.checked = true;
    } else {
      modeSeq.checked = true;
    }
    toggleCustomCities();
    tmplCustomCities.value = t.customCities || "";

    tmplLocation.value = t.location || "";
    tmplEmail.value = t.email || "";
    tmplWebsite.value = t.website || "";
    tmplFacebook.value = t.facebook || "";

    tmplHeight.value = t.height || "165";
    tmplWeight.value = t.weight || "55";
    tmplBust.value = t.bustSize || "34C";
    tmplBodyType.value = t.bodyType || "Slim";
    tmplEthnicity.value = t.ethnicity || "Caucasian";
    tmplHair.value = t.hairColour || "Blonde";
    tmplEye.value = t.eyeColor || "Blue";
    tmplSkin.value = t.skinColour || "Fair";
    tmplDress.value = t.dressSize || "Small";
    tmplBreast.value = t.breastType || "Natural";

    tmplIncall.checked = !!t.inCall;
    tmplOutcall.checked = !!t.outCall;

    const cl = t.clients || {};
    clCouples.checked = !!cl.couples;
    clDisabled.checked = !!cl.disabled;
    clGroups.checked = !!cl.groupsParties;
    clLadies.checked = !!cl.ladies;
    clMen.checked = !!cl.men;
    clTrans.checked = !!cl.transsexuals;

    const srv = t.services || {};
    srvBdsm.checked = !!srv.bdsm;
    srvBodyrub.checked = !!srv.bodyRub;
    srvFull.checked = !!srv.fullService;
    srvStrip.checked = !!srv.stripDance;

    renderWorkingHours(t.workingHours);

    // Settings
    confCityIndex.value = currentState.currentCityIndex || 0;
    confStepDelay.value = currentState.stepDelaySeconds || 2;
    if (currentState.pauseForImages) {
      imgPause.checked = true;
    } else {
      imgAuto.checked = true;
    }

    // Populate License Fields
    const lic = currentState.license || {};
    licKeyInput.value = lic.key || "";
    licServerUrl.value = lic.serverUrl || "https://bot.mailszo.com";
  }

  // Render Global Status & Metrics
  function renderGlobalStatus() {
    const accounts = currentState.accounts || [];
    const total = accounts.length;
    const pending = accounts.filter((a) => a.status === "pending").length;
    const done = accounts.filter((a) => a.status === "completed").length;
    const failed = accounts.filter((a) => a.status === "failed").length;

    metricTotal.textContent = total;
    metricPending.textContent = pending;
    metricCompleted.textContent = done;
    metricFailed.textContent = failed;
    navCountAccounts.textContent = total;

    topCityVal.textContent = `USA Rotating (Index ${currentState.currentCityIndex + 1})`;

    // License Metrics Rendering
    const lic = currentState.license || {};
    const creditsLeft = lic.isUnlimited ? "Unlimited" : (lic.creditsRemaining ?? 0);
    topLicenseCredits.textContent = creditsLeft;
    topLicenseDays.textContent = `${lic.daysRemaining ?? 0}d`;

    if (dashLicStatus) {
      if (lic.isValid) {
        dashLicStatus.textContent = "Active";
        dashLicStatus.className = "metric-val text-green";
        licValidPill.className = "badge-status badge-completed";
        licValidPill.textContent = "ACTIVE";
      } else {
        dashLicStatus.textContent = "Expired / Invalid";
        dashLicStatus.className = "metric-val text-red";
        licValidPill.className = "badge-status badge-failed";
        licValidPill.textContent = "INACTIVE";
      }
      dashLicCredits.textContent = creditsLeft;
      dashLicDays.textContent = `${lic.daysRemaining ?? 0} Days`;
      dashLicConsumed.textContent = lic.isUnlimited ? "Unlimited" : `${lic.totalCredits ? lic.totalCredits - lic.creditsRemaining : 0}`;
      licClientName.textContent = `Owner: ${lic.clientName || "Client"} | Key: ${lic.key || "-"}`;
      licExpiryText.textContent = `Expires At: ${lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString() : "-"} (${lic.daysRemaining ?? 0} days remaining)`;
      navBadgeCredits.textContent = lic.isUnlimited ? "Unlimited" : `${creditsLeft} Cr`;
    }

    if (currentState.isRunning) {
      if (currentState.isPaused) {
        globalPulse.className = "pulse-dot paused";
        globalStatusText.textContent = "Status: Paused";
        quickStartBtn.textContent = "▶ Resume Queue";
        quickStartBtn.style.display = "inline-flex";
        quickStopBtn.style.display = "inline-flex";
      } else {
        globalPulse.className = "pulse-dot running";
        globalStatusText.textContent = "Status: Running";
        quickStartBtn.textContent = "⏸ Pause Queue";
        quickStartBtn.style.display = "inline-flex";
        quickStopBtn.style.display = "inline-flex";
      }
      const acc = accounts[currentState.currentAccountIndex];
      globalCurrInfo.textContent = acc ? `Posting: ${acc.username}` : "Advancing queue...";
    } else {
      globalPulse.className = "pulse-dot idle";
      globalStatusText.textContent = "Status: Idle";
      globalCurrInfo.textContent = total > 0 ? `${pending} pending in queue` : "Add accounts to start";
      quickStartBtn.textContent = "▶ Start Queue";
      quickStartBtn.style.display = "inline-flex";
      quickStopBtn.style.display = "none";
    }
  }

  // Render Accounts Table
  function renderAccountsTable() {
    const accounts = currentState.accounts || [];
    if (accounts.length === 0) {
      accountsTbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="8">No accounts in queue. Paste accounts above and click "Add to Queue".</td>
        </tr>
      `;
      return;
    }

    accountsTbody.innerHTML = accounts
      .map((acc, idx) => {
        let badgeClass = "badge-pending";
        if (acc.status === "posting") badgeClass = "badge-posting";
        if (acc.status === "completed") badgeClass = "badge-completed";
        if (acc.status === "failed") badgeClass = "badge-failed";

        return `
          <tr data-index="${idx}">
            <td><strong>#${idx + 1}</strong></td>
            <td><strong>${escapeHtml(acc.username)}</strong></td>
            <td>
              <span class="password-masked" data-pass="${escapeHtml(acc.password)}">••••••••</span>
              <button class="btn-icon toggle-pass-btn" title="Show/Hide">👁</button>
            </td>
            <td><span class="badge-status ${badgeClass}">${acc.status}</span></td>
            <td>${escapeHtml(acc.lastCity || "-")}</td>
            <td>${escapeHtml(acc.lastTime || "-")}</td>
            <td><small class="${acc.error ? "text-red" : "text-muted"}">${escapeHtml(acc.error || "Ready")}</small></td>
            <td>
              <button class="btn-icon delete-acc-btn" data-index="${idx}" title="Delete account">🗑</button>
              ${acc.status !== "pending" ? `<button class="btn-icon retry-acc-btn" data-index="${idx}" title="Reset to Pending">🔄</button>` : ""}
            </td>
          </tr>
        `;
      })
      .join("");

    // Hook delete & retry & toggle pass
    accountsTbody.querySelectorAll(".toggle-pass-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const span = e.target.previousElementSibling;
        if (span.textContent === "••••••••") {
          span.textContent = span.getAttribute("data-pass");
        } else {
          span.textContent = "••••••••";
        }
      });
    });

    accountsTbody.querySelectorAll(".delete-acc-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        currentState.accounts.splice(idx, 1);
        await chrome.runtime.sendMessage({
          type: "SAVE_SETTINGS",
          data: { accounts: currentState.accounts }
        });
        await loadState();
      });
    });

    accountsTbody.querySelectorAll(".retry-acc-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        if (currentState.accounts[idx]) {
          currentState.accounts[idx].status = "pending";
          currentState.accounts[idx].error = "";
          await chrome.runtime.sendMessage({
            type: "SAVE_SETTINGS",
            data: { accounts: currentState.accounts }
          });
          await loadState();
        }
      });
    });
  }

  // Render Logs
  function renderLogs() {
    const logs = currentState.logs || [];
    if (logs.length === 0) {
      logsContainer.innerHTML = '<div class="text-muted p-3">No activity logs recorded yet.</div>';
      return;
    }

    logsContainer.innerHTML = logs
      .map(
        (log) => `
        <div class="log-entry">
          <span class="log-time">[${log.time || ""}]</span>
          <span class="log-type ${log.type || "info"}">${log.type || "info"}</span>
          <span class="log-msg">${escapeHtml(log.message || "")}</span>
        </div>
      `
      )
      .join("");
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]);
  }

  // Add Bulk Accounts
  addBulkAccountsBtn.addEventListener("click", async () => {
    const raw = bulkAccountsInput.value.trim();
    if (!raw) return;

    const lines = raw.split("\n");
    const newAccounts = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let user = "";
      let pass = "";

      if (trimmed.includes(":")) {
        const parts = trimmed.split(":");
        user = parts[0].trim();
        pass = parts.slice(1).join(":").trim();
      } else if (trimmed.includes(",")) {
        const parts = trimmed.split(",");
        user = parts[0].trim();
        pass = parts.slice(1).join(",").trim();
      } else if (trimmed.includes("\t") || trimmed.includes(" ")) {
        const parts = trimmed.split(/[\t\s]+/);
        user = parts[0].trim();
        pass = parts.slice(1).join(" ").trim();
      }

      if (user && pass) {
        newAccounts.push({
          id: Date.now() + Math.random(),
          username: user,
          password: pass,
          status: "pending",
          lastCity: "",
          lastTime: "",
          error: ""
        });
      }
    }

    if (newAccounts.length === 0) {
      alert("No valid accounts parsed! Please format as: username:password (one per line)");
      return;
    }

    const merged = [...(currentState.accounts || []), ...newAccounts];
    await chrome.runtime.sendMessage({
      type: "SAVE_SETTINGS",
      data: { accounts: merged }
    });

    bulkAccountsInput.value = "";
    showToast(`Added ${newAccounts.length} accounts to queue!`);
    await loadState();
  });

  clearAccountsInputBtn.addEventListener("click", () => {
    bulkAccountsInput.value = "";
  });

  // Reset statuses
  resetStatusesBtn.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "RESET_STATUSES" });
    showToast("All account statuses and city index reset!");
    await loadState();
  });

  // Clear all accounts
  clearAllAccountsBtn.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to remove all accounts from queue?")) return;
    await chrome.runtime.sendMessage({
      type: "SAVE_SETTINGS",
      data: { accounts: [] }
    });
    showToast("All accounts removed.");
    await loadState();
  });

  // Save All Changes (Collect Form & Save to Storage)
  async function saveAllChanges() {
    const template = {
      title: tmplTitle.value.trim(),
      description: tmplDesc.value.trim(),
      shortDescription: tmplShortDesc.value.trim(),
      age: tmplAge.value.trim(),
      category: tmplCategory.value,
      country: tmplCountry.value,
      cityRotationMode: modeCustom.checked ? "custom" : "sequential",
      customCities: tmplCustomCities.value.trim(),
      suburb: tmplSuburb.value.trim(),
      mobile: tmplMobile.value.trim(),
      location: tmplLocation.value.trim(),
      email: tmplEmail.value.trim(),
      website: tmplWebsite.value.trim(),
      facebook: tmplFacebook.value.trim(),
      height: tmplHeight.value.trim(),
      weight: tmplWeight.value.trim(),
      bustSize: tmplBust.value,
      bodyType: tmplBodyType.value,
      ethnicity: tmplEthnicity.value,
      hairColour: tmplHair.value,
      eyeColor: tmplEye.value,
      skinColour: tmplSkin.value,
      dressSize: tmplDress.value,
      breastType: tmplBreast.value,
      inCall: tmplIncall.checked,
      outCall: tmplOutcall.checked,
      clients: {
        couples: clCouples.checked,
        disabled: clDisabled.checked,
        groupsParties: clGroups.checked,
        ladies: clLadies.checked,
        men: clMen.checked,
        transsexuals: clTrans.checked
      },
      services: {
        bdsm: srvBdsm.checked,
        bodyRub: srvBodyrub.checked,
        fullService: srvFull.checked,
        stripDance: srvStrip.checked
      },
      workingHours: getWorkingHoursData()
    };

    const updatePayload = {
      template,
      currentCityIndex: parseInt(confCityIndex.value, 10) || 0,
      stepDelaySeconds: parseInt(confStepDelay.value, 10) || 2,
      pauseForImages: imgPause.checked,
      autoProceedImages: imgAuto.checked
    };

    await chrome.runtime.sendMessage({
      type: "SAVE_SETTINGS",
      data: updatePayload
    });

    showToast("All listing & automation settings saved!");
    await loadState();
  }

  saveAllBtn.addEventListener("click", saveAllChanges);

  // Quick Queue Controls
  quickStartBtn.addEventListener("click", async () => {
    if (quickStartBtn.textContent.includes("Pause")) {
      await chrome.runtime.sendMessage({ type: "PAUSE_AUTOMATION" });
    } else if (quickStartBtn.textContent.includes("Resume")) {
      await chrome.runtime.sendMessage({ type: "RESUME_AUTOMATION" });
    } else {
      await saveAllChanges();
      const res = await chrome.runtime.sendMessage({ type: "START_AUTOMATION" });
      if (res && !res.success && res.error) {
        alert(res.error);
      }
    }
    await loadState();
  });

  quickStopBtn.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "STOP_AUTOMATION" });
    await loadState();
  });

  resetCityCounterBtn.addEventListener("click", async () => {
    confCityIndex.value = 0;
    await chrome.runtime.sendMessage({
      type: "SAVE_SETTINGS",
      data: { currentCityIndex: 0 }
    });
    showToast("City counter reset to 0 (1st City)!");
    await loadState();
  });

  clearLogsBtn.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({
      type: "SAVE_SETTINGS",
      data: { logs: [] }
    });
    await loadState();
  });

  // Verify / Activate License Button
  verifyLicenseBtn.addEventListener("click", async () => {
    const key = licKeyInput.value.trim().toUpperCase();
    const serverUrl = licServerUrl.value.trim();

    if (!key) {
      alert("Please enter a License Key!");
      return;
    }

    verifyLicenseBtn.disabled = true;
    verifyLicenseBtn.textContent = "Verifying...";

    const res = await chrome.runtime.sendMessage({
      type: "VERIFY_LICENSE",
      key,
      serverUrl
    });

    verifyLicenseBtn.disabled = false;
    verifyLicenseBtn.textContent = "🚀 Verify & Activate License Key";

    if (res && res.valid) {
      showToast(`License Activated! (${res.creditsRemaining} Credits, ${res.daysRemaining} Days)`);
    } else {
      alert(res?.message || "Invalid or Expired License Key. Please check the key or server.");
    }

    await loadState();
  });

  // Real-time License Sync Function
  let isSyncingLicense = false;
  async function syncLicense(showNotification = false) {
    if (isSyncingLicense) return;
    const key = (licKeyInput.value || "").trim().toUpperCase() || (currentState.license && currentState.license.key);
    if (!key) return;

    isSyncingLicense = true;
    const syncIcon = document.getElementById("top-sync-icon");
    if (syncIcon) syncIcon.style.animation = "spin 0.8s linear infinite";

    try {
      const res = await chrome.runtime.sendMessage({
        type: "VERIFY_LICENSE",
        key,
        serverUrl: licServerUrl.value.trim() || "https://bot.mailszo.com"
      });
      await loadState();
      if (showNotification && res) {
        if (res.valid) {
          showToast(`License Synced: ${res.isUnlimited ? "Unlimited" : res.creditsRemaining + " Credits"}, ${res.daysRemaining}d Left`);
        } else {
          showToast(res.message || "License Expired or Invalid");
        }
      }
    } catch (err) {
      console.warn("License auto-sync notice:", err);
    } finally {
      isSyncingLicense = false;
      if (syncIcon) syncIcon.style.animation = "none";
    }
  }

  // Top license chip click to manually sync
  const topLicChip = document.getElementById("top-license-chip");
  if (topLicChip) {
    topLicChip.addEventListener("click", () => syncLicense(true));
  }

  // Window focus auto-sync (e.g. when user switches back from admin dashboard)
  window.addEventListener("focus", () => syncLicense(false));

  // Initial load
  await loadState(true);
  await syncLicense(false);

  // Auto-sync state polling every 2 seconds
  setInterval(loadState, 2000);

  // Real-time server license verification every 10 seconds
  setInterval(() => syncLicense(false), 10000);
});
