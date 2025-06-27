# Claude Code Development Guide - Gemiscord Project

## 🎯 **Current Project Status**

**✅ Core Development Complete**

- Discord bot with AI integration (Gemini API + Brave Search)
- 4 slash commands: `/status`, `/config`, `/search`, `/model`
- Test coverage: 146+ tests passing (80%+ coverage)
- Production-ready codebase with comprehensive error handling

**🔜 Next Phase: Production Deployment**

- Docker containerization
- Production environment setup
- Enhanced monitoring and logging

## 📚 **Document Navigation**

| When to Read              | Document                 | Purpose                        |
| ------------------------- | ------------------------ | ------------------------------ |
| **Architecture Overview** | `docs/spec.md`           | Technical specifications       |
| **Development Roadmap**   | `docs/IMPLEMENTATION_PLAN.md` | Current and future development |
| **Setup & Usage**         | `README.md`              | User setup and feature guide   |
| **Testing Framework**     | `tests/README.md`        | Bun test framework details     |
| **Manual Testing**        | `docs/DISCORD_TEST_GUIDE.md`  | Discord integration testing    |
| **Code Analysis**         | `docs/check-similarity.md`    | Duplicate code detection tool  |

## ⚡ **Quick Reference**

### **Development Commands**

```bash
# Development
bun install                     # Install dependencies
bun run dev                     # Development with hot reload
bun test                        # Run all tests
bun test --coverage            # Test with coverage
bun test --watch               # Watch mode for TDD

# Quality Assurance
bun run typecheck             # TypeScript validation
bun run lint                  # Code quality checks
bun test --bail               # Stop on first failure

# Command Registration
bun run src/registerCommands.ts    # Register slash commands
```

### **Project Structure**

```text
src/
├── bot.ts                     # Main entry point
├── commands/                  # Slash commands (/status, /config, /search, /model)
├── handlers/                  # Discord event handlers
├── services/                  # AI, search, configuration, rate limiting
├── types/                     # TypeScript definitions
└── utils/                     # Logging, errors, constants

config/                        # YAML configuration files
tests/                         # Comprehensive test suite (146+ tests)
```

## 🔧 **Development Workflow**

### **Starting Development**

1. **Environment Setup**:

   ```bash
   cp .env.example .env
   # Configure API keys (Discord, Gemini, Brave Search)
   ```

2. **Install Dependencies**:

   ```bash
   bun install
   ```

3. **Verify Tests**:

   ```bash
   bun test
   ```

4. **Start Development**:
   ```bash
   bun run dev
   ```

### **Making Changes**

1. **Test-First Development**: Write tests before implementation
2. **Run Tests Continuously**: Use `bun test --watch` during development
3. **Maintain Coverage**: Ensure 80%+ test coverage for new code
4. **Type Safety**: Fix TypeScript errors before committing

### **Testing with Bun Framework**

⚠️ **Critical**: Bun uses different syntax than Jest

```typescript
// ✅ CORRECT - Bun test imports
import { describe, it, expect, beforeEach, mock } from "bun:test";

// ❌ WRONG - Jest syntax will fail
const mockFn = jest.fn(); // ReferenceError: jest is not defined

// ✅ CORRECT - Use mock from bun:test
const mockFn = mock();
```

**Key Testing Requirements:**

- Import `mock` from `bun:test` (not `jest.fn()`)
- Use `(mockFn as any).mockClear()` for TypeScript compatibility
- Import `afterEach` explicitly if needed for cleanup
- ES modules have readonly properties - use dependency injection

## 🛠 **Implementation Guidelines**

### **Code Standards**

- **TypeScript**: Strict mode enabled, full type safety required
- **Testing**: 80%+ coverage maintained, TDD approach preferred
- **Error Handling**: Comprehensive error management for all external APIs
- **Documentation**: Update relevant docs when adding features

### **Architecture Patterns**

- **Service Layer**: Business logic in dedicated service classes
- **Configuration**: YAML static config + SQLite dynamic settings
- **Error Recovery**: Graceful degradation for API failures
- **Rate Limiting**: Smart quota management with automatic fallbacks

### **External API Integration**

- **Gemini API**: Function calling, model switching, caching
- **Brave Search API**: Query enhancement, content extraction
- **Discord API**: Slash commands, message handling, permission checks

