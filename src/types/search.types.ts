// Brave Search API type definitions

// Brave Search API request types
export interface BraveSearchRequest {
  q: string; // Query
  country?: string; // Country code (e.g., 'JP', 'US')
  search_lang?: string; // Search language (e.g., 'ja', 'en')
  ui_lang?: string; // UI language
  count?: number; // Number of results (max 20)
  offset?: number; // Pagination offset
  safesearch?: "off" | "moderate" | "strict";
  freshness?: string; // Time range filter
  text_decorations?: boolean; // Include text decorations
  spellcheck?: boolean; // Enable spellcheck
  goggles_id?: string; // Custom ranking goggles
  units?: "metric" | "imperial";
  extra_snippets?: boolean; // Include extra snippets
}

// Brave Search API response types
export interface BraveSearchResponse {
  type: "search";
  query: BraveQuery;
  web?: BraveWebResults;
  news?: BraveNewsResults;
  faq?: BraveFAQResults;
  infobox?: BraveInfobox;
}

export interface BraveQuery {
  original: string;
  show_strict_warning: boolean;
  is_navigational: boolean;
  is_news_breaking: boolean;
  spellcheck_off: boolean;
  country: string;
  bad_results: boolean;
  should_fallback: boolean;
  language: string;
  more_results_available: boolean;
  altered?: string;
}


export interface BraveWebResults {
  type: "search";
  results: Array<BraveWebResult>;
  family_friendly: boolean;
}

export interface BraveWebResult {
  type: "search_result";
  title: string;
  url: string;
  description: string;
  age?: string;
  page_age?: string;
  meta_url?: {
    scheme: string;
    netloc: string;
    hostname: string;
    favicon: string;
    path: string;
  };
  thumbnail?: {
    src: string;
    height: number;
    width: number;
  };
  language: string;
  family_friendly: boolean;
  extra_snippets?: string[];
}

export interface BraveNewsResults {
  type: "news";
  results: Array<BraveNewsResult>;
}

export interface BraveNewsResult {
  type: "news_result";
  title: string;
  url: string;
  description: string;
  age: string;
  page_age?: string;
  meta_url?: {
    scheme: string;
    netloc: string;
    hostname: string;
    favicon: string;
    path: string;
  };
  thumbnail?: {
    src: string;
    height: number;
    width: number;
  };
  breaking?: boolean;
}



export interface BraveFAQResults {
  type: "faq";
  results: Array<BraveFAQResult>;
}

export interface BraveFAQResult {
  type: "faq_result";
  question: string;
  answer: string;
  title: string;
  url: string;
  meta_url?: {
    scheme: string;
    netloc: string;
    hostname: string;
    favicon: string;
    path: string;
  };
}

export interface BraveInfobox {
  type: "infobox";
  title: string;
  url: string;
  thumbnail?: {
    src: string;
    height: number;
    width: number;
  };
  description?: string;
  long_desc?: string;
  attributes?: Array<{
    label: string;
    value: string;
    is_text: boolean;
  }>;
  profiles?: Array<{
    url: string;
    long_name: string;
  }>;
  website_url?: string;
  ratings?: {
    average?: number;
    count?: number;
    source?: string;
  };
}


// Search service types
export interface SearchServiceOptions {
  apiKey: string;
  endpoint: string;
  defaultRegion?: string;
  timeout?: number;
  retries?: number;
}

export interface SearchQuery {
  query: string;
  region?: "JP" | "US" | "global";
  count?: number;
  freshness?: "day" | "week" | "month" | "year";
  safesearch?: "off" | "moderate" | "strict";
}

export interface SearchError extends Error {
  code?: string;
  status?: number;
  query?: string;
}

// Search result formatting
export interface FormattedSearchResult {
  title: string;
  url: string;
  description: string;
  age?: string;
  source?: string;
  thumbnail?: string;
}

export interface SearchResponse {
  results: FormattedSearchResult[];
  query: string;
  region: string;
  totalResults: number;
  searchTime: number;
}

// Search usage tracking
export interface SearchUsageStats {
  monthlyUsage: number;
  remainingQuota: number;
  isFreeTier: boolean;
  resetDate: Date;
}
