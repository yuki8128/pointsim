import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const app = {
  URL,
  window: {},
  localStorage: { getItem: () => null },
  document: {
    getElementById: () => ({ style: {}, addEventListener() {} }),
    querySelectorAll: () => [],
  },
};
runInNewContext(script, app);

const jan = "0815820024170";
const bicUrl = `https://biccamera.rakuten.co.jp/item/${jan}/?s-id=bk_pc_item_list_name_n`;
const ichibaUrl = `https://item.rakuten.co.jp/biccamera/${jan}`;

test("楽天ビックと楽天市場の同じ商品は、先頭の0を含めて同じショップ・商品番号になる", () => {
  for (const url of [bicUrl, ichibaUrl, `https://biccamera.rakuten.co.jp/item/${jan}#detail`]) {
    assert.deepEqual({ ...app.parseUrl(url) }, { url, shop: "biccamera", code: jan, ichiba: true });
  }
  for (const url of [
    "https://biccamera.rakuten.co.jp/item/",
    "https://biccamera.rakuten.co.jp/c/campaign/",
    `https://biccamera.rakuten.co.jp/item/${jan}/reviews/`,
    `https://biccamera.rakuten.co.jp.example.org/item/${jan}/`,
  ]) {
    assert.ok(!app.parseUrl(url).ichiba, url);
  }
});

test("楽天ビックのJANでショップ内を検索し、商品URLが一致する結果だけを採用する", async () => {
  for (const itemUrl of [ichibaUrl + "/?rafcid=example", bicUrl]) {
    const hit = { itemUrl };
    app.callApi = async params => {
      assert.deepEqual({ ...params }, { shopCode: "biccamera", keyword: jan, hits: 30 });
      return { Items: [
        { itemUrl: `https://item.rakuten.co.jp/other/${jan}/` },
        { itemUrl: ichibaUrl + "-set/" },
        hit,
      ] };
    };
    assert.equal(await app.lookup(app.parseUrl(bicUrl)), hit);
  }
});

test("通常の楽天市場の数字の商品番号は従来どおり商品IDでも検索できる", async () => {
  const hit = { itemUrl: "https://item.rakuten.co.jp/example/12345/" };
  app.callApi = async params => {
    assert.deepEqual({ ...params }, { itemCode: "example:12345" });
    return { Items: [hit] };
  };
  assert.equal(await app.lookup(app.parseUrl(hit.itemUrl)), hit);
});
