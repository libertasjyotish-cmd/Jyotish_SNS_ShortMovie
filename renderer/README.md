# Renderer (Cloud Run)

Creatomate の代わりに動画を生成するサービス。レイアウト・タイポグラフィ・タイミングを
すべてコードで持つため、GUI テンプレートは不要。

## 仕組み

1. 本文を最大 3 文へ分割（`text.py` / `src/lib/text.ts` と同じ規則）
2. Hook・各文・CTA を **1文ずつ** Google Cloud TTS で合成し、長さを実測
3. Pillow でテキストレイヤーを 1080×1920 の透過 PNG として描画（`overlays.py`）
4. ffmpeg で背景動画へ合成し、各文を「話している間だけ」表示（`video.py`）
5. 完成した MP4 を Cloud Storage へ公開アップロードし、URL を返す

## API

```
POST /render
Authorization: Bearer $CRON_SECRET

{
  "task_id": "intro-ja-20s",
  "language": "ja",
  "background_url": "https://.../intro-bg.mp4",
  "hook": "あなたの星座、実はズレています",
  "body": "…。…。…。",
  "cta": "あなたの本当の星座を知るには",
  "note": "※プロフィール欄のサイトURLをクリック",
  "max_body_segments": 3,
  "tempo": 1.05,
  "output_path": "renders/intro-ja-20s.mp4"
}
```

レスポンス: `{ "url": "https://storage.googleapis.com/…", "duration": 28.2, "segments": [...] }`

`GET /health` は死活監視用。

## 環境変数

| 変数 | 用途 |
| --- | --- |
| `CRON_SECRET` | Vercel 側と共通の Bearer トークン |
| `GCS_BUCKET` | 出力先バケット（公開読み取り） |
| `FONT_DIR` | フォント配置先（既定 `/opt/fonts`） |
| `TTS_VOICE_<LANG>` / `TTS_LANGUAGE_CODE_<LANG>` | ボイス上書き（任意） |

TTS と Cloud Storage は Cloud Run のサービスアカウント権限で認証する
（`roles/storage.objectAdmin` と TTS API の有効化が必要）。

## デプロイ

```bash
gcloud run deploy jyotish-renderer \
  --source renderer \
  --region asia-northeast1 \
  --memory 2Gi --cpu 2 --timeout 900 --concurrency 1 \
  --set-env-vars GCS_BUCKET=<bucket> \
  --set-secrets CRON_SECRET=CRON_SECRET:latest \
  --no-allow-unauthenticated
```

## ローカル実行

```bash
cd renderer && pip install -r requirements.txt && python app.py
```
