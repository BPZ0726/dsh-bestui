// One-shot verifier: extract code.client from a cordis_inspect_self spill file
// and compare it against dist/dynamic-client.js after identical normalization
// (LF line endings + decoding literal \uXXXX escape text in both sides).
// Usage: node scripts/verify-spill.mjs <spill-json> <dist-client.js>
import fs from "node:fs";

const [spillPath, distPath] = process.argv.slice(2);
if (!spillPath || !distPath) {
  console.error("usage: node scripts/verify-spill.mjs <spill-json> <dist-client.js>");
  process.exit(2);
}

const spill = JSON.parse(fs.readFileSync(spillPath, "utf8"));
const client = spill.code.client;
const dist = fs.readFileSync(distPath, "utf8");

function norm(s) {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

const a = norm(client);
const b = norm(dist);
console.log(`clientLen=${a.length} distLen=${b.length}`);

let i = 0;
const min = Math.min(a.length, b.length);
while (i < min && a[i] === b[i]) i++;

if (i === min && a.length === b.length) {
  console.log("equal=True");
} else {
  console.log(`equal=False firstDiff=${i}`);
  const start = Math.max(0, i - 70);
  const end = Math.min(Math.max(a.length, b.length), i + 70);
  console.log("client: ..." + a.slice(start, end) + "...");
  console.log("dist:   ..." + b.slice(start, end) + "...");
  console.log("client@diff: " + JSON.stringify(a.slice(i, i + 60)));
  console.log("dist@diff:   " + JSON.stringify(b.slice(i, i + 60)));
  process.exitCode = 1;
}
