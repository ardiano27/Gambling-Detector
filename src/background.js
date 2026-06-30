const BADGE_COLORS = {
  low: "#2f855a",
  medium: "#b7791f",
  high: "#c53030"
};

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get("settings");
  if (!stored.settings) {
    await chrome.storage.sync.set({
      settings: {
        enabled: true,
        sensitivity: "medium",
        highlight: true,
        blockOverlay: true,
        customKeywords: []
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message || message.type !== "GAMBLING_DETECTOR_SCAN_COMPLETE") {
    return;
  }

  const tabId = sender.tab && sender.tab.id;
  if (typeof tabId !== "number") {
    return;
  }

  const payload = message.payload;
  const riskLevel = payload.combined ? payload.combined.riskLevel : "low";

  const result = {
    ...payload,
    tabId,
    scannedAt: new Date().toISOString()
  };

  chrome.storage.local.set({
    latestScan: result,
    [`scan:${tabId}`]: result
  });

  if (riskLevel === "high") {
    chrome.action.setBadgeText({ tabId, text: "!" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLORS.high });
  } else if (riskLevel === "medium") {
    chrome.action.setBadgeText({ tabId, text: "?" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLORS.medium });
  } else {
    chrome.action.setBadgeText({ tabId, text: "" });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(`scan:${tabId}`);
});
