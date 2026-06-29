(() => {
  const Engine = self.GamblingDetector && self.GamblingDetector.Engine;

  const DEFAULT_SETTINGS = {
    enabled: true,
    sensitivity: "medium",
    highlight: true,
    blockOverlay: false,
    customKeywords: []
  };

  const STATE = {
    settings: { ...DEFAULT_SETTINGS },
    result: null,
    highlighted: false
  };

  const STYLE_ID = "gambling-detector-style";
  const BANNER_ID = "gambling-detector-banner";
  const HIGHLIGHT_CLASS = "gambling-detector-highlight";

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .${HIGHLIGHT_CLASS} {
        background: #ffe45c !important;
        color: #151515 !important;
        border-radius: 3px !important;
        box-shadow: 0 0 0 1px rgba(126, 81, 0, 0.28) !important;
        padding: 0 2px !important;
      }

      #${BANNER_ID} {
        position: fixed !important;
        z-index: 2147483647 !important;
        right: 18px !important;
        top: 18px !important;
        width: min(360px, calc(100vw - 36px)) !important;
        box-sizing: border-box !important;
        padding: 14px !important;
        border: 1px solid rgba(120, 53, 15, 0.22) !important;
        border-radius: 8px !important;
        background: #fffaf0 !important;
        color: #1f2933 !important;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22) !important;
        font-family: Arial, Helvetica, sans-serif !important;
        line-height: 1.45 !important;
      }

      #${BANNER_ID} strong {
        display: block !important;
        margin-bottom: 4px !important;
        font-size: 15px !important;
      }

      #${BANNER_ID} p {
        margin: 0 0 10px !important;
        font-size: 13px !important;
      }

      #${BANNER_ID} .gambling-detector-actions {
        display: flex !important;
        gap: 8px !important;
      }

      #${BANNER_ID} button {
        border: 1px solid #9a3412 !important;
        border-radius: 6px !important;
        background: #9a3412 !important;
        color: #ffffff !important;
        cursor: pointer !important;
        font: 600 12px Arial, Helvetica, sans-serif !important;
        padding: 7px 10px !important;
      }

      #${BANNER_ID} button.secondary {
        background: #ffffff !important;
        color: #9a3412 !important;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function removeHighlights() {
    document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((node) => {
      const text = document.createTextNode(node.textContent || "");
      node.replaceWith(text);
      text.parentNode && text.parentNode.normalize();
    });
    STATE.highlighted = false;
  }

  function shouldSkipNode(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    const tagName = parent.tagName;
    return [
      "SCRIPT",
      "STYLE",
      "TEXTAREA",
      "INPUT",
      "SELECT",
      "OPTION",
      "NOSCRIPT",
      "CODE",
      "PRE"
    ].includes(tagName) || parent.closest(`#${BANNER_ID}, .${HIGHLIGHT_CLASS}`);
  }

  function highlightTerms(terms) {
    removeHighlights();
    if (!terms.length || !document.body) return;

    injectStyles();

    const selectedTerms = terms.slice(0, 8).map((item) => item.term);
    const pattern = selectedTerms
      .map((term) => escapeRegExp(term).replace(/\s+/g, "\\s+"))
      .join("|");
    const matcher = new RegExp(`(${pattern})`, "gi");
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
        return matcher.test(node.nodeValue || "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    const nodes = [];
    let replacements = 0;
    let current;
    while ((current = walker.nextNode()) && nodes.length < 80) {
      nodes.push(current);
    }

    nodes.forEach((node) => {
      if (replacements >= 120) return;
      const fragment = document.createDocumentFragment();
      const parts = (node.nodeValue || "").split(matcher);
      parts.forEach((part) => {
        if (!part) return;
        if (matcher.test(part) && replacements < 120) {
          const mark = document.createElement("span");
          mark.className = HIGHLIGHT_CLASS;
          mark.textContent = part;
          fragment.appendChild(mark);
          replacements += 1;
        } else {
          fragment.appendChild(document.createTextNode(part));
        }
      });
      node.replaceWith(fragment);
    });

    STATE.highlighted = replacements > 0;
  }

  function removeBanner() {
    const existing = document.getElementById(BANNER_ID);
    if (existing) existing.remove();
  }

  function showBanner(result) {
    removeBanner();
    if (!document.body || result.riskLevel === "low") return;

    injectStyles();

    const banner = document.createElement("aside");
    banner.id = BANNER_ID;
    banner.setAttribute("role", "alert");
    banner.innerHTML = `
      <strong>Gambling content detected</strong>
      <p>This page contains ${result.totalMatches} gambling-related match(es). Risk: ${result.riskLevel.toUpperCase()}.</p>
      <div class="gambling-detector-actions">
        <button type="button" data-action="close">Close</button>
        <button class="secondary" type="button" data-action="toggle-highlight">Toggle highlight</button>
      </div>
    `;

    banner.addEventListener("click", (event) => {
      const action = event.target && event.target.dataset && event.target.dataset.action;
      if (action === "close") {
        banner.remove();
      }
      if (action === "toggle-highlight") {
        if (STATE.highlighted) {
          removeHighlights();
        } else {
          highlightTerms(STATE.result ? STATE.result.foundTerms : []);
        }
      }
    });

    document.body.appendChild(banner);
  }

  function showBlockOverlay(result) {
    if (!STATE.settings.blockOverlay || result.riskLevel !== "high") return;
    showBanner(result);
  }

  function notifyResult(result) {
    chrome.runtime.sendMessage({
      type: "GAMBLING_DETECTOR_SCAN_COMPLETE",
      payload: result
    });
  }

  async function loadSettings() {
    const stored = await chrome.storage.sync.get("settings");
    STATE.settings = {
      ...DEFAULT_SETTINGS,
      ...(stored.settings || {})
    };
    return STATE.settings;
  }

  async function scanPage() {
    const settings = await loadSettings();
    removeBanner();
    removeHighlights();

    if (!settings.enabled || !document.body) {
      STATE.result = {
        enabled: settings.enabled,
        url: location.href,
        title: document.title,
        score: 0,
        riskLevel: "low",
        foundTerms: [],
        totalMatches: 0,
        scannedTextLength: 0,
        confidence: 0,
        engineUsed: "none"
      };
      notifyResult(STATE.result);
      return STATE.result;
    }

    const pageText = document.body.innerText || "";
    const detection = Engine.analyze(pageText, settings);

    const result = {
      enabled: settings.enabled,
      url: location.href,
      title: document.title,
      score: detection.score,
      riskLevel: detection.riskLevel,
      foundTerms: detection.foundTerms,
      totalMatches: detection.totalMatches,
      scannedTextLength: pageText.length,
      confidence: detection.confidence,
      engineUsed: detection.engineUsed
    };

    STATE.result = result;

    if (settings.highlight && result.riskLevel !== "low") {
      highlightTerms(result.foundTerms);
    }

    if (result.riskLevel !== "low") {
      showBanner(result);
      showBlockOverlay(result);
    }

    notifyResult(result);
    return result;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || !message.type) return false;

    if (message.type === "GAMBLING_DETECTOR_GET_RESULT") {
      sendResponse({ ok: true, result: STATE.result });
      return false;
    }

    if (message.type === "GAMBLING_DETECTOR_RESCAN") {
      scanPage().then((result) => sendResponse({ ok: true, result }));
      return true;
    }

    if (message.type === "GAMBLING_DETECTOR_SETTINGS_UPDATED") {
      scanPage().then((result) => sendResponse({ ok: true, result }));
      return true;
    }

    return false;
  });

  let scanTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      scanPage();
    }, 1200);
  });

  if (document.body) {
    scanPage();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      scanPage();
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }, { once: true });
  }
})();
