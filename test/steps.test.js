import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_STEPS,
  MAX_STEP_TITLE_LENGTH,
  validateSteps,
  normalizeSteps,
  createTodo,
  setTodoSteps,
  setTodoTags,
  completeTodo,
  stepProgress,
  hasRemainingSteps,
} from "../index.js";

const TYPE = "手順は題と済んだかを持つ物の並びで渡してください";
const COUNT = "手順は20個までです";
const EMPTY = "題が空の手順があります";
const LONG = "手順の題は100文字までです";
const DONE = "手順の済んだかは真偽で渡してください";

test("定数", () => {
  assert.equal(MAX_STEPS, 20);
  assert.equal(MAX_STEP_TITLE_LENGTH, 100);
});

test("validateSteps は個数 → 空 → 長さ → done を1つずつ返す", () => {
  const steps = Array.from({ length: 21 }, () => ({ title: "a" }));
  steps[0] = { title: " " };
  steps[1] = { title: "  " };
  steps[2] = { title: "x".repeat(101) };
  steps[3] = { title: "y".repeat(102) };
  steps[4] = { title: "d", done: "yes" };
  steps[5] = { title: "d", done: null };
  assert.deepEqual(validateSteps(steps), [COUNT, EMPTY, LONG, DONE]);
});

test("validateSteps の型の理由", () => {
  const bads = [
    "a",
    {},
    [null],
    [[]],
    ["x"],
    [{}],
    [{ title: 1 }],
    [{ title: null }],
    [{ title: "a" }, { done: true }],
    [{ title: "" }, null],
    new Array(1),
    [, { title: "a" }], // 穴あきの並び
  ];
  for (const bad of bads) {
    assert.deepEqual(validateSteps(bad), [TYPE]);
  }
});

test("validateSteps が空を返す入力", () => {
  const twenty = Array.from({ length: 20 }, () => ({ title: "a" }));
  const edge = [{ title: " " + "x".repeat(100) + " ", done: true }, { title: "a" }, { title: "a" }];
  for (const ok of [undefined, null, [], twenty, edge]) {
    assert.deepEqual(validateSteps(ok), []);
  }
});

test("normalizeSteps", () => {
  const input = [{ title: " a ", done: true, extra: 1 }, { title: "a" }];
  const out = normalizeSteps(input);
  assert.deepEqual(out, [
    { title: "a", done: true },
    { title: "a", done: false },
  ]);
  assert.notEqual(out[0], input[0]);
});

test("createTodo の手順", () => {
  const steps = [{ title: " a ", done: true, extra: 1 }, { title: "b" }];
  const todo = createTodo({ title: "t", steps }, { id: 1 });
  assert.deepEqual(todo.steps, [
    { title: "a", done: true },
    { title: "b", done: false },
  ]);
  assert.notEqual(todo.steps, steps);
  assert.notEqual(todo.steps[0], steps[0]);
  assert.deepEqual(steps[0], { title: " a ", done: true, extra: 1 });
  for (const s of [undefined, null, []]) {
    assert.equal("steps" in createTodo({ title: "t", steps: s }, { id: 1 }), false);
  }
});

test("createTodo は理由を題 → 期限 → タグ → 手順の順に並べる", () => {
  const now = new Date("2026-11-05T03:00:00Z");
  assert.throws(
    () =>
      createTodo(
        { title: " ", dueDate: "2026/11/05", tags: [""], steps: [{ title: "" }] },
        { id: 1, now },
      ),
    (e) => {
      assert.deepEqual(e.problems, [
        "題が空です",
        "期限は YYYY-MM-DD の形で書いてください",
        "タグが空です",
        EMPTY,
      ]);
      return true;
    },
  );
});

test("steps は既存のキーのどれよりも後ろにある", () => {
  const now = new Date("2026-11-05T03:00:00Z");
  const todo = createTodo(
    { title: "a", dueDate: "2026-11-06", tags: ["x"], steps: [{ title: "s" }] },
    { id: 1, now },
  );
  const keys = Object.keys(todo);
  for (const k of ["id", "title", "done", "createdAt", "dueDate", "tags"]) {
    assert.ok(keys.indexOf(k) >= 0);
    assert.ok(keys.indexOf("steps") > keys.indexOf(k), k);
  }
});

test("setTodoSteps", () => {
  const todo = { id: 1, title: "t", done: true, tags: ["a"], steps: [{ title: "old", done: false }] };
  const input = [{ title: " n ", done: true }];
  const next = setTodoSteps(todo, input);
  assert.deepEqual(next, {
    id: 1,
    title: "t",
    done: true,
    tags: ["a"],
    steps: [{ title: "n", done: true }],
  });
  assert.notEqual(next, todo);
  assert.notEqual(next.steps, input);
  assert.notEqual(next.tags, todo.tags);
  assert.deepEqual(todo.steps, [{ title: "old", done: false }]);
  assert.deepEqual(setTodoSteps(todo, []), { id: 1, title: "t", done: true, tags: ["a"] });
  for (const bad of [null, undefined]) {
    assert.throws(() => setTodoSteps(todo, bad), (e) => {
      assert.deepEqual(e.problems, [TYPE]);
      return true;
    });
  }
  assert.throws(() => setTodoSteps(todo, "x"), (e) => {
    assert.deepEqual(e.problems, [TYPE]);
    return true;
  });
  assert.throws(() => setTodoSteps(todo, [{ title: " " }]), (e) => {
    assert.deepEqual(e.problems, [EMPTY]);
    return true;
  });
  assert.deepEqual(todo.steps, [{ title: "old", done: false }]);
});

test("写しは steps を共有しない", () => {
  const todo = { id: 1, title: "t", done: false, tags: ["a"], steps: [{ title: "s", done: false }] };
  for (const copy of [completeTodo(todo), setTodoTags(todo, ["b"]), setTodoSteps(todo, todo.steps)]) {
    assert.notEqual(copy.steps, todo.steps);
    assert.notEqual(copy.steps[0], todo.steps[0]);
    assert.deepEqual(copy.steps, todo.steps);
  }
  assert.equal("steps" in completeTodo({ id: 2 }), false);
});

test("stepProgress と hasRemainingSteps", () => {
  const mk = (...d) => ({ steps: d.map((done) => ({ title: "s", done })) });
  assert.deepEqual(stepProgress({ id: 1 }), { done: 0, total: 0 });
  assert.equal(hasRemainingSteps({ id: 1 }), false);
  assert.deepEqual(stepProgress(mk(true, true)), { done: 2, total: 2 });
  assert.equal(hasRemainingSteps(mk(true, true)), false);
  assert.deepEqual(stepProgress(mk(true, false, true)), { done: 2, total: 3 });
  assert.equal(hasRemainingSteps(mk(true, false, true)), true);
  for (const bad of [null, undefined, { steps: null }]) {
    assert.deepEqual(stepProgress(bad), { done: 0, total: 0 });
    assert.equal(hasRemainingSteps(bad), false);
  }
});
