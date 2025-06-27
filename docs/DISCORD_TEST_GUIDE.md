# Discord Integration Testing Guide - Gemiscord

## Overview

Comprehensive manual testing procedures for Gemiscord Discord bot integration, covering AI responses, web search functionality, slash commands, and administrative features.

## Prerequisites

### 1. Bot Setup

```bash
# Verify environment configuration
cat .env
# Required environment variables:
# - DISCORD_TOKEN=your_discord_bot_token
# - DISCORD_CLIENT_ID=your_discord_application_id
# - GEMINI_API_KEY=your_gemini_api_key
# - BRAVE_SEARCH_API_KEY=your_brave_search_key

# Start the bot
bun run dev
```

**Expected Output**:

- ✅ `Ready! Logged in as BotName#1234`
- ✅ `MessageCreateHandler initialized successfully`
- ✅ `Configuration manager initialized`
- ✅ `Configuration service initialized`

### 2. Discord Server Preparation

**Required Setup**:

- Create test Discord server (with Administrator permissions)
- Invite bot with required permissions:
  - Send Messages
  - Read Message History
  - Use Slash Commands
  - Add Reactions
- Create test channels: `#bot-test`, `#auto-response-test`

---

## Core Feature Testing

### 🤖 **T1. AI Response Testing**

#### T1-1. Mention Response

**Test Procedure**:

```
In #bot-test channel:
@YourBot Hello! How are you doing today?
@YourBot What can you help me with?
```

**Expected Results**:

- ✅ Bot shows typing indicator (2-3 seconds)
- ✅ Natural AI response returned
- ✅ Response within 5 seconds
- ✅ No errors occur

#### T1-2. Natural Conversation

**Test Procedure**:

```
@YourBot I need help planning my day
@YourBot Explain the difference between TypeScript and JavaScript
@YourBot Tell me a funny programming joke
```

**Expected Results**:

- ✅ Context-appropriate responses
- ✅ Natural language understanding
- ✅ Proper error handling

### 🔍 **T2. Search Integration Testing**

#### T2-1. Real-time Information Search

**Test Procedure**:

```
@YourBot What's the weather like in Tokyo today?
@YourBot Tell me about the latest AI technology news
@YourBot What are the recent developments in TypeScript?
```

**Expected Results**:

- ✅ Automatic web search execution
- ✅ Response based on search results
- ✅ Current/up-to-date information included
- ✅ Source links provided when relevant

#### T2-2. Non-search Queries

**Test Procedure**:

```
@YourBot What is 2+2?
@YourBot Explain basic programming concepts
@YourBot Hello, nice to meet you
```

**Expected Results**:

- ✅ Direct response without search
- ✅ Fast response (<2 seconds)
- ✅ Appropriate response without external data

### ⚡ **T3. Function Calling Testing**

#### T3-1. Character Count Function

**Test Procedure**:

```
@YourBot Count the characters in this text: "Hello, World! This is a test message."
@YourBot How many characters are in "TypeScript"?
```

**Expected Results**:

- ✅ `count_characters` function automatically executed
- ✅ Accurate character count in response
- ✅ Execution logged properly

#### T3-2. Search Function Auto-trigger

**Test Procedure**:

```
@YourBot What's the current exchange rate for USD/JPY?
@YourBot Latest tech event information
@YourBot What's trending on social media today?
```

**Expected Results**:

- ✅ `search_web` function automatically executed
- ✅ Appropriate search query generated
- ✅ Function execution → final response flow

### 📊 **T4. Rate Limiting & Model Switching**

#### T4-1. Continuous Requests

**Test Procedure**:

```
Send 10 consecutive messages:
@YourBot Test 1
@YourBot Test 2
...
@YourBot Test 10
```

**Expected Results**:

- ✅ All requests processed normally
- ✅ Response times may gradually increase
- ✅ No errors occur
- ✅ Model switching logs may appear

#### T4-2. High Load Testing

**Test Procedure**:

