# Test Guide for Gemiscord

## Quick Start

```bash
# Install dependencies
bun install

# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Run only unit tests
bun test tests/unit

# Run only integration tests
bun test tests/integration

# Run tests with verbose output
bun test --verbose

# Run specific test file
bun test tests/unit/services/gemini.test.ts
```

## Test Framework

**Bun Native Test Runner** - 100x faster than Jest with full compatibility

- **Jest Compatibility**: `jest.fn()`, `jest.spyOn()`, `expect()`, `describe()`, `it()`
- **No Jest Module Mocking**: Use direct mocking with `jest.fn()` instead
- **Native Performance**: ~400ms for full test suite execution
- **Built-in Coverage**: No additional configuration needed

## Test Structure

```text
tests/
├── unit/                    # Unit tests (isolated components)
│   ├── services/           # Service layer tests
│   │   ├── gemini.test.ts
│   │   ├── braveSearch.test.ts
│   │   └── rateLimit.test.ts
│   └── utils/              # Utility function tests
├── integration/            # Integration tests (multiple components)
│   └── message-flow.test.ts # E2E message processing tests
├── fixtures/               # Test data and configuration
│   └── config/            # Test configuration files
└── setup.ts               # Global test setup (bun:test imports)
```

## Writing Tests

### Unit Test Example

```typescript
// tests/unit/services/example.test.ts
import { ExampleService } from "../../../src/services/example.js";

describe("ExampleService", () => {
  let service: ExampleService;

  beforeEach(() => {
    service = new ExampleService();
  });

  it("should do something", () => {
    const result = service.doSomething();
    expect(result).toBe("expected");
  });
});
```

### Integration Test Example

```typescript
// tests/integration/example-integration.test.ts
import { ServiceA } from "../../src/services/serviceA.js";
import { ServiceB } from "../../src/services/serviceB.js";

describe("Service Integration", () => {
  let serviceA: ServiceA;
  let serviceB: ServiceB;

  beforeAll(async () => {
    serviceA = new ServiceA();
    serviceB = new ServiceB(serviceA);
    await serviceA.initialize();
  });

  it("should integrate correctly", async () => {
    const result = await serviceB.process("test data");
    expect(result).toBeDefined();
  });
});
```

## Mocking with Bun

### Service Mocking (Recommended)

```typescript
// Create mocks directly with jest.fn()
const mockGeminiService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  generateContent: jest.fn().mockResolvedValue({
    text: "Mock response",
    functionCalls: [],
    usage: { totalTokens: 50 },
  }),
  switchModel: jest.fn(),
};

// Inject mocks via dependency injection
const handler = new MessageCreateHandler();
(handler as any).geminiService = mockGeminiService;
```

### API Mocking

```typescript
// Mock fetch globally for API tests
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ result: "mocked" }),
}) as any;
```

### Discord.js Mocking

```typescript
// Mock Discord message
const mockMessage = {
  content: "test message",
  author: { bot: false, id: "user123" },
  guild: { id: "guild123" },
  channel: {
    id: "channel123",
    sendTyping: jest.fn(),
    send: jest.fn(),
  },
  reply: jest.fn(),
  mentions: { users: new Map() },
};
```

## Test Configuration

### Global Setup (tests/setup.ts)

```typescript
import { jest, expect, afterEach } from "bun:test";

// Environment variables for tests
process.env.NODE_ENV = "test";
process.env.GEMINI_API_KEY = "test-api-key";
process.env.BRAVE_SEARCH_API_KEY = "test-brave-key";

// Global fetch mock
global.fetch = jest.fn() as any;

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});
```

### Bun Configuration (bunfig.toml)

```toml
[test]
preload = ["./tests/setup.ts"]
timeout = 10000
coverage = true
coverageDir = "coverage"
coverageReporters = ["text", "lcov", "html"]
logLevel = "error"
```

## Test Development Workflow

### Phase 2 Implementation (Current Status)

**✅ Completed Tests**:

- GeminiService: 10 tests - Function calling, model switching
- BraveSearchService: 17 tests - API integration, quota management
- RateLimitService: 17 tests - Rate limiting, model fallback
- Integration: 10 tests - End-to-end message flow

### Test-First Development Steps

1. **Write Test** → 2. **See Fail** → 3. **Write Code** → 4. **See Pass** → 5. **Refactor**

```bash
# Create test file first
touch tests/unit/services/newService.test.ts

# Write failing tests
bun test tests/unit/services/newService.test.ts

# Implement service
# ...

# Tests should pass
bun test tests/unit/services/newService.test.ts
```

## Coverage Requirements

- **Unit Tests**: 80% coverage minimum ✅ Achieved
- **Integration Tests**: All major workflows ✅ Complete
- **Performance**: <500ms total execution time ✅ ~400ms

## Common Test Patterns

### Testing Async Functions

```typescript
it("should handle async operations", async () => {
  const result = await service.asyncMethod();
  expect(result).toBeDefined();
});
```

### Testing Error Handling

```typescript
it("should handle errors gracefully", async () => {
  jest.spyOn(service, "method").mockRejectedValue(new Error("Test error"));

  await expect(service.methodThatCalls()).rejects.toThrow("Test error");
});
```

