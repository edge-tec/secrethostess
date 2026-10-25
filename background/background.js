/**
 * SecretHostess Auto Poster Pro - Background Service Worker
 * Manages automation queue, persistent state in chrome.storage.local, tab lifecycle & messaging.
 */

const DEFAULT_SETTINGS = {
  isRunning: false,
  isPaused: false,
  currentAccountIndex: 0,
  currentCityIndex: 0,
  currentTabId: null,
  stepDelaySeconds: 2,
  autoProceedImages: true,
  pauseForImages: false,
  accounts: [],
  template: {
    title: "Hey Handsome! Available Now for Fun",
    description: "Hey Handsome 💋 let's get to the point, I do all the things your wife won't do. 100% real and friendly. Available now! Call or text me.",
    shortDescription: "Hey Handsome lets get to the point, I do all the things your wife wont do. 100% real and friendly.",
    age: "26",
    category: "Escorts",
    country: "USA",
    cityRotationMode: "sequential",
    customCities: "",
    suburb: "",
    mobile: "5645687964",
    location: "Downtown",
    email: "elexasara00@gmail.com",
    website: "",
    facebook: "",
    height: "165",
    weight: "55",
    bustSize: "34C",
    bodyType: "Slim",
    ethnicity: "Caucasian",
    hairColour: "Blonde",
    eyeColor: "Blue",
    skinColour: "Fair",
    dressSize: "Small",
    breastType: "Natural",
    inCall: true,
    outCall: true,
    clients: {
      couples: false,
      disabled: false,
      groupsParties: false,
      ladies: false,
      men: true,
      transsexuals: false
    },
    services: {
      bdsm: false,
      bodyRub: false,
      fullService: true,
      stripDance: false
    },
    workingHours: {
      mon: { start: "09:00", finish: "23:00", is24Hr: false },
      tue: { start: "09:00", finish: "23:00", is24Hr: false },
      wed: { start: "09:00", finish: "23:00", is24Hr: false },
      thu: { start: "09:00", finish: "23:00", is24Hr: false },
      fri: { start: "09:00", finish: "23:00", is24Hr: false },
      sat: { start: "10:00", finish: "02:00", is24Hr: false },
      sun: { start: "10:00", finish: "22:00", is24Hr: false }
    }
  },
  license: {
    serverUrl: "https://mailszo.com",
    key: "SHP-DEMO-8899-AABB-1122",
    isValid: false,
    daysRemaining: 30,
    creditsRemaining: 100,
    totalCredits: 100,
    isUnlimited: false,
    clientName: "Demo User",
    expiresAt: "",
    lastVerifiedAt: null
  },
  logs: []
};

// Helper to get state
async function getState() {
  const data = await chrome.storage.local.get(null);
  return {
    ...DEFAULT_SETTINGS,
    ...data,
    template: { ...DEFAULT_SETTINGS.template, ...(data.template || {}) },
    license: { ...DEFAULT_SETTINGS.license, ...(data.license || {}) }
  };
}

// Helper to save state
async function setState(partial) {
  await chrome.storage.local.set(partial);
}

// Add log entry
async function addLog(message, type = "info") {
  const timestamp = new Date().toLocaleTimeString();
  const state = await getState();
  const logs = state.logs || [];
  logs.unshift({ id: Date.now() + Math.random(), time: timestamp, message, type });
  if (logs.length > 200) logs.pop();
  await setState({ logs });
  console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
}

