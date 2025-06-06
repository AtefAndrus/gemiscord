/**
 * /model command implementation
 *
 * Displays AI model information and usage statistics including:
 * - info: Current active model information
 * - stats: Model usage statistics and performance metrics
 * - limits: Rate limits and quota status
 */

import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { configManager } from "../bot.js";
import {
  getSubcommand,
  hasAdminPermission,
  sendPermissionDenied,
} from "../handlers/interactionCreate.js";
import { logger } from "../utils/logger.js";

/**
 * Handle /model command with subcommands
 */
export async function handleModelCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  try {
    // Check permissions
    if (!hasAdminPermission(interaction)) {
      await sendPermissionDenied(interaction);
      return;
    }

    const subcommand = getSubcommand(interaction);

    logger.info("Processing /model command", {
      userId: interaction.user.id,
      guildId: interaction.guild?.id,
      subcommand,
    });

    // Route to appropriate subcommand handler
    switch (subcommand) {
      case "info":
        await handleInfoSubcommand(interaction);
        break;

      case "stats":
        await handleStatsSubcommand(interaction);
        break;

      case "limits":
        await handleLimitsSubcommand(interaction);
        break;

      default:
        await interaction.reply({
          content:
            "❌ Unknown subcommand. Available: `info`, `stats`, `limits`.",
          ephemeral: true,
        });
    }
  } catch (error) {
    logger.error("Error in /model command:", error);

    try {
      const errorMessage =
        "❌ Failed to retrieve model information. Please try again later.";

      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      logger.error("Failed to send error response:", replyError);
    }
  }
}

/**
 * Handle model info subcommand
 */
async function handleInfoSubcommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const config = configManager.getConfig();
    const primaryModel = config.api?.gemini?.models?.primary || "unknown";
    const fallbackModel = config.api?.gemini?.models?.fallback || "unknown";

    // Get rate limit configuration from config
    const rateLimits = config.api.gemini.rate_limits;
    const primaryRateLimit = rateLimits[primaryModel];
    const fallbackRateLimit = rateLimits[fallbackModel];

    const embed = new EmbedBuilder()
      .setTitle("🤖 AI Model Information")
      .setColor(0x0099ff)
      .setTimestamp()
      .setFooter({ text: "Gemini AI Models" });

    // API Status
    const apiKeyStatus = process.env.GEMINI_API_KEY
      ? "✅ Configured"
      : "❌ Missing";
    embed.addFields({
      name: "🔑 API Status",
      value: [
        `**API Key:** ${apiKeyStatus}`,
        `**Provider:** Google Gemini API`,
        `**Service:** @google/genai`,
      ].join("\n"),
      inline: true,
    });

    // Primary Model Information
    if (primaryRateLimit) {
      embed.addFields({
        name: "🥇 Primary Model",
        value: [
          `**Name:** ${primaryModel}`,
          `**RPM Limit:** ${primaryRateLimit.rpm || "Unknown"}`,
          `**TPM Limit:** ${primaryRateLimit.tpm || "Unknown"}`,
          `**RPD Limit:** ${primaryRateLimit.rpd || "Unknown"}`,
        ].join("\n"),
        inline: true,
      });
    }

    // Fallback Model Information
    if (fallbackRateLimit) {
      embed.addFields({
        name: "🥈 Fallback Model",
        value: [
          `**Name:** ${fallbackModel}`,
          `**RPM Limit:** ${fallbackRateLimit.rpm || "Unknown"}`,
          `**TPM Limit:** ${fallbackRateLimit.tpm || "Unknown"}`,
          `**RPD Limit:** ${fallbackRateLimit.rpd || "Unknown"}`,
        ].join("\n"),
        inline: true,
      });
    }

    // Available Models
    const availableModels =
      configManager.getConfig().api.gemini.models.available;
    embed.addFields({
      name: "📋 Available Models",
      value:
        availableModels.map((model) => `• ${model}`).join("\n") ||
        "None configured",
      inline: false,
    });

    // Model Features
    embed.addFields({
      name: "✨ Features",
      value: [
        "• **Function Calling:** Web search, character counting",
        "• **Automatic Fallback:** Switches models when rate limited",
        "• **Context Awareness:** Maintains conversation context",
        "• **Multi-language Support:** Japanese and English",
      ].join("\n"),
      inline: false,
    });

    await interaction.editReply({ embeds: [embed] });

    logger.info("Model info displayed", {
      guildId: interaction.guild?.id,
      primaryModel,
      fallbackModel,
    });
  } catch (error) {
    logger.error("Failed to retrieve model info:", error);
    await interaction.editReply({
      content:
        "❌ Failed to retrieve model information. Please check the configuration.",
    });
  }
}

