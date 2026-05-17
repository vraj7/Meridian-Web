"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FiiDiiData } from "@/types/india-advanced";

export function FiiDiiPanel({ data }: { data: FiiDiiData | null }) {
  if (!data) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          FII/DII data unavailable — enable demo mode or retry when NSE is reachable.
        </CardContent>
      </Card>
    );
  }

  const rows = [
    { label: "FII Net", value: data.fiiNet, buy: data.fiiBuy, sell: data.fiiSell },
    { label: "DII Net", value: data.diiNet, buy: data.diiBuy, sell: data.diiSell },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Institutional flow (₹ Cr)</CardTitle>
        <p className="text-xs text-muted-foreground">{data.date}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex justify-between text-sm">
              <span>{r.label}</span>
              <span className={`font-mono font-semibold ${r.value >= 0 ? "text-bull" : "text-bear"}`}>
                {r.value >= 0 ? "+" : ""}
                {r.value.toLocaleString("en-IN")} Cr
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Buy {r.buy.toLocaleString("en-IN")} · Sell {r.sell.toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
