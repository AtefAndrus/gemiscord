# Gemini Discord Bot - Claude Code Implementation Guide v4.0

## Project Overview

A Discord bot that integrates Google's Gemini API with Function Calling and Brave Search API to provide intelligent conversational responses with seamless web search capabilities. The bot supports mention-based responses, channel-specific auto-responses, and sophisticated configuration management.

## 重要: 実装手順について

このプロジェクトの実装は、手戻りを防ぐために詳細に計画された `IMPLEMENTATION_PLAN.md` に従って進めてください。

### 実装の進め方

1. **必ず `IMPLEMENTATION_PLAN.md` を参照**: 各フェーズの実装前に計画を確認
2. **公式ドキュメントの確認**: 各ライブラリの最新仕様を把握してから実装
   - **重要**: 型情報を知らないので、ライブラリの公式ドキュメントを必ず確認し、型情報を確認してから実装してください
   - 既知のURLに記載がない場合は、作業を中断して確認方法を要請してください
3. **依存関係の順守**: 各タスクの前提条件を満たしてから着手
4. **テスト駆動**: 各フェーズ完了時に必ずテストを実施

### 現在の進捗管理

- TodoList ツールを使用して進捗を管理
- 各フェーズの開始時に必ずドキュメントを確認
- 完了したタスクは即座に completed にマーク

## Development Environment

- **Version Management**: mise (for managing Bun and other tool versions)
- **Project Directory**: Current directory (already created)
- **Source Control**: Git with GitHub for version control
- **Package Manager**: Bun's built-in package manager

## Tech Stack

- **Runtime**: Bun 1.2.15 (latest stable)
- **Language**: TypeScript (strict mode)
- **Discord API**: discord.js v14.19.3
- **AI API**: @google/genai (Gemini API with Function Calling)
- **Search API**: Brave Search API for web search capabilities
- **Storage**: keyv with @keyv/sqlite for dynamic configuration
- **Config Management**: YAML-based configuration files for static settings
- **Deployment**: Coolify (Docker-based PaaS)

## Architecture Overview

```
Discord Bot Architecture
├── Event Handlers (message events, slash commands)
├── Message Processing (sanitization, context building)
├── Configuration Management (YAML + keyv dual-layer)
├── Gemini API Service (Function Calling for search integration)
├── Rate Limit Management (local counters with TTL)
├── Response Management (character limit handling)
└── Search Integration (Brave Search via Function Calling)
```

## Key Features

### Response Modes

1. **Mention Response**: Responds when @mentioned (`@botname message`)
2. **Channel Response**: Auto-responds to all non-bot messages in configured channels

### Function Calling Integration

- **Seamless Search**: Gemini automatically determines when search is needed
- **Cost Effective**: 2,000 free queries/month, $3/1,000 additional queries
- **High Quality Results**: Independent Brave Search index
- **Auto-optimization**: Model intelligently decides search necessity based on context
- **Character Count Support**: Built-in character counting function for Discord limits
- **Dynamic Tool Management**: Functions can be enabled/disabled based on rate limits

### Message Handling

- **Character Limit Management**: Default 2000-character compression, configurable splitting
- **Smart Content Processing**: Placeholder-based mention sanitization
- **Multimodal Support**: Image attachments processed through Gemini File API
- **Secure Processing**: Comprehensive input sanitization and validation

### Configuration Management

- **Static Settings**: YAML files for prompts, API limits, constants
- **Dynamic Settings**: keyv database for user preferences, usage tracking
- **Environment Settings**: .env files for secrets and environment variables

### Rate Limit Management

- **Model Priority**: gemini-2.5-flash-preview-0520 → gemini-2.0-flash (both Function Calling compatible)
- **Local Counters**: Track RPM/TPM/RPD using keyv with TTL
- **Auto-switching**: Automatic model fallback when limits reached
- **Buffer Protection**: Switch at 80% capacity to prevent errors
- **Dynamic Tool Control**: Disable search function when rate limited

## Technical Constraints

### Gemini API Limits (Function Calling Compatible Models Only)

- gemini-2.5-flash-preview-0520: 10 RPM, 250K TPM, 500 RPD (primary)
- gemini-2.0-flash: 15 RPM, 1M TPM, 1500 RPD (fallback)

### Brave Search API Limits

- Free AI Plan: 2,000 queries/month free
- Paid Plans: Starting at $3/1,000 queries
- Authentication: X-Subscription-Token header with API key
- Endpoint: https://api.search.brave.com/res/v1/web/search

### Discord API Limits

