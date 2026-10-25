/**
 * SecretHostess Auto Poster Pro - Popup Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
  const statusPill = document.getElementById("status-pill");
  const statTotal = document.getElementById("stat-total");
  const statPending = document.getElementById("stat-pending");
  const statDone = document.getElementById("stat-done");
  const statFailed = document.getElementById("stat-failed");
  const currAccount = document.getElementById("curr-account");
  const currCity = document.getElementById("curr-city");

  const btnStart = document.getElementById("btn-start");
  const btnPause = document.getElementById("btn-pause");
  const btnStop = document.getElementById("btn-stop");
  const btnOpenDashboard = document.getElementById("btn-open-dashboard");

  async function loadState() {
    try {
      const response = await chrome.runtime.sendMessage({ type: "GET_STATE" });
      if (!response || !response.success) return;
      const state = response.state;

      const accounts = state.accounts || [];
      const total = accounts.length;
      const pending = accounts.filter((a) => a.status === "pending").length;
      const done = accounts.filter((a) => a.status === "completed").length;
      const failed = accounts.filter((a) => a.status === "failed").length;

      statTotal.textContent = total;
      statPending.textContent = pending;
      statDone.textContent = done;
      statFailed.textContent = failed;

      // Status pill & buttons
      if (state.isRunning) {
        if (state.isPaused) {
          statusPill.className = "status-pill paused";
          statusPill.textContent = "PAUSED";
          btnStart.style.display = "none";
          btnPause.style.display = "block";
          btnPause.textContent = "Resume";
          btnStop.style.display = "block";
        } else {
          statusPill.className = "status-pill running";
          statusPill.textContent = "RUNNING";
          btnStart.style.display = "none";
          btnPause.style.display = "block";
          btnPause.textContent = "Pause";
          btnStop.style.display = "block";
        }

        const currAcc = accounts[state.currentAccountIndex];
        currAccount.textContent = currAcc ? `${currAcc.username} (#${state.currentAccountIndex + 1})` : "None";
      } else {
        statusPill.className = "status-pill idle";
        statusPill.textContent = "IDLE";
        btnStart.style.display = "block";
        btnPause.style.display = "none";
        btnStop.style.display = "none";
        currAccount.textContent = "None";
      }

      currCity.textContent = `USA City (Index ${state.currentCityIndex + 1})`;

      // License status
      const lic = state.license || {};
      const popLicStatus = document.getElementById("pop-lic-status");
      const popLicCredits = document.getElementById("pop-lic-credits");
      const popLicDays = document.getElementById("pop-lic-days");

      if (lic.isValid) {
        popLicStatus.textContent = "Active";
        popLicStatus.style.color = "#22c55e";
      } else {
        popLicStatus.textContent = lic.message || "Invalid";
        popLicStatus.style.color = "#ef4444";
      }

      popLicCredits.textContent = lic.isUnlimited ? "Unlimited" : `${lic.creditsRemaining ?? 0} Credits`;
      popLicDays.textContent = `${lic.daysRemaining ?? 0} Days`;
    } catch (err) {
      console.error("Failed to load state in popup:", err);
    }
  }

  // Event handlers
  btnStart.addEventListener("click", async () => {
    btnStart.disabled = true;
    const res = await chrome.runtime.sendMessage({ type: "START_AUTOMATION" });
    btnStart.disabled = false;
    if (res && !res.success && res.error) {
      alert(res.error);
    }
    await loadState();
  });

  btnPause.addEventListener("click", async () => {
    if (btnPause.textContent === "Resume") {
      await chrome.runtime.sendMessage({ type: "RESUME_AUTOMATION" });
    } else {
      await chrome.runtime.sendMessage({ type: "PAUSE_AUTOMATION" });
    }
    await loadState();
  });

  btnStop.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "STOP_AUTOMATION" });
    await loadState();
  });

  btnOpenDashboard.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  await loadState();
  setInterval(loadState, 2000);
});
