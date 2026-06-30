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
        background: rgba(239, 68, 68, .18) !important;
        color: inherit !important;
        border-radius: 3px !important;
        box-shadow: 0 0 0 1px rgba(239, 68, 68, .3) !important;
        padding: 1px 3px !important;
        border-bottom: 2px solid rgba(239, 68, 68, .5) !important;
      }

      #${BANNER_ID} {
        position: fixed !important;
        z-index: 2147483647 !important;
        right: 18px !important;
        top: 18px !important;
        width: min(340px, calc(100vw - 36px)) !important;
        box-sizing: border-box !important;
        padding: 0 !important;
        border: 1px solid rgba(255, 255, 255, .08) !important;
        border-radius: 14px !important;
        background: rgba(15, 21, 35, .88) !important;
        color: #e8ecf1 !important;
        box-shadow: 0 20px 50px rgba(0, 0, 0, .45), 0 0 0 1px rgba(255,255,255,.04) !important;
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif !important;
        line-height: 1.45 !important;
        backdrop-filter: blur(16px) saturate(1.4) !important;
        -webkit-backdrop-filter: blur(16px) saturate(1.4) !important;
        animation: gambling-detector-slide .35s ease !important;
        overflow: hidden !important;
      }

      @keyframes gambling-detector-slide {
        from { opacity: 0; transform: translateY(-10px) scale(.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      #${BANNER_ID} .gambling-detector-bar {
        height: 3px !important;
        background: linear-gradient(90deg, #ef4444, #f97316, #ef4444) !important;
        background-size: 200% 100% !important;
        animation: gambling-detector-bar-move 2s linear infinite !important;
      }

      @keyframes gambling-detector-bar-move {
        0% { background-position: 0% 0; }
        100% { background-position: 200% 0; }
      }

      #${BANNER_ID} .gambling-detector-body {
        padding: 14px 16px !important;
      }

      #${BANNER_ID} .gambling-detector-title-row {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        margin-bottom: 8px !important;
      }

      #${BANNER_ID} .gambling-detector-icon {
        width: 28px !important;
        height: 28px !important;
        border-radius: 8px !important;
        background: rgba(239, 68, 68, .15) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 14px !important;
        flex: 0 0 28px !important;
      }

      #${BANNER_ID} strong {
        display: block !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        color: #ffffff !important;
      }

      #${BANNER_ID} .gambling-detector-risk-pill {
        display: inline-block !important;
        padding: 2px 8px !important;
        border-radius: 12px !important;
        font-size: 10px !important;
        font-weight: 800 !important;
        text-transform: uppercase !important;
        letter-spacing: .4px !important;
        margin-left: auto !important;
      }

      #${BANNER_ID} .gambling-detector-risk-pill.high {
        background: rgba(239, 68, 68, .18) !important;
        color: #ef4444 !important;
      }

      #${BANNER_ID} .gambling-detector-risk-pill.medium {
        background: rgba(234, 179, 8, .18) !important;
        color: #eab308 !important;
      }

      #${BANNER_ID} p {
        margin: 0 0 12px !important;
        font-size: 12px !important;
        color: #8896a8 !important;
      }

      #${BANNER_ID} .gambling-detector-actions {
        display: flex !important;
        gap: 8px !important;
      }

      #${BANNER_ID} button {
        border: none !important;
        border-radius: 8px !important;
        background: #ef4444 !important;
        color: #ffffff !important;
        cursor: pointer !important;
        font: 600 12px 'Segoe UI', system-ui, sans-serif !important;
        padding: 8px 14px !important;
        transition: opacity .15s ease !important;
      }

      #${BANNER_ID} button:hover {
        opacity: .85 !important;
      }

      #${BANNER_ID} button.secondary {
        background: rgba(255, 255, 255, .08) !important;
        color: #c8d1dc !important;
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
      "SCRIPT", "STYLE", "TEXTAREA", "INPUT",
      "SELECT", "OPTION", "NOSCRIPT", "CODE", "PRE"
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
    const riskLevel = result.combined ? result.combined.riskLevel : result.riskLevel;
    if (!document.body || riskLevel === "low") return;

    injectStyles();

    const totalMatches = result.content ? result.content.totalMatches : (result.totalMatches || 0);
    const urlKeywords = result.url ? result.url.matchedKeywords.length : 0;

    const banner = document.createElement("aside");
    banner.id = BANNER_ID;
    banner.setAttribute("role", "alert");
    banner.innerHTML = `
      <div class="gambling-detector-bar"></div>
      <div class="gambling-detector-body">
        <div class="gambling-detector-title-row">
          <span class="gambling-detector-icon">&#9888;</span>
          <strong>Gambling Site Detected</strong>
          <span class="gambling-detector-risk-pill ${riskLevel}">${riskLevel.toUpperCase()}</span>
        </div>
        <p>URL signals: ${urlKeywords} keyword(s) &middot; Content matches: ${totalMatches}</p>
        <div class="gambling-detector-actions">
          <button type="button" data-action="close">Dismiss</button>
          <button class="secondary" type="button" data-action="toggle-highlight">Toggle highlight</button>
        </div>
      </div>
    `;

    banner.addEventListener("click", (event) => {
      const action = event.target && event.target.dataset && event.target.dataset.action;
      if (action === "close") banner.remove();
      if (action === "toggle-highlight") {
        if (STATE.highlighted) {
          removeHighlights();
        } else {
          const terms = STATE.result && STATE.result.content ? STATE.result.content.foundTerms : [];
          highlightTerms(terms);
        }
      }
    });

    document.body.appendChild(banner);
  }

  function notifyResult(result) {
    chrome.runtime.sendMessage({
      type: "GAMBLING_DETECTOR_SCAN_COMPLETE",
      payload: result
    });
  }

  async function loadSettings() {
    const stored = await chrome.storage.sync.get("settings");
    STATE.settings = { ...DEFAULT_SETTINGS, ...(stored.settings || {}) };
    return STATE.settings;
  }

  async function scanPage() {
    const settings = await loadSettings();
    removeBanner();
    removeHighlights();

    if (!settings.enabled || !document.body) {
      STATE.result = {
        enabled: false,
        url: location.href,
        title: document.title,
        combined: { score: 0, riskLevel: "low", confidence: 0, engineUsed: "none" },
        url_analysis: null,
        content: null
      };
      notifyResult(STATE.result);
      return STATE.result;
    }

    const pageURL = location.href;
    const pageText = document.body.innerText || "";
    const analysis = Engine.analyzeCombined(pageURL, pageText, settings);

    const result = {
      enabled: true,
      url: pageURL,
      title: document.title,
      scannedTextLength: pageText.length,
      combined: analysis.combined,
      url_analysis: analysis.url,
      content: analysis.content
    };

    STATE.result = result;

    if (settings.highlight && analysis.combined.riskLevel !== "low") {
      highlightTerms(analysis.content.foundTerms || []);
    }

    if (analysis.combined.riskLevel !== "low") {
      showBanner({ combined: analysis.combined, url: analysis.url, content: analysis.content });
      if (STATE.settings.blockOverlay && analysis.combined.riskLevel === "high") {
        showBanner({ combined: analysis.combined, url: analysis.url, content: analysis.content });
      }
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
    scanTimer = setTimeout(() => { scanPage(); }, 1200);
  });

  if (document.body) {
    scanPage();
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      scanPage();
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }, { once: true });
  }
})();
