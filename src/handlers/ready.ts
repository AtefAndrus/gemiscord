// Discord ready event handler

import { ActivityType } from "discord.js";
import { configService } from "../bot.js";
import { IReadyHandler } from "../interfaces/handlers.js";
import { ExtendedClient, ReadyData } from "../types/index.js";
import { APP_INFO, MONITORING } from "../utils/constants.js";
import { discordLogger as logger } from "../utils/logger.js";

export class ReadyHandler implements IReadyHandler {
  name: "ready" = "ready";
  once: true = true;

  async execute(client: ExtendedClient): Promise<void> {
    if (!client.user) {
      logger.error("Client user is not available");
      return;
    }

    const readyData: ReadyData = {
      user: client.user,
      guilds: client.guilds.cache.size,
      timestamp: new Date(),
    };

    // Log startup information
    this.logStartupInfo(readyData);

    // Initialize services that depend on the client being ready
    await this.initializeServices();

    // Register slash commands
    await this.registerCommands(client);

    // Set bot activity
    this.setBotActivity(client);

    // Setup health checks
    this.setupHealthChecks();

    // Update statistics
    await this.updateStartupStats(client);

    logger.info("Bot initialization complete");
  }

  async initializeServices(): Promise<void> {
    try {
      logger.info("Initializing post-ready services...");

      // Initialize services that require the bot to be connected
      // These will be implemented in later phases

      logger.info("Post-ready services initialized");
    } catch (error) {
      logger.error("Failed to initialize post-ready services:", error);
    }
  }

  async registerCommands(_client: ExtendedClient): Promise<void> {
    try {
      logger.info("Registering slash commands...");

      // Command registration will be implemented when commands are created
      // const commands = [
      //   StatusCommand.data,
      //   ConfigCommand.data,
      //   SearchCommand.data,
      //   ModelCommand.data,
      // ];

      // const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

      // // Register commands globally
      // await rest.put(
      //   Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
      //   { body: commands.map(cmd => cmd.toJSON()) }
      // );

      logger.info("Slash commands registered successfully");
    } catch (error) {
      logger.error("Failed to register slash commands:", error);
    }
  }

  setupHealthChecks(): void {
    logger.info("Setting up health checks...");

    // Health check interval
    setInterval(() => {
      this.performHealthCheck();
    }, MONITORING.HEALTH_CHECK_INTERVAL);

    // Initial health check
    this.performHealthCheck();
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsed = memoryUsage.heapUsed;

      // Check memory usage
      if (heapUsed > MONITORING.MEMORY_CRITICAL_THRESHOLD) {
        logger.error(
          `Critical memory usage: ${Math.round(heapUsed / 1024 / 1024)}MB`
        );
      } else if (heapUsed > MONITORING.MEMORY_WARNING_THRESHOLD) {
        logger.warn(
          `High memory usage: ${Math.round(heapUsed / 1024 / 1024)}MB`
        );
      }

      // Check database connection
      const stats = await configService.getStats();
      logger.debug("Health check passed", {
        memory: Math.round(heapUsed / 1024 / 1024),
        stats,
      });
    } catch (error) {
      logger.error("Health check failed:", error);
    }
  }

  logStartupInfo(data: ReadyData): void {
    logger.info("═══════════════════════════════════════════");
    logger.info(`${APP_INFO.NAME} v${APP_INFO.VERSION}`);
    logger.info("═══════════════════════════════════════════");
    logger.info(`Bot User: ${data.user.tag} (${data.user.id})`);
    logger.info(`Guilds: ${data.guilds}`);
    logger.info(`Node Version: ${process.version}`);
    logger.info(`Platform: ${process.platform}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(
      `Memory Usage: ${Math.round(
        process.memoryUsage().heapUsed / 1024 / 1024
      )}MB`
    );
    logger.info("═══════════════════════════════════════════");
  }

  private setBotActivity(client: ExtendedClient): void {
    if (!client.user) return;

    // Set custom status
    client.user.setPresence({
      activities: [
        {
          name: `${client.guilds.cache.size} servers | @mention for help`,
          type: ActivityType.Watching,
        },
      ],
      status: "online",
    });

    // Update activity every 5 minutes
    setInterval(() => {
      if (!client.user) return;

      const activities = [
        `${client.guilds.cache.size} servers | @mention for help`,
        `Powered by Gemini AI`,
        `v${APP_INFO.VERSION} | Search enabled`,
      ];

      const randomIndex = Math.floor(Math.random() * activities.length);
      const activity = activities[randomIndex]!;

      client.user?.setActivity(activity, { type: ActivityType.Playing });
    }, 5 * 60 * 1000);
  }

  private async updateStartupStats(client: ExtendedClient): Promise<void> {
    try {
      // Log startup in stats
      await configService.incrementStats("total_startups", 1);

      // Store current guild count
      await configService.incrementStats(
        "current_guilds",
        client.guilds.cache.size
      );

      logger.debug("Startup statistics updated");
    } catch (error) {
      logger.error("Failed to update startup statistics:", error);
    }
  }
}
