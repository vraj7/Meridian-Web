import { Suspense, use } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CoinDetailClient } from "./coin-detail-client";

export default function CoinDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<Skeleton className="h-[500px]" />}>
      <CoinDetailClient coinId={id} />
    </Suspense>
  );
}
