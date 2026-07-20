// Thin HTTP layer over the reusable planner core (lib/planner.js).
// The /api/plan endpoint is shared: today the web UI calls it; a future
// Expo mobile app would call the exact same endpoint. Node 18+ (built-in fetch).

const http = require("http");
const fs = require("fs");
const path = require("path");
const { planTrip } = require("./lib/planner");
const { getRate } = require("./lib/providers/currency");
const { MODEL } = require("./lib/claude");

const PORT = process.env.PORT || 3000;

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "content-type": contentType });
    res.end(content);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1e6) reject(new Error("Payload too large")); });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    serveFile(res, path.join(__dirname, "public", "index.html"), "text/html");
    return;
  }

  // Live rate for the instant converter (keyless, real-time).
  if (req.method === "GET" && req.url.startsWith("/api/rate")) {
    try {
      const u = new URL(req.url, "http://localhost");
      const data = await getRate(u.searchParams.get("from"), u.searchParams.get("to"));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/plan") {
    try {
      const input = JSON.parse(await readBody(req));
      const result = await planTrip(input);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`\n  Travel Companion running at http://localhost:${PORT}`);
  console.log(`  Model: ${MODEL}`);
  if (!process.env.ANTHROPIC_API_KEY)
    console.log("  ⚠  ANTHROPIC_API_KEY not set — planning will fail until you set it.");
  if (!process.env.GEOAPIFY_API_KEY)
    console.log("  ℹ  GEOAPIFY_API_KEY not set — using Claude's own place knowledge (fine for a demo).\n");
  else console.log("");
});
