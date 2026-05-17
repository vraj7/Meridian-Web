import { fetchJsonWithCors } from "@/lib/cors-fetch";

const NSE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com/",
};

/** NSE API — uses CORS proxy when called from the browser. */
export async function fetchNseJson<T>(path: string): Promise<T> {
  const url = `https://www.nseindia.com/api${path.startsWith("/") ? path : `/${path}`}`;
  return fetchJsonWithCors<T>(url, { headers: NSE_HEADERS });
}
