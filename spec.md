# Gemini Discord Bot 最終仕様書 v4.0

## 🎯 プロジェクト概要

Gemini APIのFunction Calling機能とBrave Search APIを統合し、Discordで高度な会話と検索機能を提供するボット。プレースホルダベースの安全な処理と柔軟な応答管理を特徴とする。

## 🏗️ 技術スタック

### **ランタイム・言語**
- **Bun 1.2.15**: 最新安定版JavaScript/TypeScriptランタイム
- **TypeScript**: 型安全性とコード品質確保（strict mode）

### **主要ライブラリ**
- **discord.js 14.19.3**: Discord API操作
- **@google/genai**: Gemini API統合（Function Calling対応）
- **keyv + @keyv/sqlite**: 動的設定・使用量管理
- **yaml**: 設定ファイル管理

### **デプロイ環境**
- **Coolify**: オープンソースPaaS（Docker）

## 🤖 ボット動作仕様

### **応答モード**
1. **メンション応答**
   - `@botname メッセージ` 形式で応答
   - 全サーバー・全チャンネルで有効
   - サーバー別でON/OFF切り替え可能

2. **特定チャンネル応答**
   - 指定チャンネルでの全発言（Bot以外）に応答
   - チャンネル単位で個別設定可能
   - サーバー管理者が追加/削除可能

### **応答除外条件**
- Bot自身の発言は無視
- 他のBotの発言は無視

## 🔍 検索機能（Function Calling + Brave Search API）

### **技術概要**
- **Function Calling統合**: Gemini APIが検索必要性を自動判断
- **シームレス検索**: 検索結果が自然に応答に統合
- **高精度判定**: モデルの文脈理解力で最適な検索実行
- **コスト効率**: 月2,000クエリ無料、追加$3/1,000クエリ
- **動的制御**: レートリミット時は検索機能を自動無効化

### **対応モデル（Function Calling必須）**
- **gemini-2.5-flash-preview-0520**: 優先モデル（10 RPM, 250K TPM, 500 RPD）
- **gemini-2.0-flash**: フォールバックモデル（15 RPM, 1M TPM, 1,500 RPD）

### **検索関数仕様**
- **検索実行**: `search_web` - 最新情報やリアルタイムデータ取得
- **文字数管理**: `count_characters` - Discord 2000文字制限チェック
- **適応制御**: レートリミット状況に応じた機能有効/無効切り替え

## 💬 メッセージ処理システム

### **セキュリティ処理（プレースホルダ化）**
- **ユーザーメンション**: `<@123456789>` → `[ユーザー]`
- **チャンネルメンション**: `<#123456789>` → `[チャンネル]`
- **ロールメンション**: `<@&123456789>` → `[ロール]`
- **カスタム絵文字**: `<:name:123456789>` → `:name:`
- **プロンプトインジェクション対策**: 悪意あるパターンの検知

### **応答長制御システム**
#### **デフォルト動作: 圧縮モード**
- **制限**: 2000文字以内での応答生成
- **指示**: Geminiに「2000文字以内で簡潔に応答してください」を自動付与
- **利点**: 単一メッセージでの完結した応答

#### **設定変更: 分割モード**
- **分割送信**: 2000文字超過時の複数メッセージ分割
- **優先設定**: 改行位置での分割を優先（1900文字制限でバッファ確保）
- **設定**: サーバー管理者が`/config response split`で変更可能

### **添付ファイル処理**
#### **Phase 1: 画像対応**
- **対応形式**: JPG, PNG, GIF, WebP
- **制限**: 最大3000ファイル/リクエスト（Gemini制限）
- **処理**: discord.js attachments → Gemini File API

#### **Phase 2以降: 拡張対応**
- **文書**: PDF, TXT, MD, CSV（File API経由）
- **動画**: MP4, MOV, AVI, WebM（最大2GB）
- **音声**: MP3, WAV, FLAC, AAC

## 🎯 プロンプト管理システム

### **階層構造**
1. **固定ベースプロンプト**: YAML設定ファイルで管理
2. **サーバー別カスタム**: 管理者が設定可能
3. **チャンネル別カスタム**: チャンネル固有の指示
4. **一時的指示**: 特定応答向けの動的指示

### **設定ファイル管理**
- **メイン設定**: `config/bot-config.yaml`
- **環境別設定**: `bot-config.dev.yaml`, `bot-config.prod.yaml`
- **Hot Reload**: 実行時設定変更対応
- **バージョン管理**: Git管理による変更履歴