- Message length: 2000 characters maximum (configurable handling)
- Rate limits: Follow Discord's rate limiting guidelines
- Embed limits: 25 fields, 6000 total characters

### Performance Requirements

- Message response time: < 5 seconds (including search)
- Slash command execution: < 3 seconds
- Memory usage: < 150MB during normal operation

## Implementation Priorities

### Phase 1: Core Foundation

1. Set up Bun 1.2.15 project with TypeScript strict mode (using mise)
2. Initialize Git repository and connect to GitHub
3. Implement YAML configuration management system
4. Basic Discord connection and message handling
5. keyv-based dynamic configuration storage
6. Basic error handling and logging
7. Message sanitization with placeholder system

### Phase 2: Function Calling Integration

1. Implement Gemini API client with Function Calling support
2. Integrate Brave Search API as Function Calling tool
3. Implement character count function for Discord limits
4. Implement mention-based and channel-based responses
5. Message processing and sanitization
6. Basic rate limiting with local counters

### Phase 3: Advanced Features

1. Complete slash command system (/status, /config, /search, /model)
2. Sophisticated rate limit management with auto-switching
3. Dynamic tool management (enable/disable functions)
4. 2000-character limit handling (compress/split modes)
5. Image attachment processing (File API)
6. Prompt hierarchy management (base + server + channel + temporary)
7. Usage monitoring and alerting system

### Phase 4: Production Readiness

1. Docker containerization for Coolify deployment
2. Production logging and monitoring
3. Performance optimization and testing
4. Health checks and graceful shutdown
5. Documentation and deployment automation

## File Structure

```
src/
├── bot.ts                    # Main bot entry point
├── commands/                 # Slash command implementations
│   ├── status.ts            # Bot status and rate limits
│   ├── config.ts            # Configuration management
│   ├── search.ts            # Search functionality management
│   └── model.ts             # Model information and stats
├── handlers/                 # Discord event handlers
│   ├── messageCreate.ts     # Message processing and responses
│   ├── interactionCreate.ts # Slash command handling
│   └── ready.ts             # Bot startup and initialization
├── services/                 # Core business logic
│   ├── configManager.ts     # YAML configuration file management
│   ├── config.ts            # Dynamic keyv configuration service
│   ├── gemini.ts            # Gemini API client with Function Calling
│   ├── braveSearch.ts       # Brave Search API integration
│   ├── rateLimit.ts         # Rate limiting and model switching
│   ├── functionCalling.ts   # Function Calling orchestration
│   ├── messageProcessor.ts  # Message sanitization and processing
│   ├── responseManager.ts   # Character limit and response handling
│   └── fileProcessor.ts     # File attachment processing
├── types/                   # TypeScript type definitions
│   ├── config.ts            # Configuration types
│   ├── gemini.ts            # Gemini API types
│   ├── search.ts            # Search-related types
│   └── response.ts          # Response handling types
└── utils/                   # Utility functions
    ├── logger.ts            # Logging utilities
    ├── constants.ts         # Application constants
    └── sanitizer.ts         # Input sanitization utilities

config/                      # Configuration files
├── bot-config.yaml         # Main configuration file
├── bot-config.dev.yaml     # Development environment config
├── bot-config.prod.yaml    # Production environment config
└── bot.sqlite              # Database file
```

## Environment Variables

```env
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_id

# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key

# Brave Search Configuration
BRAVE_SEARCH_API_KEY=your_brave_search_key

# Environment Configuration
NODE_ENV=development
LOG_LEVEL=INFO

# Database Configuration
DATABASE_URL=sqlite://config/bot.sqlite
```

## Development Setup

### Prerequisites

1. **mise**: Install mise for version management

   ```bash
   curl https://mise.run | sh
   ```

2. **Configure mise for the project**:

   ```bash
   mise use bun@1.2.15
   ```

3. **Initialize Git repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   # Connect to GitHub repository
   git remote add origin https://github.com/AtefAndrus/gemiscord.git
   git push -u origin main
   ```

### User Action Required

Before starting development, you need to:

1. **Discord Bot Setup**:

   - Go to https://discord.com/developers/applications
   - Create a new application
   - Go to Bot section and create a bot
   - Copy the Bot Token (for DISCORD_TOKEN)
   - Copy the Application ID (for DISCORD_CLIENT_ID)
   - Generate OAuth2 URL with permissions: Send Messages, Read Message History, Mention Everyone
   - Invite bot to your test server

2. **Gemini API Key**:

   - Go to https://makersuite.google.com/app/apikey
   - Create a new API key
   - Ensure Function Calling models are accessible

3. **Brave Search API Key**:

   - Go to https://api.search.brave.com/
   - Sign up for free plan (2,000 queries/month)
   - Get your API key

4. **GitHub Repository**:
   - Create a new repository named 'gemiscord'
   - Keep it private initially for API key safety

## Configuration Management

The bot uses a three-layer configuration system:

### 1. Static Configuration (YAML)

```yaml
# config/bot-config.yaml
prompts:
  base_system: |
    Fixed base system prompt defining bot personality...

