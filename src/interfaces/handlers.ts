// Event handler interfaces
import {
  ChatInputCommandInteraction,
  Message,
  SlashCommandBuilder,
} from "discord.js";
import {
  BotStatus,
  ConfigValue,
  ExtendedClient,
  InteractionContext,
  MessageContext,
  ModelInfo,
  ModelRateLimitStatus,
  ModelStats,
  ReadyData,
  SearchResponse,
  SystemMetrics,
} from "../types/index.js";

// Base event handler interface
export interface IEventHandler {
  name: string;
  once?: boolean;
  execute(client: ExtendedClient, ...args: unknown[]): Promise<void> | void;
}

// Message handler interface
export interface IMessageHandler extends IEventHandler {
  name: "messageCreate";
  execute(client: ExtendedClient, message: Message): Promise<void>;

  // Handler methods
  handleMentionResponse(
    message: Message,
    context: MessageContext
  ): Promise<void>;
  handleAutoResponse(message: Message, context: MessageContext): Promise<void>;
  shouldRespond(message: Message): Promise<boolean>;
  processAndRespond(message: Message, context: MessageContext): Promise<void>;
}

// Interaction handler interface
export interface IInteractionHandler extends IEventHandler {
  name: "interactionCreate";
  execute(
    client: ExtendedClient,
    interaction: ChatInputCommandInteraction
  ): Promise<void>;

  // Command routing
  routeCommand(interaction: ChatInputCommandInteraction): Promise<void>;
  handleCommandError(
    interaction: ChatInputCommandInteraction,
    error: Error
  ): Promise<void>;
}

// Ready handler interface
export interface IReadyHandler extends IEventHandler {
  name: "ready";
  once: true;
  execute(client: ExtendedClient): Promise<void>;

  // Initialization methods
  registerCommands(client: ExtendedClient): Promise<void>;
  initializeServices(): Promise<void>;
  setupHealthChecks(): void;
  logStartupInfo(data: ReadyData): void;
}

// Command handler interface
export interface ICommandHandler {
  // Command data
  data: SlashCommandBuilder;

  // Execute command
  execute(
    interaction: ChatInputCommandInteraction,
    context: InteractionContext
  ): Promise<void>;

  // Validation
  validateOptions?(options: Record<string, unknown>): boolean;

  // Permission check
  checkPermissions?(context: InteractionContext): Promise<boolean>;
}

// Status command handler
export interface IStatusCommandHandler extends ICommandHandler {
  // Get bot status
  getBotStatus(): Promise<BotStatus>;

  // Get rate limit status
  getRateLimitStatus(): Promise<ModelRateLimitStatus[]>;

  // Get system metrics
  getSystemMetrics(): Promise<SystemMetrics>;

  // Format status for display
  formatStatus(
    status: {
      bot: BotStatus;
      rateLimit: ModelRateLimitStatus[];
      system: SystemMetrics;
    },
    verbose: boolean
  ): string;
}

// Config command handler
export interface IConfigCommandHandler extends ICommandHandler {
  // Get configuration
  getConfig(
    key: string,
    context: InteractionContext
  ): Promise<ConfigValue | null>;

  // Set configuration
  setConfig(
    key: string,
    value: string,
    context: InteractionContext
  ): Promise<void>;

  // List configuration
  listConfig(context: InteractionContext): Promise<Record<string, ConfigValue>>;

  // Validate configuration
  validateConfig(key: string, value: string): boolean;
}

// Search command handler
export interface ISearchCommandHandler extends ICommandHandler {
  // Perform search
  performSearch(query: string, region?: string): Promise<SearchResponse>;

  // Check search availability
  checkAvailability(context: InteractionContext): Promise<boolean>;

  // Format search results
  formatResults(results: SearchResponse): string;
}

// Model command handler
export interface IModelCommandHandler extends ICommandHandler {
  // Get model info
  getModelInfo(modelName?: string): Promise<ModelInfo | null>;

  // List available models
  listModels(): Promise<string[]>;

  // Get model statistics
  getModelStats(): Promise<ModelStats>;

  // Format model info
  formatModelInfo(info: ModelInfo): string;
}

// Error handler interface
export interface IErrorHandler {
  // Handle different error types
  handleError(
    error: Error,
    context?: InteractionContext | MessageContext
  ): Promise<void>;
  handleDiscordError(
    error: Error,
    context: InteractionContext | MessageContext
  ): Promise<void>;
  handleAPIError(
    error: Error,
    context: InteractionContext | MessageContext
  ): Promise<void>;
  handleValidationError(
    error: Error,
    context: InteractionContext | MessageContext
  ): Promise<void>;

  // Error recovery
  attemptRecovery(error: Error): Promise<boolean>;

  // Error reporting
  reportError(
    error: Error,
    severity: "low" | "medium" | "high" | "critical"
  ): Promise<void>;
}

// Middleware interface for future extensibility
export interface IMiddleware {
  // Process before handler
  before?(context: InteractionContext | MessageContext): Promise<boolean>;

  // Process after handler
  after?(
    context: InteractionContext | MessageContext,
    result: unknown
  ): Promise<void>;

  // Error handling
  onError?(
    context: InteractionContext | MessageContext,
    error: Error
  ): Promise<void>;
}
