// Todo の項目の形と確かめ。アプリ（サーバーとクライアント）の両方から使う。

export const MAX_TITLE_LENGTH = 100;
export const MAX_TAGS = 5;
export const MAX_TAG_LENGTH = 20;

/** YYYY-MM-DD の形で、実在する日付なら true */
export function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
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

/** 入力から Todo を作る。確かめに落ちたら Error を投げる */
export function createTodo(input, { id, now = new Date() } = {}) {
  const problems = [...validateTitle(input?.title), ...validateTags(input?.tags)];
  throwIfProblems(problems);
  const todo = {
    id,
    title: input.title.trim(),
    done: false,
    createdAt: now.toISOString(),
  };
  const tags = normalizeTags(input.tags ?? []);
  if (tags.length > 0) {
    todo.tags = tags;
  }
  return todo;
}

/** 完了にした写しを返す（元は変えない） */
export function completeTodo(todo) {
  const done = { ...todo, done: true };
  if (Array.isArray(todo.tags)) {
    done.tags = [...todo.tags];
  }
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
  throwIfProblems(validateTags(tags));
  const { tags: _old, ...rest } = todo;
  const normalized = normalizeTags(tags ?? []);
  if (normalized.length > 0) {
    rest.tags = normalized;
  }
  return rest;
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
