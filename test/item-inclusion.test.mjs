import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function openCart(items) {
  return runInNewContext(script + "\n;({ state, calc })", {
    URL, window: {},
    localStorage: { getItem: () => JSON.stringify({ items }) },
    document: {
      getElementById: () => ({ style: {}, addEventListener() {} }),
      querySelectorAll: () => [],
    },
  });
}

test("同店の商品をOFFにすると買いまわり判定・ショップ倍率・商品別の実質価格が連動する", () => {
  const { state, calc } = openCart([
    { shop: "A", price: 600, qty: 1, tax: 10, shopUp: 2 },
    { shop: "A", price: 400, qty: 1, tax: 8, shopUp: 20 },
    { shop: "B", price: 550, qty: 2, tax: 10, shopUp: 0 },
  ]);
  const [first, second, third] = state.items;
  const all = calc(state);
  assert.equal(all.itemCount, 3);
  assert.equal(all.camp.qualifying, 2);

  second.included = false;
  const partial = calc(state);
  assert.equal(partial.camp.qualifying, 1);
  assert.equal(partial.perItem[second.id], undefined);
  assert.deepEqual(partial, calc({ ...state, items: [first, third] }));

  second.included = true;
  assert.deepEqual(calc(state), all);
});

test("全商品OFFの保存データでは手入力の倍率でも支払額とポイントがゼロになり、再度ONにできる", () => {
  const { state, calc } = openCart([{ shop: "", price: 1100, qty: 2, tax: 10, included: false }]);
  state.ovOn = true;
  state.ovVal = 5;
  const empty = calc(state);
  assert.equal(empty.itemCount, 0);
  assert.equal(empty.groups.length, 0);
  assert.equal(empty.cartIncl, 0);
  assert.equal(empty.total, 0);
  state.items[0].included = true;
  const restored = calc(state);
  assert.equal(restored.cartIncl, 2200);
  assert.equal(restored.perItem[state.items[0].id].pts, 100);
});
