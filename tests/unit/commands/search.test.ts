import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { handleSearchCommand } from '../../../src/commands/search.js';

// Mock bot services
const mockConfigService = {
  getGuildConfig: mock(),
  setGuildConfig: mock(),
  isSearchEnabled: mock(),
  getSearchUsage: mock(),
  incrementSearchUsage: mock(),
} as any;

// Mock interaction helpers
const mockInteractionHelpers = {
  hasAdminPermission: mock(),
  sendPermissionDenied: mock(),
  getSubcommand: mock(),
  getStringOption: mock(),
};

describe('Search Command Tests', () => {
  let mockInteraction: any;

  beforeEach(() => {
    // Clear all mocks
    Object.values(mockConfigService).forEach(mockFn => (mockFn as any).mockClear());
    Object.values(mockInteractionHelpers).forEach(mockFn => (mockFn as any).mockClear());

    // Create mock interaction
    mockInteraction = {
      guild: { id: 'test-guild-123', name: 'Test Guild' },
      user: { id: 'test-user-123' },
      replied: false,
      deferred: false,
      deferReply: mock().mockResolvedValue(undefined),
      editReply: mock().mockResolvedValue(undefined),
      reply: mock().mockResolvedValue(undefined),
    };

    // Setup mock responses
    mockConfigService.getGuildConfig.mockResolvedValue({
      search_enabled: true,
    });
    mockConfigService.setGuildConfig.mockResolvedValue(undefined);
    mockConfigService.isSearchEnabled.mockResolvedValue(true);
    mockConfigService.getSearchUsage.mockResolvedValue(250);
    mockConfigService.incrementSearchUsage.mockResolvedValue(undefined);

    // Mock helper functions
    mockInteractionHelpers.hasAdminPermission.mockReturnValue(true);
    mockInteractionHelpers.sendPermissionDenied.mockResolvedValue(undefined);
    mockInteractionHelpers.getSubcommand.mockReturnValue('toggle');
    mockInteractionHelpers.getStringOption.mockReturnValue('enable');

    // Mock environment variables
    process.env.BRAVE_SEARCH_API_KEY = 'mock-search-key';
  });

  afterEach(() => {
    delete process.env.BRAVE_SEARCH_API_KEY;
  });

  describe('Permission and Context Validation', () => {
    it('should deny access to non-admin users', async () => {
      mockInteractionHelpers.hasAdminPermission.mockReturnValue(false);
      
      const interactionModule = await import('../../../src/handlers/interactionCreate.js');
      (interactionModule as any).hasAdminPermission = mockInteractionHelpers.hasAdminPermission;
      (interactionModule as any).sendPermissionDenied = mockInteractionHelpers.sendPermissionDenied;

      await handleSearchCommand(mockInteraction);

      expect(mockInteractionHelpers.sendPermissionDenied).toHaveBeenCalledWith(mockInteraction);
    });

    it('should deny access outside of guilds', async () => {
      mockInteraction.guild = null;

      await handleSearchCommand(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: '❌ This command can only be used in a server.',
        ephemeral: true,
      });
    });
  });

  describe('Toggle Subcommand', () => {
    beforeEach(async () => {
      const botModule = await import('../../../src/bot.js');
      (botModule as any).configService = mockConfigService;
      
      const interactionModule = await import('../../../src/handlers/interactionCreate.js');
      (interactionModule as any).hasAdminPermission = mockInteractionHelpers.hasAdminPermission;
      (interactionModule as any).getSubcommand = mockInteractionHelpers.getSubcommand;
      (interactionModule as any).getStringOption = mockInteractionHelpers.getStringOption;
    });

    it('should enable search successfully', async () => {
      mockInteractionHelpers.getSubcommand.mockReturnValue('toggle');
      mockInteractionHelpers.getStringOption.mockReturnValue('enable');

      await handleSearchCommand(mockInteraction);

      expect(mockConfigService.setGuildConfig).toHaveBeenCalledWith(
        'test-guild-123',
        expect.objectContaining({
          search_enabled: true,
        })
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('✅ Web search has been **enabled**'),
      });
    });

    it('should disable search successfully', async () => {
      mockInteractionHelpers.getSubcommand.mockReturnValue('toggle');
      mockInteractionHelpers.getStringOption.mockReturnValue('disable');

      await handleSearchCommand(mockInteraction);

      expect(mockConfigService.setGuildConfig).toHaveBeenCalledWith(
        'test-guild-123',
        expect.objectContaining({
          search_enabled: false,
        })
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('❌ Web search has been **disabled**'),
      });
    });

    it('should reject enabling when API key is missing', async () => {
      delete process.env.BRAVE_SEARCH_API_KEY;
      mockInteractionHelpers.getSubcommand.mockReturnValue('toggle');
      mockInteractionHelpers.getStringOption.mockReturnValue('enable');

      await handleSearchCommand(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: '❌ Cannot enable search: Brave Search API key is not configured.',
      });
    });
  });

  describe('Quota Subcommand', () => {
    beforeEach(async () => {
      const botModule = await import('../../../src/bot.js');
      (botModule as any).configService = mockConfigService;
      
      const interactionModule = await import('../../../src/handlers/interactionCreate.js');
      (interactionModule as any).hasAdminPermission = mockInteractionHelpers.hasAdminPermission;
      (interactionModule as any).getSubcommand = mockInteractionHelpers.getSubcommand;
    });

    it('should display quota information', async () => {
      mockInteractionHelpers.getSubcommand.mockReturnValue('quota');
      mockConfigService.getSearchUsage.mockResolvedValue(500);

      await handleSearchCommand(mockInteraction);

      expect(mockConfigService.getSearchUsage).toHaveBeenCalled();
      expect(mockConfigService.isSearchEnabled).toHaveBeenCalledWith('test-guild-123');
      
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              title: '🔍 Search API Quota Status',
              fields: expect.arrayContaining([
                expect.objectContaining({
                  name: expect.stringContaining('Monthly Usage'),
                }),
                expect.objectContaining({
                  name: expect.stringContaining('Search Status'),
                }),
              ]),
            }),
          }),
        ]),
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
      mockInteractionHelpers.getSubcommand.mockReturnValue('toggle');
      mockInteractionHelpers.getStringOption.mockReturnValue('enable');

      await handleSearchCommand(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: '❌ Failed to process search command. Please try again later.',
      });
    });

    it('should handle unknown subcommands', async () => {
      mockInteractionHelpers.getSubcommand.mockReturnValue('unknown');

      await handleSearchCommand(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('❌ Unknown subcommand'),
        ephemeral: true,
      });
    });
  });
});