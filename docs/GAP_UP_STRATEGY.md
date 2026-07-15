# Gap Up Strategy

## 1. Objective

Identify stocks that open significantly higher than their previous day's close (Gap Up) and maintain that strength, signaling strong buying momentum.

## 2. Universe

- **NIFTY 100** (Top 100 liquid stocks).

## 3. Logic Step-by-Step

### Step 1: Detect the Gap

- **Calculate Gap %:**
  $$ \text{Gap \%} = \frac{\text{Today Open} - \text{Previous Close}}{\text{Previous Close}} \times 100 $$
- **Condition:** Gap % must be **≥ 3.14%**.

### Step 2: Confirm Strength

- **Price > Open:** The Current Market Price (CMP) must be **higher than the Opening Price**. This ensures the stock didn't just gap up and crash immediately.
- **Green Candle:** The Current Price must be **higher than Previous Close**.

### Step 3: Execution (If confirmed)

- **Signal:** **BUY**
- **Targets:**
  - **Conservative:** +6.28% from entry.
  - **Aggressive:** +3.14% from entry (scalping).
- **Stop Loss:** Below the day's Low or Opening Price.
