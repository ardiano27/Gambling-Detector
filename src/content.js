(() => {
  const Engine = self.GamblingDetector && self.GamblingDetector.Engine;

  const DEFAULT_SETTINGS = {
    enabled: true,
    sensitivity: "medium",
    highlight: true,
    blockOverlay: true,
    customKeywords: []
  };

  const STATE = { settings: { ...DEFAULT_SETTINGS }, result: null, highlighted: false };

  const STYLE_ID = "gambling-detector-style";
  const BANNER_ID = "gambling-detector-banner";
  const OVERLAY_ID = "gambling-detector-overlay";
  const HIGHLIGHT_CLASS = "gambling-detector-hl";

  const SVG_SHIELD = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3Z" fill="rgba(244,63,94,.15)" stroke="rgba(244,63,94,.6)" stroke-width="1.5"/><path d="m9 12 2 2 4-4" stroke="rgba(244,63,94,.8)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const SVG_SHIELD_LG = '<svg viewBox="0 0 48 48" width="56" height="56" fill="none"><path d="M24 4 8 10v12.18c0 10.1 6.82 19.52 16 21.82 9.18-2.3 16-11.72 16-21.82V10L24 4Z" fill="rgba(244,63,94,.08)" stroke="rgba(244,63,94,.35)" stroke-width="2"/><path d="M18 25l5 5 9-9" stroke="rgba(244,63,94,.7)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function escapeRegExp(v) { return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function escapeHTML(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      .${HIGHLIGHT_CLASS}{background:rgba(244,63,94,.13)!important;color:inherit!important;border-radius:2px!important;box-shadow:inset 0 -2px 0 rgba(244,63,94,.4)!important;padding:0 2px!important}

      #${BANNER_ID}{position:fixed!important;z-index:2147483646!important;right:16px!important;top:16px!important;width:min(320px,calc(100vw-32px))!important;box-sizing:border-box!important;border:1px solid rgba(255,255,255,.06)!important;border-radius:12px!important;background:rgba(12,17,29,.92)!important;color:#eef1f6!important;box-shadow:0 16px 48px rgba(0,0,0,.5)!important;font:13px/1.45 'Segoe UI',system-ui,sans-serif!important;backdrop-filter:blur(20px) saturate(1.3)!important;-webkit-backdrop-filter:blur(20px) saturate(1.3)!important;animation:gd-slide .3s ease!important;overflow:hidden!important}
      @keyframes gd-slide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}

      #${BANNER_ID} .gd-bar{height:2px!important;background:linear-gradient(90deg,#f43f5e,#f59e0b,#f43f5e)!important;background-size:200% 100%!important;animation:gd-bar 2.5s linear infinite!important}
      @keyframes gd-bar{0%{background-position:0% 0}100%{background-position:200% 0}}

      #${BANNER_ID} .gd-body{padding:12px 14px!important}
      #${BANNER_ID} .gd-head{display:flex!important;align-items:center!important;gap:8px!important;margin-bottom:8px!important}
      #${BANNER_ID} .gd-icon{width:28px!important;height:28px!important;border-radius:7px!important;background:rgba(244,63,94,.08)!important;display:flex!important;align-items:center!important;justify-content:center!important;flex:0 0 28px!important}
      #${BANNER_ID} .gd-title{font-size:13px!important;font-weight:700!important;color:#fff!important;flex:1!important}
      #${BANNER_ID} .gd-pill{padding:2px 7px!important;border-radius:5px!important;font-size:9px!important;font-weight:700!important;text-transform:uppercase!important;letter-spacing:.3px!important}
      #${BANNER_ID} .gd-pill.high{background:rgba(244,63,94,.12)!important;color:#f43f5e!important}
      #${BANNER_ID} .gd-pill.medium{background:rgba(245,158,11,.12)!important;color:#f59e0b!important}
      #${BANNER_ID} p{margin:0 0 10px!important;font-size:11px!important;color:#8896a8!important}
      #${BANNER_ID} .gd-btns{display:flex!important;gap:6px!important}
      #${BANNER_ID} button{border:none!important;border-radius:7px!important;cursor:pointer!important;font:600 11px 'Segoe UI',system-ui,sans-serif!important;padding:7px 12px!important;transition:filter .12s!important}
      #${BANNER_ID} button:hover{filter:brightness(1.1)!important}
      #${BANNER_ID} .gd-btn-pri{background:#f43f5e!important;color:#fff!important}
      #${BANNER_ID} .gd-btn-sec{background:rgba(255,255,255,.06)!important;color:#8896a8!important}

      #${OVERLAY_ID}{position:fixed!important;inset:0!important;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;background:#0a0e1a!important;color:#eef1f6!important;font-family:'Segoe UI',system-ui,sans-serif!important;animation:gd-fade .35s ease!important;overflow-y:auto!important}
      @keyframes gd-fade{from{opacity:0}to{opacity:1}}
      #${OVERLAY_ID} *{box-sizing:border-box!important;margin:0!important;padding:0!important}

      .gd-ov-wrap{width:min(440px,calc(100vw-40px))!important;padding:48px 0!important;text-align:center!important}
      .gd-ov-shield{width:72px!important;height:72px!important;margin:0 auto 20px!important;border-radius:50%!important;background:rgba(244,63,94,.06)!important;border:1.5px solid rgba(244,63,94,.18)!important;display:flex!important;align-items:center!important;justify-content:center!important;animation:gd-ring 2.5s ease infinite!important}
      @keyframes gd-ring{0%,100%{box-shadow:0 0 0 0 rgba(244,63,94,.15)}50%{box-shadow:0 0 0 12px rgba(244,63,94,0)}}
      .gd-ov-h1{font-size:22px!important;font-weight:800!important;color:#fff!important;margin-bottom:6px!important;letter-spacing:-.02em!important}
      .gd-ov-sub{font-size:13px!important;color:#4b5a73!important;line-height:1.55!important;margin-bottom:24px!important;max-width:360px!important;margin-left:auto!important;margin-right:auto!important}

      .gd-ov-badge{display:inline-block!important;padding:4px 14px!important;border-radius:6px!important;font-size:11px!important;font-weight:700!important;text-transform:uppercase!important;letter-spacing:.4px!important;background:rgba(244,63,94,.1)!important;color:#f43f5e!important;margin-bottom:20px!important}

      .gd-ov-scores{display:flex!important;justify-content:center!important;gap:8px!important;margin-bottom:16px!important}
      .gd-ov-sc{padding:10px 20px!important;background:#141b2d!important;border:1px solid #1c2539!important;border-radius:10px!important;text-align:center!important;min-width:90px!important}
      .gd-ov-sc strong{display:block!important;font-size:20px!important;font-weight:800!important;color:#f43f5e!important;line-height:1!important}
      .gd-ov-sc span{font-size:9px!important;color:#4b5a73!important;text-transform:uppercase!important;letter-spacing:.3px!important;margin-top:4px!important;display:block!important}

      .gd-ov-card{background:#141b2d!important;border:1px solid #1c2539!important;border-radius:12px!important;padding:18px!important;margin-bottom:20px!important;text-align:left!important}
      .gd-ov-label{font-size:9px!important;font-weight:700!important;text-transform:uppercase!important;letter-spacing:.5px!important;color:#4b5a73!important;margin-bottom:8px!important}
      .gd-ov-url{display:block!important;padding:9px 12px!important;background:rgba(244,63,94,.04)!important;border:1px solid rgba(244,63,94,.1)!important;border-radius:7px!important;font:12px/1.4 'Cascadia Code','Consolas',monospace!important;color:#f43f5e!important;word-break:break-all!important;margin-bottom:14px!important}

      .gd-ov-list{list-style:none!important}
      .gd-ov-list li{display:flex!important;justify-content:space-between!important;align-items:center!important;padding:7px 10px!important;border-radius:7px!important;font-size:11px!important}
      .gd-ov-list li:nth-child(odd){background:rgba(255,255,255,.02)!important}
      .gd-ov-list .gd-sn{color:#eef1f6!important;font-weight:600!important}
      .gd-ov-list .gd-sv{color:#4b5a73!important;font-family:'Cascadia Code','Consolas',monospace!important;font-size:10px!important}
      .gd-ov-list .gd-si{color:#f43f5e!important;font-weight:700!important;font-size:10px!important;font-family:'Cascadia Code','Consolas',monospace!important;margin-left:8px!important;flex:0 0 auto!important}

      .gd-ov-btns{display:flex!important;gap:8px!important;justify-content:center!important}
      .gd-ov-btns button{border:none!important;border-radius:9px!important;cursor:pointer!important;font-weight:700!important;font-family:'Segoe UI',system-ui,sans-serif!important;padding:11px 24px!important;font-size:13px!important;transition:filter .12s,transform .08s!important}
      .gd-ov-btns button:hover{filter:brightness(1.06)!important}
      .gd-ov-btns button:active{transform:scale(.97)!important}
      .gd-ov-back{background:#22c55e!important;color:#0a0e1a!important}
      .gd-ov-cont{background:rgba(255,255,255,.04)!important;color:#4b5a73!important;border:1px solid #1c2539!important;font-size:11px!important;padding:11px 18px!important}

      .gd-ov-foot{margin-top:20px!important;font-size:10px!important;color:#2a3548!important;letter-spacing:.01em!important}
    `;
    document.documentElement.appendChild(s);
  }

  function removeHighlights() {
    document.querySelectorAll("." + HIGHLIGHT_CLASS).forEach((n) => {
      const t = document.createTextNode(n.textContent || "");
      n.replaceWith(t);
      t.parentNode && t.parentNode.normalize();
    });
    STATE.highlighted = false;
  }

  function shouldSkip(node) {
    const p = node.parentElement;
    if (!p) return true;
    const t = p.tagName;
    return ["SCRIPT","STYLE","TEXTAREA","INPUT","SELECT","OPTION","NOSCRIPT","CODE","PRE"].includes(t) || p.closest("#" + BANNER_ID + ",#" + OVERLAY_ID + ",." + HIGHLIGHT_CLASS);
  }

  function highlightTerms(terms) {
    removeHighlights();
    if (!terms.length || !document.body) return;
    injectStyles();
    const sel = terms.slice(0, 8).map((i) => i.term);
    const pat = sel.map((t) => escapeRegExp(t).replace(/\s+/g, "\\s+")).join("|");
    const re = new RegExp("(" + pat + ")", "gi");
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) { return shouldSkip(n) ? NodeFilter.FILTER_REJECT : re.test(n.nodeValue || "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
    });
    const nodes = []; let reps = 0; let c;
    while ((c = w.nextNode()) && nodes.length < 80) nodes.push(c);
    nodes.forEach((n) => {
      if (reps >= 120) return;
      const f = document.createDocumentFragment();
      (n.nodeValue || "").split(re).forEach((p) => {
        if (!p) return;
        if (re.test(p) && reps < 120) {
          const m = document.createElement("span"); m.className = HIGHLIGHT_CLASS; m.textContent = p;
          f.appendChild(m); reps++;
        } else { f.appendChild(document.createTextNode(p)); }
      });
      n.replaceWith(f);
    });
    STATE.highlighted = reps > 0;
  }

  function removeBanner() { const e = document.getElementById(BANNER_ID); if (e) e.remove(); }
  function removeOverlay() { const e = document.getElementById(OVERLAY_ID); if (e) e.remove(); }

  function showBanner(data) {
    removeBanner();
    const risk = data.combined ? data.combined.riskLevel : "low";
    if (!document.body || risk === "low") return;
    injectStyles();
    const matches = data.content ? data.content.totalMatches : 0;
    const kws = data.url ? data.url.matchedKeywords.length : 0;
    const b = document.createElement("aside"); b.id = BANNER_ID; b.setAttribute("role", "alert");
    b.innerHTML = '<div class="gd-bar"></div><div class="gd-body"><div class="gd-head"><span class="gd-icon">' + SVG_SHIELD + '</span><span class="gd-title">Gambling Site Detected</span><span class="gd-pill ' + risk + '">' + risk.toUpperCase() + '</span></div><p>URL: ' + kws + ' keyword(s) found &middot; Content: ' + matches + ' match(es)</p><div class="gd-btns"><button class="gd-btn-pri" data-action="close">Dismiss</button><button class="gd-btn-sec" data-action="toggle-highlight">Highlight</button></div></div>';
    b.addEventListener("click", (e) => {
      const a = e.target && e.target.dataset && e.target.dataset.action;
      if (a === "close") b.remove();
      if (a === "toggle-highlight") {
        if (STATE.highlighted) removeHighlights();
        else highlightTerms(STATE.result && STATE.result.content ? STATE.result.content.foundTerms : []);
      }
    });
    document.body.appendChild(b);
  }

  function showBlockOverlay(analysis) {
    removeOverlay();
    if (!document.body) return;
    injectStyles();
    const ur = analysis.url || {}, cr = analysis.content || {}, co = analysis.combined || {};
    const sigs = (ur.matchedSignals || []).slice(0, 5);
    let sigHTML = "";
    if (sigs.length) {
      sigHTML = sigs.map((s) => '<li><span><span class="gd-sn">' + escapeHTML(s.feature) + '</span> <span class="gd-sv">' + escapeHTML(s.value) + '</span></span><span class="gd-si">+' + s.impact + '</span></li>').join("");
    } else {
      sigHTML = '<li><span class="gd-sv">Detected via content analysis</span></li>';
    }
    const ov = document.createElement("div"); ov.id = OVERLAY_ID;
    ov.innerHTML = '<div class="gd-ov-wrap"><div class="gd-ov-shield">' + SVG_SHIELD_LG + '</div><div class="gd-ov-h1">Website Blocked</div><div class="gd-ov-sub">This website has been identified as a gambling site. Access has been restricted for your protection.</div><span class="gd-ov-badge">' + (co.riskLevel || "high").toUpperCase() + ' RISK</span><div class="gd-ov-scores"><div class="gd-ov-sc"><strong>' + (ur.score || 0) + '</strong><span>URL Score</span></div><div class="gd-ov-sc"><strong>' + (cr.score || 0) + '</strong><span>Content</span></div><div class="gd-ov-sc"><strong>' + (co.score || 0) + '</strong><span>Combined</span></div></div><div class="gd-ov-card"><div class="gd-ov-label">Blocked URL</div><div class="gd-ov-url">' + escapeHTML(location.href) + '</div><div class="gd-ov-label">Detection Signals</div><ul class="gd-ov-list">' + sigHTML + '</ul></div><div class="gd-ov-btns"><button class="gd-ov-back" data-action="go-back">&larr; Go Back to Safety</button><button class="gd-ov-cont" data-action="continue">Continue Anyway</button></div><div class="gd-ov-foot">Protected by Gambling Detector &middot; Manage in extension settings</div></div>';
    ov.addEventListener("click", (e) => {
      const a = e.target && e.target.dataset && e.target.dataset.action;
      if (a === "go-back") { if (history.length > 1) history.back(); else window.close(); }
      if (a === "continue") ov.remove();
    });
    document.body.appendChild(ov);
  }

  function notifyResult(r) {
    chrome.runtime.sendMessage({ type: "GAMBLING_DETECTOR_SCAN_COMPLETE", payload: r });
  }

  async function loadSettings() {
    const stored = await chrome.storage.sync.get("settings");
    STATE.settings = { ...DEFAULT_SETTINGS, ...(stored.settings || {}) };
    return STATE.settings;
  }

  async function scanPage() {
    const settings = await loadSettings();
    removeBanner(); removeOverlay(); removeHighlights();

    if (!settings.enabled || !document.body) {
      STATE.result = { enabled: false, url: location.href, title: document.title, combined: { score: 0, riskLevel: "low", confidence: 0, engineUsed: "none" }, url_analysis: null, content: null };
      notifyResult(STATE.result);
      return STATE.result;
    }

    const url = location.href;
    const text = document.body.innerText || "";
    const a = Engine.analyzeCombined(url, text, settings);

    const result = { enabled: true, url: url, title: document.title, scannedTextLength: text.length, combined: a.combined, url_analysis: a.url, content: a.content };
    STATE.result = result;

    if (a.combined.riskLevel === "high" && settings.blockOverlay) {
      showBlockOverlay(a);
    } else if (a.combined.riskLevel !== "low") {
      if (settings.highlight) highlightTerms(a.content.foundTerms || []);
      showBanner({ combined: a.combined, url: a.url, content: a.content });
    }

    notifyResult(result);
    return result;
  }

  chrome.runtime.onMessage.addListener((msg, _s, reply) => {
    if (!msg || !msg.type) return false;
    if (msg.type === "GAMBLING_DETECTOR_GET_RESULT") { reply({ ok: true, result: STATE.result }); return false; }
    if (msg.type === "GAMBLING_DETECTOR_RESCAN") { scanPage().then((r) => reply({ ok: true, result: r })); return true; }
    if (msg.type === "GAMBLING_DETECTOR_SETTINGS_UPDATED") { scanPage().then((r) => reply({ ok: true, result: r })); return true; }
    return false;
  });

  let timer = null;
  const obs = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(scanPage, 1200); });
  if (document.body) { scanPage(); obs.observe(document.body, { childList: true, subtree: true, characterData: true }); }
  else { document.addEventListener("DOMContentLoaded", () => { scanPage(); obs.observe(document.body, { childList: true, subtree: true, characterData: true }); }, { once: true }); }
})();
