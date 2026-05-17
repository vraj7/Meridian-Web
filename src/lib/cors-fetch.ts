import axios, { type AxiosRequestConfig } from "axios";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Same-origin Next.js proxy — works on localhost and production (no third-party CORS proxy). */
function sameOriginProxyUrl(targetUrl: string): string {
  return `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
}

/**
 * Fetch JSON from external APIs in the browser via /api/proxy.
 * On the server (SSR), fetches directly.
 */
export async function fetchJsonWithCors<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  if (!isBrowser()) {
    const res = await axios.get<T>(url, { timeout: 20_000, ...config });
    return res.data;
  }

  const res = await axios.get<T>(sameOriginProxyUrl(url), {
    timeout: 28_000,
    validateStatus: (s) => s >= 200 && s < 300,
    ...config,
  });
  return res.data;
}

export async function fetchTextWithCors(url: string): Promise<string> {
  if (!isBrowser()) {
    const res = await axios.get<string>(url, { timeout: 20_000, responseType: "text" });
    return res.data;
  }

  const res = await axios.get<string>(sameOriginProxyUrl(url), {
    timeout: 28_000,
    responseType: "text",
    validateStatus: (s) => s >= 200 && s < 300,
  });
  return res.data;
}
