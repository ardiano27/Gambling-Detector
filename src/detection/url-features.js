(() => {
  "use strict";

  const ns = self.GamblingDetector = self.GamblingDetector || {};

  const GAMBLING_URL_KEYWORDS = [
    "slot", "gacor", "judi", "togel", "casino", "poker",
    "betting", "taruhan", "bandar", "parlay", "maxwin",
    "jackpot", "sportsbook", "toto", "bet", "gamble",
    "gambling", "roulette", "baccarat", "blackjack",
    "dominoqq", "ceme", "capsa", "sbobet", "freebet",
    "bola88", "slot88", "pragmatic", "joker", "pgsoft",
    "habanero", "spadegaming", "rtp", "scatter",
    "gampang", "menang", "livecasino", "sportbook",
    "tembak", "ikan", "sabung", "ayam", "cockfight",
    "wager", "odds", "keno", "sicbo", "fantan",
    "lotere", "lottery", "4d", "3d", "2d"
  ];

  const SUSPICIOUS_TLDS = [
    "xyz", "top", "club", "fun", "online", "site",
    "website", "space", "win", "bid", "click", "link",
    "vip", "icu", "buzz", "monster", "uno", "rest",
    "beauty", "quest", "sbs", "cfd", "lat", "bond",
    "cam", "cyou", "gg", "life", "live", "lol",
    "pics", "pw", "skin", "store", "today", "wang",
    "work", "mobi", "asia", "me", "cc", "ws", "tk",
    "ml", "ga", "cf", "gq"
  ];

  function parseURL(urlString) {
    try {
      return new URL(urlString);
    } catch (_) {
      return null;
    }
  }

  function isIPAddress(hostname) {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) ||
           /^\[?[0-9a-fA-F:]+\]?$/.test(hostname);
  }

  function getTLD(hostname) {
    const parts = hostname.replace(/\.$/, "").split(".");
    return parts.length > 1 ? parts[parts.length - 1] : "";
  }

  function getSubdomainCount(hostname) {
    const parts = hostname.replace(/\.$/, "").split(".");
    return parts.length > 2 ? parts.length - 2 : 0;
  }

  function calculateEntropy(str) {
    if (!str || str.length === 0) return 0;
    const freq = {};
    for (const ch of str) {
      freq[ch] = (freq[ch] || 0) + 1;
    }
    const len = str.length;
    let entropy = 0;
    for (const ch in freq) {
      const p = freq[ch] / len;
      entropy -= p * Math.log2(p);
    }
    return Math.round(entropy * 1000) / 1000;
  }

  function findKeywords(str) {
    const lower = str.toLowerCase();
    const matched = [];
    GAMBLING_URL_KEYWORDS.forEach((kw) => {
      if (lower.includes(kw)) {
        matched.push(kw);
      }
    });
    return matched;
  }

  function extract(urlString) {
    const url = parseURL(urlString);
    if (!url) {
      return { valid: false, url: urlString, hostname: "", tld: "", features: {}, matchedKeywords: [] };
    }

    const hostname = url.hostname;
    const tld = getTLD(hostname);
    const domainBody = hostname.replace(/\.$/, "").split(".").slice(0, -1).join(".");
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const queryParams = url.search ? url.search.slice(1).split("&").filter(Boolean) : [];

    const digitCount = (domainBody.match(/\d/g) || []).length;
    const hyphenCount = (domainBody.match(/-/g) || []).length;

    const domainKeywords = findKeywords(hostname);
    const pathKeywords = findKeywords(url.pathname);
    const allKeywords = [...new Set([...domainKeywords, ...pathKeywords])];

    const features = {
      urlLength: urlString.length,
      domainLength: hostname.length,
      pathLength: url.pathname.length,

      subdomainCount: getSubdomainCount(hostname),
      dotCount: (hostname.match(/\./g) || []).length,
      pathDepth: pathSegments.length,
      queryParamCount: queryParams.length,

      hyphenCount: hyphenCount,
      digitCount: digitCount,
      digitRatio: domainBody.length > 0 ? Math.round((digitCount / domainBody.length) * 1000) / 1000 : 0,
      specialCharCount: (urlString.match(/[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]/g) || []).length,

      isHTTPS: url.protocol === "https:" ? 1 : 0,
      isIPAddress: isIPAddress(hostname) ? 1 : 0,
      hasPort: url.port ? 1 : 0,

      tld: tld,
      isSuspiciousTLD: SUSPICIOUS_TLDS.includes(tld.toLowerCase()) ? 1 : 0,

      domainEntropy: calculateEntropy(hostname),
      urlEntropy: calculateEntropy(urlString),

      keywordsInDomain: domainKeywords.length,
      keywordsInPath: pathKeywords.length,
      keywordsTotal: allKeywords.length,

      domainTokenCount: hostname.split(/[-.]/).filter(Boolean).length
    };

    return {
      valid: true,
      url: urlString,
      hostname: hostname,
      tld: tld,
      features: features,
      matchedKeywords: allKeywords
    };
  }

  function toVector(features) {
    return [
      features.urlLength,
      features.domainLength,
      features.pathLength,
      features.subdomainCount,
      features.dotCount,
      features.pathDepth,
      features.queryParamCount,
      features.hyphenCount,
      features.digitCount,
      features.digitRatio,
      features.specialCharCount,
      features.isHTTPS,
      features.isIPAddress,
      features.hasPort,
      features.isSuspiciousTLD,
      features.domainEntropy,
      features.urlEntropy,
      features.keywordsInDomain,
      features.keywordsInPath,
      features.keywordsTotal,
      features.domainTokenCount
    ];
  }

  const FEATURE_NAMES = [
    "urlLength", "domainLength", "pathLength",
    "subdomainCount", "dotCount", "pathDepth", "queryParamCount",
    "hyphenCount", "digitCount", "digitRatio", "specialCharCount",
    "isHTTPS", "isIPAddress", "hasPort", "isSuspiciousTLD",
    "domainEntropy", "urlEntropy",
    "keywordsInDomain", "keywordsInPath", "keywordsTotal",
    "domainTokenCount"
  ];

  ns.URLFeatures = { extract, toVector, FEATURE_NAMES, GAMBLING_URL_KEYWORDS, SUSPICIOUS_TLDS };
})();
