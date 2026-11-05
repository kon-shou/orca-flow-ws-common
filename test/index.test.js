import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_TITLE_LENGTH,
  completeTodo,
  createTodo,
  isIsoDate,
  validateTitle,
} from "../index.js";

test("isIsoDate は実在する YYYY-MM-DD だけを受ける", () => {
  assert.equal(isIsoDate("2026-11-05"), true);
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isIsoDate("2026/11/05"), false);
  assert.equal(isIsoDate(""), false);
  assert.equal(isIsoDate(undefined), false);
});

test("validateTitle は空と長すぎる題を断る", () => {
  assert.deepEqual(validateTitle("牛乳を買う"), []);
  assert.deepEqual(validateTitle("   "), ["題が空です"]);
  assert.deepEqual(validateTitle("a".repeat(MAX_TITLE_LENGTH + 1)), [
    `題は${MAX_TITLE_LENGTH}文字までです`,
  ]);
});

test("createTodo は題を整えて未完了で作る", () => {
  const now = new Date("2026-11-05T00:00:00Z");
  assert.deepEqual(createTodo({ title: " 牛乳を買う " }, { id: 1, now }), {
    id: 1,
    title: "牛乳を買う",
    done: false,
    createdAt: "2026-11-05T00:00:00.000Z",
  });
  assert.throws(() => createTodo({ title: "" }, { id: 2 }), /題が空です/);
});

test("completeTodo は元を変えずに完了の写しを返す", () => {
  const todo = createTodo({ title: "掃除" }, { id: 3 });
  const done = completeTodo(todo);
  assert.equal(done.done, true);
  assert.equal(todo.done, false);
});
