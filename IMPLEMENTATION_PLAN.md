# Gemiscord Implementation Plan - 詳細実装計画

## 前提条件の確認

- ✅ .env ファイルの設定完了
- ✅ 必要な API キーの取得完了
- ✅ Git リポジトリの初期化完了
- ✅ 依存関係のインストール完了

## 実装の基本方針

### 1. 手戻り防止のための設計原則

- **インターフェース優先設計**: 各モジュールのインターフェースを先に定義
- **モックファースト**: 外部 API との連携部分はモックから開始
- **段階的統合**: 各コンポーネントを独立してテスト可能に設計
- **エラーハンドリング組み込み**: 最初からエラー処理を実装
- **型安全性の確保**: TypeScript strict モードで型定義を徹底
- **ドキュメント駆動開発**: 実装前に必ず公式ドキュメントを確認

### 2. ディレクトリ構造の事前定義

```sh
src/
├── types/                    # 全ての型定義（最初に作成）
│   ├── index.ts             # 型定義のエクスポート
│   ├── config.types.ts      # 設定関連の型
│   ├── discord.types.ts     # Discord関連の型拡張
│   ├── gemini.types.ts      # Gemini API関連の型
│   ├── search.types.ts      # 検索関連の型
│   └── response.types.ts    # レスポンス処理の型
├── interfaces/              # インターフェース定義
│   ├── services.ts          # サービス層のインターフェース
│   └── handlers.ts          # ハンドラー層のインターフェース
├── utils/                   # ユーティリティ（依存なし）
│   ├── logger.ts            # ロギング
│   ├── constants.ts         # 定数定義
│   ├── sanitizer.ts         # サニタイゼーション
│   └── errors.ts            # カスタムエラークラス
├── services/                # ビジネスロジック
├── handlers/                # イベントハンドラー
├── commands/                # スラッシュコマンド
└── bot.ts                   # エントリーポイント

config/                      # 設定ファイル
├── bot-config.yaml         # メイン設定
├── bot-config.dev.yaml     # 開発環境設定
└── bot-config.prod.yaml    # 本番環境設定
```

## 必須ドキュメント確認リスト

### Phase 0 実装前に確認すべきドキュメント

