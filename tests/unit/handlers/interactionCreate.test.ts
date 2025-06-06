import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { PermissionsBitField } from 'discord.js';
import {
  handleInteractionCreate,
  hasAdminPermission,
  sendPermissionDenied,
  getSubcommand,
  getStringOption,
  getChannelOption,
  formatUptime,
  formatBytes,
} from '../../../src/handlers/interactionCreate.js';

// Mock command handlers
const mockCommandHandlers = {
  handleStatusCommand: mock(),
  handleConfigCommand: mock(),
  handleSearchCommand: mock(),
  handleModelCommand: mock(),
};

describe('Interaction Create Handler Tests', () => {
  let mockInteraction: any;

  beforeEach(() => {
    // Clear all mocks
    Object.values(mockCommandHandlers).forEach(mockFn => (mockFn as any).mockClear());

    // Create base mock interaction
    mockInteraction = {
      user: { id: 'test-user-123' },
      guild: { 
        id: 'test-guild-123',
        name: 'Test Guild'
      },
      channel: { id: 'test-channel-123' },
      commandName: 'status',
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
    };

    // Mock command handlers
    require('../../../src/commands/status.js').handleStatusCommand = mockCommandHandlers.handleStatusCommand;
    require('../../../src/commands/config.js').handleConfigCommand = mockCommandHandlers.handleConfigCommand;
    require('../../../src/commands/search.js').handleSearchCommand = mockCommandHandlers.handleSearchCommand;
    require('../../../src/commands/model.js').handleModelCommand = mockCommandHandlers.handleModelCommand;
  });

  describe('Main Interaction Handler', () => {
    it('should handle chat input commands', async () => {
      mockInteraction.commandName = 'status';
      mockCommandHandlers.handleStatusCommand.mockResolvedValue(undefined);

      await handleInteractionCreate(mockInteraction);

      expect(mockCommandHandlers.handleStatusCommand).toHaveBeenCalledWith(mockInteraction);
    });

    it('should ignore non-command interactions', async () => {
      mockInteraction.isChatInputCommand.mockReturnValue(false);

      await handleInteractionCreate(mockInteraction);

      expect(mockCommandHandlers.handleStatusCommand).not.toHaveBeenCalled();
      expect(mockCommandHandlers.handleConfigCommand).not.toHaveBeenCalled();
      expect(mockCommandHandlers.handleSearchCommand).not.toHaveBeenCalled();
      expect(mockCommandHandlers.handleModelCommand).not.toHaveBeenCalled();
    });

    it('should route to correct command handlers', async () => {
      // Test status command
      mockInteraction.commandName = 'status';
      await handleInteractionCreate(mockInteraction);
      expect(mockCommandHandlers.handleStatusCommand).toHaveBeenCalledWith(mockInteraction);

      Object.values(mockCommandHandlers).forEach(mockFn => (mockFn as any).mockClear());

      // Test config command
      mockInteraction.commandName = 'config';
      await handleInteractionCreate(mockInteraction);
      expect(mockCommandHandlers.handleConfigCommand).toHaveBeenCalledWith(mockInteraction);

      Object.values(mockCommandHandlers).forEach(mockFn => (mockFn as any).mockClear());

      // Test search command
      mockInteraction.commandName = 'search';
      await handleInteractionCreate(mockInteraction);
      expect(mockCommandHandlers.handleSearchCommand).toHaveBeenCalledWith(mockInteraction);

      Object.values(mockCommandHandlers).forEach(mockFn => (mockFn as any).mockClear());

      // Test model command
      mockInteraction.commandName = 'model';
      await handleInteractionCreate(mockInteraction);
      expect(mockCommandHandlers.handleModelCommand).toHaveBeenCalledWith(mockInteraction);
    });

    it('should handle unknown commands', async () => {
      mockInteraction.commandName = 'unknown';

      await handleInteractionCreate(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('❌ Unknown command: `/unknown`'),
        ephemeral: true,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle command handler errors', async () => {
      mockInteraction.commandName = 'status';
      mockCommandHandlers.handleStatusCommand.mockRejectedValue(new Error('Command error'));

      await handleInteractionCreate(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: '❌ An error occurred while processing your command. Please try again later.',
        ephemeral: true,
      });
    });

    it('should handle errors with deferred interactions', async () => {
      mockInteraction.commandName = 'status';
      mockInteraction.deferred = true;
      mockCommandHandlers.handleStatusCommand.mockRejectedValue(new Error('Command error'));

      await handleInteractionCreate(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: '❌ An error occurred while processing your command. Please try again later.',
        ephemeral: true,
      });
    });

    it('should handle errors with already replied interactions', async () => {
      mockInteraction.commandName = 'status';
      mockInteraction.replied = true;
      mockCommandHandlers.handleStatusCommand.mockRejectedValue(new Error('Command error'));

      await handleInteractionCreate(mockInteraction);

      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content: '❌ An error occurred while processing your command. Please try again later.',
        ephemeral: true,
      });
    });

    it('should handle errors when error response fails', async () => {
      mockInteraction.commandName = 'status';
      mockInteraction.reply.mockRejectedValue(new Error('Discord API error'));
      mockCommandHandlers.handleStatusCommand.mockRejectedValue(new Error('Command error'));

      // Should not throw
      await expect(handleInteractionCreate(mockInteraction)).resolves.toBeUndefined();
    });
  });

  describe('Permission Checking', () => {
    it('should return true for admin permissions', () => {
      const adminInteraction = {
        guild: { id: 'test-guild' },
        member: {
          permissions: new PermissionsBitField(['Administrator']),
        },
      } as any;

      const result = hasAdminPermission(adminInteraction);
      expect(result).toBe(true);
    });

    it('should return false for non-admin permissions', () => {
      const nonAdminInteraction = {
        guild: { id: 'test-guild' },
        member: {
          permissions: new PermissionsBitField(['SendMessages']),
        },
      } as any;

      const result = hasAdminPermission(nonAdminInteraction);
      expect(result).toBe(false);
    });

    it('should return false for DM interactions', () => {
      const dmInteraction = {
        guild: null,
        member: null,
      } as any;

      const result = hasAdminPermission(dmInteraction);
      expect(result).toBe(false);
    });

    it('should return false for string permissions', () => {
      const stringPermissionInteraction = {
        guild: { id: 'test-guild' },
        member: {
          permissions: 'some-string',
        },
      } as any;

      const result = hasAdminPermission(stringPermissionInteraction);
      expect(result).toBe(false);
    });
  });

  describe('Permission Denied Response', () => {
    it('should send permission denied message', async () => {
      await sendPermissionDenied(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: '❌ You need Administrator permissions to use this command.',
        ephemeral: true,
      });
    });
  });

  describe('Option Extraction Helpers', () => {
    it('should safely get subcommand', () => {
      mockInteraction.options.getSubcommand.mockReturnValue('test-subcommand');

      const result = getSubcommand(mockInteraction);
      expect(result).toBe('test-subcommand');
    });

    it('should return null when subcommand fails', () => {
      mockInteraction.options.getSubcommand.mockImplementation(() => {
        throw new Error('No subcommand');
      });

      const result = getSubcommand(mockInteraction);
      expect(result).toBe(null);
    });

    it('should safely get string option', () => {
      mockInteraction.options.getString.mockReturnValue('test-value');

      const result = getStringOption(mockInteraction, 'test-option');
      expect(result).toBe('test-value');
      expect(mockInteraction.options.getString).toHaveBeenCalledWith('test-option', false);
    });

    it('should safely get required string option', () => {
      mockInteraction.options.getString.mockReturnValue('required-value');

      const result = getStringOption(mockInteraction, 'required-option', true);
      expect(result).toBe('required-value');
      expect(mockInteraction.options.getString).toHaveBeenCalledWith('required-option', true);
    });

    it('should throw ValidationError for missing required string option', () => {
      mockInteraction.options.getString.mockImplementation(() => {
        throw new Error('Missing required option');
      });

      expect(() => getStringOption(mockInteraction, 'required-option', true))
        .toThrow('Missing required option: required-option');
    });

    it('should safely get channel option', () => {
      const mockChannel = { id: 'channel-123', name: 'general' };
      mockInteraction.options.getChannel.mockReturnValue(mockChannel);

      const result = getChannelOption(mockInteraction, 'test-channel');
      expect(result).toBe(mockChannel);
      expect(mockInteraction.options.getChannel).toHaveBeenCalledWith('test-channel', false);
    });

    it('should throw ValidationError for missing required channel option', () => {
      mockInteraction.options.getChannel.mockImplementation(() => {
        throw new Error('Missing required channel');
      });

      expect(() => getChannelOption(mockInteraction, 'required-channel', true))
        .toThrow('Missing required channel option: required-channel');
    });
  });

  describe('Utility Functions', () => {
    it('should format uptime correctly', () => {
      expect(formatUptime(1000)).toBe('1s');
      expect(formatUptime(61000)).toBe('1m 1s');
      expect(formatUptime(3661000)).toBe('1h 1m');
      expect(formatUptime(90061000)).toBe('1d 1h 1m');
    });

    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });
  });
});