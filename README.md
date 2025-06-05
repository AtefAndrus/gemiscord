# Gemiscord - Gemini Discord Bot

A Discord bot that integrates Google's Gemini API with Function Calling and Brave Search API to provide intelligent conversational responses with seamless web search capabilities.

## 🚀 Development Status

**Phase 0-1 ✅ COMPLETED**: Core foundation and configuration system
**Phase 2 ✅ COMPLETED**: Gemini API and Function Calling integration
**Phase 3 🔜 NEXT**: Slash commands implementation

**Current Status**: AI integration fully functional with automatic web search, rate limiting, and comprehensive test suite.

See `IMPLEMENTATION_PLAN.md` for detailed progress and `CLAUDE.md` for implementation guidelines.

## Features

### ✅ Implemented (Phase 0-2)

- ⚙️ **Advanced Configuration**: YAML + SQLite dual-layer configuration system
- 🔒 **Security**: Comprehensive message sanitization and input validation
- 📝 **Logging**: Structured logging with multiple levels
- 🧪 **Testing**: Bun native test runner with 80%+ coverage
- 🎯 **Type Safety**: Full TypeScript strict mode implementation
- 🤖 **Gemini AI Integration**: Function Calling support with model switching
- 🔍 **Smart Search**: Brave Search API integration with quota management
- 💬 **Response Modes**: Mention-based and auto-responses
- 📊 **Rate Limiting**: Automatic model switching (gemini-2.5-flash → gemini-2.0-flash)

### 🔜 Coming Soon (Phase 3)

- `/status` - Bot status and API usage statistics
- `/config` - Guild configuration management
- `/search` - Manual search functionality control
- `/model` - AI model information and switching

### ⏳ Planned (Phase 4+)

- 🐳 **Docker Deployment**: Production-ready containerization
- 📊 **Monitoring**: Advanced logging and metrics
- 🔧 **Admin Panel**: Web-based configuration interface

## Prerequisites

- [Bun](https://bun.sh/) 1.2.15 or higher
- Discord Bot Token with Message Content Intent
- Gemini API Key (with Function Calling access)
- Brave Search API Key (Free: 2,000 queries/month)

## Quick Start

1. **Clone and install**:

```bash
git clone https://github.com/your-username/gemiscord.git
cd gemiscord
bun install
```

2. **Environment setup**:

```bash
cp .env.example .env
# Edit .env with your API keys
```

Required environment variables:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_id
GEMINI_API_KEY=your_gemini_api_key
BRAVE_SEARCH_API_KEY=your_brave_search_key
NODE_ENV=development
DATABASE_URL=sqlite://config/bot.sqlite
```

3. **Configuration**:

Edit `config/bot-config.yaml` for bot behavior customization:

```yaml
# Example: Change system prompt, enable/disable features
bot:
  systemPrompt: "あなたは親切で知識豊富なAIアシスタントです。"
  responseStrategy: "balanced"
```

4. **Development**:

```bash
# Start in development mode
bun run dev

# Run tests
bun test

# Run tests with coverage
bun test --coverage

# Run tests in watch mode
bun test --watch
```

5. **Production**:

```bash
# Start in production mode
NODE_ENV=production bun start
```

## API Keys Setup

### Discord Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the token and enable "Message Content Intent"
5. Invite the bot with appropriate permissions

### Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Ensure Function Calling is enabled in your account

### Brave Search API Key

1. Sign up at [Brave Search API](https://api.search.brave.com/)
2. Free plan includes 2,000 queries/month
3. Copy your API key from the dashboard

## Bot Usage

### Mention Response

```
@YourBot What's the weather like in Tokyo today?
```

The bot will automatically search for current weather information and respond with relevant details.

### Auto Response (Channel-specific)

Configure channels for automatic responses without mentions:

```yaml
# In bot-config.yaml
features:
  autoResponse:
    enabled: true
    channels: ["general", "ai-chat"]
```

### Function Calling Features

**Automatic Web Search**: Bot decides when to search based on query context
**Character Counting**: Built-in text analysis functions
**Rate Limiting**: Automatic model switching when limits are reached

## Development

### Project Structure

```
src/
├── bot.ts                   # Main entry point
├── handlers/                # Discord event handlers
│   ├── messageCreate.ts     # Message processing with AI
│   └── ready.ts            # Bot startup
├── services/               # Core business logic
│   ├── gemini.ts          # Gemini API integration
│   ├── braveSearch.ts     # Brave Search API
│   ├── rateLimit.ts       # Rate limiting & model switching
│   ├── configManager.ts   # YAML configuration
│   ├── config.ts          # Dynamic configuration (keyv)
│   └── messageProcessor.ts # Message sanitization
├── types/                 # TypeScript definitions
├── utils/                 # Logging, errors, constants
└── commands/             # Slash commands (Phase 3)
```

### Testing

Built on Bun's native test runner for maximum performance:

```bash
# Run all tests
bun test

# Unit tests only
bun test tests/unit

# Integration tests only
bun test tests/integration

# Coverage report
bun test --coverage

# Watch mode for development
bun test --watch
```

**Test Coverage**: 80%+ for all implemented features
**Performance**: ~400ms for full test suite execution

### Configuration System

**3-Layer Configuration**:

1. **YAML** (`config/bot-config.yaml`): Static configuration
2. **SQLite** (via keyv): Dynamic guild-specific settings
3. **Environment**: API keys and secrets

Example configuration:

```yaml
bot:
  systemPrompt: "Custom AI assistant behavior"
  responseStrategy: "balanced" # concise | balanced | detailed

features:
  search:
    enabled: true
    defaultRegion: "JP"
    maxResults: 5

  rateLimit:
    safetyBuffer: 0.8
    switchThreshold: 80
```

## API Limits & Rate Limiting

**Gemini API Limits**:

- gemini-2.5-flash-preview-0520: 10 RPM, 250K TPM, 500 RPD
- gemini-2.0-flash (fallback): 15 RPM, 1M TPM, 1500 RPD

**Brave Search**: 2,000 free queries/month

**Automatic Handling**:

- Model switching when primary model hits limits
- 80% safety buffer to prevent rate limit errors
- Local TTL counters for accurate tracking

## Deployment

### Production Environment

```bash
# Set production environment
export NODE_ENV=production

# Use production config
export CONFIG_ENV=prod

# Start with process manager
pm2 start bun --name gemiscord -- start
```

### Docker (Phase 4)

Docker deployment configuration will be added in Phase 4.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Run tests: `bun test`
4. Commit changes: `git commit -m "Add new feature"`
5. Push to branch: `git push origin feature/new-feature`
6. Create a Pull Request

## Performance

- **Response Time**: <5 seconds for AI responses
- **Memory Usage**: <150MB in production
- **Test Suite**: ~400ms execution time
- **Cold Start**: <2 seconds

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:

- Check `CLAUDE.md` for implementation guidelines
- Review `IMPLEMENTATION_PLAN.md` for development roadmap
- Run `bun test` to verify your setup
- Create an issue for bugs or feature requests
