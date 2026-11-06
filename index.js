// Todo の項目の形と確かめ。アプリ（サーバーとクライアント）の両方から使う。

export const MAX_TITLE_LENGTH = 100;
export const MAX_TAGS = 5;
export const MAX_TAG_LENGTH = 20;
export const MAX_STEPS = 20;
export const MAX_STEP_TITLE_LENGTH = 100;

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD の形で、実在する日付なら true */
export function isIsoDate(value) {
  if (typeof value !== "string" || !DATE_SHAPE.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** 題を確かめる。問題があれば日本語の文の並びを返す（なければ空） */
export function validateTitle(title) {
  const problems = [];
  if (typeof title !== "string" || title.trim() === "") {
    problems.push("題が空です");
    return problems;
  }
  if (title.trim().length > MAX_TITLE_LENGTH) {
    problems.push(`題は${MAX_TITLE_LENGTH}文字までです`);
  }
  return problems;
}

/** now を Asia/Tokyo で見た日付を YYYY-MM-DD で返す */
export function todayInJapan(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** 期限を確かめる。問題があれば日本語の文の並びを返す（なければ空。理由は多くて1つ） */
export function validateDueDate(dueDate, today) {
  if (dueDate === undefined || dueDate === null || dueDate === "") {
    return [];
  }
  if (typeof dueDate !== "string" || !DATE_SHAPE.test(dueDate)) {
    return ["期限は YYYY-MM-DD の形で書いてください"];
  }
  if (!isIsoDate(dueDate)) {
    return ["期限の日付が実在しません"];
  }
  if (isIsoDate(today) && dueDate < today) {
    return ["期限は今日以降の日付にしてください"];
  }
  return [];
}

/** 未完了で期限が today より前なら true。時計は読まず、例外も投げない */
export function isOverdue(todo, today) {
  if (todo === null || todo === undefined || todo.done === true) {
    return false;
  }
  const { dueDate } = todo;
  return (
    isIsoDate(dueDate) && isIsoDate(today) && typeof dueDate === "string" && dueDate < today
  );
}

/** 入力から Todo を作る。確かめに落ちたら Error を投げる */
export function createTodo(input, { id, now = new Date() } = {}) {
  const problems = [
    ...validateTitle(input?.title),
    ...validateDueDate(input?.dueDate, todayInJapan(now)),
    ...validateTags(input?.tags),
    ...validateSteps(input?.steps),
  ];
  throwIfProblems(problems);
  const todo = {
    id,
    title: input.title.trim(),
    done: false,
    createdAt: now.toISOString(),
  };
  if (typeof input.dueDate === "string" && input.dueDate !== "") {
    todo.dueDate = input.dueDate;
  }
  const tags = normalizeTags(input.tags ?? []);
  if (tags.length > 0) {
    todo.tags = tags;
  }
  addSteps(todo, normalizeSteps(input.steps ?? []));
  return todo;
}

/** 完了にした写しを返す（元は変えない） */
export function completeTodo(todo) {
  const done = { ...todo, done: true };
  if (Array.isArray(todo?.tags)) {
    done.tags = [...todo.tags];
  }
  copyStepsInto(done, todo);
  return done;
}

// ---- タグと絞り込み ----

/** 半角の A〜Z だけ小文字にする（全角の英字は変えない） */
function lowerAscii(text) {
  return text.replace(/[A-Z]/g, (c) => c.toLowerCase());
}

function throwIfProblems(problems) {
  if (problems.length > 0) {
    const error = new Error(problems.join("。"));
    error.problems = problems;
    throw error;
  }
}

/** タグ1つを整える（前後の空白を除き、半角の A〜Z だけ小文字） */
export function normalizeTag(tag) {
  return lowerAscii(String(tag).trim());
}

/** タグの並びを整え、同じタグは最初の1つにまとめる */
export function normalizeTags(tags) {
  return [...new Set(tags.map(normalizeTag))];
}

/** タグの並びを確かめる。問題があれば日本語の文の並びを返す（なければ空） */
export function validateTags(tags) {
  if (tags === undefined || tags === null) {
    return [];
  }
  if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== "string")) {
    return ["タグは文字の並びで渡してください"];
  }
  const normalized = normalizeTags(tags);
  const problems = [];
  if (normalized.some((tag) => tag === "")) {
    problems.push("タグが空です");
  }
  if (normalized.some((tag) => tag.length > MAX_TAG_LENGTH)) {
    problems.push(`タグは${MAX_TAG_LENGTH}文字までです`);
  }
  if (normalized.some((tag) => tag.includes(","))) {
    problems.push("タグに「,」は使えません");
  }
  if (normalized.length > MAX_TAGS) {
    problems.push(`タグは${MAX_TAGS}個までです`);
  }
  return problems;
}

/** カンマ区切りの入力をタグの並びに分ける（空の片は読み飛ばす） */
export function parseTagInput(text) {
  if (typeof text !== "string" || text.trim() === "") {
    return [];
  }
  return text
    .split(",")
    .map((piece) => piece.trim())
    .filter((piece) => piece !== "");
}

/** タグを全部入れ替えた写しを返す（元は変えない） */
export function setTodoTags(todo, tags) {
  if (tags === undefined || tags === null) {
    throwIfProblems(["タグは文字の並びで渡してください"]);
  }
  throwIfProblems(validateTags(tags));
  const { tags: _old, ...rest } = todo;
  const normalized = normalizeTags(tags);
  if (normalized.length > 0) {
    rest.tags = normalized;
  }
  copyStepsInto(rest, todo);
  return rest;
}

// ---- 手順 ----

const STEPS_TYPE_PROBLEM = "手順は題と済んだかを持つ物の並びで渡してください";

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 手順の並びを確かめる。問題があれば日本語の文の並びを返す（なければ空） */
export function validateSteps(steps) {
  if (steps === undefined || steps === null) {
    return [];
  }
  if (
    !Array.isArray(steps) ||
    steps.some((step) => !isPlainObject(step) || typeof step.title !== "string")
  ) {
    return [STEPS_TYPE_PROBLEM];
  }
  const problems = [];
  if (steps.length > MAX_STEPS) {
    problems.push(`手順は${MAX_STEPS}個までです`);
  }
  if (steps.some((step) => step.title.trim() === "")) {
    problems.push("題が空の手順があります");
  }
  if (steps.some((step) => step.title.trim().length > MAX_STEP_TITLE_LENGTH)) {
    problems.push(`手順の題は${MAX_STEP_TITLE_LENGTH}文字までです`);
  }
  if (steps.some((step) => step.done !== undefined && typeof step.done !== "boolean")) {
    problems.push("手順の済んだかは真偽で渡してください");
  }
  return problems;
}

/** 確かめを通った手順の並びを、{ title, done } だけの新しい物にする */
export function normalizeSteps(steps) {
  return steps.map((step) => ({ title: step.title.trim(), done: step.done === true }));
}

/** 手順が1つ以上のときだけ steps の欄を付ける */
function addSteps(todo, steps) {
  if (steps.length > 0) {
    todo.steps = steps;
  }
}

/** from の steps が並びなら、並びと中の物を新しく作って target に写す */
function copyStepsInto(target, from) {
  if (Array.isArray(from?.steps)) {
    target.steps = from.steps.map((step) => (isPlainObject(step) ? { ...step } : step));
  }
}

/** 手順を全部入れ替えた写しを返す（元は変えない） */
export function setTodoSteps(todo, steps) {
  if (steps === undefined || steps === null) {
    throwIfProblems([STEPS_TYPE_PROBLEM]);
  }
  throwIfProblems(validateSteps(steps));
  const { steps: _old, ...rest } = todo;
  if (Array.isArray(rest.tags)) {
    rest.tags = [...rest.tags];
  }
  addSteps(rest, normalizeSteps(steps));
  return rest;
}

/** 手順の進み具合を返す */
export function stepProgress(todo) {
  const steps = Array.isArray(todo?.steps) ? todo.steps : [];
  return { done: steps.filter((step) => step?.done === true).length, total: steps.length };
}

/** 済んでいない手順が1つ以上あれば true */
export function hasRemainingSteps(todo) {
  const steps = Array.isArray(todo?.steps) ? todo.steps : [];
  return steps.some((step) => step?.done !== true);
}

/** 素の絞り込みの条件を読む。{ filter, problems } を返す */
export function parseFilter(raw) {
  const { status, tag, text } = raw ?? {};
  for (const value of [status, tag, text]) {
    if (value !== undefined && value !== null && typeof value !== "string") {
      return { filter: null, problems: ["絞り込みの条件は文字で渡してください"] };
    }
  }
  const problems = [];
  const statusValue = status === undefined || status === null || status === "" ? "all" : status;
  if (!["open", "done", "all"].includes(statusValue)) {
    problems.push("状態は open・done・all のどれかです");
  }
  const tagValue = tag === undefined || tag === null ? "" : normalizeTag(tag);
  if (tagValue.length > MAX_TAG_LENGTH) {
    problems.push(`タグは${MAX_TAG_LENGTH}文字までです`);
  }
  if (tagValue.includes(",")) {
    problems.push("タグに「,」は使えません");
  }
  if (problems.length > 0) {
    return { filter: null, problems };
  }
  const textValue = text === undefined || text === null ? "" : text.trim();
  return {
    filter: {
      status: statusValue,
      tag: tagValue === "" ? null : tagValue,
      text: textValue === "" ? null : textValue,
    },
    problems: [],
  };
}

/** 項目が条件をすべて満たせば true */
export function matchesFilter(todo, filter) {
  if (filter.status === "open" && todo.done === true) {
    return false;
  }
  if (filter.status === "done" && todo.done !== true) {
    return false;
  }
  if (filter.tag != null && !(Array.isArray(todo.tags) && todo.tags.includes(filter.tag))) {
    return false;
  }
  if (filter.text != null && !lowerAscii(String(todo.title)).includes(lowerAscii(filter.text))) {
    return false;
  }
  return true;
}
