# BOH Filter Strategy (Breakout High)

## 1. Objective

A trend-following filter used to confirm if a stock is truly in a bullish phase by checking its position relative to its **52-Week High** and **52-Week Low**.

## 2. Universe

- **NIFTY 500** or Custom Watchlist.

## 3. Logic Step-by-Step

### Step 1: Calculate Range

- **52-Week High (H):** The highest price in the last year.
- **52-Week Low (L):** The lowest price in the last year.
- **Range (R):** $H - L$

### Step 2: Define Zones

- **Green Zone (Bullish):** Top 25% of the yearly range.
  - Price > $L + (0.75 \times R)$
- **Yellow Zone (Neutral):** Middle 50% of the range.
- **Red Zone (Bearish):** Bottom 25% of the range.
  - Price < $L + (0.25 \times R)$

### Step 3: Execution

- **Buy Rule:** Only buy stocks that are in the **Green Zone**. This confirms they are near their highs and have strong momentum.
- **Avoid Rule:** Do not buy stocks in the **Red Zone** (falling knives), even if they look cheap.

## Summary

- **Filter:** Use this to filter out weak stocks before applying other strategies.
- **Logic:** "Winners keep winning." Buying near 52-week highs statistically outperforms buying near 52-week lows.
