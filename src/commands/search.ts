/**
 * /search command implementation
 *
 * Manages web search functionality including:
 * - toggle enable/disable search
 * - quota usage monitoring
 * - test search functionality
 */

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { configManager, configService } from "../bot.js";
import {
  getStringOption,
  getSubcommand,
  hasAdminPermission,
  sendPermissionDenied,
} from "../handlers/interactionCreate.js";
import {
  ConfigActionHandler,
  CommandValidators,
} from "../utils/commandUtils.js";
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
      const ephemeral = configManager.getEphemeralSetting("search");
      await interaction.reply({
        content: "❌ This command can only be used in a server.",
        ephemeral,
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

      case "reset":
        await handleResetSubcommand(interaction, guildId);
        break;

      default:
        await interaction.reply({
          content:
            "❌ Unknown subcommand. Available: `toggle`, `quota`, `test`, `reset`.",
          ephemeral: configManager.getEphemeralSetting("search"),
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
        await interaction.reply({
          content: errorMessage,
          flags: MessageFlags.Ephemeral,
        });
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
  // Use utility function with custom validation and message builder
  await ConfigActionHandler.handleToggleAction({
    interaction,
    guildId,
    configKey: "search_enabled",
    featureName: "Web search",
    commandName: "search", // Force ephemeral for search command
    customValidation: CommandValidators.createApiKeyValidator(
      "BRAVE_SEARCH_API_KEY",
      "search"
    ),
    customMessageBuilder: CommandValidators.createUsageMessageBuilder(
      "Web search",
      async () => {
        const config = configManager.getConfig();
        const usage = await configService.getSearchUsage();
        return {
          current: usage,
          limit: config.api.brave_search.free_quota,
        };
      }
    ),
  });
}

/**
 * Handle quota monitoring subcommand
 */
async function handleQuotaSubcommand(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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

    // Perform actual search test
    await performActualSearchTest(interaction, query, guildId);
  } catch (error) {
    logger.error("Search test failed:", error);
    await interaction.editReply({
      content:
        "❌ Search test failed. Please check the configuration and try again.",
    });
  }
}

/**
 * Perform actual search functionality test
 */
async function performActualSearchTest(
  interaction: ChatInputCommandInteraction,
  query: string,
  guildId: string
): Promise<void> {
  try {
    // Import the BraveSearchService
    const { BraveSearchService } = await import("../services/braveSearch.js");
    const braveSearchService = new BraveSearchService(
      configService,
      configManager
    );

    // Initialize the search service
    await braveSearchService.initialize();

    // Perform actual search
    const searchQuery = {
      query,
      region: "JP" as const,
      count: 5,
    };

    const searchResults = await braveSearchService.search(searchQuery);
    const formattedResults =
      braveSearchService.formatResultsForDiscord(searchResults);

    // Create success embed
    const embed = new EmbedBuilder()
      .setTitle("🧪 Search Test Results")
      .setColor(0x00ff00)
      .setTimestamp()
      .setDescription(`Successfully performed search with query: **${query}**`);

    // Add search results
    embed.addFields({
      name: "📊 Search Results",
      value: `Found ${searchResults.totalResults} results in ${searchResults.searchTime}ms`,
      inline: true,
    });

    // Add formatted results preview
    if (formattedResults.length > 0) {
      const preview =
        formattedResults.length > 500
          ? formattedResults.substring(0, 500) + "..."
          : formattedResults;

      embed.addFields({
        name: "🔍 Results Preview",
        value: preview || "No results formatted",
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });

    logger.info("Actual search test completed successfully", {
      guildId,
      query: query.substring(0, 50),
      resultCount: searchResults.totalResults,
      searchTime: searchResults.searchTime,
    });
  } catch (error) {
    logger.error("Actual search test failed:", error);

    const errorEmbed = new EmbedBuilder()
      .setTitle("❌ Search Test Failed")
      .setColor(0xff0000)
      .setDescription("Failed to perform actual search test")
      .addFields({
        name: "Error Details",
        value:
          error instanceof Error ? error.message : "Unknown error occurred",
        inline: false,
      });

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

/**
 * Handle search usage reset subcommand (debug only)
 */
async function handleResetSubcommand(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Get current usage before reset
    const currentUsage = await configService.getSearchUsage();

    // Reset search usage
    await configService.resetSearchUsage();

    // Get usage after reset to confirm
    const newUsage = await configService.getSearchUsage();

    const embed = new EmbedBuilder()
      .setTitle("🔄 Search Usage Reset")
      .setColor(0x00ff00)
      .setTimestamp()
      .setDescription(
        "Search usage counters have been reset for debugging purposes"
      );

    embed.addFields({
      name: "📊 Reset Details",
      value: [
        `**Previous Usage:** ${currentUsage.toLocaleString()} queries`,
        `**Current Usage:** ${newUsage.toLocaleString()} queries`,
        `**Monthly Quota:** ${configManager
          .getConfig()
          .api.brave_search.free_quota.toLocaleString()} queries`,
        `**Status:** ✅ Ready for testing`,
      ].join("\n"),
      inline: false,
    });

    await interaction.editReply({ embeds: [embed] });

    logger.info("Search usage reset completed", {
      guildId,
      previousUsage: currentUsage,
      newUsage,
    });
  } catch (error) {
    logger.error("Failed to reset search usage:", error);
    await interaction.editReply({
      content: "❌ Failed to reset search usage. Please try again later.",
    });
  }
}
