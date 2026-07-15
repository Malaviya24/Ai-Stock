
const yahooFinance = require('yahoo-finance2').default;

async function checkSymbols() {
    const symbols = ["BFSI.NS", "FINIFTYBEES.NS", "FINNIFTYBEES.NS", "NIFTYFIN.NS", "GOLDBEES.NS"];
    for (const sym of symbols) {
        try {
            const result = await yahooFinance.historical(sym, { period1: '2025-11-01' });
            console.log(`${sym}: OK (${result.length} points)`);
        } catch (e) {
            console.log(`${sym}: FAILED (${e.message})`);
        }
    }
}

checkSymbols();
