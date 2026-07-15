export interface HistoricalDataPoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function calculateRSI(data: HistoricalDataPoint[], period: number = 14): number {
  if (data.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function calculateDMA(data: HistoricalDataPoint[], days: number = 124): number {
  if (data.length === 0) return 0;
  if (data.length < days) {
    const sum = data.reduce((acc, item) => acc + item.close, 0);
    return sum / data.length;
  }
  const slice = data.slice(-days);
  const sum = slice.reduce((acc, item) => acc + item.close, 0);
  return sum / days;
}

export function calculateSRTV(price: number, dma124: number): number {
  if (dma124 === 0) return 1;
  return price / dma124;
}

export interface AIScoreInput {
  rsi: number;
  srtv: number;
  volumeRatio: number;
}

export function calculateAIScore(input: AIScoreInput): {
  totalScore: number;
  rsiScore: number;
  srtvScore: number;
  volumeScore: number;
  signal: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
} {
  let rsiScore = 0;
  if (input.rsi < 25) rsiScore = 30;
  else if (input.rsi < 35) rsiScore = 25;
  else if (input.rsi < 45) rsiScore = 15;
  else if (input.rsi > 75) rsiScore = 0;
  else if (input.rsi > 65) rsiScore = 5;
  else rsiScore = 10;

  let srtvScore = 0;
  if (input.srtv < 0.90) srtvScore = 30;
  else if (input.srtv < 0.96) srtvScore = 25;
  else if (input.srtv < 1.0) srtvScore = 15;
  else if (input.srtv > 1.15) srtvScore = 0;
  else if (input.srtv > 1.12) srtvScore = 5;
  else srtvScore = 10;

  let volumeScore = 0;
  if (input.volumeRatio > 2.0) volumeScore = 30; // Increased weight since breakout is gone
  else if (input.volumeRatio > 1.5) volumeScore = 20;
  else if (input.volumeRatio > 1.0) volumeScore = 10;
  else volumeScore = 5;

  const totalScore = rsiScore + srtvScore + volumeScore;

  let signal: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  if (totalScore >= 75) signal = "STRONG_BUY";
  else if (totalScore >= 55) signal = "BUY";
  else if (totalScore >= 35) signal = "HOLD";
  else if (totalScore >= 15) signal = "SELL";
  else signal = "STRONG_SELL";

  return { totalScore, rsiScore, srtvScore, volumeScore, signal };
}

export interface BIOSZoneResult {
  zone: "GREEN" | "RED";
  highPrice: number;
  highDate: Date;
  lowPrice: number;
  lowDate: Date;
  details: string;
}

export function calculateBIOSZone(data: HistoricalDataPoint[]): BIOSZoneResult {
  if (data.length === 0) {
    return {
      zone: "RED",
      highPrice: 0,
      highDate: new Date(),
      lowPrice: 0,
      lowDate: new Date(),
      details: "Insufficient data",
    };
  }

  let highPrice = -Infinity;
  let highDate = data[0].date;
  let lowPrice = Infinity;
  let lowDate = data[0].date;

  for (const d of data) {
    if (d.high > highPrice) {
      highPrice = d.high;
      highDate = d.date;
    }
    if (d.low < lowPrice) {
      lowPrice = d.low;
      lowDate = d.date;
    }
  }

  const zone: "GREEN" | "RED" = lowDate < highDate ? "GREEN" : "RED";

  const details = zone === "GREEN"
    ? `52W Low ₹${lowPrice.toFixed(2)} (${lowDate.toLocaleDateString()}) → High ₹${highPrice.toFixed(2)} (${highDate.toLocaleDateString()}) — Uptrend`
    : `52W High ₹${highPrice.toFixed(2)} (${highDate.toLocaleDateString()}) → Low ₹${lowPrice.toFixed(2)} (${lowDate.toLocaleDateString()}) — Downtrend`;

  return { zone, highPrice, highDate, lowPrice, lowDate, details };
}

export function checkAvoidRule(
  newBreakoutPrice: number,
  previousEntryPrice: number | null,
  avoidPercent: number = 0.0275
): { shouldAvoid: boolean; upperAvoid: number; lowerAvoid: number } {
  if (!previousEntryPrice || previousEntryPrice <= 0) {
    return { shouldAvoid: false, upperAvoid: 0, lowerAvoid: 0 };
  }

  const upperAvoid = previousEntryPrice * (1 + avoidPercent);
  const lowerAvoid = previousEntryPrice * (1 - avoidPercent);

  const shouldAvoid = newBreakoutPrice >= lowerAvoid && newBreakoutPrice <= upperAvoid;

  return { shouldAvoid, upperAvoid, lowerAvoid };
}

export interface DMASignalResult {
  ma50: number;
  ma100: number;
  ma200: number;
  distanceFrom200: number;
  signal: "DMA_BUY" | "SELL" | "NO_TRADE";
  target628: number;
}

export function calculateDMASignal(data: HistoricalDataPoint[]): DMASignalResult {
  const price = data.length > 0 ? data[data.length - 1].close : 0;
  const ma50 = calculateDMA(data, 50);
  const ma100 = calculateDMA(data, 100);
  const ma200 = calculateDMA(data, 200);
  const distanceFrom200 = ma200 > 0 ? ((price - ma200) / ma200) * 100 : 0;
  const target628 = parseFloat((price * 1.0628).toFixed(2));

  let signal: "DMA_BUY" | "SELL" | "NO_TRADE" = "NO_TRADE";

  const buyCondition =
    price > ma50 && price > ma100 && price > ma200 &&
    ma50 > ma100 && ma100 > ma200 &&
    (price - ma200) / ma200 <= 0.10;

  const sellCondition =
    price < ma50 && ma50 < ma100 && ma100 < ma200;

  if (buyCondition) signal = "DMA_BUY";
  else if (sellCondition) signal = "SELL";

  return { ma50, ma100, ma200, distanceFrom200, signal, target628 };
}

export interface CARResult {
  high52Week: number;
  highDate: string;
  last10CAR: number[];
  last10Dates: string[];
  carSignal: "STRONG_BUY" | "AVERAGE" | "AVOID";
  averageAmount: number;
  recommendedShares: number;
  carValues: number[];
}

export function calculateCAR(
  data: HistoricalDataPoint[],
  investedCapital: number = 15000
): CARResult {
  if (data.length < 30) {
    return {
      high52Week: 0, highDate: "", last10CAR: [], last10Dates: [], carSignal: "AVOID",
      averageAmount: 0, recommendedShares: 0, carValues: [],
    };
  }

  let highPrice = -Infinity;
  let highIdx = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].close > highPrice) {
      highPrice = data[i].close;
      highIdx = i;
    }
  }

  const highDate = data[highIdx].date instanceof Date
    ? data[highIdx].date.toISOString().split("T")[0]
    : String(data[highIdx].date).split("T")[0];

  const postHighData = data.slice(highIdx);
  const carValues: number[] = [];
  const carDates: string[] = [];
  for (let i = 0; i < postHighData.length; i++) {
    const slice = postHighData.slice(0, i + 1);
    const avg = slice.reduce((sum, d) => sum + d.close, 0) / slice.length;
    carValues.push(parseFloat(avg.toFixed(2)));
    const d = postHighData[i].date instanceof Date
      ? postHighData[i].date.toISOString().split("T")[0]
      : String(postHighData[i].date).split("T")[0];
    carDates.push(d);
  }

  const last10 = carValues.slice(-10);
  const last10Dates = carDates.slice(-10);
  let isRising = last10.length >= 10;
  if (isRising) {
    for (let i = 1; i < last10.length; i++) {
      if (last10[i] <= last10[i - 1]) {
        isRising = false;
        break;
      }
    }
  }

  const carSignal = isRising ? "STRONG_BUY" : "AVOID";
  const currentPrice = data[data.length - 1].close;
  const averageAmount = parseFloat((investedCapital / 5).toFixed(2));
  const recommendedShares = currentPrice > 0 ? Math.floor(averageAmount / currentPrice) : 0;

  return {
    high52Week: highPrice,
    highDate,
    last10CAR: last10,
    last10Dates,
    carSignal: isRising ? "STRONG_BUY" : "AVOID",
    averageAmount,
    recommendedShares,
    carValues,
  };
}

