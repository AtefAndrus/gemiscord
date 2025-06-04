# Gemini Discord Bot 仕様書 v5.0

## 概要

Discord で Gemini API (Function Calling) + Brave Search API を統合した AI ボット

## 技術スタック

**Runtime**: Bun 1.2.15 + TypeScript strict
**Discord**: discord.js v14.19.3
**AI**: @google/genai (Function Calling), Brave Search API
**Storage**: YAML (static config) + keyv/sqlite (dynamic config)
**Deploy**: Coolify (Docker)

## 実装状況

**✅ Phase 0-1 完了**: TypeScript 型定義、Discord 基盤、設定管理、メッセージ処理
**🚧 Phase 2 次**: Gemini API、Brave Search、Function Calling、レート制限
**⏳ Phase 3-4**: コマンド、ファイル処理、本番デプロイ

## 動作仕様

**応答モード**: `@bot メッセージ` + 指定チャンネル自動応答
**Function Calling**: Gemini が検索必要性を自動判断、シームレス統合
**レート制限**: gemini-2.5-flash (10 RPM) → gemini-2.0-flash 自動切替
**検索制限**: Brave Search 月 2,000 クエリ無料、超過時は検索無効化

## メッセージ処理

**セキュリティ**: `<@123>` → `[ユーザー]` プレースホルダ化 (実装済)
**文字制限**: 圧縮モード (2000 文字以内) / 分割モード (複数メッセージ)
**プロンプト階層**: YAML ベース + サーバー/チャンネル別カスタム
**ファイル対応**: Phase 3 で画像処理予定

## API 制限

| Model                         | RPM | TPM  | RPD  | Status         |
| ----------------------------- | --- | ---- | ---- | -------------- |
| gemini-2.5-flash-preview-0520 | 10  | 250K | 500  | 優先           |
| gemini-2.0-flash              | 15  | 1M   | 1500 | フォールバック |

**Brave Search**: 月 2,000 クエリ無料、$3/1,000 追加
**制御**: keyv + TTL でローカル追跡、80%到達で自動モデル切替

## 予定機能 (Phase 3+)

**スラッシュコマンド**: `/status`, `/config`, `/search`, `/model`
**ファイル処理**: 画像、文書対応 (Gemini File API)
**高度設定**: サーバー/チャンネル別プロンプト
