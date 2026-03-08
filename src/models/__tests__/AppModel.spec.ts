import { describe, it, expect } from "vitest";
import { AppModel } from "../AppModel";

describe("AppModel", () => {
  describe("initial state", () => {
    it("should have null currentMode", () => {
      const model = new AppModel();
      expect(model.currentMode).toBeNull();
    });

    it("should have null selectedOpeningId", () => {
      const model = new AppModel();
      expect(model.selectedOpeningId).toBeNull();
    });

    it("should have null selectedVariationId", () => {
      const model = new AppModel();
      expect(model.selectedVariationId).toBeNull();
    });

    it("should default playerColor to white", () => {
      const model = new AppModel();
      expect(model.playerColor).toBe("w");
    });
  });

  describe("setMode", () => {
    it("should set current mode to learn", () => {
      const model = new AppModel();
      model.setMode("learn");
      expect(model.currentMode).toBe("learn");
    });

    it("should set current mode to memorize", () => {
      const model = new AppModel();
      model.setMode("memorize");
      expect(model.currentMode).toBe("memorize");
    });

    it("should set current mode to play", () => {
      const model = new AppModel();
      model.setMode("play");
      expect(model.currentMode).toBe("play");
    });

    it("should set current mode to null", () => {
      const model = new AppModel();
      model.setMode("learn");
      model.setMode(null);
      expect(model.currentMode).toBeNull();
    });
  });

  describe("selectOpening", () => {
    it("should set selectedOpeningId", () => {
      const model = new AppModel();
      model.selectOpening("sicilian-defense");
      expect(model.selectedOpeningId).toBe("sicilian-defense");
    });

    it("should set selectedVariationId when provided", () => {
      const model = new AppModel();
      model.selectOpening("sicilian-defense", "najdorf");
      expect(model.selectedOpeningId).toBe("sicilian-defense");
      expect(model.selectedVariationId).toBe("najdorf");
    });

    it("should clear selectedVariationId when not provided", () => {
      const model = new AppModel();
      model.selectOpening("sicilian-defense", "najdorf");
      model.selectOpening("french-defense");
      expect(model.selectedOpeningId).toBe("french-defense");
      expect(model.selectedVariationId).toBeNull();
    });
  });

  describe("setPlayerColor", () => {
    it("should set player color to black", () => {
      const model = new AppModel();
      model.setPlayerColor("b");
      expect(model.playerColor).toBe("b");
    });

    it("should set player color to white", () => {
      const model = new AppModel();
      model.setPlayerColor("b");
      model.setPlayerColor("w");
      expect(model.playerColor).toBe("w");
    });
  });

  describe("resetSelection", () => {
    it("should clear selectedOpeningId and selectedVariationId", () => {
      const model = new AppModel();
      model.selectOpening("sicilian-defense", "najdorf");
      model.resetSelection();
      expect(model.selectedOpeningId).toBeNull();
      expect(model.selectedVariationId).toBeNull();
    });

    it("should not affect currentMode or playerColor", () => {
      const model = new AppModel();
      model.setMode("learn");
      model.setPlayerColor("b");
      model.selectOpening("sicilian-defense");
      model.resetSelection();
      expect(model.currentMode).toBe("learn");
      expect(model.playerColor).toBe("b");
    });
  });
});
