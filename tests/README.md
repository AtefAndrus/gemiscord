# Test Guide for Gemiscord

## Quick Start

```bash
# Install test dependencies
bun install

# Run all tests
bun test

# Run tests in watch mode
bun test:watch

# Run tests with coverage
bun test:coverage

# Run only unit tests
bun test:unit

# Run only integration tests
bun test:integration
```

## Test Structure

```
tests/
├── unit/                    # Unit tests (isolated components)
│   ├── services/           # Service layer tests
│   ├── handlers/           # Event handler tests
│   └── utils/              # Utility function tests
├── integration/            # Integration tests (multiple components)
├── fixtures/               # Test data and configuration
│   └── config/            # Test configuration files
└── setup.ts               # Global test setup
```

## Writing Tests

### Unit Test Example

```typescript
// tests/unit/services/example.test.ts
import { ExampleService } from "../../../src/services/example";

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
import { ServiceA } from "../../src/services/serviceA";
import { ServiceB } from "../../src/services/serviceB";

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

## Mocking External Dependencies

### API Mocking

```typescript
// Mock fetch for API tests
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ result: "mocked" }),
});
```

### Discord.js Mocking

```typescript
// Mock Discord message
const mockMessage = {
  content: "test message",
  author: { bot: false, id: "user123" },
  guild: { id: "guild123" },
  channel: { id: "channel123", sendTyping: jest.fn() },
  reply: jest.fn(),
};
```

## Test Development Workflow

### Phase 2 Implementation (Current)

1. **Before implementing a service**:

   ```bash
   # Create test file
   touch tests/unit/services/gemini.test.ts
   # Write failing tests first
   bun test tests/unit/services/gemini.test.ts
   ```

2. **During implementation**:

   ```bash
   # Run tests in watch mode
   bun test:watch
   # Tests should pass as you implement
   ```

3. **After implementation**:
   ```bash
   # Run full test suite
   bun test
   # Check coverage
   bun test:coverage
   ```

### Test-First Development Steps

1. **Write Test** → 2. **See Fail** → 3. **Write Code** → 4. **See Pass** → 5. **Refactor**

## Coverage Requirements

- **Unit Tests**: 80% coverage minimum
- **Integration Tests**: All major workflows
- **E2E Tests**: Critical user scenarios

## Test Environment

- **Environment**: `NODE_ENV=test`
- **Database**: In-memory SQLite for isolation
- **APIs**: Mocked external calls
- **Configuration**: Test-specific config files

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

### Testing with Timeouts

```typescript
it("should timeout appropriately", async () => {
  jest.setTimeout(10000); // 10 seconds

  const result = await service.longRunningMethod();
  expect(result).toBeDefined();
});
```

## Debugging Tests

```bash
# Run specific test file
bun test tests/unit/services/config.test.ts

# Run tests matching pattern
bun test --testNamePattern="should handle"

# Run tests with verbose output
bun test --verbose

# Debug specific test
bun test --detectOpenHandles --forceExit tests/unit/services/config.test.ts
```

## CI/CD Integration

```bash
# CI test command (no watch, with coverage)
bun test:ci
```

This command is designed for continuous integration environments and includes:

- Coverage reporting
- No watch mode
- Exit on completion
- Standardized output format

## Best Practices

1. **Test Naming**: Use descriptive test names that explain the expected behavior
2. **Test Isolation**: Each test should be independent and not rely on other tests
3. **Setup/Teardown**: Use `beforeEach`/`afterEach` for test isolation
4. **Mocking**: Mock external dependencies to ensure test reliability
5. **Assertions**: Use specific assertions that clearly indicate success/failure
6. **Coverage**: Aim for high coverage but focus on meaningful tests

## Troubleshooting

### Common Issues

1. **Tests hanging**: Check for unresolved promises or open handles
2. **Mock issues**: Ensure mocks are properly cleared between tests
3. **Database issues**: Use test-specific database instances
4. **Type errors**: Make sure Jest types are properly installed

### Getting Help

- Check Jest documentation: https://jestjs.io/docs/getting-started
- Review existing test files for patterns
- Run tests with `--verbose` for detailed output