function_calling:
  search_function:
    name: "search_web"
    description: "Search for latest information when needed"

  character_count_function:
    name: "count_characters"
    description: "Count characters in message for Discord limit checking"

response_handling:
  message_limit_strategy: "compress" # compress | split
  max_characters: 2000
  compress_instruction: "2000文字以内で簡潔に応答してください"
  split_options:
    max_length: 1900
    prefer_line_breaks: true

message_processing:
  mention_placeholder:
    user: "[ユーザー]"
    channel: "[チャンネル]"
    role: "[ロール]"

api:
  gemini:
    models:
      primary: "gemini-2.5-flash-preview-0520"
      fallback: "gemini-2.0-flash"
    rate_limits:
      # Model-specific rate limits...

constants:
  cache:
    ttl_minutes: # TTL settings...
```

### 2. Dynamic Configuration (keyv)

```typescript
// Guild-specific configuration
'guild:{guildId}:mention_enabled': boolean
'guild:{guildId}:response_channels': string[]
'guild:{guildId}:search_enabled': boolean
'guild:{guildId}:server_prompt': string
'guild:{guildId}:message_limit_strategy': 'compress' | 'split'

// Channel-specific configuration
'channel:{channelId}:channel_prompt': string

// Rate limiting (with TTL)
'ratelimit:{model}:rpm:{minute}': number     # TTL: 60 seconds
'ratelimit:{model}:tpm:{minute}': number     # TTL: 60 seconds
'ratelimit:{model}:rpd:{day}': number        # TTL: 24 hours

// Search usage tracking (with TTL)
'search:monthly_usage:{month}': number       # TTL: 30 days

// Usage statistics
'stats:total_requests': number
'stats:model_usage:{model}': number
'stats:search_usage': number
```

### 3. Environment Configuration (.env)

Secrets, API keys, and environment-specific variables.

## Function Calling Implementation

### Core Function Declarations

```typescript
const searchFunctionDeclaration = {
  name: "search_web",
  description: `Search for latest information when current knowledge is insufficient.

  Use for: latest news, weather, stock prices, recent events, technical updates
  Don't use for: general knowledge, basic concepts, programming fundamentals`,

  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query with specific, effective keywords",
      },
      region: {
        type: "string",
        enum: ["JP", "US", "global"],
        description: "Search region for localized results",
      },
    },
    required: ["query"],
  },
};

const characterCountFunctionDeclaration = {
  name: "count_characters",
  description:
    "Count characters in message to check Discord 2000-character limit",
  parameters: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "Message to count characters for",
      },
    },
    required: ["message"],
  },
};
```

### Dynamic Tool Management

```typescript
// Build tools array based on current limitations
const buildToolsArray = async () => {
  const tools = [characterCountFunctionDeclaration]; // Always available

  // Add search function if not rate limited
  const searchEnabled = await rateLimitService.isSearchAvailable();
  if (searchEnabled) {
    tools.push(searchFunctionDeclaration);
  }

  return tools;
};

