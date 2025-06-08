/**
 * /model command implementation
 *
 * Displays AI model information and usage statistics including:
 * - info: Current active model information
 * - stats: Model usage statistics and performance metrics
 * - limits: Rate limits and quota status
 */

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { configManager, configService } from "../bot.js";
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
          ephemeral: configManager.getEphemeralSetting("model"),
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
        await interaction.reply({
          content: errorMessage,
          ephemeral: configManager.getEphemeralSetting("model"),
        });
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
  await interaction.deferReply({
    flags: configManager.getEphemeralSetting("model")
      ? MessageFlags.Ephemeral
      : undefined,
  });

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
  await interaction.deferReply({
    flags: configManager.getEphemeralSetting("model")
      ? MessageFlags.Ephemeral
      : undefined,
  });

  try {
    // Get actual statistics from configService
    const config = configManager.getConfig();
    const availableModels = config.api.gemini.models.available;
    const stats = await configService.getStats(availableModels);
    const primaryModel =
      config.api?.gemini?.models?.primary || "gemini-2.5-flash-preview-05-20";
    const fallbackModel =
      config.api?.gemini?.models?.fallback || "gemini-2.0-flash";

    const embed = new EmbedBuilder()
      .setTitle("📊 Model Usage Statistics")
      .setColor(0x00ff00)
      .setTimestamp()
      .setFooter({ text: "Real-time statistics" });

    // Get actual model usage from stats
    const primaryUsage = stats.model_usage?.[primaryModel] || 0;
    const fallbackUsage = stats.model_usage?.[fallbackModel] || 0;
    const totalRequests = stats.total_requests || 0;
    const searchUsage = stats.search_usage || 0;

    // Primary Model Stats
    embed.addFields({
      name: `🥇 ${primaryModel}`,
      value: [
        `**Requests:** ${primaryUsage.toLocaleString()}`,
        `**Status:** ${primaryUsage > 0 ? "Active" : "Not used"}`,
        `**Model Type:** Primary`,
      ].join("\n"),
      inline: true,
    });

    // Fallback Model Stats
    embed.addFields({
      name: `🥈 ${fallbackModel}`,
      value: [
        `**Requests:** ${fallbackUsage.toLocaleString()}`,
        `**Status:** ${fallbackUsage > 0 ? "Active" : "Not used"}`,
        `**Model Type:** Fallback`,
      ].join("\n"),
      inline: true,
    });

    // Function Calling Stats
    embed.addFields({
      name: "⚡ Function Usage",
      value: [
        `**Search Calls:** ${searchUsage.toLocaleString()}`,
        `**Total Requests:** ${totalRequests.toLocaleString()}`,
        `**Function Ratio:** ${
          totalRequests > 0
            ? ((searchUsage / totalRequests) * 100).toFixed(1)
            : 0
        }%`,
      ].join("\n"),
      inline: true,
    });

    // API Configuration
    const rateLimits = config.api.gemini.rate_limits;
    const primaryLimits = rateLimits[primaryModel];

    embed.addFields({
      name: "⚙️ Configuration",
      value: [
        `**Primary RPM:** ${primaryLimits?.rpm || "Unknown"}`,
        `**Primary TPM:** ${primaryLimits?.tpm?.toLocaleString() || "Unknown"}`,
        `**Models Available:** ${config.api.gemini.models.available.length}`,
      ].join("\n"),
      inline: true,
    });

    // Recent Activity
    const now = new Date();
    const uptimeStart = process.uptime();
    const startTime = new Date(now.getTime() - uptimeStart * 1000);

    embed.addFields({
      name: "📈 Session Info",
      value: [
        `**Session Start:** <t:${Math.floor(startTime.getTime() / 1000)}:R>`,
        `**Total Models:** ${Object.keys(stats.model_usage || {}).length}`,
        `**Active Models:** ${
          Object.values(stats.model_usage || {}).filter(
            (usage: any) => usage > 0
          ).length
        }`,
      ].join("\n"),
      inline: true,
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
  await interaction.deferReply({
    flags: configManager.getEphemeralSetting("model")
      ? MessageFlags.Ephemeral
      : undefined,
  });

  try {
    const config = configManager.getConfig();
    const availableModels = config.api.gemini.models.available;
    const stats = await configService.getStats(availableModels);
    const primaryModel = config.api?.gemini?.models?.primary || "unknown";
    const fallbackModel = config.api?.gemini?.models?.fallback || "unknown";

    const embed = new EmbedBuilder()
      .setTitle("⚖️ Rate Limits & Quotas")
      .setColor(0xffa500)
      .setTimestamp()
      .setFooter({ text: "Configured rate limits" });

    // Primary Model Limits
    const rateLimits = config.api.gemini.rate_limits;
    const primaryRateLimit = rateLimits[primaryModel];
    const primaryUsage = stats.model_usage?.[primaryModel] || 0;

    if (primaryRateLimit) {
      embed.addFields({
        name: `🥇 ${primaryModel}`,
        value: [
          `**RPM Limit:** ${primaryRateLimit.rpm}`,
          `**TPM Limit:** ${primaryRateLimit.tpm?.toLocaleString()}`,
          `**RPD Limit:** ${primaryRateLimit.rpd}`,
          `**Session Usage:** ${primaryUsage} requests`,
        ].join("\n"),
        inline: true,
      });
    }

    // Fallback Model Limits
    const fallbackRateLimit = rateLimits[fallbackModel];
    const fallbackUsage = stats.model_usage?.[fallbackModel] || 0;

    if (fallbackRateLimit) {
      embed.addFields({
        name: `🥈 ${fallbackModel}`,
        value: [
          `**RPM Limit:** ${fallbackRateLimit.rpm}`,
          `**TPM Limit:** ${fallbackRateLimit.tpm?.toLocaleString()}`,
          `**RPD Limit:** ${fallbackRateLimit.rpd}`,
          `**Session Usage:** ${fallbackUsage} requests`,
        ].join("\n"),
        inline: true,
      });
    }

    // Rate Limiting Configuration
    embed.addFields({
      name: "🛡️ Rate Limiting",
      value: [
        "**RPM:** Requests per minute",
        "**TPM:** Tokens per minute",
        "**RPD:** Requests per day",
        "**Auto-Switch:** Enabled when limits reached",
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
