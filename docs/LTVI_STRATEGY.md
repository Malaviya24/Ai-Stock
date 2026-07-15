# LTVI Strategy (Long Term Value Investing)

## 1. Objective
A composite scoring system to find the "Best of the Best" stocks for long-term holding. It combines Valuation, Quality, and Growth metrics into a single score.

## 2. Universe
*   **NIFTY 500**

## 3. Logic Step-by-Step

### Step 1: Calculate Component Scores (0-100)
1.  **Valuation Score:** Based on P/E, P/B, and PEG ratio. Lower is better.
2.  **Quality Score:** Based on ROE, ROCE, and Debt-to-Equity. Higher is better.
3.  **Growth Score:** Based on Sales Growth and Profit Growth (3-Year CAGR). Higher is better.
4.  **Technicals Score:** Based on RSI and Distance from 200 DMA.

### Step 2: Weighted Average (LTVI Score)
*   **Formula:**
    $$ \text{LTVI} = (0.4 \times \text{Quality}) + (0.3 \times \text{Growth}) + (0.3 \times \text{Valuation}) $$
*   (Technicals are used as a timing filter, not part of the core quality score).

### Step 3: Ranking
*   Sort stocks by **LTVI Score (High to Low)**.
*   Stocks with scores > 70 are "Excellent".
*   Stocks with scores < 40 are "Poor".

## Summary
*   **Goal:** To build a "Coffee Can" portfolio of high-quality compounders.
*   **Action:** Buy the top 10-15 LTVI stocks and hold for years.