## ⚡ レートリミット管理

### **対象API制限値**

#### **Gemini API（Freeティア）**
| Model | RPM | TPM | RPD | Function Calling |
|-------|-----|-----|-----|------------------|
| gemini-2.5-flash-preview-0520 | 10 | 250K | 500 | ✅ |
| gemini-2.0-flash | 15 | 1M | 1,500 | ✅ |

#### **Brave Search API**
- **無料プラン**: 月2,000クエリ、1秒1クエリ
- **有料プラン**: $3/1,000クエリ

### **制御機能**
- **ローカル管理**: keyv + TTLでリアルタイム追跡
- **自動切り替え**: 制限到達時のモデル自動切り替え
- **動的機能制御**: 検索制限時は検索関数を無効化
- **バッファ制御**: 80%到達で事前警告
- **エラーハンドリング**: 429エラーの適切な処理

## 🔧 スラッシュコマンド仕様

### **`/status`**
ボットとAPI使用状況の確認
- ボット稼働状況
- 現在使用モデル
- レートリミット使用状況（RPM/TPM/RPD）
- 検索機能使用量
- Function Calling対応状況

### **`/config mention`**
メンション応答の設定
- `enabled`: true/false（メンション応答有効/無効）

### **`/config channel`**
チャンネル別応答設定
- `add`: 応答チャンネル追加
- `remove`: 応答チャンネル削除
- `list`: 現在の応答チャンネル一覧

### **`/config response`**
応答制御設定
- `compress`: デフォルト圧縮モード（2000文字以内）
- `split`: 分割送信モード（複数メッセージ）
- `status`: 現在の設定確認

### **`/config prompt`**
プロンプト管理
- `server set`: サーバー別カスタムプロンプト設定
- `channel set`: チャンネル別カスタムプロンプト設定
- `server show`: サーバープロンプト表示
- `channel show`: チャンネルプロンプト表示
- `reset`: プロンプトリセット

### **`/search`**
検索機能管理
- `config`: 検索機能有効/無効設定
- `status`: 検索使用状況確認
- `test`: 検索機能テスト実行

### **`/model`**
モデル情報管理
- `status`: 現在のモデル状況
- `switch`: 手動モデル切り替え（緊急時）
- `stats`: 使用統計確認

## 📊 設定管理アーキテクチャ

### **3層構成**

#### **1. 静的設定（YAML）**
```yaml
# config/bot-config.yaml
prompts:
  base_system: "固定ベースプロンプト"
  sample_prompts:
    tech_community: "技術者コミュニティ向け"
    gaming_community: "ゲームコミュニティ向け"

response_handling:
  message_limit_strategy: "compress"  # compress | split
  max_characters: 2000
  compress_instruction: "2000文字以内で簡潔に応答してください"

message_processing:
  mention_placeholder:
    user: "[ユーザー]"
    channel: "[チャンネル]"
    role: "[ロール]"

function_calling:
  search_function:
    name: "search_web"
    description: "最新情報検索"
  
  character_count_function:
    name: "count_characters"
    description: "文字数カウント"

api:
  gemini:
    models:
      primary: "gemini-2.5-flash-preview-0520"
      fallback: "gemini-2.0-flash"
```

#### **2. 動的設定（keyv）**
```typescript
// サーバー別設定
'guild:{guildId}:mention_enabled': boolean
'guild:{guildId}:response_channels': string[]
'guild:{guildId}:search_enabled': boolean
'guild:{guildId}:server_prompt': string
'guild:{guildId}:message_limit_strategy': 'compress' | 'split'

// チャンネル別設定
'channel:{channelId}:channel_prompt': string

// 使用量追跡（TTL付き）
'ratelimit:{model}:rpm:{minute}': number
'search:monthly_usage:{month}': number
```

#### **3. 環境設定（.env）**
```env
DISCORD_TOKEN=your_discord_token
GEMINI_API_KEY=your_gemini_key
BRAVE_SEARCH_API_KEY=your_brave_search_key
NODE_ENV=development
DATABASE_URL=sqlite://config/bot.sqlite
```

## 🛡️ エラーハンドリング戦略

### **API制限対応**
- **429 Too Many Requests**: 自動モデル切り替え + 機能無効化
- **Function Calling失敗**: 通常モード応答へフォールバック
- **検索API障害**: 検索なし応答で継続
- **全API障害**: 適切なエラーメッセージ送信

