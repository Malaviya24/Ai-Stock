# Homa Genius Strategy

## 1. Objective

A systematic ETF rotation strategy that buys specific ETFs on specific days of the week to capture recurring market patterns.

## 2. Universe

- **5 Key ETFs:** Nifty, Bank Nifty, Midcap, FinNifty, Sensex.

## 3. Logic Step-by-Step

### Step 1: Day-Based Allocation

- **Monday:** Buy **Midcap ETF** (Midcaps often rally at start of week).
- **Tuesday:** Buy **FinNifty ETF** (Often volatile on FinNifty expiry).
- **Wednesday:** Buy **Bank Nifty ETF** (Ahead of weekly expiry).
- **Thursday:** Buy **Nifty ETF** (Weekly expiry day).
- **Friday:** Buy **Sensex ETF** (End of week positioning).

### Step 2: Candle Confirmation

- **Condition:** Only buy if the **Daily Candle is GREEN** (Close > Open).
- **Logic:** Don't catch falling knives. Buy only if there is intraday strength.

### Step 3: Profit Taking

- **Target:** Sell each position when it hits **+3% profit**.
- **Hold:** If target not hit, hold and carry forward. No stop loss (since they are index ETFs).

## Summary

- **Systematic:** Takes emotion out of trading.
- **Diversified:** Spreads risk across different market segments daily.
- **Simple:** Buy on fixed days, sell on fixed target.
