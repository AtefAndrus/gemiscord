// Gemini API service implementation

import { FunctionCallingConfigMode, GoogleGenAI, Tool } from "@google/genai";
import { IGeminiService } from "../interfaces/services.js";
import {
  DEFAULT_GENERATION_CONFIG,
  DEFAULT_SAFETY_SETTINGS,
  GEMINI_MODELS,
  GeminiFile,
  GeminiGenerateOptions,
  GeminiResponse,
  TokenUsage,
} from "../types/gemini.types.js";
import { APIError } from "../utils/errors.js";
import { discordLogger as logger } from "../utils/logger.js";
import { ConfigManager } from "./configManager.js";

export class GeminiService implements IGeminiService {
  private client: GoogleGenAI;
  private currentModel: string;
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    if (!process.env.GEMINI_API_KEY) {
      throw new APIError("GEMINI_API_KEY is not set");
    }

    this.configManager = configManager;
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    this.currentModel =
      this.configManager.getConfig().api.gemini.models.primary;

    logger.info("GeminiService initialized", {
      defaultModel: this.currentModel,
      modelsAvailable: Object.keys(GEMINI_MODELS),
    });
  }

  async initialize(): Promise<void> {
    try {
      // Test the client by attempting a simple call
      const testResponse = await this.client.models.generateContent({
        model: this.currentModel,
        contents: "Test connection",
      });

      logger.info("Gemini service initialized successfully", {
        model: this.currentModel,
        testResponseReceived: !!testResponse,
      });
    } catch (error) {
      logger.error("Failed to initialize Gemini service:", error);
      throw new APIError(
        "Failed to initialize Gemini service",
        undefined,
        undefined,
        error
      );
    }
  }

  async generateContent(
    options: GeminiGenerateOptions
  ): Promise<GeminiResponse> {
    try {
      // Build the prompt
      const prompt = this.buildPrompt(options);

      // Get function declarations if function calling is enabled
      const tools = options.functionCallingEnabled
        ? await this.getFunctionDeclarations()
        : [];

      // Prepare request configuration
      const requestConfig: any = {
        model: this.currentModel,
        contents: prompt,
        config: {
          generationConfig: {
            temperature:
              options.temperature || DEFAULT_GENERATION_CONFIG.temperature,
            maxOutputTokens:
              options.maxOutputTokens ||
              DEFAULT_GENERATION_CONFIG.maxOutputTokens,
          },
          safetySettings: DEFAULT_SAFETY_SETTINGS,
        },
      };

      // Add tools if function calling is enabled
      if (tools.length > 0) {
        requestConfig.config.tools = tools;
        requestConfig.config.toolConfig = {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.AUTO,
          },
        };
      }

      // Generate content
      const result = await this.client.models.generateContent(requestConfig);

      // Extract text and function calls
      const text = result.text || "";
      const functionCalls = result.functionCalls || undefined;

      // Extract usage statistics
      const usage = this.extractUsage(result);

      const geminiResponse: GeminiResponse = {
        text,
        functionCalls,
        usage,
        modelUsed: this.currentModel,
        cached: false, // TODO: Implement caching
      };

      logger.info("Gemini content generated", {
        model: this.currentModel,
        hasText: !!text,
        hasFunctionCalls: !!(functionCalls && functionCalls.length > 0),
        usage,
      });

      return geminiResponse;
    } catch (error) {
      logger.error("Error generating content:", error);
      throw this.handleGeminiError(error);
    }
  }

  async uploadFile(
    file: Buffer,
    mimeType: string,
    displayName: string
  ): Promise<GeminiFile> {
    try {
      // Convert Buffer to Blob for the API
      const blob = new Blob([file], { type: mimeType });

      const fileUploadResult = await this.client.files.upload({ file: blob });

      const geminiFile: GeminiFile = {
        name: fileUploadResult.name || "",
        displayName: fileUploadResult.displayName || displayName,
        mimeType: fileUploadResult.mimeType || mimeType,
        sizeBytes: fileUploadResult.sizeBytes || "0",
        createTime: fileUploadResult.createTime || "",
        updateTime: fileUploadResult.updateTime || "",
        uri: fileUploadResult.uri || "",
        state:
          (fileUploadResult.state as "PROCESSING" | "ACTIVE" | "FAILED") ||
          "ACTIVE",
        error: fileUploadResult.error
          ? {
              code: fileUploadResult.error.code || 0,
              message: fileUploadResult.error.message || "Unknown error",
            }
          : undefined,
      };

      logger.info("File uploaded to Gemini", {
        name: geminiFile.name,
        mimeType: geminiFile.mimeType,
        size: geminiFile.sizeBytes,
      });

      return geminiFile;
    } catch (error) {
      logger.error("Error uploading file:", error);
      throw this.handleGeminiError(error);
    }
  }

  async deleteFile(fileUri: string): Promise<void> {
    try {
      await this.client.files.delete({ name: fileUri });
      logger.info("File deleted from Gemini", { fileUri });
    } catch (error) {
      logger.error("Error deleting file:", error);
      throw this.handleGeminiError(error);
    }
  }

  getAvailableModels(): string[] {
    return Object.keys(GEMINI_MODELS);
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  switchModel(model: string): void {
    if (!GEMINI_MODELS[model]) {
      throw new APIError(`Unsupported model: ${model}`);
    }

    const previousModel = this.currentModel;
    this.currentModel = model;

    logger.info("Switched to new model", {
      previousModel,
      newModel: model,
    });
  }

  async executeFunction(
    name: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    try {
      switch (name) {
        case "count_characters":
          return this.executeCharacterCount(args);
        case "search_web":
          // This will be handled by the SearchService
          throw new APIError(
            "Search function should be handled by SearchService"
          );
        default:
          throw new APIError(`Unknown function: ${name}`);
      }
    } catch (error) {
      logger.error("Error executing function:", error);
      throw error;
    }
  }

  private buildPrompt(options: GeminiGenerateOptions): string {
    const parts = [];

    // Add system prompt
    if (options.systemPrompt) {
      parts.push(`システム指示: ${options.systemPrompt}`);
    }

    // Add user message
    parts.push(`ユーザーからのメッセージ: ${options.userMessage}`);

    // Add attachment information if present
    if (options.attachments && options.attachments.length > 0) {
      parts.push(
        `添付ファイル: ${options.attachments.length}個のファイルが添付されています`
      );
    }

    return parts.join("\n\n");
  }

  private async getFunctionDeclarations(): Promise<Tool[]> {
    const tools: Tool[] = [];

    // Always include character count function
    tools.push(this.configManager.getCharacterCountFunctionDeclaration());

    // Include search function if available
    // Note: This will be controlled by RateLimitService in the final integration
    tools.push(this.configManager.getSearchFunctionDeclaration());

    return tools;
  }

  private executeCharacterCount(args: Record<string, unknown>): unknown {
    const message = args.message as string;
    if (typeof message !== "string") {
      throw new APIError("Invalid message parameter for character count");
    }

    const characterCount = message.length;
    const isWithinDiscordLimit = characterCount <= 2000;
    const requiresCompression = characterCount > 2000;
    const estimatedMessagesIfSplit = Math.ceil(characterCount / 1900);

    return {
      character_count: characterCount,
      is_within_discord_limit: isWithinDiscordLimit,
      requires_compression: requiresCompression,
      estimated_messages_if_split: estimatedMessagesIfSplit,
    };
  }

  private extractUsage(result: any): TokenUsage | undefined {
    try {
      const usageMetadata = result.response.usageMetadata;
      if (!usageMetadata) return undefined;

      return {
        promptTokens: usageMetadata.promptTokenCount || 0,
        completionTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0,
      };
    } catch (error) {
      logger.warn("Failed to extract usage metadata:", error);
      return undefined;
    }
  }

  private handleGeminiError(error: unknown): APIError {
    if (error instanceof Error) {
      // Check for rate limit errors
      if (
        error.message.includes("429") ||
        error.message.includes("Rate limit")
      ) {
        return new APIError(
          "Gemini API rate limit exceeded",
          429,
          undefined,
          error
        );
      }

      // Check for quota errors
      if (error.message.includes("quota") || error.message.includes("QUOTA")) {
        return new APIError("Gemini API quota exceeded", 403, undefined, error);
      }

      // Check for authentication errors
      if (
        error.message.includes("401") ||
        error.message.includes("unauthorized")
      ) {
        return new APIError(
          "Gemini API authentication failed",
          401,
          undefined,
          error
        );
      }

      return new APIError(
        `Gemini API error: ${error.message}`,
        undefined,
        undefined,
        error
      );
    }

    return new APIError(
      "Unknown Gemini API error",
      undefined,
      undefined,
      error
    );
  }
}
