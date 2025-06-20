// YAML configuration management service

import { Tool, Type } from "@google/genai";
import { readFile } from "fs/promises";
import { isAbsolute, join } from "path";
import { parse } from "yaml";
import { IConfigManager } from "../interfaces/services.js";
import {
  MessageLimitStrategy,
  ModelConfig,
  YAMLConfig,
} from "../types/index.js";
import { ENV } from "../utils/constants.js";
import { ConfigurationError } from "../utils/errors.js";
import { configLogger as logger } from "../utils/logger.js";

export class ConfigManager implements IConfigManager {
  private config: YAMLConfig | null = null;
  private configPath: string;
  private readonly baseConfigFile = "bot-config.yaml";

  constructor(configDir: string = "config") {
    this.configPath = isAbsolute(configDir)
      ? configDir
      : join(process.cwd(), configDir);
  }

  async loadConfig(): Promise<void> {
    try {
      logger.info("Loading configuration files...");

      // Load base configuration
      const baseConfig = await this.loadConfigFile(this.baseConfigFile);

      // Load environment-specific configuration
      const envConfigFile = `bot-config.${ENV.NODE_ENV}.yaml`;
      let envConfig: Partial<YAMLConfig> = {};

      try {
        envConfig = await this.loadConfigFile(envConfigFile);
        logger.info(`Loaded environment config: ${envConfigFile}`);
      } catch (error) {
        logger.debug(`No environment-specific config found: ${envConfigFile}`);
      }

      // Merge configurations (env config overrides base config)
      this.config = this.mergeConfigs(baseConfig, envConfig);

      logger.info("Configuration loaded successfully");
      this.validateConfig();
    } catch (error) {
      logger.error("Failed to load configuration", error);
      throw new ConfigurationError(
        "Failed to load configuration files",
        undefined,
        this.configPath
      );
    }
  }

