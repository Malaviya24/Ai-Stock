# DMA Compounding Strategy (Simulation)

## 1. Objective
A mathematical simulation to show the power of compounding small consistent profits over time using the **6.28% target**.

## 2. Inputs
*   **Starting Capital:** e.g., ₹15,000.
*   **Target Per Trade:** 6.28% (2 * Pi).
*   **Profit Split:** 50% Withdrawn (Income), 50% Reinvested (Growth).

## 3. Logic Step-by-Step

### Step 1: Trade Execution
*   Calculate Gross Profit: Capital * 6.28%.
*   Deduct Brokerage & Taxes.

### Step 2: Distribution
*   **Net Profit** is split based on user preference (e.g., 50/50).
*   **Withdrawn:** Goes to bank (Real Income).
*   **Reinvested:** Added to Trading Capital.

### Step 3: Compounding
*   Repeat the process with the *new* higher capital.
*   The simulation runs until a goal (e.g., ₹1 Crore) is reached.

## Summary
*   **Visualizer:** Shows how many trades it takes to reach financial freedom.
*   **Motivation:** Demonstrates that you don't need huge returns, just consistency.
