"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getNseMarketStatus, type NseMarketStatus } from "@/lib/nse-market-hours";

export function MarketStatusBanner() {
  const [status, setStatus] = useState<NseMarketStatus | null>(null);

  useEffect(() => {
    const refresh = () => setStatus(getNseMarketStatus());
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!status) return null;

  const variant =
    status.status === "open"
      ? "bull"
      : status.status === "pre_open"
        ? "warning"
        : "secondary";

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              status.isOpen ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
            }`}
          />
          <div>
            <p className="font-semibold text-sm flex items-center gap-2">
              NSE {status.label}
              <Badge variant={variant}>{status.status.replace("_", " ")}</Badge>
            </p>
            <p className="text-xs text-muted-foreground">{status.detail}</p>
          </div>
        </div>
        <div className="text-right text-xs font-mono text-muted-foreground">
          <p>{status.istDateFormatted}</p>
          <p>{status.istTimeFormatted} IST</p>
          {!status.isOpen && <p className="text-primary mt-1">Next: {status.nextSessionLabel}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
