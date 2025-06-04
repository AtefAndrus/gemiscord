import { join } from "path";
import { ConfigManager } from "../../../src/services/configManager";
import { ConfigurationError } from "../../../src/utils/errors";

describe("ConfigManager", () => {
  let configManager: ConfigManager;
  const testConfigDir = join(__dirname, "../../fixtures/config");

  beforeEach(() => {
    configManager = new ConfigManager(testConfigDir);
  });

  describe("constructor", () => {
    it("should initialize with config directory", () => {
      expect(configManager).toBeInstanceOf(ConfigManager);
    });
  });

  describe("loadConfig", () => {
    it("should load configuration successfully", async () => {
      await expect(configManager.loadConfig()).resolves.not.toThrow();
    });

    it("should throw error for invalid config directory", async () => {
      const invalidConfigManager = new ConfigManager("/invalid/path");

      await expect(invalidConfigManager.loadConfig()).rejects.toThrow(
        ConfigurationError
      );
    });
  });

  describe("getConfig", () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    it("should return loaded configuration", () => {
      const config = configManager.getConfig();

      expect(config).toBeDefined();
      expect(config.prompts).toBeDefined();
      expect(config.function_calling).toBeDefined();
      expect(config.response_handling).toBeDefined();
    });

    it("should throw error when config not loaded", () => {
      const unloadedManager = new ConfigManager(testConfigDir);

      expect(() => unloadedManager.getConfig()).toThrow(
        "Configuration not loaded"
      );
    });
  });

  describe("getBaseSystemPrompt", () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    it("should return base system prompt", () => {
      const prompt = configManager.getBaseSystemPrompt();

      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(0);
      expect(prompt).toContain("Test system prompt");
    });
  });

  describe("getSearchFunctionDeclaration", () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    it("should return search function declaration", () => {
      const declaration = configManager.getSearchFunctionDeclaration();

      expect(declaration).toBeDefined();
      expect(declaration.functionDeclarations).toBeDefined();
      expect(declaration.functionDeclarations).toHaveLength(1);
      expect(declaration.functionDeclarations[0].name).toBe("search_web");
    });
  });

  describe("getCharacterCountFunctionDeclaration", () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    it("should return character count function declaration", () => {
      const declaration = configManager.getCharacterCountFunctionDeclaration();

      expect(declaration).toBeDefined();
      expect(declaration.functionDeclarations).toBeDefined();
      expect(declaration.functionDeclarations).toHaveLength(1);
      expect(declaration.functionDeclarations[0].name).toBe("count_characters");
    });
  });

  describe("getResponseStrategy", () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    it("should return response strategy", () => {
      const strategy = configManager.getResponseStrategy();

      expect(strategy).toBe("compress");
    });
  });

  describe("getModelConfig", () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    it("should return model configuration", () => {
      const modelConfig = configManager.getModelConfig("gemini-2.0-flash");

      expect(modelConfig).toBeDefined();
      expect(modelConfig.model).toBe("gemini-2.0-flash");
      expect(modelConfig.enabled).toBe(true);
      expect(modelConfig.rateLimits).toBeDefined();
      expect(modelConfig.rateLimits.rpm).toBe(15);
    });

    it("should throw error for unknown model", () => {
      expect(() => configManager.getModelConfig("unknown-model")).toThrow(
        "No configuration found for model: unknown-model"
      );
    });
  });

  describe("getCacheTTL", () => {
    beforeEach(async () => {
      await configManager.loadConfig();
    });

    it("should return cache TTL in milliseconds", () => {
      const ttl = configManager.getCacheTTL("rate_limit_rpm");

      expect(ttl).toBe(60000); // 1 minute in milliseconds
    });

    it("should return default TTL for unknown key", () => {
      const ttl = configManager.getCacheTTL("unknown_key");

      expect(ttl).toBe(3600000); // Default 60 minutes in milliseconds
    });
  });

  describe("reloadConfig", () => {
    it("should reload configuration successfully", async () => {
      await configManager.loadConfig();
      const firstPrompt = configManager.getBaseSystemPrompt();

      await configManager.reloadConfig();
      const reloadedPrompt = configManager.getBaseSystemPrompt();

      expect(reloadedPrompt).toBe(firstPrompt);
    });
  });
});
