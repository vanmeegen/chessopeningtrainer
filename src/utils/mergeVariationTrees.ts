import type { MoveNode, Variation } from "../types/OpeningTypes";

/**
 * Merge multiple variation move trees into a single combined tree.
 * Shared prefixes are merged; where variations diverge, multiple children appear.
 * The first variation's main-line flags are preserved; additional variations
 * branch off as non-main-line children.
 */
export function mergeVariationTrees(variations: Variation[]): MoveNode {
  if (variations.length === 0) {
    throw new Error("Cannot merge zero variations");
  }

  if (variations.length === 1) {
    return variations[0]!.moves;
  }

  // Deep-clone the first variation's tree as the base
  const merged = cloneMoveNode(variations[0]!.moves);

  // Merge each subsequent variation into the base
  for (let i = 1; i < variations.length; i++) {
    mergeInto(merged, variations[i]!.moves);
  }

  return merged;
}

/** Deep-clone a MoveNode tree */
function cloneMoveNode(node: MoveNode): MoveNode {
  return {
    move: node.move,
    fen: node.fen,
    annotation: node.annotation ? { ...node.annotation } : undefined,
    isMainLine: node.isMainLine,
    children: node.children.map(cloneMoveNode),
  };
}

/**
 * Merge `source` tree into `target` tree in-place.
 * Matching moves (same SAN at the same depth) are merged recursively.
 * New moves are added as non-main-line children.
 */
function mergeInto(target: MoveNode, source: MoveNode): void {
  // Prefer wikibooks annotations over generated ones
  if (
    source.annotation &&
    (!target.annotation || target.annotation.source === "generated")
  ) {
    target.annotation = { ...source.annotation };
  }

  for (const sourceChild of source.children) {
    const existing = target.children.find((c) => c.move === sourceChild.move);
    if (existing) {
      // Recursively merge matching subtrees
      mergeInto(existing, sourceChild);
    } else {
      // Add as a new branch (non-main-line)
      const cloned = cloneMoveNode(sourceChild);
      markNonMainLine(cloned);
      target.children.push(cloned);
    }
  }
}

/** Mark an entire subtree as non-main-line */
function markNonMainLine(node: MoveNode): void {
  node.isMainLine = false;
  for (const child of node.children) {
    markNonMainLine(child);
  }
}
