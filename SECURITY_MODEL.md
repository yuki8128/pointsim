> このファイルは、同じ信頼境界を持つリポジトリ群（グループ E）で共通の脅威モデルです。Devin のセキュリティスキャンが所見を評価する際の前提になります。デプロイ形態や想定する利用者が変わったら更新してください。

# 脅威モデル E: 端末内アプリ・静的サイト

対象: nagisa（Android IME、オフライン変換、音声入力）, swift-pixiv-downloader（Pixiv PHPSESSID を保持し画像/うごイラ保存）, badge-sender（BLE で電子バッジへ送信、INTERNET 権限なし）, unitprice（PWA + Android、IndexedDB）, BlueArchive-TimeLine-Simulator（GitHub Pages 静的サイト）, pointsim（GitHub Pages、楽天 API のアプリID/アクセスキーを `config.js` に配置、localStorage）。
## 信頼境界・攻撃者
サーバーなし。脅威は端末上の他アプリ（exported コンポーネント・Intent）、悪意あるコンテンツ（共有 URL・ZIP・BLE 応答）、閲覧者ブラウザでの XSS、近距離 BLE。
## 資産
IME の入力文字（パスワードを含む）、Pixiv セッション Cookie、公開ページの API キー（ユーザーが最重要と回答した API キー類）。
## 対象外・受容リスク
（ユーザー回答なし。全攻撃者を想定）
## コンポーネント
- `Nagisa IME`: `nagisa/app`, `nagisa/core`
- `Pixiv Pocket`: `swift-pixiv-downloader/`
- `Badge Sender`: `badge-sender/`
- `Unitprice`: `unitprice/`
- `BA Simulator`: `BlueArchive-TimeLine-Simulator/`
- `Pointsim`: `pointsim/`

## ユーザーが示した優先度（全グループ共通）
- 最も守りたい資産（ユーザー回答）: **課金・ウォレット（不正付与・二重付与）** と **サーバー/VPS の認証情報・API キー**。
- タグ: `Component`（下記コンポーネント名）, `Group`（A〜F）。

## インフラ
独立したインフラリポジトリはなし。各リポジトリ内の Dockerfile / docker-compose / fly.toml を参照。
