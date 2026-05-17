"use client";

import { IndiaDisclaimer } from "@/components/india/india-disclaimer";
import { IndiaTerminalNav } from "@/components/india/india-terminal-nav";
import { FiiDiiPanel } from "@/components/india/fii-dii-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIndiaTerminal } from "@/hooks/use-india-terminal";

export default function IndiaInstitutionalPage() {
  const { data } = useIndiaTerminal();
  const fii = data?.fiiDii;

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Institutional Activity</h1>
        <p className="text-sm text-muted-foreground">FII/DII cash market flows · sector implications</p>
      </header>
      <IndiaTerminalNav />
      <IndiaDisclaimer />

      <div className="max-w-md">
        <FiiDiiPanel data={fii ?? null} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Flow interpretation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          {fii && fii.fiiNet < 0 && (
            <p>FII net selling often pressures large-cap banking and IT — raise risk score on longs.</p>
          )}
          {fii && fii.fiiNet > 0 && (
            <p>FII net buying supports index leaders — look for confirmed breakouts in leading sectors.</p>
          )}
          {fii && fii.diiNet > 0 && (
            <p>DII buying can cushion FII outflows — watch stock-specific accumulation in PSU and financials.</p>
          )}
          <p>Combine with options PCR and sector heatmap before taking directional bets.</p>
        </CardContent>
      </Card>
    </section>
  );
}
