# Gemiscord Technical Specification

## Overview

Gemiscord is a Discord bot that integrates Google's Gemini AI with automated web search capabilities. The bot provides natural language conversation with context-aware responses, automatic web search when needed, and comprehensive administrative commands.

## Architecture

### Core Components

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Discord Bot   │◄──►│  Message        │◄──►│  AI Services    │
│   (discord.js)  │    │  Processing     │    │  (Gemini API)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Slash Commands │    │  Configuration  │    │  Search Service │
│  (/status, etc) │    │  Management     │    │  (Brave Search) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

| Component      | Technology          | Version  | Purpose                                |
| -------------- | ------------------- | -------- | -------------------------------------- |
| Runtime        | Bun                 | 1.2.15+  | JavaScript runtime and package manager |
| Language       | TypeScript          | 5.8.3    | Type-safe development                  |
| Discord API    | discord.js          | 14.20.0  | Discord bot integration                |
| AI Integration | @google/genai       | 1.5.1    | Gemini API client                      |
| Configuration  | keyv + @keyv/sqlite | 5.3.4    | Dynamic configuration storage          |
| Search API     | Brave Search API    | v1       | Web search capabilities                |
| Testing        | Bun Test            | built-in | Native test runner                     |

## Features

### 1. AI Chat Integration

- **Natural Conversations**: Direct conversation with Gemini AI
- **Function Calling**: Automatic decision-making for tool usage
- **Model Switching**: Automatic fallback between Gemini models
- **Rate Limiting**: Smart quota management and model switching

### 2. Web Search Integration

- **Automatic Search**: AI decides when web search is needed
- **Content Extraction**: Fetches and processes web page content
- **Quota Management**: Tracks and manages Brave Search API usage
- **Regional Support**: JP/US/global search regions

### 3. Message Processing

- **Mention Responses**: Responds when mentioned
- **Auto-Response Channels**: Configurable channels for mention-free chat
- **Message Sanitization**: Safe handling of Discord mentions and content
- **Long Message Handling**: Automatic splitting for Discord's 2000 character limit

### 4. Administrative Commands

#### `/status` - System Status

- Bot uptime and performance metrics
- API usage statistics (Gemini, Brave Search)
- Memory and system resource usage
- Database connectivity status

#### `/config` - Configuration Management

- **Mention Settings**: Enable/disable mention responses
- **Channel Management**: Add/remove auto-response channels
- **Custom Prompts**: Server-specific AI behavior
- **Message Strategy**: Configure message splitting/compression

#### `/search` - Search Management

- **Toggle**: Enable/disable search functionality
- **Quota Monitoring**: View usage and remaining quota
- **Test Functionality**: Verify search integration
- **Usage Reset**: Administrative quota reset

#### `/model` - AI Model Management

- **Model Information**: Current active models and capabilities
- **Usage Statistics**: Token usage and request statistics
- **Rate Limit Status**: Current limits and reset times
- **Model Switching**: Set preferred model for the guild

## Configuration System

### Static Configuration (YAML)

**File**: `config/bot-config.yaml`

```yaml
api:
  gemini:
    models:
      # Priority order - models are tried in sequence (first = highest priority)
      models:
        - "gemini-2.5-flash"
        - "gemini-2.0-flash"
        - "gemini-2.5-flash-lite-preview-06-17"
    rate_limits:
      "gemini-2.5-flash":
        rpm: 10
        tpm: 250000
        rpd: 500
      "gemini-2.0-flash":
        rpm: 15
        tpm: 1000000
        rpd: 1500
      "gemini-2.5-flash-lite-preview-06-17":
        rpm: 15
        tpm: 250000
        rpd: 500
  brave_search:
    free_quota: 2000
    regions: ["JP", "US", "global"]

# UI/UX configuration
ui:
  commands:
    ephemeral:
      default: false # All commands ephemeral by default
      admin_only: false # Admin commands always ephemeral
      config_commands: false # /config command visible to channel
      status_commands: false # /status command visible to channel
      search_commands: false # /search command ephemeral
      model_commands: false # /model command ephemeral

prompts:
  system: "You are a helpful Discord AI assistant..."

function_calling:
  search_web:
    name: "search_web"
    description: "Search the web for current information"
    parameters:
      query: { type: "string", required: true }
      region: { type: "string", default: "JP" }

  count_characters:
    name: "count_characters"
    description: "Count characters in text"
    parameters:
      text: { type: "string", required: true }
```

