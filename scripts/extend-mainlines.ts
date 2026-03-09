/**
 * One-time migration script: extend main lines in all existing opening JSON files.
 * Reads each file, applies extendMainLine to every variation, and writes back.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extendMainLine } from "./build-move-trees.js";
import type { Opening } from "../src/types/OpeningTypes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OPENINGS_DIR = join(__dirname, "..", "public", "openings");

function mainLineDepth(node: { children: { isMainLine: boolean }[] }): number {
  const mc = node.children.find(
    (c: { isMainLine: boolean }) => c.isMainLine,
  ) as (typeof node)["children"][number] & typeof node;
  return mc ? 1 + mainLineDepth(mc) : 0;
}

const files = readdirSync(OPENINGS_DIR).filter((f) => f.endsWith(".json"));

let totalExtended = 0;
let totalGain = 0;

for (const file of files) {
  const filePath = join(OPENINGS_DIR, file);
  const opening: Opening = JSON.parse(readFileSync(filePath, "utf-8"));
  let fileChanged = false;

  for (const variation of opening.variations) {
    const before = mainLineDepth(variation.moves);
    extendMainLine(variation.moves);
    const after = mainLineDepth(variation.moves);

    if (after > before) {
      totalExtended++;
      totalGain += after - before;
      fileChanged = true;
    }
  }

  if (fileChanged) {
    writeFileSync(filePath, JSON.stringify(opening, null, 2), "utf-8");
  }
}

console.log(
  `Extended ${totalExtended} variations (+${totalGain} total half-moves)`,
);
