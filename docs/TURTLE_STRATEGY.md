# Turtle Trading Strategy (55-Day Breakout)

## 1. Objective

A trend-following strategy that buys when a stock breaks its **55-day high** and sells when it breaks its **20-day low**. It aims to catch major long-term trends.

## 2. Universe

- **NIFTY 500** (Broad market index).

## 3. Logic Step-by-Step

### Step 1: Detect Breakout (Entry)

- **Calculate:** The highest high of the last **55 days** (Donchian Channel High).
- **Rule:** If `Current Price > 55-Day High`, generate a **BUY** signal.
- **Meaning:** The stock is making a new multi-month high, indicating strong momentum.

### Step 2: Detect Breakdown (Exit)

- **Calculate:** The lowest low of the last **20 days** (Donchian Channel Low).
- **Rule:** If `Current Price < 20-Day Low`, generate a **SELL** signal.
- **Meaning:** The trend has reversed, exit immediately.

### Step 3: Position Sizing

- **ATR (Average True Range):** Used to measure volatility.
- **Units:** More capital is allocated to less volatile stocks, and less to highly volatile ones.

### Step 4: Pyramiding (Adding to Winners)

- If the price moves in your favor by **1 ATR**, add another unit to the position.
- Max **4 units** per stock.

## Summary

- **Buy:** New 55-Day High.
- **Sell:** New 20-Day Low.
- **Stop Loss:** 2 ATR below entry (trailing).
