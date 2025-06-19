/**
 * Tests for model utility functions
 */

import { describe, expect, it } from "bun:test";
import {
  createModelChoices,
  getModelDisplayName,
  isValidModel,
} from "../../../src/utils/modelUtils.js";

describe("Model Utilities", () => {
  describe("getModelDisplayName", () => {
    it("should auto-generate display names from model IDs", () => {
      expect(getModelDisplayName("gemini-2.5-flash")).toBe("Gemini 2.5 Flash");
      expect(getModelDisplayName("gemini-2.0-flash")).toBe("Gemini 2.0 Flash");
      expect(getModelDisplayName("gemini-1.5-pro")).toBe("Gemini 1.5 Pro");
    });

    it("should handle special cases and preview versions", () => {
      expect(getModelDisplayName("gemini-2.5-flash-lite-preview-06-17")).toBe(
        "Gemini 2.5 Flash Lite Preview"
      );
      expect(getModelDisplayName("gemini-1.0-beta-test")).toBe(
        "Gemini 1.0 Beta"
      );
      expect(getModelDisplayName("gemini-3.0-alpha-experimental")).toBe(
        "Gemini 3.0 Alpha"
      );
    });

    it("should use display name overrides when provided", () => {
      const overrides = {
        "gemini-2.5-flash": "Super Fast Gemini",
        "gemini-2.0-flash": "Classic Gemini",
      };

      expect(getModelDisplayName("gemini-2.5-flash", overrides)).toBe(
        "Super Fast Gemini"
      );
      expect(getModelDisplayName("gemini-2.0-flash", overrides)).toBe(
        "Classic Gemini"
      );
      // Should fall back to auto-generation for non-overridden models
      expect(getModelDisplayName("gemini-1.5-pro", overrides)).toBe(
        "Gemini 1.5 Pro"
      );
    });

    it("should handle edge cases", () => {
      expect(getModelDisplayName("model")).toBe("Model");
      expect(getModelDisplayName("test-model-123")).toBe("Test Model 123");
      expect(getModelDisplayName("")).toBe("");
    });
  });

  describe("createModelChoices", () => {
    it("should create choices with auto-generated names", () => {
      const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
      const choices = createModelChoices(models);

      expect(choices).toEqual([
        { name: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
        { name: "Gemini 2.0 Flash", value: "gemini-2.0-flash" },
      ]);
    });

    it("should create choices with display name overrides", () => {
      const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
      const overrides = {
        "gemini-2.5-flash": "Fast Model",
        "gemini-2.0-flash": "Standard Model",
      };
      const choices = createModelChoices(models, overrides);

      expect(choices).toEqual([
        { name: "Fast Model", value: "gemini-2.5-flash" },
        { name: "Standard Model", value: "gemini-2.0-flash" },
      ]);
    });

    it("should handle empty model list", () => {
      const choices = createModelChoices([]);
      expect(choices).toEqual([]);
    });

    it("should handle mixed overrides and auto-generation", () => {
      const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];
      const overrides = {
        "gemini-2.5-flash": "Custom Name",
      };
      const choices = createModelChoices(models, overrides);

      expect(choices).toEqual([
        { name: "Custom Name", value: "gemini-2.5-flash" },
        { name: "Gemini 2.0 Flash", value: "gemini-2.0-flash" },
        { name: "Gemini 1.5 Pro", value: "gemini-1.5-pro" },
      ]);
    });
  });

  describe("isValidModel", () => {
    const availableModels = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-pro",
    ];

    it("should return true for valid models", () => {
      expect(isValidModel("gemini-2.5-flash", availableModels)).toBe(true);
      expect(isValidModel("gemini-2.0-flash", availableModels)).toBe(true);
      expect(isValidModel("gemini-1.5-pro", availableModels)).toBe(true);
    });

    it("should return false for invalid models", () => {
      expect(isValidModel("invalid-model", availableModels)).toBe(false);
      expect(isValidModel("gemini-3.0-flash", availableModels)).toBe(false);
      expect(isValidModel("", availableModels)).toBe(false);
    });

    it("should handle empty available models list", () => {
      expect(isValidModel("gemini-2.5-flash", [])).toBe(false);
    });
  });
});
