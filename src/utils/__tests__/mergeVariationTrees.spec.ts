import { describe, it, expect } from "vitest";
import { mergeVariationTrees } from "../mergeVariationTrees";
import type { MoveNode, Variation } from "../../types/OpeningTypes";

function makeNode(
  move: string,
  children: MoveNode[] = [],
  isMainLine = true,
): MoveNode {
  return { move, fen: `fen-${move}`, children, isMainLine };
}

function makeVariation(id: string, moves: MoveNode): Variation {
  return { id, name: id, moves, pgn: "" };
}

describe("mergeVariationTrees", () => {
  it("throws on empty variations", () => {
    expect(() => mergeVariationTrees([])).toThrow("Cannot merge zero");
  });

  it("returns a copy of the single variation unchanged", () => {
    const tree = makeNode("e4", [makeNode("e5")]);
    const result = mergeVariationTrees([makeVariation("v1", tree)]);
    expect(result.move).toBe("e4");
    expect(result.children).toHaveLength(1);
    expect(result.children[0]!.move).toBe("e5");
  });

  it("merges two variations with shared prefix and different continuations", () => {
    // Variation 1: e4 -> e5 -> Nf3
    const v1 = makeNode("e4", [makeNode("e5", [makeNode("Nf3")])]);
    // Variation 2: e4 -> e5 -> Bc4
    const v2 = makeNode("e4", [makeNode("e5", [makeNode("Bc4")])]);

    const merged = mergeVariationTrees([
      makeVariation("v1", v1),
      makeVariation("v2", v2),
    ]);

    expect(merged.move).toBe("e4");
    expect(merged.children).toHaveLength(1);
    const e5 = merged.children[0]!;
    expect(e5.move).toBe("e5");
    expect(e5.children).toHaveLength(2);
    expect(e5.children.map((c) => c.move).sort()).toEqual(["Bc4", "Nf3"]);
  });

  it("preserves main-line flag from first variation", () => {
    const v1 = makeNode("e4", [makeNode("e5")]);
    const v2 = makeNode("e4", [makeNode("d5")]);

    const merged = mergeVariationTrees([
      makeVariation("v1", v1),
      makeVariation("v2", v2),
    ]);

    const e5 = merged.children.find((c) => c.move === "e5")!;
    const d5 = merged.children.find((c) => c.move === "d5")!;
    expect(e5.isMainLine).toBe(true);
    expect(d5.isMainLine).toBe(false);
  });

  it("merges three variations correctly", () => {
    // All share e4 -> e5, then diverge
    const v1 = makeNode("e4", [makeNode("e5", [makeNode("Nf3")])]);
    const v2 = makeNode("e4", [makeNode("e5", [makeNode("Bc4")])]);
    const v3 = makeNode("e4", [makeNode("e5", [makeNode("d4")])]);

    const merged = mergeVariationTrees([
      makeVariation("v1", v1),
      makeVariation("v2", v2),
      makeVariation("v3", v3),
    ]);

    const e5 = merged.children[0]!;
    expect(e5.children).toHaveLength(3);
  });

  it("does not duplicate already existing children", () => {
    // Both have e4 -> e5 -> Nf3
    const v1 = makeNode("e4", [makeNode("e5", [makeNode("Nf3")])]);
    const v2 = makeNode("e4", [makeNode("e5", [makeNode("Nf3")])]);

    const merged = mergeVariationTrees([
      makeVariation("v1", v1),
      makeVariation("v2", v2),
    ]);

    const e5 = merged.children[0]!;
    expect(e5.children).toHaveLength(1);
    expect(e5.children[0]!.move).toBe("Nf3");
  });

  it("prefers wikibooks annotations over generated", () => {
    const v1 = makeNode("e4");
    v1.annotation = {
      moveRationale: "generated text",
      strategicTheme: "theme",
      source: "generated",
    };
    const v2 = makeNode("e4");
    v2.annotation = {
      moveRationale: "wikibooks text",
      strategicTheme: "theme",
      source: "wikibooks",
    };

    const merged = mergeVariationTrees([
      makeVariation("v1", v1),
      makeVariation("v2", v2),
    ]);

    expect(merged.annotation!.source).toBe("wikibooks");
    expect(merged.annotation!.moveRationale).toBe("wikibooks text");
  });

  it("does not modify original trees", () => {
    const v1 = makeNode("e4", [makeNode("e5")]);
    const v2 = makeNode("e4", [makeNode("d5")]);

    mergeVariationTrees([makeVariation("v1", v1), makeVariation("v2", v2)]);

    expect(v1.children).toHaveLength(1);
    expect(v1.children[0]!.move).toBe("e5");
    expect(v2.children).toHaveLength(1);
    expect(v2.children[0]!.move).toBe("d5");
  });
});
