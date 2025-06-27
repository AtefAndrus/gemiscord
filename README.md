# Gemiscord - AI-Powered Discord Bot

An intelligent Discord bot powered by Google's Gemini AI with automatic web search capabilities. Chat naturally with the bot and get up-to-date information from the web.

> **⚠️ Self-Hosted Only**: This bot is not provided as a service. You need to set up your own Discord bot, obtain your own API keys, and run it on your own infrastructure.

## ✨ Features

### 🤖 **AI Chat Integration**

- **Natural Conversations**: Chat directly with Google's Gemini AI
- **Automatic Web Search**: Bot automatically searches the web when needed
- **Smart Function Calling**: Decides whether to search or respond directly
- **Rate Limiting**: Automatic model switching to ensure uptime

### 💬 **Response Modes**

- **Mention Response**: `@gemiscord What's the weather today?`
- **Auto-Response Channels**: Configure channels for mention-free conversations
- **Message Sanitization**: Safe handling of Discord mentions and content

### ⚙️ **Configuration System**

- **Server-Specific Settings**: Each Discord server has its own configuration
- **Channel Management**: Control which channels the bot responds in
- **Custom Prompts**: Set server-specific AI behavior

### ⚡ **Slash Commands**

- `/status` - View bot status, uptime, and API usage statistics
- `/config` - Manage server-specific bot configuration (5 subcommands)
- `/search` - Control web search functionality and monitor quota (4 subcommands)
- `/model` - AI model information, usage stats, and rate limits (4 subcommands)

## 🚀 **Setup & Deployment**

**⚠️ Important**: You must set up your own Discord bot and obtain your own API keys before deployment.

### 📦 **Docker Deployment (Recommended)**

