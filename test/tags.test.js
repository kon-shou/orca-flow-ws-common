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

test("validateTags の通る入力", () => {
  assert.deepEqual(validateTags(["a".repeat(20)]), []);
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

test("setTodoTags", () => {
  const todo = { id: 1, title: "t", done: false, tags: ["a"] };
  const input = ["B", "b", "c"];
  const next = setTodoTags(todo, input);
  assert.deepEqual(next.tags, ["b", "c"]);
  assert.notEqual(next.tags, input);
  assert.deepEqual(todo.tags, ["a"]);
  assert.equal("tags" in setTodoTags(todo, []), false);
  assert.equal("tags" in setTodoTags(todo, null), false);
  assert.deepEqual(todo.tags, ["a"]);
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
});
