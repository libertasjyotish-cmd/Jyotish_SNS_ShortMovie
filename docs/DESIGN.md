# Libertas Jyotish SNS ショート動画 自動生成・配信システム 設計書 (Ver 6.0)

- 対象リポジトリ: `Jyotish_SNS_ShortMovie`
- 位置づけ: 旧設計書 `Ver 5.0 (Make排除・Vercel Cron 版 / Jules開発指示書)` を、実装状況に合わせて書き直したもの
- 実装状況と差分は [GAP-AUDIT.md](./GAP-AUDIT.md) を参照
- 本書では各項目に **[実装済]** / **[骨組みのみ]** / **[未実装]** を明記する

## 1. 目的

インド占星術（サイデリアル式月星座）に基づくショート動画を、6 言語 × 3 プラットフォームへ
毎週自動生成・自動配信する。ノーコードツール（Make 等）は使用せず、Vercel 上の
Next.js API Routes と Vercel Cron のみで完結させる。

1. PWA アプリ（https://www.libertas-jyotish.com/）への集客導線
2. SNS アカウント単体での収益化（TikTok の 60 秒超要件を満たす 65 秒版を用意）

## 2. 技術スタック（実装ベース）

| 項目 | 内容 |
| --- | --- |
| フレームワーク | Next.js 14.2.35 (App Router) / TypeScript |
| 実行環境 | Vercel Serverless Functions + Vercel Cron |
| DB | Google Sheets (`googleapis` ^174) |
| 原稿生成 | Gemini API (`@google/genai` ^2.16) — モデルは `gemini-2.5-flash` を想定 |
| 動画生成 | Creatomate REST API (`https://api.creatomate.com/v1/renders`) |
| 配信 | YouTube Data API v3 / TikTok Content Posting API / Instagram Graph API |
| スタイル | Tailwind CSS（現状 UI は未使用） |

> 命名注意: コード上のサービス名は `createmate`（`src/services/createmate.ts`,
> `CREATEMATE_API_KEY`, `/api/webhook/createmate`）だが、正しいサービス名は **Creatomate**。
> 表記統一が必要（GAP-AUDIT B-1）。

## 3. ディレクトリ構成

```
src/services/sheets.ts        Google Sheets アクセス層 + 全ドメイン型定義  [骨組みのみ]
src/services/gemini.ts        原稿生成                                    [骨組みのみ]
src/services/createmate.ts    Creatomate レンダリング起動                 [骨組みのみ]
src/services/youtube.ts       YouTube Shorts 投稿                         [骨組みのみ]
src/services/tiktok.ts        TikTok 投稿                                 [骨組みのみ]
src/services/instagram.ts     Instagram Reels 投稿                        [骨組みのみ]
src/app/api/cron/weekly-generate/route.ts  週次原稿生成                   [実装済 / 依存先が stub]
src/app/api/cron/render-batch/route.ts     動画レンダリング一括起動       [実装済 / 依存先が stub]
src/app/api/cron/daily-dispatch/route.ts   SNS 配信                       [実装済 / 依存先が stub]
src/app/api/webhook/createmate/route.ts    Creatomate 完了 webhook        [実装済 / 依存先が stub]
src/app/layout.tsx            ルートレイアウト
vercel.json                   ビルド設定のみ（crons 未定義）              [未実装]
```

## 4. 配信ターゲット

| 項目 | 値 |
| --- | --- |
| 言語 (6) | `ja`, `en`, `es`, `pt`, `ar`(RTL 配慮), `id` |
| プラットフォーム (3) | YouTube Shorts / TikTok / Instagram Reels |
| アカウント数 | 6 言語 × 3 SNS = 18 アカウント |

型定義は `src/services/sheets.ts` の `Language` / `Platform` に実装済み。

## 5. 週間配信スケジュール（72 本/週）