// Verify license key with API server
async function verifyLicense(keyOverride, serverUrlOverride) {
  const state = await getState();
  const lic = state.license || DEFAULT_SETTINGS.license;
  const key = (keyOverride || lic.key || "").trim().toUpperCase();
  const serverUrl = (serverUrlOverride || lic.serverUrl || "https://mailszo.com").replace(/\/+$/, "");

  if (!key) {
    const updated = { ...lic, isValid: false, message: "No license key provided." };
    await setState({ license: updated });
    return { success: false, valid: false, message: "License key is missing." };
  }

  try {
    const res = await fetch(`${serverUrl}/api/license/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key })
    });

    const data = await res.json();
    if (data.valid) {
      const updated = {
        ...lic,
        serverUrl,
        key: data.key,
        clientName: data.clientName,
        isValid: true,
        daysRemaining: data.daysRemaining,
        creditsRemaining: data.creditsRemaining,
        totalCredits: data.totalCredits,
        isUnlimited: !!data.isUnlimited,
        expiresAt: data.expiresAt,
        lastVerifiedAt: new Date().toISOString(),
        message: data.message
      };
      await setState({ license: updated });
      return { success: true, valid: true, ...updated };
    } else {
      const updated = {
        ...lic,
        serverUrl,
        key,
        isValid: false,
        daysRemaining: data.daysRemaining || 0,
        creditsRemaining: data.creditsRemaining || 0,
        message: data.message || "Invalid or expired license."
      };
      await setState({ license: updated });
      return { success: false, valid: false, message: data.message };
    }
  } catch (err) {
    console.error("License API error:", err);
    // If server unreachable, check if last verified was recent (<24h)
    return {
      success: false,
      valid: false,
      message: `Cannot connect to License Server (${serverUrl}). Please check server URL or ensure server is running.`
    };
  }
}

// Deduct 1 credit after successful post
async function consumeCredit(count = 1) {
  const state = await getState();
  const lic = state.license || DEFAULT_SETTINGS.license;
  const serverUrl = (lic.serverUrl || "https://mailszo.com").replace(/\/+$/, "");
  const key = (lic.key || "").trim().toUpperCase();

  if (!key) return { success: false, message: "No license key" };

  try {
    const res = await fetch(`${serverUrl}/api/license/consume-credit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, count })
    });
    const data = await res.json();

    if (data.success) {
      const updated = {
        ...lic,
        creditsRemaining: data.creditsRemaining
      };
      await setState({ license: updated });
      await addLog(`💳 1 Credit deducted for this post. Remaining credits: ${data.creditsRemaining}`, "info");
      return { success: true, creditsRemaining: data.creditsRemaining };
    } else {
      return { success: false, message: data.message };
    }
  } catch (err) {
    console.error("Credit consumption error:", err);
    return { success: false, message: err.message };
  }
}

// Ensure clean startup
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(null);
  if (!existing || Object.keys(existing).length === 0) {
    await chrome.storage.local.set(DEFAULT_SETTINGS);
  } else {
    // Reset running flags if browser restarted
    await setState({ isRunning: false, isPaused: false, currentTabId: null });
  }
  await addLog("SecretHostess Auto Poster Pro initialized with License API.");
});

// Start automation
async function startAutomation() {
  const state = await getState();
  const accounts = state.accounts || [];

  // 1. Verify License & Credits before starting
  const licCheck = await verifyLicense();
  if (!licCheck.valid) {
    await addLog(`License check failed: ${licCheck.message}`, "error");
    return {
      success: false,
      error: `License Error: ${licCheck.message || "Invalid or Expired License Key. Please enter a valid license in settings."}`
    };
  }

  if (!licCheck.isUnlimited && licCheck.creditsRemaining <= 0) {
    await addLog("Insufficient credits to start posting! 0 credits remaining.", "error");
    return {
      success: false,
      error: "You have 0 Credits remaining. Please contact admin to recharge credits."
    };
  }

  if (accounts.length === 0) {
    await addLog("No accounts found in queue! Please add accounts first.", "error");
    return { success: false, error: "No accounts in queue." };
  }

  // Find next pending or failed account
  let nextIdx = accounts.findIndex((a) => a.status === "pending");
  if (nextIdx === -1) {
    await addLog("All accounts are already marked as completed. Reset statuses to run again.", "warning");
    return { success: false, error: "All accounts already completed." };
  }

  await setState({
    isRunning: true,
    isPaused: false,
    currentAccountIndex: nextIdx
  });

  const targetAccount = accounts[nextIdx];
  accounts[nextIdx].status = "posting";
  accounts[nextIdx].error = "";
  await setState({ accounts });

  await addLog(`Starting automation with Account #${nextIdx + 1}: ${targetAccount.username} | Credits Left: ${licCheck.creditsRemaining}`);

  // Create or navigate tab to login page
  let tab;
  if (state.currentTabId) {
    try {
      tab = await chrome.tabs.get(state.currentTabId);
      await chrome.tabs.update(tab.id, { url: "https://secrethostess.com/admin/login.php", active: true });
    } catch {
      tab = null;
    }
  }

  if (!tab) {
    tab = await chrome.tabs.create({ url: "https://secrethostess.com/admin/login.php", active: true });
    await setState({ currentTabId: tab.id });
  }

  return { success: true };
}

