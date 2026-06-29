const DEFAULT_SETTINGS = {
  enabled: true,
  sensitivity: "medium",
  highlight: true,
  blockOverlay: false,
  customKeywords: []
};

const form = document.getElementById("optionsForm");
const fields = {
  enabled: document.getElementById("enabled"),
  sensitivity: document.getElementById("sensitivity"),
  highlight: document.getElementById("highlight"),
  blockOverlay: document.getElementById("blockOverlay"),
  customKeywords: document.getElementById("customKeywords"),
  saveStatus: document.getElementById("saveStatus"),
  resetButton: document.getElementById("resetButton")
};

function parseKeywords(value) {
  return value
    .split(/\r?\n/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function renderSettings(settings) {
  fields.enabled.checked = settings.enabled;
  fields.sensitivity.value = settings.sensitivity;
  fields.highlight.checked = settings.highlight;
  fields.blockOverlay.checked = settings.blockOverlay;
  fields.customKeywords.value = (settings.customKeywords || []).join("\n");
}

function readSettings() {
  return {
    enabled: fields.enabled.checked,
    sensitivity: fields.sensitivity.value,
    highlight: fields.highlight.checked,
    blockOverlay: fields.blockOverlay.checked,
    customKeywords: parseKeywords(fields.customKeywords.value)
  };
}

async function notifyTabs() {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map((tab) => {
    if (!tab.id) return Promise.resolve();
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { type: "GAMBLING_DETECTOR_SETTINGS_UPDATED" }, () => {
        resolve();
      });
    });
  }));
}

async function saveSettings(settings) {
  await chrome.storage.sync.set({ settings });
  await notifyTabs();
  fields.saveStatus.textContent = "Saved";
  setTimeout(() => {
    fields.saveStatus.textContent = "";
  }, 1800);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveSettings(readSettings());
});

fields.resetButton.addEventListener("click", async () => {
  renderSettings(DEFAULT_SETTINGS);
  await saveSettings({ ...DEFAULT_SETTINGS });
});

document.addEventListener("DOMContentLoaded", async () => {
  const stored = await chrome.storage.sync.get("settings");
  renderSettings({
    ...DEFAULT_SETTINGS,
    ...(stored.settings || {})
  });
});
