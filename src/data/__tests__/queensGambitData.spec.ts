import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { Opening, MoveNode } from "../../types/OpeningTypes";

const OPENINGS_DIR = join(__dirname, "../../../public/openings");
const MIN_MAIN_LINE_DEPTH = 1;

/** Collect all leaf depths from a node */
function collectLeafDepths(
  node: MoveNode,
  depth: number,
  results: number[],
): void {
  if (node.children.length === 0) {
    results.push(depth);
    return;
  }
  for (const child of node.children) {
    collectLeafDepths(child, depth + 1, results);
  }
}

function loadOpening(filename: string): Opening {
  const raw = readFileSync(join(OPENINGS_DIR, filename), "utf-8");
  return JSON.parse(raw) as Opening;
}

/** Walk to a specific move sequence and return the final node */
function walkMoves(root: MoveNode, moves: string[]): MoveNode | undefined {
  let current = root;
  for (const move of moves) {
    const child = current.children.find((c) => c.move === move);
    if (!child) return undefined;
    current = child;
  }
  return current;
}

/** Count depth of main line from a node */
function mainLineDepth(node: MoveNode): number {
  const mainChild = node.children.find((c) => c.isMainLine);
  if (!mainChild) return 0;
  return 1 + mainLineDepth(mainChild);
}

describe("Queen's Gambit opening data", () => {
  const opening = loadOpening("queens-gambit.json");
  const mainVariation = opening.variations.find((v) => v.name === "Main Line")!;

  it("should have a main line variation", () => {
    expect(mainVariation).toBeDefined();
    expect(mainVariation.id).toBe("queens-gambit");
  });

  it("should have moves d4 d5 c4 in the main line", () => {
    const d4 = walkMoves(mainVariation.moves, ["d4"]);
    expect(d4).toBeDefined();
    expect(d4!.move).toBe("d4");

    const d5 = walkMoves(mainVariation.moves, ["d4", "d5"]);
    expect(d5).toBeDefined();

    const c4 = walkMoves(mainVariation.moves, ["d4", "d5", "c4"]);
    expect(c4).toBeDefined();
    expect(c4!.move).toBe("c4");
  });

  it("should continue after c4 with at least one move", () => {
    const c4 = walkMoves(mainVariation.moves, ["d4", "d5", "c4"]);
    expect(c4).toBeDefined();
    expect(
      c4!.children.length,
      "Queen's Gambit main line should have continuations after c4 (e.g. e6, dxc4)",
    ).toBeGreaterThan(0);
  });

  it("should only have source 'generated' on annotations that are AI-generated", () => {
    function checkAnnotations(node: MoveNode): void {
      if (node.annotation) {
        expect(["wikibooks", "generated"]).toContain(node.annotation.source);
      }
      for (const child of node.children) {
        checkAnnotations(child);
      }
    }
    checkAnnotations(mainVariation.moves);
  });
});

describe("All opening variations minimum depth", () => {
  const files = readdirSync(OPENINGS_DIR).filter((f) => f.endsWith(".json"));
  const tooShort: Array<{ file: string; variation: string; depth: number }> =
    [];

  for (const file of files) {
    const opening = loadOpening(file);
    for (const variation of opening.variations) {
      const depth = mainLineDepth(variation.moves);
      if (depth < MIN_MAIN_LINE_DEPTH) {
        tooShort.push({ file, variation: variation.name, depth });
      }
    }
  }

  it(`every variation should have at least ${MIN_MAIN_LINE_DEPTH} half-moves in the main line`, () => {
    if (tooShort.length > 0) {
      const summary = tooShort
        .sort((a, b) => a.depth - b.depth)
        .map((v) => `  ${v.file} / ${v.variation}: ${v.depth} half-moves`)
        .join("\n");
      expect.fail(
        `${tooShort.length} variations have fewer than ${MIN_MAIN_LINE_DEPTH} half-moves:\n${summary}`,
      );
    }
  });
});

describe("Opening data consistency", () => {
  const files = readdirSync(OPENINGS_DIR).filter((f) => f.endsWith(".json"));

  it("every opening file should be valid JSON with required fields", () => {
    for (const file of files) {
      const raw = readFileSync(join(OPENINGS_DIR, file), "utf-8");
      const opening = JSON.parse(raw) as Opening;
      expect(opening.id, `${file} missing id`).toBeTruthy();
      expect(opening.name, `${file} missing name`).toBeTruthy();
      expect(opening.eco, `${file} missing eco`).toBeTruthy();
      expect(
        opening.variations.length,
        `${file} has no variations`,
      ).toBeGreaterThan(0);
    }
  });

  it("every variation should have a valid move tree with FEN at each node", () => {
    const invalid: string[] = [];
    for (const file of files) {
      const opening = loadOpening(file);
      for (const variation of opening.variations) {
        function checkNode(node: MoveNode, path: string): void {
          if (!node.fen) {
            invalid.push(`${file}/${variation.name}: missing FEN at ${path}`);
          }
          for (const child of node.children) {
            checkNode(child, `${path}/${child.move}`);
          }
        }
        checkNode(variation.moves, "root");
      }
    }
    if (invalid.length > 0) {
      expect.fail(
        `${invalid.length} nodes missing FEN:\n${invalid.slice(0, 10).join("\n")}`,
      );
    }
  });

  it("should report depth statistics across all openings", () => {
    let totalLeaves = 0;
    let shortLeaves = 0;
    const TARGET_DEPTH = 12;

    for (const file of files) {
      const opening = loadOpening(file);
      for (const variation of opening.variations) {
        const depths: number[] = [];
        collectLeafDepths(variation.moves, 0, depths);
        for (const d of depths) {
          totalLeaves++;
          if (d < TARGET_DEPTH) shortLeaves++;
        }
      }
    }

    const pct = ((shortLeaves / totalLeaves) * 100).toFixed(1);
    console.log(
      `  Leaf depth stats: ${totalLeaves} total, ${shortLeaves} short (<${TARGET_DEPTH}), ${pct}% short`,
    );

    // This is informational — not a hard failure yet.
    // Once we have enough data sources, we can tighten this.
    expect(totalLeaves).toBeGreaterThan(0);
  });

  it("every node annotation should have a valid source", () => {
    const badSources: string[] = [];
    for (const file of files) {
      const opening = loadOpening(file);
      for (const variation of opening.variations) {
        function checkAnnotation(node: MoveNode): void {
          if (node.annotation) {
            if (!["wikibooks", "generated"].includes(node.annotation.source)) {
              badSources.push(
                `${file}/${variation.name}/${node.move}: source="${node.annotation.source}"`,
              );
            }
          }
          for (const child of node.children) {
            checkAnnotation(child);
          }
        }
        checkAnnotation(variation.moves);
      }
    }
    if (badSources.length > 0) {
      expect.fail(
        `${badSources.length} annotations with invalid source:\n${badSources.slice(0, 10).join("\n")}`,
      );
    }
  });
});
