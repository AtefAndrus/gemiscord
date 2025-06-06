# Gemini Discord Bot 仕様書 v6.0

## 概要

Discord で Gemini API (Function Calling) + Brave Search API を統合した AI ボット

## 実装状況

### ✅ Phase 0-1 完了 (2025 年 6 月)

- **TypeScript 型定義**: 全型とインターフェース完備
- **設定システム**: YAML + keyv/SQLite デュアル構成
- **Discord 基盤**: bot.ts, handlers, message 処理
- **セキュリティ**: メッセージサニタイゼーション実装
- **ログ・エラー**: 構造化ログ, カスタムエラークラス, ファイルログ出力機能
- **テスト**: 単体・統合テスト完備 (80%+ カバレッジ)

### ✅ Phase 2 完了 (2025 年 6 月)

- **Gemini API クライアント**: Function Calling 完全実装
- **Brave Search API**: 統合・クォータ管理実装済み
- **レート制限**: 自動モデル切替システム実装済み
- **AI 応答統合**: messageCreate.ts で完全な AI 応答フロー実装済み

### ✅ Phase 3 完了 (スラッシュコマンド)

- `/status` - ボット状態・稼働時間・API 使用量統計
- `/config` - ギルド設定管理 (5 サブコマンド)
- `/search` - 検索機能管理・クォータ監視 (3 サブコマンド)
- `/model` - AI モデル情報・使用統計・レート制限 (3 サブコマンド)

**技術実績:**

- 146/146 テスト合格 (100% 成功率)
- 77.85% テストカバレッジ (80% 目標に近い)
- 管理者限定セキュリティ実装
- Discord.js v14 完全統合

### ✅ ファイルログ機能 完成 (2025 年 6 月)

- **スマートファイルログ**: 日次ローテーション、自動クリーンアップ
- **非同期バッファリング**: パフォーマンス最適化されたファイル書き込み
- **エラーファイル分離**: エラーログの別ファイル出力機能
- **JSON フォーマット**: 構造化ログ解析サポート
- **設定ベース制御**: YAML 設定で簡単カスタマイズ

**ファイルログ仕様**:

```yaml
# config/bot-config.yaml
logging:
  file:
    enabled: true
    level: "INFO" # ログレベル制御
    directory: "logs" # ログディレクトリ
    filename_pattern: "gemiscord-{date}.log"
    max_files: 30 # 保存日数
    separate_error_file: true # エラーファイル分離
    json_format: false # JSON形式出力
  rotation:
    daily: true # 日次ローテーション
    max_size: "50MB" # ファイルサイズ制限
    cleanup_old: true # 古いファイル自動削除
  performance:
    buffer_size: 8192 # バッファサイズ
    flush_interval: 5000 # フラッシュ間隔(ms)
```

**テスト結果**: 22 テスト全合格 (100%成功率)

### ⏳ Phase 4 計画 (本番環境)

- ファイル処理 (画像対応)
- Docker 化・本番デプロイ
- 監視システム (ファイルログ集約システムは完成済み)

## 技術スタック

| 分野    | 技術                | バージョン     | 状態 |
| ------- | ------------------- | -------------- | ---- |
| Runtime | Bun + TypeScript    | 1.2.15, strict | ✅   |
| Discord | discord.js          | v14.19.3       | ✅   |
| AI      | @google/genai       | ^1.3.0         | ✅   |
| Search  | Brave Search API    | v1             | ✅   |
| Storage | keyv + @keyv/sqlite | latest         | ✅   |
| Test    | Bun native runner   | built-in       | ✅   |
| Deploy  | Docker (Coolify)    | -              | ⏳   |

## 設定システム仕様

### 実装済み設定アーキテクチャ

```typescript
// YAML静的設定 (config/bot-config.yaml)
interface YAMLConfig {
  prompts: { system: string; ... };
  function_calling: { search_web: {...}, count_characters: {...} };
  response_handling: { strategies: {...} };
  models: { [model: string]: ModelConfig };
  cache: { ttl_minutes: {...} };
}

// 動的設定 (keyv/SQLite)
interface GuildConfig {
  mention_enabled: boolean;      // @bot応答有効/無効
  response_channels: string[];   // 自動応答チャンネルID
  search_enabled: boolean;       // 検索機能有効/無効
  server_prompt?: string;        // サーバー専用プロンプト
  message_limit_strategy: 'compress' | 'split';
}

interface ChannelConfig {
  channel_prompt?: string;       // チャンネル専用プロンプト
}
```

