/**
 * SecretHostess Auto Poster Pro - Content Script
 * Executes automated form filling, city rotation, login, and submission on secrethostess.com
 */

(function () {
  let taskData = null;
  let hudEl = null;

  // Sleep utility
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Log to background and console
  async function log(message, type = "info") {
    console.log(`[AutoPoster] [${type}] ${message}`);
    updateHudStatus(message);
    try {
      await chrome.runtime.sendMessage({
        type: "LOG_EVENT",
        message,
        logType: type
      });
    } catch {
      // Ignore background disconnect
    }
  }

  // Create or update floating HUD
  function createHud(account, cityIndex, totalAccounts) {
    if (document.getElementById("sh-auto-poster-hud")) return;

    hudEl = document.createElement("div");
    hudEl.id = "sh-auto-poster-hud";
    hudEl.innerHTML = `
      <div class="hud-header" id="sh-hud-toggle">
        <span>🚀 SecretHostess Auto Poster</span>
        <small id="sh-hud-min-btn">▼</small>
      </div>
      <div class="hud-body">
        <div class="hud-row">
          <span class="hud-label">Account:</span>
          <span class="hud-val" id="sh-hud-account">${account?.username || "-"} (${(taskData.accountIndex || 0) + 1}/${totalAccounts})</span>
        </div>
        <div class="hud-row">
          <span class="hud-label">Target City:</span>
          <span class="hud-val" id="sh-hud-city">Rotating (Index ${cityIndex + 1})</span>
        </div>
        <div class="hud-status" id="sh-hud-status">Initializing automation...</div>
        <div class="hud-controls">
          <button class="hud-btn hud-btn-pause" id="sh-hud-pause-btn">Pause</button>
          <button class="hud-btn hud-btn-stop" id="sh-hud-stop-btn">Stop</button>
        </div>
      </div>
    `;

    document.body.appendChild(hudEl);

    // Event listeners
    document.getElementById("sh-hud-toggle").addEventListener("click", () => {
      hudEl.classList.toggle("minimized");
      const minBtn = document.getElementById("sh-hud-min-btn");
      if (minBtn) minBtn.textContent = hudEl.classList.contains("minimized") ? "▲" : "▼";
    });

    document.getElementById("sh-hud-pause-btn").addEventListener("click", async () => {
      if (taskData?.isPaused) {
        await chrome.runtime.sendMessage({ type: "RESUME_AUTOMATION" });
        taskData.isPaused = false;
        document.getElementById("sh-hud-pause-btn").textContent = "Pause";
        log("Resuming automation...", "info");
      } else {
        await chrome.runtime.sendMessage({ type: "PAUSE_AUTOMATION" });
        if (taskData) taskData.isPaused = true;
        document.getElementById("sh-hud-pause-btn").textContent = "Resume";
        log("Automation paused by user.", "warning");
      }
    });

    document.getElementById("sh-hud-stop-btn").addEventListener("click", async () => {
      await chrome.runtime.sendMessage({ type: "STOP_AUTOMATION" });
      hudEl.remove();
      log("Automation stopped.", "warning");
    });
  }

  function updateHudStatus(statusText) {
    const el = document.getElementById("sh-hud-status");
    if (el) el.textContent = statusText;
  }

  function updateHudCity(cityName) {
    const el = document.getElementById("sh-hud-city");
    if (el) el.textContent = cityName;
  }

  // Helper to trigger natural input & change events
  function triggerEvents(el) {
    if (!el) return;
    el.dispatchEvent(new Event("focus", { bubbles: true }));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new CustomEvent("change", { bubbles: true }));
    if (typeof el.onchange === "function") {
      try { el.onchange(); } catch (e) {}
    }
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  // Inject script into page context to trigger jQuery change handlers if present
  function triggerPageChange(selector) {
    try {
      const script = document.createElement("script");
      script.textContent = `
        (function() {
          try {
            var el = document.querySelector(${JSON.stringify(selector)});
            if (el) {
              if (window.jQuery) {
                window.jQuery(el).trigger('change');
              }
              if (el.onchange) {
                el.onchange();
              }
            }
          } catch(e) {}
        })();
      `;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch (err) {
      console.error("triggerPageChange error:", err);
    }
  }

  function setInputValue(element, val) {
    if (!element) return;
    element.focus();
    element.value = val;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.blur();
  }

  // Select dropdown option by text or value (exact match prioritized)
  function selectDropdownOption(selectEl, targetValue) {
    if (!selectEl || !targetValue) return false;
    const target = targetValue.toString().trim().toLowerCase();

    // 1. Exact match on value or text
    for (let i = 0; i < selectEl.options.length; i++) {
      const opt = selectEl.options[i];
      const optText = opt.text.trim().toLowerCase();
      const optVal = opt.value.trim().toLowerCase();

      if (optVal === target || optText === target) {
        selectEl.selectedIndex = i;
        selectEl.value = opt.value;
        opt.selected = true;
        triggerEvents(selectEl);
        return true;
      }
    }

    // 2. Fuzzy match on text
    for (let i = 0; i < selectEl.options.length; i++) {
      const opt = selectEl.options[i];
      const optText = opt.text.trim().toLowerCase();
      if (optText.split(/\s+/).includes(target) || optText.startsWith(target) || optText.includes(target)) {
        selectEl.selectedIndex = i;
        selectEl.value = opt.value;
        opt.selected = true;
        triggerEvents(selectEl);
        return true;
      }
    }
    return false;
  }

  // Dedicated finder for City dropdown (prevents false matches like Ethnicity)
  function findCitySelect() {
    const selects = Array.from(document.querySelectorAll("select"));

    // 1. Find select that contains an option with text "Select City" or "City/Area"
    for (const sel of selects) {
      if (sel.name === "country" || sel.id === "country" || sel.name === "category" || sel.id === "category") continue;
      for (let i = 0; i < sel.options.length; i++) {
        const txt = sel.options[i].text.toLowerCase();
        if (txt.includes("select city") || txt.includes("city/area") || txt.includes("select area")) {
          return sel;
        }
      }
    }

    // 2. Direct selector for city
    for (const sel of selects) {
      const id = (sel.id || "").toLowerCase();
      const name = (sel.name || "").toLowerCase();
      if ((name.includes("city") || id.includes("city")) && !name.includes("ethnicity") && !id.includes("ethnicity")) {
        return sel;
      }
    }

    // 3. Select positioned between Country select and Mobile input
    const countryEl = document.querySelector('select[name="country"], #country');
    const mobileEl = document.querySelector('input[name="mobile"], #mobile');
    if (countryEl && mobileEl) {
      for (const sel of selects) {
        if (
          sel !== countryEl &&
          (countryEl.compareDocumentPosition(sel) & Node.DOCUMENT_POSITION_FOLLOWING) &&
          (sel.compareDocumentPosition(mobileEl) & Node.DOCUMENT_POSITION_FOLLOWING)
        ) {
          return sel;
        }
      }
    }

    // 4. Label exact word matching for "city" (strictly NOT ethnicity)
    const labels = Array.from(document.querySelectorAll("label"));
    for (const label of labels) {
      const text = label.textContent.replace(/[*:\s]/g, " ").trim().toLowerCase();
      const words = text.split(/\s+/);
      if (words.includes("city") && !words.includes("ethnicity")) {
        let next = label.nextElementSibling;
        while (next) {
          if (next.tagName.toLowerCase() === "select") return next;
          const s = next.querySelector("select");
          if (s) return s;
          if (next.tagName.toLowerCase() === "label") break;
          next = next.nextElementSibling;
        }
      }
    }

    return null;
  }

  // Helper to find input/select by label text (exact word boundary matching)
  function findElementByLabel(labelText, tagName = "input") {
    const targetLower = labelText.toLowerCase().trim();
    const labels = Array.from(document.querySelectorAll("label"));
    for (const label of labels) {
      const text = label.textContent.replace(/[*:\s]/g, " ").trim().toLowerCase();
      const words = text.split(/\s+/);
      if (words.includes(targetLower) || text === targetLower) {
        if (label.htmlFor) {
          const el = document.getElementById(label.htmlFor);
          if (el) return el;
        }
        const inside = label.querySelector(tagName);
        if (inside) return inside;
        let next = label.nextElementSibling;
        while (next) {
          if (next.tagName.toLowerCase() === tagName) return next;
          const found = next.querySelector(tagName);
          if (found) return found;
          if (next.tagName.toLowerCase() === "label") break;
          next = next.nextElementSibling;
        }
      }
    }
    return null;
  }

  // Robust set value for rich text editor (Summernote / NicEdit / iframe / textarea)
  async function fillRichTextDescription(htmlContent) {
    let filled = false;

    // 1. Check for iframe editor (e.g. NicEdit or TinyMCE)
    const iframes = document.querySelectorAll("iframe");
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && doc.body && (doc.designMode === "on" || doc.body.isContentEditable)) {
          doc.body.innerHTML = htmlContent;
          doc.body.dispatchEvent(new Event("input", { bubbles: true }));
          filled = true;
          break;
        }
      } catch {
        // Cross-origin iframe, ignore
      }
    }

    // 2. Check for contenteditable divs (Summernote, CKEditor, etc.)
    if (!filled) {
      const editables = document.querySelectorAll('.note-editable, [contenteditable="true"], .nicEdit-main');
      if (editables.length > 0) {
        editables[0].innerHTML = htmlContent;
        editables[0].dispatchEvent(new Event("input", { bubbles: true }));
        editables[0].dispatchEvent(new Event("change", { bubbles: true }));
        filled = true;
      }
    }

    // 3. Check for underlying textarea
    const textareas = document.querySelectorAll('textarea[name*="description"], textarea#description, textarea');
    for (const ta of textareas) {
      // Don't overwrite short_description if this is description
      if (ta.name === "short_description" || ta.id === "short_description") continue;
      ta.value = htmlContent;
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      ta.dispatchEvent(new Event("change", { bubbles: true }));
      filled = true;
      break;
    }

    return filled;
  }

  // --- Page Handlers ---

  // 1. Handle Login Page
  async function handleLoginPage() {
    await log(`On Login Page. Preparing to log in as ${taskData.account.username}...`, "info");
    await sleep(taskData.stepDelaySeconds * 1000);

    // Check for login error
    const errorBox = document.querySelector(".errors, .warning, .alert-danger");
    if (errorBox && errorBox.textContent.trim().length > 0 && !errorBox.textContent.includes("Please Wait")) {
      await chrome.runtime.sendMessage({
        type: "ACCOUNT_POST_FAILED",
        reason: `Login error: ${errorBox.textContent.trim()}`
      });
      return;
    }

    const usernameInput = document.querySelector('input[name="username"], #username');
    const passwordInput = document.querySelector('input[name="password"], #password');
    const rememberCheckbox = document.querySelector('input[name="remember_me"], #remember_me');
    const submitBtn = document.querySelector('input[type="Submit"], button[type="submit"], input[name="Login"]');

    if (!usernameInput || !passwordInput) {
      await log("Could not find username or password field on login page.", "error");
      return;
    }

    setInputValue(usernameInput, taskData.account.username);
    await sleep(400);
    setInputValue(passwordInput, taskData.account.password);
    await sleep(300);

    if (rememberCheckbox) {
      rememberCheckbox.checked = true;
    }

    await log("Submitting login form...", "info");
    await sleep(800);

    if (submitBtn) {
      submitBtn.click();
    } else {
      document.querySelector("form#login_form, form")?.submit();
    }
  }

  // 2. Handle Dashboard Page
  async function handleDashboardPage() {
    await log("Login successful! Looking for 'Add Listing' button...", "info");
    await sleep(taskData.stepDelaySeconds * 1000);

    // Find "Add Listing" button (in top navbar or dashboard body "+ Add New Listing")
    const links = Array.from(document.querySelectorAll("a, button"));
    let addListingBtn = links.find((el) => {
      const text = el.textContent.trim().toLowerCase();
      const href = el.getAttribute("href") || "";
      return (
        text.includes("add listing") ||
        text.includes("add new listing") ||
        href.includes("add_listing_content.php")
      );
    });

    if (addListingBtn) {
      await log("Found 'Add Listing' button, navigating to form...", "info");
      addListingBtn.click();
    } else {
      await log("Navigating directly to add_listing_content.php...", "info");
      window.location.href = "https://secrethostess.com/admin/add_listing_content.php";
    }
  }

  // 3. Handle Add Listing Content Page (The Main Form)
  async function handleAddListingPage() {
    const t = taskData.template;
    await log("Starting Part-by-Part form auto-fill...", "info");
    await sleep(taskData.stepDelaySeconds * 1000);

    // === PART 1: LISTING DETAILS ===
    await log("Filling Part 1: Listing Details...", "info");

    // Title*
    const titleInput = document.querySelector('input[name="title"], #title') || findElementByLabel("Title");
    if (titleInput) {
      setInputValue(titleInput, t.title);
    }

    // Description*
    await fillRichTextDescription(t.description);

    // Short Description*
    const shortDescTa = document.querySelector('textarea[name="short_description"], #short_description') || findElementByLabel("Short Description", "textarea");
    if (shortDescTa) {
      setInputValue(shortDescTa, t.shortDescription);
    }

    // Age*
    const ageInput = document.querySelector('input[name="age"], #age') || findElementByLabel("Age");
    if (ageInput) {
      setInputValue(ageInput, t.age);
    }

    // Category*
    const categorySelect = document.querySelector('select[name="category"], #category') || findElementByLabel("Category", "select");
    if (categorySelect) {
      selectDropdownOption(categorySelect, t.category || "Escorts");
    }

    await sleep(1000);

    // === PART 2: CONTACT DETAILS & DYNAMIC USA CITY ROTATION ===
    await log("Filling Part 2: Contact Details & Selecting USA City...", "info");

    // Country*
    const countrySelect = document.querySelector('select[name="country"], #country') || findElementByLabel("Country", "select");
    if (countrySelect) {
      selectDropdownOption(countrySelect, t.country || "USA");
      triggerEvents(countrySelect);
      triggerPageChange('select[name="country"], #country');
    }

    // Wait for City dropdown to load its options via AJAX
    await log("Waiting for USA cities dropdown to load...", "info");
    let chosenCityName = "";
    let citySelect = null;
    let validOptions = [];

    // Poll for up to 12 seconds (24 * 500ms) until city options are populated
    for (let attempts = 0; attempts < 24; attempts++) {
      citySelect = findCitySelect();
      if (citySelect) {
        validOptions = Array.from(citySelect.options).filter((opt) => {
          const val = (opt.value || "").trim();
          const txt = opt.text.trim().toLowerCase();
          return val !== "" && !txt.includes("select") && !txt.includes("choose");
        });

        if (validOptions.length > 0) {
          break;
        }
      }
      await sleep(500);
    }

    if (citySelect && validOptions.length > 0) {
      let selectedOption = null;

      // Check rotation mode
      if (t.cityRotationMode === "custom" && t.customCities?.trim()) {
        const customList = t.customCities.split(/[\n,]+/).map((c) => c.trim().toLowerCase()).filter(Boolean);
        if (customList.length > 0) {
          const targetCityName = customList[taskData.cityIndex % customList.length];
          selectedOption = validOptions.find((o) => o.text.toLowerCase().includes(targetCityName));
        }
      }

      if (!selectedOption) {
        // Sequential rotation: Account 1 -> City 0, Account 2 -> City 1, etc.
        const pickIndex = (taskData.cityIndex || 0) % validOptions.length;
        selectedOption = validOptions[pickIndex];
      }

      citySelect.selectedIndex = Array.from(citySelect.options).indexOf(selectedOption);
      citySelect.value = selectedOption.value;
      selectedOption.selected = true;

      triggerEvents(citySelect);
      triggerPageChange('select[name*="city"], #city, select[name*="area"]');

      chosenCityName = selectedOption.text.trim();
      sessionStorage.setItem("sh_last_city", chosenCityName);
      updateHudCity(chosenCityName);
      await log(`Selected USA City: "${chosenCityName}" (City #${((taskData.cityIndex || 0) % validOptions.length) + 1} of ${validOptions.length})`, "success");
    } else {
      await log("City dropdown options not loaded, checking Suburb input...", "warning");
      const suburbInput = document.querySelector('input[name="suburb"], #suburb') || findElementByLabel("Suburb");
      if (suburbInput && t.suburb) {
        setInputValue(suburbInput, t.suburb);
      }
    }

    // Mobile*
    const mobileInput = document.querySelector('input[name="mobile"], #mobile') || findElementByLabel("Mobile");
    if (mobileInput) {
      setInputValue(mobileInput, t.mobile);
    }

    await sleep(600);

    // === PART 3: EXTRA CONTACT DETAILS ===
    await log("Filling Part 3: Extra Contact Details...", "info");

    const locationInput = document.querySelector('input[name="location"], #location') || findElementByLabel("Location");
    if (locationInput && t.location) setInputValue(locationInput, t.location);

    const emailInput = document.querySelector('input[name="email"], #email') || findElementByLabel("Email");
    if (emailInput && t.email) setInputValue(emailInput, t.email);

    const websiteInput = document.querySelector('input[name="website"], #website') || findElementByLabel("Website");
    if (websiteInput && t.website) setInputValue(websiteInput, t.website);

    const facebookInput = document.querySelector('input[name="facebook"], #facebook') || findElementByLabel("Facebook");
    if (facebookInput && t.facebook) setInputValue(facebookInput, t.facebook);

    await sleep(600);

    // === PART 4: APPEARANCE ===
    await log("Filling Part 4: Appearance...", "info");

    const heightInput = document.querySelector('input[name="height"], #height') || findElementByLabel("Height");
    if (heightInput) setInputValue(heightInput, t.height);

    const weightInput = document.querySelector('input[name="weight"], #weight') || findElementByLabel("Weight");
    if (weightInput) setInputValue(weightInput, t.weight);

    // Appearance Dropdowns
    const appearanceMap = [
      { key: "bust", val: t.bustSize },
      { key: "body_type", val: t.bodyType },
      { key: "ethnicity", val: t.ethnicity },
      { key: "hair", val: t.hairColour },
      { key: "eye", val: t.eyeColor },
      { key: "skin", val: t.skinColour },
      { key: "dress", val: t.dressSize },
      { key: "breast", val: t.breastType }
    ];

    for (const item of appearanceMap) {
      const sel = document.querySelector(`select[name*="${item.key}"], select#${item.key}`) || findElementByLabel(item.key, "select");
      if (sel && item.val) {
        selectDropdownOption(sel, item.val);
      }
    }

    await sleep(600);

    // === PART 5: IN-CALL / OUT-CALL ===
    await log("Filling Part 5: In-Call / Out-Call...", "info");

    const inCallCb = Array.from(document.querySelectorAll('input[type="checkbox"]')).find((cb) => {
      const lbl = cb.closest("label")?.textContent || cb.nextSibling?.textContent || cb.name || "";
      return lbl.toLowerCase().includes("in-call") || lbl.toLowerCase().includes("incall");
    });
    if (inCallCb) inCallCb.checked = !!t.inCall;

    const outCallCb = Array.from(document.querySelectorAll('input[type="checkbox"]')).find((cb) => {
      const lbl = cb.closest("label")?.textContent || cb.nextSibling?.textContent || cb.name || "";
      return lbl.toLowerCase().includes("out-call") || lbl.toLowerCase().includes("outcall");
    });
    if (outCallCb) outCallCb.checked = !!t.outCall;

    // === PART 6: CLIENTS ===
    await log("Filling Part 6: Clients...", "info");
    const clientKeys = [
      { key: "couples", name: "couples" },
      { key: "disabled", name: "disabled" },
      { key: "groups", name: "groups" },
      { key: "ladies", name: "ladies" },
      { key: "men", name: "men" },
      { key: "trans", name: "trans" }
    ];

    const allCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    for (const cb of allCheckboxes) {
      const labelText = (cb.closest("label")?.textContent || cb.parentElement?.textContent || cb.name || "").toLowerCase();
      for (const ck of clientKeys) {
        if (labelText.includes(ck.name) && t.clients) {
          const configKey = ck.key === "groups" ? "groupsParties" : ck.key === "trans" ? "transsexuals" : ck.key;
          cb.checked = !!t.clients[configKey];
        }
      }
    }

    // === PART 7: SERVICES ===
    await log("Filling Part 7: Services...", "info");
    const serviceKeys = [
      { match: "bdsm", key: "bdsm" },
      { match: "body rub", key: "bodyRub" },
      { match: "full service", key: "fullService" },
      { match: "strip", key: "stripDance" }
    ];

    for (const cb of allCheckboxes) {
      const labelText = (cb.closest("label")?.textContent || cb.parentElement?.textContent || cb.name || "").toLowerCase();
      for (const sk of serviceKeys) {
        if (labelText.includes(sk.match) && t.services) {
          cb.checked = !!t.services[sk.key];
        }
      }
    }

    // === PART 8: WORKING HOURS ===
    await log("Filling Part 8: Working Hours...", "info");
    const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    const rows = document.querySelectorAll("tr, div.working-hours-row, form div");

    for (const day of days) {
      const dayConf = t.workingHours?.[day];
      if (!dayConf) continue;

      // Find row containing the day name
      for (const row of rows) {
        const text = row.textContent?.toLowerCase() || "";
        if (text.startsWith(day) || text.includes(day + ":")) {
          // Check 24hr checkbox
          const cb24 = row.querySelector('input[type="checkbox"]');
          if (cb24) cb24.checked = !!dayConf.is24Hr;

          if (!dayConf.is24Hr) {
            const selects = row.querySelectorAll("select");
            if (selects.length >= 2) {
              selectDropdownOption(selects[0], dayConf.start);
              selectDropdownOption(selects[1], dayConf.finish);
            }
          }
          break;
        }
      }
    }

    await sleep(1000);

    // === PART 9: CLOUDFLARE TURNSTILE CAPTCHA CHECK ===
    const turnstileWidget = document.querySelector('.cf-turnstile, [name="cf-turnstile-response"], iframe[src*="turnstile"]');
    if (turnstileWidget) {
      await log("Cloudflare Turnstile detected. Waiting for verification...", "warning");
      let turnstileSolved = false;
      for (let i = 0; i < 30; i++) {
        const responseInput = document.querySelector('input[name="cf-turnstile-response"]');
        if (responseInput && responseInput.value.length > 10) {
          turnstileSolved = true;
          break;
        }
        await sleep(1000);
      }
      if (turnstileSolved) {
        await log("Cloudflare Turnstile verified successfully!", "success");
      } else {
        await log("Continuing... Please complete Turnstile captcha manually if prompted.", "warning");
      }
    }

    // Pre-flight validation: Ensure City is definitely selected before proceeding
    const preCheckCity = findCitySelect();
    if (preCheckCity && (!preCheckCity.value || preCheckCity.value === "")) {
      const availableOpts = Array.from(preCheckCity.options).filter((o) => o.value && !o.text.toLowerCase().includes("select"));
      if (availableOpts.length > 0) {
        const fallback = availableOpts[(taskData.cityIndex || 0) % availableOpts.length];
        preCheckCity.selectedIndex = Array.from(preCheckCity.options).indexOf(fallback);
        preCheckCity.value = fallback.value;
        fallback.selected = true;
        triggerEvents(preCheckCity);
        triggerPageChange('select[name*="city"], #city, select[name*="area"]');
        updateHudCity(fallback.text.trim());
        await log(`Safety check resolved: Selected City "${fallback.text.trim()}"`, "success");
      }
    }

    // === PART 10: CLICK 'NEXT Add Images' BUTTON ===
    await log("All fields populated. Finding 'NEXT Add Images' button...", "info");
    await sleep(taskData.stepDelaySeconds * 1000);

    const buttons = Array.from(document.querySelectorAll('input[type="Submit"], button, .new-submit, a.round-box-link'));
    const nextBtn = buttons.find((btn) => {
      const val = (btn.value || btn.textContent || "").trim().toLowerCase();
      return val.includes("next") || val.includes("add images");
    });

    if (nextBtn) {
      nextBtn.scrollIntoView({ behavior: "smooth", block: "center" });
      await sleep(1000);
      await log("Clicking 'NEXT Add Images' button!", "success");
      nextBtn.click();
    } else {
      await log("Could not find NEXT button, attempting form submit...", "warning");
      document.querySelector("form")?.submit();
    }
  }

  // 4. Handle Image / Final Step Page
  async function handlePostListingPage() {
    await log("On Post-Listing / Image Step...", "info");
    const cityPosted = sessionStorage.getItem("sh_last_city") || "USA City";

    if (taskData.pauseForImages) {
      await log("Paused for manual image upload as configured. Please add images and complete post.", "warning");
      return;
    }

    await sleep(taskData.stepDelaySeconds * 1000);

    // Look for Publish, Finish, Complete, or Skip button
    const buttons = Array.from(document.querySelectorAll('input[type="Submit"], button, a.box-link, a.new-submit, a'));
    const completeBtn = buttons.find((btn) => {
      const val = (btn.value || btn.textContent || "").trim().toLowerCase();
      return (
        val.includes("publish") ||
        val.includes("finish") ||
        val.includes("complete") ||
        val.includes("done") ||
        val.includes("skip") ||
        val.includes("save")
      );
    });

    if (completeBtn) {
      await log(`Clicking completion button: "${completeBtn.textContent || completeBtn.value}"...`, "info");
      completeBtn.click();
      await sleep(2000);
    }

    // Report success to background!
    await log(`Posting completed for account ${taskData.account.username} in ${cityPosted}!`, "success");
    const res = await chrome.runtime.sendMessage({
      type: "ACCOUNT_POST_COMPLETED",
      city: cityPosted
    });

    await sleep(2000);

    if (res && res.hasNext) {
      await log(`Logging out... Preparing to switch to Account #${(res.nextIndex || 0) + 1} (${res.nextUsername})!`, "info");
    } else {
      await log("All accounts finished posting! Logging out...", "success");
    }

    await sleep(1500);

    // Click top logout link or navigate to logout.php
    const logoutBtn = document.querySelector('a.logout-top, a[href*="logout.php"]') ||
                      Array.from(document.querySelectorAll("a, button")).find((el) => el.textContent.trim().toLowerCase() === "logout");
    if (logoutBtn) {
      logoutBtn.click();
    } else {
      window.location.href = "https://secrethostess.com/admin/logout.php";
    }
  }

  // Main coordinator
  async function init() {
    try {
      const res = await chrome.runtime.sendMessage({ type: "GET_TASK_DATA" });
      if (!res || !res.active) return;

      taskData = res;
      createHud(taskData.account, taskData.cityIndex, taskData.totalAccounts);

      if (taskData.isPaused) {
        await log("Automation is currently paused.", "warning");
        return;
      }

      const path = window.location.pathname.toLowerCase();
      console.log(`[AutoPoster] Current path: ${path}`);

      if (path.includes("login.php")) {
        await handleLoginPage();
      } else if (path.includes("dashboard.php")) {
        await handleDashboardPage();
      } else if (path.includes("add_listing_content.php")) {
        await handleAddListingPage();
      } else if (path.includes("add_listing") || path.includes("image") || path.includes("listing")) {
        await handlePostListingPage();
      } else if (path.includes("logout.php")) {
        await sleep(1200);
        window.location.href = "https://secrethostess.com/admin/login.php";
      }
    } catch (err) {
      console.error("[AutoPoster] Error in content script:", err);
    }
  }

  // Run when document is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
