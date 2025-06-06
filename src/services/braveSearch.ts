// Brave Search API service implementation

import { ISearchService } from "../interfaces/services.js";
import {
  BraveSearchRequest,
  BraveSearchResponse,
  FormattedSearchResult,
  SearchQuery,
  SearchResponse,
} from "../types/search.types.js";
import { APIError } from "../utils/errors.js";
import { discordLogger as logger } from "../utils/logger.js";
import { ConfigService } from "./config.js";
import { ConfigManager } from "./configManager.js";

export class BraveSearchService implements ISearchService {
  private apiKey: string;
  private endpoint: string;
  private configService: ConfigService;
  private configManager: ConfigManager;

  constructor(configService: ConfigService, configManager: ConfigManager) {
    if (!process.env.BRAVE_SEARCH_API_KEY) {
      throw new APIError("BRAVE_SEARCH_API_KEY is not set");
    }

    this.apiKey = process.env.BRAVE_SEARCH_API_KEY;
    this.configService = configService;
    this.configManager = configManager;
    const config = this.configManager.getConfig();
    this.endpoint = config.api.brave_search.endpoint;

    logger.info("BraveSearchService initialized", {
      endpoint: this.endpoint,
      hasApiKey: !!this.apiKey,
      freeQuota: config.api.brave_search.free_quota,
    });
  }

  async initialize(): Promise<void> {
    try {
      // Test the API by making a simple search
      await this.makeApiCall("test", { q: "test", count: 1 });
      logger.info("Brave Search service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Brave Search service:", error);
      throw new APIError(
        "Failed to initialize Brave Search service",
        undefined,
        undefined,
        error
      );
    }
  }

  async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      // Check if we can make a search request
      if (!(await this.canSearch())) {
        throw new APIError("Search quota exceeded for this month", 429);
      }

      // Build request parameters
      const requestParams: BraveSearchRequest = {
        q: query.query,
        count: Math.min(
          query.count || this.configManager.getConfig().search.defaults.count,
          this.configManager.getConfig().search.defaults.max_results
        ),
        country: this.mapRegionToCountry(query.region || "JP"),
        search_lang: this.mapRegionToLanguage(query.region || "JP"),
        ui_lang: this.mapRegionToLanguage(query.region || "JP"),
        safesearch: query.safesearch || "moderate",
        freshness: query.freshness,
        text_decorations: false,
        spellcheck: true,
        extra_snippets: true,
      };

      logger.info("Making search request", {
        query: query.query,
        region: query.region,
        count: requestParams.count,
      });

      // Make the API call
      const response = await this.makeApiCall(query.query, requestParams);

      // Format the results
      const formattedResults = this.formatResults(response);
      const searchTime = Date.now() - startTime;

      // Update usage statistics
      await this.incrementUsage();

      const searchResponse: SearchResponse = {
        results: formattedResults,
        query: query.query,
        region: query.region || "JP",
        totalResults: formattedResults.length,
        searchTime,
      };

      logger.info("Search completed successfully", {
        query: query.query,
        resultCount: formattedResults.length,
        searchTime,
      });

