/** Presentational formatters for the Monday profit brief UI. */

export function formatUsd(n: number, opts?: { signed?: boolean }): string {
  const abs = Math.abs(n);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: abs >= 100 ? 0 : 2,
  }).format(abs);
  if (opts?.signed) {
    if (n > 0) return `+${formatted}`;
    if (n < 0) return `−${formatted}`;
    return formatted;
  }
  return n < 0 ? `−${formatted}` : formatted;
}

export function formatPct(ratio: number, opts?: { signed?: boolean }): string {
  const pct = ratio * 100;
  const body = `${pct.toFixed(1)}%`;
  if (opts?.signed) {
    if (pct > 0) return `+${body}`;
    if (pct < 0) return body; // already has minus
    return body;
  }
  return body;
}

export function formatIsoDate(iso: string): string {
  // Parse as local calendar date (avoid UTC shift)
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(dt);
}

export function formatDateRange(start: string, end: string): string {
  return `${formatIsoDate(start)} – ${formatIsoDate(end)}`;
}

export function formatGeneratedAt(iso: string): string {
  const dt = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(dt);
}
