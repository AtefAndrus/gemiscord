# Gemiscord - Gemini Discord Bot

A Discord bot that integrates Google's Gemini API with Function Calling and Brave Search API to provide intelligent conversational responses with seamless web search capabilities.

## 🚧 Development Status

**Phase 0-1 ✅ COMPLETED**: Core foundation and configuration system
**Phase 2 🔜 NEXT**: Gemini API and Function Calling integration

See `IMPLEMENTATION_PLAN.md` for detailed progress and `CLAUDE.md` for implementation guidelines.

## Features

### ✅ Implemented

- ⚙️ **Advanced Configuration**: YAML + SQLite dual-layer configuration system
- 🔒 **Security**: Comprehensive message sanitization and input validation
- 📝 **Logging**: Structured logging with multiple levels
- 🧪 **Testing**: Comprehensive unit and integration test suite
- 🎯 **Type Safety**: Full TypeScript strict mode implementation

### 🔜 Coming Soon (Phase 2)

- 🤖 **Gemini AI Integration**: Function Calling support
- 🔍 **Smart Search**: Brave Search API integration
- 💬 **Response Modes**: Mention-based and auto-responses
- 📊 **Rate Limiting**: Automatic model switching

### ⏳ Planned (Phase 3+)

- `/status` - Bot status and API usage
- `/config` - Configuration management
- `/search` - Search functionality control
- `/model` - Model information and statistics

## Prerequisites

- [Bun](https://bun.sh/) 1.2.15 or higher
- Discord Bot Token
- Gemini API Key (with Function Calling access)
- Brave Search API Key (Free AI plan: 2,000 queries/month)

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

3. **Run tests**:

```bash
bun test
```

4. **Start development**:

```bash
bun run src/bot.ts
```

## Configuration System

### Dual-Layer Architecture

- **YAML Config** (`config/bot-config.yaml`): Static prompts and function declarations
- **SQLite Database**: Dynamic guild/channel settings via keyv
- **Environment Variables**: Sensitive API keys and tokens

### Configuration Features

- Guild-specific settings (mention behavior, auto-response channels)
- Channel-specific prompts
- Rate limiting and usage tracking
- Search quota management

## Development

### Tech Stack

- **Runtime**: Bun with TypeScript strict mode
- **Discord**: discord.js v14.19.3
- **AI**: @google/genai (Function Calling ready)
- **Storage**: keyv + @keyv/sqlite
- **Testing**: Jest with comprehensive coverage

### Project Structure

```text
src/
├── bot.ts                   # Entry point
├── handlers/                # Discord event handlers
├── services/                # Core business logic
│   ├── configManager.ts     # YAML configuration
│   ├── config.ts            # Dynamic keyv storage
│   └── messageProcessor.ts  # Message sanitization
├── types/                   # TypeScript definitions
└── utils/                   # Logging, errors, constants

tests/
├── unit/                    # Unit tests
├── integration/             # Integration tests
└── fixtures/                # Test data
```

### Testing

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific test
bun test tests/unit/services/config.test.ts

# Watch mode
bun test --watch
```

### Code Quality

- **TypeScript**: Strict mode with comprehensive type definitions
- **Jest**: Unit tests with 80%+ coverage requirement
- **ESLint**: Code style and quality enforcement
- **Error Handling**: Custom error classes with proper logging

## Next Steps

Ready to implement Phase 2? See `IMPLEMENTATION_PLAN.md` for:

- Detailed implementation steps
- Required API documentation
- Testing strategies
- Integration guidelines

## License

MIT License - see [LICENSE](LICENSE) file for details
