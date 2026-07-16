/**
 * Safely renders a signal's `details` field for display.
 * The backend stores either:
 *   (a) a plain readable string (e.g. "RSI at 32.1 — oversold zone"), or
 *   (b) a JSON-serialized object with structured data.
 *
 * This function extracts a clean, human-readable summary from either form,
 * so raw JSON like {"currentMonth":"1","candleType":"Bearish",...} never
 * appears in the UI. It also repairs common UTF-8 encoding corruptions
 * (₹ → â‚¹, — → â€", × → Ã—) that occurred when signals were stored to
 * MongoDB through a misconfigured encoding layer.
 */
export function formatDetails(details: string | null | undefined): string {
  if (!details) return "";

  // First, repair common encoding corruption patterns.
  let clean = repairEncoding(details);

  // If it doesn't look like JSON, return the cleaned string as-is.
  if (!clean.startsWith("{") && !clean.startsWith("[")) return clean;

  try {
    const parsed = JSON.parse(clean);
    if (typeof parsed !== "object" || parsed === null) return clean;

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
    // JSON parse failed — return the cleaned string
    return clean;
  }
}

/**
 * Repairs common UTF-8 double/triple encoding corruption patterns that appear
 * when text containing ₹, —, ×, etc. passes through a Latin-1/Windows-1252
 * intermediate layer (e.g. MongoDB driver or Node stream misconfiguration).
 */
export function repairEncoding(text: string): string {
  return text
    // ₹ (U+20B9) corrupted various ways
    .replace(/â‚¹/g, "₹")
    .replace(/ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¹/g, "₹")
    .replace(/Ã¢â‚¬Å¡Ã‚Â¹/g, "₹")
    // — (em dash, U+2014)
    .replace(/â€"/g, "—")
    .replace(/Ã¢â‚¬â€/g, "—")
    .replace(/â€""/g, "—")
    // × (multiplication sign, U+00D7)
    .replace(/Ã—/g, "×")
    // → (right arrow, U+2192)
    .replace(/â†'/g, "→")
    // ≥ (U+2265)
    .replace(/â‰¥/g, "≥")
    // ≤ (U+2264)
    .replace(/â‰¤/g, "≤")
    // Â (stray padding byte from double-encoding)
    .replace(/Â /g, " ")
    .replace(/Â¹/g, "¹");
}