// Function Calling Flow
const response = await geminiService.generateContent({
  model: availableModel,
  contents: [systemPrompt, userMessage],
  config: {
    tools: await buildToolsArray(),
    toolConfig: { functionCallingConfig: { mode: "AUTO" } },
  },
});
```

## Message Processing System

### Security Processing (Placeholder-based)

````typescript
const sanitizeMessage = (content: string): string => {
  return content
    .replace(/<@!?(\d+)>/g, "[ユーザー]") // User mentions
    .replace(/<#(\d+)>/g, "[チャンネル]") // Channel mentions
    .replace(/<@&(\d+)>/g, "[ロール]") // Role mentions
    .replace(/<a?:([^:]+):\d+>/g, ":$1:") // Custom emojis
    .replace(/```[\s\S]*?```/g, "[コードブロック]"); // Code blocks (prompt injection protection)
};
````

### Response Length Management

```typescript
const handleResponseLength = async (
  response: string,
  strategy: "compress" | "split"
) => {
  if (response.length <= 2000) {
    return [response];
  }

  if (strategy === "compress") {
    // Re-generate with compression instruction
    return [await regenerateCompressed(response)];
  } else {
    // Split into multiple messages
    return splitMessage(response, { maxLength: 1900, preferLineBreaks: true });
  }
};
```

## Security Considerations

### Message Sanitization

- Convert Discord IDs to safe placeholders: `[ユーザー]`, `[チャンネル]`, `[ロール]`
- Normalize custom emojis to text format
- Detect and prevent prompt injection attacks in code blocks
- Validate all Function Calling responses

### API Security

- Store API keys in environment variables only
- Implement rate limiting to prevent abuse
- Log security events and suspicious activity
- Validate all Function Calling responses
- Sanitize file uploads before processing

## Error Handling Patterns

### API Error Handling

```typescript
try {
  const response = await geminiService.generateContent(params);
  return response;
} catch (error) {
  if (error.status === 429) {
    // Rate limit: switch model or disable functions
    return await handleRateLimit(error);
  } else if (error.code === "FUNCTION_CALLING_ERROR") {
    // Function calling failed: fallback to direct response
    return await generateDirectResponse(userMessage);
  } else {
    logger.error("Gemini API error:", error);
    return "Sorry, I encountered an error. Please try again.";
  }
}
```

### Discord Error Handling

```typescript
try {
  const messages = await handleResponseLength(response, strategy);
  for (const msg of messages) {
    await message.reply(msg);
  }
} catch (error) {
  if (error.code === 50013) {
    // Missing permissions
    await message.author.send(
      "I need permission to send messages in that channel."
    );
  } else if (error.code === 50035) {
    // Message too long (fallback)
    await sendTruncatedMessage(message, response);
  }
}
```

## Common Implementation Patterns

### Configuration Access

```typescript
const configManager = new ConfigManager();
const basePrompt = configManager.getBaseSystemPrompt();
const searchFunction = configManager.getSearchFunctionDeclaration();
const responseStrategy = configManager.getResponseStrategy();
```

### Rate Limit Management

```typescript
const rateLimitService = new RateLimitService(keyv);
const availableModel = await rateLimitService.getAvailableModel();
const canMakeRequest = await rateLimitService.checkLimits(model);
await rateLimitService.updateCounters(model, usage);
```

### Prompt Building

```typescript
const promptBuilder = new PromptBuilder(configManager, configService);
const systemPrompt = await promptBuilder.buildSystemPrompt(
  guildId,
  channelId,
  temporaryInstructions
);
```

## Testing Strategy

1. **Unit Tests**: Test individual services and utilities
2. **Integration Tests**: Test Discord and Gemini API integrations
3. **Function Calling Tests**: Verify search and character count functions
4. **Rate Limit Tests**: Verify rate limiting and fallback behavior
5. **Security Tests**: Test message sanitization and prompt injection protection
6. **Response Handling Tests**: Test compress/split strategies

## Deployment Configuration

### Docker Configuration (Coolify)

- Health check endpoints for monitoring
- Graceful shutdown handling
- Environment variable configuration
- Volume mounts for persistent data

### Monitoring and Observability

1. **Logging**: Structured JSON logs for analysis
2. **Metrics**: API usage, response times, error rates
3. **Health Checks**: Service availability monitoring
4. **Alerts**: Rate limit warnings, error thresholds

## Key Implementation Notes

1. **Function Calling First**: Always prioritize Function Calling approach over manual logic
2. **Configuration Separation**: Keep static settings in YAML, dynamic in keyv, secrets in .env
3. **Error Recovery**: Implement comprehensive fallback strategies for all API failures
4. **Rate Limiting**: Proactive rate limit management to prevent API errors
5. **Security**: Sanitize all user inputs and validate all API responses
6. **Performance**: Optimize for < 5 second response times including search
7. **Maintainability**: Use TypeScript strict mode and comprehensive error handling
8. **Extensibility**: Design for future model additions and feature expansions

## Reference Documentation

- [Gemini API Function Calling](https://ai.google.dev/gemini-api/docs/function-calling)
- [Brave Search API](https://brave.com/search/api/)
- [discord.js Guide](https://discordjs.guide/)
- [Bun Documentation](https://bun.sh/docs)
- [keyv Documentation](https://github.com/jaredwray/keyv)
- [YAML Specification](https://yaml.org/spec/)

## 開発時の必須参照

1. **実装計画書**: `IMPLEMENTATION_PLAN.md` - 必ず最初に確認すること
2. **作業管理**: TodoList ツールで現在のタスクを常に把握
3. **ドキュメント**: 各フェーズの必須ドキュメントリストを確認してから実装開始

---

**Implementation Status**: Ready for development
**Last Updated**: June 3, 2025
**Version**: 4.0
