// Unit tests for BraveSearchService

import { BraveSearchService } from "../../../src/services/braveSearch.js";
import { ConfigService } from "../../../src/services/config.js";
import {
  BraveSearchResponse,
  SearchQuery,
} from "../../../src/types/search.types.js";

// Mock ConfigService
const mockConfigService = {
  getSearchUsage: jest.fn(),
  incrementSearchUsage: jest.fn(),
} as unknown as ConfigService;

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe("BraveSearchService", () => {
  let braveSearchService: BraveSearchService;
  const originalApiKey = process.env.BRAVE_SEARCH_API_KEY;

  beforeEach(() => {
    // Set API key for tests
    process.env.BRAVE_SEARCH_API_KEY = "test-api-key";

    // Reset all mocks
    jest.clearAllMocks();

    // Create new service instance
    braveSearchService = new BraveSearchService(mockConfigService);
  });

  afterEach(() => {
    // Restore original API key
    if (originalApiKey) {
      process.env.BRAVE_SEARCH_API_KEY = originalApiKey;
    } else {
      delete process.env.BRAVE_SEARCH_API_KEY;
    }
  });

  describe("constructor", () => {
    it("should initialize with ConfigService and API key", () => {
      expect(braveSearchService).toBeInstanceOf(BraveSearchService);
    });

    it("should throw error when API key is not set", () => {
      delete process.env.BRAVE_SEARCH_API_KEY;

      expect(() => {
        new BraveSearchService(mockConfigService);
      }).toThrow("BRAVE_SEARCH_API_KEY is not set");
    });
  });

  describe("initialize", () => {
    it("should initialize successfully with valid API", async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            web: { results: [] },
          }),
      } as any);

      await expect(braveSearchService.initialize()).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("api.search.brave.com"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Subscription-Token": "test-api-key",
          }),
        })
      );
    });

    it("should throw error when API test fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(braveSearchService.initialize()).rejects.toThrow(
        "Failed to initialize Brave Search service"
      );
    });
  });

  describe("search", () => {
    const mockSearchQuery: SearchQuery = {
      query: "test query",
      region: "JP",
      count: 5,
    };

    const mockApiResponse: BraveSearchResponse = {
      type: "search",
      query: {
        original: "test query",
        show_strict_warning: false,
        is_navigational: false,
        is_news_breaking: false,
        spellcheck_off: false,
        country: "JP",
        bad_results: false,
        should_fallback: false,
        language: "ja",
        more_results_available: false,
      },
      web: {
        type: "search",
        family_friendly: true,
        results: [
          {
            type: "search_result",
            title: "Test Result 1",
            url: "https://example.com/1",
            description: "First test result",
            age: "1 day ago",
            language: "ja",
            family_friendly: true,
            extra_snippets: ["snippet 1"],
          },
          {
            type: "search_result",
            title: "Test Result 2",
            url: "https://example.com/2",
            description: "Second test result",
            age: "2 days ago",
            language: "ja",
            family_friendly: true,
            extra_snippets: ["snippet 2"],
          },
        ],
      },
    };

    beforeEach(() => {
      // Mock canSearch to return true
      jest.spyOn(braveSearchService, "canSearch").mockResolvedValue(true);

      // Mock incrementUsage
      jest
        .spyOn(braveSearchService, "incrementUsage" as any)
        .mockResolvedValue(undefined);
    });

    it("should perform search successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      } as any);

      const result = await braveSearchService.search(mockSearchQuery);

      expect(result).toMatchObject({
        query: "test query",
        region: "JP",
        totalResults: 2,
        results: expect.arrayContaining([
          expect.objectContaining({
            title: "Test Result 1",
            url: "https://example.com/1",
          }),
        ]),
      });

      // Just check that fetch was called (don't be strict about exact URL format)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain("api.search.brave.com");
      expect(fetchCall[0]).toMatch(/q=test[+%20]query/); // Allow both + and %20 encoding
      expect(fetchCall[1]).toMatchObject({
        method: "GET",
        headers: expect.objectContaining({
          "X-Subscription-Token": "test-api-key",
        }),
      });
    });

    it("should handle quota exceeded error", async () => {
      jest.spyOn(braveSearchService, "canSearch").mockResolvedValue(false);

      await expect(braveSearchService.search(mockSearchQuery)).rejects.toThrow(
        "Search quota exceeded for this month"
      );
    });

    it("should handle API error responses", async () => {
      jest.spyOn(braveSearchService, "canSearch").mockResolvedValue(true);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      } as any);

      await expect(braveSearchService.search(mockSearchQuery)).rejects.toThrow(
        "Brave Search API error: 429 Too Many Requests"
      );
    });

    it("should handle network errors", async () => {
      jest.spyOn(braveSearchService, "canSearch").mockResolvedValue(true);

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        braveSearchService.search(mockSearchQuery)
      ).rejects.toThrow();
    });
  });

  describe("getUsageStats", () => {
    it("should return usage stats correctly", async () => {
      const mockUsage = 500;
      mockConfigService.getSearchUsage = jest.fn().mockResolvedValue(mockUsage);

      const stats = await braveSearchService.getUsageStats();

      expect(stats).toEqual({
        monthlyUsage: 500,
        remainingQueries: 1500, // 2000 - 500
      });
    });

    it("should handle errors and return default values", async () => {
      mockConfigService.getSearchUsage = jest
        .fn()
        .mockRejectedValue(new Error("DB error"));

      const stats = await braveSearchService.getUsageStats();

      expect(stats).toEqual({
        monthlyUsage: 0,
        remainingQueries: 2000,
      });
    });

    it("should return zero remaining when quota exceeded", async () => {
      const mockUsage = 2500; // Over quota
      mockConfigService.getSearchUsage = jest.fn().mockResolvedValue(mockUsage);

      const stats = await braveSearchService.getUsageStats();

      expect(stats).toEqual({
        monthlyUsage: 2500,
        remainingQueries: 0,
      });
    });
  });

  describe("canSearch", () => {
    it("should return true when quota available", async () => {
      jest.spyOn(braveSearchService, "getUsageStats").mockResolvedValue({
        monthlyUsage: 500,
        remainingQueries: 1500,
      });

      const canSearch = await braveSearchService.canSearch();

      expect(canSearch).toBe(true);
    });

    it("should return false when quota exhausted", async () => {
      jest.spyOn(braveSearchService, "getUsageStats").mockResolvedValue({
        monthlyUsage: 2000,
        remainingQueries: 0,
      });

      const canSearch = await braveSearchService.canSearch();

      expect(canSearch).toBe(false);
    });

    it("should return false on error", async () => {
      jest
        .spyOn(braveSearchService, "getUsageStats")
        .mockRejectedValue(new Error("Error"));

      const canSearch = await braveSearchService.canSearch();

      expect(canSearch).toBe(false);
    });
  });

  describe("formatResultsForDiscord", () => {
    const mockSearchResponse = {
      query: "test query",
      region: "JP" as const,
      totalResults: 3,
      searchTime: 250,
      results: [
        {
          title: "First Result",
          url: "https://example.com/1",
          description: "Description 1",
          age: "1 day ago",
        },
        {
          title: "Second Result",
          url: "https://example.com/2",
          description: "Description 2",
          age: "2 days ago",
        },
        {
          title: "Third Result",
          url: "https://example.com/3",
          description: "Description 3",
        },
      ],
    };

    it("should format results for Discord correctly", () => {
      const formatted =
        braveSearchService.formatResultsForDiscord(mockSearchResponse);

      expect(formatted).toContain('🔍 **"test query"** の検索結果:');
      expect(formatted).toContain(
        "**1.** [First Result](https://example.com/1)"
      );
      expect(formatted).toContain("Description 1");
      expect(formatted).toContain("📅 1 day ago");
      expect(formatted).toContain(
        "**2.** [Second Result](https://example.com/2)"
      );
    });

    it("should handle empty results", () => {
      const emptyResponse = {
        ...mockSearchResponse,
        results: [],
        totalResults: 0,
      };

      const formatted =
        braveSearchService.formatResultsForDiscord(emptyResponse);

      expect(formatted).toBe("検索結果が見つかりませんでした。");
    });

    it("should limit results to top 5 and show count", () => {
      const manyResults = {
        ...mockSearchResponse,
        results: Array(10)
          .fill(null)
          .map((_, i) => ({
            title: `Result ${i + 1}`,
            url: `https://example.com/${i + 1}`,
            description: `Description ${i + 1}`,
          })),
        totalResults: 10,
      };

      const formatted = braveSearchService.formatResultsForDiscord(manyResults);

      expect(formatted).toContain("**5.** [Result 5](https://example.com/5)");
      expect(formatted).not.toContain("**6.**");
      expect(formatted).toContain("他 5 件の結果があります。");
    });

    it("should respect Discord character limit", () => {
      const longResult = {
        ...mockSearchResponse,
        results: [
          {
            title: "Very long title ".repeat(50),
            url: "https://example.com/long",
            description: "Very long description ".repeat(100),
          },
        ],
      };

      const formatted = braveSearchService.formatResultsForDiscord(longResult);

      expect(formatted.length).toBeLessThanOrEqual(1900);
    });
  });
});
