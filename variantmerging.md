# Variant Merging: Kurze Varianten verlängern

## Problem

Von 3641 Varianten in 146 Eröffnungen enden **1886 Varianten** mit weniger als 12 Halbzügen (6 vollständige Züge). Das sind **Sackgassen** — der Baum endet abrupt, obwohl die Eröffnung eigentlich weitergeht.

### Ursache

Die Lichess-TSV-Dateien (`scripts/data/a.tsv` bis `e.tsv`) liefern nur die **Namensgebungszüge** jeder Variante — also genau die Züge, die die Variante identifizieren. Danach hören die Daten auf, obwohl die Theorie natürlich weitergeht.

### Bereits versuchte Lösungen

1. **Cross-Opening Enrichment** (`enrichTreeWithRelatedPgns()` in `scripts/compile-opening-data.ts`): Versucht, kurze Varianten mit längeren PGNs anderer Eröffnungen zu verlängern, die den gleichen Prefix haben. Hat die Situation etwas verbessert, reicht aber nicht.

2. **Main Line Extension** (`extendMainLine()` in `scripts/build-move-trees.ts`): Wählt automatisch den tiefsten Teilbaum als Hauptlinie. Hilft nur bei der Main-Line-Markierung, nicht bei fehlenden Zügen.

## Detaillierte Aufschlüsselung der kurzen Varianten

### Nach Importance (Wichtigkeit der Eröffnung)

| Importance    | Kurze Varianten | Beispiele                                                 |
| ------------- | --------------- | --------------------------------------------------------- |
| 3 (essential) | **641**         | Sizilianisch, Französisch, Ruy Lopez, Englisch, Caro-Kann |
| 2 (important) | **637**         | Königsgambit, Skandinavisch, Wiener Partie                |
| 1 (niche)     | **608**         | Nimzowitsch-Verteidigung, Zukertort, Queen's Pawn Game    |

### Nach Tiefe (Halbzüge)

| Halbzüge | Anzahl | Beschreibung                   |
| -------- | ------ | ------------------------------ |
| 1-3      | 113    | Extrem kurz, nur 1-2 Züge      |
| 4-5      | 331    | Sehr kurz, ca. 2-3 Züge        |
| 6-7      | 508    | Kurz, ca. 3-4 Züge             |
| 8-9      | 472    | Knapp unter Ziel               |
| 10-11    | 462    | Nur 1-2 Züge unter Ziel von 12 |

### Top-Eröffnungen mit den meisten kurzen Varianten

| Datei                       | Kurz/Total | Importance |
| --------------------------- | ---------- | ---------- |
| sicilian-defense.json       | 150/376    | 3          |
| english-opening.json        | 95/164     | 3          |
| french-defense.json         | 93/211     | 3          |
| ruy-lopez.json              | 80/231     | 3          |
| kings-gambit-accepted.json  | 66/137     | 2          |
| caro-kann-defense.json      | 64/104     | 3          |
| queens-gambit-declined.json | 60/165     | 3          |
| queens-pawn-game.json       | 51/59      | 1          |
| indian-defense.json         | 45/52      | 1          |
| zukertort-opening.json      | 44/47      | 1          |
| italian-game.json           | 42/181     | 3          |
| dutch-defense.json          | 41/68      | 2          |

### Endknoten-Analyse

Alle 1886 kurzen Varianten enden als **echte Blätter** (0 Kinder). Der Baum hat dort schlicht keine weiteren Daten.

### Beispiele extrem kurzer wichtiger Varianten

```
[2 HZ] Bird Opening: Hobbs Gambit (f4 g5)
[2 HZ] English Opening: Anglo-Lithuanian Variation (c4 Nc6)
[2 HZ] English Opening: Jaenisch Gambit (c4 b5)
[3 HZ] Caro-Kann Defense: Euwe Attack (e4 c6 b3)
[3 HZ] Sicilian Defense: mehrere Varianten mit nur 3 HZ
[3 HZ] French Defense: Advance Variation (e4 e6 d4)
```

## Lösungsansatz: Externe Daten

Die TSV-Daten alleine reichen nicht. Folgende externe Quellen könnten die Varianten verlängern:

### Option 1: Lichess Opening Explorer API (empfohlen)

```
GET https://explorer.lichess.ovh/lichess?fen=<FEN>&speeds=rapid,classical&ratings=2000,2200,2500
```