export function calculateCompounding(
  startingCapital: number = 15000,
  brokeragePerTrade: number = 20,
  targetPercent: number = 6.28,
  profitSplitPercent: number = 50,
  goalCapital: number = 10000000,
): {
  steps: { step: number; capital: number; grossProfit: number; tax: number; netProfit: number; withdrawn: number; reinvested: number }[];
  stepsRequired: number;
  yearsRequired: number;
  totalWithdrawn: number;
  finalCapital: number;
  cagr: number;
} {
  let capital = startingCapital;
  let totalWithdrawn = 0;
  const steps: any[] = [];
  let step = 0;

  while (capital < goalCapital && step < 5000) {
    step++;
    const grossProfit = capital * (targetPercent / 100);
    const afterBrokerage = grossProfit - brokeragePerTrade;
    const incomeTax = afterBrokerage * 0.20;
    const cess = incomeTax * 0.04;
    const totalTax = incomeTax + cess;
    const netProfit = Math.max(0, afterBrokerage - totalTax);
    const withdrawn = netProfit * (profitSplitPercent / 100);
    const reinvested = netProfit - withdrawn;

    capital += reinvested;
    totalWithdrawn += withdrawn;

    steps.push({
      step,
      capital: parseFloat(capital.toFixed(2)),
      grossProfit: parseFloat(grossProfit.toFixed(2)),
      tax: parseFloat(totalTax.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2)),
      withdrawn: parseFloat(withdrawn.toFixed(2)),
      reinvested: parseFloat(reinvested.toFixed(2)),
    });
  }

  const yearsRequired = parseFloat((step / 52).toFixed(2));
  const cagr = yearsRequired > 0
    ? parseFloat((((capital / startingCapital) ** (1 / yearsRequired) - 1) * 100).toFixed(2))
    : 0;

  return {
    steps,
    stepsRequired: step,
    yearsRequired,
    totalWithdrawn: parseFloat(totalWithdrawn.toFixed(2)),
    finalCapital: parseFloat(capital.toFixed(2)),
    cagr,
  };
}

