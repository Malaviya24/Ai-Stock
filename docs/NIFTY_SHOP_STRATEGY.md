# Nifty Shop Strategy

## 1. Objective
A "Buy the Dip" strategy for Nifty 50 stocks. It treats the Nifty 50 like a supermarket—when prices drop, they are "on sale".

## 2. Universe
*   **NIFTY 50**

## 3. Logic Step-by-Step

### Step 1: Detect Correction
*   Calculate the **% Fall from 52-Week High** for every Nifty 50 stock.
    $$ \text{Fall \%} = \frac{\text{52W High} - \text{CMP}}{\text{52W High}} \times 100 $$

### Step 2: Categorize Discounts
*   **5-10% Drop:** "Small Sale" (Accumulate slowly).
*   **10-20% Drop:** "Big Sale" (Buy aggressively).
*   **> 20% Drop:** "Clearance Sale" (Verify fundamentals, then buy).

### Step 3: Ranking
*   Sort stocks by **Discount % (High to Low)**.
*   Stocks that have fallen the most (e.g., -25%) are at the top.

## Summary
*   **Philosophy:** Quality stocks eventually recover. Buying them during corrections maximizes long-term returns.
*   **Warning:** Check if the fall is due to a structural problem (e.g., fraud, policy change) before buying >20% dips.
