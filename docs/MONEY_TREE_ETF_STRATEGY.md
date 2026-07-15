# Money Tree ETF Strategy (AI Score)

## 1. Objective
An advanced version of the SRTV strategy that uses an "AI Score" to rank ETFs.

## 2. Universe
*   **Liquid ETFs**

## 3. Logic Step-by-Step

### Step 1: Calculate Factors
1.  **RSI (Relative Strength Index):** Oversold (< 30) is good.
2.  **SRTV:** Undervalued (< 1.0) is good.
3.  **Volume Ratio:** High relative volume (> 1.5x average) indicates institutional interest.

### Step 2: Assign AI Score (0-100)
*   **RSI Score:** Lower RSI = Higher Score.
*   **SRTV Score:** Lower SRTV = Higher Score.
*   **Volume Score:** Higher Volume = Higher Score.
*   **Total:** Sum of component scores.

### Step 3: Execution
*   **Strong Buy:** Score > 75.
*   **Buy:** Score 55-75.
*   **Hold:** Score 35-55.
*   **Sell:** Score < 35.

## Summary
*   **Multi-Factor:** More robust than using just one indicator.
*   **Action:** Buy highly-ranked ETFs during market corrections.