export interface ExpiryCandle {
  startDate: Date;
  endDate: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  range: number;
  body: number;
  bodyPercent: number;
  strength: "Strong" | "Healthy" | "Moderate" | "Weak";
  type: "Bullish" | "Bearish" | "Doji";
}

export function analyzeExpiryCandle(
  data: HistoricalDataPoint[],
  prevExpiryDate: Date,
  currentExpiryDate: Date
): ExpiryCandle | null {
  // Filter data between prevExpiry (exclusive?) and currentExpiry (inclusive)
  // User says: "Extract OHLC data between the two expiry dates (inclusive)."
  // So >= prevExpiry and <= currentExpiry.

  // Normalize dates to remove time part for comparison
  const start = new Date(prevExpiryDate); start.setHours(0, 0, 0, 0);
  const end = new Date(currentExpiryDate); end.setHours(0, 0, 0, 0);

  const cycleData = data.filter(d => {
    const dDate = new Date(d.date); dDate.setHours(0, 0, 0, 0);
    return dDate >= start && dDate <= end;
  });

  if (cycleData.length < 2) return null;

  // Sort just in case
  cycleData.sort((a, b) => a.date.getTime() - b.date.getTime());

  // User Prompt: "Open = Close price of START_DATE"
  // So we take the CLOSE price of the first day in the cycle (prevExpiryDate) as our "Open".
  const open = cycleData[0].close;

  // "Close = Close price of END_DATE"
  const close = cycleData[cycleData.length - 1].close;

  // "High = Maximum High price between START_DATE and END_DATE"
  const high = Math.max(...cycleData.map(d => d.high));

  // "Low = Minimum Low price between START_DATE and END_DATE"
  const low = Math.min(...cycleData.map(d => d.low));

  const range = high - low;
  const body = Math.abs(close - open);
  const bodyPercent = range === 0 ? 0 : (body / range) * 100;

  // Strength Classification: >60% Strong, 40-60% Healthy, 20-40% Moderate, <20% Weak
  let strength: "Strong" | "Healthy" | "Moderate" | "Weak" = "Weak";
  if (bodyPercent > 60) strength = "Strong";
  else if (bodyPercent >= 40) strength = "Healthy";
  else if (bodyPercent >= 20) strength = "Moderate";

  let type: "Bullish" | "Bearish" | "Doji" = "Doji";
  // "If Close ≈ Open (very small body) -> Doji"
  // Using < 5% as "very small" threshold, or if bodyPercent is very low (e.g. < 5%)
  // The prompt says "If Close ≈ Open", let's use a small percentage of price or range.
  // Given bodyPercent is calculated, let's use that. < 10% body relative to range is a common doji definition, 
  // but let's stick to strict direction unless very flat.
  // Prompt implies direction is primary, Doji is special case.
  // Let's use 5% body/range threshold for Doji.
  if (bodyPercent < 5) type = "Doji";
  else if (close > open) type = "Bullish";
  else type = "Bearish";

  return {
    startDate: cycleData[0].date,
    endDate: cycleData[cycleData.length - 1].date,
    open, high, low, close,
    range, body, bodyPercent, strength, type
  };
}