## 📋 **Key APIs for Development**

### **When Using WebFetch Tool**

📚 **For comprehensive API documentation links, see**: `docs/DOCUMENTATION_LINKS.md`

- Discord.js v14: `https://discord.js.org/docs/packages/discord.js/14.19.3`
- Gemini API: `https://ai.google.dev/gemini-api/docs/function-calling`
- Brave Search: `https://api-dashboard.search.brave.com/app/documentation/web-search/query`

### **Environment Variables**

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_id
GEMINI_API_KEY=your_gemini_api_key
BRAVE_SEARCH_API_KEY=your_brave_search_key
NODE_ENV=development
DATABASE_URL=sqlite://config/bot.sqlite
```

## 🧪 **Testing Strategy**

### **Test Structure**

- **Unit Tests**: Service layer, utilities (`tests/unit/`)
- **Integration Tests**: End-to-end workflows (`tests/integration/`)
- **Coverage Target**: 80%+ line coverage maintained
- **Performance**: ~400ms full test suite execution

### **Common Testing Patterns**

```typescript
// Discord command testing
const mockInteraction = {
  guild: { id: "test-guild" },
  user: { id: "test-user" },
  deferReply: mock().mockResolvedValue(undefined),
  editReply: mock().mockResolvedValue(undefined),
};

// Service mocking
const mockService = {
  method: mock().mockResolvedValue("expected-result"),
};
```

## 🚀 **Production Readiness**

### **Current Capabilities**

- **Fully Functional Bot**: All core features implemented and tested
- **Admin Commands**: Complete slash command system with permissions
- **AI Integration**: Gemini API with function calling and search
- **Configuration**: Flexible YAML + SQLite configuration system
- **Monitoring**: Status commands and usage tracking

### **Production Deployment (Next Phase)**

1. **Docker Setup**: Multi-stage Dockerfile for Bun runtime
2. **Environment Config**: Production environment variables
3. **Monitoring**: Log aggregation and performance monitoring
4. **Health Checks**: Automated status monitoring

## 🔍 **Troubleshooting**

### **Common Issues**

- **Test Failures**: Check Bun-specific syntax (no Jest globals)
- **TypeScript Errors**: Enable strict mode compliance
- **API Errors**: Verify environment variables and API keys
- **Discord Permissions**: Ensure bot has required permissions

### **Development Support**

- **Logs**: Structured logging in `logs/` directory
- **Debug Mode**: Set `NODE_ENV=development` for detailed logs
- **Test Isolation**: Each test runs with fresh mock states
- **Hot Reload**: Automatic restart during development

## 💡 **Best Practices**

### **Code Quality**

1. **Write Tests First**: TDD approach for all new features
2. **Type Everything**: Leverage TypeScript for error prevention
3. **Handle Errors**: Graceful degradation for external API failures
4. **Document Changes**: Update specs and guides when adding features

### **Performance**

1. **Response Caching**: 10-minute TTL for non-search responses
2. **Rate Limiting**: Smart quota management to prevent API exhaustion
3. **Message Splitting**: Efficient handling of long responses
4. **Database Optimization**: Efficient SQLite queries and connections

### **Security**

1. **Admin-Only Commands**: All slash commands require Administrator permission
2. **Input Sanitization**: Safe handling of Discord mentions and user content
3. **Environment Variables**: Secure API key storage
4. **Error Messages**: No sensitive information in user-facing errors

---

## important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.

## Memories

- 一次的なスクリプトは temp/に書いてください。作業が終わったら中身を削除してください。

## 🔗 **Quick Links**

- **Main Documentation**: `README.md` - Setup and usage guide
- **Technical Specs**: `docs/spec.md` - Architecture and API details
- **Development Roadmap**: `docs/IMPLEMENTATION_PLAN.md` - Current and future plans
- **Testing Guide**: `tests/README.md` - Bun test framework specifics
- **Manual Testing**: `docs/DISCORD_TEST_GUIDE.md` - Discord integration testing
- **Code Analysis**: `docs/check-similarity.md` - Duplicate code detection tool
- **📚 External Documentation**: `docs/DOCUMENTATION_LINKS.md` - All official API docs and external links
