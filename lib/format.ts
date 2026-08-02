const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const SHORT_DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export function formatDate(d: Date | null | undefined): string {
  return d ? DATE_FMT.format(d) : "—";
}

export function formatTime(d: Date | null | undefined): string {
  return d ? TIME_FMT.format(d) : "—";
}

export function formatDateTime(d: Date | null | undefined): string {
  return d ? `${DATE_FMT.format(d)} · ${TIME_FMT.format(d)}` : "—";
}

export function formatShortDate(d: Date | null | undefined): string {
  return d ? SHORT_DATE_FMT.format(d) : "—";
}

export function formatHeight(inches: number | null | undefined): string {
  if (!inches) return "—";
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

// Value for <input type="datetime-local"> in local server time
export function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
