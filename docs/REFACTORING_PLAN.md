# Gemiscord Refactoring Plan

**Created**: June 27, 2025
**Last Updated**: June 27, 2025
**Status**: Phase 1 In Progress
**Current Phase**: Phase 1 - Command Handler Abstraction
**Priority**: High (Code Quality & Maintainability)

## 🎯 Executive Summary

This document outlines a comprehensive refactoring plan for the Gemiscord project to eliminate code duplication, improve maintainability, and establish consistent architectural patterns. The plan addresses critical issues found through automated similarity detection and manual code analysis.

## 📈 Progress Tracking

### **CRITICAL INSTRUCTIONS FOR DEVELOPMENT TEAM**

**⚠️ MANDATORY PROGRESS UPDATES ⚠️**

1. **Before starting any work**: Update the "Current Status" section below
2. **After completing each task**: Mark it as ✅ COMPLETED with date and notes
3. **When encountering blockers**: Add 🚫 BLOCKED with explanation
4. **Daily**: Update "Last Updated" date at the top of this document
5. **After each phase**: Run verification commands and update results

### **Current Status**

**Phase**: Phase 1 - Command Handler Abstraction
**Started**: June 27, 2025
**Assigned**: Claude Code Assistant
**Last Activity**: June 27, 2025 - Phase 1 COMPLETED! All command handler abstractions done.

**Next Action Required**: Begin Phase 2 - Service Layer Decomposition (messageCreate.ts, gemini.ts, braveSearch.ts)

### **Progress Overview**

| Phase                          | Status         | Start Date | End Date | Completion % | Notes           |
| ------------------------------ | -------------- | ---------- | -------- | ------------ | --------------- |
| Phase 1: Command Abstraction   | ✅ COMPLETED   | 2025-06-27 | 2025-06-27 | 100%         | All tasks ✅ Complete |
| Phase 2: Service Decomposition | ⏳ PENDING     | -          | -        | 0%           | Waiting Phase 1 |
| Phase 3: Config Unification    | ⏳ PENDING     | -          | -        | 0%           | Waiting Phase 2 |
| Phase 4: Type System           | ⏳ PENDING     | -          | -        | 0%           | Waiting Phase 3 |
| Phase 5: QA & Documentation    | ⏳ PENDING     | -          | -        | 0%           | Waiting Phase 4 |

### **Task-Level Progress**

#### **Phase 1: Command Handler Abstraction**

- [x] ✅ **Task 1.1**: Create BaseCommandHandler class

  - Status: COMPLETED
  - File: `src/handlers/BaseCommandHandler.ts`
  - Start Date: 2025-06-27
  - End Date: 2025-06-27
  - Assigned: Claude Code Assistant
  - Notes: ✅ BaseCommandHandler created with common patterns. ✅ Refactored handleMentionSubcommand using new base class. ✅ Eliminated 32 lines of duplicate code. ✅ TypeScript compilation clean.

- [x] ✅ **Task 1.2**: Extract command utilities

  - Status: COMPLETED
  - File: `src/utils/commandUtils.ts`
  - Start Date: 2025-06-27
  - End Date: 2025-06-27
  - Assigned: Claude Code Assistant
  - Notes: ✅ Created commandUtils.ts (284 lines) with ConfigActionHandler and CommandValidators. ✅ Refactored handleToggleSubcommand (search.ts) and handleStrategySubcommand (config.ts). ✅ Reduced config.ts from 453→424 lines. ✅ Maintained 0 code duplicates. ✅ All tests passing.

- [x] ✅ **Task 1.3**: Refactor config.ts command handlers

  - Status: COMPLETED
  - Files: `src/commands/config.ts`
  - Start Date: 2025-06-27
  - End Date: 2025-06-27
  - Assigned: Claude Code Assistant
  - Notes: ✅ Extended commandUtils.ts with ExtendedConfigHandlers (472 lines total). ✅ Refactored handleChannelSubcommand: 59 lines → 9 lines (85% reduction). ✅ Refactored handlePromptSubcommand: 42 lines → 12 lines (71% reduction). ✅ Reduced config.ts from 424→349 lines (17.7% reduction). ✅ Maintained 0 code duplicates. ✅ All tests passing.

