"use client";

import Link from "next/link";
import { QualityBadge } from "@/components/signals/quality-badge";
import { formatPairLabel } from "@/config/market";
import { cn, formatPercent } from "@/lib/utils";
import type { CoinGrade, CoinMarket } from "@/types";

export function CoinGradesTable({
  markets,
  grades,
  marketLabel = "spot",
}: {
  markets: CoinMarket[];
  grades: Record<string, CoinGrade> | undefined;
  marketLabel?: string;
}) {
  return (
    <div className="surface overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-muted-foreground text-left">
            <th className="p-3">#</th>
            <th className="p-3">Asset</th>
            <th className="p-3 text-center">Grade</th>
            <th className="p-3 hidden sm:table-cell">Bias</th>
            <th className="p-3 text-right hidden md:table-cell">Conf.</th>
            <th className="p-3 text-right">24h</th>
          </tr>
        </thead>
        <tbody>
          {markets.map((coin) => {
            const g = grades?.[coin.symbol];
            return (
              <tr key={coin.id} className="border-b border-border/40 hover:bg-accent/30">
                <td className="p-3 text-muted-foreground">{coin.rank}</td>
                <td className="p-3">
                  <Link
                    href={`/coin/${coin.id}?symbol=${coin.symbol}`}
                    className="font-medium hover:text-primary"
                  >
                    {formatPairLabel(coin.symbol)}
                  </Link>
                </td>
                <td className="p-3 text-center">
                  <QualityBadge
                    quality={g?.quality}
                    compact
                    title={
                      g
                        ? `${g.quality} setup · ${g.confidence}% confidence (${marketLabel})`
                        : "Loading grade…"
                    }
                  />
                </td>
                <td className="p-3 hidden sm:table-cell">
                  {g ? (
                    <span
                      className={cn(
                        "text-xs",
                        g.action.includes("BUY") || g.action.includes("LONG")
                          ? "text-bull"
                          : g.action.includes("SELL") || g.action.includes("SHORT")
                            ? "text-bear"
                            : "text-muted-foreground"
                      )}
                    >
                      {g.action}
                      {!g.tradeEligible && (
                        <span className="text-muted-foreground"> · no entry</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
                <td className="p-3 text-right font-mono text-xs hidden md:table-cell">
                  {g ? `${g.confidence}%` : "—"}
                </td>
                <td
                  className={cn(
                    "p-3 text-right text-xs",
                    coin.change24h >= 0 ? "text-bull" : "text-bear"
                  )}
                >
                  {formatPercent(coin.change24h)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground p-3 border-t border-border/40">
        Grade = setup quality (A best). Bias can show WAIT if below your confidence filter — still useful
        to compare coins.
      </p>
    </div>
  );
}

