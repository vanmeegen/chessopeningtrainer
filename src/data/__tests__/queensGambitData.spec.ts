import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import type { Opening, MoveNode } from "../../types/OpeningTypes";

function loadOpening(filename: string): Opening {
  const raw = readFileSync(
    join(__dirname, "../../../public/openings", filename),
    "utf-8",
  );
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
