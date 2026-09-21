# TikTok 手動投稿マニュアル

TikTok だけ自動投稿しない。Content Posting API の本番申請が
「自社・個人の内部利用のアプリは承認しない（Not acceptable: 自分たちが運用する
TikTok アカウントへの投稿）」という理由で却下されたため、API 経由の投稿は使えない。
動画の生成・レンダリングまでは他プラットフォームと同じ自動処理で、
TikTok Studio へのアップロードだけを人手で行う。

- 投稿する尺: 65s 版（収益化条件の 60 秒超を満たすため）
- コードの扱い: `daily-dispatch` は TikTok を常にスキップする（`isConnected` が `false` を返す）
- アカウント: 2 つ
  - `ja`: `@libertas.jyotish`（日本語のみ）
  - `global`: `@libertas.jyotish4`（日本語以外の 7 言語。英語を毎日の主軸にし、es/pt/id/ar/fr/de を曜日ごとに 1 本ずつ差し込む）
- 言語ごとにアカウントを分けない理由: TikTok は 1 アカウントにつき電話番号 1 つを要求するため、
  8 言語ぶんの番号を用意できない。

## 週次の手順（所要 5〜10 分 / 1 言語）

### 1. 投稿ぶんの一覧を取る

管理エンドポイントが「65s のレンダリング済み動画 URL ＋ そのまま貼れるキャプション」を返す。

```
https://admin.libertas-jyotish.com/api/admin/tiktok-queue?token=<ADMIN_TOKEN>&days=7&lang=ja
```

- `days`: 何日前までの予定投稿を含めるか（既定 7）
- `lang`: 省略すると全言語

レスポンス:

```json
{
  "days": 7,
  "count": 3,
  "items": [
    {
      "task_id": "2026-W07-ja-aries",
      "lang_code": "ja",
      "scheduled_post_time": "2026-02-16T09:00:00Z",
      "target": "Aries",
      "video_url": "https://.../2026-W07-ja-aries-65s.mp4",
      "caption": "..."
    }
  ]
}
```

### 2. 動画をダウンロード

`video_url` をブラウザで開いて保存する（mp4・縦 1080x1920）。

### 3. TikTok Studio でアップロード

1. https://www.tiktok.com/tiktokstudio/upload を開く（`lang=ja` は ja アカウント、それ以外は global アカウント）
2. mp4 をドラッグ＆ドロップ
3. キャプション欄に `caption` をそのまま貼り付ける（CTA・免責・ハッシュタグ込み）
4. 公開設定:
   - 公開範囲: 全員
   - コメント / デュエット / ステッチ: 既定のまま
   - 「商用コンテンツ」トグル: オフ（広告案件ではないため）
5. 投稿（または予約投稿で `scheduled_post_time` に合わせる）

### 4. 記録

`Content_Queue` の `post_status` は他プラットフォームの自動投稿が更新するため、
TikTok 用に触る必要はない。重複投稿を避けるため、投稿済みの `task_id` は
各自のチェックリストで管理する（`days=7` の一覧は投稿済みのものも含む）。

## 注意

- プロフィールのリンクからサイトへ誘導する設計なので、キャプション内の URL はタップできなくてよい。
- 動画に URL を焼き込まない・ナレーションで読み上げない（PR #37 のルール）。
- 自動化したくなった場合の選択肢は、Publer / Buffer / Later など TikTok 公式連携が承認済みの
  外部スケジューラへ API 経由で動画とキャプションを渡す方法のみ。自前アプリの再申請は同じ理由で通らない。
- Web 版 TikTok にはアカウント切替 UI が無い。global と ja を行き来するときは
  ログアウトするか、通常ウィンドウとシークレットウィンドウで分ける。
- global アカウントのユーザー名は登録時に `libertas.jyotish4` が割り当てられた。
  ユーザー名は 30 日間変更できないため、2026-10-21 以降に `libertasjyotish.world` へ変更する。
