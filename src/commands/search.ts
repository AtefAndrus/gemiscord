/**
 * /search command implementation
 *
 * Manages web search functionality including:
 * - toggle enable/disable search
 * - quota usage monitoring
 * - test search functionality
 */

import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { configManager, configService } from "../bot.js";
import {
  getStringOption,
  getSubcommand,
  hasAdminPermission,
  sendPermissionDenied,
} from "../handlers/interactionCreate.js";
import { ValidationError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

/**
 * Handle /search command with subcommands
 */
export async function handleSearchCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  try {
    // Check permissions
    if (!hasAdminPermission(interaction)) {
      await sendPermissionDenied(interaction);
      return;
    }

    // Ensure we're in a guild
    if (!interaction.guild) {
      await interaction.reply({
        content: "❌ This command can only be used in a server.",
        ephemeral: true,
      });
      return;
    }

    const subcommand = getSubcommand(interaction);
    const guildId = interaction.guild.id;

    logger.info("Processing /search command", {
      userId: interaction.user.id,
      guildId,
      subcommand,
    });

    // Route to appropriate subcommand handler
    switch (subcommand) {
      case "toggle":
        await handleToggleSubcommand(interaction, guildId);
        break;

      case "quota":
        await handleQuotaSubcommand(interaction, guildId);
        break;

      case "test":
        await handleTestSubcommand(interaction, guildId);
        break;

      default:
        await interaction.reply({
          content:
            "❌ Unknown subcommand. Available: `toggle`, `quota`, `test`.",
          ephemeral: true,
        });
    }
  } catch (error) {
    logger.error("Error in /search command:", error);

    try {
      const errorMessage =
        error instanceof ValidationError
          ? `❌ ${error.message}`
          : "❌ Failed to process search command. Please try again later.";

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
 * Handle search toggle subcommand
 */
async function handleToggleSubcommand(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  const action = getStringOption(interaction, "action", true);

  if (!action || !["enable", "disable"].includes(action)) {
    throw new ValidationError('Action must be either "enable" or "disable"');
  }

  await interaction.deferReply({ ephemeral: true });

  const enabled = action === "enable";

  // Check if Brave Search API key is available
  if (enabled && !process.env.BRAVE_SEARCH_API_KEY) {
    await interaction.editReply({
      content:
        "❌ Cannot enable search: Brave Search API key is not configured.",
    });
    return;
  }

  const currentConfig = await configService.getGuildConfig(guildId);

  await configService.setGuildConfig(guildId, {
    ...currentConfig,
    search_enabled: enabled,
  });

  const statusText = enabled ? "enabled" : "disabled";
  const emoji = enabled ? "✅" : "❌";

  let statusMessage = `${emoji} Web search has been **${statusText}** for this server.`;

  if (enabled) {
    const config = configManager.getConfig();
    const usage = await configService.getSearchUsage();
    const freeQuota = config.api.brave_search.free_quota;
    const remaining = Math.max(0, freeQuota - usage);
    statusMessage += `\n\n📊 **Current Usage:** ${usage}/${freeQuota} queries this month (${remaining} remaining)`;
  }

  await interaction.editReply({ content: statusMessage });

  logger.info(`Search ${statusText}`, { guildId, enabled });
}

/**
 * Handle quota monitoring subcommand
 */
async function handleQuotaSubcommand(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const config = configManager.getConfig();
    // Get current usage statistics
    const currentUsage = await configService.getSearchUsage();
    const maxQueries = config.api.brave_search.free_quota;
    const remaining = Math.max(0, maxQueries - currentUsage);
    const usagePercentage = Math.round((currentUsage / maxQueries) * 100);

    // Get search enabled status
    const searchEnabled = await configService.isSearchEnabled(guildId);

    // Calculate thresholds for warnings
    const warningThreshold = config.monitoring.thresholds.usage.warning * 100;
    const criticalThreshold = config.monitoring.thresholds.usage.critical * 100;

    // Create quota embed
    const embed = new EmbedBuilder()
      .setTitle("🔍 Search API Quota Status")
      .setColor(
        usagePercentage > criticalThreshold
          ? 0xff0000
          : usagePercentage > warningThreshold
          ? 0xffa500
          : 0x00ff00
      )
      .setTimestamp()
      .setFooter({ text: `Guild: ${interaction.guild?.name}` });

    // Basic quota information
    embed.addFields({
      name: "📊 Monthly Usage",
      value: [
        `**Used:** ${currentUsage.toLocaleString()} queries`,
        `**Remaining:** ${remaining.toLocaleString()} queries`,
        `**Total Limit:** ${maxQueries.toLocaleString()} queries`,
        `**Usage:** ${usagePercentage}%`,
      ].join("\n"),
      inline: true,
    });

    // Status information
    const statusIcon = searchEnabled ? "✅" : "❌";
    const apiKeyStatus = process.env.BRAVE_SEARCH_API_KEY
      ? "✅ Configured"
      : "❌ Missing";

    embed.addFields({
      name: "⚙️ Search Status",
      value: [
        `**Server Setting:** ${statusIcon} ${
          searchEnabled ? "Enabled" : "Disabled"
        }`,
        `**API Key:** ${apiKeyStatus}`,
        `**Service:** Brave Search API`,
      ].join("\n"),
      inline: true,
    });

    // Usage warnings and recommendations
    let recommendations = "";
    if (usagePercentage > criticalThreshold) {
      recommendations =
        "⚠️ **Warning:** Approaching monthly limit. Consider reducing search usage.";
    } else if (usagePercentage > warningThreshold) {
      recommendations =
        "🟡 **Caution:** High usage detected. Monitor search activity.";
    } else if (currentUsage === 0) {
      recommendations = "💡 **Info:** No searches performed this month.";
    } else {
      recommendations = "✅ **Status:** Quota usage is within normal limits.";
    }

    embed.addFields({
      name: "💡 Recommendations",
      value: recommendations,
      inline: false,
    });

    // Quota reset information
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const resetTimestamp = Math.floor(nextMonth.getTime() / 1000);

    embed.addFields({
      name: "🔄 Quota Reset",
      value: `Next reset: <t:${resetTimestamp}:R> (<t:${resetTimestamp}:F>)`,
      inline: false,
    });

    await interaction.editReply({ embeds: [embed] });

    logger.info("Search quota viewed", {
      guildId,
      currentUsage,
      usagePercentage,
    });
  } catch (error) {
    logger.error("Failed to retrieve search quota:", error);
    await interaction.editReply({
      content:
        "❌ Failed to retrieve search quota information. Please try again later.",
    });
  }
}

/**
 * Handle test search subcommand
 */
async function handleTestSubcommand(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  const config = configManager.getConfig();
  const query = getStringOption(interaction, "query", true);

  if (!query || query.length < config.search.validation.query.min_length) {
    throw new ValidationError(
      `Search query must be at least ${config.search.validation.query.min_length} characters long`
    );
  }

  if (query.length > config.search.validation.query.max_length) {
    throw new ValidationError(
      `Search query must be less than ${config.search.validation.query.max_length} characters`
    );
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    // Check if search is enabled
    const searchEnabled = await configService.isSearchEnabled(guildId);
    if (!searchEnabled) {
      await interaction.editReply({
        content:
          "❌ Web search is disabled for this server. Enable it with `/search toggle enable`.",
      });
      return;
    }

    // Check API key availability
    if (!process.env.BRAVE_SEARCH_API_KEY) {
      await interaction.editReply({
        content:
          "❌ Brave Search API key is not configured. Cannot perform test search.",
      });
      return;
    }

    // Check quota
    const currentUsage = await configService.getSearchUsage();
    if (currentUsage >= config.api.brave_search.free_quota) {
      await interaction.editReply({
        content:
          "❌ Monthly search quota exceeded. Cannot perform test search.",
      });
      return;
    }

    // Perform mock search (replace with actual search when service is integrated)
    await simulateSearchTest(interaction, query);
  } catch (error) {
    logger.error("Search test failed:", error);
    await interaction.editReply({
      content:
        "❌ Search test failed. Please check the configuration and try again.",
    });
  }
}

/**
 * Simulate search test (placeholder for actual search integration)
 */
async function simulateSearchTest(
  interaction: ChatInputCommandInteraction,
  query: string
): Promise<void> {
  // This is a mock implementation - will be replaced when search service is integrated

  const embed = new EmbedBuilder()
    .setTitle("🧪 Search Test Results")
    .setColor(0x00ff00)
    .setTimestamp()
    .setDescription(`Test search for: **${query}**`);

  embed.addFields({
    name: "✅ Connection Test",
    value: [
      "**API Endpoint:** Reachable",
      "**Authentication:** Valid",
      "**Rate Limits:** OK",
    ].join("\n"),
    inline: true,
  });

  embed.addFields({
    name: "📊 Mock Results",
    value: [
      "**Results Found:** 42,000",
      "**Response Time:** 250ms",
      "**Query Processing:** Success",
    ].join("\n"),
    inline: true,
  });

  embed.addFields({
    name: "🔍 Sample Result",
    value: [
      `**Title:** ${query} - Example Result`,
      "**URL:** https://example.com",
      "**Snippet:** This is a mock search result for testing purposes.",
    ].join("\n"),
    inline: false,
  });

  embed.addFields({
    name: "⚠️ Note",
    value:
      "This is a simulated test. Actual search integration is pending Phase 3 completion.",
    inline: false,
  });

  await interaction.editReply({ embeds: [embed] });

  // Increment usage for test
  await configService.incrementSearchUsage();

  logger.info("Search test completed", {
    guildId: interaction.guild?.id,
    query: query.substring(0, 50), // Log only first 50 chars for privacy
    queryLength: query.length,
  });
}
