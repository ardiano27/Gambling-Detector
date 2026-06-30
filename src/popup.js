const DEFAULT_SETTINGS = {
  enabled: true,
  sensitivity: "medium",
  highlight: true,
  blockOverlay: false,
  customKeywords: []
};

const GAUGE_CIRCUMFERENCE = 327;
const MAX_DISPLAY_SCORE = 100;

const FEATURE_LABELS = {
  urlLength: "URL Length",
  domainLength: "Domain Length",
  pathLength: "Path Length",
  subdomainCount: "Subdomains",
  dotCount: "Dots",
  pathDepth: "Path Depth",
  queryParamCount: "Query Params",
  hyphenCount: "Hyphens",
  digitCount: "Digits in Domain",
  digitRatio: "Digit Ratio",
  specialCharCount: "Special Chars",
  isHTTPS: "HTTPS",
  isIPAddress: "IP Address",
  hasPort: "Has Port",
  isSuspiciousTLD: "Suspicious TLD",
  domainEntropy: "Domain Entropy",
  urlEntropy: "URL Entropy",
  keywordsInDomain: "Keywords (Domain)",
  keywordsInPath: "Keywords (Path)",
  keywordsTotal: "Keywords (Total)",
  domainTokenCount: "Domain Tokens"
};

const el = {
  enabledToggle: document.getElementById("enabledToggle"),
  statusCard: document.getElementById("statusCard"),
  riskLabel: document.getElementById("riskLabel"),
  scoreValue: document.getElementById("scoreValue"),
  statusText: document.getElementById("statusText"),
  hostnameText: document.getElementById("hostnameText"),
  urlScoreValue: document.getElementById("urlScoreValue"),
  contentScoreValue: document.getElementById("contentScoreValue"),
  confidenceValue: document.getElementById("confidenceValue"),
  engineLabel: document.getElementById("engineLabel"),
  urlRiskPill: document.getElementById("urlRiskPill"),
  urlSignalsList: document.getElementById("urlSignalsList"),
  contentRiskPill: document.getElementById("contentRiskPill"),
  termsList: document.getElementById("termsList"),
  featuresGrid: document.getElementById("featuresGrid"),
  rescanButton: document.getElementById("rescanButton"),
  optionsButton: document.getElementById("optionsButton"),
  gaugeFill: document.getElementById("gaugeFill")
};

let activeTabId = null;
let settings = { ...DEFAULT_SETTINGS };

function sendToActiveTab(message) {
  if (!activeTabId) return Promise.resolve(null);
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(activeTabId, message, (response) => {
      if (chrome.runtime.lastError) { resolve(null); return; }
      resolve(response);
    });
  });
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

function updateGauge(score) {
  const ratio = Math.min(score / MAX_DISPLAY_SCORE, 1);
  el.gaugeFill.style.strokeDashoffset = GAUGE_CIRCUMFERENCE - (ratio * GAUGE_CIRCUMFERENCE);
}

