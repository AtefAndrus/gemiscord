import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ChannelType } from 'discord.js';
import { handleConfigCommand } from '../../../src/commands/config.js';

// Mock bot services
const mockConfigService = {
  getGuildConfig: mock(),
  setGuildConfig: mock(),
  addResponseChannel: mock(),
  removeResponseChannel: mock(),
  getResponseChannels: mock(),
} as any;

// Mock interaction helpers
const mockInteractionHelpers = {
  hasAdminPermission: mock(),
  sendPermissionDenied: mock(),
  getSubcommand: mock(),
  getStringOption: mock(),
  getChannelOption: mock(),
};

describe('Config Command Tests', () => {
  let mockInteraction: any;

  beforeEach(() => {
    // Clear all mocks
    mockConfigService.getGuildConfig.mockClear();
    mockConfigService.setGuildConfig.mockClear();
    mockConfigService.addResponseChannel.mockClear();
    mockConfigService.removeResponseChannel.mockClear();
    mockConfigService.getResponseChannels.mockClear();

    Object.values(mockInteractionHelpers).forEach(mockFn => mockFn.mockClear());

    // Create mock interaction
    mockInteraction = {
      guild: { id: 'test-guild-123', name: 'Test Guild' },
      user: { id: 'test-user-123' },
      replied: false,
      deferred: false,
      deferReply: mock().mockResolvedValue(undefined),
      editReply: mock().mockResolvedValue(undefined),
      reply: mock().mockResolvedValue(undefined),
      options: {
        getSubcommand: mock(),
        getString: mock(),
        getChannel: mock(),
      },
    };

    // Setup default mock responses
    mockConfigService.getGuildConfig.mockResolvedValue({
      mention_enabled: true,
      response_channels: ['channel-1', 'channel-2'],
      search_enabled: true,
      server_prompt: 'Test server prompt',
      message_limit_strategy: 'compress',
    });
    
    mockConfigService.setGuildConfig.mockResolvedValue(undefined);
    mockConfigService.addResponseChannel.mockResolvedValue(undefined);
    mockConfigService.removeResponseChannel.mockResolvedValue(undefined);
    mockConfigService.getResponseChannels.mockResolvedValue(['channel-1', 'channel-2']);

    // Mock helper functions
    mockInteractionHelpers.hasAdminPermission.mockReturnValue(true);
    mockInteractionHelpers.sendPermissionDenied.mockResolvedValue(undefined);
    mockInteractionHelpers.getSubcommand.mockReturnValue('mention');
    mockInteractionHelpers.getStringOption.mockReturnValue('enable');
    mockInteractionHelpers.getChannelOption.mockReturnValue({
      id: 'test-channel-123',
      name: 'general',
      type: ChannelType.GuildText,
    });
  });

  describe('Permission and Context Validation', () => {
    it('should deny access to non-admin users', async () => {
      mockInteractionHelpers.hasAdminPermission.mockReturnValue(false);
      
      const interactionModule = await import('../../../src/handlers/interactionCreate.js');
      (interactionModule as any).hasAdminPermission = mockInteractionHelpers.hasAdminPermission;
      (interactionModule as any).sendPermissionDenied = mockInteractionHelpers.sendPermissionDenied;

      await handleConfigCommand(mockInteraction);

      expect(mockInteractionHelpers.sendPermissionDenied).toHaveBeenCalledWith(mockInteraction);
    });

    it('should deny access outside of guilds', async () => {
      mockInteraction.guild = null;

      await handleConfigCommand(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: '❌ This command can only be used in a server.',
        ephemeral: true,
      });
    });
  });

  describe('Mention Subcommand', () => {
    beforeEach(async () => {
      const botModule = await import('../../../src/bot.js');
      (botModule as any).configService = mockConfigService;
      
      const interactionModule = await import('../../../src/handlers/interactionCreate.js');
      (interactionModule as any).hasAdminPermission = mockInteractionHelpers.hasAdminPermission;
      (interactionModule as any).getSubcommand = mockInteractionHelpers.getSubcommand;
      (interactionModule as any).getStringOption = mockInteractionHelpers.getStringOption;
    });

    it('should enable mentions successfully', async () => {
      mockInteractionHelpers.getSubcommand.mockReturnValue('mention');
      mockInteractionHelpers.getStringOption.mockReturnValue('enable');

      await handleConfigCommand(mockInteraction);

      expect(mockConfigService.setGuildConfig).toHaveBeenCalledWith(
        'test-guild-123',
        expect.objectContaining({
          mention_enabled: true,
        })
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: '✅ Mentions have been **enabled** for this server.',
      });
    });

    it('should disable mentions successfully', async () => {
      mockInteractionHelpers.getSubcommand.mockReturnValue('mention');
      mockInteractionHelpers.getStringOption.mockReturnValue('disable');

      await handleConfigCommand(mockInteraction);

      expect(mockConfigService.setGuildConfig).toHaveBeenCalledWith(
        'test-guild-123',
        expect.objectContaining({
          mention_enabled: false,
        })
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: '❌ Mentions have been **disabled** for this server.',
      });
    });
  });

  describe('Channel Subcommand', () => {
    beforeEach(async () => {
      const botModule = await import('../../../src/bot.js');
      (botModule as any).configService = mockConfigService;
      
      const interactionModule = await import('../../../src/handlers/interactionCreate.js');
      (interactionModule as any).hasAdminPermission = mockInteractionHelpers.hasAdminPermission;
      (interactionModule as any).getSubcommand = mockInteractionHelpers.getSubcommand;
      (interactionModule as any).getStringOption = mockInteractionHelpers.getStringOption;
      (interactionModule as any).getChannelOption = mockInteractionHelpers.getChannelOption;
    });

    it('should add channel successfully', async () => {
      mockInteractionHelpers.getSubcommand.mockReturnValue('channel');
      mockInteractionHelpers.getStringOption.mockReturnValue('add');
      mockInteractionHelpers.getChannelOption.mockReturnValue({
        id: 'new-channel-123',
        name: 'general',
        type: ChannelType.GuildText,
      });

      await handleConfigCommand(mockInteraction);

      expect(mockConfigService.addResponseChannel).toHaveBeenCalledWith(
        'test-guild-123',
        'new-channel-123'
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('✅ Added #general as an auto-response channel'),
      });
    });

    it('should reject non-text channels', async () => {
      mockInteractionHelpers.getSubcommand.mockReturnValue('channel');
      mockInteractionHelpers.getStringOption.mockReturnValue('add');
      mockInteractionHelpers.getChannelOption.mockReturnValue({
        id: 'voice-channel-123',
        name: 'Voice Channel',
        type: ChannelType.GuildVoice,
      });

      await handleConfigCommand(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('❌ Only text channels can be configured'),
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      const botModule = await import('../../../src/bot.js');
      (botModule as any).configService = mockConfigService;
      
      const interactionModule = await import('../../../src/handlers/interactionCreate.js');
      (interactionModule as any).hasAdminPermission = mockInteractionHelpers.hasAdminPermission;
      (interactionModule as any).getSubcommand = mockInteractionHelpers.getSubcommand;
      (interactionModule as any).getStringOption = mockInteractionHelpers.getStringOption;
    });

    it('should handle configuration service errors', async () => {
      mockConfigService.setGuildConfig.mockRejectedValue(new Error('Database error'));
      mockInteractionHelpers.getSubcommand.mockReturnValue('mention');
      mockInteractionHelpers.getStringOption.mockReturnValue('enable');

      await handleConfigCommand(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: '❌ Failed to update configuration. Please try again later.',
      });
    });

    it('should handle unknown subcommands', async () => {
      mockInteractionHelpers.getSubcommand.mockReturnValue('unknown');

      await handleConfigCommand(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('❌ Unknown subcommand'),
        ephemeral: true,
      });
    });
  });
});