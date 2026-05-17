import { addDays, format, isSaturday, isSunday } from "date-fns";

export type NseSessionStatus = "open" | "pre_open" | "closed" | "weekend";

export interface NseMarketStatus {
  status: NseSessionStatus;
  isOpen: boolean;
  label: string;
  detail: string;
  istNow: Date;
  istTimeFormatted: string;
  istDateFormatted: string;
  nextSessionDate: Date;
  nextSessionLabel: string;
}

/** Current time in Asia/Kolkata */
export function getISTNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
}

export function isTradingDay(date: Date): boolean {
  return !isSaturday(date) && !isSunday(date);
}

/** Skip weekends; does not include NSE holiday calendar */
export function addTradingSessions(from: Date, sessions: number): Date {
  let d = new Date(from);
  let added = 0;
  while (added < sessions) {
    d = addDays(d, 1);
    if (isTradingDay(d)) added++;
  }
  return d;
}

export function getNextTradingSession(from?: Date): Date {
  const ist = from ?? getISTNow();
  let d = new Date(ist);
  if (!isTradingDay(d)) {
    d = addTradingSessions(d, 1);
    return d;
  }
  const minutes = d.getHours() * 60 + d.getMinutes();
  const closeMinutes = 15 * 60 + 30;
  if (minutes >= closeMinutes) {
    return addTradingSessions(d, 1);
  }
  return d;
}

export function getNseMarketStatus(now = getISTNow()): NseMarketStatus {
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const openStart = 9 * 60 + 15;
  const preOpenStart = 9 * 60;
  const closeEnd = 15 * 60 + 30;

  const istTimeFormatted = format(now, "HH:mm");
  const istDateFormatted = format(now, "EEEE, d MMM yyyy");

  if (day === 0 || day === 6) {
    const next = addTradingSessions(now, 1);
    return {
      status: "weekend",
      isOpen: false,
      label: "Market closed (weekend)",
      detail: `NSE reopens ${format(next, "EEEE, d MMM")}`,
      istNow: now,
      istTimeFormatted,
      istDateFormatted,
      nextSessionDate: next,
      nextSessionLabel: format(next, "EEEE, d MMM yyyy"),
    };
  }

  if (minutes < preOpenStart) {
    const todayOpen = new Date(now);
    todayOpen.setHours(9, 15, 0, 0);
    return {
      status: "closed",
      isOpen: false,
      label: "Market closed",
      detail: `Pre-open at 09:00 IST · Cash session 09:15–15:30`,
      istNow: now,
      istTimeFormatted,
      istDateFormatted,
      nextSessionDate: todayOpen,
      nextSessionLabel: format(now, "EEEE, d MMM yyyy"),
    };
  }

  if (minutes < openStart) {
    return {
      status: "pre_open",
      isOpen: false,
      label: "Pre-open session",
      detail: "Cash market opens 09:15 IST",
      istNow: now,
      istTimeFormatted,
      istDateFormatted,
      nextSessionDate: now,
      nextSessionLabel: format(now, "EEEE, d MMM yyyy"),
    };
  }

  if (minutes <= closeEnd) {
    return {
      status: "open",
      isOpen: true,
      label: "Market open",
      detail: "NSE cash · 09:15–15:30 IST",
      istNow: now,
      istTimeFormatted,
      istDateFormatted,
      nextSessionDate: now,
      nextSessionLabel: format(now, "EEEE, d MMM yyyy"),
    };
  }

  const next = addTradingSessions(now, 1);
  return {
    status: "closed",
    isOpen: false,
    label: "Market closed",
    detail: `Closed at 15:30 IST · Next session ${format(next, "EEE, d MMM")}`,
    istNow: now,
    istTimeFormatted,
    istDateFormatted,
    nextSessionDate: next,
    nextSessionLabel: format(next, "EEEE, d MMM yyyy"),
  };
}

export function formatPickDate(date: Date): string {
  return format(date, "EEEE, d MMMM yyyy");
}