      return searchResponse;
    } catch (error) {
      logger.error("Search failed:", error);
      throw this.handleSearchError(error, query.query);
    }
  }

  async getUsageStats(): Promise<{
    monthlyUsage: number;
    remainingQueries: number;
  }> {
    const config = this.configManager.getConfig();
    try {
      const monthlyUsage = await this.configService.getSearchUsage();
      const remainingQueries = Math.max(
        0,
        config.api.brave_search.free_quota - monthlyUsage
      );

      return {
        monthlyUsage,
        remainingQueries,
      };
    } catch (error) {
      logger.error("Failed to get usage stats:", error);
      return {
        monthlyUsage: 0,
        remainingQueries: config.api.brave_search.free_quota,
      };
    }
  }

  async canSearch(): Promise<boolean> {
    try {
      const { remainingQueries } = await this.getUsageStats();
      return remainingQueries > 0;
    } catch (error) {
      logger.error("Failed to check search availability:", error);
      return false;
    }
  }

  formatResultsForDiscord(results: SearchResponse): string {
    const config = this.configManager.getConfig();

    if (results.results.length === 0) {
      return "検索結果が見つかりませんでした。";
    }

    const lines = [
      `${config.ui.emojis.search} **"${results.query}"** の検索結果:\n`,
    ];

    // Take top results based on config for Discord formatting
    const displayCount = config.search.defaults.display_count;
    const topResults = results.results.slice(0, displayCount);

    topResults.forEach((result, index) => {
      lines.push(`**${index + 1}.** [${result.title}](${result.url})`);
      lines.push(`${result.description}`);
      if (result.age) {
        lines.push(`📅 ${result.age}`);
      }
      lines.push(""); // Empty line for spacing
    });

    // Add footer
    if (results.results.length > displayCount) {
      lines.push(
        `他 ${results.results.length - displayCount} 件の結果があります。`
      );
    }

    return lines.join("\n").slice(0, config.search.formatting.preview_length);
  }

  private async makeApiCall(
    _query: string,
    params: BraveSearchRequest
  ): Promise<BraveSearchResponse> {
    const url = new URL(this.endpoint);

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    const config = this.configManager.getConfig();
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-Subscription-Token": this.apiKey,
        Accept: "application/json",
        "User-Agent": "Gemiscord/1.0",
      },
      signal: AbortSignal.timeout(config.ai.timeout),
    });

    if (!response.ok) {
      throw new APIError(
        `Brave Search API error: ${response.status} ${response.statusText}`,
        response.status,
        this.endpoint
      );
    }

    const data: BraveSearchResponse = await response.json();
    return data;
  }

  private formatResults(
    response: BraveSearchResponse
  ): FormattedSearchResult[] {
    const results: FormattedSearchResult[] = [];

    // Process web results
    if (response.web?.results) {
      response.web.results.forEach((result) => {
        results.push({
          title: result.title,
          url: result.url,
          description: result.description,
          age: result.age,
          source: result.meta_url?.hostname,
          thumbnail: result.thumbnail?.src,
        });
      });
    }

    // Process news results
    if (response.news?.results) {
      response.news.results.forEach((result) => {
        results.push({
          title: `📰 ${result.title}`,
          url: result.url,
          description: result.description,
          age: result.age,
          source: result.meta_url?.hostname,
          thumbnail: result.thumbnail?.src,
        });
      });
    }

    // Process FAQ results
    if (response.faq?.results) {
      response.faq.results.forEach((result) => {
        results.push({
          title: `❓ ${result.question}`,
          url: result.url,
          description: result.answer,
          source: result.meta_url?.hostname,
        });
      });
    }

    // Process infobox
    if (response.infobox) {
      results.unshift({
        title: `📋 ${response.infobox.title}`,
        url: response.infobox.url,
        description:
          response.infobox.description || response.infobox.long_desc || "",
        thumbnail: response.infobox.thumbnail?.src,
      });
    }

    return results;
  }

  private async incrementUsage(): Promise<void> {
    try {
      await this.configService.incrementSearchUsage();
    } catch (error) {
      logger.error("Failed to increment search usage:", error);
    }
  }

  private mapRegionToCountry(region: string): string {
    switch (region) {
      case "JP":
        return "JP";
      case "US":
        return "US";
      case "global":
      default:
        return ""; // Global search
    }
  }

  private mapRegionToLanguage(region: string): string {
    switch (region) {
      case "JP":
        return "ja";
      case "US":
        return "en";
      case "global":
      default:
        return "en";
    }
  }

  private handleSearchError(error: unknown, _query?: string): APIError {
    if (error instanceof APIError) {
      return error;
    }

    if (error instanceof Error) {
      // Check for rate limit errors
      if (error.message.includes("429")) {
        return new APIError(
          "Brave Search API rate limit exceeded",
          429,
          this.endpoint,
          error
        );
      }

      // Check for quota errors
      if (error.message.includes("403") || error.message.includes("quota")) {
        return new APIError(
          "Brave Search API quota exceeded",
          403,
          this.endpoint,
          error
        );
      }

      // Check for authentication errors
      if (
        error.message.includes("401") ||
        error.message.includes("unauthorized")
      ) {
        return new APIError(
          "Brave Search API authentication failed",
          401,
          this.endpoint,
          error
        );
      }

      // Check for timeout errors
      if (error.message.includes("timeout") || error.name === "TimeoutError") {
        return new APIError(
          "Brave Search API timeout",
          408,
          this.endpoint,
          error
        );
      }

      return new APIError(
        `Brave Search API error: ${error.message}`,
        undefined,
        this.endpoint,
        error
      );
    }

    return new APIError(
      "Unknown Brave Search API error",
      undefined,
      this.endpoint,
      error
    );
  }
}