export interface MonthlyCandle {
  month: string;
  open: number;
  high: number;
  low: number;
  close: number;
  type: "Bullish" | "Bearish" | "Doji";
}

export function aggregateMonthly(data: HistoricalDataPoint[]): MonthlyCandle[] {
  if (data.length === 0) return [];

  const monthly: Record<string, { open: number; high: number; low: number; close: number; count: number; firstDate: Date; lastDate: Date }> = {};

  data.forEach((d) => {
    const key = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthly[key]) {
      monthly[key] = {
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        count: 1,
        firstDate: d.date,
        lastDate: d.date,
      };
    } else {
      monthly[key].high = Math.max(monthly[key].high, d.high);
      monthly[key].low = Math.min(monthly[key].low, d.low);
      monthly[key].close = d.close; // Last close is monthly close
      monthly[key].count++;
      // We assume data is sorted, but to be safe:
      if (d.date < monthly[key].firstDate) {
        monthly[key].open = d.open;
        monthly[key].firstDate = d.date;
      }
      if (d.date > monthly[key].lastDate) {
        monthly[key].close = d.close;
        monthly[key].lastDate = d.date;
      }
    }
  });

  // Sort keys to ensure order
  const sortedKeys = Object.keys(monthly).sort();

  return sortedKeys.map((key) => {
    const m = monthly[key];
    const bodySize = Math.abs(m.close - m.open);
    const range = m.high - m.low;
    const isDoji = range > 0 && (bodySize / range) < 0.1;
    const type = isDoji ? "Doji" : m.close > m.open ? "Bullish" : "Bearish";

    // Format month name (e.g., "Jan 2025")
    const date = new Date(key + "-01");
    const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });

    return {
      month: monthName,
      open: m.open,
      high: m.high,
      low: m.low,
      close: m.close,
      type,
    };
  });
}

export function calculateCapitalAllocation(
  totalCapital: number,
  currentExposure: number,
  parts: number = 10
): {
  perLotSize: number;
  maxExposure: number;
  currentExposure: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  suggestedPositions: number;
} {
  const perLotSize = totalCapital / parts;
  const maxExposure = totalCapital * 0.6;
  const exposurePercent = (currentExposure / totalCapital) * 100;

  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  if (exposurePercent < 30) riskLevel = "LOW";
  else if (exposurePercent < 50) riskLevel = "MEDIUM";
  else if (exposurePercent < 70) riskLevel = "HIGH";
  else riskLevel = "CRITICAL";

  const remainingCapital = totalCapital - currentExposure;
  const suggestedPositions = Math.max(0, Math.floor(remainingCapital / perLotSize));

  return { perLotSize, maxExposure, currentExposure, riskLevel, suggestedPositions };
}
