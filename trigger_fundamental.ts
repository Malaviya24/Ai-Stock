import fetch from "node-fetch";

async function run() {
  try {
    const res = await fetch("http://localhost:5000/api/scan/fundamental", {
      method: "POST",
    });
    const data = await res.json();
    console.log("Response:", data.success);
  } catch (e) {
    console.error("Error:", e);
  }
}

run();