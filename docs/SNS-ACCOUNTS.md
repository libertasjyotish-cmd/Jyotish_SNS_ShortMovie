# SNS アカウント構成

言語別に 1 アカウントを持ち、3 プラットフォームで合計 18 アカウントを運用する。
アカウントを言語で分けるのは、各プラットフォームのレコメンドが「1 アカウント =
1 言語 = 1 テーマ」を前提に配信先を決めるため。1 アカウントに多言語を混ぜると
配信が伸びない。

| 項目 | 値 |
| --- | --- |
| 言語 | ja / en / es / pt / id / ar（6） |
| プラットフォーム | YouTube / Instagram / TikTok（3） |
| アカウント数 | 6 × 3 = 18 |
| 投稿本数 | 12 星座 × 6 言語 = 72 本/週 |
| 投稿する尺 | YouTube Shorts・Instagram Reels = 20s 版 / TikTok = 65s 版 |

TikTok だけ 65s 版なのは、収益化条件（60 秒超）を満たすため。

## 1. アカウント一覧

`channel_id` は `Channels` シートの主キーで、コードから参照する識別子。
ハンドル名は取得できなかった場合に末尾へ数字を足すなど適宜変更してよいが、
`Channels` シートの `account_handle` は実際に取得したものへ必ず更新する。

### YouTube（6）

| channel_id | 言語 | チャンネル名（案） | ハンドル（案） |
| --- | --- | --- | --- |
| `yt-ja` | ja | 本当の星座 \| インド占星術 | `@jyotish_ja` |
| `yt-en` | en | Your Real Sign \| Vedic Astrology | `@jyotish_en` |
| `yt-es` | es | Tu Signo Real \| Astrología Védica | `@jyotish_es` |
| `yt-pt` | pt | Seu Signo Real \| Astrologia Védica | `@jyotish_pt` |
| `yt-id` | id | Zodiak Aslimu \| Astrologi Veda | `@jyotish_id` |
| `yt-ar` | ar | برجك الحقيقي \| علم الفلك الهندي | `@jyotish_ar` |

### Instagram（6）

| channel_id | 言語 | ユーザー名（案） |
| --- | --- | --- |
| `ig-ja` | ja | `jyotish.ja` |
| `ig-en` | en | `jyotish.en` |
| `ig-es` | es | `jyotish.es` |
| `ig-pt` | pt | `jyotish.pt` |
| `ig-id` | id | `jyotish.id` |
| `ig-ar` | ar | `jyotish.ar` |

### TikTok（6）

| channel_id | 言語 | ユーザー名（案） |
| --- | --- | --- |
| `tt-ja` | ja | `jyotish_ja` |
| `tt-en` | en | `jyotish_en` |
| `tt-es` | es | `jyotish_es` |
| `tt-pt` | pt | `jyotish_pt` |
| `tt-id` | id | `jyotish_id` |
| `tt-ar` | ar | `jyotish_ar` |

## 2. 作成手順と前提

### 共通

- 各アカウントのプロフィール文とリンク欄にサイト URL を入れる（動画の CTA が
  「プロフィール欄のサイト URL をクリック」のため、ここが導線の終点）。
- アイコン・ヘッダーは全言語で共通デザインにし、言語名だけ差し替える。
- 作成順は ja → en → es → pt → id → ar。ja で運用が回ってから他言語を増やすと、
  凍結リスクと手戻りが小さい。

### YouTube

1. Google アカウントを言語ごとに 1 つ用意する（既存の 1 アカウント配下に
   ブランドアカウントを 6 つ作る方式でも可。API のクォータはチャンネル単位ではなく
   **Google Cloud プロジェクト単位**で消費される点に注意）。
2. 各チャンネルで YouTube Data API v3 の OAuth 同意を行い、`refresh_token` を取得する。
3. 1 プロジェクトの既定クォータは 10,000 units/日、動画アップロードは 1 本 1,600 units
   なので 1 日 6 本が上限。72 本/週（1 日あたり最大 12 本）を捌くには、
   言語ごとに Google Cloud プロジェクト（＝ OAuth クライアント）を分けるか、
   クォータ増加申請を行う。`Channels` シートの `youtube_client_id` /
   `youtube_client_secret` で言語別クライアントを設定できる実装になっている。

### Instagram

1. **プロアカウント（ビジネス）** で作成する。個人アカウントでは API 投稿ができない。
2. 各アカウントを Facebook ページに紐付ける（Instagram Graph API の要件）。
3. Meta 開発者アプリを 1 つ作り、6 アカウント分の長期アクセストークンを取得する
   （60 日で失効するため定期更新が必要）。
4. Reels の API 投稿は「動画を公開 URL でホストして URL を渡す」方式。
   レンダリング済み MP4 は GCS の公開 URL にあるためそのまま使える。

### TikTok

1. 各アカウントを作成し、TikTok for Developers でアプリを 1 つ作る。
2. Content Posting API を有効にし、各アカウントで OAuth 認可して
   `access_token` / `refresh_token` を取得する。
3. **審査前のアプリは投稿が `SELF_ONLY`（自分のみ閲覧可）に限定される。**
   公開投稿するには Content Posting API の審査申請が必要。
4. 投稿は GCS の公開 URL からの Pull-from-URL 方式。ドメイン所有権の確認が必要になる。

## 3. 認証情報の置き場所

トークンは `Channels` シートで管理し、環境変数にはアプリ単位の
クライアント ID / シークレットだけを置く。

| 置き場所 | 値 |
| --- | --- |
| `Channels` シート | `youtube_refresh_token` / `tiktok_access_token` / `ig_access_token`、および言語別の `youtube_client_id` / `youtube_client_secret` |
| 環境変数 | `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` / `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` |

`Channels` シートの 1 行が 1 アカウントに対応する。18 行になる。

| 列 | 例 |
| --- | --- |
| `channel_id` | `yt-ja` |
| `platform` | `youtube` / `instagram` / `tiktok` |
| `lang_code` | `ja` |
| `account_handle` | `@jyotish_ja` |

## 4. 進め方の目安

18 アカウントを一度に作ると、同一 IP・同一端末からの連続作成で凍結されやすい。
言語ごとに 3 プラットフォームずつ、日を分けて作成するのが安全。

1. ja の 3 アカウントを作成 → `Channels` へ登録 → 投稿まで通す
2. 問題が無ければ en 以降を追加
3. TikTok の審査申請は時間がかかるため、ja のアカウント作成直後に出しておく
