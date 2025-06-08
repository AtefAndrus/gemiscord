#!/usr/bin/env bun
/**
 * Discord Slash Commands Registration Script
 *
 * Registers 4 slash commands (/status, /config, /search, /model) with Discord API
 * Supports both guild-specific and global registration
 */

import {
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import { logger } from "./utils/logger.js";

// Environment validation
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID; // Optional: for guild-specific deployment

if (!token || !clientId) {
  logger.error(
    "Missing required environment variables: DISCORD_TOKEN, DISCORD_CLIENT_ID"
  );
  process.exit(1);
}

// Command definitions based on Phase 3 requirements
const commands = [
  // /status command - Bot status and API usage statistics
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("View bot status, uptime, and API usage statistics")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),

  // /config command - Guild configuration management
  new SlashCommandBuilder()
    .setName("config")
    .setDescription("Manage bot configuration for this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("mention")
        .setDescription("Enable or disable mention responses")
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("Enable or disable mention responses")
            .setRequired(true)
            .addChoices(
              { name: "Enable", value: "enable" },
              { name: "Disable", value: "disable" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("channel")
        .setDescription("Add or remove auto-response channels")
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("Add or remove channel from auto-response list")
            .setRequired(true)
            .addChoices(
              { name: "Add", value: "add" },
              { name: "Remove", value: "remove" }
            )
        )
        .addChannelOption((option) =>
          option
            .setName("target")
            .setDescription("Channel to add or remove")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("prompt")
        .setDescription("Set server-specific AI prompt")
        .addStringOption((option) =>
          option
            .setName("content")
            .setDescription("Custom prompt for this server")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("strategy")
        .setDescription("Set message handling strategy")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Message length handling strategy")
            .setRequired(true)
            .addChoices(
              { name: "Compress", value: "compress" },
              { name: "Split", value: "split" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("View current server configuration")
    )
    .toJSON(),

  // /search command - Search functionality management
  new SlashCommandBuilder()
    .setName("search")
    .setDescription("Manage web search functionality")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("toggle")
        .setDescription("Enable or disable web search")
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("Enable or disable web search")
            .setRequired(true)
            .addChoices(
              { name: "Enable", value: "enable" },
              { name: "Disable", value: "disable" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("quota")
        .setDescription("View current search API usage and quota")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("test")
        .setDescription("Perform a test search to verify functionality")
        .addStringOption((option) =>
          option
            .setName("query")
            .setDescription("Test search query")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("reset")
        .setDescription("Reset search usage counter for debugging")
    )
    .toJSON(),

  // /model command - AI model information and statistics
  new SlashCommandBuilder()
    .setName("model")
    .setDescription("View AI model information and usage statistics")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("info")
        .setDescription("View current active AI model information")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("stats")
        .setDescription("View model usage statistics and performance metrics")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("limits")
        .setDescription("View current rate limits and quota status")
    )
    .toJSON(),
];

/**
 * Register commands with Discord API
 */
async function registerCommands(): Promise<void> {
  try {
    logger.info(
      `Starting registration of ${commands.length} slash commands...`
    );

    const rest = new REST().setToken(token as string);

    // Choose registration scope
    const route = guildId
      ? Routes.applicationGuildCommands(clientId as string, guildId)
      : Routes.applicationCommands(clientId as string);

    const registrationType = guildId ? "guild-specific" : "global";

    logger.info(`Registering commands as ${registrationType}...`);

    const data = (await rest.put(route, { body: commands })) as any[];

    logger.info(
      `Successfully registered ${data.length} slash commands (${registrationType})`
    );

    // Log registered commands
    data.forEach((command: any) => {
      logger.info(`  ✓ /${command.name}: ${command.description}`);
    });

    if (!guildId) {
      logger.warn(
        "Global commands may take up to 1 hour to propagate across Discord"
      );
    }
  } catch (error) {
    logger.error("Failed to register slash commands:", error);
    process.exit(1);
  }
}

/**
 * Clear all existing commands (useful for cleanup)
 */
async function clearCommands(): Promise<void> {
  try {
    logger.info("Clearing existing slash commands...");

    const rest = new REST().setToken(token as string);

    const route = guildId
      ? Routes.applicationGuildCommands(clientId as string, guildId)
      : Routes.applicationCommands(clientId as string);

    await rest.put(route, { body: [] });

    logger.info("Successfully cleared all slash commands");
  } catch (error) {
    logger.error("Failed to clear slash commands:", error);
    process.exit(1);
  }
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case "register":
  case undefined:
    registerCommands();
    break;
  case "clear":
    clearCommands();
    break;
  default:
    console.log("Usage: bun run src/registerCommands.ts [register|clear]");
    console.log("  register: Register slash commands (default)");
    console.log("  clear: Remove all slash commands");
    process.exit(1);
}
