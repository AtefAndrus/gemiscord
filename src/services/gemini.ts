// Gemini API service implementation

import { FunctionCallingConfigMode, GoogleGenAI, Tool } from "@google/genai";
import { IGeminiService } from "../interfaces/services.js";
import {
  DEFAULT_GENERATION_CONFIG,
  DEFAULT_SAFETY_SETTINGS,
  GEMINI_MODELS,
  GeminiContent,
  GeminiContentPart,
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
  private responseCache: Map<
    string,
    { response: GeminiResponse; timestamp: number }
  > = new Map();

  constructor(configManager: ConfigManager) {
    if (!process.env.GEMINI_API_KEY) {
      throw new APIError("GEMINI_API_KEY is not set");
    }

    this.configManager = configManager;
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const models = this.configManager.getConfig().api.gemini.models.models;
    if (!models || models.length === 0) {
      throw new Error("No models configured in api.gemini.models.models");
    }
    const firstModel = models[0];
    if (!firstModel) {
      throw new Error("First model in configuration is invalid");
    }
    this.currentModel = firstModel;

    logger.info("GeminiService initialized", {
      defaultModel: this.currentModel,
      modelsAvailable: this.configManager.getConfig().api.gemini.models.models,
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
      // Create cache key for this request
      const cacheKey = this.createCacheKey(options);

      // Check cache first if function calling is not enabled (to avoid stale search results)
      if (!options.functionCallingEnabled) {
        const cachedResponse = this.getCachedResponse(cacheKey);
        if (cachedResponse) {
          logger.debug("Returning cached Gemini response", {
            cacheKey,
            model: this.currentModel,
          });
          return cachedResponse;
        }
      }

      // Build the prompt
      const prompt = this.buildPrompt(options);

      // Get function declarations if function calling is enabled
      const tools = options.functionCallingEnabled
        ? await this.getFunctionDeclarations()
        : [];

      // Prepare request configuration
      const requestConfig: any = {
        model: this.currentModel,
        contents: typeof prompt === "string" ? prompt : prompt,
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

        // Debug log the actual request config being sent to Gemini
        logger.debug("Gemini request with tools", {
          model: requestConfig.model,
          hasTools: true,
          toolsCount: tools.length,
          toolNames: tools
            .map((tool) =>
              tool.functionDeclarations?.map((decl) => decl.name).join(", ")
            )
            .filter(Boolean),
          functionCallingMode: FunctionCallingConfigMode.AUTO,
          promptLength: requestConfig.contents?.length || 0,
          actualPrompt: requestConfig.contents, // Log actual prompt being sent
        });

        // Also log the actual tools structure
        logger.debug("Gemini tools structure", {
          tools: tools.map((tool) => ({
            functionDeclarations: tool.functionDeclarations?.map((decl) => ({
              name: decl.name,
              description: decl.description,
              parametersType: decl.parameters?.type,
              requiredParams: decl.parameters?.required,
            })),
          })),
        });
      } else {
        logger.debug("Gemini request without tools", {
          model: requestConfig.model,
          hasTools: false,
          functionCallingEnabled: options.functionCallingEnabled,
        });
      }

      // Generate content
      const result = await this.client.models.generateContent(requestConfig);

      // Extract text and function calls
      const text = result.text || "";
      const functionCalls = result.functionCalls || undefined;

      // Extract usage statistics
      const usage = this.extractUsage(result);

      // Debug: Log result structure for troubleshooting (only in development)
      if (process.env.NODE_ENV === "development") {
        logger.debug("Gemini API response structure:", {
          resultKeys: Object.keys(result || {}),
          hasUsageMetadata: !!result?.usageMetadata,
          hasText: !!result?.text,
          hasFunctionCalls: !!(
            result?.functionCalls && result.functionCalls.length > 0
          ),
        });
      }

      const geminiResponse: GeminiResponse = {
        text,
        functionCalls,
        usage,
        modelUsed: this.currentModel,
        cached: false,
      };

      // Cache the response if function calling is not enabled (to avoid stale search results)
      if (!options.functionCallingEnabled) {
        this.setCachedResponse(cacheKey, geminiResponse);
      }

      logger.info("Gemini content generated", {
        model: this.currentModel,
        hasText: !!text,
        hasFunctionCalls: !!(functionCalls && functionCalls.length > 0),
        usage,
        cached: false,
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
    const config = this.configManager.getConfig();
    const availableModels = config?.api?.gemini?.models?.models;

    if (!availableModels || !availableModels.includes(model)) {
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

  private createCacheKey(options: GeminiGenerateOptions): string {
    // Create a cache key based on system prompt, user message, and model
    const keyComponents = [
      this.currentModel,
      options.systemPrompt || "",
      options.userMessage,
      options.temperature || "default",
      options.maxOutputTokens || "default",
    ];

    // Create a UTF-8 safe hash of the components
    const keyString = keyComponents.join("|");

    // Use a simple hash function that works with UTF-8 characters
    let hash = 0;
    for (let i = 0; i < keyString.length; i++) {
      const char = keyString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert to positive hex string
    return Math.abs(hash).toString(16).padStart(8, "0");
  }

  private getCachedResponse(cacheKey: string): GeminiResponse | null {
    const cached = this.responseCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    // Use 10 minutes as default cache TTL for AI responses
    const ttlMinutes = 10;
    const ttlMs = ttlMinutes * 60 * 1000;
    const isExpired = Date.now() - cached.timestamp > ttlMs;

    if (isExpired) {
      this.responseCache.delete(cacheKey);
      return null;
    }

    // Return a copy with cached flag set to true
    return {
      ...cached.response,
      cached: true,
    };
  }

  private setCachedResponse(cacheKey: string, response: GeminiResponse): void {
    const maxCacheSize = 100; // Limit cache size to prevent memory issues

    // Clean up expired entries if cache is getting large
    if (this.responseCache.size >= maxCacheSize) {
      this.cleanupExpiredCache();
    }

    // If still too large, remove oldest entries
    if (this.responseCache.size >= maxCacheSize) {
      const entriesToRemove = this.responseCache.size - maxCacheSize + 1;
      const keys = Array.from(this.responseCache.keys());
      for (let i = 0; i < entriesToRemove; i++) {
        const key = keys[i];
        if (key) {
          this.responseCache.delete(key);
        }
      }
    }

    this.responseCache.set(cacheKey, {
      response: { ...response },
      timestamp: Date.now(),
    });

    logger.debug("Cached Gemini response", {
      cacheKey,
      cacheSize: this.responseCache.size,
    });
  }

  private cleanupExpiredCache(): void {
    // Use 10 minutes as default cache TTL for AI responses
    const ttlMinutes = 10;
    const ttlMs = ttlMinutes * 60 * 1000;
    const now = Date.now();

    for (const [key, cached] of this.responseCache.entries()) {
      if (now - cached.timestamp > ttlMs) {
        this.responseCache.delete(key);
      }
    }
  }

  private buildPrompt(
    options: GeminiGenerateOptions
  ): string | GeminiContent[] {
    // If no attachments, return simple string for backward compatibility
    if (!options.attachments || options.attachments.length === 0) {
      const parts = [];

      // Add system prompt
      if (options.systemPrompt) {
        parts.push(`システム指示: ${options.systemPrompt}`);
      }

      // Add user message
      parts.push(`ユーザーからのメッセージ: ${options.userMessage}`);

      const prompt = parts.join("\n\n");

      // Debug log the final prompt when function calling is enabled
      if (options.functionCallingEnabled) {
        logger.debug("Gemini prompt for function calling", {
          systemPromptLength: options.systemPrompt?.length || 0,
          userMessageLength: options.userMessage?.length || 0,
          totalPromptLength: prompt.length,
          userMessage: options.userMessage,
          functionCallingEnabled: options.functionCallingEnabled,
        });

        // Add extra emphasis for weather queries
        if (
          options.userMessage?.includes("天気") ||
          options.userMessage?.includes("weather")
        ) {
          logger.warn(
            "WEATHER QUERY DETECTED - Function calling should be triggered",
            {
              userMessage: options.userMessage,
              systemPromptContainsFunctionInstruction:
                options.systemPrompt?.includes("search_web"),
            }
          );
        }
      }

      return prompt;
    }

    // Build Content[] format for requests with attachments
    const contentParts: GeminiContentPart[] = [];

    // Add text content
    const textParts = [];
    if (options.systemPrompt) {
      textParts.push(`システム指示: ${options.systemPrompt}`);
    }
    textParts.push(`ユーザーからのメッセージ: ${options.userMessage}`);

    contentParts.push({
      text: textParts.join("\n\n"),
    });

    // Add attachment parts
    for (const attachment of options.attachments) {
      if (attachment.fileData) {
        contentParts.push({
          fileData: {
            mimeType: attachment.fileData.mimeType,
            fileUri: attachment.fileData.fileUri,
          },
        });
      } else if (attachment.inlineData) {
        contentParts.push({
          inlineData: {
            mimeType: attachment.inlineData.mimeType,
            data: attachment.inlineData.data,
          },
        });
      }
    }

    logger.debug("Built structured content with attachments", {
      contentPartsCount: contentParts.length,
      attachmentCount: options.attachments.length,
      hasSystemPrompt: !!options.systemPrompt,
      userMessageLength: options.userMessage?.length || 0,
    });

    return [
      {
        role: "user",
        parts: contentParts,
      },
    ];
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
      // Try different possible paths for usage metadata in Gemini API response
      let usageMetadata = result.usageMetadata || result.usage;

      if (!usageMetadata) {
        logger.debug("No usage metadata found in response", {
          responseKeys: Object.keys(result || {}),
          hasUsageMetadata: !!result?.usageMetadata,
        });
        return undefined;
      }

      return {
        promptTokens:
          usageMetadata.promptTokenCount || usageMetadata.prompt_tokens || 0,
        completionTokens:
          usageMetadata.candidatesTokenCount ||
          usageMetadata.completion_tokens ||
          0,
        totalTokens:
          usageMetadata.totalTokenCount || usageMetadata.total_tokens || 0,
      };
    } catch (error) {
      logger.warn("Failed to extract usage metadata:", {
        error: error instanceof Error ? error.message : String(error),
        responseStructure: result ? Object.keys(result) : "null/undefined",
      });
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