| 曜日 | テーマ | 対象 | 本数 | 実行時刻 (JST) | cron (UTC) |
| --- | --- | --- | --- | --- | --- |
| 月 | 週スタートのモチベーション・全体運 | 全星座 | 6 | 07:30 | `30 22 * * 0` |
| 火 | 金運・仕事運・キャリア | 全星座 | 6 | 12:00 | `0 3 * * 2` |
| 水 | 恋愛運・対人運 | 全星座 | 6 | 18:00 | `0 9 * * 3` |
| 木 | 翌週の月星座別運勢（前編） | 牡羊/牡牛/双子/蟹 | 24 | 18:00 | `0 9 * * 4` |
| 金 | 翌週の月星座別運勢（中編） | 獅子/乙女/天秤/蠍 | 24 | 18:00 | `0 9 * * 5` |
| 土 | 翌週の月星座別運勢（後編） | 射手/山羊/水瓶/魚 | 24 | 18:00 | `0 9 * * 6` |
| 日 | マインドフルネス・週の振り返り | 全星座 | 6 | 20:00 | `0 11 * * 0` |

原稿生成（`weekly-generate`）は毎週日曜 00:00 JST（`0 15 * * 6` UTC）、
レンダリング（`render-batch`）は日曜 02:00〜12:00 JST に 1 時間ごとを想定。

> Vercel Hobby プランの Cron は **1 日 1 回・最大 2 ジョブ** の制限があるため、
> 上記スケジュールをそのまま設定するには Pro プランが必要（GAP-AUDIT C-2）。

## 6. 動画フォーマット

| パターン | 対象 | 目標長 | 文字数(日本語) | 構成 |
| --- | --- | --- | --- | --- |
| ① 20s | YouTube Shorts / Instagram Reels | 18〜22 秒 | 100〜120 | 2 秒フック → 星回り解説 1 文 → 開運アクション → アプリ誘導 CTA |
| ② 65s | TikTok | 61〜68 秒（厳守） | 350〜380 | フック → サイデリアル式の説明 → トランジットとハウスの根拠 → 詳細運勢と注意点 → アプリ誘導 CTA |

65 秒版は TikTok の収益化要件（60 秒超）を満たすため、TTS 速度を調整して
**61〜68 秒に収まることをコード側でバリデーションする**（未実装）。

## 7. Gemini 原稿生成

### 厳格ルール
1. 根拠のない抽象的な運勢（「今週はラッキー！」等）を禁止
2. 入力された当該週の実トランジットと各月星座のハウス関係のみを根拠とする
3. 古典的象意（ダシャー、ナクシャトラ、支配星）に反する独自解釈を加えない
4. 根拠となる天体の動きを 1 つ、簡潔に含める

（`src/services/gemini.ts` の JSDoc に記載済み。プロンプト本体は未実装）

### 出力 JSON スキーマ

```jsonc
{
  "week_id": "2026-W33",
  "lang_code": "ja",
  "target_type": "Zodiac_Sign",     // "All_Signs" | "Zodiac_Sign"
  "zodiac_sign": "Aries",
  "transit_reference": "Sun transit in Leo (5th House from Moon)",
  "script_20s": { "hook_text": "", "body_script": "", "cta_text": "" },
  "script_65s": { "hook_text": "", "body_script": "", "cta_text": "" },
  "hashtags": "#インド占星術 #月星座 #運勢 #LibertasJyotish"
}
```

TypeScript 型 `GenerationRequest` / `GeneratedScript` / `GeneratedContent` として実装済み。

## 8. MasterDB (Google Sheets)

型定義はすべて `src/services/sheets.ts` に実装済み。読み書きの実処理は未実装。

| シート | カラム |
| --- | --- |
| `Channels` | `channel_id, platform, lang_code, account_handle, youtube_refresh_token, tiktok_access_token, ig_access_token, creatomate_template_20s, creatomate_template_65s` |
| `Content_Queue` | `task_id, week_id, day_of_week, lang_code, target_type, zodiac_sign, script_status, render_status_20s, render_status_65s, render_started_at_20s, render_started_at_65s, render_attempts_20s, render_attempts_65s, post_status, scheduled_post_time` |
| `Script_Outputs` | `task_id, week_id, lang_code, zodiac_sign, transit_reference, script_20s_json, script_65s_json, hashtags, created_at` |
| `Render_Outputs` | `task_id, creatomate_render_id_20s, video_url_20s, creatomate_render_id_65s, video_url_65s, duration_20s, duration_65s, rendered_at` |
| `Weekly_Transits` | `week_id, transit_data`（v5 設計書には無い。`getWeeklyTransits()` が参照） |

