import { test } from "node:test";
import assert from "node:assert/strict";
import { createTodo, isOverdue, todayInJapan, validateDueDate } from "../index.js";

const TODAY = "2026-11-05";
const FORMAT = "期限は YYYY-MM-DD の形で書いてください";
const PAST = "期限は今日以降の日付にしてください";
const NOW = new Date("2026-11-05T03:00:00Z");

test("todayInJapan は日本時間の日付を返す", () => {
  assert.equal(todayInJapan(new Date("2026-11-04T15:30:00Z")), "2026-11-05");
  assert.equal(todayInJapan(new Date("2026-11-04T14:59:59Z")), "2026-11-04");
});

test("validateDueDate は期限なし・今日・明日を通し、昨日を断る", () => {
  for (const v of [undefined, null, "", TODAY, "2026-11-06"]) {
    assert.deepEqual(validateDueDate(v, TODAY), []);
  }
  assert.deepEqual(validateDueDate("2026-11-04", TODAY), [PAST]);
});

test("validateDueDate は形と実在を断る", () => {
  assert.deepEqual(validateDueDate("2026/11/05", TODAY), [FORMAT]);
  assert.deepEqual(validateDueDate(" 2026-11-05", TODAY), [FORMAT]);
  assert.deepEqual(validateDueDate(20261105, TODAY), [FORMAT]);
  assert.deepEqual(validateDueDate("2026-02-30", TODAY), ["期限の日付が実在しません"]);
});

test("validateDueDate は today が誤りなら比べない", () => {
  assert.deepEqual(validateDueDate("2020-01-01", "bad"), []);
  assert.deepEqual(validateDueDate("2020-01-01", undefined), []);
});

test("isOverdue は未完了で期限が今日より前のときだけ真", () => {
  assert.equal(isOverdue({ done: false, dueDate: "2026-11-04" }, TODAY), true);
  assert.equal(isOverdue({ done: false, dueDate: TODAY }, TODAY), false);
  assert.equal(isOverdue({ done: false, dueDate: "2026-11-06" }, TODAY), false);
  assert.equal(isOverdue({ done: true, dueDate: "2026-11-04" }, TODAY), false);
  assert.equal(isOverdue({ done: false }, TODAY), false);
});

test("isOverdue は誤った値でも例外を投げず偽", () => {
  assert.equal(isOverdue({ done: false, dueDate: "2026-11-04" }, "bad"), false);
  assert.equal(isOverdue({ done: false, dueDate: "2026-11-04" }, undefined), false);
  assert.equal(isOverdue({ done: false, dueDate: "2026/11/04" }, TODAY), false);
  assert.equal(isOverdue({ done: false, dueDate: 20261104 }, TODAY), false);
  assert.equal(isOverdue(null, TODAY), false);
  assert.equal(isOverdue(undefined, TODAY), false);
});

test("createTodo は今日より前の期限を断る", () => {
  assert.throws(
    () => createTodo({ title: "a", dueDate: "2026-11-04" }, { id: 1, now: NOW }),
    (e) => e.problems.includes(PAST) && e.message === PAST,
  );
});

test("createTodo は今日の期限を持たせ、空・未指定なら欄を作らない", () => {
  const todo = createTodo({ title: "a", dueDate: TODAY }, { id: 1, now: NOW });
  assert.equal(todo.dueDate, TODAY);
  for (const input of [{ title: "a", dueDate: "" }, { title: "a" }]) {
    assert.equal("dueDate" in createTodo(input, { id: 1, now: NOW }), false);
  }
});

test("createTodo は題、期限の順に理由を並べる", () => {
  assert.throws(
    () => createTodo({ title: " ", dueDate: "2026/11/05" }, { id: 1, now: NOW }),
    (e) => {
      assert.deepEqual(e.problems, ["題が空です", FORMAT]);
      assert.equal(e.message, `題が空です。${FORMAT}`);
      return true;
    },
  );
});

test("createTodo は日本時間の今日の期限を通す", () => {
  const now = new Date("2026-11-04T15:30:00Z");
  assert.equal(createTodo({ title: "a", dueDate: TODAY }, { id: 1, now }).dueDate, TODAY);
  assert.throws(
    () => createTodo({ title: "a", dueDate: "2026-11-04" }, { id: 1, now }),
    (e) => e.problems.includes(PAST),
  );
});
