import { Chess } from "chess.js";
import type { MoveNode } from "../src/types/OpeningTypes.js";
import type { ParsedOpening, ParsedVariation } from "./parse-openings.js";

/**
 * Parse a PGN string into an array of SAN moves.
 * Handles move numbers like "1. e4 e5 2. Nf3 Nc6" → ["e4", "e5", "Nf3", "Nc6"]
 */
export function parsePgnMoves(pgn: string): string[] {
  return pgn
    .replace(/\{[^}]*\}/g, "") // remove comments
    .replace(/\d+\.\s*/g, "") // remove move numbers
    .replace(/\.{2,}/g, "") // remove ellipsis like "..."
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0 && !token.match(/^[0-9.]+$/));
}

/**
 * Build a MoveNode tree from a sequence of SAN moves.
 * Computes FEN at each position using chess.js.
 */
export function buildMoveTree(
  moves: string[],
  isMainLine: boolean = true,
): MoveNode {
  const chess = new Chess();
  const startFen = chess.fen();

  // Root node represents the starting position
  const root: MoveNode = {
    move: "",
    fen: startFen,
    children: [],
    isMainLine: true,
  };

  let current = root;

  for (const sanMove of moves) {
    const result = chess.move(sanMove);
    if (!result) {
      console.warn(
        `Invalid move "${sanMove}" in position ${chess.fen()}. Stopping tree construction.`,
      );
      break;
    }

    const node: MoveNode = {
      move: result.san,
      fen: chess.fen(),
      children: [],
      isMainLine,
    };

    current.children.push(node);
    current = node;
  }

  return root;
}

/**
 * Merge a sequence of moves into an existing tree.
 * If moves share a common prefix, they share tree nodes.
 * New diverging moves create new branches.
 */
export function mergeMoveSequence(
  root: MoveNode,
  moves: string[],
  isMainLine: boolean = false,
): void {
  const chess = new Chess();
  let current = root;

  for (const sanMove of moves) {
    // Normalize the move using chess.js to get canonical SAN
    const result = chess.move(sanMove);
    if (!result) {
      console.warn(
        `Invalid move "${sanMove}" in position ${chess.fen()}. Stopping merge.`,
      );
      break;
    }

    const canonicalSan = result.san;

    // Check if this move already exists in children
    const existingChild = current.children.find(
      (child) => child.move === canonicalSan,
    );

    if (existingChild) {
      current = existingChild;
    } else {
      const newNode: MoveNode = {
        move: canonicalSan,
        fen: chess.fen(),
        children: [],
        isMainLine,
      };
      current.children.push(newNode);
      current = newNode;
    }
  }
}

/**
 * Build a complete move tree for an opening by merging all its variations.
 * The first variation is treated as the main line.
 */
export function buildOpeningMoveTree(
  variations: ParsedVariation[],
): MoveNode | null {
  if (variations.length === 0) {
    return null;
  }

  // Build tree from first variation as main line
  const firstVariation = variations[0]!;
  const firstMoves = parsePgnMoves(firstVariation.pgn);
  const root = buildMoveTree(firstMoves, true);

  // Merge remaining variations
  for (let i = 1; i < variations.length; i++) {
    const variation = variations[i]!;
    const moves = parsePgnMoves(variation.pgn);
    mergeMoveSequence(root, moves, false);
  }

  return root;
}

/**
 * Build move trees for all openings.
 * Returns a map from opening ID to root MoveNode.
 */
export function buildAllMoveTrees(
  openings: ParsedOpening[],
): Map<string, MoveNode> {
  const trees = new Map<string, MoveNode>();

  for (const opening of openings) {
    const tree = buildOpeningMoveTree(opening.variations);
    if (tree) {
      trees.set(opening.id, tree);
    }
  }

  return trees;
}
