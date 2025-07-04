// Dynamic configuration service using keyv

import KeyvSqlite from "@keyv/sqlite";
import Keyv from "keyv";
import { IConfigService } from "../interfaces/services.js";
import {
  ChannelConfig,
  CONFIG_KEYS,
  GuildConfig,
  MessageLimitStrategy,
} from "../types/index.js";
import { CACHE_TTL, DEFAULTS } from "../utils/constants.js";
import { ConfigurationError } from "../utils/errors.js";
import { configLogger as logger } from "../utils/logger.js";

export class ConfigService implements IConfigService {
  private keyv: Keyv;

  constructor(databaseUrl: string = "sqlite://config/bot.sqlite") {
    // Validate database URL format
    if (!databaseUrl.startsWith("sqlite://")) {
      logger.warn("Invalid database URL format, using default", {
        providedUrl: databaseUrl,
      });
      databaseUrl = "sqlite://config/bot.sqlite";
    }

    // Ensure config directory exists
    try {
      const fs = require("fs");
      const path = require("path");
      const dbPath = databaseUrl.replace("sqlite://", "");

      // Additional validation to prevent creating directories from malformed URLs
      if (dbPath && !dbPath.includes(":") && dbPath.includes("/")) {
        const configDir = path.dirname(dbPath);
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }
      }
    } catch (error) {
      logger.warn("Failed to create database directory", error);
      // Directory creation failed, continue with default initialization
    }

    // Initialize Keyv with SQLite adapter
    const sqliteAdapter = new KeyvSqlite(databaseUrl);
    this.keyv = new Keyv({ store: sqliteAdapter });

