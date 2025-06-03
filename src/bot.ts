// Main entry point for Gemiscord bot

import { Client, Collection, GatewayIntentBits } from "discord.js";
import { ConfigService } from "./services/config.js";
import { ConfigManager } from "./services/configManager.js";
import { Command, ExtendedClient } from "./types/index.js";
import { APP_INFO, ENV } from "./utils/constants.js";
import { logger } from "./utils/logger.js";

// Import handlers
import { MessageCreateHandler } from "./handlers/messageCreate.js";
import { ReadyHandler } from "./handlers/ready.js";
// import { InteractionCreateHandler } from './handlers/interactionCreate.js';

// Global services
export let configManager: ConfigManager;
export let configService: ConfigService;

// Create and configure the Discord client
function createClient(): ExtendedClient {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent, // Required for message content
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildMembers,
    ],
    allowedMentions: {
      parse: ["users"],
      repliedUser: true,
    },
  }) as ExtendedClient;

  // Initialize commands collection
  client.commands = new Collection<string, Command>();

  return client;
}

// Initialize services
async function initializeServices(): Promise<void> {
  logger.info(`Initializing ${APP_INFO.NAME} v${APP_INFO.VERSION}...`);

  // Initialize configuration manager
  configManager = new ConfigManager();
  await configManager.loadConfig();
  logger.info("Configuration manager initialized");

  // Initialize configuration service (keyv)
  configService = new ConfigService(ENV.DATABASE_URL);
  await configService.initialize();
  logger.info("Configuration service initialized");

  // Initialize other services here as they are implemented
  // await geminiService.initialize();
  // await searchService.initialize();
  // await rateLimitService.initialize();
}

// Register event handlers
function registerEventHandlers(client: ExtendedClient): void {
  logger.info("Registering event handlers...");

  // Ready event
  const readyHandler = new ReadyHandler();
  client.once(readyHandler.name, () => readyHandler.execute(client));

  // Message create event
  const messageHandler = new MessageCreateHandler();
  client.on(messageHandler.name, (message) =>
    messageHandler.execute(client, message)
  );

  // Interaction create event (to be implemented)
  // const interactionHandler = new InteractionCreateHandler();
  // client.on(interactionHandler.name, (...args) => interactionHandler.execute(client, ...args));

  // Error handling
  client.on("error", (error: Error) => {
    logger.error("Discord client error:", error);
  });

  client.on("warn", (warning: string) => {
    logger.warn("Discord client warning:", warning);
  });

  logger.info("Event handlers registered");
}

// Graceful shutdown handler
async function gracefulShutdown(client: ExtendedClient): Promise<void> {
  logger.info("Shutting down gracefully...");

  try {
    // Destroy the client connection
    client.destroy();
    logger.info("Discord client disconnected");

    // Close database connections
    // await configService.cleanup();

    // Cleanup other resources
    // await geminiService.cleanup();
    // await searchService.cleanup();

    logger.info("Shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown:", error);
    process.exit(1);
  }
}

// Main function
async function main(): Promise<void> {
  try {
    // Validate environment variables
    if (!process.env.DISCORD_TOKEN) {
      throw new Error("DISCORD_TOKEN environment variable is not set");
    }
    if (!process.env.DISCORD_CLIENT_ID) {
      throw new Error("DISCORD_CLIENT_ID environment variable is not set");
    }
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    if (!process.env.BRAVE_SEARCH_API_KEY) {
      throw new Error("BRAVE_SEARCH_API_KEY environment variable is not set");
    }

    // Initialize services
    await initializeServices();

    // Create Discord client
    const client = createClient();

    // Register event handlers
    registerEventHandlers(client);

    // Setup shutdown handlers
    process.on("SIGINT", () => gracefulShutdown(client));
    process.on("SIGTERM", () => gracefulShutdown(client));
    process.on(
      "unhandledRejection",
      (reason: unknown, promise: Promise<unknown>) => {
        logger.error("Unhandled Rejection at:", promise, "reason:", reason);
      }
    );
    process.on("uncaughtException", (error: Error) => {
      logger.error("Uncaught Exception:", error);
      gracefulShutdown(client);
    });

    // Login to Discord
    logger.info("Logging in to Discord...");
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    logger.error("Failed to start bot:", error);
    process.exit(1);
  }
}

// Start the bot
main().catch((error) => {
  logger.error("Unhandled error in main:", error);
  process.exit(1);
});
