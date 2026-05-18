import { NextRequest, NextResponse } from "next/server";
import {
  buildProxyHeaders,
  getProxyMirrorHosts,
  isProxyUrlAllowed,
} from "@/config/proxy-allowlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * Vercel default region (iad1, US East) is geo-blocked by Binance with HTTP 451.
 * Pin to regions where Binance is reachable: Mumbai → Singapore → Frankfurt.
 * Vercel routes to the first region listed that's available for your plan.
 */
export const preferredRegion = ["bom1", "sin1", "fra1"];

const BLOCKED_STATUSES = new Set([403, 418, 429, 451]);
const PER_HOST_TIMEOUT_MS = 12_000;

interface MirrorAttempt {
  ok: boolean;
  status: number;
  contentType: string;
  body: ArrayBuffer;
  via: string;
}

async function tryHost(target: URL, host: string): Promise<MirrorAttempt | null> {
  const u = new URL(target.toString());
  u.hostname = host;
  try {
    const upstream = await fetch(u.toString(), {
      headers: buildProxyHeaders(target),
      cache: "no-store",
      signal: AbortSignal.timeout(PER_HOST_TIMEOUT_MS),
    });
    const contentType = upstream.headers.get("content-type") ?? "application/json";
    const body = await upstream.arrayBuffer();
    return { ok: upstream.ok, status: upstream.status, contentType, body, via: host };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (!isProxyUrlAllowed(target)) {
    return NextResponse.json({ error: `Host not allowed: ${target.hostname}` }, { status: 403 });
  }

  const mirrors = getProxyMirrorHosts(target.hostname);
  let lastBlocked: MirrorAttempt | null = null;

  for (const host of mirrors) {
    const attempt = await tryHost(target, host);
    if (!attempt) continue;

    if (attempt.ok || !BLOCKED_STATUSES.has(attempt.status)) {
      return new NextResponse(attempt.body, {
        status: attempt.status,
        headers: {
          "Content-Type": attempt.contentType,
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
          "Access-Control-Allow-Origin": "*",
          "X-Proxy-Via": attempt.via,
        },
      });
    }

    lastBlocked = attempt;
  }

  if (lastBlocked) {
    return new NextResponse(lastBlocked.body, {
      status: lastBlocked.status,
      headers: {
        "Content-Type": lastBlocked.contentType,
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "X-Proxy-Via": lastBlocked.via,
        "X-Proxy-Geo-Blocked": "1",
      },
    });
  }

  return NextResponse.json(
    { error: `Upstream unreachable: ${target.hostname}` },
    { status: 502 }
  );
}