### 設定テスト状況

- ✅ ConfigManager: YAML 読み込み・バリデーション
- ✅ ConfigService: keyv 動的設定 CRUD
- ✅ 統合テスト: 設定階層管理
- ✅ エラーハンドリング: 不正設定検証

## メッセージ処理仕様

### 実装済みセキュリティ

```typescript
// サニタイゼーション (sanitizer.ts)
<@123456789> → [ユーザー]
<@&456789123> → [ロール]
<#789123456> → [チャンネル]
@here/@everyone → [メンション]
```

### 処理フロー設計

```typescript
// Phase 2で実装予定
1. メッセージ受信 → サニタイゼーション ✅
2. 設定確認 (mention/channel判定) ✅
3. プロンプト構築 (階層マージ)
4. Gemini API呼び出し + Function Calling
5. 検索実行 (必要時)
6. レスポンス処理 (圧縮/分割)
7. Discord送信
```

## AI 統合仕様 (Phase 2 実装予定)

### Function Calling 設計

```yaml
# YAML定義済み (実装準備完了)
search_web:
  name: "search_web"
  description: "Webで最新情報を検索"
  parameters:
    query: string (required)
    region: string (default: "JP")

count_characters:
  name: "count_characters"
  description: "文字数をカウント"
  parameters:
    text: string (required)
```

### レート制限仕様

| モデル                        | RPM | TPM  | RPD  | 実装状態          |
| ----------------------------- | --- | ---- | ---- | ----------------- |
| gemini-2.5-flash-preview-0520 | 10  | 250K | 500  | 🔜 優先           |
| gemini-2.0-flash              | 15  | 1M   | 1500 | 🔜 フォールバック |

- **制御**: keyv TTL カウンター
- **切替**: 80%到達で自動フォールバック
- **監視**: 使用量統計・アラート

### 検索制限仕様

- **Brave Search**: 月 2,000 クエリ無料
- **超過処理**: 検索無効化, テキスト応答のみ
- **管理**: 月別使用量追跡 (keyv)

## レスポンス処理仕様

### 文字制限対応 (Phase 2 実装予定)

```typescript
// Discord 2000文字制限
strategy: "compress" | "split";

// 圧縮モード: 要約して1メッセージ
// 分割モード: 複数メッセージに分割送信
```

### 応答トリガー

1. **メンション応答**: `@bot メッセージ`
2. **チャンネル応答**: 設定済みチャンネル全メッセージ
3. **設定制御**: guild 別/channel 別有効/無効

## テスト仕様

### 実装済みテストカバレッジ

```bash
tests/
├── unit/
│   ├── services/
│   │   ├── config.test.ts         ✅ 80%+
│   │   └── configManager.test.ts  ✅ 80%+
│   └── utils/
│       ├── logger.test.ts         ✅ 80%+
│       └── sanitizer.test.ts      ✅ 80%+
├── integration/
│   └── config-integration.test.ts ✅ 主要フロー
└── fixtures/                     ✅ テストデータ
```

### テスト品質基準

- **単体テスト**: 80%+ カバレッジ
- **統合テスト**: 主要フロー 100%
- **モック**: 外部依存完全分離
- **CI**: 自動テスト実行

## Phase 2 実装準備状況

### 準備完了項目

✅ 型定義 (gemini.types.ts, search.types.ts)
✅ 設定システム (Function 宣言定義済み)
✅ エラーハンドリング (カスタムエラークラス)
✅ テストフレームワーク (Jest 設定完了)
✅ ログシステム (構造化ログ)

### 実装必要項目

🔜 src/services/gemini.ts
🔜 src/services/braveSearch.ts
🔜 src/services/rateLimit.ts
🔜 messageCreate.ts AI 統合 (L154)

### 開発ガイドライン

- 📋 IMPLEMENTATION_PLAN.md: 詳細手順
- 📝 CLAUDE.md: 実装ガイドライン
- 🧪 TDD: テストファースト開発
- 📖 API Docs: 公式ドキュメント必須確認