1. **Get API Keys** (see [API Keys Setup](#-api-keys-setup) below)
2. **Clone and Build**:

```bash
git clone https://github.com/AtefAndrus/gemiscord.git
cd gemiscord
cp .env.example .env
# Edit .env with your API keys
docker build -t gemiscord .
docker run -d --env-file .env gemiscord
```

### 🛠️ **Manual Deployment**

For manual deployment or development, see the [For Developers](#-for-developers-source-code-modification--testing) section below.

## 🔑 **API Keys Setup**

You **must** obtain these API keys yourself:

### **Discord Bot Token**

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application → Bot section → Copy token
3. Enable "Message Content Intent" and "Server Members Intent"
4. Invite bot to your server with appropriate permissions

### **Gemini API Key**

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Ensure Function Calling is enabled for your account

### **Brave Search API Key** (Optional)

1. Sign up at [Brave Search API](https://api.search.brave.com/)
2. Free tier: 2,000 queries/month
3. Copy your API key from the dashboard

## 📋 **How to Use**

### **Basic Chat**

Once the bot is added to your Discord server:

```text
@gemiscord What's the weather like in Tokyo today?
@gemiscord Tell me about the latest AI technology news
@gemiscord What is 2+2? (Simple questions don't require web search)
```

### **Auto-Response Channels**

Configure channels where the bot responds without needing @mentions:

```text
# In #ai-chat channel (if configured for auto-response)
What's happening in the world today?
# Bot responds automatically without @mention
```

### **Expected Behavior**

- **Web Search**: Bot automatically searches when you ask about current events, weather, news
- **Direct Response**: Math, general knowledge, and conversational questions answered directly
- **Smart Decisions**: AI decides whether web search is needed for each question
- **Rate Limiting**: Automatically switches AI models if usage limits are reached

## 🎛️ **Configuration**

### **Server Settings**

Each Discord server can customize:

- **Response Channels**: Which channels the bot auto-responds in
- **Custom Prompts**: Server-specific AI personality/behavior
- **Search Settings**: Enable/disable web search functionality
- **Preferred AI Model**: Set guild-specific preferred AI model
- **Command Visibility**: Configure whether commands are ephemeral or visible to all users

### **Logging Configuration**

Gemiscord features comprehensive file logging with smart rotation:

- **File Logging**: Automatic log files in `logs/` directory
- **Log Rotation**: Daily rotation with automatic cleanup
- **Error Separation**: Optional separate error log files
- **JSON Format**: Structured logging support for log analysis
- **Buffer Management**: Performance-optimized async file writing

**Configuration** (in `config/bot-config.yaml`):

```yaml
logging:
  file:
    enabled: true
    level: "INFO" # ERROR, WARN, INFO, DEBUG
    directory: "logs"
    filename_pattern: "gemiscord-{date}.log"
    max_files: 30 # Keep 30 days of logs
    separate_error_file: true
    json_format: false # Set to true for structured JSON logs
  rotation:
    daily: true
    max_size: "50MB"
    cleanup_old: true
  performance:
    buffer_size: 8192 # Buffer size for batched writes
    flush_interval: 5000 # Flush every 5 seconds
```

**Log Files Generated**:

- `logs/gemiscord-2025-06-06.log` - Main application logs
- `logs/gemiscord-2025-06-06.error.log` - Error logs (if separate_error_file: true)
- Automatic daily rotation and cleanup of old files

### **Slash Commands (Administrator Only)**

Complete slash command system implemented with admin-only access:

- `/config mention enable/disable` - Toggle mention responses
- `/config channel add/remove #channel` - Manage auto-response channels
- `/config prompt set "Custom prompt"` - Set server-specific AI behavior
- `/config strategy compress/split` - Set message handling strategy
- `/config view` - View current server configuration
- `/search toggle enable/disable` - Control search functionality
- `/search quota` - View search usage and limits
- `/search test "query"` - Test search functionality
- `/status` - View bot performance, uptime, and API usage statistics
- `/model info/stats/limits/switch` - AI model information, usage, and switching

## 👩‍💻 **For Developers (Source Code Modification & Testing)**

> This section is for developers who want to modify the source code, add features, or contribute to the project.

### **Development Prerequisites**

- [Bun](https://bun.sh/) 1.2.15 or higher
- TypeScript/Node.js development experience
- Git and Docker knowledge
- Understanding of Discord Bot development

### **Development Environment Setup**

1. **Fork and Clone**

```bash
# Fork the repository on GitHub first
git clone https://github.com/AtefAndrus/gemiscord.git
cd gemiscord
bun install
```

2. **API Keys Setup**

```bash
cp .env.example .env
```

Edit `.env` with your test API keys (same as [API Keys Setup](#-api-keys-setup)):

```env
DISCORD_TOKEN=your_test_discord_bot_token
DISCORD_CLIENT_ID=your_test_discord_application_id
GEMINI_API_KEY=your_gemini_api_key
BRAVE_SEARCH_API_KEY=your_brave_search_key
NODE_ENV=development
```

3. **Development Workflow**

```bash
# Install dependencies
bun install

# Start development server with hot reload
bun run dev

# Run test suite
bun test

# Run tests with coverage report
bun test --coverage

# Run tests in watch mode (for TDD)
bun test --watch

# Type checking
bun run typecheck

# Lint code
bun run lint
```

4. **Testing & Quality Assurance**

```bash
# Run all tests before committing
bun test

# Check test coverage (must be 80%+)
bun test --coverage

# Run integration tests
bun test tests/integration

# Manual Discord testing (follow docs/DISCORD_TEST_GUIDE.md)
bun run dev
# Test in your Discord server
```

### **Project Structure**

```text
src/
├── bot.ts              # Main entry point
├── handlers/           # Discord event handlers
├── services/          # AI, search, rate limiting
├── commands/          # Slash commands
├── types/             # TypeScript definitions
└── utils/             # Logging, errors, constants

config/                # YAML configuration files
tests/                 # Test suites (80%+ coverage)
```

### **Configuration Files**

- `config/bot-config.yaml` - Main bot settings
- `.env` - API keys and secrets
- SQLite database - Dynamic guild settings

### **Testing & Quality**

- **Framework**: Bun native test runner
- **Coverage**: 80%+ maintained
- **Performance**: ~400ms full test suite
- **Types**: Full TypeScript strict mode

### **Development Resources**

- `docs/IMPLEMENTATION_PLAN.md` - Detailed implementation guide
- `tests/README.md` - Testing framework documentation
- `docs/DISCORD_TEST_GUIDE.md` - Manual testing procedures

### **Contributing & Development Guidelines**

1. **Code Standards**

   - Follow TypeScript strict mode
   - Maintain 80%+ test coverage
   - Use Bun native test runner
   - Follow existing code patterns

2. **Development Process**

   - Create feature branch: `git checkout -b feature/new-feature`
   - Write tests first (TDD approach)
   - Run full test suite: `bun test`
   - Check coverage: `bun test --coverage`
   - Manual Discord testing (see `DISCORD_TEST_GUIDE.md`)

3. **Documentation**

   - `docs/IMPLEMENTATION_PLAN.md` - Implementation roadmap
   - `tests/README.md` - Testing framework guide
   - `docs/DISCORD_TEST_GUIDE.md` - Manual testing procedures

4. **Pull Request Process**
   - Ensure all tests pass
   - Update documentation if needed
   - Follow conventional commit messages
   - Include testing evidence

## 🐳 **Docker Build (Production)**

For production deployment, build your own Docker image:

```dockerfile
# Dockerfile (included in repository)
FROM oven/bun:1.2.15
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --production
COPY . .
CMD ["bun", "start"]
```

Build and deploy:

```bash
# Build your own image
docker build -t my-gemiscord-bot .

# Run in production
docker run -d --restart unless-stopped \
  --env-file .env \
  --name gemiscord-bot \
  my-gemiscord-bot

# Or use docker-compose (docker-compose.yml included)
docker-compose up -d
```

## 📊 **Performance & Limits**

### **Response Performance**

- **AI Responses**: <5 seconds
- **Slash Commands**: <3 seconds
- **Memory Usage**: <150MB production
- **Uptime**: 99%+ with auto-restart

### **API Rate Limits**

- **Gemini API**: Auto-switching between models
- **Brave Search**: 2,000 free queries/month
- **Discord**: Standard rate limit handling

## 📄 **License & Support**

- **License**: MIT License - see [LICENSE](LICENSE)
- **Issues**: GitHub Issues for bug reports
- **Contributions**: Fork → PR workflow welcomed

## 🔗 **Useful Links**

- 📚 [Discord.js Documentation](https://discord.js.org/)
- 🧠 [Google Gemini API](https://ai.google.dev/)
- 🔍 [Brave Search API](https://api-dashboard.search.brave.com/app/documentation/web-search/get-started)
- 🏗️ [Discord Developer Portal](https://discord.com/developers/applications)
- 🟢 [Bun Runtime](https://bun.sh/)
