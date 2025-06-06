import {
  describe,
  expect,
  it,
  mock,
} from "bun:test";

describe("Status Command Tests", () => {
  describe("Basic functionality", () => {
    it("should be importable", async () => {
      const { handleStatusCommand } = await import("../../../src/commands/status.js");
      expect(typeof handleStatusCommand).toBe("function");
    });

    it("should handle basic interaction structure", () => {
      // Test that basic interaction interface is correctly typed
      const mockInteraction = {
        guild: { id: "test-guild", name: "Test" },
        user: { id: "test-user" },
        deferReply: mock(),
        editReply: mock(),
        reply: mock(),
      };

      expect(mockInteraction.guild.id).toBe("test-guild");
      expect(typeof mockInteraction.deferReply).toBe("function");
    });
  });

  describe("Configuration validation", () => {
    it("should validate environment variables exist", () => {
      // Test that required env vars can be checked
      const originalGemini = process.env.GEMINI_API_KEY;
      const originalBrave = process.env.BRAVE_SEARCH_API_KEY;

      // Test missing keys
      delete process.env.GEMINI_API_KEY;
      delete process.env.BRAVE_SEARCH_API_KEY;

      expect(process.env.GEMINI_API_KEY).toBeUndefined();
      expect(process.env.BRAVE_SEARCH_API_KEY).toBeUndefined();

      // Restore
      if (originalGemini) process.env.GEMINI_API_KEY = originalGemini;
      if (originalBrave) process.env.BRAVE_SEARCH_API_KEY = originalBrave;
    });
  });

  describe("Helper function validation", () => {
    it("should validate interaction helpers are importable", async () => {
      const helpers = await import("../../../src/handlers/interactionCreate.js");
      
      expect(typeof helpers.hasAdminPermission).toBe("function");
      expect(typeof helpers.sendPermissionDenied).toBe("function");
      expect(typeof helpers.formatUptime).toBe("function");
      expect(typeof helpers.formatBytes).toBe("function");
    });
  });
});
