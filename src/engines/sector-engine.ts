import {
  INDIA_SECTORS,
  MACRO_SECTOR_RULES,
  getSectorForSymbol,
  type IndiaSectorId,
} from "@/config/india-sectors";
import type { IndianStock } from "@/types/india";
import type { IndiaNewsItem } from "@/types/india";
import type { SectorScore } from "@/types/india-advanced";

export function applyMacroRulesToSectors(
  headlines: IndiaNewsItem[]
): Map<IndiaSectorId, number> {
  const bias = new Map<IndiaSectorId, number>();
  INDIA_SECTORS.forEach((s) => bias.set(s.id, 0));

  headlines.forEach((h) => {
    const text = h.title.toLowerCase();
    MACRO_SECTOR_RULES.forEach((rule) => {
      if (!rule.keywords.some((k) => text.includes(k))) return;
      const weight = h.impactScore * (h.sentiment === "bearish" ? -1 : h.sentiment === "bullish" ? 1 : 0.3);
      rule.bullishSectors.forEach((id) => bias.set(id, (bias.get(id) ?? 0) + weight * 0.5));
      rule.bearishSectors.forEach((id) => bias.set(id, (bias.get(id) ?? 0) - weight * 0.5));
    });
  });

  return bias;
}

export function computeSectorScores(
  stocks: IndianStock[],
  newsHeadlines: IndiaNewsItem[]
): SectorScore[] {
  const macroBias = applyMacroRulesToSectors(newsHeadlines);
  const bySector = new Map<IndiaSectorId, IndianStock[]>();

  stocks
    .filter((s) => s.segment === "equity")
    .forEach((s) => {
      const sec = getSectorForSymbol(s.symbol);
      const list = bySector.get(sec) ?? [];
      list.push(s);
      bySector.set(sec, list);
    });

  const scores: SectorScore[] = INDIA_SECTORS.map((meta) => {
    const list = bySector.get(meta.id) ?? [];
    const avgChange =
      list.length > 0 ? list.reduce((a, s) => a + s.change24h, 0) / list.length : 0;
    const newsBias = macroBias.get(meta.id) ?? 0;

    const symbolNews = newsHeadlines.filter((h) =>
      h.symbols.some((sym) => list.some((st) => st.symbol === sym))
    );
    let headlineBias = 0;
    symbolNews.forEach((h) => {
      if (h.sentiment === "bullish") headlineBias += h.impactScore;
      if (h.sentiment === "bearish") headlineBias -= h.impactScore;
    });

    const momentum = avgChange * 0.6 + newsBias * 25 + headlineBias * 15;
    return {
      id: meta.id,
      name: meta.name,
      momentum,
      avgChange24h: avgChange,
      newsBias: newsBias + headlineBias,
      strengthRank: 0,
      rotationSignal: "neutral" as const,
      stockCount: list.length,
    };
  }).filter((s) => s.stockCount > 0 || Math.abs(s.newsBias) > 0.1);

  scores.sort((a, b) => b.momentum - a.momentum);
  scores.forEach((s, i) => {
    s.strengthRank = i + 1;
    if (i < 3) s.rotationSignal = "leading";
    else if (i >= scores.length - 3 && scores.length > 5) s.rotationSignal = "lagging";
  });

  return scores;
}

export function getSectorAlignmentBonus(
  symbol: string,
  sectors: SectorScore[]
): { bonus: number; sectorName: string; note: string } {
  const secId = getSectorForSymbol(symbol);
  const sec = sectors.find((s) => s.id === secId);
  if (!sec) return { bonus: 0, sectorName: secId, note: "Sector neutral" };

  let bonus = 0;
  if (sec.rotationSignal === "leading" && sec.momentum > 0) bonus = 12;
  if (sec.rotationSignal === "lagging" && sec.momentum < 0) bonus = -12;
  if (sec.newsBias > 0.2) bonus += 8;
  if (sec.newsBias < -0.2) bonus -= 8;

  return {
    bonus,
    sectorName: sec.name,
    note: `${sec.name} ${sec.rotationSignal} (momentum ${sec.momentum.toFixed(1)})`,
  };
}
