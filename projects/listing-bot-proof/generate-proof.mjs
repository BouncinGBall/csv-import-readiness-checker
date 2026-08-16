import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fallbackCardFromRaw, polishCard } from "../../../avito_seller_bot/src/sales_copy.mjs";
import { renderListing } from "../../../avito_seller_bot/src/copywriter.mjs";
import { listingEconomics, listingReadiness } from "../../../avito_seller_bot/src/listing_quality.mjs";
import { parseMoney } from "../../../avito_seller_bot/src/listing_utils.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const botRoot = path.resolve(root, "../../../avito_seller_bot");
const runtime = JSON.parse(await fs.readFile(path.join(botRoot, "runtime.json"), "utf8"));

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, windowsHide: true });
    let output = "";
    let error = "";
    child.stdout.on("data", value => output += value);
    child.stderr.on("data", value => error += value);
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve(output) : reject(new Error(error || `exit ${code}`)));
  });
}

async function sha256(file) {
  return createHash("sha256").update(await fs.readFile(file)).digest("hex");
}

await run(runtime.python, [path.join(root, "make_synthetic_sources.py")]);

const facts = "Синяя джинсовая куртка, бренд: Test Atelier, размер M, состояние 9/10, без дефектов, цена 1800, закупочная цена 900";
const askingPrice = parseMoney(facts, "asking");
const purchasePrice = parseMoney(facts, "purchase");
const card = polishCard(fallbackCardFromRaw(facts), facts, "balanced");
const photos = ["front", "back", "detail"].map(view => ({
  source: `synthetic-source-${view}.png`,
  output: `synthetic-source-${view}.png`,
}));
const item = {
  id: "SYN-0001",
  status: "ready",
  factsRaw: facts,
  listing: renderListing(card),
  askingPrice,
  purchasePrice,
  card,
  readiness: listingReadiness(card, photos.length, askingPrice),
  economics: listingEconomics(askingPrice, purchasePrice),
  photos,
};

await fs.writeFile(path.join(root, "item.json"), JSON.stringify(item, null, 2) + "\n", "utf8");
await run(runtime.python, [
  path.join(botRoot, "scripts", "make_preview_card.py"),
  path.join(root, "item.json"),
  path.join(root, "preview-card.png"),
]);
item.preview = "preview-card.png";
await fs.writeFile(path.join(root, "item.json"), JSON.stringify(item, null, 2) + "\n", "utf8");
await run(runtime.python, [
  path.join(botRoot, "scripts", "package_listing.py"),
  path.join(root, "item.json"),
  path.join(root, "listing-package.zip"),
]);
await run(runtime.python, [path.join(root, "extract_package.py")]);

const productionSources = [
  "src/sales_copy.mjs",
  "src/copywriter.mjs",
  "src/listing_quality.mjs",
  "src/listing_utils.mjs",
  "scripts/make_preview_card.py",
  "scripts/package_listing.py",
];
const sourceManifest = {};
for (const relative of productionSources) {
  sourceManifest[relative] = await sha256(path.join(botRoot, relative));
}
await fs.writeFile(path.join(root, "production-source-manifest.json"), JSON.stringify({
  generatedAt: "2026-08-17",
  statement: "Hashes identify the exact Fox Box Listing Bot production sources used for this synthetic proof run.",
  sha256: sourceManifest,
}, null, 2) + "\n", "utf8");

const artifacts = [
  "synthetic-source-front.png", "synthetic-source-back.png", "synthetic-source-detail.png",
  "preview-card.png", "listing.txt", "listing.json", "inventory-row.csv",
  "listing-package.zip", "item.json", "production-source-manifest.json",
  "generate-proof.mjs", "make_synthetic_sources.py", "extract_package.py",
];
const checksums = [];
for (const relative of artifacts) checksums.push(`${await sha256(path.join(root, relative))}  ${relative}`);
await fs.writeFile(path.join(root, "SHA256SUMS.txt"), checksums.join("\n") + "\n", "utf8");

console.log(JSON.stringify({
  id: item.id,
  readiness: item.readiness,
  economics: item.economics,
  artifacts: artifacts.length,
}, null, 2));
