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
   - [Message Content Intent](https://support-dev.discord.com/hc/en-us/articles/4404772028055-Message-Content-Intent-FAQ)

2. **YAML ライブラリ**
   - [yaml npm package](https://www.npmjs.com/package/yaml)
   - [YAML Spec](https://yaml.org/spec/1.2.2/)

3. **keyv ドキュメント**
   - [keyv Documentation](https://github.com/jaredwray/keyv)
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
   - [API Documentation](https://api.search.brave.com/app/documentation/web-search/get-started)
   - [Authentication](https://api.search.brave.com/app/documentation/web-search/authentication)
   - [Rate Limits and Pricing](https://brave.com/search/api/)
   - [Response Format](https://api.search.brave.com/app/documentation/web-search/responses)

3. **@google/genai ライブラリ**
   - [NPM Documentation](https://www.npmjs.com/package/@google/genai)
   - [GitHub Repository](https://github.com/google/generative-ai-js)
   - [TypeScript Types](https://github.com/google/generative-ai-js/tree/main/types)

### Phase 3 実装前に確認すべきドキュメント

1. **Discord Slash Commands**
   - [Slash Commands Guide](https://discordjs.guide/slash-commands/registering-slash-commands.html)
   - [Interaction Handling](https://discordjs.guide/slash-commands/handling-interactions.html)
   - [Command Options](https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-structure)

2. **File Handling**
   - [Discord.js Attachments](https://discord.js.org/docs/packages/discord.js/14.19.3/Attachment:Class)
   - [Gemini File API](https://ai.google.dev/gemini-api/docs/vision#upload-image)

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

- [ ] 必須ドキュメントの確認完了
  - [ ] TypeScript Handbook と Strict Mode
  - [ ] Bun TypeScript サポート
- [ ] 型定義の設計完了
- [ ] インターフェース定義の合意
- [ ] エラークラス階層の設計
- [ ] ロギング方針の決定

## 次のステップ

1. **Phase 0 の実装開始**: 型定義とインターフェースから始める
2. **設定ファイルの作成**: bot-config.yaml のテンプレート作成
3. **開発環境の最終確認**: Discord ボットの接続テスト

この計画に従って実装を進めることで、手戻りを最小限に抑えながら、堅牢なシステムを構築できます。
