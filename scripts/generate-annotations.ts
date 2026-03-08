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

/** Context information for generating better annotations */
type AnnotationContext = {
  openingName: string;
  moveNumber: number;
  isWhiteMove: boolean;
  previousMoves: string[];
};

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
 * Infer a strategic theme using opening context for richer descriptions.
 */
export function inferContextualStrategicTheme(
  san: string,
  context: AnnotationContext,
): string {
  const category = classifyMove(san);
  const cleanSan = san.replace(/[+#!?]/g, "");
  const openingLower = context.openingName.toLowerCase();

  // Context-specific themes
  if (category === "center-pawn") {
    if (cleanSan === "e4" && context.moveNumber === 1) {
      return "Center control, open game";
    }
    if (cleanSan === "d4" && context.moveNumber === 1) {
      return "Center control, closed game";
    }
    if (cleanSan === "e3" || cleanSan === "d3") {
      return "Solid center support";
    }
    if (context.moveNumber > 1) {
      return "Central tension";
    }
    return "Center control";
  }

  if (category === "piece-development") {
    if (cleanSan.startsWith("N")) {
      const square = cleanSan.substring(1);
      if (
        square === "f3" ||
        square === "c3" ||
        square === "f6" ||
        square === "c6"
      ) {
        return "Natural piece development";
      }
      return "Knight activity";
    }
    if (cleanSan.startsWith("B")) {
      if (
        openingLower.includes("italian") ||
        cleanSan === "Bc4" ||
        cleanSan === "Bc5"
      ) {
        return "Active bishop development";
      }
      if (
        openingLower.includes("spanish") ||
        openingLower.includes("ruy lopez")
      ) {
        return "Positional pressure on the knight";
      }
      return "Bishop development";
    }
    return "Piece development";
  }

  if (category === "pawn-advance") {
    if (cleanSan === "c5" && context.previousMoves.includes("e4")) {
      return "Asymmetric counter-play";
    }
    if (cleanSan === "c4" && context.moveNumber === 1) {
      return "English Opening, flank control";
    }
    if (cleanSan === "f4") {
      return "Aggressive kingside expansion";
    }
    if (
      cleanSan === "g3" ||
      cleanSan === "b3" ||
      cleanSan === "g6" ||
      cleanSan === "b6"
    ) {
      return "Fianchetto preparation";
    }
    if (cleanSan.match(/^[a-h]6$/) || cleanSan.match(/^[a-h]3$/)) {
      return "Prophylactic pawn move";
    }
    if (cleanSan === "c3" || cleanSan === "c6") {
      return "Center reinforcement";
    }
    return "Pawn structure";
  }

  if (category === "castling") {
    if (context.moveNumber <= 5) {
      return san === "O-O"
        ? "Early king safety"
        : "Aggressive queenside castling";
    }
    return san === "O-O" ? "King safety" : "King safety, queenside activity";
  }

  if (category === "capture") {
    return "Material exchange";
  }

  return inferStrategicTheme(san);
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
 * Generate a context-aware move rationale using opening name and position context.
 */
export function generateContextualMoveRationale(
  san: string,
  context: AnnotationContext,
): string {
  const category = classifyMove(san);
  const cleanSan = san.replace(/[+#!?]/g, "");
  const openingName = context.openingName;
  const openingLower = openingName.toLowerCase();

  switch (category) {
    case "center-pawn": {
      if (cleanSan === "e4" && context.moveNumber === 1) {
        return `${san} opens the game by controlling the d5 and f5 squares, preparing rapid piece development in the ${openingName}.`;
      }
      if (cleanSan === "d4" && context.moveNumber === 1) {
        return `${san} claims the center and opens the diagonal for the queen's bishop, characteristic of the ${openingName}.`;
      }
      if (
        cleanSan === "e5" &&
        context.moveNumber === 1 &&
        context.previousMoves.includes("e4")
      ) {
        return `${san} establishes a classical pawn duo, directly challenging White's center in the ${openingName}.`;
      }
      if (cleanSan === "d3" || cleanSan === "e3") {
        return `${san} reinforces the center solidly, maintaining flexibility in the ${openingName}.`;
      }
      return `${san} impacts the center, shaping the pawn structure in the ${openingName}.`;
    }

    case "piece-development": {
      if (cleanSan === "Nf3" && context.moveNumber <= 2) {
        return `${san} develops the knight to its most natural square, controlling e5 and d4 in the ${openingName}.`;
      }
      if (cleanSan === "Nc6" || cleanSan === "Nc3") {
        return `${san} develops toward the center, supporting the pawn structure in the ${openingName}.`;
      }
      if (cleanSan === "Nf6" && context.previousMoves.includes("e4")) {
        if (openingLower.includes("alekhine")) {
          return `${san} provocatively attacks the e4 pawn, inviting White to advance and overextend in Alekhine's Defense.`;
        }
        return `${san} develops the knight while attacking the e4 pawn in the ${openingName}.`;
      }
      if (cleanSan === "Bc4" || cleanSan === "Bc5") {
        return `${san} develops the bishop actively, targeting the vulnerable f7/f2 square in the ${openingName}.`;
      }
      if (cleanSan === "Bb5" || cleanSan === "Bb4") {
        return `${san} pins or eyes the knight, creating positional tension in the ${openingName}.`;
      }
      if (cleanSan === "Be2" || cleanSan === "Be7") {
        return `${san} develops the bishop to a modest but solid square, preparing to castle in the ${openingName}.`;
      }
      return `${san} develops a piece to an active square in the ${openingName}.`;
    }

    case "castling": {
      if (san === "O-O") {
        return `Castles kingside, securing the king and connecting the rooks in the ${openingName}.`;
      }
      return `Castles queenside, placing the king on the flank while activating the rook toward the center in the ${openingName}.`;
    }

    case "capture": {
      return `${san} exchanges material, altering the pawn structure in the ${openingName}.`;
    }

    case "check": {
      return `${san} delivers check, seizing the initiative in the ${openingName}.`;
    }

    case "fianchetto": {
      return `${san} completes the fianchetto, placing the bishop on the long diagonal in the ${openingName}.`;
    }

    case "queen-move": {
      if (context.moveNumber <= 3) {
        return `${san} develops the queen early, seeking direct activity in the ${openingName}.`;
      }
      return `${san} activates the queen, increasing pressure in the ${openingName}.`;
    }

    case "rook-move": {
      return `${san} repositions the rook toward an open or key file in the ${openingName}.`;
    }

    case "pawn-advance": {
      if (cleanSan === "c5") {
        if (openingLower.includes("sicilian")) {
          return `${san} is the hallmark of the Sicilian Defense, creating an asymmetric pawn structure and fighting for the d4 square.`;
        }
        return `${san} challenges the center from the flank in the ${openingName}.`;
      }
      if (cleanSan === "c4") {
        if (context.moveNumber === 1) {
          return `${san} controls d5 from the flank, characteristic of the English Opening.`;
        }
        return `${san} gains space on the queenside in the ${openingName}.`;
      }
      if (
        cleanSan === "g3" ||
        cleanSan === "b3" ||
        cleanSan === "g6" ||
        cleanSan === "b6"
      ) {
        return `${san} prepares the fianchetto, aiming to place the bishop on a long diagonal in the ${openingName}.`;
      }
      if (
        cleanSan === "a3" ||
        cleanSan === "h3" ||
        cleanSan === "a6" ||
        cleanSan === "h6"
      ) {
        return `${san} is a prophylactic move, preventing an opponent's piece from reaching an active square in the ${openingName}.`;
      }
      return `${san} advances a pawn, influencing the structure in the ${openingName}.`;
    }

    case "unknown": {
      return `${san} improves the position in the ${openingName}.`;
    }
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
 * Generate a context-aware annotation for a move.
 */
export function generateContextualAnnotation(
  san: string,
  context: AnnotationContext,
): Annotation {
  return {
    moveRationale: generateContextualMoveRationale(san, context),
    strategicTheme: inferContextualStrategicTheme(san, context),
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

/**
 * Annotate all nodes in a move tree recursively with opening context.
 * Modifies the tree in place. Only annotates nodes that don't already have an annotation.
 */
export function annotateMoveTreeWithContext(
  node: MoveNode,
  openingName: string,
  currentPath: string[] = [],
): void {
  const movePath = node.move !== "" ? [...currentPath, node.move] : currentPath;

  if (node.move !== "" && !node.annotation) {
    const moveNumber =
      Math.floor(movePath.length / 2) + (movePath.length % 2 === 1 ? 1 : 0);
    const isWhiteMove = movePath.length % 2 === 1;

    const context: AnnotationContext = {
      openingName,
      moveNumber,
      isWhiteMove,
      previousMoves: currentPath,
    };

    node.annotation = generateContextualAnnotation(node.move, context);
  }

  for (const child of node.children) {
    annotateMoveTreeWithContext(child, openingName, movePath);
  }
}

export type { AnnotationContext };
