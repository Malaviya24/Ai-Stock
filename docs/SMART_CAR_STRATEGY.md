# Smart CAR Strategy (Cumulative Average Return)

## 1. Objective

A scientific method for **exit** and **averaging**. It tells you _when_ to add more money to a stock you already own (averaging up) and _when_ to stop adding (avoid holding).

## 2. Universe

- **Stocks already in your portfolio** (or High-conviction watchlist).

## 3. Logic Step-by-Step

### Step 1: Detect 52-Week High

- Identify the date and price of the stock's last **52-Week High**.
- This is our "Reference Point" because it represents peak optimism.

### Step 2: Calculate CAR (Cumulative Average Return)

- From the 52-Week High date, calculate the daily returns.
- **Formula:** Sum of Daily Returns / Number of Days.
- We track the **10-Day Moving Average** of this CAR value.

### Step 3: Check the Trend

- **Rising CAR:** If the 10-Day CAR is continuously increasing (getting less negative or more positive).
  - **Signal:** **AVERAGE (BUY)**.
  - **Meaning:** The stock is recovering strength. It is safe to add more shares.
- **Falling CAR:** If the 10-Day CAR starts falling or breaks its trend.
  - **Signal:** **AVOID HOLD**.
  - **Meaning:** Momentum is lost. Do not put more money into this stock.

### Step 4: Execution

- **Average Amount:** Invest **1/10th** of your total allocated capital per averaging signal.
- **Why?** This prevents throwing all good money after bad money in one go.

## Summary

- **Use it for:** Managing existing positions that have corrected from their highs.
- **Rule:** "Only average up when the CAR line is rising."
