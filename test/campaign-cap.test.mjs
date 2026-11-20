import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function receiptFor(overrides) {
  const saved = {
    priorShops: 9, priorEx: 70000, campCap: 7000,
    items: [{ shop: "新しい店", price: 11000, qty: 1, tax: 10, pointsUsed: 11000 }],
    ...overrides,
  };
  const elements = { receipt: {}, hints: {} };
  runInNewContext(script, {
    URL, window: {},
    localStorage: { getItem: () => JSON.stringify(saved) },
    document: {
      getElementById: id => elements[id] ?? { style: {}, addEventListener() {} },
      querySelectorAll: () => [],
    },
  });
  const textOf = el => el.innerHTML.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { receipt: textOf(elements.receipt), hints: textOf(elements.hints) };
}

test("買いまわりの内訳に期間全体の税抜超過額とポイント数を表示し、倍率と今回の付与分を保つ", () => {
  const { receipt } = receiptFor({});
  assert.match(receipt, /お買い物マラソン（10店舗） 上限を税抜2,222円超過（200pt分） \+9倍 1,400/);

  const priorCapped = receiptFor({ mode: "sale", priorShops: 4, priorEx: 200000, campCap: 5000 });
  assert.match(priorCapped.receipt, /スーパーSALE（5店舗） 上限を税抜85,000円超過（3,400pt分） \+4倍 0/);
});

test("上限に達する1円前・到達時・1円超過を、ポイントの端数にかかわらず区別する", () => {
  const below = receiptFor({ priorEx: 67777 });
  assert.match(below.hints, /上限まであと税抜¥1分/);
  assert.doesNotMatch(below.receipt, /上限に到達|円超過/);

  const exact = receiptFor({ priorEx: 67778 });
  assert.match(exact.receipt, /上限に到達/);
  assert.doesNotMatch(exact.receipt, /円超過/);

  const over = receiptFor({ priorEx: 67779 });
  assert.match(over.receipt, /上限を税抜1円超過 \+9倍/);
  assert.doesNotMatch(over.hints, /上限まであと/);
});

test("上限なし・買いまわり加算なし・キャンペーンなしでは超過額を表示しない", () => {
  for (const settings of [{ campCap: 0 }, { priorShops: 0 }, { mode: "none" }]) {
    const { receipt, hints } = receiptFor(settings);
    assert.doesNotMatch(receipt, /上限に到達|円超過/);
    assert.doesNotMatch(hints, /上限まであと|上限7,000ptに達して/);
  }
});
