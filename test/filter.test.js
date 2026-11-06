import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFilter, matchesFilter } from "../index.js";

const TYPE = "絞り込みの条件は文字で渡してください";

test("parseFilter の状態", () => {
  for (const raw of [undefined, null, {}, { status: "" }, { status: null }]) {
    assert.deepEqual(parseFilter(raw), {
      filter: { status: "all", tag: null, text: null },
      problems: [],
    });
  }
  assert.equal(parseFilter({ status: "done" }).filter.status, "done");
  for (const status of ["Open", " open"]) {
    assert.deepEqual(parseFilter({ status }), {
      filter: null,
      problems: ["状態は open・done・all のどれかです"],
    });
  }
});

test("parseFilter のタグと文字", () => {
  assert.deepEqual(parseFilter({ tag: " Foo ", text: " Bar " }).filter, {
    status: "all", tag: "foo", text: "Bar",
  });
  assert.deepEqual(parseFilter({ tag: "  ", text: "  " }).filter, {
    status: "all", tag: null, text: null,
  });
  assert.deepEqual(parseFilter({ tag: "a".repeat(21) }).problems, ["タグは20文字までです"]);
  assert.deepEqual(parseFilter({ tag: "a,b" }).problems, ["タグに「,」は使えません"]);
  assert.deepEqual(
    parseFilter({ status: "x", tag: "a,b" }).problems,
    ["状態は open・done・all のどれかです", "タグに「,」は使えません"],
  );
});

test("parseFilter の型の理由", () => {
  for (const raw of [{ status: 1 }, { tag: ["a"] }, { text: {} }, { status: "x", tag: 1 }]) {
    assert.deepEqual(parseFilter(raw), { filter: null, problems: [TYPE] });
  }
});

test("matchesFilter", () => {
  const a = { title: "Buy Milk", done: false, tags: ["home"] };
  const b = { title: "Buy Milk", done: true, tags: ["home"] };
  const c = { title: "ＡＢ", done: false };
  const f = (o) => ({ status: "all", tag: null, text: null, ...o });
  assert.equal(matchesFilter(a, f({})), true);
  assert.equal(matchesFilter(a, f({ status: "open" })), true);
  assert.equal(matchesFilter(b, f({ status: "open" })), false);
  assert.equal(matchesFilter(b, f({ status: "done" })), true);
  assert.equal(matchesFilter(a, f({ status: "done" })), false);
  const d = { title: "x" };
  assert.equal(matchesFilter(d, f({ status: "open" })), true);
  assert.equal(matchesFilter(d, f({ status: "done" })), false);
  assert.equal(matchesFilter(a, f({ tag: "home" })), true);
  assert.equal(matchesFilter(a, f({ tag: "work" })), false);
  assert.equal(matchesFilter(c, f({ tag: "home" })), false);
  assert.equal(matchesFilter(a, f({ text: "buy MILK" })), true);
  assert.equal(matchesFilter(c, f({ text: "ａｂ" })), false);
  assert.equal(matchesFilter(c, f({ text: "ＡＢ" })), true);
  assert.equal(matchesFilter(b, f({ status: "open", tag: "home", text: "milk" })), false);
  assert.equal(matchesFilter(a, f({ status: "open", tag: "home", text: "milk" })), true);
  assert.equal(matchesFilter(a, f({ status: "open", tag: "home", text: "tea" })), false);
});
