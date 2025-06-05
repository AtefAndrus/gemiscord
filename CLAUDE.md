# Claude Code Development Guide v7.0 - Gemiscord Project

## 🎯 **CRITICAL: Development Workflow**

### **STEP 1: ALWAYS START HERE**

1. **Read Implementation Plan**: `IMPLEMENTATION_PLAN.md` - Contains detailed Phase 3 checklist
2. **Fetch Latest API Docs**: Use WebFetch tool to get current Discord.js and Gemini API specs
3. **Update TodoList**: Use TodoWrite tool to track all tasks and progress

### **STEP 2: Implementation Protocol**

1. **Test-First Development**: Write tests BEFORE implementation
2. **Maintain 80%+ Coverage**: Run `bun test --coverage` after each feature

## 📊 **Current Status (Phase 2 Complete)**

### **✅ Foundation & AI Integration Complete**

- Discord bot, configuration, AI responses with search
- Tests passing: 128/129 (99.2% success rate)

### **🚧 Next Task: Phase 3 - Slash Commands**

- Target: `/status`, `/config`, `/search`, `/model` commands
- Framework: Discord.js v14 interactions

## 📚 **Document Navigation**

| When to Read                | Document                 | Purpose                            |
| --------------------------- | ------------------------ | ---------------------------------- |
| **Before ANY Phase 3 work** | `IMPLEMENTATION_PLAN.md` | Detailed step-by-step checklist    |
| **Setup/Installation**      | `README.md`              | Human user setup guide             |
| **Testing**                 | `tests/README.md`        | Bun test framework details         |
| **Technical specs**         | `spec.md`                | API limits, architecture details   |

## ⚡ **Quick Reference**

### **Commands**

```bash
bun test                    # Run all tests
bun test --coverage        # Test with coverage
bun run dev                # Development mode
```

### **Implementation Rules**

- ✅ Always read `IMPLEMENTATION_PLAN.md` before starting new features
- ✅ Use TodoWrite tool to track all development tasks
- ✅ Fetch official docs with WebFetch before implementation
- ✅ Maintain test coverage above 80%
- ⚠️ Never create files unless explicitly required
- ⚠️ Always prefer editing existing files

### **Key API URLs for WebFetch**

- Discord.js v14: `https://discord.js.org/docs/packages/discord.js/14.19.3`
- Gemini API: `https://ai.google.dev/gemini-api/docs/function-calling`
- Brave Search: `https://api.search.brave.com/app/documentation/web-search`

### **Project Structure**

```text
src/commands/        # 🔜 Phase 3 target (create)
src/handlers/        # ✅ messageCreate.ts, ready.ts
src/services/        # ✅ All AI/search services complete
```

## 🔧 **Environment Setup**

```env
DISCORD_TOKEN=your_token
GEMINI_API_KEY=your_key
BRAVE_SEARCH_API_KEY=your_key
NODE_ENV=development
```

## 🚨 **Phase 3 Priority Checklist**

- [ ] Read `IMPLEMENTATION_PLAN.md` Phase 3 section
- [ ] Fetch Discord.js v14 interaction docs
- [ ] Create `/status` command implementation
- [ ] Create `/config` command implementation
- [ ] Run full test suite

## important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
