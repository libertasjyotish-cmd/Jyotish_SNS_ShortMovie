# Instagram の期限切れReels取り下げ

`/api/cron/expire-weekly` は週が終わった星座別投稿を YouTube（非公開化）・Threads（削除）・
Facebook（削除）から自動で取り下げる。Instagram の Graph API には公開済みReelsを削除・
アーカイブするエンドポイントが無いため、Instagram だけはアカウントUIでの操作が必要になる。
これは人の作業ではなく、週1回のDevin Automationが実行する。

## 対象の取得

```
GET https://admin.libertas-jyotish.com/api/admin/instagram-retire
Authorization: Bearer <CRON_SECRET または ADMIN_TOKEN>
```

週が終わった（最終日+1日以降）Reelsのうち、まだ取り下げていないものを返す。

```json
{
  "count": 1,
  "items": [
    {
      "task_id": "2026-W40-en-aries",
      "lang_code": "en",
      "week_id": "2026-W40",
      "zodiac_sign": "aries",
      "media_id": "17912345678901234",
      "account_handle": "libertas.jyotish.en",
      "permalink": "https://www.instagram.com/reel/XXXXXXXXXXX/"
    }
  ]
}
```

## 取り下げ

各 `permalink` を `account_handle` のアカウントで開き、投稿メニューから「アーカイブ」を選ぶ
（削除ではなくアーカイブ。統計が残り、必要なら戻せる）。ログイン情報はDevinのシークレット
（`IG_JA_PASSWORD` などのIGアカウントパスワード）を使う。

## 完了報告

```
POST https://admin.libertas-jyotish.com/api/admin/instagram-retire
Authorization: Bearer <CRON_SECRET または ADMIN_TOKEN>
Content-Type: application/json

{"task_id": "2026-W40-en-aries", "media_id": "17912345678901234"}
```

`media_id` を省くとそのタスクのInstagram refをすべて完了扱いにする。

Instagram を含む全プラットフォームの取り下げが終わった行は `expired_at` が入り、以降の
worklistには出てこない。

## 頻度

週1回（火曜、`expire-weekly` の後）。1回あたりの件数を抑えるため、多い場合は数回に分けて
処理する。
