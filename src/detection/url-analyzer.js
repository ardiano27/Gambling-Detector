(() => {
  "use strict";

  const ns = self.GamblingDetector = self.GamblingDetector || {};

  const FEATURE_WEIGHTS = {
    keywordsInDomain: 12,
    keywordsInPath: 6,
    isSuspiciousTLD: 10,
    isIPAddress: 8,
    digitRatio: 8,
    hyphenCount: 2,
    subdomainCount: 3,
    isHTTPS: -3,
    domainEntropy: 4,
    domainLength: 0.15,
    pathDepth: 0.5
  };

  const SENSITIVITY_THRESHOLDS = {
    high:   { medium: 6,  high: 15 },
    medium: { medium: 12, high: 28 },
    low:    { medium: 22, high: 42 }
  };

  function analyze(url, settings) {
    if (!ns.URLFeatures) {
      return emptyResult();
    }

    const extraction = ns.URLFeatures.extract(url);
    if (!extraction.valid) {
      return emptyResult();
    }

    const f = extraction.features;
    const signals = [];
    let score = 0;

    if (f.keywordsInDomain > 0) {
      const pts = f.keywordsInDomain * FEATURE_WEIGHTS.keywordsInDomain;
      score += pts;
      const kws = extraction.matchedKeywords.filter((k) =>
        extraction.hostname.toLowerCase().includes(k)
      );
      signals.push({ feature: "Gambling keywords in domain", value: kws.join(", "), impact: pts });
    }

    if (f.keywordsInPath > 0) {
      const pathOnly = extraction.matchedKeywords.filter((k) =>
        !extraction.hostname.toLowerCase().includes(k)
      );
      if (pathOnly.length > 0) {
        const pts = pathOnly.length * FEATURE_WEIGHTS.keywordsInPath;
        score += pts;
        signals.push({ feature: "Gambling keywords in path", value: pathOnly.join(", "), impact: pts });
      }
    }

    if (f.isSuspiciousTLD) {
      score += FEATURE_WEIGHTS.isSuspiciousTLD;
      signals.push({ feature: "Suspicious TLD", value: "." + f.tld, impact: FEATURE_WEIGHTS.isSuspiciousTLD });
    }

    if (f.isIPAddress) {
      score += FEATURE_WEIGHTS.isIPAddress;
      signals.push({ feature: "IP address instead of domain", value: extraction.hostname, impact: FEATURE_WEIGHTS.isIPAddress });
    }

    if (f.digitRatio > 0.25) {
      const pts = Math.round(f.digitRatio * FEATURE_WEIGHTS.digitRatio * 2);
      score += pts;
      signals.push({ feature: "High digit ratio in domain", value: Math.round(f.digitRatio * 100) + "%", impact: pts });
    }

    if (f.hyphenCount >= 2) {
      const pts = f.hyphenCount * FEATURE_WEIGHTS.hyphenCount;
      score += pts;
      signals.push({ feature: "Multiple hyphens in domain", value: f.hyphenCount + " hyphens", impact: pts });
    }

    if (f.subdomainCount >= 2) {
      const pts = f.subdomainCount * FEATURE_WEIGHTS.subdomainCount;
      score += pts;
      signals.push({ feature: "Excessive subdomains", value: f.subdomainCount + " subdomains", impact: pts });
    }

    if (f.isHTTPS) {
      score += FEATURE_WEIGHTS.isHTTPS;
    }

    if (f.domainEntropy > 3.5) {
      const pts = Math.round((f.domainEntropy - 3.0) * FEATURE_WEIGHTS.domainEntropy);
      score += pts;
      signals.push({ feature: "High domain entropy", value: f.domainEntropy.toFixed(2), impact: pts });
    }

    if (f.domainLength > 25) {
      const pts = Math.round((f.domainLength - 20) * FEATURE_WEIGHTS.domainLength);
      score += pts;
      signals.push({ feature: "Long domain name", value: f.domainLength + " chars", impact: pts });
    }

    if (f.pathDepth > 3) {
      const pts = Math.round((f.pathDepth - 2) * FEATURE_WEIGHTS.pathDepth);
      score += pts;
      signals.push({ feature: "Deep URL path", value: f.pathDepth + " segments", impact: pts });
    }

    score = Math.max(0, Math.round(score));

    const t = SENSITIVITY_THRESHOLDS[settings.sensitivity] || SENSITIVITY_THRESHOLDS.medium;
    const riskLevel = score >= t.high ? "high" : score >= t.medium ? "medium" : "low";

    const confidence = Math.min(score / 70, 1);

    signals.sort((a, b) => b.impact - a.impact);

    return {
      score: score,
      riskLevel: riskLevel,
      confidence: Math.round(confidence * 1000) / 1000,
      engineUsed: "url-analyzer",
      features: f,
      matchedSignals: signals.slice(0, 8),
      matchedKeywords: extraction.matchedKeywords,
      featureVector: ns.URLFeatures.toVector(f),
      hostname: extraction.hostname,
      tld: extraction.tld
    };
  }

  function emptyResult() {
    return {
      score: 0,
      riskLevel: "low",
      confidence: 0,
      engineUsed: "url-analyzer",
      features: {},
      matchedSignals: [],
      matchedKeywords: [],
      featureVector: [],
      hostname: "",
      tld: ""
    };
  }

  ns.URLAnalyzer = { name: "url-analyzer", analyze: analyze };
})();