    this.keyv.on("error", (err) => {
      logger.error("Keyv connection error:", err);
    });
  }

  async initialize(): Promise<void> {
    try {
      // Test the connection
      await this.keyv.set("test", "test", 1000);
      await this.keyv.delete("test");
      logger.info("ConfigService initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize ConfigService", error);
      throw new ConfigurationError("Failed to initialize database connection");
    }
  }

  // Guild configuration methods
  async getGuildConfig(guildId: string): Promise<GuildConfig> {
    const config: Partial<GuildConfig> = {};

    // Get all guild settings
    config.mention_enabled =
      (await this.keyv.get(CONFIG_KEYS.GUILD.MENTION_ENABLED(guildId))) ??
      DEFAULTS.GUILD.MENTION_ENABLED;

    const storedChannels = await this.keyv.get(
      CONFIG_KEYS.GUILD.RESPONSE_CHANNELS(guildId)
    );
    config.response_channels = storedChannels
      ? [...storedChannels]
      : [...DEFAULTS.GUILD.RESPONSE_CHANNELS];
    config.search_enabled =
      (await this.keyv.get(CONFIG_KEYS.GUILD.SEARCH_ENABLED(guildId))) ??
      DEFAULTS.GUILD.SEARCH_ENABLED;
    config.server_prompt =
      (await this.keyv.get(CONFIG_KEYS.GUILD.SERVER_PROMPT(guildId))) ??
      undefined;
    config.message_limit_strategy =
      (await this.keyv.get(
        CONFIG_KEYS.GUILD.MESSAGE_LIMIT_STRATEGY(guildId)
      )) ?? DEFAULTS.GUILD.MESSAGE_LIMIT_STRATEGY;

    return config as GuildConfig;
  }

  async setGuildConfig(
    guildId: string,
    config: Partial<GuildConfig>
  ): Promise<void> {
    const promises: Promise<boolean>[] = [];

    if (config.mention_enabled !== undefined) {
      promises.push(
        this.keyv.set(
          CONFIG_KEYS.GUILD.MENTION_ENABLED(guildId),
          config.mention_enabled
        )
      );
    }
    if (config.response_channels !== undefined) {
      promises.push(
        this.keyv.set(
          CONFIG_KEYS.GUILD.RESPONSE_CHANNELS(guildId),
          config.response_channels
        )
      );
    }
    if (config.search_enabled !== undefined) {
      promises.push(
        this.keyv.set(
          CONFIG_KEYS.GUILD.SEARCH_ENABLED(guildId),
          config.search_enabled
        )
      );
    }
    if (config.server_prompt !== undefined) {
      promises.push(
        this.keyv.set(
          CONFIG_KEYS.GUILD.SERVER_PROMPT(guildId),
          config.server_prompt
        )
      );
    }
    if (config.message_limit_strategy !== undefined) {
      promises.push(
        this.keyv.set(
          CONFIG_KEYS.GUILD.MESSAGE_LIMIT_STRATEGY(guildId),
          config.message_limit_strategy
        )
      );
    }

    await Promise.all(promises);
    logger.debug(`Updated guild config for ${guildId}`, config);
  }

  // Channel configuration methods
  async getChannelConfig(channelId: string): Promise<ChannelConfig> {
    const channelPrompt = await this.keyv.get(
      CONFIG_KEYS.CHANNEL.CHANNEL_PROMPT(channelId)
    );
    return {
      channel_prompt: channelPrompt,
    };
  }

  async setChannelConfig(
    channelId: string,
    config: Partial<ChannelConfig>
  ): Promise<void> {
    if (config.channel_prompt !== undefined) {
      await this.keyv.set(
        CONFIG_KEYS.CHANNEL.CHANNEL_PROMPT(channelId),
        config.channel_prompt
      );
      logger.debug(`Updated channel config for ${channelId}`, config);
    }
  }

  // Mention and response settings
  async isMentionEnabled(guildId: string): Promise<boolean> {
    const enabled = await this.keyv.get(
      CONFIG_KEYS.GUILD.MENTION_ENABLED(guildId)
    );
    return enabled ?? DEFAULTS.GUILD.MENTION_ENABLED;
  }

  async isResponseChannel(
    guildId: string,
    channelId: string
  ): Promise<boolean> {
    const channels =
      (await this.keyv.get(CONFIG_KEYS.GUILD.RESPONSE_CHANNELS(guildId))) ?? [];
    return channels.includes(channelId);
  }

  // Search settings
  async isSearchEnabled(guildId: string): Promise<boolean> {
    const enabled = await this.keyv.get(
      CONFIG_KEYS.GUILD.SEARCH_ENABLED(guildId)
    );
    return enabled ?? DEFAULTS.GUILD.SEARCH_ENABLED;
  }

  async getSearchUsage(): Promise<number> {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const usage = await this.keyv.get(
      CONFIG_KEYS.SEARCH.MONTHLY_USAGE(currentMonth)
    );
    return usage ?? 0;
  }

  async incrementSearchUsage(): Promise<void> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const key = CONFIG_KEYS.SEARCH.MONTHLY_USAGE(currentMonth);
    const currentUsage = await this.getSearchUsage();

    await this.keyv.set(key, currentUsage + 1, CACHE_TTL.SEARCH_USAGE);
    logger.debug(
      `Search usage incremented to ${currentUsage + 1} for ${currentMonth}`
    );
  }

  // Debug method to reset search usage for testing
  async resetSearchUsage(): Promise<void> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const key = CONFIG_KEYS.SEARCH.MONTHLY_USAGE(currentMonth);

    await this.keyv.delete(key);
    logger.info(`Search usage reset for ${currentMonth}`);
  }

  // Statistics methods
  async getStats(availableModels?: string[]): Promise<any> {
    const stats: any = {};

    stats.total_requests =
      (await this.keyv.get(CONFIG_KEYS.STATS.TOTAL_REQUESTS)) ?? 0;
    stats.search_usage =
      (await this.keyv.get(CONFIG_KEYS.STATS.SEARCH_USAGE)) ?? 0;
    stats.total_startups =
      (await this.keyv.get(CONFIG_KEYS.STATS.TOTAL_STARTUPS)) ?? 0;
    stats.current_guilds =
      (await this.keyv.get(CONFIG_KEYS.STATS.CURRENT_GUILDS)) ?? 0;

    // Get model usage stats dynamically
    const modelUsage: Record<string, number> = {};

    // If no models provided, check a minimal set of common models
    const modelsToCheck = availableModels || [
      "gemini-2.5-flash-preview-05-20",
      "gemini-2.0-flash",
    ];

    for (const model of modelsToCheck) {
      const usage =
        (await this.keyv.get(CONFIG_KEYS.STATS.MODEL_USAGE(model))) ?? 0;
      if (usage > 0) {
        modelUsage[model] = usage;
      }
    }

    stats.model_usage = modelUsage;

    return stats;
  }

  async incrementStats(key: string, value: number = 1): Promise<void> {
    let statKey: string;

    switch (key) {
      case "total_requests":
        statKey = CONFIG_KEYS.STATS.TOTAL_REQUESTS;
        break;
      case "search_usage":
        statKey = CONFIG_KEYS.STATS.SEARCH_USAGE;
        break;
      case "total_startups":
        statKey = CONFIG_KEYS.STATS.TOTAL_STARTUPS;
        break;
      case "current_guilds":
        statKey = CONFIG_KEYS.STATS.CURRENT_GUILDS;
        break;
      default:
        if (key.startsWith("model_usage:")) {
          const model = key.replace("model_usage:", "");
          statKey = CONFIG_KEYS.STATS.MODEL_USAGE(model);
        } else {
          logger.warn(`Unknown stat key: ${key}`);
          return;
        }
    }

    logger.info(`Incrementing stat ${key} by ${value}`, {
      statKey,
      originalKey: key,
    });

    const currentValue = (await this.keyv.get(statKey)) ?? 0;
    await this.keyv.set(statKey, currentValue + value);

    const newValue = currentValue + value;
    logger.info(`Stat ${key} incremented successfully`, {
      statKey,
      oldValue: currentValue,
      increment: value,
      newValue,
    });
  }

  // Cleanup old data
  async cleanup(): Promise<void> {
    try {
      logger.info("Starting configuration cleanup...");

      // Note: With keyv TTL, expired keys are automatically cleaned up
      // This method is mainly for manual cleanup if needed

      logger.info("Configuration cleanup completed");
    } catch (error) {
      logger.error("Failed to cleanup configuration", error);
    }
  }

  // Helper method to get message limit strategy for a guild
  async getMessageLimitStrategy(
    guildId: string
  ): Promise<MessageLimitStrategy> {
    const strategy = await this.keyv.get(
      CONFIG_KEYS.GUILD.MESSAGE_LIMIT_STRATEGY(guildId)
    );
    return strategy ?? DEFAULTS.GUILD.MESSAGE_LIMIT_STRATEGY;
  }

  // Helper method to get all response channels for a guild
  async getResponseChannels(guildId: string): Promise<string[]> {
    const channels = await this.keyv.get(
      CONFIG_KEYS.GUILD.RESPONSE_CHANNELS(guildId)
    );
    // Always return a new array to prevent mutation of defaults
    return channels ? [...channels] : [...DEFAULTS.GUILD.RESPONSE_CHANNELS];
  }

  // Helper method to add a response channel
  async addResponseChannel(guildId: string, channelId: string): Promise<void> {
    const channels = await this.getResponseChannels(guildId);
    if (!channels.includes(channelId)) {
      // Create a new array to avoid mutating the default array
      const updatedChannels = [...channels, channelId];
      await this.keyv.set(
        CONFIG_KEYS.GUILD.RESPONSE_CHANNELS(guildId),
        updatedChannels
      );
      logger.info(`Added response channel ${channelId} for guild ${guildId}`);
    }
  }

  // Helper method to remove a response channel
  async removeResponseChannel(
    guildId: string,
    channelId: string
  ): Promise<void> {
    const channels = await this.getResponseChannels(guildId);
    const filtered = channels.filter((ch) => ch !== channelId);
    if (filtered.length !== channels.length) {
      await this.keyv.set(
        CONFIG_KEYS.GUILD.RESPONSE_CHANNELS(guildId),
        filtered
      );
      logger.info(`Removed response channel ${channelId} for guild ${guildId}`);
    }
  }

  // Clear all settings for a guild (useful when bot leaves a server)
  async clearGuildSettings(guildId: string): Promise<void> {
    const keys = [
      CONFIG_KEYS.GUILD.MENTION_ENABLED(guildId),
      CONFIG_KEYS.GUILD.RESPONSE_CHANNELS(guildId),
      CONFIG_KEYS.GUILD.SEARCH_ENABLED(guildId),
      CONFIG_KEYS.GUILD.SERVER_PROMPT(guildId),
      CONFIG_KEYS.GUILD.MESSAGE_LIMIT_STRATEGY(guildId),
      CONFIG_KEYS.GUILD.PREFERRED_MODEL(guildId),
    ];

    // Delete keys one by one to ensure each is properly cleared
    for (const key of keys) {
      const deleted = await this.keyv.delete(key);
      logger.debug(`Deleted key ${key}: ${deleted}`);
    }

    logger.info(`Cleared all settings for guild ${guildId}`);
  }

  // Rate limiting helper methods
  async getRateLimitValue(key: string): Promise<number> {
    return (await this.keyv.get(key)) ?? 0;
  }

  async setRateLimitValue(
    key: string,
    value: number,
    ttl?: number
  ): Promise<void> {
    await this.keyv.set(key, value, ttl);
  }

  async hasRateLimitKey(key: string): Promise<boolean> {
    return await this.keyv.has(key);
  }

  async deleteRateLimitKey(key: string): Promise<boolean> {
    return await this.keyv.delete(key);
  }

  async setRateLimitString(
    key: string,
    value: string,
    ttl?: number
  ): Promise<void> {
    await this.keyv.set(key, value, ttl);
  }

  // Direct stats setting (for values that should be overwritten, not incremented)
  async setStat(key: string, value: number): Promise<void> {
    let statKey: string;

    switch (key) {
      case "current_guilds":
        statKey = CONFIG_KEYS.STATS.CURRENT_GUILDS;
        break;
      default:
        logger.warn(`Unsupported setStat key: ${key}`);
        return;
    }

    await this.keyv.set(statKey, value);
    logger.debug(`Stat ${key} set to ${value}`);
  }

  // Model preferences
  async getPreferredModel(guildId: string): Promise<string | null> {
    try {
      const preferredModel = await this.keyv.get(
        CONFIG_KEYS.GUILD.PREFERRED_MODEL(guildId)
      );
      return preferredModel || null;
    } catch (error) {
      logger.error(
        `Failed to get preferred model for guild ${guildId}:`,
        error
      );
      return null;
    }
  }

  async setPreferredModel(guildId: string, model: string): Promise<void> {
    try {
      await this.keyv.set(CONFIG_KEYS.GUILD.PREFERRED_MODEL(guildId), model);
      logger.info(`Set preferred model for guild ${guildId} to ${model}`);
    } catch (error) {
      logger.error(
        `Failed to set preferred model for guild ${guildId}:`,
        error
      );
      throw new ConfigurationError("Failed to set preferred model");
    }
  }
}
