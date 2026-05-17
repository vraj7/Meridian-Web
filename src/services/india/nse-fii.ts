import { fetchNseJson } from "@/lib/nse-fetch";
import type { FiiDiiData } from "@/types/india-advanced";

interface FiiDiiResponse {
  date?: string;
  fiiBuyValue?: string;
  fiiSellValue?: string;
  fiiNetValue?: string;
  diiBuyValue?: string;
  diiSellValue?: string;
  diiNetValue?: string;
}

function parseCr(val?: string): number {
  if (!val) return 0;
  const n = parseFloat(val.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export async function fetchFiiDii(): Promise<FiiDiiData | null> {
  try {
    const data = await fetchNseJson<{ data?: FiiDiiResponse[] }>("/fiidiiTradeReact");
    const row = data.data?.[0];
    if (!row) return null;
    return {
      date: row.date ?? new Date().toISOString().slice(0, 10),
      fiiBuy: parseCr(row.fiiBuyValue),
      fiiSell: parseCr(row.fiiSellValue),
      fiiNet: parseCr(row.fiiNetValue),
      diiBuy: parseCr(row.diiBuyValue),
      diiSell: parseCr(row.diiSellValue),
      diiNet: parseCr(row.diiNetValue),
    };
  } catch {
    return null;
  }
}

export function getDemoFiiDii(): FiiDiiData {
  return {
    date: new Date().toISOString().slice(0, 10),
    fiiBuy: 8420,
    fiiSell: 9150,
    fiiNet: -730,
    diiBuy: 10200,
    diiSell: 8800,
    diiNet: 1400,
  };
}
