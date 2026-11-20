import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function openCart(saved) {
  return runInNewContext(script + "\n;({ state, calc, applyItem })", {
    URL, window: {},
    localStorage: { getItem: () => JSON.stringify(saved) },
    document: {
      getElementById: () => ({ style: {}, addEventListener() {} }),
      querySelectorAll: () => [],
    },
  });
}

function item(price, pointsUsed, options = {}) {
  return { shop: "shop-a", price, qty: 1, tax: 10, shopUp: 0, pointsUsed, ...options };
}

function earned(result, label) {
  return result.lines.find(line => line.label === label).pts;
}

test("500ptを使うと、税込請求額と税抜商品額それぞれから500円を引いてカード特典を計算する", () => {
  const { state, calc } = openCart({ items: [item(5500, 500, { qty: 2, shopUp: 2 })] });
  state.spu.find(r => r.key === "bank").on = true;
  const r = calc(state);
  assert.equal(r.cartIncl, 11000);
  assert.equal(r.used, 500);
  assert.equal(r.payable, 10500);
  assert.equal(earned(r, "楽天市場 通常ポイント"), 100);
  assert.equal(earned(r, "ショップUP"), 200);
  assert.equal(earned(r, "楽天モバイル"), 400);
  assert.equal(earned(r, "楽天カード（通常分）"), 105);
  assert.equal(earned(r, "楽天カード（特典分）"), 95);
  assert.equal(earned(r, "楽天銀行＋楽天カード"), 47);
  assert.equal(earned(r, "5と0のつく日"), 95);
  assert.equal(r.net, 11000 - r.total);
  assert.equal(r.perItem[state.items[0].id].unit, r.net / 2);
});

test("全額ポイント払いも買いまわりに数え、同じショップのカード特典は対象商品に配分する", () => {
  const { state, calc } = openCart({ items: [item(1100, 1100), item(1080, 0, { tax: 8 })], priorShops: 1 });
  state.spu.find(r => r.key === "mobile").on = false;
  const [first, second] = state.items;
  const together = calc(state);
  assert.equal(together.payable, 1080);
  assert.equal(earned(together, "楽天カード（通常分）"), 10);
  assert.equal(earned(together, "楽天カード（特典分）"), 9);
  assert.equal(together.perItem[first.id].pts, 20); // 通常10pt＋買いまわり10pt
  assert.equal(together.perItem[second.id].pts, 48);
  second.shop = "shop-b";
  second.pointsUsed = 1080;
  const allPoints = calc(state);
  assert.equal(allPoints.camp.qualifying, 2);
  assert.equal(allPoints.camp.pts, 40);
  assert.equal(allPoints.payable, 0);
  assert.equal(allPoints.total, 60);
});

test("ポイント利用額が税抜価格以上でも、税込の請求残額には通常のカードポイントが付く", () => {
  const { state, calc } = openCart({ items: [item(11000, 10000)] });
  const r = calc(state);
  assert.equal(r.payable, 1000);
  assert.equal(earned(r, "楽天カード（通常分）"), 10);
  assert.equal(earned(r, "楽天カード（特典分）"), 0);
  assert.equal(earned(r, "5と0のつく日"), 0);
});

test("計算対象から外した商品の利用ポイントは保存し、カゴには対象商品の支払いだけを集計する", () => {
  const { state, calc } = openCart({ items: [item(1100, 500, { included: false }), item(2200)] });
  const without = calc(state);
  assert.equal(without.used, 0);
  assert.equal(without.payable, 2200);
  assert.equal(without.total, 162);
  state.items[0].included = true;
  const withBoth = calc(state);
  assert.equal(withBoth.used, 500);
  assert.equal(withBoth.payable, 2800);
});

test("保存済みの設定を引き継ぎ、利用額を整数かつ税込小計の範囲に収める", () => {
  const custom = { key: "custom", custom: true, name: "追加特典", bonus: 2, cap: 0, on: true };
  const { state, calc, applyItem } = openCart({
    items: [item(1100), item(1100, -1), item(1100, "500.9"), item(1100, 99999)],
    extras: [{ key: "five", name: "5と0のつく日", bonus: 2, cap: 50, on: true }, custom],
  });
  assert.deepEqual(Array.from(state.items, it => it.pointsUsed), [0, 0, 500, 1100]);
  const r = calc(state);
  assert.equal(earned(r, "5と0のつく日"), 48);
  assert.equal(earned(r, "追加特典"), 80);
  assert.equal(r.used, 1600);
  applyItem(state.items[2], { itemPrice: 300 });
  assert.equal(state.items[2].pointsUsed, 300);
  applyItem(state.items[2], { itemPrice: 900 });
  assert.equal(state.items[2].pointsUsed, 300);
});

test("特典上限・手入力倍率でも各商品の獲得ポイントを合計するとカゴの表示と一致する", () => {
  const { state, calc } = openCart({ items: [
    item(1100, 1100), item(1350, 300), item(1750, 0, { shop: "shop-b", shopUp: 2 }),
  ] });
  state.spu.find(r => r.key === "cardsp").cap = 5;
  const normal = calc(state);
  assert.equal(earned(normal, "楽天カード（特典分）"), 5);
  state.ovOn = true;
  state.ovVal = 10;
  const manual = calc(state);
  assert.equal(manual.total, Math.floor(manual.cartEx * 0.1));
  for (const r of [normal, manual]) {
    assert.equal(r.payable, 2800);
    assert.equal(Object.values(r.perItem).reduce((sum, it) => sum + it.pts, 0), r.total);
  }
});
