const DEFAULT_SETTINGS = {
  enabled: true,
  sensitivity: "medium",
  highlight: true,
  blockOverlay: false,
  customKeywords: []
};

const elements = {
  enabledToggle: document.getElementById("enabledToggle"),
  statusCard: document.getElementById("statusCard"),
  riskLabel: document.getElementById("riskLabel"),
  scoreValue: document.getElementById("scoreValue"),
  statusText: document.getElementById("statusText"),
  matchCount: document.getElementById("matchCount"),
  sensitivityValue: document.getElementById("sensitivityValue"),
  termsList: document.getElementById("termsList"),
  rescanButton: document.getElementById("rescanButton"),
  optionsButton: document.getElementById("optionsButton")
};

let activeTabId = null;
let settings = { ...DEFAULT_SETTINGS };

function sendToActiveTab(message) {
  if (!activeTabId) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(activeTabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response);
    });
  });
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

function renderEmpty(message) {
  elements.statusCard.className = "status-card low";
  elements.riskLabel.textContent = "Unavailable";
  elements.scoreValue.textContent = "-";
  elements.statusText.textContent = message;
  elements.matchCount.textContent = "0";
  elements.sensitivityValue.textContent = settings.sensitivity;
  elements.termsList.innerHTML = "<li>No matches.</li>";
}

function renderResult(result) {
  if (!result) {
    renderEmpty("This page cannot be scanned yet. Try refreshing the tab.");
    return;
  }

  const riskLevel = result.enabled ? result.riskLevel : "low";
  elements.statusCard.className = `status-card ${riskLevel}`;
  elements.riskLabel.textContent = result.enabled ? riskLevel.toUpperCase() : "DISABLED";
  elements.scoreValue.textContent = String(result.score);
  elements.matchCount.textContent = String(result.totalMatches);
  elements.sensitivityValue.textContent = settings.sensitivity;

  if (!result.enabled) {
    elements.statusText.textContent = "Detector is turned off.";
  } else if (riskLevel === "high") {
    elements.statusText.textContent = "Strong gambling signals were found on this page.";
  } else if (riskLevel === "medium") {
    elements.statusText.textContent = "Some gambling-related signals were found.";
  } else {
    elements.statusText.textContent = "No meaningful gambling signal found.";
  }

  if (!result.foundTerms || result.foundTerms.length === 0) {
    elements.termsList.innerHTML = "<li>No matches.</li>";
    return;
  }

  elements.termsList.innerHTML = "";
  result.foundTerms.slice(0, 6).forEach((item) => {
    const li = document.createElement("li");
    const term = document.createElement("span");
    const count = document.createElement("strong");
    term.textContent = item.term;
    count.textContent = `${item.count}x`;
    li.append(term, count);
    elements.termsList.appendChild(li);
  });
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get("settings");
  settings = {
    ...DEFAULT_SETTINGS,
    ...(stored.settings || {})
  };
  elements.enabledToggle.checked = settings.enabled;
  elements.sensitivityValue.textContent = settings.sensitivity;
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

elements.rescanButton.addEventListener("click", async () => {
  elements.rescanButton.disabled = true;
  const response = await sendToActiveTab({ type: "GAMBLING_DETECTOR_RESCAN" });
  renderResult(response && response.result);
  elements.rescanButton.disabled = false;
});

elements.optionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

elements.enabledToggle.addEventListener("change", async () => {
  settings.enabled = elements.enabledToggle.checked;
  await chrome.storage.sync.set({ settings });
  const response = await sendToActiveTab({ type: "GAMBLING_DETECTOR_SETTINGS_UPDATED" });
  renderResult(response && response.result);
});

document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  await loadCurrentResult();
});
