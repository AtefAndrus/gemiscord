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
    config.response_channels =
      (await this.keyv.get(CONFIG_KEYS.GUILD.RESPONSE_CHANNELS(guildId))) ??
      DEFAULTS.GUILD.RESPONSE_CHANNELS;
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

  // Statistics methods
  async getStats(): Promise<any> {
    const stats: any = {};

    stats.total_requests =
      (await this.keyv.get(CONFIG_KEYS.STATS.TOTAL_REQUESTS)) ?? 0;
    stats.search_usage =
      (await this.keyv.get(CONFIG_KEYS.STATS.SEARCH_USAGE)) ?? 0;

    // Get model usage stats
    const modelUsage: Record<string, number> = {};
    const models = ["gemini-2.5-flash-preview-0520", "gemini-2.0-flash"];

    for (const model of models) {
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
      default:
        if (key.startsWith("model_usage:")) {
          const model = key.replace("model_usage:", "");
          statKey = CONFIG_KEYS.STATS.MODEL_USAGE(model);
        } else {
          logger.warn(`Unknown stat key: ${key}`);
          return;
        }
    }

    const currentValue = (await this.keyv.get(statKey)) ?? 0;
    await this.keyv.set(statKey, currentValue + value);
    logger.debug(
      `Stat ${key} incremented by ${value} to ${currentValue + value}`
    );
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
    return channels ?? DEFAULTS.GUILD.RESPONSE_CHANNELS;
  }

  // Helper method to add a response channel
  async addResponseChannel(guildId: string, channelId: string): Promise<void> {
    const channels = await this.getResponseChannels(guildId);
    if (!channels.includes(channelId)) {
      channels.push(channelId);
      await this.keyv.set(
        CONFIG_KEYS.GUILD.RESPONSE_CHANNELS(guildId),
        channels
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
    ];

    await Promise.all(keys.map((key) => this.keyv.delete(key)));
    logger.info(`Cleared all settings for guild ${guildId}`);
  }
}
