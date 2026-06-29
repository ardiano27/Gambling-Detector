(() => {
  "use strict";

  const ns = self.GamblingDetector = self.GamblingDetector || {};

  const engines = {};

  function register(name, engine) {
    if (!engine || typeof engine.analyze !== "function") {
      throw new Error("Engine must implement analyze(text, settings)");
    }
    engines[name] = engine;
  }

  function get(name) {
    return engines[name] || null;
  }

  function resolve(settings) {
    const preferred = settings.engine || "rule-based";
    return engines[preferred] || engines["rule-based"] || null;
  }

  function analyze(text, settings) {
    const engine = resolve(settings);

    if (!engine) {
      return {
        score: 0,
        riskLevel: "low",
        foundTerms: [],
        totalMatches: 0,
        confidence: 0,
        engineUsed: "none"
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

  if (ns.RuleBased) {
    register(ns.RuleBased.name, ns.RuleBased);
  }

  ns.Engine = { register, get, resolve, analyze };
})();