function animateScore(target) {
  const duration = 600;
  const start = performance.now();
  const from = parseInt(el.scoreValue.textContent) || 0;
  function step(now) {
    const elapsed = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - elapsed, 3);
    el.scoreValue.textContent = String(Math.round(from + (target - from) * ease));
    if (elapsed < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function setPill(element, riskLevel) {
  element.className = "mini-pill " + riskLevel;
  element.textContent = riskLevel.toUpperCase();
}

function renderURLSignals(urlResult) {
  if (!urlResult || !urlResult.matchedSignals || urlResult.matchedSignals.length === 0) {
    el.urlSignalsList.innerHTML = '<li class="signals-empty">No URL signals detected.</li>';
    return;
  }

  el.urlSignalsList.innerHTML = "";
  urlResult.matchedSignals.slice(0, 6).forEach((signal) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="signal-row">
        <span class="signal-name">${escapeHtml(signal.feature)}</span>
        <span class="signal-impact">+${signal.impact}</span>
      </div>
      <span class="signal-value">${escapeHtml(signal.value)}</span>
    `;
    el.urlSignalsList.appendChild(li);
  });
}

function renderContentTerms(contentResult) {
  if (!contentResult || !contentResult.foundTerms || contentResult.foundTerms.length === 0) {
    el.termsList.innerHTML = '<li class="terms-empty">No content matches.</li>';
    return;
  }

  const maxWeight = Math.max(...contentResult.foundTerms.map((t) => t.count * t.weight));
  el.termsList.innerHTML = "";
  contentResult.foundTerms.slice(0, 6).forEach((item) => {
    const li = document.createElement("li");
    const ratio = maxWeight > 0 ? Math.round((item.count * item.weight / maxWeight) * 100) : 0;
    li.innerHTML = `
      <span class="term-name">${escapeHtml(item.term)}</span>
      <span class="term-bar-wrap"><span class="term-bar" style="width:${ratio}%"></span></span>
      <span class="term-count">${item.count}x</span>
    `;
    el.termsList.appendChild(li);
  });
}

function renderFeatures(urlResult) {
  el.featuresGrid.innerHTML = "";
  if (!urlResult || !urlResult.features) return;

  const features = urlResult.features;
  Object.keys(FEATURE_LABELS).forEach((key) => {
    if (features[key] === undefined) return;
    const item = document.createElement("div");
    item.className = "feature-item";

    let value = features[key];
    let flagClass = "";
    if (key === "isSuspiciousTLD" || key === "isIPAddress" || key === "hasPort") {
      flagClass = value ? " flag-warn" : " flag-ok";
      value = value ? "Yes" : "No";
    } else if (key === "isHTTPS") {
      flagClass = value ? " flag-ok" : " flag-warn";
      value = value ? "Yes" : "No";
    } else if (typeof value === "number" && !Number.isInteger(value)) {
      value = value.toFixed(3);
    }

    item.innerHTML = `
      <span class="feature-label">${FEATURE_LABELS[key]}</span>
      <span class="feature-value${flagClass}">${value}</span>
    `;
    el.featuresGrid.appendChild(item);
  });
}

function renderEmpty(message) {
  el.statusCard.className = "status-card low";
  el.riskLabel.textContent = "Unavailable";
  el.scoreValue.textContent = "0";
  el.statusText.textContent = message;
  el.hostnameText.textContent = "";
  el.urlScoreValue.textContent = "0";
  el.contentScoreValue.textContent = "0";
  el.confidenceValue.textContent = "0%";
  setPill(el.urlRiskPill, "low");
  setPill(el.contentRiskPill, "low");
  el.urlSignalsList.innerHTML = '<li class="signals-empty">No URL signals detected.</li>';
  el.termsList.innerHTML = '<li class="terms-empty">No content matches.</li>';
  el.featuresGrid.innerHTML = "";
  updateGauge(0);
}

function renderResult(result) {
  if (!result) {
    renderEmpty("This page cannot be scanned yet. Try refreshing the tab.");
    return;
  }

  const combined = result.combined || { score: 0, riskLevel: "low", confidence: 0 };
  const urlResult = result.url_analysis || null;
  const contentResult = result.content || null;
  const riskLevel = result.enabled !== false ? combined.riskLevel : "low";

  el.statusCard.className = "status-card " + riskLevel;
  el.riskLabel.textContent = result.enabled !== false ? riskLevel.toUpperCase() : "DISABLED";

  animateScore(combined.score);
  updateGauge(combined.score);

  el.urlScoreValue.textContent = urlResult ? String(urlResult.score) : "0";
  el.contentScoreValue.textContent = contentResult ? String(contentResult.score) : "0";

  const confidence = combined.confidence != null ? Math.round(combined.confidence * 100) : 0;
  el.confidenceValue.textContent = confidence + "%";

  if (urlResult && urlResult.hostname) {
    el.hostnameText.textContent = urlResult.hostname;
  } else {
    el.hostnameText.textContent = "";
  }

  if (result.enabled === false) {
    el.statusText.textContent = "Detector is turned off.";
  } else if (riskLevel === "high") {
    el.statusText.textContent = "This website shows strong gambling indicators.";
  } else if (riskLevel === "medium") {
    el.statusText.textContent = "Some gambling-related signals found.";
  } else {
    el.statusText.textContent = "No gambling signals detected.";
  }

  setPill(el.urlRiskPill, urlResult ? urlResult.riskLevel : "low");
  setPill(el.contentRiskPill, contentResult ? contentResult.riskLevel : "low");

  renderURLSignals(urlResult);
  renderContentTerms(contentResult);
  renderFeatures(urlResult);
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get("settings");
  settings = { ...DEFAULT_SETTINGS, ...(stored.settings || {}) };
  el.enabledToggle.checked = settings.enabled;
}

async function loadCurrentResult() {
  const tab = await getActiveTab();
  activeTabId = tab && tab.id;
  const response = await sendToActiveTab({ type: "GAMBLING_DETECTOR_GET_RESULT" });
  if (response && response.result) {
    renderResult(response.result);
    return;
  }
  const stored = activeTabId ? await chrome.storage.local.get(`scan:${activeTabId}`) : {};
  renderResult(stored[`scan:${activeTabId}`]);
}

el.rescanButton.addEventListener("click", async () => {
  el.rescanButton.disabled = true;
  const response = await sendToActiveTab({ type: "GAMBLING_DETECTOR_RESCAN" });
  renderResult(response && response.result);
  el.rescanButton.disabled = false;
});

el.optionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

el.enabledToggle.addEventListener("change", async () => {
  settings.enabled = el.enabledToggle.checked;
  await chrome.storage.sync.set({ settings });
  const response = await sendToActiveTab({ type: "GAMBLING_DETECTOR_SETTINGS_UPDATED" });
  renderResult(response && response.result);
});

document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  await loadCurrentResult();
});