### Testing Function Calls

```typescript
it("should call dependencies correctly", () => {
  const mockDependency = jest.fn();
  service.setDependency(mockDependency);

  service.doSomething();

  expect(mockDependency).toHaveBeenCalledWith("expected-args");
});
```

## Test Environment

- **Environment**: `NODE_ENV=test`
- **Database**: In-memory SQLite for isolation
- **APIs**: Mocked external calls (Gemini, Brave Search)
- **Configuration**: Test-specific config files in `tests/fixtures/`

## Debugging Tests

```bash
# Run specific test file
bun test tests/unit/services/gemini.test.ts

# Run tests matching pattern
bun test --testNamePattern="should handle"

# Run tests with verbose output
bun test --verbose

# Run with timeout for slow tests
bun test --timeout 30000
```

## Performance Testing

```bash
# Measure test execution time
time bun test

# Run with coverage (slightly slower)
time bun test --coverage

# Watch mode for development
bun test --watch
```

**Expected Performance**:

- Full test suite: ~400ms
- Unit tests only: ~200ms
- Integration tests: ~100ms

## CI/CD Integration

```bash
# CI test command
bun test --coverage --bail

# Coverage threshold check
bun test --coverage --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80,"statements":80}}'
```

## Bun-Specific Features

### What Works (✅)

- `jest.fn()` - Function mocking
- `jest.spyOn()` - Method spying
- `jest.clearAllMocks()` - Mock cleanup
- `expect()` - All Jest matchers
- `describe()`, `it()`, `beforeEach()`, `afterEach()`
- Async/await testing
- Custom matchers with `expect.extend()`

### What Doesn't Work (❌)

- `jest.mock()` - Module mocking (use dependency injection)
- `jest.doMock()` - Dynamic mocking
- Jest transformers - Use Bun's built-in TypeScript support

### Migration Notes

```typescript
// ❌ Don't use jest.mock()
jest.mock("../service", () => ({
  Service: jest.fn(),
}));

// ✅ Use dependency injection instead
const mockService = {
  method: jest.fn().mockReturnValue("mocked"),
};
instance.setService(mockService);
```

## Best Practices

1. **Test Naming**: Use descriptive names explaining expected behavior
2. **Test Isolation**: Each test independent, proper cleanup
3. **Mock Management**: Clear mocks between tests with `jest.clearAllMocks()`
4. **Dependency Injection**: Prefer DI over module mocking
5. **Specific Assertions**: Use precise matchers for clear failure messages
6. **Coverage Focus**: Aim for meaningful tests, not just coverage numbers

## Troubleshooting

### Common Issues

1. **Tests hanging**: Check for unresolved promises or missing await
2. **Mock issues**: Ensure mocks are cleared between tests
3. **Import errors**: Use `.js` extensions for ES modules
4. **Type errors**: Ensure proper TypeScript configuration

### Solutions

```typescript
// ✅ Proper async testing
it("should handle async", async () => {
  await expect(asyncFunction()).resolves.toBe(expected);
});

// ✅ Proper mock cleanup
afterEach(() => {
  jest.clearAllMocks();
});

// ✅ Proper ES module imports
import { Service } from "../src/services/service.js";
```

## Phase 3 Lessons Learned (Slash Commands Testing)

### 🚨 Critical Bun Test Framework Issues

During Phase 3 implementation, several Bun-specific issues were discovered:

#### **1. Mock Function Import Syntax**

```typescript
// ❌ WRONG - Jest syntax doesn't work in Bun
import { describe, it, expect, beforeEach } from "bun:test";
const mockService = {
  method: jest.fn(), // ReferenceError: jest is not defined
};

// ✅ CORRECT - Import mock from bun:test
import { describe, it, expect, beforeEach, mock } from "bun:test";
const mockService = {
  method: mock(), // Works correctly
};
```

#### **2. Module Mocking Limitations**

```typescript
// ❌ WRONG - Cannot assign to readonly ES module properties
const interactionModule = await import(
  "../../../src/handlers/interactionCreate.js"
);
(interactionModule as any).hasAdminPermission = mockFunction; // TypeError: readonly property

// ✅ WORKAROUND - Use alternative mocking approaches
// Option 1: Dependency injection in beforeEach
beforeEach(async () => {
  const commandModule = await import("../../../src/commands/status.js");
  // Test implementation needs to support DI
});

// Option 2: Mock at construction time (preferred)
const mockInteractionHelpers = {
  hasAdminPermission: mock(),
  sendPermissionDenied: mock(),
};
```

#### **3. Discord.js Command Testing Pattern**