1. **TypeScript 公式ドキュメント**

   - [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
   - [Strict Mode 設定](https://www.typescriptlang.org/tsconfig#strict)
   - [Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)

2. **Bun 公式ドキュメント**
   - [Bun TypeScript Support](https://bun.sh/docs/runtime/typescript)
   - [Environment Variables](https://bun.sh/docs/runtime/env)
   - [Module Resolution](https://bun.sh/docs/runtime/modules)

### Phase 1 実装前に確認すべきドキュメント

1. **discord.js v14 ドキュメント**

   - [Guide](https://discordjs.guide/)
   - [API Reference](https://discord.js.org/docs/packages/discord.js/14.19.3)
   - [Intents and Partials](https://discordjs.guide/popular-topics/intents.html)

2. **YAML ライブラリ**

   - [yaml npm package](https://www.npmjs.com/package/yaml)
   - [YAML Spec](https://yaml.org/spec/1.2.2/)

3. **keyv ドキュメント**
   - [keyv Documentation](https://keyv.org/docs/)
   - [@keyv/sqlite](https://github.com/jaredwray/keyv/tree/main/packages/sqlite)
   - [TTL Support](https://github.com/jaredwray/keyv#ttl)

### Phase 2 実装前に確認すべきドキュメント

1. **Google Gemini API**

   - [Function Calling Guide](https://ai.google.dev/gemini-api/docs/function-calling)
   - [API Reference](https://ai.google.dev/api/rest)
   - [Model Information](https://ai.google.dev/gemini-api/docs/models/gemini)
   - [Rate Limits](https://ai.google.dev/gemini-api/docs/quota)
   - [File API](https://ai.google.dev/gemini-api/docs/vision)

2. **Brave Search API**

   - [API Documentation](https://api-dashboard.search.brave.com/app/documentation/web-search/get-started)
   - [Request Header](https://api-dashboard.search.brave.com/app/documentation/web-search/request-headers)
   - [Rate Limits and Pricing](https://api-dashboard.search.brave.com/app/subscriptions/subscribe?tab=ai)
   - [Response Format](https://api-dashboard.search.brave.com/app/documentation/web-search/responses)

3. **@google/genai ライブラリ**
   - [Official Documentation](https://googleapis.github.io/js-genai/release_docs/index.html)
   - [NPM Documentation](https://www.npmjs.com/package/@google/genai)
   - [Library GitHub](https://github.com/googleapis/js-genai)

### Phase 3 実装前に確認すべきドキュメント

1. **Discord Slash Commands**

   - [Slash Commands Hands-on](https://discordjs.guide/creating-your-bot/slash-commands.html)
   - [Component interactions](https://discordjs.guide/message-components/interactions.html)
   - [Command Options](https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-structure)

2. **File Handling**
   - [Discord.js Attachments](https://discord.js.org/docs/packages/discord.js/14.19.3/Attachment:Class)
   - [Gemini File API](https://ai.google.dev/gemini-api/docs/image-understanding#javascript)

### Phase 4 実装前に確認すべきドキュメント

1. **Docker & Deployment**

   - [Docker Documentation](https://docs.docker.com/get-started/)
   - [Coolify Documentation](https://coolify.io/docs/)
   - [Bun Docker Image](https://hub.docker.com/r/oven/bun)

2. **Production Best Practices**
   - [Node.js Production Best Practices](https://github.com/goldbergyoni/nodebestpractices)
   - [Discord Bot Best Practices](https://discord.com/developers/docs/topics/community-resources#best-practices)

## Phase 0: 基礎設計と型定義（手戻り防止の要）

### 0-1. 型定義の作成（最優先）

**理由**: 全てのコンポーネントが依存するため、最初に確定させる

1. **config.types.ts**

   - YAMLConfig 型（静的設定の構造）
   - DynamicConfig 型（keyv 保存データの構造）
   - 環境変数の型定義

2. **gemini.types.ts**

   - Function Calling 関連の型
   - レート制限情報の型
   - API レスポンスの型

3. **discord.types.ts**

   - カスタムメッセージ型
   - コマンドインタラクション型
   - ボット設定型

4. **search.types.ts**

   - Brave Search API の型
   - 検索結果の型
   - Function 宣言の型

5. **response.types.ts**
   - レスポンス処理戦略の型
   - 分割オプションの型
   - エラーレスポンスの型

### 0-2. インターフェース定義

**理由**: 実装前にコントラクトを確定し、並行開発を可能にする

1. **services.ts**

   ```typescript
   interface IConfigManager {
     /* YAML設定管理 */
   }
   interface IConfigService {
     /* keyv動的設定 */
   }
   interface IGeminiService {
     /* Gemini API */
   }
   interface ISearchService {
     /* Brave Search */
   }
   interface IRateLimitService {
     /* レート制限 */
   }
   interface IMessageProcessor {
     /* メッセージ処理 */
   }
   interface IResponseManager {
     /* レスポンス管理 */
   }
   ```

2. **handlers.ts**

   ```typescript
   interface IMessageHandler {
     /* メッセージイベント */
   }
   interface IInteractionHandler {
     /* スラッシュコマンド */
   }
   interface IReadyHandler {
     /* 起動処理 */
   }
   ```

### 0-3. エラークラスとロギング設定

**理由**: 全モジュールで使用するため最初に実装

1. カスタムエラークラス階層
2. ロギングフォーマットとレベル設定
3. 定数定義（API 制限値、メッセージ制限など）

## Phase 1: コア基盤の実装

### 1-1. 設定管理システム（依存：Phase 0）

**実装順序**:

1. YAML 設定ファイルの作成
2. ConfigManager クラス（YAML 読み込み）
3. ConfigService クラス（keyv 設定）
4. 設定バリデーション機能

**テスト方法**:

- 単体テストで設定の読み書きを確認
- 不正な設定でのエラーハンドリング確認

### 1-2. 基本的な Discord ボット（依存：1-1）

**実装順序**:

1. bot.ts（最小限の接続のみ）
2. ReadyHandler の基本実装
3. 環境変数の読み込みと検証
4. グレースフルシャットダウン

**テスト方法**:

- Discord への接続確認
- 設定読み込みの確認

### 1-3. メッセージサニタイゼーション（依存：Phase 0）

**実装順序**:

1. sanitizer.ts の実装
2. プレースホルダー定義
3. セキュリティテストケース作成

**テスト方法**:

- 各種メンションのサニタイゼーション確認
- プロンプトインジェクション対策の確認

### 1-4. 基本的なメッセージハンドリング（依存：1-2, 1-3）

**実装順序**:

1. MessageCreate ハンドラーの骨組み
2. ボット自身のメッセージ除外
3. 基本的なエラーハンドリング

## Phase 2: Function Calling 統合

### 2-1. Gemini API クライアント（依存：Phase 1）

**実装順序**:

1. モック GeminiService の作成
2. Function 宣言の定義
3. 実際の API 統合
4. エラーハンドリングとリトライ

**重要な考慮点**:

- Function Calling のスキーマ検証
- レート制限エラーの適切な処理
- タイムアウト処理

### 2-2. Brave Search 統合（依存：2-1）

**実装順序**:

1. SearchService インターフェース実装
2. API クライアントの実装
3. Function Calling 統合
4. 検索結果のフォーマット処理

**重要な考慮点**:

- 月間クォータの管理
- エラー時のフォールバック
- 検索結果のサニタイゼーション

### 2-3. レート制限管理（依存：2-1）

**実装順序**:

1. カウンター管理（keyv + TTL）
2. モデル切り替えロジック
3. 動的ツール管理（関数の有効/無効）
4. 使用量モニタリング

**重要な考慮点**:

- 並行リクエストの正確なカウント
- TTL の適切な設定
- バッファ（80%）での切り替え

### 2-4. レスポンス管理（依存：2-1, 2-3）

**実装順序**:

1. 文字数カウント関数の実装
2. Compress 戦略の実装
3. Split 戦略の実装
4. Discord API 制限の処理

### 2-5. 完全なメッセージ処理フロー（依存：2-1〜2-4）

**実装順序**:

1. メンション検出とレスポンス
2. チャンネル自動レスポンス
3. コンテキスト構築
4. プロンプト階層管理

## Phase 3: 高度な機能

### 3-1. スラッシュコマンドシステム（依存：Phase 2）

**実装順序**:

1. コマンド登録スクリプト
2. InteractionCreate ハンドラー
3. 各コマンドの実装:
   - /status: システム状態とレート制限
   - /config: 設定管理 UI
   - /search: 検索機能管理
   - /model: モデル情報と統計

### 3-2. ファイル処理（依存：Phase 2）

**実装順序**:

1. 画像添付の検出
2. Gemini File API の統合
3. ファイルサイズとタイプの検証
4. マルチモーダルレスポンス

### 3-3. 高度な設定管理（依存：3-1）

**実装順序**:

1. サーバー別設定
2. チャンネル別設定
3. 一時的プロンプト管理
4. 設定の優先順位システム

## Phase 4: 本番環境準備

### 4-1. Docker 化（依存：Phase 3 完了）

1. Dockerfile 作成
2. docker-compose 設定
3. 環境変数管理
4. ボリュームマウント設定

### 4-2. モニタリングとロギング（依存：4-1）

1. 構造化ログ出力
2. メトリクス収集
3. ヘルスチェックエンドポイント
4. アラート設定

### 4-3. デプロイメント（依存：4-2）

1. Coolify 設定
2. CI/CD パイプライン
3. ロールバック戦略
4. 本番環境テスト

## 実装時の重要な注意点

### ドキュメント確認の徹底

- [ ] 各フェーズ開始前に必ず関連ドキュメントを確認
- [ ] ライブラリのバージョンに対応したドキュメントを参照
- [ ] Breaking Changes や Deprecation の確認
- [ ] ベストプラクティスとアンチパターンの把握

### セキュリティ考慮事項

- [ ] API キーの環境変数管理
- [ ] 入力サニタイゼーションの徹底
- [ ] Function Calling レスポンスの検証
- [ ] ファイルアップロードの検証
- [ ] SQL インジェクション対策（keyv）

### パフォーマンス考慮事項

- [ ] 並行処理の適切な実装
- [ ] メモリリークの防止
- [ ] キャッシュ戦略
- [ ] データベース接続プーリング

### エラーハンドリング考慮事項

- [ ] 全ての外部 API 呼び出しにタイムアウト設定
- [ ] リトライロジックの実装
- [ ] フォールバック戦略
- [ ] ユーザーフレンドリーなエラーメッセージ

### テスト戦略

- [ ] 各フェーズ完了時の統合テスト
- [ ] モックを使った単体テスト
- [ ] エッジケースのテスト
- [ ] 負荷テスト

## 実装開始のチェックリスト

### 開始前の確認

- [x] .env ファイルの設定完了
- [x] 全依存関係のインストール確認
- [x] TypeScript 設定の確認
- [ ] 開発用 Discord サーバーの準備
- [ ] ボットの招待とテスト

### Phase 0 開始条件

- [x] 必須ドキュメントの確認完了
  - [x] TypeScript Handbook と Strict Mode
  - [x] Bun TypeScript サポート
- [x] 型定義の設計完了
- [x] インターフェース定義の合意
- [x] エラークラス階層の設計
- [x] ロギング方針の決定

## 完了したタスク

### Phase 0: 基礎設計と型定義 ✅

- ✅ 0-1. 型定義の作成（全 5 ファイル）
- ✅ 0-2. インターフェース定義（services.ts, handlers.ts）
- ✅ 0-3. エラークラスとロギング設定（errors.ts, logger.ts, constants.ts, sanitizer.ts）

### Phase 1: コア基盤の実装 ✅

- ✅ 1-1. 設定管理システム（YAML 設定ファイル、ConfigManager、ConfigService）
- ✅ 1-2. 基本的な Discord ボット（bot.ts、ReadyHandler）
- ✅ 1-3. メッセージサニタイゼーション（sanitizer.ts）
- ✅ 1-4. 基本的なメッセージハンドリング（MessageCreateHandler、MessageProcessor）

## 現在の状況 (最新更新: 2025 年 6 月 4 日)

### ✅ **完了フェーズ**: Phase 0-1 (基盤構築)

- **型定義**: 全 TypeScript 型とインターフェース定義完了
- **設定管理**: YAML + keyv 設定システム稼働
- **Discord 基盤**: bot.ts、メッセージハンドラー、sanitization 完了
- **ユーティリティ**: ロギング、エラー処理、定数管理完了

### 🚧 **次のフェーズ**: Phase 2 (Function Calling 統合) - **最優先**

- **未実装**: Gemini API client, Brave Search, rate limiting
- **現在**: messageCreate.ts:154 でダミーレスポンス
- **準備完了**: 全基盤コンポーネントが AI 統合に対応済み

### 📋 **Phase 2 優先タスク**

1. `src/services/gemini.ts` - Gemini API + Function Calling
2. `src/services/braveSearch.ts` - Brave Search API 統合
3. `src/services/rateLimit.ts` - レート制限・モデル切替
4. messageCreate.ts の AI 統合 (ダミー削除)
5. 実環境テスト (Discord サーバー + 全 API)

### ⚠️ **注意事項**

- Keyv SQLite 設定は動作中 (configService.ts:19-22 で正常設定済み)
- 型エラーなし、基本機能動作確認済み
- Phase 2 実装前に必ず公式ドキュメント確認必須

---

**進捗管理**: TodoWrite ツールで各タスクを追跡
**実装方針**: Phase 2 → Phase 3 (コマンド) → Phase 4 (本番デプロイ)
**軌道修正**: 計画通り進行中、大きな変更不要

---

# 詳細テスト戦略 - Phase 2 実装

## テスト駆動開発アプローチ

### 基本方針

1. **テストファースト**: 各機能実装前にテストケースを作成
2. **段階的テスト**: 単体 → 結合 → E2E の順序で実施
3. **継続的検証**: 各ステップ完了時に必ずテスト実行
4. **モック活用**: 外部 API 依存を排除したテスト設計

### テスト環境セットアップ

```bash
# テストフレームワークのインストール
bun add --dev @types/jest jest ts-jest
bun add --dev supertest @types/supertest  # HTTP API テスト用

# Jest設定 (jest.config.js)
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 }
  }
};
```

## Phase 2 詳細実装・テスト計画

### 2-1. Gemini API クライアント実装

#### Step 2-1-1: 基本インターフェース実装

**実装内容**: `src/services/gemini.ts` の骨組み作成

**単体テスト**: `tests/unit/services/gemini.test.ts`

```typescript
import { GeminiService } from "../../../src/services/gemini";
import { ConfigManager } from "../../../src/services/configManager";

describe("GeminiService", () => {
  let geminiService: GeminiService;
  let mockConfigManager: jest.Mocked<ConfigManager>;

  beforeEach(() => {
    mockConfigManager = {
      getSearchFunctionDeclaration: jest.fn(),
      getCharacterCountFunctionDeclaration: jest.fn(),
      getModelConfig: jest.fn(),
    } as any;

    geminiService = new GeminiService(mockConfigManager);
  });

  describe("constructor", () => {
    it("should initialize with config manager", () => {
      expect(geminiService).toBeInstanceOf(GeminiService);
    });

    it("should throw error without API key", () => {
      delete process.env.GEMINI_API_KEY;
      expect(() => new GeminiService(mockConfigManager)).toThrow(
        "GEMINI_API_KEY is not set"
      );
    });
  });

  describe("buildFunctionDeclarations", () => {
    it("should return character count function when search disabled", async () => {
      mockConfigManager.getCharacterCountFunctionDeclaration.mockReturnValue({
        functionDeclarations: [{ name: "count_characters" }],
      });

      const result = await geminiService.buildFunctionDeclarations(false);
      expect(result).toHaveLength(1);
      expect(result[0].functionDeclarations[0].name).toBe("count_characters");
    });

    it("should include search function when enabled", async () => {
      mockConfigManager.getSearchFunctionDeclaration.mockReturnValue({
        functionDeclarations: [{ name: "search_web" }],
      });
      mockConfigManager.getCharacterCountFunctionDeclaration.mockReturnValue({
        functionDeclarations: [{ name: "count_characters" }],
      });

      const result = await geminiService.buildFunctionDeclarations(true);
      expect(result).toHaveLength(2);
    });
  });
});
```

**テスト実行**: `bun test tests/unit/services/gemini.test.ts`

#### Step 2-1-2: Function Calling 実装

**実装内容**: Function Calling のコア機能

**単体テスト**: Function Calling レスポンス処理

```typescript
describe("generateContent", () => {
  it("should handle function calling response", async () => {
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              { functionCall: { name: "search_web", args: { query: "test" } } },
            ],
          },
        },
      ],
    };

    jest.spyOn(geminiService, "callGeminiAPI").mockResolvedValue(mockResponse);

    const result = await geminiService.generateContent(
      "test message",
      [],
      "gemini-2.0-flash"
    );

    expect(result.requiresFunctionCall).toBe(true);
    expect(result.functionCall?.name).toBe("search_web");
  });

  it("should handle text response without function call", async () => {
    const mockResponse = {
      candidates: [
        {
          content: { parts: [{ text: "Direct response" }] },
        },
      ],
    };

    jest.spyOn(geminiService, "callGeminiAPI").mockResolvedValue(mockResponse);

    const result = await geminiService.generateContent(
      "test message",
      [],
      "gemini-2.0-flash"
    );

    expect(result.requiresFunctionCall).toBe(false);
    expect(result.content).toBe("Direct response");
  });
});
```

#### Step 2-1-3: エラーハンドリング実装

**実装内容**: レート制限、タイムアウト等の処理

**単体テスト**: エラーハンドリング

```typescript
describe("error handling", () => {
  it("should handle rate limit error (429)", async () => {
    const rateLimitError = new Error("Rate limit exceeded");
    rateLimitError.status = 429;

    jest
      .spyOn(geminiService, "callGeminiAPI")
      .mockRejectedValue(rateLimitError);

    await expect(
      geminiService.generateContent("test", [], "gemini-2.0-flash")
    ).rejects.toThrow("Rate limit exceeded");
  });

  it("should handle timeout error", async () => {
    jest
      .spyOn(geminiService, "callGeminiAPI")
      .mockRejectedValue(new Error("Timeout"));

    await expect(
      geminiService.generateContent("test", [], "gemini-2.0-flash")
    ).rejects.toThrow("Timeout");
  });
});
```

#### Step 2-1-4: 結合テスト

**テスト内容**: 実際の Gemini API との統合（モック使用）

**結合テスト**: `tests/integration/gemini-integration.test.ts`

```typescript
import { GeminiService } from "../../src/services/gemini";
import { ConfigManager } from "../../src/services/configManager";

describe("Gemini Integration Tests", () => {
  let geminiService: GeminiService;
  let configManager: ConfigManager;

  beforeAll(async () => {
    // テスト用の設定ファイルを使用
    configManager = new ConfigManager("tests/fixtures/config");
    await configManager.loadConfig();

    geminiService = new GeminiService(configManager);
  });

  it("should generate response with mocked API", async () => {
    // APIレスポンスをモック
    const mockApiResponse = {
      candidates: [
        {
          content: { parts: [{ text: "Hello, this is a test response!" }] },
        },
      ],
    };

    jest
      .spyOn(geminiService, "callGeminiAPI")
      .mockResolvedValue(mockApiResponse);

    const result = await geminiService.generateContent(
      "Hello, how are you?",
      [],
      "gemini-2.0-flash"
    );

    expect(result.content).toBe("Hello, this is a test response!");
    expect(result.requiresFunctionCall).toBe(false);
  });

  it("should trigger function calling for search queries", async () => {
    const mockApiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: "search_web",
                  args: { query: "latest news", region: "JP" },
                },
              },
            ],
          },
        },
      ],
    };

    jest
      .spyOn(geminiService, "callGeminiAPI")
      .mockResolvedValue(mockApiResponse);

    const result = await geminiService.generateContent(
      "What is the latest news today?",
      [],
      "gemini-2.0-flash"
    );

    expect(result.requiresFunctionCall).toBe(true);
    expect(result.functionCall?.name).toBe("search_web");
    expect(result.functionCall?.args.query).toBe("latest news");
  });
});
```

### 2-2. Brave Search API 統合

#### Step 2-2-1: 基本 API クライアント実装

**実装内容**: `src/services/braveSearch.ts` の基本構造

**単体テスト**: `tests/unit/services/braveSearch.test.ts`

```typescript
import { BraveSearchService } from "../../../src/services/braveSearch";

describe("BraveSearchService", () => {
  let searchService: BraveSearchService;

  beforeEach(() => {
    process.env.BRAVE_SEARCH_API_KEY = "test-api-key";
    searchService = new BraveSearchService();
  });

  describe("constructor", () => {
    it("should initialize with API key", () => {
      expect(searchService).toBeInstanceOf(BraveSearchService);
    });

    it("should throw error without API key", () => {
      delete process.env.BRAVE_SEARCH_API_KEY;
      expect(() => new BraveSearchService()).toThrow(
        "BRAVE_SEARCH_API_KEY is not set"
      );
    });
  });

  describe("search", () => {
    it("should format search query correctly", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            web: {
              results: [
                {
                  title: "Test",
                  url: "http://test.com",
                  snippet: "Test snippet",
                },
              ],
            },
          }),
      });
      global.fetch = mockFetch;

      await searchService.search("test query", "JP");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("q=test%20query"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Subscription-Token": "test-api-key",
          }),
        })
      );
    });

    it("should handle search results correctly", async () => {
      const mockResults = {
        web: {
          results: [
            {
              title: "Test 1",
              url: "http://test1.com",
              snippet: "First result",
            },
            {
              title: "Test 2",
              url: "http://test2.com",
              snippet: "Second result",
            },
          ],
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResults),
      });

      const result = await searchService.search("test query");

      expect(result.results).toHaveLength(2);
      expect(result.results[0].title).toBe("Test 1");
      expect(result.query).toBe("test query");
    });
  });
});
```

#### Step 2-2-2: エラーハンドリング・レート制限

**実装内容**: API 制限とエラー処理

**単体テスト**: エラーハンドリング

```typescript
describe("error handling", () => {
  it("should handle API error responses", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });

    await expect(searchService.search("test query")).rejects.toThrow(
      "Brave Search API error: 429 Too Many Requests"
    );
  });

  it("should handle network errors", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    await expect(searchService.search("test query")).rejects.toThrow(
      "Network error"
    );
  });
});
```

### 2-3. Rate Limit Service 実装

#### Step 2-3-1: 基本レート制限実装

**実装内容**: `src/services/rateLimit.ts` の基本構造

**単体テスト**: `tests/unit/services/rateLimit.test.ts`

```typescript
import { RateLimitService } from "../../../src/services/rateLimit";
import { ConfigService } from "../../../src/services/config";

describe("RateLimitService", () => {
  let rateLimitService: RateLimitService;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      keyv: {
        get: jest.fn(),
        set: jest.fn(),
      },
    } as any;

    rateLimitService = new RateLimitService(mockConfigService);
  });

  describe("checkModelLimits", () => {
    it("should return true when under limits", async () => {
      mockConfigService.keyv.get.mockResolvedValue(5); // Current: 5 RPM

      const result = await rateLimitService.checkModelLimits(
        "gemini-2.0-flash",
        "rpm"
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it("should return false when at limit", async () => {
      mockConfigService.keyv.get.mockResolvedValue(15); // At RPM limit

      const result = await rateLimitService.checkModelLimits(
        "gemini-2.0-flash",
        "rpm"
      );

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe("updateCounters", () => {
    it("should increment counters correctly", async () => {
      mockConfigService.keyv.get.mockResolvedValue(5);
      mockConfigService.keyv.set.mockResolvedValue(true);

      await rateLimitService.updateCounters("gemini-2.0-flash", {
        promptTokens: 100,
        completionTokens: 50,
      });

      expect(mockConfigService.keyv.set).toHaveBeenCalledWith(
        expect.stringContaining("rpm"),
        6,
        60000 // 1 minute TTL
      );
    });
  });
});
```

#### Step 2-3-2: モデル切り替えロジック

**実装内容**: 自動フォールバック機能

**単体テスト**: モデル切り替え

```typescript
describe("getAvailableModel", () => {
  it("should return primary model when available", async () => {
    jest
      .spyOn(rateLimitService, "checkModelLimits")
      .mockResolvedValue({ allowed: true, remaining: 5 });

    const model = await rateLimitService.getAvailableModel();

    expect(model).toBe("gemini-2.5-flash-preview-0520");
  });

  it("should fallback to secondary model when primary limited", async () => {
    jest
      .spyOn(rateLimitService, "checkModelLimits")
      .mockResolvedValueOnce({ allowed: false, remaining: 0 }) // Primary
      .mockResolvedValueOnce({ allowed: true, remaining: 10 }); // Fallback

    const model = await rateLimitService.getAvailableModel();

    expect(model).toBe("gemini-2.0-flash");
  });

  it("should throw error when all models limited", async () => {
    jest
      .spyOn(rateLimitService, "checkModelLimits")
      .mockResolvedValue({ allowed: false, remaining: 0 });

    await expect(rateLimitService.getAvailableModel()).rejects.toThrow(
      "All models are rate limited"
    );
  });
});
```

### 2-4. 統合結合テスト

#### E2E テスト: 完全なメッセージフロー

**テスト内容**: Discord メッセージから AI 応答まで

**結合テスト**: `tests/integration/message-flow.test.ts`

```typescript
import { MessageCreateHandler } from "../../src/handlers/messageCreate";
import { GeminiService } from "../../src/services/gemini";
import { BraveSearchService } from "../../src/services/braveSearch";
import { RateLimitService } from "../../src/services/rateLimit";

describe("Complete Message Flow Integration", () => {
  let handler: MessageCreateHandler;
  let mockMessage: any;

  beforeEach(() => {
    // モックメッセージオブジェクト作成
    mockMessage = {
      content: "What is the weather today?",
      author: { bot: false, id: "user123" },
      guild: { id: "guild123" },
      channel: { id: "channel123", sendTyping: jest.fn() },
      mentions: { users: new Map([["bot123", {}]]) },
      reply: jest.fn(),
    };

    handler = new MessageCreateHandler();
  });

  it("should process message with search function call", async () => {
    // Gemini が検索を要求するレスポンスをモック
    const mockGeminiResponse = {
      requiresFunctionCall: true,
      functionCall: { name: "search_web", args: { query: "weather today" } },
    };

    // 検索結果をモック
    const mockSearchResults = {
      query: "weather today",
      results: [{ title: "Weather", snippet: "Sunny 25°C" }],
    };

    // 最終的なGeminiレスポンスをモック
    const mockFinalResponse = {
      requiresFunctionCall: false,
      content: "今日の天気は晴れで25度です。",
    };

    jest
      .spyOn(GeminiService.prototype, "generateContent")
      .mockResolvedValueOnce(mockGeminiResponse)
      .mockResolvedValueOnce(mockFinalResponse);

    jest
      .spyOn(BraveSearchService.prototype, "search")
      .mockResolvedValue(mockSearchResults);

    jest
      .spyOn(RateLimitService.prototype, "getAvailableModel")
      .mockResolvedValue("gemini-2.0-flash");

    await handler.execute({} as any, mockMessage);

    expect(mockMessage.reply).toHaveBeenCalledWith({
      content: "今日の天気は晴れで25度です。",
      allowedMentions: { repliedUser: true },
    });
  });

  it("should handle rate limit fallback", async () => {
    jest
      .spyOn(RateLimitService.prototype, "getAvailableModel")
      .mockRejectedValue(new Error("All models are rate limited"));

    await handler.execute({} as any, mockMessage);

    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.stringContaining("現在利用量が上限に達しています")
    );
  });
});
```

## テスト実行スケジュール

### 各ステップでの必須テスト

1. **実装前**: 該当単体テストを作成し、fail することを確認
2. **実装中**: テストが pass するまで実装を継続
3. **実装後**: 結合テストを実行し、他機能への影響確認
4. **統合前**: 全テストスイートを実行し、品質確認

### 継続的テスト実行

```bash
# 監視モードでテスト実行
bun test --watch

# カバレッジ付きテスト実行
bun test --coverage

# 特定のテストファイルのみ実行
bun test tests/unit/services/gemini.test.ts

# 結合テストのみ実行
bun test tests/integration/
```

### テスト品質基準

- **単体テスト**: カバレッジ 80% 以上
- **結合テスト**: 主要フロー 100% カバー
- **E2E テスト**: ユーザーシナリオ 100% カバー
- **実行時間**: 全テスト 30 秒以内

この詳細なテスト戦略により、各実装ステップで確実に品質を確保しながら進めることができます。
