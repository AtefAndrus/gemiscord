import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { handleStatusCommand } from '../../../src/commands/status.js';

// Mock bot services
const mockConfigService = {
  getStats: mock(),
  getSearchUsage: mock(),
} as any;

const mockConfigManager = {
  getConfig: mock(),
} as any;

// Mock interaction helpers
const mockInteractionHelpers = {
  hasAdminPermission: mock(),
  sendPermissionDenied: mock(),
  formatUptime: mock(),
  formatBytes: mock(),
};

describe('Status Command Tests', () => {
  let mockInteraction: any;

  beforeEach(() => {
    // Reset all mocks
    mockConfigService.getStats.mockClear();
    mockConfigService.getSearchUsage.mockClear();
    mockConfigManager.getConfig.mockClear();
    mockInteractionHelpers.hasAdminPermission.mockClear();
    mockInteractionHelpers.sendPermissionDenied.mockClear();
    mockInteractionHelpers.formatUptime.mockClear();
    mockInteractionHelpers.formatBytes.mockClear();

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
    mockConfigService.getStats.mockResolvedValue({
      total_requests: 1500,
      search_usage: 250,
      model_usage: {
        'gemini-2.5-flash-preview-0520': 1200,
        'gemini-2.0-flash': 300,
      },
    });
    mockConfigService.getSearchUsage.mockResolvedValue(250);

    mockConfigManager.getConfig.mockReturnValue({
      api: {
        gemini: {
          models: {
            primary: 'gemini-2.5-flash-preview-0520',
            fallback: 'gemini-2.0-flash',
          },
        },
      },
    });

    // Mock helper functions
    mockInteractionHelpers.hasAdminPermission.mockReturnValue(true);
    mockInteractionHelpers.sendPermissionDenied.mockResolvedValue(undefined);
    mockInteractionHelpers.formatUptime.mockReturnValue('1h 1m');
    mockInteractionHelpers.formatBytes.mockReturnValue('128 MB');

    // Mock environment variables
    process.env.DISCORD_TOKEN = 'mock-discord-token';
    process.env.GEMINI_API_KEY = 'mock-gemini-key';
    process.env.BRAVE_SEARCH_API_KEY = 'mock-search-key';
  });

  afterEach(() => {
    delete process.env.DISCORD_TOKEN;
    delete process.env.GEMINI_API_KEY;
    delete process.env.BRAVE_SEARCH_API_KEY;
  });

  describe('Permission and Context Validation', () => {
    it('should deny access to non-admin users', async () => {
      mockInteractionHelpers.hasAdminPermission.mockReturnValue(false);
      
      // Mock the module imports by requiring and overriding
      const interactionModule = await import('../../../src/handlers/interactionCreate.js');
      (interactionModule as any).hasAdminPermission = mockInteractionHelpers.hasAdminPermission;
      (interactionModule as any).sendPermissionDenied = mockInteractionHelpers.sendPermissionDenied;
      
      await handleStatusCommand(mockInteraction);
      
      expect(mockInteractionHelpers.hasAdminPermission).toHaveBeenCalledWith(mockInteraction);
      expect(mockInteractionHelpers.sendPermissionDenied).toHaveBeenCalledWith(mockInteraction);
      expect(mockInteraction.deferReply).not.toHaveBeenCalled();
    });

    it('should allow access to admin users', async () => {
      mockInteractionHelpers.hasAdminPermission.mockReturnValue(true);
      
      // Mock the bot services
      const botModule = await import('../../../src/bot.js');
      (botModule as any).configService = mockConfigService;
      (botModule as any).configManager = mockConfigManager;
      
      const interactionModule = await import('../../../src/handlers/interactionCreate.js');
      (interactionModule as any).hasAdminPermission = mockInteractionHelpers.hasAdminPermission;

      await handleStatusCommand(mockInteraction);
      
      expect(mockInteractionHelpers.hasAdminPermission).toHaveBeenCalledWith(mockInteraction);
      expect(mockInteraction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    });
  });

  describe('Status Data Collection', () => {
    beforeEach(async () => {
      mockInteractionHelpers.hasAdminPermission.mockReturnValue(true);
      
      // Setup module mocks
      const botModule = await import('../../../src/bot.js');
      (botModule as any).configService = mockConfigService;
      (botModule as any).configManager = mockConfigManager;
      
      const interactionModule = await import('../../../src/handlers/interactionCreate.js');
      (interactionModule as any).hasAdminPermission = mockInteractionHelpers.hasAdminPermission;
    });

    it('should collect comprehensive system status', async () => {
      await handleStatusCommand(mockInteraction);

      expect(mockConfigService.getStats).toHaveBeenCalled();
      expect(mockConfigService.getSearchUsage).toHaveBeenCalled();
      expect(mockConfigManager.getConfig).toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalled();

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      expect(replyCall).toHaveProperty('embeds');
      expect(Array.isArray(replyCall.embeds)).toBe(true);
    });

    it('should handle missing API keys in status', async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.BRAVE_SEARCH_API_KEY;

      await handleStatusCommand(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalled();
      
      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embed = replyCall.embeds[0];
      
      // Check that missing API keys are reflected in status
      expect(embed.data.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('API Status'),
            value: expect.stringContaining('❌'),
          })
        ])
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      mockInteractionHelpers.hasAdminPermission.mockReturnValue(true);
      
      // Setup module mocks
      const botModule = await import('../../../src/bot.js');
      (botModule as any).configService = mockConfigService;
      (botModule as any).configManager = mockConfigManager;
      
      const interactionModule = await import('../../../src/handlers/interactionCreate.js');
      (interactionModule as any).hasAdminPermission = mockInteractionHelpers.hasAdminPermission;
    });

    it('should handle configuration service errors gracefully', async () => {
      mockConfigService.getStats.mockRejectedValue(new Error('Database connection failed'));

      await handleStatusCommand(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: '❌ Failed to retrieve bot status. Please try again later.',
      });
    });

    it('should handle missing configuration gracefully', async () => {
      mockConfigManager.getConfig.mockReturnValue({});

      await handleStatusCommand(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalled();
      
      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embed = replyCall.embeds[0];
      
      expect(embed.data.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('Models'),
            value: expect.stringContaining('unknown'),
          })
        ])
      );
    });
  });

  describe('Embed Formatting', () => {
    beforeEach(async () => {
      mockInteractionHelpers.hasAdminPermission.mockReturnValue(true);
      
      // Setup module mocks
      const botModule = await import('../../../src/bot.js');
      (botModule as any).configService = mockConfigService;
      (botModule as any).configManager = mockConfigManager;
      
      const interactionModule = await import('../../../src/handlers/interactionCreate.js');
      (interactionModule as any).hasAdminPermission = mockInteractionHelpers.hasAdminPermission;
    });

    it('should create properly formatted status embed', async () => {
      await handleStatusCommand(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embed = replyCall.embeds[0];
      
      expect(embed.data.title).toBe('🤖 Bot Status');
      expect(embed.data.color).toBe(0x00ff00);
      expect(embed.data.timestamp).toBeDefined();
      expect(embed.data.footer).toEqual({
        text: 'System Status Report',
      });
    });

    it('should include all required status fields', async () => {
      await handleStatusCommand(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embed = replyCall.embeds[0];
      
      const fieldNames = embed.data.fields.map((field: any) => field.name);
      
      expect(fieldNames).toContain('⚡ System');
      expect(fieldNames).toContain('🔑 API Status');
      expect(fieldNames).toContain('🤖 AI Models');
      expect(fieldNames).toContain('📊 Usage Statistics');
      expect(fieldNames).toContain('🔍 Search');
    });
  });
});