  private async loadConfigFile(fileName: string): Promise<YAMLConfig> {
    const filePath = join(this.configPath, fileName);

    try {
      const content = await readFile(filePath, "utf-8");
      const parsed = parse(content) as YAMLConfig;

      if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid YAML structure");
      }

      return parsed;
    } catch (error) {
      throw new ConfigurationError(
        `Failed to load config file: ${fileName}`,
        undefined,
        filePath
      );
    }
  }

  private mergeConfigs(
    base: YAMLConfig,
    override: Partial<YAMLConfig>
  ): YAMLConfig {
    // Deep merge configuration objects
    return {
      prompts: {
        ...base.prompts,
        ...override.prompts,
      },
      function_calling: {
        ...base.function_calling,
        ...override.function_calling,
        search_function: {
          ...base.function_calling.search_function,
          ...override.function_calling?.search_function,
        },
        character_count_function: {
          ...base.function_calling.character_count_function,
          ...override.function_calling?.character_count_function,
        },
      },
      response_handling: {
        ...base.response_handling,
        ...override.response_handling,
        split_options: {
          ...base.response_handling.split_options,
          ...override.response_handling?.split_options,
        },
      },
      message_processing: {
        ...base.message_processing,
        ...override.message_processing,
        mention_placeholder: {
          ...base.message_processing.mention_placeholder,
          ...override.message_processing?.mention_placeholder,
        },
      },
      api: {
        gemini: {
          ...base.api.gemini,
          ...override.api?.gemini,
          models: {
            ...base.api.gemini.models,
            ...override.api?.gemini?.models,
          },
          rate_limits: {
            ...base.api.gemini.rate_limits,
            ...override.api?.gemini?.rate_limits,
          },
        },
        brave_search: {
          ...base.api.brave_search,
          ...override.api?.brave_search,
          rate_limits: {
            ...base.api.brave_search.rate_limits,
            ...override.api?.brave_search?.rate_limits,
          },
        },
      },
      constants: {
        cache: {
          ttl_minutes: {
            ...base.constants.cache.ttl_minutes,
            ...override.constants?.cache?.ttl_minutes,
          },
        },
      },
      // UI/UX configuration
      ui: {
        activity: {
          ...base.ui?.activity,
          ...override.ui?.activity,
          messages:
            override.ui?.activity?.messages ||
            base.ui?.activity?.messages ||
            [],
        },
        messaging: {
          ...base.ui?.messaging,
          ...override.ui?.messaging,
        },
        emojis: {
          ...base.ui?.emojis,
          ...override.ui?.emojis,
        },
        commands: {
          ephemeral: {
            ...base.ui?.commands?.ephemeral,
            ...override.ui?.commands?.ephemeral,
          },
        },
      },
      // Search configuration
      search: {
        defaults: {
          ...base.search?.defaults,
          ...override.search?.defaults,
        },
        validation: {
          query: {
            ...base.search?.validation?.query,
            ...override.search?.validation?.query,
          },
        },
        formatting: {
          ...base.search?.formatting,
          ...override.search?.formatting,
        },
      },
      // AI configuration
      ai: {
        ...base.ai,
        ...override.ai,
      },
      // Monitoring configuration
      monitoring: {
        thresholds: {
          usage: {
            ...base.monitoring?.thresholds?.usage,
            ...override.monitoring?.thresholds?.usage,
          },
          memory: {
            ...base.monitoring?.thresholds?.memory,
            ...override.monitoring?.thresholds?.memory,
          },
        },
        intervals: {
          ...base.monitoring?.intervals,
          ...override.monitoring?.intervals,
        },
      },
      // Logging configuration
      logging: {
        file: {
          ...base.logging?.file,
          ...override.logging?.file,
        },
        rotation: {
          ...base.logging?.rotation,
          ...override.logging?.rotation,
        },
        performance: {
          ...base.logging?.performance,
          ...override.logging?.performance,
        },
      },
      // Rate limiting configuration
      rate_limiting: {
        ...base.rate_limiting,
        ...override.rate_limiting,
        time_windows: {
          ...base.rate_limiting?.time_windows,
          ...override.rate_limiting?.time_windows,
        },
      },
    };
  }

  private validateConfig(): void {
    if (!this.config) {
      throw new ConfigurationError("Configuration not loaded");
    }

    // Validate required fields
    const requiredPaths = [
      "prompts.base_system",
      "function_calling.search_function.name",
      "function_calling.character_count_function.name",
      "response_handling.message_limit_strategy",
      "api.gemini.models.models",
    ];

    for (const path of requiredPaths) {
      const value = this.getNestedValue(this.config, path);
      if (!value) {
        throw new ConfigurationError(`Missing required configuration: ${path}`);
      }
    }

    // Validate message limit strategy
    const validStrategies: MessageLimitStrategy[] = ["compress", "split"];
    if (
      !validStrategies.includes(
        this.config.response_handling.message_limit_strategy
      )
    ) {
      throw new ConfigurationError(
        'Invalid message_limit_strategy. Must be "compress" or "split"'
      );
    }

    // Validate models array
    const models = this.config.api.gemini.models.models;
    if (!Array.isArray(models) || models.length === 0) {
      throw new ConfigurationError(
        "api.gemini.models.models must be a non-empty array of model names"
      );
    }

    // Validate each model name is a non-empty string
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      if (typeof model !== "string" || model.trim() === "") {
        throw new ConfigurationError(
          `Invalid model at index ${i}: must be a non-empty string`
        );
      }
    }

    logger.debug("Configuration validation passed");
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split(".").reduce((current, key) => {
      if (current && typeof current === "object" && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  getConfig(): YAMLConfig {
    if (!this.config) {
      throw new ConfigurationError(
        "Configuration not loaded. Call loadConfig() first."
      );
    }
    return this.config;
  }

  getBaseSystemPrompt(): string {
    return this.getConfig().prompts.base_system;
  }

  getSearchFunctionDeclaration(): Tool {
    const config = this.getConfig().function_calling.search_function;
    return {
      functionDeclarations: [
        {
          name: config.name,
          description: config.description,
          parameters: {
            type: Type.OBJECT,
            properties: {
              query: {
                type: Type.STRING,
                description: "Search query with specific, effective keywords",
              },
              region: {
                type: Type.STRING,
                enum: ["JP", "US", "global"],
                description: "Search region for localized results",
              },
            },
            required: ["query"],
          },
        },
      ],
    };
  }

  getCharacterCountFunctionDeclaration(): Tool {
    const config = this.getConfig().function_calling.character_count_function;
    return {
      functionDeclarations: [
        {
          name: config.name,
          description: config.description,
          parameters: {
            type: Type.OBJECT,
            properties: {
              message: {
                type: Type.STRING,
                description: "Message to count characters for",
              },
            },
            required: ["message"],
          },
        },
      ],
    };
  }

  getResponseStrategy(): MessageLimitStrategy {
    return this.getConfig().response_handling.message_limit_strategy;
  }

  getModelConfig(model: string): ModelConfig {
    const config = this.getConfig();
    const rateLimit = config.api.gemini.rate_limits[model];

    if (!rateLimit) {
      throw new ConfigurationError(
        `No configuration found for model: ${model}`
      );
    }

    return {
      model: model,
      enabled: true,
      rateLimits: rateLimit,
    };
  }

  getCacheTTL(key: string): number {
    const ttlMinutes = this.getConfig().constants.cache.ttl_minutes;
    const ttl = (ttlMinutes as Record<string, number>)[key];

    if (typeof ttl !== "number") {
      logger.warn(`No cache TTL found for key: ${key}, using default`);
      return 60 * 60 * 1000; // Default to 60 minutes in milliseconds
    }

    return ttl * 60 * 1000; // Convert minutes to milliseconds
  }

  async reloadConfig(): Promise<void> {
    logger.info("Reloading configuration...");
    this.config = null;
    await this.loadConfig();
  }

  /**
   * Get ephemeral setting for a specific command type
   */
  getEphemeralSetting(commandType: string): boolean {
    const config = this.getConfig();
    const ephemeralConfig = config.ui.commands.ephemeral;

    // Check specific command type settings
    switch (commandType) {
      case "config":
        return ephemeralConfig.config_commands ?? ephemeralConfig.default;
      case "status":
        return ephemeralConfig.status_commands ?? ephemeralConfig.default;
      case "search":
        return ephemeralConfig.search_commands ?? ephemeralConfig.default;
      case "model":
        return ephemeralConfig.model_commands ?? ephemeralConfig.default;
      default:
        return ephemeralConfig.default;
    }
  }

  /**
   * Check if admin-only commands should always be ephemeral
   */
  isAdminCommandsEphemeral(): boolean {
    return this.getConfig().ui.commands.ephemeral.admin_only;
  }
}
