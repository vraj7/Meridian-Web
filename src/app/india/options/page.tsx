"use client";

import { useState } from "react";
import Link from "next/link";
import { OptionsPlaybookSection } from "@/components/india/options-playbook-section";
import { OptionsSignalLogic } from "@/components/india/options-signal-logic";
import { MarketStatusBanner } from "@/components/india/market-status-banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIndiaOptions, type IndiaUnderlying } from "@/hooks/use-india-options";

const UNDERLYINGS: IndiaUnderlying[] = ["NIFTY", "BANKNIFTY", "FINNIFTY"];

export default function IndiaOptionsPage() {
  const [underlying, setUnderlying] = useState<IndiaUnderlying>("NIFTY");
  const { data, isLoading } = useIndiaOptions(underlying);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">India Options</h1>
        <p className="text-sm text-muted-foreground">
          CALL/PUT separated into Buy vs Sell with entry/exit timing
        </p>
        <Link href="/india/picks" className="text-sm text-primary hover:underline mt-2 inline-block">
          Full picks dashboard (stocks + options + news) →
        </Link>
      </header>

      <MarketStatusBanner />
      <OptionsSignalLogic />

      <div className="flex gap-2 flex-wrap">
        {UNDERLYINGS.map((u) => (
          <Button
            key={u}
            size="sm"
            variant={underlying === u ? "default" : "outline"}
            onClick={() => setUnderlying(u)}
          >
            {u}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : data ? (
        <OptionsPlaybookSection playbook={data} />
      ) : null}
    </section>
  );
}
