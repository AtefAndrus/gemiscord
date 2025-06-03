# Gemiscord - Gemini Discord Bot

A Discord bot that integrates Google's Gemini API with Function Calling and Brave Search API to provide intelligent conversational responses with seamless web search capabilities.

## Features

- 🤖 **Gemini AI Integration**: Powered by Google's latest Gemini models with Function Calling support
- 🔍 **Smart Search**: Automatic web search integration via Brave Search API when needed
- 💬 **Flexible Response Modes**: Mention-based and channel-specific auto-responses
- ⚙️ **Advanced Configuration**: YAML + SQLite dual-layer configuration system
- 📊 **Rate Limit Management**: Automatic model switching and function control
- 🔒 **Security First**: Comprehensive message sanitization and input validation

## Prerequisites

- [Bun](https://bun.sh/) 1.2.15 or higher
- Discord Bot Token
- Gemini API Key (with Function Calling access)
- Brave Search API Key (Free AI plan: 2,000 queries/month)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/gemiscord.git
cd gemiscord
```

2. Install dependencies:
```bash
bun install
```

3. Copy the environment variables template:
```bash
cp .env.example .env
```

4. Configure your `.env` file with your API keys

5. Run the bot:
```bash
bun run src/bot.ts
```

## Configuration

The bot uses a dual-layer configuration system:

- **Static Configuration**: YAML files in `config/` directory
- **Dynamic Configuration**: SQLite database for runtime settings

See `config/bot-config.yaml` for available configuration options.

## Commands

- `/status` - Check bot status and API usage
- `/config` - Manage bot configuration
- `/search` - Manage search functionality
- `/model` - View model information and statistics

## Development

This project uses:
- **TypeScript** with strict mode
- **discord.js** v14 for Discord API
- **@google/genai** for Gemini API integration
- **keyv** with SQLite for configuration storage

## License

MIT License - see [LICENSE](LICENSE) file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/YOUR_USERNAME/gemiscord/issues) page.