```typescript
// ✅ RECOMMENDED - Command testing structure
describe("Command Tests", () => {
  let mockInteraction: any;

  beforeEach(() => {
    // Reset ALL mocks explicitly
    Object.values(mockServices).forEach((service) => {
      Object.values(service).forEach((mockFn) => (mockFn as any).mockClear());
    });

    // Create fresh interaction mock
    mockInteraction = {
      guild: { id: "test-guild", name: "Test Guild" },
      user: { id: "test-user" },
      deferReply: mock().mockResolvedValue(undefined),
      editReply: mock().mockResolvedValue(undefined),
      reply: mock().mockResolvedValue(undefined),
    };
  });

  it("should handle permission checks", async () => {
    // Setup mocks for this specific test
    mockHelpers.hasAdminPermission.mockReturnValue(false);

    await handleCommand(mockInteraction);

    expect(mockHelpers.sendPermissionDenied).toHaveBeenCalledWith(
      mockInteraction
    );
  });
});
```

#### **4. Integration Test Configuration Issues**

```typescript
// ⚠️ ISSUE - Some ConfigService operations don't clear properly
it("should clear server prompts", async () => {
  // Setting undefined doesn't always clear in integration tests
  await configService.setGuildConfig(guildId, {
    server_prompt: undefined, // May not clear properly
  });

  // ✅ SOLUTION - Use clearGuildSettings instead
  await configService.clearGuildSettings(guildId);

  const config = await configService.getGuildConfig(guildId);
  expect(config.server_prompt).toBeUndefined(); // Now works
});
```

#### **5. Missing Import Requirements**

```typescript
// ❌ WRONG - Missing required imports
import { describe, it, expect, beforeEach } from "bun:test";

describe("tests", () => {
  afterEach(() => {
    // ReferenceError: afterEach is not defined
    // cleanup
  });
});

// ✅ CORRECT - Import ALL needed functions
import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
```

### 📋 **Phase 3 Command Testing Checklist**

Use this checklist for future Discord.js command testing:

- [ ] Import `mock` from `bun:test` (not `jest.fn()`)
- [ ] Import `afterEach` if using cleanup
- [ ] Use `(mockFn as any).mockClear()` for TypeScript safety
- [ ] Test permission validation for admin-only commands
- [ ] Test guild context validation where required
- [ ] Mock Discord interaction objects completely
- [ ] Test all subcommands and their parameters
- [ ] Test error handling and unknown commands
- [ ] Verify embed formatting for complex responses
- [ ] Use `clearGuildSettings()` for integration test cleanup

### 🛠 **Testing Discord Commands - Best Practices**

```typescript
// ✅ COMPLETE command test template
import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { ChannelType } from "discord.js";
import { handleCommandName } from "../../../src/commands/commandName.js";

const mockConfigService = {
  getGuildConfig: mock(),
  setGuildConfig: mock(),
} as any;

const mockInteractionHelpers = {
  hasAdminPermission: mock(),
  sendPermissionDenied: mock(),
  getSubcommand: mock(),
  getStringOption: mock(),
};

describe("Command Tests", () => {
  let mockInteraction: any;

  beforeEach(() => {
    // Clear all mocks
    Object.values(mockConfigService).forEach((mockFn) =>
      (mockFn as any).mockClear()
    );
    Object.values(mockInteractionHelpers).forEach((mockFn) =>
      (mockFn as any).mockClear()
    );

    // Fresh interaction
    mockInteraction = {
      guild: { id: "test-guild", name: "Test Guild" },
      user: { id: "test-user" },
      deferReply: mock().mockResolvedValue(undefined),
      editReply: mock().mockResolvedValue(undefined),
      reply: mock().mockResolvedValue(undefined),
    };

    // Setup default mocks
    mockInteractionHelpers.hasAdminPermission.mockReturnValue(true);
  });

  afterEach(() => {
    // Environment cleanup if needed
  });

  describe("Permission Validation", () => {
    it("should deny non-admin access", async () => {
      mockInteractionHelpers.hasAdminPermission.mockReturnValue(false);

      // Mock module dependencies (where possible)
      const interactionModule = await import(
        "../../../src/handlers/interactionCreate.js"
      );
      // Apply mocks through dependency injection or other patterns

      await handleCommandName(mockInteraction);

      expect(mockInteractionHelpers.sendPermissionDenied).toHaveBeenCalledWith(
        mockInteraction
      );
    });
  });

  // Add specific command tests...
});
```

### ⚠️ **Known Limitations & Workarounds**

1. **ES Module Readonly Properties**: Cannot directly mock imported functions

   - **Solution**: Use dependency injection patterns in implementation

2. **Complex Integration Tests**: Some scenarios need specific setup order

   - **Solution**: Use `clearGuildSettings()` for reliable cleanup

3. **TypeScript Strict Mode**: Mock types need explicit casting
   - **Solution**: Use `(mockFn as any).mockClear()` pattern

### 📈 **Coverage Achieved**

Phase 3 testing implementation achieved:

- **146/146 tests passing** (100% success rate)
- **77.85% line coverage** (close to 80% target)
- **Complete command coverage** (all 4 slash commands)
- **Integration test coverage** (E2E workflows)

## Migration from Jest

**Completed**: ✅ Full migration to Bun native test runner

**Benefits Achieved**:

- 100x faster test execution
- Native TypeScript support
- Simplified configuration
- Built-in coverage reporting
- No additional dependencies

**Breaking Changes**: None - Full Jest API compatibility maintained (with noted syntax differences)
