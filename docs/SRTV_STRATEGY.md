# Money Tree (SRTV) ETF Strategy

## 1. Objective

A value-investing approach for ETFs (Exchange Traded Funds). It buys ETFs when they are undervalued compared to their long-term average (SRTV < 1.0) and sells when they are overvalued.

## 2. Universe

- **120+ ETFs** listed in India (Nifty 50, Bank Nifty, Gold, IT, Pharma, PSU Bank, etc.).

## 3. Logic Step-by-Step

### Step 1: Calculate SRTV (Short-Run Trend Value)

- **SRTV Formula:**
  $$ \text{SRTV} = \frac{\text{Current Price}}{\text{124-Day Moving Average}} $$
- **124 DMA:** Represents roughly 6 months of trading (half a year).

### Step 2: Signal Generation

- **BUY Signal:**
  - If **SRTV < 1.00**: The ETF is trading _below_ its 6-month average. It is considered "Undervalued" or "Cheap".
  - **Strong Buy:** If SRTV < 0.90 (Trading at a 10% discount to average).
- **SELL Signal:**
  - If **SRTV > 1.12**: The ETF is trading _significantly above_ its average. It is "Overvalued" or "Expensive".
  - **Take Profit:** Consider selling or trimming positions.

### Step 3: Ranking

- The scanner sorts ETFs by **SRTV (Low to High)**.
- The lowest SRTV values appear at the top, highlighting the best buying opportunities (e.g., ITBEES at 0.85).

## Summary

- **Buy Low:** When Price < 124 DMA.
- **Sell High:** When Price > 124 DMA + Premium.
- **Best For:** Long-term accumulation of index funds and sectoral ETFs.
