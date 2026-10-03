# 運用手順（Devinなしで回す）

通常は何もしなくても自動で回ります。止まったときだけ、管理画面のボタンを押すか、下のコマンドを実行します。

## 1. 自動で動くもの（Vercel Cron, UTC）

| 時刻                | 処理              | 内容                               |
| ------------------- | ----------------- | ---------------------------------- |
| 月 17:00            | weekly-plan       | 翌週の128枠をキューに作る          |
| 月 18:00            | weekly-generate   | 原稿を生成する                     |
| 月 20:00 ＋ 3時間毎 | render-batch      | 動画をレンダリングする             |
| 15分毎              | daily-dispatch    | 時刻の来た枠を投稿する             |
| 毎日 03:20          | watchdog          | 止まったレンダー・原稿を再投入する |
| 毎日 03:40          | health-check      | 接続・トークン失効を点検する       |
| 月 16:00            | expire-weekly     | 先週分の投稿を取り下げる           |

異常はメールで通知されます（監視はDevin Automation、プロンプトは別管理）。

## 2. 管理画面（https://admin.libertas-jyotish.com/admin ）

管理トークンでサインインすると、直近3週の進捗（枠・原稿・動画・投稿・各エラー数）が出ます。
ボタンは上の表と同じ処理を手動で動かすもので、二重に押しても未処理の枠だけが進みます。

| 症状                           | 押すボタン         |
| ------------------------------ | ------------------ |
| 週の枠が作られていない         | 今週分の枠を作る   |
| 原稿が足りない                 | 原稿を作る         |
| 動画が「レンダー待ち」のまま   | 動画を作る         |
| 投稿時刻を過ぎても投稿されない | 投稿する           |
| 状態が「Rendering」で止まった  | 詰まりを直す       |
| 先週の投稿が残っている         | 先週分を取り下げる |

## 3. 手元から実行するコマンド

```bash
npm run lint              # コードの静的チェック
npx tsc --noEmit          # 型チェック（scratch-*.ts のエラーは無視してよい）
npm run check:titles      # YouTubeタイトルが8言語とも100字内・フックが途中で切れないか
npm run check:thumbnails  # サムネイル生成の確認
npm run lint:scripts <file.json>        # 手書き原稿の字数・CTA・断定表現チェック
npm run diagnose:reach -- <lang> [件数] # YouTubeの露出低下の診断（読み取りのみ）
npm run refresh:seo -- <lang...> [week...] [--apply]  # 既投稿のタグ・説明欄を補完（既定はdry-run）
```

`npm run check:*` と lint は PR で自動実行されます（.github/workflows/checks.yml）。

## 4. 注意

- YouTube Data APIのクォータは8チャンネル共有です。`refresh:seo --apply` は当日の投稿が終わってから少量ずつ実行します（リセットは日本時間16:00）。
- レンダリングは課金されます。投稿済み・レンダー済みのものを作り直さないでください。
- レンダラー（`renderer/`）はVercelではデプロイされません。変更したときだけ `renderer/README.md` の `gcloud run deploy` を実行します。