- [x] ✅ **Task 1.4**: Refactor search.ts toggle functionality

  - Status: COMPLETED
  - Files: `src/commands/search.ts`
  - Start Date: 2025-06-27
  - End Date: 2025-06-27
  - Assigned: Claude Code Assistant
  - Notes: ✅ Completed in Task 1.2. handleToggleSubcommand refactored using ConfigActionHandler: 47 lines → 22 lines (53% reduction).

- [x] ✅ **Task 1.5**: Update tests for new patterns
  - Status: COMPLETED
  - Files: `tests/` directory
  - Start Date: 2025-06-27
  - End Date: 2025-06-27
  - Assigned: Claude Code Assistant
  - Notes: ✅ All existing tests continue to pass with new patterns. No test updates required as functionality is preserved. 46/46 tests passing.

### **Blocker Tracking**

| Issue               | Impact | Date Identified | Resolution Status | Notes |
| ------------------- | ------ | --------------- | ----------------- | ----- |
| No current blockers | -      | -               | -                 | -     |

### **Metrics Tracking**

| Metric            | Baseline                  | Current   | Target    | Status         |
| ----------------- | ------------------------- | --------- | --------- | -------------- |
| Code Duplicates   | 3 pairs (85%+ similarity) | 0 pairs   | 0 pairs   | 🟢 Target Achieved |
| Largest File Size | 805 lines                 | 805 lines | 400 lines | 🔴 Not Started |
| Test Coverage     | 80%+                      | 80%+      | 80%+      | 🟢 Maintained  |
| TypeScript Errors | 0                         | 0         | 0         | 🟢 Clean       |

### **How to Update This Document**

1. **When starting a task**:

   ```markdown
   - [x] 🟡 **Task X.Y**: Description
     - Status: IN PROGRESS
     - Start Date: YYYY-MM-DD
     - Assigned: [Your Name]
     - Notes: [What you're working on]
   ```

2. **When completing a task**:

   ```markdown
   - [x] ✅ **Task X.Y**: Description
     - Status: COMPLETED
     - Start Date: YYYY-MM-DD
     - End Date: YYYY-MM-DD
     - Assigned: [Your Name]
     - Notes: [What was accomplished, any issues encountered]
   ```

3. **When blocked**:

   ```markdown
   - [x] 🚫 **Task X.Y**: Description
     - Status: BLOCKED
     - Start Date: YYYY-MM-DD
     - Blocker: [Description of what's blocking progress]
     - Notes: [Steps tried, what's needed to unblock]
   ```

4. **Update metrics after each task**:
   - Run verification commands
   - Update metrics table
   - Document any changes in notes

## 📊 Current State Analysis

### Code Duplication Detected

Using `similarity-ts` tool, we identified significant code duplication:

| Function Pair                                           | Similarity | Files                 | Issue                  |
| ------------------------------------------------------- | ---------- | --------------------- | ---------------------- |
| `handleMentionSubcommand` vs `handleToggleSubcommand`   | 85.97%     | config.ts ↔ search.ts | Enable/disable pattern |
| `handleMentionSubcommand` vs `handleChannelSubcommand`  | 80.79%     | config.ts internal    | Command structure      |
| `handleMentionSubcommand` vs `handleStrategySubcommand` | 85.24%     | config.ts internal    | Validation patterns    |

### Large Files Requiring Attention

| File                        | Lines | Primary Issues                         |
| --------------------------- | ----- | -------------------------------------- |
| `handlers/messageCreate.ts` | 805   | Complex message processing logic       |
| `services/braveSearch.ts`   | 655   | Multiple service responsibilities      |
| `services/gemini.ts`        | 609   | Large API client with mixed concerns   |
| `utils/logger.ts`           | 607   | Comprehensive but could be modularized |
| `commands/model.ts`         | 537   | Complex command handling               |
| `services/config.ts`        | 458   | Configuration management complexity    |
| `commands/search.ts`        | 472   | Similar patterns to other commands     |
| `commands/config.ts`        | 453   | Duplicate subcommand patterns          |

## 🔧 Refactoring Strategy

### Phase 1: Command Handler Abstraction (Week 1)

#### **Objective**: Eliminate 85%+ code duplication in command handlers

#### **Tasks**:

1. **Create BaseCommandHandler Class**

   ```typescript
   // src/handlers/BaseCommandHandler.ts
   abstract class BaseCommandHandler {
     protected abstract commandName: string;

     // Common patterns
     protected async checkPermissions(
       interaction: ChatInputCommandInteraction
     ): Promise<boolean>;
     protected async deferReply(
       interaction: ChatInputCommandInteraction
     ): Promise<void>;
     protected async validateAction(
       action: string,
       allowedActions: string[]
     ): Promise<void>;
     protected async updateConfig(
       guildId: string,
       updates: Partial<GuildConfig>
     ): Promise<void>;
     protected formatResponse(enabled: boolean, feature: string): string;
     protected async logAction(action: string, context: object): Promise<void>;
   }
   ```

2. **Extract Command Utilities**

   ```typescript
   // src/utils/commandUtils.ts
   export class ConfigActionHandler {
     static async handleToggleAction(
       interaction: ChatInputCommandInteraction,
       guildId: string,
       configKey: keyof GuildConfig,
       featureName: string
     ): Promise<void>;
   }
   ```

3. **Refactor Existing Commands**
   - Convert `handleMentionSubcommand`, `handleToggleSubcommand`, `handleStrategySubcommand` to use shared patterns
   - Reduce code duplication from 85% to <10%
   - Maintain existing functionality and test coverage

#### **Expected Outcome**:

- Eliminate all detected code duplication
- Reduce command file sizes by 30-40%
- Establish consistent command patterns

### Phase 2: Service Layer Decomposition (Week 2)

#### **Objective**: Break down large services into focused, single-responsibility components

#### **Tasks**:

1. **Message Handler Refactoring**

   ```typescript
   // Before: messageCreate.ts (805 lines)
   // After: Split into:
   - MessageRouter.ts (routing logic)
   - ContextBuilder.ts (message context creation)
   - ResponseHandler.ts (response formatting)
   - MessageCreateHandler.ts (coordination, <200 lines)
   ```

2. **Gemini Service Decomposition**

   ```typescript
   // Before: gemini.ts (609 lines)
   // After: Split into:
   - GeminiClient.ts (API communication)
   - ModelManager.ts (model switching, caching)
   - FunctionHandler.ts (function calling logic)
   - GeminiService.ts (main facade, <200 lines)
   ```

3. **Search Service Refactoring**
   ```typescript
   // Before: braveSearch.ts (655 lines)
   // After: Split into:
   - SearchClient.ts (API communication)
   - QueryProcessor.ts (query enhancement)
   - ResultFormatter.ts (response formatting)
   - BraveSearchService.ts (main facade, <200 lines)
   ```

#### **Expected Outcome**:

- No file larger than 400 lines
- Clear separation of concerns
- Improved testability and maintainability

### Phase 3: Configuration System Unification (Week 3)

#### **Objective**: Merge ConfigManager and ConfigService into cohesive system

#### **Tasks**:

1. **Create Configuration Facade**

   ```typescript
   // src/services/ConfigFacade.ts
   export class ConfigFacade {
     private staticConfig: ConfigManager;
     private dynamicConfig: ConfigService;

     // Unified interface for all configuration access
     async getGuildConfig(guildId: string): Promise<GuildConfig>;
     async updateGuildConfig(
       guildId: string,
       updates: Partial<GuildConfig>
     ): Promise<void>;
     getStaticConfig(): ConfigData;

     // Configuration change events
     onConfigChange(callback: (event: ConfigChangeEvent) => void): void;
   }
   ```

2. **Implement Configuration Validation**

   ```typescript
   // src/validation/configSchema.ts
   export const GuildConfigSchema = {
     mention_enabled: { type: "boolean", default: true },
     search_enabled: { type: "boolean", default: false },
     response_channels: { type: "array", items: "string", default: [] },
   };
   ```

3. **Add Configuration Events**
   ```typescript
   // Notify components when configuration changes
   configFacade.onConfigChange((event) => {
     if (event.key === "search_enabled") {
       searchService.updateSettings(event.value);
     }
   });
   ```

#### **Expected Outcome**:

- Single entry point for all configuration
- Validated configuration changes
- Event-driven configuration updates

### Phase 4: Type System Consolidation (Week 4)

#### **Objective**: Organize types by domain and create shared interfaces

