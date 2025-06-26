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
      logger.info(
        "Brave Search service initialized (skipping API test to avoid rate limit)"
      );
      // Note: Skipping initial API test to avoid 1 req/sec rate limit
      // The first actual search will validate the API key
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
        const { monthlyUsage, remainingQueries } = await this.getUsageStats();
        const quota =
          this.configManager.getConfig().api.brave_search.free_quota;

        logger.warn("Search blocked due to quota limit", {
          monthlyUsage,
          remainingQueries,
          quota,
        });

        throw new APIError(
          `Monthly search quota exceeded: ${monthlyUsage}/${quota} queries used. Use /search reset to clear counters for testing.`,
          429
        );
      }

      // Check for rate limiting (1 request per second)
      await this.checkRateLimit();

      // Full parameters for optimal search quality
      const count = Math.min(
        query.count || this.configManager.getConfig().search.defaults.count,
        20 // API documented max is 20
      );

      // Optimize parameters for Infobox/FAQ retrieval
      const requestParams: BraveSearchRequest = {
        q: query.query,
        count: count,
        extra_snippets: true,
        text_decorations: true,
      };

      // Add region-specific parameters only for non-global queries
      const region = query.region || "JP";
      const country = this.mapRegionToCountry(region);
      const searchLang = this.mapRegionToLanguage(region);
      const uiLang = this.mapRegionToUILanguage(region);

      // Optimize for Japanese region (default for Discord bot in Japanese)
      if (country) {
        requestParams.country = country; // Use mapped country (JP for Japan region)
      }

      if (searchLang) {
        requestParams.search_lang = searchLang; // Use mapped language (jp for Japan)
      }

      // Always add UI language for proper formatting
      if (uiLang) {
        requestParams.ui_lang = uiLang;
      }

      // Remove empty parameters to avoid 422 errors
      Object.keys(requestParams).forEach((key) => {
        if (
          requestParams[key as keyof BraveSearchRequest] === "" ||
          requestParams[key as keyof BraveSearchRequest] === undefined
        ) {
          delete requestParams[key as keyof BraveSearchRequest];
        }
      });

      logger.debug("Using full parameters for optimal results", {
        params: requestParams,
        region: query.region,
        mappedCountry: this.mapRegionToCountry(query.region || "JP"),
        mappedLang: this.mapRegionToLanguage(query.region || "JP"),
      });

      logger.info("Making search request", {
        query: query.query,
        region: query.region,
        parameterCount: Object.keys(requestParams).length,
        parameters: requestParams,
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
      const { monthlyUsage, remainingQueries } = await this.getUsageStats();
      const canSearchResult = remainingQueries > 0;

      logger.debug("Search availability check", {
        monthlyUsage,
        remainingQueries,
        canSearch: canSearchResult,
        quota: this.configManager.getConfig().api.brave_search.free_quota,
      });

      return canSearchResult;
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

  formatResultsForGemini(results: SearchResponse): string {
    if (results.results.length === 0) {
      return "検索結果が見つかりませんでした。";
    }

    const lines = [`検索クエリ: ${results.query}`];

    // Separate Infobox/FAQ results from regular web results
    const infoboxResults = results.results.filter((r) =>
      r.title.startsWith("📋")
    );
    const faqResults = results.results.filter((r) => r.title.startsWith("❓"));
    const newsResults = results.results.filter((r) => r.title.startsWith("📰"));
    const webResults = results.results.filter(
      (r) =>
        !r.title.startsWith("📋") &&
        !r.title.startsWith("❓") &&
        !r.title.startsWith("📰")
    );

    // Priority 1: Infobox results (highest priority - direct answers)
    if (infoboxResults.length > 0) {
      lines.push("\n🔥 DIRECT INFORMATION (最優先):");
      infoboxResults.forEach((result) => {
        lines.push(`\n${result.title.replace("📋 ", "")}`);
        lines.push(`回答: ${result.description}`);
        if (result.url) lines.push(`情報源: ${result.url}`);
      });
    }

    // Priority 2: FAQ results (direct Q&A)
    if (faqResults.length > 0) {
      lines.push("\n💬 DIRECT ANSWERS (直接回答):");
      faqResults.forEach((result) => {
        lines.push(`\n質問: ${result.title.replace("❓ ", "")}`);
        lines.push(`回答: ${result.description}`);
        if (result.url) lines.push(`情報源: ${result.url}`);
      });
    }

    // Priority 3: News results (current information)
    if (newsResults.length > 0) {
      lines.push("\n📰 LATEST NEWS (最新ニュース):");
      const topNews = newsResults.slice(0, 2);
      topNews.forEach((result, index) => {
        lines.push(`\n${index + 1}. ${result.title.replace("📰 ", "")}`);
        lines.push(`内容: ${result.description}`);
        if (result.age) lines.push(`更新: ${result.age}`);
        lines.push(`URL: ${result.url}`);
      });
    }

    // Priority 4: Regular web results (fallback)
    if (webResults.length > 0) {
      const hasHighPriorityResults =
        infoboxResults.length > 0 || faqResults.length > 0;

      if (hasHighPriorityResults) {
        lines.push("\n🔗 ADDITIONAL SOURCES (参考情報):");
      } else {
        lines.push("\n🔗 SEARCH RESULTS (検索結果):");
      }

      const topWeb = webResults.slice(0, hasHighPriorityResults ? 2 : 4);
      topWeb.forEach((result, index) => {
        lines.push(`\n${index + 1}. ${result.title}`);
        lines.push(`説明: ${result.description}`);
        lines.push(`URL: ${result.url}`);
        if (result.age) lines.push(`更新: ${result.age}`);
      });
    }

    return lines.join("\n");
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

    logger.debug("Making Brave Search API request", {
      endpoint: this.endpoint,
      url: url.toString(),
      params,
      hasApiKey: !!this.apiKey,
      apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 8) + "..." : "none",
      queryParams: Object.fromEntries(url.searchParams.entries()),
    });

    // Log exactly what we're sending to API for debugging 422 errors
    logger.info("API Request Details", {
      method: "GET",
      url: url.toString(),
      queryParams: Object.fromEntries(url.searchParams.entries()),
      paramCount: url.searchParams.size,
    });

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-Subscription-Token": this.apiKey,
        Accept: "application/json",
        "User-Agent": "Gemiscord/1.0",
      },
      signal: AbortSignal.timeout(config.ai.timeout),
    });

    // Log response details for debugging
    logger.debug("Brave Search API response received", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch (e) {
        logger.warn("Could not read error response body");
      }

      logger.error("Brave Search API returned error", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorBody,
        endpoint: this.endpoint,
        url: response.url,
      });

      // Log the actual error body for debugging
      logger.error("Raw error response body:", errorBody);

      throw new APIError(
        `Brave Search API error: ${response.status} ${response.statusText}`,
        response.status,
        this.endpoint
      );
    }

    const data: BraveSearchResponse = await response.json();

    // Enhanced debugging for special result types
    const debugInfo = {
      resultCount: data.web?.results?.length || 0,
      hasNews: !!data.news?.results?.length,
      hasFaq: !!data.faq?.results?.length,
      hasInfobox: !!data.infobox,
      responseStructure: {
        hasWeb: !!data.web,
        hasNews: !!data.news,
        hasFaq: !!data.faq,
        hasInfobox: !!data.infobox,
      },
    };

    logger.debug("Brave Search API call successful", debugInfo);

    // Log detailed structure when special results are found
    if (data.infobox) {
      logger.info("📋 INFOBOX DETECTED!", {
        title: data.infobox.title,
        description: data.infobox.description,
        attributesCount: data.infobox.attributes?.length || 0,
        url: data.infobox.url,
      });
    }

    if (data.faq && data.faq.results.length > 0) {
      logger.info("❓ FAQ DETECTED!", {
        questionsCount: data.faq.results.length,
        firstQuestion: data.faq.results[0]?.question,
        firstAnswer: data.faq.results[0]?.answer,
      });
    }

    // Log raw response structure for debugging (only in development)
    if (process.env.NODE_ENV === "development") {
      logger.debug("Raw API response keys", {
        topLevelKeys: Object.keys(data),
        webResultsCount: data.web?.results?.length,
        queryInfo: data.query,
        infoboxKeys: data.infobox ? Object.keys(data.infobox) : null,
        faqStructure: data.faq
          ? {
              type: data.faq.type,
              resultsCount: data.faq.results?.length,
            }
          : null,
      });
    }

    return data;
  }

  private async checkRateLimit(): Promise<void> {
    const rateLimitKey = "brave_search:last_request";

    try {
      const lastRequestTime = await this.configService.getRateLimitValue(
        rateLimitKey
      );
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;

      // Brave Search has 1 request per second limit
      const minInterval = 1000; // 1 second

      if (lastRequestTime > 0 && timeSinceLastRequest < minInterval) {
        const waitTime = minInterval - timeSinceLastRequest;
        logger.debug("Rate limiting: waiting before next request", {
          lastRequest: new Date(lastRequestTime).toISOString(),
          timeSince: timeSinceLastRequest,
          waitTime,
        });

        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      // Update last request time
      await this.configService.setRateLimitValue(rateLimitKey, now, 60000); // 1 minute TTL
    } catch (error) {
      logger.warn("Rate limit check failed, proceeding anyway:", error);
    }
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
        return "jp"; // Brave Search API expects "jp" for Japanese
      case "US":
        return "en";
      case "global":
      default:
        return "en";
    }
  }

  private mapRegionToUILanguage(region: string): string {
    switch (region) {
      case "JP":
        return "ja-JP";
      case "US":
        return "en-US";
      case "global":
      default:
        return "en-US";
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
