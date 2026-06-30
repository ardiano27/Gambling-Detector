(() => {
  "use strict";

  const ns = self.GamblingDetector = self.GamblingDetector || {};

  const engines = {};

  function register(name, engine) {
    if (!engine || typeof engine.analyze !== "function") {
      throw new Error("Engine must implement analyze()");
    }
    engines[name] = engine;
  }

  function get(name) {
    return engines[name] || null;
  }

  function resolveContent(settings) {
    const preferred = settings.engine || "rule-based";
    return engines[preferred] || engines["rule-based"] || null;
  }

  function analyzeContent(text, settings) {
    const engine = resolveContent(settings);
    if (!engine) {
      return {
        score: 0, riskLevel: "low", foundTerms: [],
        totalMatches: 0, confidence: 0, engineUsed: "none"
      };
    }
    const result = engine.analyze(text, settings);
    return {
      score: result.score || 0,
      riskLevel: result.riskLevel || "low",
      foundTerms: result.foundTerms || [],
      totalMatches: result.totalMatches || 0,
      confidence: result.confidence || 0,
      engineUsed: result.engineUsed || engine.name || "unknown"
    };
  }

  function analyzeURL(url, settings) {
    if (!ns.URLAnalyzer) {
      return {
        score: 0, riskLevel: "low", confidence: 0,
        engineUsed: "url-analyzer", features: {},
        matchedSignals: [], matchedKeywords: [],
        featureVector: [], hostname: "", tld: ""
      };
    }
    return ns.URLAnalyzer.analyze(url, settings);
  }

  function combinedRiskLevel(urlRisk, contentRisk) {
    const levels = { low: 0, medium: 1, high: 2 };
    const urlVal = levels[urlRisk] || 0;
    const contentVal = levels[contentRisk] || 0;

    const combined = Math.round(urlVal * 0.7 + contentVal * 0.3);

    if (urlVal === 2 || contentVal === 2) return "high";
    if (combined >= 1) return "medium";
    return "low";
  }

  function analyzeCombined(url, text, settings) {
    const urlResult = analyzeURL(url, settings);
    const contentResult = analyzeContent(text, settings);

    const urlScore = urlResult.score || 0;
    const contentScore = contentResult.score || 0;
    const combinedScore = Math.round(urlScore * 0.7 + contentScore * 0.3);

    const riskLevel = combinedRiskLevel(urlResult.riskLevel, contentResult.riskLevel);

    const urlConf = urlResult.confidence || 0;
    const contentConf = contentResult.confidence || 0;
    const combinedConfidence = Math.round((urlConf * 0.7 + contentConf * 0.3) * 1000) / 1000;

    return {
      combined: {
        score: combinedScore,
        riskLevel: riskLevel,
        confidence: combinedConfidence,
        engineUsed: "combined"
      },
      url: urlResult,
      content: contentResult
    };
  }

  if (ns.RuleBased) {
    register(ns.RuleBased.name, ns.RuleBased);
  }

  ns.Engine = { register, get, analyzeContent, analyzeURL, analyzeCombined };
})();
