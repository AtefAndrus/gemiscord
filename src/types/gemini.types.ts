// Gemini API type definitions
import {
  Content,
  FunctionCall,
  GenerationConfig,
  HarmBlockThreshold,
  HarmCategory,
  SafetySetting,
  Tool,
  ToolConfig,
} from "@google/genai";

// Import official types when needed (currently available but unused)
// import { FunctionDeclaration, Schema, FunctionCallingConfigMode } from "@google/genai";

// TODO: Replace custom FunctionDeclaration with official type when implementing function calling
export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<
      string,
      {
        type: string;
        description: string;
        enum?: string[];
      }
    >;
    required?: string[];
  };
}

// Extended Gemini types
export interface GeminiConfig {
  model: string;
  apiKey: string;
  generationConfig?: GenerationConfig;
  safetySettings?: SafetySetting[];
}

// Function calling specific types
export interface FunctionCallingConfig {
  tools: Tool[];
  toolConfig?: ToolConfig;
}

// Search function types
export interface SearchFunctionCall {
  name: "search_web";
  args: {
    query: string;
    region?: "JP" | "US" | "global";
  };
}

// Character count function types
export interface CharacterCountFunctionCall {
  name: "count_characters";
  args: {
    message: string;
  };
}

export type SupportedFunctionCall =
  | SearchFunctionCall
  | CharacterCountFunctionCall;

// Function response types
export interface SearchFunctionResponse {
  results: SearchResult[];
  query: string;
  region: string;
  timestamp: string;
}

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  publishedDate?: string;
}

export interface CharacterCountResponse {
  character_count: number;
  is_within_discord_limit: boolean;
  requires_compression: boolean;
  estimated_messages_if_split: number;
}

// Gemini service types
export interface GeminiGenerateOptions {
  model: string;
  systemPrompt: string;
  userMessage: string;
  attachments?: GeminiAttachment[];
  functionCallingEnabled?: boolean;
  previousMessages?: Content[];
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GeminiAttachment {
  mimeType: string;
  data: string; // base64 encoded
  name?: string;
}

export interface GeminiResponse {
  text: string;
  functionCalls?: FunctionCall[];
  usage?: TokenUsage;
  modelUsed: string;
  cached: boolean;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Rate limiting types
export interface ModelRateLimitStatus {
  model: string;
  rpm: {
    current: number;
    limit: number;
    resetAt: Date;
  };
  tpm: {
    current: number;
    limit: number;
    resetAt: Date;
  };
  rpd: {
    current: number;
    limit: number;
    resetAt: Date;
  };
  isAvailable: boolean;
  switchThreshold: number; // Percentage at which to switch models
}

// Model information
export interface ModelInfo {
  name: string;
  displayName: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsFunctionCalling: boolean;
  supportsImages: boolean;
  rateLimit: {
    rpm: number;
    tpm: number;
    rpd: number;
  };
}

// Available models configuration
export const GEMINI_MODELS: Record<string, ModelInfo> = {
  "gemini-2.5-flash-preview-05-20": {
    name: "gemini-2.5-flash-preview-05-20",
    displayName: "Gemini 2.5 Flash Preview",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    supportsFunctionCalling: true,
    supportsImages: true,
    rateLimit: {
      rpm: 10,
      tpm: 250000,
      rpd: 500,
    },
  },
  "gemini-2.0-flash": {
    name: "gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    supportsFunctionCalling: true,
    supportsImages: true,
    rateLimit: {
      rpm: 15,
      tpm: 1000000,
      rpd: 1500,
    },
  },
};

// Error types
export interface GeminiError extends Error {
  code?: string;
  status?: number;
  details?: unknown;
}

// File API types
export interface GeminiFile {
  name: string;
  displayName?: string;
  mimeType: string;
  sizeBytes: string;
  createTime: string;
  updateTime: string;
  uri: string;
  state: "PROCESSING" | "ACTIVE" | "FAILED";
  error?: {
    code: number;
    message: string;
  };
}

// Safety and filtering
export const DEFAULT_SAFETY_SETTINGS: SafetySetting[] = [
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

// Generation configuration defaults
export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  temperature: 0.9,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
};
