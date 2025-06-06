import { describe, expect, it, mock } from "bun:test";
import { PermissionsBitField } from "discord.js";
import {
  createTestableInteractionHandler,
  formatBytes,
  formatUptime,
  getChannelOption,
  getStringOption,
  getSubcommand,
  hasAdminPermission,
  sendPermissionDenied,
  type CommandHandlers,
} from "../../../src/handlers/interactionCreate.js";

// Create mock interaction for testing utility functions
const mockInteraction = {
  user: { id: "test-user-123" },
  guild: {
    id: "test-guild-123",
    name: "Test Guild",
  },
  channel: { id: "test-channel-123" },
  commandName: "status",
  options: {
    getSubcommand: mock(),
    getString: mock(),
    getChannel: mock(),
  },
  replied: false,
  deferred: false,
  deferReply: mock().mockResolvedValue(undefined),
  editReply: mock().mockResolvedValue(undefined),
  reply: mock().mockResolvedValue(undefined),
  followUp: mock().mockResolvedValue(undefined),
  isChatInputCommand: mock().mockReturnValue(true),
} as any;

describe("Interaction Create Handler Tests", () => {
  // Note: Integration tests for command routing are in tests/integration/slash-commands.test.ts
  // These unit tests focus on utility functions that can be tested in isolation

  describe("Permission Checking", () => {
    it("should return true for admin permissions", () => {
      const adminInteraction = {
        guild: { id: "test-guild" },
        member: {
          permissions: new PermissionsBitField(["Administrator"]),
        },
      } as any;

      const result = hasAdminPermission(adminInteraction);
      expect(result).toBe(true);
    });

    it("should return false for non-admin permissions", () => {
      const nonAdminInteraction = {
        guild: { id: "test-guild" },
        member: {
          permissions: new PermissionsBitField(["SendMessages"]),
        },
      } as any;

      const result = hasAdminPermission(nonAdminInteraction);
      expect(result).toBe(false);
    });

    it("should return false for DM interactions", () => {
      const dmInteraction = {
        guild: null,
        member: null,
      } as any;

      const result = hasAdminPermission(dmInteraction);
      expect(result).toBe(false);
    });

    it("should return false for string permissions", () => {
      const stringPermissionInteraction = {
        guild: { id: "test-guild" },
        member: {
          permissions: "some-string",
        },
      } as any;

      const result = hasAdminPermission(stringPermissionInteraction);
      expect(result).toBe(false);
    });
  });

  describe("Permission Denied Response", () => {
    it("should send permission denied message", async () => {
      await sendPermissionDenied(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "❌ You need Administrator permissions to use this command.",
        ephemeral: true,
      });
    });
  });

  describe("Option Extraction Helpers", () => {
    it("should safely get subcommand", () => {
      mockInteraction.options.getSubcommand.mockReturnValue("test-subcommand");

      const result = getSubcommand(mockInteraction);
      expect(result).toBe("test-subcommand");
    });

    it("should return null when subcommand fails", () => {
      mockInteraction.options.getSubcommand.mockImplementation(() => {
        throw new Error("No subcommand");
      });

      const result = getSubcommand(mockInteraction);
      expect(result).toBe(null);
    });

    it("should safely get string option", () => {
      mockInteraction.options.getString.mockReturnValue("test-value");

      const result = getStringOption(mockInteraction, "test-option");
      expect(result).toBe("test-value");
      expect(mockInteraction.options.getString).toHaveBeenCalledWith(
        "test-option",
        false
      );
    });

    it("should safely get required string option", () => {
      mockInteraction.options.getString.mockReturnValue("required-value");

      const result = getStringOption(mockInteraction, "required-option", true);
      expect(result).toBe("required-value");
      expect(mockInteraction.options.getString).toHaveBeenCalledWith(
        "required-option",
        true
      );
    });

    it("should throw ValidationError for missing required string option", () => {
      mockInteraction.options.getString.mockImplementation(() => {
        throw new Error("Missing required option");
      });

      expect(() =>
        getStringOption(mockInteraction, "required-option", true)
      ).toThrow("Missing required option: required-option");
    });

    it("should safely get channel option", () => {
      const mockChannel = { id: "channel-123", name: "general" };
      mockInteraction.options.getChannel.mockReturnValue(mockChannel);

      const result = getChannelOption(mockInteraction, "test-channel");
      expect(result).toBe(mockChannel);
      expect(mockInteraction.options.getChannel).toHaveBeenCalledWith(
        "test-channel",
        false
      );
    });

    it("should throw ValidationError for missing required channel option", () => {
      mockInteraction.options.getChannel.mockImplementation(() => {
        throw new Error("Missing required channel");
      });

      expect(() =>
        getChannelOption(mockInteraction, "required-channel", true)
      ).toThrow("Missing required channel option: required-channel");
    });
  });

  describe("Utility Functions", () => {
    it("should format uptime correctly", () => {
      expect(formatUptime(1000)).toBe("1s");
      expect(formatUptime(61000)).toBe("1m 1s");
      expect(formatUptime(3661000)).toBe("1h 1m");
      expect(formatUptime(90061000)).toBe("1d 1h 1m");
    });

    it("should format bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1024 * 1024)).toBe("1 MB");
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
      expect(formatBytes(1536)).toBe("1.5 KB");
    });
  });

  // Restored tests using dependency injection to avoid ES modules mocking issues
  describe("Error Handling - Restored", () => {
    it("should handle command handler errors with reply()", async () => {
      // Create mock command handlers that throw errors
      const mockHandlers: Partial<CommandHandlers> = {
        handleStatusCommand: mock().mockRejectedValue(
          new Error("Command error")
        ),
      };

      // Create testable handler with mock dependencies
      const testableHandler = createTestableInteractionHandler(mockHandlers);

      // Create mock interaction
      const errorTestInteraction = {
        user: { id: "test-user-123" },
        guild: { id: "test-guild-123" },
        channel: { id: "test-channel-123" },
        commandName: "status",
        options: {
          getSubcommand: mock().mockReturnValue(null),
        },
        replied: false,
        deferred: false,
        reply: mock().mockResolvedValue(undefined),
        isChatInputCommand: mock().mockReturnValue(true),
      } as any;

      // Execute the handler
      await testableHandler(errorTestInteraction);

      // Verify error response was sent
      expect(errorTestInteraction.reply).toHaveBeenCalledWith({
        content:
          "❌ An error occurred while processing your command. Please try again later.",
        ephemeral: false, // status_commands: false
      });

      // Verify the mock command handler was called
      expect(mockHandlers.handleStatusCommand).toHaveBeenCalledWith(
        errorTestInteraction
      );
    });

    it("should handle errors with deferred interactions using editReply()", async () => {
      // Create mock command handlers that throw errors
      const mockHandlers: Partial<CommandHandlers> = {
        handleConfigCommand: mock().mockRejectedValue(
          new Error("Deferred command error")
        ),
      };

      // Create testable handler with mock dependencies
      const testableHandler = createTestableInteractionHandler(mockHandlers);

      // Create mock deferred interaction
      const deferredTestInteraction = {
        user: { id: "test-user-456" },
        guild: { id: "test-guild-456" },
        channel: { id: "test-channel-456" },
        commandName: "config",
        options: {
          getSubcommand: mock().mockReturnValue("view"),
        },
        replied: false,
        deferred: true, // Key difference - interaction is deferred
        editReply: mock().mockResolvedValue(undefined),
        reply: mock().mockResolvedValue(undefined),
        isChatInputCommand: mock().mockReturnValue(true),
      } as any;

      // Execute the handler
      await testableHandler(deferredTestInteraction);

      // Verify editReply was called (not reply) for deferred interactions
      expect(deferredTestInteraction.editReply).toHaveBeenCalledWith({
        content:
          "❌ An error occurred while processing your command. Please try again later.",
        ephemeral: false, // status_commands: false
      });

      // Verify reply was NOT called
      expect(deferredTestInteraction.reply).not.toHaveBeenCalled();

      // Verify the mock command handler was called
      expect(mockHandlers.handleConfigCommand).toHaveBeenCalledWith(
        deferredTestInteraction
      );
    });

    it("should handle errors with already replied interactions using followUp()", async () => {
      // Create mock command handlers that throw errors
      const mockHandlers: Partial<CommandHandlers> = {
        handleSearchCommand: mock().mockRejectedValue(
          new Error("Replied command error")
        ),
      };

      // Create testable handler with mock dependencies
      const testableHandler = createTestableInteractionHandler(mockHandlers);

      // Create mock already-replied interaction
      const repliedTestInteraction = {
        user: { id: "test-user-789" },
        guild: { id: "test-guild-789" },
        channel: { id: "test-channel-789" },
        commandName: "search",
        options: {
          getSubcommand: mock().mockReturnValue("toggle"),
        },
        replied: true, // Key difference - interaction already replied
        deferred: false,
        followUp: mock().mockResolvedValue(undefined),
        editReply: mock().mockResolvedValue(undefined),
        reply: mock().mockResolvedValue(undefined),
        isChatInputCommand: mock().mockReturnValue(true),
      } as any;

      // Execute the handler
      await testableHandler(repliedTestInteraction);

      // Verify followUp was called for already-replied interactions
      expect(repliedTestInteraction.followUp).toHaveBeenCalledWith({
        content:
          "❌ An error occurred while processing your command. Please try again later.",
        ephemeral: true,
      });

      // Verify reply and editReply were NOT called
      expect(repliedTestInteraction.reply).not.toHaveBeenCalled();
      expect(repliedTestInteraction.editReply).not.toHaveBeenCalled();

      // Verify the mock command handler was called
      expect(mockHandlers.handleSearchCommand).toHaveBeenCalledWith(
        repliedTestInteraction
      );
    });

    it("should handle errors when error response fails (catch Discord API exceptions)", async () => {
      // Create mock command handlers that throw errors
      const mockHandlers: Partial<CommandHandlers> = {
        handleModelCommand: mock().mockRejectedValue(
          new Error("Model command error")
        ),
      };

      // Create testable handler with mock dependencies
      const testableHandler = createTestableInteractionHandler(mockHandlers);

      // Create mock interaction where reply() itself fails (Discord API error)
      const failingTestInteraction = {
        user: { id: "test-user-fail" },
        guild: { id: "test-guild-fail" },
        channel: { id: "test-channel-fail" },
        commandName: "model",
        options: {
          getSubcommand: mock().mockReturnValue("info"),
        },
        replied: false,
        deferred: false,
        reply: mock().mockRejectedValue(new Error("Discord API error")), // reply() fails
        editReply: mock().mockResolvedValue(undefined),
        followUp: mock().mockResolvedValue(undefined),
        isChatInputCommand: mock().mockReturnValue(true),
      } as any;

      // Execute the handler - should not throw despite dual failures
      await expect(
        testableHandler(failingTestInteraction)
      ).resolves.toBeUndefined();

      // Verify reply was attempted
      expect(failingTestInteraction.reply).toHaveBeenCalledWith({
        content:
          "❌ An error occurred while processing your command. Please try again later.",
        ephemeral: true,
      });

      // Verify the mock command handler was called
      expect(mockHandlers.handleModelCommand).toHaveBeenCalledWith(
        failingTestInteraction
      );
    });
  });

  // Restored tests for command routing using dependency injection
  describe("Command Routing - Restored", () => {
    it("should route status command to handleStatusCommand", async () => {
      // Create mock command handlers
      const mockHandlers: Partial<CommandHandlers> = {
        handleStatusCommand: mock().mockResolvedValue(undefined),
      };

      // Create testable handler with mock dependencies
      const testableHandler = createTestableInteractionHandler(mockHandlers);

      // Create mock interaction for status command
      const statusInteraction = {
        user: { id: "test-user-123" },
        guild: { id: "test-guild-123" },
        channel: { id: "test-channel-123" },
        commandName: "status",
        options: {
          getSubcommand: mock().mockReturnValue(null),
        },
        replied: false,
        deferred: false,
        isChatInputCommand: mock().mockReturnValue(true),
      } as any;

      // Execute the handler
      await testableHandler(statusInteraction);

      // Verify the correct handler was called
      expect(mockHandlers.handleStatusCommand).toHaveBeenCalledWith(
        statusInteraction
      );
      expect(mockHandlers.handleStatusCommand).toHaveBeenCalledTimes(1);
    });

    it("should route config command to handleConfigCommand", async () => {
      // Create mock command handlers
      const mockHandlers: Partial<CommandHandlers> = {
        handleConfigCommand: mock().mockResolvedValue(undefined),
      };

      // Create testable handler with mock dependencies
      const testableHandler = createTestableInteractionHandler(mockHandlers);

      // Create mock interaction for config command
      const configInteraction = {
        user: { id: "test-user-456" },
        guild: { id: "test-guild-456" },
        channel: { id: "test-channel-456" },
        commandName: "config",
        options: {
          getSubcommand: mock().mockReturnValue("view"),
        },
        replied: false,
        deferred: false,
        isChatInputCommand: mock().mockReturnValue(true),
      } as any;

      // Execute the handler
      await testableHandler(configInteraction);

      // Verify the correct handler was called
      expect(mockHandlers.handleConfigCommand).toHaveBeenCalledWith(
        configInteraction
      );
      expect(mockHandlers.handleConfigCommand).toHaveBeenCalledTimes(1);
    });

    it("should route search command to handleSearchCommand", async () => {
      // Create mock command handlers
      const mockHandlers: Partial<CommandHandlers> = {
        handleSearchCommand: mock().mockResolvedValue(undefined),
      };

      // Create testable handler with mock dependencies
      const testableHandler = createTestableInteractionHandler(mockHandlers);

      // Create mock interaction for search command
      const searchInteraction = {
        user: { id: "test-user-789" },
        guild: { id: "test-guild-789" },
        channel: { id: "test-channel-789" },
        commandName: "search",
        options: {
          getSubcommand: mock().mockReturnValue("toggle"),
        },
        replied: false,
        deferred: false,
        isChatInputCommand: mock().mockReturnValue(true),
      } as any;

      // Execute the handler
      await testableHandler(searchInteraction);

      // Verify the correct handler was called
      expect(mockHandlers.handleSearchCommand).toHaveBeenCalledWith(
        searchInteraction
      );
      expect(mockHandlers.handleSearchCommand).toHaveBeenCalledTimes(1);
    });

    it("should route model command to handleModelCommand", async () => {
      // Create mock command handlers
      const mockHandlers: Partial<CommandHandlers> = {
        handleModelCommand: mock().mockResolvedValue(undefined),
      };

      // Create testable handler with mock dependencies
      const testableHandler = createTestableInteractionHandler(mockHandlers);

      // Create mock interaction for model command
      const modelInteraction = {
        user: { id: "test-user-abc" },
        guild: { id: "test-guild-abc" },
        channel: { id: "test-channel-abc" },
        commandName: "model",
        options: {
          getSubcommand: mock().mockReturnValue("info"),
        },
        replied: false,
        deferred: false,
        isChatInputCommand: mock().mockReturnValue(true),
      } as any;

      // Execute the handler
      await testableHandler(modelInteraction);

      // Verify the correct handler was called
      expect(mockHandlers.handleModelCommand).toHaveBeenCalledWith(
        modelInteraction
      );
      expect(mockHandlers.handleModelCommand).toHaveBeenCalledTimes(1);
    });

    it("should handle unknown commands with proper error response", async () => {
      // Create testable handler (no specific mock handlers needed for unknown command)
      const testableHandler = createTestableInteractionHandler();

      // Create mock interaction for unknown command
      const unknownInteraction = {
        user: { id: "test-user-unknown" },
        guild: { id: "test-guild-unknown" },
        channel: { id: "test-channel-unknown" },
        commandName: "unknown-command", // This command doesn't exist
        options: {
          getSubcommand: mock().mockReturnValue(null),
        },
        replied: false,
        deferred: false,
        reply: mock().mockResolvedValue(undefined),
        isChatInputCommand: mock().mockReturnValue(true),
      } as any;

      // Execute the handler
      await testableHandler(unknownInteraction);

      // Verify error response was sent for unknown command
      expect(unknownInteraction.reply).toHaveBeenCalledWith({
        content:
          "❌ Unknown command: `/unknown-command`. Please check available commands.",
        ephemeral: true,
      });
      expect(unknownInteraction.reply).toHaveBeenCalledTimes(1);
    });

    it("should ignore non-command interactions", async () => {
      // Create mock command handlers to verify they're not called
      const mockHandlers: Partial<CommandHandlers> = {
        handleStatusCommand: mock().mockResolvedValue(undefined),
        handleConfigCommand: mock().mockResolvedValue(undefined),
        handleSearchCommand: mock().mockResolvedValue(undefined),
        handleModelCommand: mock().mockResolvedValue(undefined),
      };

      // Create testable handler with mock dependencies
      const testableHandler = createTestableInteractionHandler(mockHandlers);

      // Create mock non-command interaction (e.g., button click, select menu, etc.)
      const nonCommandInteraction = {
        user: { id: "test-user-button" },
        guild: { id: "test-guild-button" },
        channel: { id: "test-channel-button" },
        reply: mock().mockResolvedValue(undefined),
        editReply: mock().mockResolvedValue(undefined),
        followUp: mock().mockResolvedValue(undefined),
        isChatInputCommand: mock().mockReturnValue(false), // Key: not a chat input command
      } as any;

      // Execute the handler
      await testableHandler(nonCommandInteraction);

      // Verify that no command handlers were called
      expect(mockHandlers.handleStatusCommand).not.toHaveBeenCalled();
      expect(mockHandlers.handleConfigCommand).not.toHaveBeenCalled();
      expect(mockHandlers.handleSearchCommand).not.toHaveBeenCalled();
      expect(mockHandlers.handleModelCommand).not.toHaveBeenCalled();

      // Verify that no reply methods were called
      expect(nonCommandInteraction.reply).not.toHaveBeenCalled();
      expect(nonCommandInteraction.editReply).not.toHaveBeenCalled();
      expect(nonCommandInteraction.followUp).not.toHaveBeenCalled();
    });
  });
});
