
import fetch from 'node-fetch';

async function testHoma() {
    try {
        const response = await fetch('http://localhost:5000/api/scan/homa-genius', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                totalCapital: 120000,
                parts: 12,
                profitTargetPercent: 3
            })
        });

        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testHoma();
