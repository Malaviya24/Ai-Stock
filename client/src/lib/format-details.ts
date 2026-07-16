/**
 * Safely renders a signal's `details` field for display.
 * The backend stores either:
 *   (a) a plain readable string (e.g. "RSI at 32.1 — oversold zone"), or
 *   (b) a JSON-serialized object with structured data.
 *
 * This function extracts a clean, human-readable summary from either form,
 * so raw JSON like {"currentMonth":"1","candleType":"Bearish",...} never
 * appears in the UI.
 */
export function formatDetails(details: string | null | undefined): string {
  if (!details) return "";
  // If it doesn't look like JSON, return as-is (already a readable string).
  if (!details.startsWith("{") && !details.startsWith("[")) return details;

  try {
    const parsed = JSON.parse(details);
    if (typeof parsed !== "object" || parsed === null) return details;

    // Try to extract common readable fields from various strategy data shapes.
    const parts: string[] = [];

    // Monthly Candle
    if (parsed.candleType) parts.push(parsed.candleType);
    if (parsed.monthRange) parts.push(parsed.monthRange);
    if (parsed.riskLevel) parts.push(`Risk: ${parsed.riskLevel}`);
    if (parsed.strength) parts.push(`Strength: ${parsed.strength}`);
    if (parsed.status) parts.push(parsed.status);

    // Fundamental / BOH
    if (parsed.verdict) parts.push(parsed.verdict);
    if (parsed.bohStatus && parsed.bohStatus !== "Pending") parts.push(`BOH: ${parsed.bohStatus}`);

    // Gap Up / Turtle / general
    if (parsed.signal && !parts.length) parts.push(parsed.signal);
    if (parsed.reason) parts.push(parsed.reason);
    if (parsed.checks) parts.push(parsed.checks);

    // If we extracted anything useful, join it; otherwise show a compact summary
    if (parts.length > 0) return parts.join(" · ");

    // Last resort: show keys as a brief label (avoid raw dump)
    const keys = Object.keys(parsed).slice(0, 3).join(", ");
    return `Data: ${keys}…`;
  } catch {
    // JSON parse failed — return as-is (it's probably a plain string with { in it)
    return details;
  }
}