// Pause / Resume / Stop
async function pauseAutomation() {
  await setState({ isPaused: true });
  await addLog("Automation paused by user.", "warning");
}

async function resumeAutomation() {
  await setState({ isPaused: false });
  await addLog("Automation resumed by user.", "info");
}

async function stopAutomation() {
  const state = await getState();
  const accounts = state.accounts || [];
  if (state.currentAccountIndex < accounts.length && accounts[state.currentAccountIndex]?.status === "posting") {
    accounts[state.currentAccountIndex].status = "pending";
  }
  await setState({ isRunning: false, isPaused: false, accounts });
  await addLog("Automation stopped.", "warning");
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case "GET_STATE": {
          const state = await getState();
          sendResponse({ success: true, state });
          break;
        }

        case "START_AUTOMATION": {
          const res = await startAutomation();
          sendResponse(res);
          break;
        }

        case "PAUSE_AUTOMATION": {
          await pauseAutomation();
          sendResponse({ success: true });
          break;
        }

        case "RESUME_AUTOMATION": {
          await resumeAutomation();
          sendResponse({ success: true });
          break;
        }

        case "STOP_AUTOMATION": {
          await stopAutomation();
          sendResponse({ success: true });
          break;
        }

        case "SAVE_SETTINGS": {
          await setState(message.data);
          await addLog("Settings updated successfully.", "info");
          sendResponse({ success: true });
          break;
        }

        case "RESET_STATUSES": {
          const state = await getState();
          const accounts = (state.accounts || []).map(a => ({
            ...a,
            status: "pending",
            error: "",
            lastCity: "",
            lastTime: ""
          }));
          await setState({
            accounts,
            isRunning: false,
            isPaused: false,
            currentAccountIndex: 0,
            currentCityIndex: 0
          });
          await addLog("All account statuses and city counters reset to initial state.", "info");
          sendResponse({ success: true, accounts });
          break;
        }

        case "LOG_EVENT": {
          await addLog(message.message, message.logType || "info");
          sendResponse({ success: true });
          break;
        }

        case "GET_TASK_DATA": {
          // Content script requests current instructions and credentials
          const state = await getState();
          if (!state.isRunning) {
            sendResponse({ active: false });
            return;
          }

          const currentAccount = state.accounts?.[state.currentAccountIndex];
          if (!currentAccount) {
            await stopAutomation();
            sendResponse({ active: false });
            return;
          }

          sendResponse({
            active: true,
            isPaused: state.isPaused,
            account: currentAccount,
            accountIndex: state.currentAccountIndex,
            totalAccounts: state.accounts.length,
            cityIndex: state.currentCityIndex,
            template: state.template,
            stepDelaySeconds: state.stepDelaySeconds || 2,
            autoProceedImages: state.autoProceedImages,
            pauseForImages: state.pauseForImages
          });
          break;
        }

        case "ACCOUNT_POST_COMPLETED": {
          // Content script reports that posting in city finished
          const state = await getState();
          const accounts = state.accounts || [];
          const idx = state.currentAccountIndex;
          const cityName = message.city || `City #${state.currentCityIndex + 1}`;

          if (accounts[idx]) {
            accounts[idx].status = "completed";
            accounts[idx].lastCity = cityName;
            accounts[idx].lastTime = new Date().toLocaleTimeString();
            accounts[idx].error = "";
          }

          const nextCityIdx = state.currentCityIndex + 1;
          await addLog(`Listing successfully submitted for Account #${idx + 1} (${accounts[idx]?.username}) in "${cityName}"!`, "success");

          // 💳 Deduct 1 credit for this successful post
          await consumeCredit(1);
          const stateAfterCredit = await getState();
          const licAfter = stateAfterCredit.license;
          const creditsRemaining = licAfter.isUnlimited ? 999999 : licAfter.creditsRemaining;

          // Check if credits ran out
          if (!licAfter.isUnlimited && creditsRemaining <= 0) {
            await addLog("⚠️ All credits have been consumed! Queue stopped. Please contact admin to recharge.", "warning");
            const targetTabId = sender?.tab?.id || state.currentTabId;
            await setState({
              accounts,
              isRunning: false,
              isPaused: false,
              currentCityIndex: nextCityIdx,
              currentTabId: targetTabId
            });
            sendResponse({ success: true, hasNext: false, outOfCredits: true });
            if (targetTabId) {
              try { chrome.tabs.update(targetTabId, { url: "https://secrethostess.com/admin/logout.php" }); } catch (e) {}
            }
            break;
          }

          // Find next pending account
          let nextAccountIdx = accounts.findIndex((a, i) => i > idx && a.status === "pending");
          if (nextAccountIdx === -1) {
            nextAccountIdx = accounts.findIndex((a) => a.status === "pending");
          }

          const targetTabId = sender?.tab?.id || state.currentTabId;

          if (nextAccountIdx !== -1) {
            accounts[nextAccountIdx].status = "posting";
            await setState({
              accounts,
              currentAccountIndex: nextAccountIdx,
              currentCityIndex: nextCityIdx,
              currentTabId: targetTabId
            });

            await addLog(`Logging out and advancing to Account #${nextAccountIdx + 1} (${accounts[nextAccountIdx].username}) for next city...`, "info");

            sendResponse({
              success: true,
              hasNext: true,
              nextIndex: nextAccountIdx,
              nextUsername: accounts[nextAccountIdx].username
            });

            // Navigate tab to logout, which will redirect to login page for the next account
            if (targetTabId) {
              try {
                chrome.tabs.update(targetTabId, { url: "https://secrethostess.com/admin/logout.php" });
              } catch (e) {
                console.error("Tab update error:", e);
              }
            }
          } else {
            // All accounts finished!
            await setState({
              accounts,
              isRunning: false,
              isPaused: false,
              currentCityIndex: nextCityIdx,
              currentTabId: targetTabId
            });
            await addLog("🎉 ALL ACCOUNTS IN QUEUE HAVE FINISHED POSTING SUCCESSFULLY!", "success");

            sendResponse({
              success: true,
              hasNext: false
            });

            if (targetTabId) {
              try {
                chrome.tabs.update(targetTabId, { url: "https://secrethostess.com/admin/logout.php" });
              } catch (e) {}
            }
          }
          break;
        }

        case "ACCOUNT_POST_FAILED": {
          const state = await getState();
          const accounts = state.accounts || [];
          const idx = state.currentAccountIndex;
          const reason = message.reason || "Unknown error";

          if (accounts[idx]) {
            accounts[idx].status = "failed";
            accounts[idx].error = reason;
            accounts[idx].lastTime = new Date().toLocaleTimeString();
          }

          await addLog(`Failed on Account #${idx + 1} (${accounts[idx]?.username}): ${reason}`, "error");

          // Try next account if available
          let nextAccountIdx = accounts.findIndex((a, i) => i > idx && a.status === "pending");
          if (nextAccountIdx === -1) {
            nextAccountIdx = accounts.findIndex((a) => a.status === "pending");
          }

          const targetTabId = sender?.tab?.id || state.currentTabId;

          if (nextAccountIdx !== -1) {
            accounts[nextAccountIdx].status = "posting";
            await setState({
              accounts,
              currentAccountIndex: nextAccountIdx,
              currentTabId: targetTabId
            });
            await addLog(`Moving to next Account #${nextAccountIdx + 1} (${accounts[nextAccountIdx].username})...`, "warning");
            if (targetTabId) {
              try {
                chrome.tabs.update(targetTabId, { url: "https://secrethostess.com/admin/logout.php" });
              } catch (e) {}
            }
          } else {
            await setState({ accounts, isRunning: false, isPaused: false });
            await addLog("Automation stopped. No more pending accounts in queue.", "warning");
          }

          sendResponse({ success: true });
          break;
        }

        case "VERIFY_LICENSE": {
          const res = await verifyLicense(message.key, message.serverUrl);
          sendResponse(res);
          break;
        }

        case "GET_LICENSE_STATUS": {
          const state = await getState();
          sendResponse({ success: true, license: state.license });
          break;
        }

        default:
          sendResponse({ success: false, error: "Unknown action" });
          break;
      }
    } catch (err) {
      console.error("Background error:", err);
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true; // Keep message channel open for async response
});