### Dynamic Configuration (SQLite)

**Database**: `config/bot.sqlite`

```typescript
interface GuildConfig {
  mention_enabled: boolean; // @bot responses
  response_channels: string[]; // Auto-response channel IDs
  search_enabled: boolean; // Web search functionality
  server_prompt?: string; // Custom server prompt
  message_limit_strategy: "compress" | "split";
  preferred_model?: string; // Guild-specific preferred AI model
}

interface ChannelConfig {
  channel_prompt?: string; // Channel-specific prompts
}
```

## API Integration

### Gemini AI API

**Models Used**:

- Primary: `gemini-2.0-flash` (high performance)
- Fallback: `gemini-1.5-flash` (rate limit fallback)

**Function Calling**:

- `search_web`: Triggers web search when current information needed
- `count_characters`: Provides text analysis capabilities

**Rate Limits**:

- Automatic model switching at 80% quota usage
- Token usage tracking and optimization
- Error handling and graceful degradation

### Brave Search API

**Capabilities**:

- Real-time web search results
- Content extraction from web pages
- Regional search (Japan, US, Global)
- Quota tracking (2000 free searches/month)

**Integration**:

- Automatic query enhancement for better results
- Content processing and summarization
- Source attribution in responses

## Data Storage

### Configuration Database

**Type**: SQLite with keyv abstraction
**Location**: `config/bot.sqlite`
**Purpose**: Guild-specific settings, usage statistics, rate limit counters

### File Logging

**Location**: `logs/` directory
**Format**: Structured logging with rotation
**Features**:

- Daily log rotation
- Error separation
- JSON format support
- Automatic cleanup

## Security

### Permissions

- **Admin-Only Commands**: All slash commands require Administrator permission
- **Guild-Only**: Commands only work within Discord servers
- **Input Sanitization**: Safe handling of user input and Discord mentions

### API Security

- **Environment Variables**: Secure API key storage
- **Rate Limiting**: Prevents API abuse
- **Error Handling**: Secure error messages without exposing internals

## Performance

### Benchmarks

- **Test Suite**: 146+ tests, ~400ms execution time
- **Memory Usage**: <150MB in production
- **Response Time**: <5s for AI responses, <3s for commands
- **Uptime**: 99%+ with automatic restart capabilities

### Optimization

- **Response Caching**: 10-minute TTL for repeated queries (non-search)
- **Message Splitting**: Intelligent text segmentation
- **Database Connection Pooling**: Efficient resource usage
- **Graceful Degradation**: Fallback behaviors for API failures

## Testing

### Coverage

- **Unit Tests**: Service layer, utility functions
- **Integration Tests**: End-to-end workflows
- **Command Testing**: All slash commands and interactions
- **Coverage Target**: 80%+ line coverage

### Test Framework

- **Runner**: Bun native test runner
- **Mocking**: Bun test mocking (not Jest)
- **Fixtures**: Isolated test environments
- **CI/CD**: Automated testing pipeline

## Deployment

### Environment Variables

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_id
GEMINI_API_KEY=your_gemini_api_key
BRAVE_SEARCH_API_KEY=your_brave_search_key
NODE_ENV=production
DATABASE_URL=sqlite://config/bot.sqlite
```

### Production Setup

1. **Docker Deployment**: Containerized with Bun runtime
2. **Log Management**: Structured logging with rotation
3. **Health Checks**: Status monitoring and alerts
4. **Backup Strategy**: Configuration and log backup

## Development

### Setup

```bash
bun install                  # Install dependencies
bun run dev                  # Development with hot reload
bun test                     # Run test suite
bun test --coverage          # Coverage analysis
```

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Code quality enforcement
- **Testing**: TDD approach with 80%+ coverage
- **Documentation**: JSDoc for public APIs

## Future Enhancements

### Planned Features

- **File Processing**: Image analysis with Gemini Vision
- **Advanced Analytics**: Usage dashboards and insights
- **Multi-Language**: International language support
- **Plugin System**: Extensible functionality framework

### Technical Debt

- **Code Consolidation**: Reduce redundancy in handlers
- **Performance Optimization**: Cache improvements
- **Error Recovery**: Enhanced failure handling
- **Documentation**: API documentation generation
