import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { Opening, MoveNode } from "../../types/OpeningTypes";

const OPENINGS_DIR = join(__dirname, "../../../public/openings");
const MIN_MAIN_LINE_DEPTH = 1;

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