/**
 * Handle model stats subcommand
 */
async function handleStatsSubcommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Note: These will be populated when service integration is complete
    const mockStats = getMockModelStats();

    const embed = new EmbedBuilder()
      .setTitle("📊 Model Usage Statistics")
      .setColor(0x00ff00)
      .setTimestamp()
      .setFooter({ text: "Statistics for current month" });

    // Primary Model Stats
    embed.addFields({
      name: "🥇 Primary Model Usage",
      value: [
        `**Total Requests:** ${mockStats.primary.requests.toLocaleString()}`,
        `**Total Tokens:** ${mockStats.primary.tokens.toLocaleString()}`,
        `**Avg Response Time:** ${mockStats.primary.avgResponseTime}ms`,
        `**Success Rate:** ${mockStats.primary.successRate}%`,
      ].join("\n"),
      inline: true,
    });

    // Fallback Model Stats
    embed.addFields({
      name: "🥈 Fallback Model Usage",
      value: [
        `**Total Requests:** ${mockStats.fallback.requests.toLocaleString()}`,
        `**Total Tokens:** ${mockStats.fallback.tokens.toLocaleString()}`,
        `**Avg Response Time:** ${mockStats.fallback.avgResponseTime}ms`,
        `**Success Rate:** ${mockStats.fallback.successRate}%`,
      ].join("\n"),
      inline: true,
    });

    // Function Calling Stats
    embed.addFields({
      name: "⚡ Function Calls",
      value: [
        `**Web Search:** ${mockStats.functions.webSearch.toLocaleString()} calls`,
        `**Character Count:** ${mockStats.functions.characterCount.toLocaleString()} calls`,
        `**Total Functions:** ${mockStats.functions.total.toLocaleString()} calls`,
      ].join("\n"),
      inline: true,
    });

    // Performance Metrics
    embed.addFields({
      name: "🎯 Performance",
      value: [
        `**Model Switches:** ${mockStats.performance.modelSwitches}`,
        `**Rate Limit Hits:** ${mockStats.performance.rateLimitHits}`,
        `**Error Rate:** ${mockStats.performance.errorRate}%`,
        `**Uptime:** ${mockStats.performance.uptime}%`,
      ].join("\n"),
      inline: true,
    });

    // Daily Usage Trend
    embed.addFields({
      name: "📈 Today's Usage",
      value: [
        `**Requests:** ${mockStats.today.requests}`,
        `**Peak Hour:** ${mockStats.today.peakHour}:00`,
        `**Active Since:** ${mockStats.today.activeSince}`,
      ].join("\n"),
      inline: true,
    });

    embed.addFields({
      name: "⚠️ Note",
      value:
        "Statistics are simulated during Phase 3 development. Real-time tracking will be available in production.",
      inline: false,
    });

    await interaction.editReply({ embeds: [embed] });

    logger.info("Model stats displayed", {
      guildId: interaction.guild?.id,
    });
  } catch (error) {
    logger.error("Failed to retrieve model stats:", error);
    await interaction.editReply({
      content:
        "❌ Failed to retrieve model statistics. Please try again later.",
    });
  }
}

/**
 * Handle model limits subcommand
 */
