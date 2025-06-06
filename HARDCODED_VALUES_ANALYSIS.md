# Hardcoded Values Analysis - Gemiscord Bot

**Analysis Date**: 2025-06-06
**Project Version**: Phase 3 Complete
**Purpose**: Document hardcoded values that could be moved to configuration files

## 📊 **Analysis Summary**

Comprehensive investigation of hardcoded values across the entire codebase to identify candidates for configuration externalization.

### **Files Analyzed**

- **Services**: `src/services/*.ts` (6 files)
- **Handlers**: `src/handlers/*.ts` (3 files)
- **Commands**: `src/commands/*.ts` (4 files)
- **Utils**: `src/utils/*.ts` (4 files)
- **Types**: `src/types/*.ts` (6 files)

---

## 🔴 **High Priority - Should Be Configurable**

### **1. UI/UX Configuration**

```yaml
# Current: Hardcoded in ready.ts:156, ready.ts:161-164
ui:
  activity:
    updateInterval: 300000 # 5 minutes
    messages:
      - "{servers} servers | @mention for help"
      - "Powered by Gemini AI"
      - "v{version} | Search enabled"

  # Current: Hardcoded in messageCreate.ts:407
  messaging:
    splitDelay: 1000 # 1 second between split messages
    previewLength: 200 # config.ts:217

  # Current: Scattered throughout commands/*.ts
  emojis:
    success: "✅"
    error: "❌"
    warning: "⚠️"
    search: "🔍"
```

### **2. Search & AI Parameters**

```yaml
# Current: Hardcoded in braveSearch.ts:59, commands/search.ts
search:
  defaults:
    count: 10 # Default search result count
    maxResults: 20 # Maximum results per query
    displayCount: 5 # Results shown in Discord (braveSearch.ts:143)

  validation:
    query:
      minLength: 3 # commands/search.ts:239
      maxLength: 200 # commands/search.ts:243

  formatting:
    previewLength: 1900 # braveSearch.ts:159

# Current: Hardcoded in braveSearch.ts:179, messageCreate.ts:254
ai:
  timeout: 10000 # 10 second API timeout
  temperature: 0.9 # Default temperature setting
```

### **3. Monitoring & Alerting**

```yaml
# Current: Hardcoded in commands/search.ts:187,189
monitoring:
  thresholds:
    usage:
      warning: 0.7 # 70% usage warning
      critical: 0.9 # 90% usage critical
    memory:
      warning: 104857600 # 100MB (constants.ts)
      critical: 157286400 # 150MB (constants.ts)

  # Current: Hardcoded in constants.ts
  intervals:
    healthCheck: 60000 # 1 minute
    metrics: 300000 # 5 minutes
```

### **4. Rate Limiting Enhancements**

```yaml
# Current: Partially in constants.ts, needs expansion
rateLimiting:
  safetyBuffer: 0.8 # constants.ts:SWITCH_THRESHOLD
  bufferPercentage: 0.9 # constants.ts:BUFFER_PERCENTAGE

  # Current: Hardcoded throughout rateLimit.ts
  timeWindows:
    minute: 60000 # 1 minute in ms
    day: 86400000 # 24 hours in ms
    month: 2592000000 # 30 days in ms
```

---

## 🟡 **Medium Priority - Internationalization**

### **5. Japanese Messages & Localization**

```yaml
# Current: Hardcoded throughout messageCreate.ts, commands/*.ts
messages:
  japanese:
    greeting: "こんにちは！何かお手伝いできることはありますか？ 😊"
    error: "申し訳ございません。エラーが発生しました。"
    rateLimit: "申し訳ございません。現在利用量が上限に達しています。"
    processing: "処理中..."
    autoResponse: "自動応答モードです。自然な会話を心がけてください。"

  commands:
    config:
      serverOnly: "❌ This command can only be used in a server."
      unknownSubcommand: "❌ Unknown subcommand. Use `/config view` to see current settings."
    search:
      noResults: "検索結果が見つかりませんでした。"
      quotaExceeded: "Search quota exceeded for this month"
```

### **6. Input Validation Limits**

```yaml
# Current: Hardcoded in commands/config.ts, sanitizer.ts
validation:
  prompt:
    minLength: 10 # config.ts:199
    maxLength: 1000 # config.ts:203

  input:
    maxConfigValue: 1000 # sanitizer.ts
    maxFilename: 255 # sanitizer.ts
    safePreview: 100 # sanitizer.ts
```

---

## 🟢 **Low Priority - Keep Hardcoded**

### **7. Platform Constraints (Don't Configure)**

- Discord API limits (2000 char messages, etc.)
- Security patterns and protocols
- Mathematical constants (MB conversions)
- ANSI color codes

### **8. Already Well Configured** ✅

- API rate limits (dev/prod environment-specific)
- AI model selection and basic parameters
- Cache TTL base values
- Message processing strategies
- Base system prompts

---

## 📋 **Implementation Recommendations**

### **Phase 1: Critical UI/UX (Immediate)**

1. **Activity settings** - Most visible to users
2. **Search parameters** - Frequently adjusted
3. **Monitoring thresholds** - Environment-dependent

### **Phase 2: Operational (Short-term)**

1. **Error messages** - For better UX
2. **Validation limits** - For customization
3. **Timeout values** - For different network conditions

### **Phase 3: Advanced (Long-term)**

1. **Full internationalization** - Multiple language support
2. **Dynamic UI themes** - Color schemes, emoji sets
3. **Advanced monitoring** - Custom alerting rules

---

## 🏗️ **Current Configuration Architecture**

### **Strengths**

- ✅ Environment-specific configs (dev/prod)
- ✅ Deep merge system for overrides
- ✅ Type-safe configuration structure
- ✅ Dynamic runtime configuration via database

### **Areas for Improvement**

- ⚠️ Many UI/UX elements still hardcoded
- ⚠️ Monitoring thresholds not configurable
- ⚠️ Limited internationalization support
- ⚠️ Search behavior not fully customizable

### **Configuration Files**

- `bot-config.yaml` - Base configuration (67 lines)
- `bot-config.dev.yaml` - Development overrides (28 lines)
- `bot-config.prod.yaml` - Production overrides (33 lines)

---

## 💡 **Key Findings**

1. **Most Critical**: UI activity settings and search parameters are hardcoded but frequently need adjustment
2. **Good Practice**: Rate limits and AI model configs already properly externalized
3. **Quick Wins**: Error messages and validation limits easy to move to config
4. **Impact**: Configurability would significantly improve deployment flexibility

### **Estimated Configuration Expansion**

- Current config: ~100 properties
- Potential additions: ~50 properties
- High-impact additions: ~20 properties

---

**Next Steps**: Prioritize implementation based on deployment needs and user feedback frequency.