```
Send 15-20 messages within 1 minute:
@YourBot Complex search query: [detailed question]
@YourBot Long question: [500+ character question]
```

**Expected Results**:

- ✅ Automatic `gemini-2.0-flash` → `gemini-1.5-flash` switching
- ✅ Appropriate rate limit messages when quota reached
- ✅ Service continues without crashing

### 📝 **T5. Message Length Handling**

#### T5-1. Long Response Processing

**Test Procedure**:

```
@YourBot Tell me about the complete history of Japan
@YourBot Explain all programming languages in detail
@YourBot Write a long story about technology
```

**Expected Results**:

- ✅ Automatic message splitting when >2000 characters
- ✅ Multiple messages sent with indicators
- ✅ Format: `(1/3)`, `(2/3)`, `(3/3)`
- ✅ Content remains coherent across splits

#### T5-2. Unicode and Emoji Processing

**Test Procedure**:

```
@YourBot Process this text: "これは長い日本語の文章です..."[long text]
@YourBot Handle emojis: 🤖💻🔥✨
```

**Expected Results**:

- ✅ Proper Unicode character counting
- ✅ Emojis processed correctly
- ✅ Natural splitting positions

### 🔄 **T6. Auto-response Channel Testing**

#### T6-1. Auto-response Configuration

**Setup Method**:

```bash
# Use /config command to set up auto-response channel
/config channel add #auto-response-test
```

**Test Procedure**:

```
In #auto-response-test channel (without mentions):
What's the weather like?
Tell me some news
```

**Expected Results**:

- ✅ AI response without @mention
- ✅ No response in other channels
- ✅ Setting changes applied immediately

### ⚙️ **T7. Slash Commands Testing**

#### T7-1. /status Command

**Test Procedure**:

```
With Administrator account:
/status
```

**Expected Results**:

- ✅ Bot status and uptime displayed
- ✅ API usage statistics shown
- ✅ Memory usage information
- ✅ Response within 3 seconds

#### T7-2. /config Command

**Test Procedure**:

```
/config view
/config mention disable
/config mention enable
/config channel add #test-channel
/config channel remove #test-channel
/config prompt set "Custom prompt here"
/config strategy split
```

**Expected Results**:

- ✅ All subcommands function normally
- ✅ Settings changes applied immediately
- ✅ Appropriate confirmation messages

#### T7-3. /search Command

**Test Procedure**:

```
/search quota
/search toggle disable
/search toggle enable
/search test "latest news"
/search reset
```

**Expected Results**:

- ✅ Quota usage display
- ✅ Search functionality enable/disable toggle
- ✅ Test search executes normally
- ✅ Reset functionality works

#### T7-4. /model Command

**Test Procedure**:

```
/model info
/model stats
/model limits
```

**Expected Results**:

- ✅ Current AI model information displayed
- ✅ Usage statistics shown
- ✅ Rate limit status displayed

#### T7-5. Permission Testing

**Test Procedure**:

```
With non-administrator account:
/status
/config view
```

**Expected Results**:

- ✅ "Administrator permission required" message
- ✅ Commands not executed

### 🚨 **T8. Error Handling Testing**

#### T8-1. API Limit Reached

**Test Procedure**:

```
# Intentionally reach limits with continuous sends
@YourBot Test (30+ consecutive messages)
```

**Expected Results**:

- ✅ Appropriate "quota exceeded" message
- ✅ Bot doesn't crash
- ✅ Normal recovery after limit reset

#### T8-2. Invalid Input Testing

**Test Procedure**:

```
@YourBot [Extremely long message: 5000+ characters]
@YourBot 🤖🤖🤖🤖🤖 (emojis only)
@YourBot <@everyone> @here (dangerous mentions)
```

**Expected Results**:

- ✅ Sanitization functions normally
- ✅ Appropriate error messages
- ✅ No security issues

### 📈 **T9. Performance Testing**

#### T9-1. Response Time Measurement

**Performance Targets**:

- 🕐 Simple questions: <2 seconds
- 🔍 Search required: <5 seconds
- 💭 Complex questions: <8 seconds

