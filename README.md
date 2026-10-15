# ポイント皮算用（pointsim）

楽天市場の商品URLを貼ると、商品名・価格・ショップのポイント倍率を楽天ウェブサービスの商品検索APIで取得し、SPU・お買い物マラソン・5と0のつく日などを加味した獲得ポイントを購入前に計算するツールです。

公開ページ: https://yuki8128.github.io/pointsim/

- 静的ページのみ（`index.html` と `config.js`）。入力内容は閲覧者のブラウザの localStorage にだけ保存します。
- `config.js` のアプリID・アクセスキーは「許可されたWebサイト」で `yuki8128.github.io` に制限しています。別ドメインで動かす場合は `config.example.js` をもとに自分のキーを設定してください。
- 楽天グループ株式会社とは関係のない個人の制作物です。

Supported by Rakuten Developers
