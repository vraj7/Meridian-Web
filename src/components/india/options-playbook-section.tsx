"use client";

import { OptionSignalCard } from "@/components/signals/option-signal-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLtpSourceLabel } from "@/hooks/use-india-options";
import { formatInr } from "@/lib/utils";
import type { IndiaOptionsPlaybook } from "@/types/india";
import { Badge } from "@/components/ui/badge";

function SignalColumn({
  title,
  subtitle,
  signals,
  empty,
}: {
  title: string;
  subtitle: string;
  signals: IndiaOptionsPlaybook["buyCall"];
  empty: string;
}) {
  return (
    <section className="space-y-2">
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      {signals.length ? (
        <div className="grid gap-2">
          {signals.map((s) => (
            <OptionSignalCard key={s.id} signal={s} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-4 glass rounded-lg px-3">{empty}</p>
      )}
    </section>
  );
}

export function OptionsPlaybookSection({ playbook }: { playbook: IndiaOptionsPlaybook }) {
  const m = playbook.metrics;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex flex-wrap justify-between gap-2">
          <span>{playbook.underlying} F&O</span>
          <span className="text-sm font-mono font-normal text-muted-foreground">
            Exp {playbook.expiry}
          </span>
        </CardTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          <div className="rounded-md bg-muted/40 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground">Index LTP</p>
            <p className="font-mono font-bold text-sm">{formatInr(playbook.spotPrice)}</p>
            {playbook.ltpSource && (
              <Badge variant="outline" className="text-[9px] mt-1 px-1 py-0">
                {formatLtpSourceLabel(playbook.ltpSource)}
              </Badge>
            )}
          </div>
          <div className="rounded-md bg-muted/40 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground">PCR</p>
            <p className="font-mono font-bold text-sm">{m.pcr.toFixed(2)}</p>
          </div>
          <div className="rounded-md bg-muted/40 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground">Max pain</p>
            <p className="font-mono font-bold text-sm">{formatInr(m.maxPainStrike, 0)}</p>
          </div>
          <div className="rounded-md bg-muted/40 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground">Bias</p>
            <p className="font-mono font-bold text-sm capitalize">{m.trendBias}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{playbook.marketCommentary}</p>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        <SignalColumn
          title="CALL — Buy"
          subtitle="Long CE when upside bias + PCR supports"
          signals={playbook.buyCall}
          empty="No BUY CALL setup above confidence threshold"
        />
        <SignalColumn
          title="CALL — Sell"
          subtitle="Short CE / covered call when IV rich at resistance"
          signals={playbook.sellCall}
          empty="No SELL CALL setup"
        />
        <SignalColumn
          title="PUT — Buy"
          subtitle="Long PE for downside hedge or bearish view"
          signals={playbook.buyPut}
          empty="No BUY PUT setup"
        />
        <SignalColumn
          title="PUT — Sell"
          subtitle="Short PE / cash-secured put when bullish + high PCR"
          signals={playbook.sellPut}
          empty="No SELL PUT setup"
        />
      </CardContent>
    </Card>
  );
}
