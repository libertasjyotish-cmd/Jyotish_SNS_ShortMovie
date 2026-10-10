# 宣伝用（広告）動画

鑑定書6商品の宣伝用リール。週次パイプラインとは別系統で、原稿は `drafts/ads/<lang>.json` が唯一の正本。

## 原稿

`drafts/ads/ja.json` の各要素は `id` / `hook` / `body` / `cta` / `background` / `theme` / `pattern`。
本文はユーザー承認済みの文面であり、語句統一や型揃えの目的で書き換えない。

| id | 商品 | 背景素材 |
| --- | --- | --- |
| ad-yearly-d | 年間運勢カレンダー | ad-bgd-yearly.mp4 |
| ad-career-d | 仕事運・金運・天職 | ad-bgd-career.mp4 |
| ad-karkundali-d | カル・クンダリ | ad-bgd-palm.mp4 |
| ad-lifetime-d | 生涯完全鑑定書 | ad-bgd-lifetime.mp4 |
| ad-karma-d | 今世の天命（カルマ） | ad-bgd-karma.mp4 |
| ad-compat-d | 相性診断 | ad-bgd-compat.mp4 |

背景は `gs://jyotish-sns-renders/backgrounds/` に置く。

## レンダー

```
node scripts/render-ads.mjs ja                 # 6本すべて
node scripts/render-ads.mjs ja ad-compat-d     # 指定だけ
```

lightテーマ・30sパターン・26〜32秒。完成版は `gs://jyotish-sns-renders/ads/final/<id>.mp4`
（同じidで上書きされるので、最新がそのまま版の記録になる）。

確認:

```
gsutil cp gs://jyotish-sns-renders/ads/final/<id>.mp4 .
ffprobe -v error -show_entries stream=width,height -show_entries format=duration -of csv=p=0 <id>.mp4
```

1080x1920 / 26〜32秒であることと、画面の文字が `drafts/ads/ja.json` と一致することを目視で確認してから配信する。

## 現行の完成版（ja, 2026-10-10）

| id | 尺 |
| --- | --- |
| ad-yearly-d | 31.7s |
| ad-career-d | 28.5s |
| ad-karkundali-d | 28.5s |
| ad-lifetime-d | 29.5s |
| ad-karma-d | 26.0s |
| ad-compat-d | 26.0s |