- Liefert die häufigsten Züge mit Statistiken (Gewinnrate, Anzahl Partien)
- Für jeden Blattknoten: API abfragen, Top-2-3 Züge als Fortsetzungen einfügen
- Iterativ vertiefen bis Zieltiefe 12 erreicht
- **Vorteil**: Echte Praxis-Daten, zeigt was tatsächlich gespielt wird
- **Nachteil**: Viele API-Calls nötig (Rate Limiting beachten), nur HTTP-Zugriff

### Option 2: Lichess Masters Database

```
GET https://explorer.lichess.ovh/masters?fen=<FEN>
```

- Nur Meisterpartien (höhere Qualität)
- Weniger Daten für seltene Varianten

### Option 3: Opening Book Dateien (z.B. Polyglot)

- Offline-Lösung, kein API-Zugriff nötig
- Braucht Parser für das Binärformat

### Option 4: Stockfish/Engine-Analyse

- Beste Züge laut Engine
- Overkill für Eröffnungstrainer, langsam

## Vorgeschlagene Implementierung

### Neues Script: `scripts/extend-variants.ts`

```typescript
// Pseudo-Code
async function extendVariants(opening: Opening, targetDepth: number = 12) {
  for (const variation of opening.variations) {
    const leaves = findShortLeaves(variation.moves, targetDepth);
    for (const leaf of leaves) {
      const fen = leaf.fen;
      const explorerData = await fetchLichessExplorer(fen);
      // Top-Züge als Kinder einfügen
      // Ersten Zug als isMainLine markieren
      // Rekursiv vertiefen bis targetDepth erreicht
    }
  }
}
```

### Integration in Pipeline

In `scripts/compile-opening-data.ts` nach `enrichTreeWithRelatedPgns()` aber vor `annotateMoveTreeWithContext()`:

1. `enrichTreeWithRelatedPgns()` — bestehende Cross-Referenz
2. **NEU**: `extendVariantsWithExplorer()` — Lichess API für verbleibende kurze Blätter
3. `annotateMoveTreeWithContext()` — Annotationen generieren (auch für neue Züge)

### Rate Limiting

- Lichess API: max 1 Request/Sekunde ohne Auth
- Bei 1886 Blättern × ~3 Iterationen = ~5600 Requests ≈ 90 Minuten
- Caching der API-Responses in `scripts/data/explorer-cache/` empfohlen
- Inkrementell: Nur fehlende FENs nachfragen

## Relevante Dateien

| Datei                             | Beschreibung                                                        |
| --------------------------------- | ------------------------------------------------------------------- |
| `scripts/compile-opening-data.ts` | Master-Pipeline, hier wird `enrichTreeWithRelatedPgns()` aufgerufen |
| `scripts/build-move-trees.ts`     | `buildMoveTree()`, `mergeMoveSequence()`, `extendMainLine()`        |
| `scripts/parse-openings.ts`       | TSV-Parsing, Varianten-Gruppierung                                  |
| `scripts/generate-annotations.ts` | Template-basierte Annotationen                                      |
| `src/types/OpeningTypes.ts`       | `MoveNode`, `Opening`, `Variation` Typen                            |
| `scripts/data/a.tsv` bis `e.tsv`  | Rohdaten von Lichess (Quelle des Problems)                          |
| `public/openings/*.json`          | Generierte Eröffnungsdateien (146 Stück)                            |
| `src/data/openingCatalog.json`    | Katalog-Metadaten (gebundelt mit App)                               |

## Datenstruktur: MoveNode

```typescript
type MoveNode = {
  move: string; // SAN: "e4", "Nf3", "O-O"
  fen: string; // FEN nach diesem Zug
  annotation?: Annotation;
  children: MoveNode[]; // Fortsetzungen/Varianten
  isMainLine: boolean; // Hauptlinie markiert
};
```

## Ziel

- Mindestens **12 Halbzüge** Hauptlinie pro Variante
- Importance-3-Eröffnungen priorisieren (641 Varianten)
- Neue Züge korrekt annotieren (source: "explorer" oder "generated")
- Bestehende Tree-Merge-Logik (`mergeMoveSequence()`) wiederverwenden

## Status

- [x] Problem analysiert und quantifiziert
- [x] Bestehende Cross-Opening-Enrichment implementiert (hilft teilweise)
- [x] Main-Line-Extension implementiert (wählt tiefsten Pfad)
- [ ] Lichess Explorer API Integration
- [ ] Explorer-Cache für inkrementelle Updates
- [ ] Varianten auf Zieltiefe 12 verlängern
- [ ] Annotationen für neue Züge generieren
- [ ] Pipeline-Integration und Tests
