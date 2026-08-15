# 設計書 Ver 5.0 と実装の差分監査

対象コミット: `1c0b0e5`（`chore: add vercel.json to force deployment trigger`）
対象設計書: 「Libertas Jyotish 全自動SNSショート動画生成・多言語マルチ配信システム 完全詳細設計書 Ver 5.0」

## サマリ

現状は **型定義と制御フローの骨組みのみ**。外部 API 呼び出しと Google Sheets の読み書きは
すべて stub（空配列 / 空文字 / `console.log`）で、パイプラインは 1 本も動作しない。
ソース総量は約 490 行。

| レイヤー | 状態 |
| --- | --- |
| ドメイン型定義（Channels / Content_Queue / Script_Outputs / Render_Outputs） | 実装済み |
| API Routes の制御フロー（4 本） | 実装済み |
| Google Sheets 読み書き（9 メソッド） | **全て stub** |
| Gemini 原稿生成 | **stub**（空文字を返す） |
| Creatomate レンダリング | **stub**（ダミー render_id を返す） |
| YouTube / TikTok / Instagram 投稿 | **stub**（`console.log` のみ、各 11 行） |
| Vercel Cron 設定 | **未定義** |

## A. 未実装（設計書に記載があるもの）

| # | 項目 | 該当箇所 |
| --- | --- | --- |
| A-1 | Google Sheets の実 I/O。`getPendingScripts()` は `[]`、`getChannelConfig()` は `null` を返すため、**全 cron が 0 件処理で正常終了する** | `src/services/sheets.ts:78-118` |
| A-2 | Gemini API 呼び出し。`GoogleGenAI` を初期化するのみで `generateScript()` は空文字を返す | `src/services/gemini.ts:41-63` |
| A-3 | Creatomate REST API 呼び出し。`triggerRender()` は POST せずダミー ID を返す | `src/services/createmate.ts:25-35` |
| A-4 | YouTube Data API v3 / TikTok Content Posting API / Instagram Graph API の実装 | `src/services/{youtube,tiktok,instagram}.ts` |
| A-5 | `vercel.json` に `crons` 定義がなく、**スケジュール実行が一切設定されていない** | `vercel.json` |
| A-6 | 65 秒動画の 61〜68 秒バリデーション（TTS 速度調整） | `src/services/createmate.ts` |
| A-7 | 失敗時の自動リトライと Slack Webhook アラート | `daily-dispatch/route.ts:45`（コメントのみ） |
| A-8 | `transit_reference` の動的取得。`"Sun transit in Leo"` がハードコード | `weekly-generate/route.ts:29` |
| A-9 | `Render_Outputs` から実動画 URL を取得する処理。`stub_url_20s_${task_id}` を投稿しようとしている | `daily-dispatch/route.ts:28,34,40` |
| A-10 | チャンネル別 Creatomate テンプレート ID の取得。文字列リテラル `'creatomate_template_20s'` を渡している | `render-batch/route.ts:31,46` |
| A-11 | `scheduled_post_time` による配信時刻のフィルタリング。現状は Rendered 済みを無条件で全件投稿する | `daily-dispatch/route.ts:19` |
| A-12 | 18 アカウント分の OAuth トークン取得・更新フロー | 全体 |

## B. 設計書と実装の食い違い

| # | 設計書 v5 | 実装 |
| --- | --- | --- |
| B-1 | サービス名は **Creatomate** | コードは `createmate` 表記（ファイル名、クラス名、環境変数 `CREATEMATE_API_KEY`、webhook パス `/api/webhook/createmate`）。**Creatomate 公式の綴りと異なるため要統一** |
| B-2 | エンドポイント名は `/api/cron/generate-scripts`, `/api/cron/render-videos`, `/api/cron/post-sns` | 実装は `weekly-generate`, `render-batch`, `daily-dispatch` |
| B-3 | Gemini モデルは `gemini-2.5-flash` | モデル指定なし（`generateScript()` が未実装のため） |
| B-4 | Sheets のシートは Channels / Content_Queue / Script_Outputs / Render_Outputs の 4 つ | `getWeeklyTransits()` が参照する `Weekly_Transits` が追加で必要 |
| B-5 | Instagram Reels は「Container 経由」で投稿 | メソッドは `uploadVideo()` 1 段のみ。Container 作成 → publish の 2 段構成が必要 |
| B-6 | 「Jules 開発指示書」として Jules 向けに記述 | 開発は Devin に移管。設計書からは Jules 前提の記述を削除済み |
| B-7 | 週 96 セット生成 / 実配信 72 本 | バッチ分割やレート制御の実装がなく、1 回の実行に 300 秒（`maxDuration`）しかない |

## C. 運用・インフラ上の課題

| # | 内容 |
| --- | --- |
| C-1 | **Cron エンドポイントが無認可**。`GET /api/cron/*` は誰でも叩ける。`CRON_SECRET` による `Authorization` ヘッダ検証が必要 |
| C-2 | **Vercel Hobby プランの Cron は 1 日 1 回・最大 2 ジョブ**。設計書の週 7 スロット構成には Pro プランが必要 |
| C-3 | `maxDuration = 300` は Vercel Pro 以上の上限。Hobby は 60 秒（Fluid Compute で 300 秒）。96 セットの Gemini 生成を 1 リクエストで完了させるのは非現実的で、キュー分割かバックグラウンド処理が必要 |
| C-4 | Creatomate webhook に署名検証がなく、外部から任意の `task_id` を `Rendered` にできる |
| C-5 | `package.json` の `name` が `temp-app` のまま |
| C-6 | `axios` が依存に入っているが未使用（`fetch` を使う想定なら削除可） |
| C-7 | Sheets への同時書き込みに対する競合制御・API クォータ対策がない（週 96 タスク × 複数更新） |
| C-8 | テストが一切ない（`jest`/`vitest` 未導入） |
| C-9 | 例外時に `error.message` をそのまま HTTP レスポンスに返しており、内部情報が漏れうる |

## D. 型・コード品質

| # | 内容 | 該当箇所 |
| --- | --- | --- |
| D-1 | `metadata: any` / `renderOutput: any` / `catch (error: any)` が多用されている | 各サービス、各 route |
| D-2 | 各 SNS サービスに `publishXxx()` と `uploadVideo()` の 2 系統メソッドがあり、`uploadVideo()` しか使われていない。インターフェース整理が必要 | `src/services/{youtube,tiktok,instagram}.ts` |
| D-3 | `RenderStatus` に `'Rendering'` が無く、レンダリング起動後・webhook 受信前の状態を表現できない | `src/services/sheets.ts:7` |
| D-4 | `saveRenderOutput()` が 20s / 65s で別々に呼ばれるが、upsert なのか insert なのかが型から読み取れない | `src/services/sheets.ts:104` |

## E. 推奨対応の優先順位

1. **C-1**: `CRON_SECRET` による cron 認可を追加（公開前提の最低ライン）
2. **A-1**: `GoogleSheetsService` の実装（他すべての前提）
3. **A-5 / C-2**: `vercel.json` の `crons` 定義とプラン確認
4. **A-2 / A-8**: Gemini プロンプト実装と週次トランジットの取得
5. **A-3 / A-6 / A-10 / C-4**: Creatomate 連携と尺バリデーション、webhook 署名検証
6. **A-4 / A-9 / A-11 / B-5**: 3 プラットフォームの投稿実装と実 URL 参照
7. **A-7**: リトライと Slack アラート
8. **B-1 / B-2**: 命名の統一（`createmate` → `creatomate`、エンドポイント名を設計書に合わせるか設計書側を追認）
