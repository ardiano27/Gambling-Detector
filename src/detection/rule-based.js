(() => {
  "use strict";

  const ns = self.GamblingDetector = self.GamblingDetector || {};

  const RISK_TERMS = [
    { term: "slot gacor", weight: 5 },
    { term: "maxwin", weight: 5 },
    { term: "jackpot", weight: 4 },
    { term: "scatter", weight: 4 },
    { term: "rtp slot", weight: 5 },
    { term: "situs judi", weight: 6 },
    { term: "judi online", weight: 6 },
    { term: "casino online", weight: 6 },
    { term: "taruhan bola", weight: 5 },
    { term: "sportsbook", weight: 4 },
    { term: "deposit pulsa", weight: 4 },
    { term: "bonus new member", weight: 4 },
    { term: "freebet", weight: 4 },
    { term: "togel", weight: 6 },
    { term: "poker online", weight: 5 },
    { term: "bandar", weight: 3 },
    { term: "parlay", weight: 4 },
    { term: "agen slot", weight: 5 },
    { term: "slot online", weight: 6 },
    { term: "link alternatif", weight: 3 },
    { term: "withdraw", weight: 2 },
    { term: "deposit", weight: 2 },
    { term: "rollingan", weight: 3 },
    { term: "turnover", weight: 3 },
    { term: "live casino", weight: 5 },
    { term: "bola88", weight: 4 },
    { term: "slot88", weight: 5 }
  ];

  const THRESHOLDS = {
    high: 4,
    medium: 8,
    low: 14
  };

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "");
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function getTerms(settings) {
    const customTerms = (settings.customKeywords || [])
      .map((term) => normalizeText(term).trim())
      .filter(Boolean)
      .map((term) => ({ term, weight: 4 }));

    const merged = new Map();
    [...RISK_TERMS, ...customTerms].forEach((item) => {
      const term = normalizeText(item.term).trim();
      if (!term) return;
      const current = merged.get(term);
      merged.set(term, Math.max(current || 0, item.weight));
    });

    return [...merged.entries()].map(([term, weight]) => ({ term, weight }));
  }

  function countMatches(text, term) {
    const escaped = escapeRegExp(term);
    const pattern = term.includes(" ")
      ? escaped.replace(/\s+/g, "\\s+")
      : `\\b${escaped}\\b`;
    const matches = text.match(new RegExp(pattern, "gi"));
    return matches ? matches.length : 0;
  }

  ns.RuleBased = {
    name: "rule-based",

    analyze(text, settings) {
      const normalized = normalizeText(text);
      const found = [];
      let score = 0;

      getTerms(settings).forEach(({ term, weight }) => {
        const count = countMatches(normalized, term);
        if (count > 0) {
          const cappedCount = Math.min(count, 8);
          score += cappedCount * weight;
          found.push({ term, count, weight });
        }
      });

      found.sort((a, b) => b.count * b.weight - a.count * a.weight);

      const threshold = THRESHOLDS[settings.sensitivity] || THRESHOLDS.medium;
      const riskLevel = score >= threshold * 2 ? "high" : score >= threshold ? "medium" : "low";

      const maxPossible = getTerms(settings).reduce((sum, t) => sum + 8 * t.weight, 0);
      const confidence = maxPossible > 0 ? Math.min(score / maxPossible, 1) : 0;

      return {
        score,
        riskLevel,
        foundTerms: found.slice(0, 12),
        totalMatches: found.reduce((sum, item) => sum + item.count, 0),
        confidence,
        engineUsed: "rule-based"
      };
    }
  };
})();
