# Gemini Discord Bot - Claude Code Implementation Guide v5.0

## Project Overview

A Discord bot integrating Google's Gemini API with Function Calling and Brave Search API for intelligent conversational responses. Features mention-based responses, channel-specific auto-responses, and sophisticated configuration management.

## Current Implementation Status

### ✅ **Phase 0-1 Completed (Foundation) - 100% Complete**

- **Core Types**: All TypeScript types and interfaces defined
- **Configuration**: YAML (ConfigManager) + keyv (ConfigService) dual-layer system
- **Discord Integration**: Basic bot connection, message handling, and sanitization
- **Message Processing**: Placeholder-based security processing implemented
- **Utils**: Logging, error handling, constants, and sanitization
- **Test Suite**: Comprehensive unit & integration tests (80%+ coverage)
- **Test Infrastructure**: Jest, mocks, fixtures, and CI/CD ready

### 🚧 **Phase 2 Next (Function Calling Integration)**

- **Missing**: Gemini API client, Brave Search integration, rate limiting
- **Current**: Dummy responses in messageCreate.ts line 154
- **Ready**: All foundation components implemented for AI integration

## Implementation Guidelines

1. **Follow `IMPLEMENTATION_PLAN.md`**: Check detailed plan before starting Phase 2
2. **Check Official Docs**: Always verify latest API specs and types before implementation
3. **TodoList Management**: Use TodoWrite tool to track progress throughout implementation
4. **Test-Driven Development**: Write tests first, then implement features
5. **Quality Standards**: Maintain 80%+ test coverage for all new code
6. **Discord Testing**: Follow user test scenarios for each implementation phase

## Tech Stack

- **Runtime**: Bun 1.2.15 with TypeScript strict mode
- **Discord**: discord.js v14.19.3
- **AI**: @google/genai (Function Calling), Brave Search API
- **Storage**: keyv + @keyv/sqlite (dynamic config), YAML (static config)
- **Deployment**: Coolify (Docker)

## Key Features

**Response Modes**: Mention response (`@bot message`) + channel auto-response
**Function Calling**: Gemini auto-decides search necessity, dynamic tool management
**Message Security**: Placeholder-based sanitization for mentions/prompts
**Character Limits**: Compress/split strategies for 2000-char Discord limit
**Rate Limiting**: Auto-model switching, local TTL counters, 80% buffer protection

## API Limits

**Gemini**: gemini-2.5-flash-preview-0520 (10 RPM, 250K TPM, 500 RPD) → gemini-2.0-flash fallback
**Brave Search**: 2,000 free queries/month, $3/1,000 additional
**Discord**: 2000 char message limit (compress/split), standard rate limits
**Performance**: <5s response, <3s commands, <150MB memory

## Implementation Status

**✅ Phase 0-1 (Foundation)**: TypeScript types, Discord bot, YAML/keyv config, message handling
**🚧 Phase 2 (Next)**: Gemini API client, Brave Search, Function Calling, rate limiting
**⏳ Phase 3**: Slash commands, file processing, advanced features
**⏳ Phase 4**: Docker, production deployment, monitoring

## Current File Structure

```
src/
├── bot.ts                   # Main entry point ✅
├── handlers/                # Discord event handlers ✅
│   ├── messageCreate.ts     # Message processing ✅
│   └── ready.ts             # Bot startup ✅
├── services/                # Core business logic
│   ├── configManager.ts     # YAML config ✅
│   ├── config.ts            # keyv dynamic config ✅
│   └── messageProcessor.ts  # Message sanitization ✅
├── types/                   # TypeScript definitions ✅
├── utils/                   # Logging, errors, constants ✅
└── config/                  # YAML config files ✅
```

## Environment Variables (.env)

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_id
GEMINI_API_KEY=your_gemini_api_key
BRAVE_SEARCH_API_KEY=your_brave_search_key
NODE_ENV=development
DATABASE_URL=sqlite://config/bot.sqlite
```

## Setup Requirements

**Discord Bot**: [Discord Developer Portal](https://discord.com/developers/applications) → Create app → Bot token
**Gemini API**: [MakerSuite](https://makersuite.google.com/app/apikey) → Function Calling access
**Brave Search**: [Brave API](https://api.search.brave.com/) → Free 2,000 queries/month

## Configuration

**3-Layer System**: YAML (static) + keyv (dynamic) + .env (secrets)
**YAML**: Bot prompts, function declarations, model settings
**keyv**: Guild settings, usage tracking, rate limits
**Current Config**: `config/bot-config.yaml` with Japanese prompts implemented

## Next: Phase 2 Implementation

**Priority Tasks**:

1. Implement Gemini API client with Function Calling (`src/services/gemini.ts`)
2. Integrate Brave Search API (`src/services/braveSearch.ts`)
3. Add rate limiting service (`src/services/rateLimit.ts`)
4. Replace dummy response in `messageCreate.ts:154` with AI integration
5. Test with real Discord server and verify all APIs work

**Reference**: Follow detailed implementation plan in `IMPLEMENTATION_PLAN.md`
