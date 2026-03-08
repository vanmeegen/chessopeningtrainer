import type { Annotation, MoveNode } from "../src/types/OpeningTypes.js";

/** Categories of chess moves for annotation generation */
type MoveCategory =
  | "pawn-advance"
  | "piece-development"
  | "castling"
  | "capture"
  | "check"
  | "center-pawn"
  | "fianchetto"
  | "queen-move"
  | "rook-move"
  | "unknown";

/**
 * Classify a move by its SAN notation into a category.
 */
export function classifyMove(san: string): MoveCategory {
  // Check for castling first
  if (san === "O-O" || san === "O-O-O") {
    return "castling";
  }

  // Check for check/checkmate
  const isCheck = san.includes("+") || san.includes("#");
  const isCapture = san.includes("x");
  const cleanSan = san.replace(/[+#!?]/g, "");

  // Center pawn moves
  if (cleanSan.match(/^[ed][34]$/) || cleanSan.match(/^[ed]x[a-h][34]$/)) {
    return "center-pawn";
  }

  // Captures
  if (isCapture) {
    return "capture";
  }

  // Check moves
  if (isCheck) {
    return "check";
  }

  // Knight or Bishop development
  if (cleanSan.match(/^[NB]/)) {
    return "piece-development";
  }

  // Fianchetto (bishop to g2/b2/g7/b7 after pawn g3/b3/g6/b6)
  if (cleanSan.match(/^B[gb][27]$/)) {
    return "fianchetto";
  }

  // Queen moves
  if (cleanSan.match(/^Q/)) {
    return "queen-move";
  }

  // Rook moves
  if (cleanSan.match(/^R/)) {
    return "rook-move";
  }

  // Pawn moves
  if (cleanSan.match(/^[a-h]/)) {
    return "pawn-advance";
  }

  return "unknown";
}

/**
 * Infer a strategic theme from a move's SAN notation.
 */
export function inferStrategicTheme(san: string): string {
  const category = classifyMove(san);

  switch (category) {
    case "center-pawn":
      return "Center control";
    case "piece-development":
      return "Piece development";
    case "castling":
      return san === "O-O" ? "King safety" : "King safety, queenside activity";
    case "capture":
      return "Material exchange";
    case "check":
      return "King pressure";
    case "fianchetto":
      return "Fianchetto development";
    case "queen-move":
      return "Queen activity";
    case "rook-move":
      return "Rook activation";
    case "pawn-advance":
      return "Pawn structure";
    case "unknown":
      return "Position improvement";
  }
}

/**
 * Generate a template-based move rationale from the SAN notation.
 */
export function generateMoveRationale(san: string): string {
  const category = classifyMove(san);

  switch (category) {
    case "center-pawn":
      return `${san} stakes a claim in the center, controlling key central squares.`;
    case "piece-development":
      return `${san} develops a piece to an active square, contributing to the position.`;
    case "castling":
      return san === "O-O"
        ? "Castles kingside, tucking the king to safety and connecting the rooks."
        : "Castles queenside, seeking king safety while activating the rook.";
    case "capture":
      return `${san} captures material, changing the pawn structure or gaining an advantage.`;
    case "check":
      return `${san} delivers check, forcing the opponent to respond to the king threat.`;
    case "fianchetto":
      return `${san} completes the fianchetto, placing the bishop on a powerful long diagonal.`;
    case "queen-move":
      return `${san} activates the queen, increasing pressure on the position.`;
    case "rook-move":
      return `${san} improves the rook's placement, targeting an open or semi-open file.`;
    case "pawn-advance":
      return `${san} advances a pawn, influencing the pawn structure and space.`;
    case "unknown":
      return `${san} improves the position.`;
  }
}

/**
 * Generate a template-based annotation for a move.
 */
export function generateAnnotation(san: string): Annotation {
  return {
    moveRationale: generateMoveRationale(san),
    strategicTheme: inferStrategicTheme(san),
    source: "generated",
  };
}

/**
 * Annotate all nodes in a move tree recursively.
 * Modifies the tree in place.
 */
export function annotateMoveTree(node: MoveNode): void {
  // Don't annotate the root node (empty move)
  if (node.move !== "") {
    node.annotation = generateAnnotation(node.move);
  }

  for (const child of node.children) {
    annotateMoveTree(child);
  }
}
