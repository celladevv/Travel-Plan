// Shared helpers: dates as local "YYYY-MM-DD" strings, money formatting.

export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return todayStr(d);
}

export function daysBetween(a, b) {
  return Math.round(
    (new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000
  );
}

export function tripDates(trip) {
  if (!trip?.startDate || !trip?.endDate) return [];
  const n = daysBetween(trip.startDate, trip.endDate);
  if (n < 0 || n > 60) return [trip.startDate];
  return Array.from({ length: n + 1 }, (_, i) => addDays(trip.startDate, i));
}

export function fmtDay(dateStr, opts = {}) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...opts,
  });
}

// Money: whole numbers for weak-unit currencies, cents only when meaningful.
export function fmtMoney(amount, currency) {
  if (amount == null || isNaN(amount)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: Math.abs(amount) >= 100 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString()} ${currency}`;
  }
}

export function fmtNum(amount) {
  if (amount == null || isNaN(amount)) return "";
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: Math.abs(amount) >= 100 ? 0 : 2,
  }).format(amount);
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const CURRENCIES = [
  "USD", "EUR", "GBP", "MYR", "SGD", "IDR", "THB", "VND", "PHP", "JPY",
  "KRW", "CNY", "HKD", "TWD", "INR", "AUD", "NZD", "AED", "TRY", "CHF",
  "CAD", "BND", "KHR", "LAK", "MMK", "LKR", "NPR", "BRL", "MXN", "ZAR",
];