#### **Tasks**:

1. **Reorganize Type Files**

   ```typescript
   // Before: 7 separate type files
   // After: Domain-grouped types
   - types/commands/index.ts (command-related types)
   - types/services/index.ts (service interfaces)
   - types/discord/index.ts (Discord-specific types)
   - types/api/index.ts (external API types)
   - types/core/index.ts (shared core types)
   ```

2. **Create Standard Interfaces**

   ```typescript
   // src/interfaces/core.ts
   export interface ICommandHandler {
     commandName: string;
     handle(interaction: ChatInputCommandInteraction): Promise<void>;
     initialize?(): Promise<void>;
   }

   export interface IServiceClient {
     initialize(): Promise<void>;
     isHealthy(): Promise<boolean>;
   }
   ```

3. **Add Utility Types**

   ```typescript
   // src/types/utilities.ts
   export type ApiResponse<T> = {
     success: boolean;
     data?: T;
     error?: string;
   };

   export type ConfigUpdate<T> = Partial<T> & {
     updatedAt: Date;
     updatedBy: string;
   };
   ```

#### **Expected Outcome**:

- Well-organized type system
- Consistent interfaces across services
- Better TypeScript development experience

## 📋 Implementation Schedule

### Week 1: Foundation (Command Abstraction)

- [ ] Create BaseCommandHandler class
- [ ] Extract command utilities
- [ ] Refactor config.ts command handlers
- [ ] Refactor search.ts toggle functionality
- [ ] Update tests for new patterns

### Week 2: Service Decomposition

- [ ] Refactor messageCreate.ts handler
- [ ] Split GeminiService into focused components
- [ ] Split BraveSearchService into focused components
- [ ] Update service initialization in bot.ts
- [ ] Update dependency injection patterns

### Week 3: Configuration Unification

- [ ] Create ConfigFacade class
- [ ] Implement configuration validation
- [ ] Add configuration change events
- [ ] Migrate existing code to use facade
- [ ] Update configuration-related tests

### Week 4: Type System Organization

- [ ] Reorganize type files by domain
- [ ] Create standard service interfaces
- [ ] Add utility types and helpers
- [ ] Update imports across codebase
- [ ] Validate TypeScript compilation

### Week 5: Quality Assurance & Documentation

- [ ] Run full test suite and update coverage
- [ ] Performance testing and optimization
- [ ] Update documentation for new patterns
- [ ] Code review and final adjustments
- [ ] Create migration guide for future developers

## 🎯 Success Metrics

### Quantitative Goals

- **Code Duplication**: Reduce from 85% to <10% for identified patterns
- **File Size**: No file larger than 400 lines
- **Test Coverage**: Maintain 80%+ coverage throughout refactoring
- **Build Time**: No regression in build performance
- **Response Time**: No regression in bot response times

### Qualitative Goals

- **Maintainability**: Easier to add new features
- **Readability**: Clear separation of concerns
- **Testability**: Better mocking and isolation
- **Consistency**: Standardized patterns across codebase

## ⚠️ Risk Management

### Technical Risks

- **Breaking Changes**: Use incremental migration approach
- **Test Failures**: Update tests alongside code changes
- **Performance Regression**: Monitor response times during refactoring
- **Complex Dependencies**: Refactor one service at a time

### Process Risks

- **Scope Creep**: Stick to defined phases and deliverables
- **Coordination**: Use todo list and clear documentation
- **Time Overrun**: Prioritize high-impact changes first

### Mitigation Strategies

- **Incremental Deployment**: Deploy phase by phase
- **Rollback Plan**: Maintain git branches for each phase
- **Monitoring**: Track metrics before and after changes
- **Documentation**: Keep detailed change logs

## 🔄 Verification Commands

### Code Quality Checks

```bash
# Check for remaining duplicates
similarity-ts src/ --threshold 0.8 --min-tokens 20

# Verify TypeScript compilation
bun run typecheck

# Run full test suite
bun test --coverage

# Check code style
bun run lint
```

### File Size Monitoring

```bash
# Monitor file sizes
find src/ -name "*.ts" -exec wc -l {} + | sort -n | tail -10

# Check largest files
find src/ -name "*.ts" -exec sh -c 'echo "$(wc -l < "$1") $1"' _ {} \; | sort -nr | head -5
```