async function handleLimitsSubcommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const config = configManager.getConfig();
    const primaryModel = config.api?.gemini?.models?.primary || "unknown";
    const fallbackModel = config.api?.gemini?.models?.fallback || "unknown";

    const embed = new EmbedBuilder()
      .setTitle("⚖️ Rate Limits & Quotas")
      .setColor(0xffa500)
      .setTimestamp()
      .setFooter({ text: "Current rate limit status" });

    // Primary Model Limits
    const rateLimits = config.api.gemini.rate_limits;
    const primaryRateLimit = rateLimits[primaryModel];
    if (primaryRateLimit) {
      const primaryUsage = getMockUsageData(primaryModel);
      embed.addFields({
        name: `🥇 ${primaryModel}`,
        value: [
          `**RPM:** ${primaryUsage.rpm}/${primaryRateLimit.rpm || "Unknown"} (${
            primaryUsage.rpmPercent
          }%)`,
          `**TPM:** ${primaryUsage.tpm}/${primaryRateLimit.tpm || "Unknown"} (${
            primaryUsage.tpmPercent
          }%)`,
          `**RPD:** ${primaryUsage.rpd}/${primaryRateLimit.rpd || "Unknown"} (${
            primaryUsage.rpdPercent
          }%)`,
          `**Status:** ${primaryUsage.status}`,
        ].join("\n"),
        inline: true,
      });
    }

    // Fallback Model Limits
    const fallbackRateLimit = rateLimits[fallbackModel];
    if (fallbackRateLimit) {
      const fallbackUsage = getMockUsageData(fallbackModel);
      embed.addFields({
        name: `🥈 ${fallbackModel}`,
        value: [
          `**RPM:** ${fallbackUsage.rpm}/${
            fallbackRateLimit.rpm || "Unknown"
          } (${fallbackUsage.rpmPercent}%)`,
          `**TPM:** ${fallbackUsage.tpm}/${
            fallbackRateLimit.tpm || "Unknown"
          } (${fallbackUsage.tpmPercent}%)`,
          `**RPD:** ${fallbackUsage.rpd}/${
            fallbackRateLimit.rpd || "Unknown"
          } (${fallbackUsage.rpdPercent}%)`,
          `**Status:** ${fallbackUsage.status}`,
        ].join("\n"),
        inline: true,
      });
    }

    // Rate Limiting Info
    embed.addFields({
      name: "🛡️ Rate Limiting",
      value: [
        "**RPM:** Requests per minute",
        "**TPM:** Tokens per minute",
        "**RPD:** Requests per day",
        "**Safety Buffer:** 80% of limits used",
      ].join("\n"),
      inline: true,
    });

    // Next Reset Times
    const now = new Date();
    const nextMinute = new Date(now.getTime() + (60 - now.getSeconds()) * 1000);
    const nextDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    embed.addFields({
      name: "🔄 Reset Times",
      value: [
        `**Minute Reset:** <t:${Math.floor(nextMinute.getTime() / 1000)}:R>`,
        `**Daily Reset:** <t:${Math.floor(nextDay.getTime() / 1000)}:R>`,
      ].join("\n"),
      inline: false,
    });

    await interaction.editReply({ embeds: [embed] });

    logger.info("Model limits displayed", {
      guildId: interaction.guild?.id,
      primaryModel,
      fallbackModel,
    });
  } catch (error) {
    logger.error("Failed to retrieve model limits:", error);
    await interaction.editReply({
      content:
        "❌ Failed to retrieve rate limit information. Please try again later.",
    });
  }
}

/**
 * Get mock model statistics (to be replaced with real data)
 */
function getMockModelStats() {
  return {
    primary: {
      requests: 1247,
      tokens: 45821,
      avgResponseTime: 1250,
      successRate: 98.2,
    },
    fallback: {
      requests: 89,
      tokens: 3421,
      avgResponseTime: 950,
      successRate: 99.1,
    },
    functions: {
      webSearch: 234,
      characterCount: 567,
      total: 801,
    },
    performance: {
      modelSwitches: 12,
      rateLimitHits: 3,
      errorRate: 1.8,
      uptime: 99.7,
    },
    today: {
      requests: 89,
      peakHour: 14,
      activeSince: "08:00",
    },
  };
}

/**
 * Get mock usage data for a model (to be replaced with real data)
 */
function getMockUsageData(modelName: string) {
  const isHighUsage = modelName.includes("2.5"); // Simulate higher usage for primary model

  return {
    rpm: isHighUsage ? 8 : 2,
    rpmPercent: isHighUsage ? 80 : 13,
    tpm: isHighUsage ? 180000 : 45000,
    tpmPercent: isHighUsage ? 72 : 9,
    rpd: isHighUsage ? 387 : 89,
    rpdPercent: isHighUsage ? 77 : 6,
    status: isHighUsage ? "🟡 High Usage" : "✅ Normal",
  };
}
