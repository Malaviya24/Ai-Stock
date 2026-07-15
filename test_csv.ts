import * as fs from "fs";
import * as path from "path";

const csvPath = path.join(process.cwd(), "server", "data", "fundamental_data.csv");
const fileContent = fs.readFileSync(csvPath, "utf-8");
const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== "");

let startIndex = 0;
if (lines[0].startsWith("Mahesh Kaushik")) startIndex = 1;

const headers = lines[startIndex].split(",").map(h => h.trim());
console.log("Headers:", headers);

const getIdx = (name: string) => {
  const idx = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
  console.log(`Mapping '${name}' -> Index ${idx} (${headers[idx] || 'Not Found'})`);
  return idx;
};

const idxSymbol = getIdx("BSE Code");
const idxName = getIdx("Company Name");
const idxEPS = getIdx("EPS");
const idxDividend = getIdx("Dividend Rupees");
const idxMarketCap = getIdx("Market Cap");
const idxPromoters = getIdx("Promoters %");

const splitCSV = (line: string) => {
  let parts = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuote = !inQuote; }
    else if (char === ',' && !inQuote) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  return parts.map(p => p.replace(/^"|"$/g, ''));
};

const row = splitCSV(lines[startIndex + 1]);
console.log("First Row Data:", row);
console.log("EPS:", row[idxEPS]);
console.log("Dividend:", row[idxDividend]);
console.log("Market Cap:", row[idxMarketCap]);