ステータス遷移: `Pending` → `Script_Done` → `Rendered` → `Posted` / `Error`

## 9. パイプライン

### Step 1: `GET /api/cron/weekly-generate` — 週次原稿生成
実装済みの制御フロー: `getPendingScripts()` → 各タスクで `generateScript()` →
`saveScriptOutput()` → `updateScriptStatus(task_id, 'Script_Done')`。
`maxDuration = 300`。
未実装: Sheets I/O、Gemini 呼び出し、`transit_reference` の動的取得（現状 `"Sun transit in Leo"` 固定）。

### Step 2: `GET /api/cron/render-batch` — 動画レンダリング
実装済みの制御フロー: `getPendingRenders()` → 20s / 65s それぞれ `triggerRender()` →
`saveRenderOutput()` に render_id を保存。
未実装: Creatomate API 呼び出し、原稿データの取得（現状 stub）、
チャンネル別テンプレート ID の取得（現状 `'creatomate_template_20s'` という文字列リテラル）、
65 秒の尺バリデーション。

### Step 2': `POST /api/webhook/createmate` — レンダリング完了通知
実装済みの制御フロー: `status === 'succeeded'` のとき `context.taskId` / `context.pattern` を読み、
`saveRenderOutput()` + `updateRenderStatus()`。
未実装: 署名検証、`failed` ステータスの処理、Sheets I/O。

### Step 3: `GET /api/cron/daily-dispatch` — SNS 配信
実装済みの制御フロー: `getPendingPosts()` → YouTube / Instagram に 20s、TikTok に 65s を投稿 →
`updatePostStatus(task_id, 'Posted')`、失敗時は `'Error'`。
未実装: 各 SNS API の実装（全て `console.log` のみ）、`Render_Outputs` からの実 URL 取得
（現状 `stub_url_20s_${task_id}`）、`scheduled_post_time` による時刻フィルタ、リトライ、Slack 通知。

## 10. 環境変数

| 変数名 | 用途 | 参照箇所 |
| --- | --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Sheets 認証（キー JSON をそのまま貼る。推奨） | `lib/google-credentials.ts` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Sheets 認証（JSON 未設定時のフォールバック） | `lib/google-credentials.ts` |
| `GOOGLE_PRIVATE_KEY` | Sheets 認証（`\n` はエスケープ可） | `lib/google-credentials.ts` |
| `GOOGLE_SHEETS_ID` | MasterDB のスプレッドシート ID | `services/sheets.ts` |
| `GEMINI_API_KEY` | 原稿生成 | `services/gemini.ts` |
| `GEMINI_MODEL` | 使用モデル。カンマ区切りで指定するとフォールバック順になる（任意、既定 `gemini-flash-latest,gemini-flash-lite-latest`） | `services/gemini.ts` |
| `WEEKLY_GENERATE_CONCURRENCY` | 原稿生成の並列数（任意、既定 4） | `api/cron/weekly-generate` |
| `WEEKLY_GENERATE_BUDGET_MS` | 1回の実行で新規タスクを開始する上限時間（任意、既定 25000） | `api/cron/weekly-generate` |
| `CREATEMATE_API_KEY` | 動画レンダリング | `services/createmate.ts` |
| `CRON_SECRET` | Cron エンドポイント保護 | **未実装** |
| `SLACK_WEBHOOK_URL` | エラー通知 | **未実装** |

SNS のトークン（`youtube_refresh_token` / `tiktok_access_token` / `ig_access_token`）は
環境変数ではなく Sheets の `Channels` シートで管理する設計。
別途 OAuth クライアント ID / シークレットが必要になる（未定義）。

## 11. 実装ロードマップ

1. Sheets I/O の実装（全パイプラインの前提）
2. `vercel.json` に `crons` を定義 + `CRON_SECRET` による認可
3. Gemini プロンプト実装（6 言語 / 20s・65s / 厳格ルール）
4. Creatomate 連携（テンプレート ID をチャンネル設定から取得、webhook に `context` を付与）
5. 65 秒尺バリデーション（TTS 速度調整とリトライ）
6. YouTube / TikTok / Instagram の各 API 実装 + OAuth トークン更新
7. リトライと Slack アラート
8. `Render_Outputs` からの実 URL 参照、`scheduled_post_time` フィルタ
