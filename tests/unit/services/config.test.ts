import { ConfigService } from "../../../src/services/config";
import { ConfigurationError } from "../../../src/utils/errors";

// Mock keyv and @keyv/sqlite
jest.mock("keyv");
jest.mock("@keyv/sqlite");

import KeyvSqlite from "@keyv/sqlite";
import Keyv from "keyv";

const MockKeyv = Keyv as jest.MockedClass<typeof Keyv>;
const MockKeyvSqlite = KeyvSqlite as jest.MockedClass<typeof KeyvSqlite>;

describe("ConfigService", () => {
  let configService: ConfigService;
  let mockKeyv: jest.Mocked<Keyv>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock keyv instance
    mockKeyv = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      on: jest.fn(),
    } as any;

    // Mock constructor to return our mock instance
    MockKeyv.mockImplementation(() => mockKeyv);
    MockKeyvSqlite.mockImplementation(() => ({} as any));

    configService = new ConfigService("sqlite://test.db");
  });

  describe("initialize", () => {
    it("should initialize successfully", async () => {
      mockKeyv.set.mockResolvedValue(true);
      mockKeyv.delete.mockResolvedValue(true);

      await expect(configService.initialize()).resolves.not.toThrow();

      expect(mockKeyv.set).toHaveBeenCalledWith("test", "test", 1000);
      expect(mockKeyv.delete).toHaveBeenCalledWith("test");
    });

    it("should throw error on initialization failure", async () => {
      mockKeyv.set.mockRejectedValue(new Error("Database error"));

      await expect(configService.initialize()).rejects.toThrow(
        ConfigurationError
      );
    });
  });

  describe("getGuildConfig", () => {
    it("should return default guild configuration", async () => {
      mockKeyv.get.mockResolvedValue(undefined);

      const config = await configService.getGuildConfig("guild123");

      expect(config).toEqual({
        mention_enabled: true,
        response_channels: [],
        search_enabled: true,
        server_prompt: undefined,
        message_limit_strategy: "compress",
      });
    });

    it("should return stored guild configuration", async () => {
      mockKeyv.get
        .mockResolvedValueOnce(false) // mention_enabled
        .mockResolvedValueOnce(["channel1", "channel2"]) // response_channels
        .mockResolvedValueOnce(false) // search_enabled
        .mockResolvedValueOnce("Custom server prompt") // server_prompt
        .mockResolvedValueOnce("split"); // message_limit_strategy

      const config = await configService.getGuildConfig("guild123");

      expect(config).toEqual({
        mention_enabled: false,
        response_channels: ["channel1", "channel2"],
        search_enabled: false,
        server_prompt: "Custom server prompt",
        message_limit_strategy: "split",
      });
    });
  });

  describe("setGuildConfig", () => {
    it("should update guild configuration", async () => {
      mockKeyv.set.mockResolvedValue(true);

      const config = {
        mention_enabled: false,
        search_enabled: true,
        message_limit_strategy: "split" as const,
      };

      await configService.setGuildConfig("guild123", config);

      expect(mockKeyv.set).toHaveBeenCalledTimes(3);
      expect(mockKeyv.set).toHaveBeenCalledWith(
        "guild:guild123:mention_enabled",
        false
      );
    });
  });

  describe("getChannelConfig", () => {
    it("should return channel configuration", async () => {
      mockKeyv.get.mockResolvedValue("Custom channel prompt");

      const config = await configService.getChannelConfig("channel123");

      expect(config).toEqual({
        channel_prompt: "Custom channel prompt",
      });
    });

    it("should return empty config when no prompt set", async () => {
      mockKeyv.get.mockResolvedValue(undefined);

      const config = await configService.getChannelConfig("channel123");

      expect(config).toEqual({
        channel_prompt: undefined,
      });
    });
  });

  describe("setChannelConfig", () => {
    it("should update channel configuration", async () => {
      mockKeyv.set.mockResolvedValue(true);

      await configService.setChannelConfig("channel123", {
        channel_prompt: "New prompt",
      });

      expect(mockKeyv.set).toHaveBeenCalledWith(
        "channel:channel123:channel_prompt",
        "New prompt"
      );
    });
  });

  describe("isMentionEnabled", () => {
    it("should return stored value", async () => {
      mockKeyv.get.mockResolvedValue(false);

      const enabled = await configService.isMentionEnabled("guild123");

      expect(enabled).toBe(false);
      expect(mockKeyv.get).toHaveBeenCalledWith(
        "guild:guild123:mention_enabled"
      );
    });

    it("should return default when no value stored", async () => {
      mockKeyv.get.mockResolvedValue(undefined);

      const enabled = await configService.isMentionEnabled("guild123");

      expect(enabled).toBe(true); // Default value
    });
  });

  describe("isResponseChannel", () => {
    it("should return true for configured channel", async () => {
      mockKeyv.get.mockResolvedValue(["channel1", "channel2"]);

      const isResponse = await configService.isResponseChannel(
        "guild123",
        "channel1"
      );

      expect(isResponse).toBe(true);
    });

    it("should return false for non-configured channel", async () => {
      mockKeyv.get.mockResolvedValue(["channel1", "channel2"]);

      const isResponse = await configService.isResponseChannel(
        "guild123",
        "channel3"
      );

      expect(isResponse).toBe(false);
    });

    it("should return false when no channels configured", async () => {
      mockKeyv.get.mockResolvedValue(undefined);

      const isResponse = await configService.isResponseChannel(
        "guild123",
        "channel1"
      );

      expect(isResponse).toBe(false);
    });
  });

  describe("getSearchUsage", () => {
    it("should return current month usage", async () => {
      mockKeyv.get.mockResolvedValue(150);

      const usage = await configService.getSearchUsage();

      expect(usage).toBe(150);

      const currentMonth = new Date().toISOString().slice(0, 7);
      expect(mockKeyv.get).toHaveBeenCalledWith(
        `search:monthly_usage:${currentMonth}`
      );
    });

    it("should return 0 when no usage recorded", async () => {
      mockKeyv.get.mockResolvedValue(undefined);

      const usage = await configService.getSearchUsage();

      expect(usage).toBe(0);
    });
  });

  describe("incrementSearchUsage", () => {
    it("should increment search usage counter", async () => {
      mockKeyv.get.mockResolvedValue(100);
      mockKeyv.set.mockResolvedValue(true);

      await configService.incrementSearchUsage();

      expect(mockKeyv.set).toHaveBeenCalledWith(
        expect.stringContaining("search:monthly_usage:"),
        101,
        expect.any(Number) // TTL
      );
    });
  });

  describe("getStats", () => {
    it("should return statistics", async () => {
      mockKeyv.get
        .mockResolvedValueOnce(1000) // total_requests
        .mockResolvedValueOnce(50) // search_usage
        .mockResolvedValueOnce(800) // gemini-2.0-flash usage
        .mockResolvedValueOnce(200); // gemini-2.5-flash usage

      const stats = await configService.getStats();

      expect(stats).toEqual({
        total_requests: 1000,
        search_usage: 50,
        model_usage: {
          "gemini-2.0-flash": 800,
          "gemini-2.5-flash-preview-0520": 200,
        },
      });
    });
  });

  describe("addResponseChannel", () => {
    it("should add new channel to response channels", async () => {
      mockKeyv.get.mockResolvedValue(["channel1"]);
      mockKeyv.set.mockResolvedValue(true);

      await configService.addResponseChannel("guild123", "channel2");

      expect(mockKeyv.set).toHaveBeenCalledWith(
        "guild:guild123:response_channels",
        ["channel1", "channel2"]
      );
    });

    it("should not add duplicate channel", async () => {
      mockKeyv.get.mockResolvedValue(["channel1", "channel2"]);
      mockKeyv.set.mockResolvedValue(true);

      await configService.addResponseChannel("guild123", "channel1");

      expect(mockKeyv.set).not.toHaveBeenCalled();
    });
  });

  describe("removeResponseChannel", () => {
    it("should remove channel from response channels", async () => {
      mockKeyv.get.mockResolvedValue(["channel1", "channel2"]);
      mockKeyv.set.mockResolvedValue(true);

      await configService.removeResponseChannel("guild123", "channel1");

      expect(mockKeyv.set).toHaveBeenCalledWith(
        "guild:guild123:response_channels",
        ["channel2"]
      );
    });

    it("should not update when channel not in list", async () => {
      mockKeyv.get.mockResolvedValue(["channel1", "channel2"]);
      mockKeyv.set.mockResolvedValue(true);

      await configService.removeResponseChannel("guild123", "channel3");

      expect(mockKeyv.set).not.toHaveBeenCalled();
    });
  });

  describe("clearGuildSettings", () => {
    it("should clear all guild settings", async () => {
      mockKeyv.delete.mockResolvedValue(true);

      await configService.clearGuildSettings("guild123");

      expect(mockKeyv.delete).toHaveBeenCalledTimes(5);
      expect(mockKeyv.delete).toHaveBeenCalledWith(
        "guild:guild123:mention_enabled"
      );
      expect(mockKeyv.delete).toHaveBeenCalledWith(
        "guild:guild123:response_channels"
      );
      expect(mockKeyv.delete).toHaveBeenCalledWith(
        "guild:guild123:search_enabled"
      );
      expect(mockKeyv.delete).toHaveBeenCalledWith(
        "guild:guild123:server_prompt"
      );
      expect(mockKeyv.delete).toHaveBeenCalledWith(
        "guild:guild123:message_limit_strategy"
      );
    });
  });
});
