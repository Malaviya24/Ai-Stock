# Nifty DMA Strategy Explanation

This document explains the **Nifty DMA (Daily Moving Average) Strategy** implemented in the dashboard. This automated system identifies high-probability "Bull Run" stocks from the NIFTY Large Midcap 250 universe.

## 1. The Objective
The goal is to find stocks that are in a strong uptrend but not yet overextended. We use Moving Averages (50, 100, 200 days) to confirm the trend and specific rules to manage risk.

---

## 2. Universe Selection
*   **Source:** We scan strictly from the **NIFTY Large Midcap 250** index.
*   **Why?** This ensures we trade only liquid, well-established companies (Top 100 Large Caps + Top 150 Mid Caps), avoiding risky penny stocks.

---

## 3. Bull Run Logic (The "BUY" Signal)
A stock is considered for buying ONLY if it meets **all** of the following conditions simultaneously:

### Condition A: Strong Uptrend
The Current Market Price (CMP) must be above all three key moving averages:
1.  **CMP > 50 DMA** (Short-term trend is up)
2.  **CMP > 100 DMA** (Medium-term trend is up)
3.  **CMP > 200 DMA** (Long-term trend is up)

*Note: Unlike some strategies, we do **not** require the moving averages to be aligned (e.g., 50 > 100 > 200). We only require the price to be above all of them.*

### Condition B: Valuation Filter (The "Cheap" Check)
We want to buy stocks *before* they run away too far.
*   **Rule:** The CMP must **NOT** be more than **10%** above the 200 DMA.
*   **Logic:** If a stock is 20% or 30% above its 200 DMA, it is "overextended" and liable to correct. Buying close to the 200 DMA gives us a better safety margin.

---

## 4. Execution Logic (How the Scanner Works)

### Step 1: Data Fetching
*   The system connects to your **Shoonya** broker account.
*   It fetches **500 days (approx. 2 years)** of historical price data for every stock in the Nifty Large Midcap 250 list.

### Step 2: Calculation
*   For each stock, it calculates the **50-day**, **100-day**, and **200-day** simple moving averages.
*   It calculates the **% Difference** between the Current Price and the 200 DMA:
    $$ \text{Diff \%} = \frac{\text{CMP} - \text{200 DMA}}{\text{200 DMA}} \times 100 $$

### Step 3: Filtering & Sorting
*   It discards any stock that fails the Bull Run conditions (e.g., price below 50 DMA or price > 10% above 200 DMA).
*   **Sorting:** The eligible "BUY" list is sorted by **Price (Ascending)**.
    *   *Why?* This helps smaller investors or those with limited capital to fill their portfolio with affordable quantity-based stocks first (e.g., buying a ₹40 stock vs a ₹25,000 stock).

---

## 5. Trade Management (If Executed)

### Capital Allocation
*   **Total Capital:** Divided into **50 equal parts**.
*   **Allocation:** Each stock gets exactly **1 part** (approx. 2% of portfolio). This ensures diversification.

### Target (Profit Booking)
*   **Exit Rule:** Sell immediately when the stock price rises **+6.28%** from your buy price.
*   *Why 6.28?* It's a specific mathematical constant ($2 \times \pi$) used in this system for consistent compounding.

### Stop Loss / Quarantine (Risk Management)
*   **No Hard Stop Loss:** We do not sell at a loss.
*   **Quarantine Rule:** If a stock falls **-20%** from the buy price:
    1.  It is marked as **"Quarantine"**.
    2.  **SIP Mode Activates:** The system starts a monthly SIP (Systematic Investment Plan) buying **1/15th** of the original allocation amount.
    3.  **Goal:** This averages down the buy price. We exit the stock when the *average* price + profit target is recovered.

---

## Summary for the User
1.  **Click "Scan Only":** The system finds stocks that are starting a fresh bull run but are still "cheap" (close to 200 DMA).
2.  **Review List:** You see the cheapest valid stocks at the top.
3.  **Action:** You can manually buy these stocks in your broker app, allocating ~2% of your capital to each.