### **Discord制限対応**
- **メッセージ長制限**: 圧縮/分割モード対応
- **レート制限**: Discord API制限の遵守
- **権限エラー**: 適切な権限エラー通知

### **添付ファイル対応**
- **サイズ制限**: Gemini API制限に応じた処理
- **形式制限**: 対応形式外ファイルの適切な通知
- **処理エラー**: ファイル処理失敗時のフォールバック

## 📁 プロジェクト構造

```
gemini-discord-bot/
├── src/
│   ├── bot.ts                    # メインエントリーポイント
│   ├── commands/                 # スラッシュコマンド
│   ├── handlers/                 # Discord イベントハンドラー
│   ├── services/                 # 外部サービス統合
│   │   ├── configManager.ts      # YAML設定ファイル管理
│   │   ├── config.ts             # keyv動的設定管理
│   │   ├── gemini.ts             # Gemini API + Function Calling
│   │   ├── braveSearch.ts        # Brave Search API
│   │   ├── rateLimit.ts          # レートリミット管理
│   │   ├── messageProcessor.ts   # メッセージ処理
│   │   ├── responseManager.ts    # 応答制御（圧縮/分割）
│   │   └── fileProcessor.ts      # ファイル添付処理
│   ├── types/                    # TypeScript型定義
│   └── utils/                    # ユーティリティ
├── config/                       # 設定ファイル
│   ├── bot-config.yaml          # メイン設定
│   ├── bot-config.dev.yaml      # 開発環境用
│   ├── bot-config.prod.yaml     # 本番環境用
│   └── bot.sqlite               # データベース
└── docs/                         # ドキュメント
    ├── SPEC.md                  # この仕様書
    └── CLAUDE.md                # Claude Code用実装ガイド
```

## 🚀 開発フェーズ

### **Phase 1: 基盤構築**
- [x] 技術スタック確認・検証
- [ ] Bun 1.2.15プロジェクト初期化
- [ ] 基本Discord接続実装
- [ ] YAML設定管理システム実装
- [ ] keyv設定管理システム実装
- [ ] プレースホルダベース処理実装

### **Phase 2: Function Calling統合**
- [ ] Gemini API Function Calling実装
- [ ] Brave Search API統合
- [ ] 文字数カウント関数実装
- [ ] 基本メッセージ処理実装
- [ ] エラーハンドリング基盤
- [ ] メンション応答実装

### **Phase 3: 高度な機能**
- [ ] スラッシュコマンド全機能実装
- [ ] レートリミット管理システム
- [ ] 動的機能制御システム
- [ ] 応答制御システム（圧縮/分割）
- [ ] 画像添付処理実装
- [ ] プロンプト階層管理
- [ ] 使用量監視・アラート

### **Phase 4: 本番準備**
- [ ] 包括的テスト実施
- [ ] Dockerfile作成
- [ ] Coolifyデプロイ設定
- [ ] 本番環境監視設定
- [ ] 文書・動画ファイル対応

## 📊 品質・パフォーマンス要件

### **応答時間**
- メッセージ応答: 5秒以内（検索含む）
- スラッシュコマンド: 3秒以内
- 設定変更: 1秒以内

### **可用性**
- 24時間連続稼働
- 自動復旧機能
- グレースフル・シャットダウン

### **拡張性**
- 複数サーバー対応（1000+）
- 同時接続ユーザー対応
- 将来的なモデル追加対応
- 設定ファイル拡張対応

## 🔗 参考URL・技術リソース

### **Gemini API**
- [Function Calling Guide](https://ai.google.dev/gemini-api/docs/function-calling)
- [File API Documentation](https://ai.google.dev/api/files)
- [Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)

### **Discord API**
- [discord.js Documentation](https://discord.js.org/docs/packages/discord.js/main)
- [Message Splitting Best Practices](https://discordjs.guide/popular-topics/common-questions.html#how-do-i-send-a-message-to-a-specific-channel)

### **技術スタック**
- [Bun 1.2.15 Documentation](https://bun.sh/)
- [keyv Documentation](https://github.com/jaredwray/keyv)
- [YAML Documentation](https://yaml.org/)

### **デプロイ・運用**
- [Coolify Documentation](https://coolify.io/docs/)

---

**最終更新**: 2025年6月3日  
**バージョン**: 4.0  
**承認**: 設計完了・実装準備完了