#### T9-2. Concurrent Requests

**Test Procedure**:

```
Multiple users simultaneously send:
User1: @YourBot Question 1
User2: @YourBot Question 2
User3: @YourBot Question 3
```

**Expected Results**:

- ✅ All users receive appropriate responses
- ✅ Response order is appropriate
- ✅ Memory usage remains normal

---

## 🎯 **Acceptance Criteria**

### Required Tests (Core Functionality)

- ✅ T1: Basic AI responses (100% success)
- ✅ T2: Search integration (90%+ success)
- ✅ T3: Function calling (100% success)
- ✅ T4: Rate limiting handling (normal operation)
- ✅ T5: Message length handling (proper splitting)
- ✅ T7: Slash commands (100% success)

### Recommended Tests (Quality Assurance)

- ✅ T6: Auto-response channels
- ✅ T8: Error handling
- ✅ T9: Performance

### Quality Metrics

- **Response Rate**: 95%+ success
- **Average Response Time**: <5 seconds
- **Error Rate**: <5%
- **Continuous Operation**: 1+ hour without issues

---

## 📋 **Test Record Template**

### Test Execution Record

```
Date: YYYY-MM-DD
Test Environment: Discord Server [Server Name]
Bot Version: Production Ready
Tester: [Name]

□ T1-1: Mention Response - ✅ Pass / ❌ Fail
□ T1-2: Natural Conversation - ✅ Pass / ❌ Fail
□ T2-1: Search Functionality - ✅ Pass / ❌ Fail
□ T2-2: Search Decision - ✅ Pass / ❌ Fail
□ T3-1: Character Count - ✅ Pass / ❌ Fail
□ T3-2: Search Function - ✅ Pass / ❌ Fail
□ T4-1: Continuous Requests - ✅ Pass / ❌ Fail
□ T4-2: High Load - ✅ Pass / ❌ Fail
□ T5-1: Long Responses - ✅ Pass / ❌ Fail
□ T5-2: Unicode Processing - ✅ Pass / ❌ Fail
□ T6-1: Auto-response - ✅ Pass / ❌ Fail
□ T7-1: /status Command - ✅ Pass / ❌ Fail
□ T7-2: /config Command - ✅ Pass / ❌ Fail
□ T7-3: /search Command - ✅ Pass / ❌ Fail
□ T7-4: /model Command - ✅ Pass / ❌ Fail
□ T7-5: Permission Test - ✅ Pass / ❌ Fail
□ T8-1: API Limits - ✅ Pass / ❌ Fail
□ T8-2: Invalid Input - ✅ Pass / ❌ Fail
□ T9-1: Response Time - ✅ Pass / ❌ Fail
□ T9-2: Concurrent Requests - ✅ Pass / ❌ Fail

Overall Assessment: ✅ Production Ready / ❌ Requires Fixes
```

### Bug Report Template

```
Issue Description:
Reproduction Steps:
Expected Result:
Actual Result:
Log Output:
Environment: [Development/Production]
Priority: [High/Medium/Low]
```

---

## 🚀 **Next Steps**

### After Testing Completion

✅ **Production Deployment Ready**:

- All core functionality verified
- Administrative commands working
- Error handling robust
- Performance acceptable

✅ **Production Deployment Tasks**:

- Docker containerization
- Environment configuration
- Monitoring setup
- Production testing

---

## 📞 **Support**

### If Issues Occur

1. **Check Logs**: `logs/` directory output
2. **Verify Configuration**: `.env` and `config/bot-config.yaml`
3. **API Status**: Gemini API and Brave Search API availability
4. **Environment**: Ensure all required environment variables are set

### For Developers

- **Detailed Implementation**: `IMPLEMENTATION_PLAN.md`
- **Development Guide**: `CLAUDE.md`
- **Technical Specs**: `spec.md`
- **Test Framework**: `tests/README.md`

---

**🎉 Testing Complete - Gemiscord Production Ready!**
