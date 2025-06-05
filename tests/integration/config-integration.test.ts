import { join } from "path";
import { ConfigService } from "../../src/services/config";
import { ConfigManager } from "../../src/services/configManager";

describe("Configuration Integration Tests", () => {
  let configManager: ConfigManager;
  let configService: ConfigService;
  const testConfigDir = join(__dirname, "../fixtures/config");
  const testPrefix = `test-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  beforeAll(async () => {
    // Initialize configuration manager with test config
    configManager = new ConfigManager(testConfigDir);
    await configManager.loadConfig();

    // Initialize config service with test database
    configService = new ConfigService(
      "sqlite://tests/fixtures/test-integration.sqlite"
    );
    await configService.initialize();
  });

  afterAll(async () => {
    // Cleanup test database if needed
    await configService.cleanup();
  });

  describe("YAML and keyv configuration integration", () => {
    it("should combine static and dynamic configurations correctly", async () => {
      // Get static configuration from YAML
      const basePrompt = configManager.getBaseSystemPrompt();
      const responseStrategy = configManager.getResponseStrategy();

      expect(basePrompt).toContain("Test system prompt");
      expect(responseStrategy).toBe("compress");

      // Set dynamic configuration in keyv
      await configService.setGuildConfig(`${testPrefix}-guild`, {
        mention_enabled: false,
        search_enabled: true,
        message_limit_strategy: "split",
      });

      // Verify dynamic configuration is stored and retrieved
      const guildConfig = await configService.getGuildConfig(
        `${testPrefix}-guild`
      );
      expect(guildConfig.mention_enabled).toBe(false);
      expect(guildConfig.search_enabled).toBe(true);
      expect(guildConfig.message_limit_strategy).toBe("split");

      // Verify static config remains unchanged
      expect(configManager.getResponseStrategy()).toBe("compress");

      // Cleanup
      await configService.clearGuildSettings(`${testPrefix}-guild`);
    });

    it("should handle function declarations from YAML correctly", async () => {
      const searchFunction = configManager.getSearchFunctionDeclaration();
      const characterCountFunction =
        configManager.getCharacterCountFunctionDeclaration();

      // Verify search function declaration
      expect(searchFunction.functionDeclarations).toHaveLength(1);
      expect(searchFunction.functionDeclarations![0].name).toBe("search_web");
      expect(searchFunction.functionDeclarations![0].description).toBeDefined();

      // Verify character count function declaration
      expect(characterCountFunction.functionDeclarations).toHaveLength(1);
      expect(characterCountFunction.functionDeclarations![0].name).toBe(
        "count_characters"
      );
      expect(
        characterCountFunction.functionDeclarations![0].description
      ).toBeDefined();
    });

    it("should handle guild and channel configuration hierarchy", async () => {
      const guildId = `${testPrefix}-guild-hierarchy`;
      const channelId = `${testPrefix}-channel-hierarchy`;

      // Set guild-level configuration
      await configService.setGuildConfig(guildId, {
        mention_enabled: true,
        response_channels: [channelId],
        search_enabled: false,
      });

      // Set channel-level configuration
      await configService.setChannelConfig(channelId, {
        channel_prompt: "Custom channel prompt for testing",
      });

      // Verify configurations are stored correctly
      const guildConfig = await configService.getGuildConfig(guildId);
      const channelConfig = await configService.getChannelConfig(channelId);

      expect(guildConfig.mention_enabled).toBe(true);
      expect(guildConfig.response_channels).toContain(channelId);
      expect(guildConfig.search_enabled).toBe(false);

      expect(channelConfig.channel_prompt).toBe(
        "Custom channel prompt for testing"
      );

      // Verify helper methods work correctly
      expect(await configService.isMentionEnabled(guildId)).toBe(true);
      expect(await configService.isResponseChannel(guildId, channelId)).toBe(
        true
      );
      expect(await configService.isSearchEnabled(guildId)).toBe(false);

      // Cleanup
      await configService.clearGuildSettings(guildId);
    });

    it("should manage response channels correctly", async () => {
      const guildId = `${testPrefix}-guild-channels`;
      const channel1 = "channel-1";
      const channel2 = "channel-2";
      const channel3 = "channel-3";

      // Start with empty channels
      let guildConfig = await configService.getGuildConfig(guildId);
      expect(guildConfig.response_channels).toHaveLength(0);

      // Add channels one by one
      await configService.addResponseChannel(guildId, channel1);
      await configService.addResponseChannel(guildId, channel2);

      guildConfig = await configService.getGuildConfig(guildId);
      expect(guildConfig.response_channels).toHaveLength(2);
      expect(guildConfig.response_channels).toContain(channel1);
      expect(guildConfig.response_channels).toContain(channel2);

      // Try to add duplicate channel (should not add)
      await configService.addResponseChannel(guildId, channel1);
      guildConfig = await configService.getGuildConfig(guildId);
      expect(guildConfig.response_channels).toHaveLength(2);

      // Remove a channel
      await configService.removeResponseChannel(guildId, channel1);
      guildConfig = await configService.getGuildConfig(guildId);
      expect(guildConfig.response_channels).toHaveLength(1);
      expect(guildConfig.response_channels).not.toContain(channel1);
      expect(guildConfig.response_channels).toContain(channel2);

      // Try to remove non-existent channel (should not error)
      await configService.removeResponseChannel(guildId, channel3);
      guildConfig = await configService.getGuildConfig(guildId);
      expect(guildConfig.response_channels).toHaveLength(1);

      // Cleanup: Clear all settings for this test
      await configService.clearGuildSettings(guildId);
    });

    it("should handle statistics and usage tracking", async () => {
      // Test search usage tracking
      const initialUsage = await configService.getSearchUsage();

      await configService.incrementSearchUsage();
      await configService.incrementSearchUsage();
      await configService.incrementSearchUsage();

      const updatedUsage = await configService.getSearchUsage();
      expect(updatedUsage).toBe(initialUsage + 3);

      // Test general statistics
      await configService.incrementStats("total_requests", 5);
      await configService.incrementStats("model_usage:gemini-2.0-flash", 10);

      const stats = await configService.getStats();
      expect(stats.total_requests).toBeGreaterThanOrEqual(5);
      expect(stats.model_usage["gemini-2.0-flash"]).toBeGreaterThanOrEqual(10);
    });

    it("should clear guild settings completely", async () => {
      const guildId = `test-guild-cleanup-${Date.now()}-${Math.random().toString(
        36
      )}`;

      // Set various guild configurations
      await configService.setGuildConfig(guildId, {
        mention_enabled: false,
        response_channels: ["channel1", "channel2"],
        search_enabled: true,
        server_prompt: "Test server prompt",
        message_limit_strategy: "split",
      });

      // Verify configurations are set
      let guildConfig = await configService.getGuildConfig(guildId);
      expect(guildConfig.mention_enabled).toBe(false);
      expect(guildConfig.response_channels).toHaveLength(2);
      expect(guildConfig.search_enabled).toBe(true);
      expect(guildConfig.server_prompt).toBe("Test server prompt");
      expect(guildConfig.message_limit_strategy).toBe("split");

      // Clear all guild settings
      await configService.clearGuildSettings(guildId);

      // Verify all settings are reset to defaults
      guildConfig = await configService.getGuildConfig(guildId);
      expect(guildConfig.mention_enabled).toBe(true); // Default
      expect(guildConfig.response_channels).toHaveLength(0); // Default
      expect(guildConfig.search_enabled).toBe(true); // Default
      expect(guildConfig.server_prompt).toBeUndefined(); // Default
      expect(guildConfig.message_limit_strategy).toBe("compress"); // Default
    });
  });

  describe("Configuration reloading and persistence", () => {
    it("should reload YAML configuration without affecting keyv data", async () => {
      const guildId = `${testPrefix}-guild-persistence`;

      // Set some keyv data
      await configService.setGuildConfig(guildId, {
        mention_enabled: false,
        search_enabled: false,
      });

      // Get initial configurations
      const initialYamlPrompt = configManager.getBaseSystemPrompt();
      const initialKeyvConfig = await configService.getGuildConfig(guildId);

      // Reload YAML configuration
      await configManager.reloadConfig();

      // Verify YAML config is reloaded (should be same in test)
      const reloadedYamlPrompt = configManager.getBaseSystemPrompt();
      expect(reloadedYamlPrompt).toBe(initialYamlPrompt);

      // Verify keyv data persists
      const persistedKeyvConfig = await configService.getGuildConfig(guildId);
      expect(persistedKeyvConfig.mention_enabled).toBe(
        initialKeyvConfig.mention_enabled
      );
      expect(persistedKeyvConfig.search_enabled).toBe(
        initialKeyvConfig.search_enabled
      );
    });
  });
});
