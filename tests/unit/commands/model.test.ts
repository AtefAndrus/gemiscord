import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { handleModelCommand } from '../../../src/commands/model.js';

// Mock bot services
const mockConfigManager = {
  getConfig: mock(),
} as any;

// Mock interaction helpers
const mockInteractionHelpers = {
  hasAdminPermission: mock(),
  sendPermissionDenied: mock(),
  getSubcommand: mock(),
};

describe('Model Command Tests', () => {
  let mockInteraction: any;

  beforeEach(() => {
    // Clear all mocks
    mockConfigManager.getConfig.mockClear();
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
    mockInteractionHelpers.getSubcommand.mockReturnValue('info');

    // Mock environment variables
    process.env.GEMINI_API_KEY = 'mock-gemini-key';
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  describe('Permission Validation', () => {
    it('should deny access to non-admin users', async () => {
      mockInteractionHelpers.hasAdminPermission.mockReturnValue(false);
      
      const interactionModule = await import('../../../src/handlers/interactionCreate.js');
      (interactionModule as any).hasAdminPermission = mockInteractionHelpers.hasAdminPermission;
      (interactionModule as any).sendPermissionDenied = mockInteractionHelpers.sendPermissionDenied;

      await handleModelCommand(mockInteraction);

      expect(mockInteractionHelpers.sendPermissionDenied).toHaveBeenCalledWith(mockInteraction);
    });

    it('should allow access to admin users', async () => {
      const botModule = await import('../../../src/bot.js');
      (botModule as any).configManager = mockConfigManager;
      
      const interactionModule = await import('../../../src/handlers/interactionCreate.js');
      (interactionModule as any).hasAdminPermission = mockInteractionHelpers.hasAdminPermission;
      (interactionModule as any).getSubcommand = mockInteractionHelpers.getSubcommand;

      await handleModelCommand(mockInteraction);

      expect(mockInteractionHelpers.hasAdminPermission).toHaveBeenCalledWith(mockInteraction);
      expect(mockInteraction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    });
  });

  describe('Info Subcommand', () => {
    beforeEach(async () => {
      const botModule = await import('../../../src/bot.js');
      (botModule as any).configManager = mockConfigManager;
      
      const interactionModule = await import('../../../src/handlers/interactionCreate.js');
      (interactionModule as any).hasAdminPermission = mockInteractionHelpers.hasAdminPermission;
      (interactionModule as any).getSubcommand = mockInteractionHelpers.getSubcommand;
    });

    it('should display model information', async () => {
      mockInteractionHelpers.getSubcommand.mockReturnValue('info');

      await handleModelCommand(mockInteraction);

      expect(mockConfigManager.getConfig).toHaveBeenCalled();
      
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              title: '🤖 AI Model Information',
              fields: expect.arrayContaining([
                expect.objectContaining({
                  name: expect.stringContaining('API Status'),
                }),
                expect.objectContaining({
                  name: expect.stringContaining('Primary Model'),
                }),
                expect.objectContaining({
                  name: expect.stringContaining('Fallback Model'),
                }),
              ]),
            }),
          }),
        ]),
      });
    });

    it('should show missing API key status', async () => {
      delete process.env.GEMINI_API_KEY;
      mockInteractionHelpers.getSubcommand.mockReturnValue('info');

      await handleModelCommand(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embed = replyCall.embeds[0];
      
      expect(embed.data.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('API Status'),
            value: expect.stringContaining('❌ Missing'),
          })
        ])
      );
    });
  });

  describe('Stats Subcommand', () => {
    beforeEach(async () => {
      const botModule = await import('../../../src/bot.js');
      (botModule as any).configManager = mockConfigManager;
      
      const interactionModule = await import('../../../src/handlers/interactionCreate.js');
      (interactionModule as any).hasAdminPermission = mockInteractionHelpers.hasAdminPermission;
      (interactionModule as any).getSubcommand = mockInteractionHelpers.getSubcommand;
    });

    it('should display model statistics', async () => {
      mockInteractionHelpers.getSubcommand.mockReturnValue('stats');

      await handleModelCommand(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              title: '📊 Model Usage Statistics',
              fields: expect.arrayContaining([
                expect.objectContaining({
                  name: expect.stringContaining('Primary Model Usage'),
                }),
                expect.objectContaining({
                  name: expect.stringContaining('Fallback Model Usage'),
                }),
                expect.objectContaining({
                  name: expect.stringContaining('Function Calls'),
                }),
                expect.objectContaining({
                  name: expect.stringContaining('Performance'),
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
      (botModule as any).configManager = mockConfigManager;
      
      const interactionModule = await import('../../../src/handlers/interactionCreate.js');
      (interactionModule as any).hasAdminPermission = mockInteractionHelpers.hasAdminPermission;
      (interactionModule as any).getSubcommand = mockInteractionHelpers.getSubcommand;
    });

    it('should handle configuration errors', async () => {
      mockConfigManager.getConfig.mockImplementation(() => {
        throw new Error('Configuration error');
      });
      mockInteractionHelpers.getSubcommand.mockReturnValue('info');

      await handleModelCommand(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: '❌ Failed to retrieve model information. Please check the configuration.',
      });
    });

    it('should handle unknown subcommands', async () => {
      mockInteractionHelpers.getSubcommand.mockReturnValue('unknown');

      await handleModelCommand(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('❌ Unknown subcommand'),
        ephemeral: true,
      });
    });
  });
});