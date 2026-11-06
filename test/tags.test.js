import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_TAGS, MAX_TAG_LENGTH, normalizeTag, normalizeTags, validateTags,
  parseTagInput, createTodo, setTodoTags, completeTodo,
} from "../index.js";

const TYPE = "タグは文字の並びで渡してください";

test("定数", () => {
  assert.equal(MAX_TAGS, 5);
  assert.equal(MAX_TAG_LENGTH, 20);
});

test("整え", () => {
  assert.equal(normalizeTag("　 AbC　"), "abc");
  assert.equal(normalizeTag("ＡＢ"), "ＡＢ");
  assert.deepEqual(normalizeTags(["Work", "work", " WORK ", "x"]), ["work", "x"]);
  assert.deepEqual(normalizeTags(["A", "b", "a"]), ["a", "b"]);
});

test("validateTags の4つの理由が順に1つずつ", () => {
  const input = ["", "a".repeat(21), "a,b", "c", "d", "e", "f"];
  assert.deepEqual(validateTags(input), [
    "タグが空です",
    "タグは20文字までです",
    "タグに「,」は使えません",
    "タグは5個までです",
  ]);
});

test("validateTags の理由は種類ごとに1つ", () => {
  const input = ["", "a".repeat(21), "b".repeat(21), "a,b", "c,d", "e", "f"];
  assert.deepEqual(validateTags(input), [
    "タグが空です",
    "タグは20文字までです",
    "タグに「,」は使えません",
    "タグは5個までです",
  ]);
});

test("validateTags は空白だけのタグを空とみなす", () => {
  assert.deepEqual(validateTags(["  "]), ["タグが空です"]);
  assert.deepEqual(validateTags(["　"]), ["タグが空です"]);
});

test("validateTags の通る入力", () => {
  assert.deepEqual(validateTags(["a".repeat(20)]), []);
  assert.deepEqual(validateTags(["a", "A", "b", "c", "d", "e"]), []);
  assert.deepEqual(validateTags(["a", "A", "b", "c", "d", "e", "E"]), []);
  assert.deepEqual(validateTags(["a", "b", "c", "d", "e", "E", "f"]), ["タグは5個までです"]);
  assert.deepEqual(validateTags(undefined), []);
  assert.deepEqual(validateTags(null), []);
  assert.deepEqual(validateTags([]), []);
});

test("validateTags の型の理由", () => {
  assert.deepEqual(validateTags("a"), [TYPE]);
  assert.deepEqual(validateTags({}), [TYPE]);
  assert.deepEqual(validateTags(["a", 1, ""]), [TYPE]);
});

test("parseTagInput", () => {
  assert.deepEqual(parseTagInput(""), []);
  assert.deepEqual(parseTagInput("  "), []);
  assert.deepEqual(parseTagInput(5), []);
  assert.deepEqual(parseTagInput("a, ,b,,"), ["a", "b"]);
  assert.deepEqual(parseTagInput("A,a"), ["A", "a"]);
});

test("createTodo のタグ", () => {
  const tags = [" Foo", "foo", "Bar"];
  const todo = createTodo({ title: "t", tags }, { id: 1 });
  assert.deepEqual(todo.tags, ["foo", "bar"]);
  assert.notEqual(todo.tags, tags);
  for (const t of [undefined, null, []]) {
    assert.equal("tags" in createTodo({ title: "t", tags: t }, { id: 1 }), false);
  }
  assert.equal("tags" in createTodo({ title: "t" }, { id: 1 }), false);
  assert.throws(
    () => createTodo({ title: " ", tags: [""] }, { id: 1 }),
    (e) => {
      assert.deepEqual(e.problems, ["題が空です", "タグが空です"]);
      return true;
    },
  );
});

test("createTodo は理由を題 → 期限 → タグの順に並べ、tags の欄を dueDate の後に置く", () => {
  const now = new Date("2026-11-05T03:00:00Z");
  assert.throws(
    () => createTodo({ title: " ", dueDate: "2026/11/05", tags: [""] }, { id: 1, now }),
    (e) => {
      assert.deepEqual(e.problems, [
        "題が空です",
        "期限は YYYY-MM-DD の形で書いてください",
        "タグが空です",
      ]);
      return true;
    },
  );
  const todo = createTodo({ title: "a", dueDate: "2026-11-06", tags: ["X"] }, { id: 1, now });
  assert.deepEqual(Object.keys(todo), ["id", "title", "done", "createdAt", "dueDate", "tags"]);
  assert.deepEqual(setTodoTags(todo, ["y"]).dueDate, "2026-11-06");
  assert.deepEqual(completeTodo(todo).dueDate, "2026-11-06");
});

test("setTodoTags", () => {
  const todo = { id: 1, title: "t", done: false, tags: ["a"] };
  const input = ["B", "b", "c"];
  const next = setTodoTags(todo, input);
  assert.deepEqual(next, { id: 1, title: "t", done: false, tags: ["b", "c"] });
  assert.notEqual(next, todo);
  assert.notEqual(next.tags, input);
  assert.deepEqual(todo.tags, ["a"]);
  const empty = setTodoTags(todo, []);
  assert.deepEqual(empty, { id: 1, title: "t", done: false });
  assert.notEqual(empty, todo);
  for (const bad of [null, undefined]) {
    assert.throws(() => setTodoTags(todo, bad), (e) => {
      assert.deepEqual(e.problems, [TYPE]);
      return true;
    });
  }
  assert.deepEqual(todo, { id: 1, title: "t", done: false, tags: ["a"] });
  assert.throws(() => setTodoTags(todo, [""]), (e) => {
    assert.deepEqual(e.problems, ["タグが空です"]);
    return true;
  });
});

test("completeTodo はタグを受け継ぐ", () => {
  const todo = { id: 1, title: "t", done: false, tags: ["a"] };
  const done = completeTodo(todo);
  assert.deepEqual(done.tags, ["a"]);
  assert.notEqual(done.tags, todo.tags);
  assert.equal("tags" in completeTodo({ id: 2, title: "x", done: false }), false);
  assert.deepEqual(completeTodo(null), { done: true });
  assert.deepEqual(completeTodo(undefined), { done: true });
});