## 📚 References

- **Similarity Detection**: `docs/check-similarity.md`
- **Current Architecture**: `docs/spec.md`
- **Testing Framework**: `tests/README.md`
- **Project Status**: `CLAUDE.md`

## 🤝 Collaboration Notes

### **⚠️ MANDATORY WORKFLOW FOR ALL DEVELOPERS**

#### **Before Starting Work (REQUIRED)**

1. **Check Todo List**: Use `TodoRead` to see current progress
2. **Update This Document**:
   - Update "Last Updated" date at top
   - Update "Current Status" section with your name and start date
   - Mark your task as "IN PROGRESS" in the task list
3. **Run Baseline Checks**:
   ```bash
   # Check current state
   similarity-ts src/ --threshold 0.8 --min-tokens 20
   bun test --coverage
   bun run typecheck
   ```

#### **During Development (REQUIRED)**

1. **Daily Updates**: Update task status and notes every day
2. **Document Blockers**: Immediately add any blockers to tracking table
3. **Commit Frequently**: Small, focused commits with clear messages
4. **Test Continuously**: Run tests after each significant change

#### **After Completing Work (REQUIRED)**

1. **Update Progress**: Mark task as COMPLETED with date and notes
2. **Run Verification**: Execute all verification commands
3. **Update Metrics**: Update the metrics tracking table
4. **Document Changes**: Add notes about what was accomplished
5. **Update Next Steps**: Update "Next Action Required" for next developer

### **Handoff Instructions**

#### **If You Must Stop Mid-Task**

1. **Update Status**: Mark task as "PAUSED" with current state
2. **Document Progress**: Write detailed notes about what's been done
3. **List Next Steps**: Specific next actions for the next developer
4. **Commit Work**: Push all current work to a branch
5. **Update Blockers**: Document any issues encountered

#### **If You're Picking Up Someone Else's Work**

1. **Read All Notes**: Understand what was done and what's next
2. **Check Commit History**: See recent changes
3. **Run Tests**: Ensure everything is working
4. **Contact Previous Developer**: If notes are unclear

### **For Continuing Development**

1. **Check Todo List**: Use `TodoRead` to see current progress
2. **Run Similarity Check**: Always check for new duplicates after changes
3. **Test Early**: Run tests after each phase completion
4. **Document Changes**: Update this file as work progresses

### Code Review Checklist

- [ ] No functions with >85% similarity
- [ ] No files larger than 400 lines
- [ ] All new code follows established patterns
- [ ] Tests updated and passing
- [ ] Documentation updated

---

**Note**: This refactoring plan is designed to be implemented incrementally. Each phase can be completed independently, allowing for flexible scheduling and reduced risk of breaking changes.

## 📋 Quick Start Guide for New Developers

### **🚀 First Time Setup**

1. **Read This First**:

   - Section "📈 Progress Tracking" (lines 13-126) - **MANDATORY**
   - Section "🤝 Collaboration Notes" (lines 482+) - **MANDATORY**

2. **Check Current Status**:

   - Look at "Current Status" section (lines 25-32)
   - Check "Next Action Required"
   - Review "Task-Level Progress" (lines 44-75)

3. **Understand the Plan**:

   - Read "🔧 Refactoring Strategy" (lines 170+) for technical details
   - Check "📋 Implementation Schedule" (lines 394+) for timeline

4. **Before Starting**:
   - Follow "Before Starting Work (REQUIRED)" instructions
   - Update your progress in this document
   - Run baseline verification commands

### **📍 Current State Summary**

**What's Done**: ✅ Planning and documentation complete
**What's Next**: 🚧 Phase 1 - Create BaseCommandHandler class
**Who's Working**: 👤 Unassigned
**Status**: 🔄 Ready to begin implementation

### **🎯 Immediate Next Steps**

1. **Start Here**: Task 1.1 - Create BaseCommandHandler class
2. **File to Create**: `src/handlers/BaseCommandHandler.ts`
3. **Reference**: See Phase 1 implementation details (lines 172-219)
4. **Success Criteria**: Reduce code duplication from 85% to <10%

---

**Last Updated**: June 27, 2025
**Version**: 1.0
**Next Review**: After Phase 1 completion
