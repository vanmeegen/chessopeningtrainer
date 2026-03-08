import type { ImportanceRating } from "../types/OpeningTypes";

/**
 * Curated importance ratings for openings.
 * 3 = essential (~12), 2 = important (~20), unlisted = 1 (niche).
 */
export const openingImportance: Record<string, ImportanceRating> = {
  // ★★★ Essential
  "ruy-lopez": 3,
  "italian-game": 3,
  "sicilian-defense": 3,
  "french-defense": 3,
  "queens-gambit-declined": 3,
  "kings-indian-defense": 3,
  "nimzo-indian-defense": 3,
  "queens-gambit": 3,
  "caro-kann-defense": 3,
  "english-opening": 3,
  "slav-defense": 3,
  "london-system": 3,

  // ★★ Important
  "scotch-game": 2,
  "petrovs-defense": 2,
  "four-knights-game": 2,
  "kings-gambit": 2,
  "kings-gambit-accepted": 2,
  "kings-gambit-declined": 2,
  "philidor-defense": 2,
  "queens-gambit-accepted": 2,
  "semi-slav-defense": 2,
  "catalan-opening": 2,
  "queens-indian-defense": 2,
  "benoni-defense": 2,
  "grnfeld-defense": 2,
  "dutch-defense": 2,
  "pirc-defense": 2,
  "rti-opening": 2,
  "vienna-game": 2,
  "scandinavian-defense": 2,
  "alekhine-defense": 2,
  "bogo-indian-defense": 2,
  "old-indian-defense": 2,
  "trompowsky-attack": 2,
  "bishops-opening": 2,
  "nimzo-larsen-attack": 2,
  "bird-opening": 2,
  "modern-defense": 2,
  "tarrasch-defense": 2,
  "kings-indian-attack": 2,
  "center-game": 2,
  "ponziani-opening": 2,
  "three-knights-opening": 2,
};
