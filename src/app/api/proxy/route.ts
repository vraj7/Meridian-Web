import { NextRequest, NextResponse } from "next/server";
import { buildProxyHeaders, isProxyUrlAllowed } from "@/config/proxy-allowlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  try {
    const upstream = await fetch(target.toString(), {
      headers: buildProxyHeaders(target),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });

    const contentType = upstream.headers.get("content-type") ?? "application/json";
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
