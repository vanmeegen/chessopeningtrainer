import { describe, it, expect } from "vitest";
import {
  buildWikibooksPath,
  extractProseFromWikitext,
  extractMoveRationale,
  extractStrategicTheme,
} from "../fetch-wikibooks-annotations.js";

describe("buildWikibooksPath", () => {
  it("should build path for a single white move", () => {
    expect(buildWikibooksPath(["e4"])).toBe("Chess_Opening_Theory/1._e4");
  });

  it("should build path for a single white and black move", () => {
    expect(buildWikibooksPath(["e4", "e5"])).toBe(
      "Chess_Opening_Theory/1._e4/1...e5",
    );
  });

  it("should build path for multiple moves", () => {
    expect(buildWikibooksPath(["e4", "e5", "Nf3"])).toBe(
      "Chess_Opening_Theory/1._e4/1...e5/2._Nf3",
    );
  });

  it("should build path for a longer sequence", () => {
    expect(buildWikibooksPath(["e4", "e5", "Nf3", "Nc6", "Bb5"])).toBe(
      "Chess_Opening_Theory/1._e4/1...e5/2._Nf3/2...Nc6/3._Bb5",
    );
  });

  it("should handle empty moves array", () => {
    expect(buildWikibooksPath([])).toBe("Chess_Opening_Theory");
  });

  it("should build path for d4 openings", () => {
    expect(buildWikibooksPath(["d4", "d5", "c4"])).toBe(
      "Chess_Opening_Theory/1._d4/1...d5/2._c4",
    );
  });
});

describe("extractProseFromWikitext", () => {
  it("should strip wiki links and return plain text", () => {
    const wikitext =
      "This move [[Chess Opening Theory|develops]] the [[knight]] to a good square.";
    const result = extractProseFromWikitext(wikitext);
    expect(result).toBe("This move develops the knight to a good square.");
  });

  it("should strip display links", () => {
    const wikitext = "The [[Sicilian Defense|Sicilian]] is a popular opening.";
    const result = extractProseFromWikitext(wikitext);
    expect(result).toBe("The Sicilian is a popular opening.");
  });

  it("should strip templates", () => {
    const wikitext = "{{Chess diagram}} This is a good move.";
    const result = extractProseFromWikitext(wikitext);
    expect(result).toBe("This is a good move.");
  });

  it("should strip section headers", () => {
    const wikitext = "== Overview ==\nThis is a classical opening.";
    const result = extractProseFromWikitext(wikitext);
    expect(result).toBe("This is a classical opening.");
  });

  it("should strip HTML tags", () => {
    const wikitext = "<ref>Some reference</ref>This is the text.";
    const result = extractProseFromWikitext(wikitext);
    expect(result).toBe("This is the text.");
  });

  it("should strip bold/italic markers", () => {
    const wikitext = "'''e4''' is a ''strong'' move.";
    const result = extractProseFromWikitext(wikitext);
    expect(result).toBe("e4 is a strong move.");
  });

  it("should strip category links", () => {
    const wikitext = "Good move. [[Category:Chess openings]]";
    const result = extractProseFromWikitext(wikitext);
    expect(result).toBe("Good move.");
  });

  it("should handle empty input", () => {
    expect(extractProseFromWikitext("")).toBe("");
  });

  it("should strip external links keeping display text", () => {
    const wikitext = "See [https://example.com this site] for more.";
    const result = extractProseFromWikitext(wikitext);
    expect(result).toBe("See this site for more.");
  });
});

describe("extractMoveRationale", () => {
  it("should extract first sentences as rationale", () => {
    const prose =
      "This move controls the center and opens lines for the bishop. It is one of the most popular first moves in chess. White aims for rapid development.";
    const result = extractMoveRationale(prose);
    expect(result).toContain("controls the center");
    expect(result).toContain("most popular first moves");
    expect(result).toMatch(/\.$/);
  });

  it("should return empty for short/stub content", () => {
    const result = extractMoveRationale("Too short.");
    expect(result).toBe("");
  });

  it("should return empty for empty content", () => {
    const result = extractMoveRationale("");
    expect(result).toBe("");
  });

  it("should handle content with only short sentences", () => {
    const result = extractMoveRationale("A. B. C. D.");
    expect(result).toBe("");
  });
});

describe("extractStrategicTheme", () => {
  it("should detect center control theme", () => {
    const prose = "This move aims for center control and opens lines.";
    expect(extractStrategicTheme(prose)).toBe("Center control");
  });

  it("should detect development theme", () => {
    const prose =
      "This develops the knight to a natural square, preparing for rapid development of pieces.";
    expect(extractStrategicTheme(prose)).toBe("Piece development");
  });

  it("should detect king safety theme", () => {
    const prose = "Castling provides king safety and activates the rook.";
    expect(extractStrategicTheme(prose)).toBe("King safety");
  });

  it("should detect gambit theme", () => {
    const prose =
      "White offers a gambit pawn to gain quick development and attacking chances.";
    expect(extractStrategicTheme(prose)).toBe("Gambit play");
  });

  it("should detect pawn structure theme", () => {
    const prose =
      "This changes the pawn structure significantly, creating an isolated pawn.";
    expect(extractStrategicTheme(prose)).toBe("Pawn structure");
  });

  it("should detect attack theme", () => {
    const prose =
      "White launches an aggressive attack against the enemy king position.";
    expect(extractStrategicTheme(prose)).toBe("Attacking play");
  });

  it("should return empty for stub content", () => {
    expect(extractStrategicTheme("Short.")).toBe("");
  });

  it("should return empty for content without matching themes", () => {
    const prose =
      "This move is one of several options in this position that players can choose from.";
    expect(extractStrategicTheme(prose)).toBe("");
  });
});
