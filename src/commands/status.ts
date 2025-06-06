/**
 * /status command implementation
 *
 * Displays bot status, uptime, API usage statistics, and system information
 */

import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { configManager, configService } from "../bot.js";
import {
  formatBytes,
  formatUptime,
  hasAdminPermission,
  sendPermissionDenied,
} from "../handlers/interactionCreate.js";
import { logger } from "../utils/logger.js";

// Track bot start time for uptime calculation
const BOT_START_TIME = Date.now();

/**
 * Handle /status command
 */
export async function handleStatusCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  try {
    // Check permissions
    if (!hasAdminPermission(interaction)) {
      await sendPermissionDenied(interaction);
      return;
    }

    logger.info("Processing /status command", {
      userId: interaction.user.id,
      guildId: interaction.guild?.id,
    });

    // Defer reply for data gathering
    const ephemeral = configManager.getEphemeralSetting("status");
    await interaction.deferReply({ ephemeral });

    // Gather status information
    const statusData = await gatherStatusData();

    // Create embed response
    const embed = createStatusEmbed(statusData);

    // Send response
    await interaction.editReply({ embeds: [embed] });

    logger.info("/status command completed successfully");
  } catch (error) {
    logger.error("Error in /status command:", error);

    try {
      const errorMessage =
        "❌ Failed to retrieve bot status. Please try again later.";

      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        const ephemeral = configManager.getEphemeralSetting("status");
        await interaction.reply({ content: errorMessage, ephemeral });
      }
    } catch (replyError) {
      logger.error("Failed to send error response:", replyError);
    }
  }
}

/**
 * Gather comprehensive status data
 */
async function gatherStatusData(): Promise<StatusData> {
  const now = Date.now();
  const uptime = now - BOT_START_TIME;

  // System information
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  // Configuration status
  const configStatus = await getConfigurationStatus();

  // API status (mock for now - will be populated when services are integrated)
  const apiStatus = await getApiStatus();

  // Database status
  const databaseStatus = await getDatabaseStatus();

  return {
    uptime,
    memory: {
      used: memoryUsage.heapUsed,
      total: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
    configuration: configStatus,
    apis: apiStatus,
    database: databaseStatus,
    timestamp: now,
  };
}

/**
 * Get configuration system status
 */
async function getConfigurationStatus(): Promise<ConfigurationStatus> {
  try {
    const config = configManager.getConfig();

    return {
      loaded: true,
      version: "3.0.0", // Phase 3 version
      environment: process.env.NODE_ENV || "development",
      models: {
        primary: config.api?.gemini?.models?.primary || "unknown",
        fallback: config.api?.gemini?.models?.fallback || "unknown",
      },
    };
  } catch (error) {
    logger.error("Failed to get configuration status:", error);
    return {
      loaded: false,
      version: "error",
      environment: process.env.NODE_ENV || "development",
      models: {
        primary: "error",
        fallback: "error",
      },
    };
  }
}

/**
 * Get API services status
 */
async function getApiStatus(): Promise<ApiStatus> {
  // Note: This will be enhanced when service integration is complete
  return {
    gemini: {
      available: process.env.GEMINI_API_KEY ? true : false,
      currentModel: "gemini-2.5-flash-preview-0520", // Will be dynamic
      requestsToday: 0, // Will be tracked
      rateLimitStatus: "healthy",
    },
    braveSearch: {
      available: process.env.BRAVE_SEARCH_API_KEY ? true : false,
      requestsToday: 0, // Will be tracked
      quotaRemaining: 2000, // Will be dynamic
      rateLimitStatus: "healthy",
    },
  };
}

/**
 * Get database status
 */
async function getDatabaseStatus(): Promise<DatabaseStatus> {
  try {
    // Test database connectivity by getting stats
    await configService.getStats();

    return {
      connected: true,
      type: "SQLite",
      url: process.env.DATABASE_URL || "sqlite://config/bot.sqlite",
      lastCheck: Date.now(),
    };
  } catch (error) {
    logger.error("Database status check failed:", error);
    return {
      connected: false,
      type: "SQLite",
      url: "error",
      lastCheck: Date.now(),
    };
  }
}

/**
 * Create status embed
 */
function createStatusEmbed(data: StatusData): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle("🤖 Bot Status")
    .setColor(0x00ff00) // Green for healthy
    .setTimestamp(new Date(data.timestamp))
    .setFooter({ text: "Gemiscord Phase 3" });

  // System Information
  embed.addFields({
    name: "⏱️ System",
    value: [
      `**Uptime:** ${formatUptime(data.uptime)}`,
      `**Memory:** ${formatBytes(data.memory.used)} / ${formatBytes(
        data.memory.total
      )}`,
      `**Environment:** ${data.configuration.environment}`,
    ].join("\n"),
    inline: true,
  });

  // Configuration Status
  embed.addFields({
    name: "⚙️ Configuration",
    value: [
      `**Status:** ${data.configuration.loaded ? "✅ Loaded" : "❌ Error"}`,
      `**Version:** ${data.configuration.version}`,
      `**Primary Model:** ${data.configuration.models.primary}`,
      `**Fallback Model:** ${data.configuration.models.fallback}`,
    ].join("\n"),
    inline: true,
  });

  // API Status
  const geminiStatus = data.apis.gemini.available ? "✅" : "❌";
  const searchStatus = data.apis.braveSearch.available ? "✅" : "❌";

  embed.addFields({
    name: "🔌 APIs",
    value: [
      `**Gemini AI:** ${geminiStatus} ${data.apis.gemini.rateLimitStatus}`,
      `**Current Model:** ${data.apis.gemini.currentModel}`,
      `**Requests Today:** ${data.apis.gemini.requestsToday}`,
      `**Brave Search:** ${searchStatus} ${data.apis.braveSearch.rateLimitStatus}`,
      `**Quota Remaining:** ${data.apis.braveSearch.quotaRemaining}`,
    ].join("\n"),
    inline: false,
  });

  // Database Status
  const dbStatus = data.database.connected ? "✅ Connected" : "❌ Disconnected";
  embed.addFields({
    name: "💾 Database",
    value: [
      `**Status:** ${dbStatus}`,
      `**Type:** ${data.database.type}`,
      `**URL:** ${data.database.url}`,
      `**Last Check:** <t:${Math.floor(data.database.lastCheck / 1000)}:R>`,
    ].join("\n"),
    inline: false,
  });

  return embed;
}

// Type definitions for status data
interface StatusData {
  uptime: number;
  memory: {
    used: number;
    total: number;
    external: number;
    rss: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  configuration: ConfigurationStatus;
  apis: ApiStatus;
  database: DatabaseStatus;
  timestamp: number;
}

interface ConfigurationStatus {
  loaded: boolean;
  version: string;
  environment: string;
  models: {
    primary: string;
    fallback: string;
  };
}

interface ApiStatus {
  gemini: {
    available: boolean;
    currentModel: string;
    requestsToday: number;
    rateLimitStatus: string;
  };
  braveSearch: {
    available: boolean;
    requestsToday: number;
    quotaRemaining: number;
    rateLimitStatus: string;
  };
}

interface DatabaseStatus {
  connected: boolean;
  type: string;
  url: string;
  lastCheck: number;
}
