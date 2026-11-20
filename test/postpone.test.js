import { test } from "node:test";
import assert from "node:assert/strict";
import { postponeDueDate } from "../index.js";

test("期限を3日延ばす", () => {
  const todo = { id: 1, title: "a", done: false, dueDate: "2026-11-20" };
  assert.equal(postponeDueDate(todo, 3, "2026-11-20").dueDate, "2026-11-23");
});
