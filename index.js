// Todo の項目の形と確かめ。アプリ（サーバーとクライアント）の両方から使う。

export const MAX_TITLE_LENGTH = 100;

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
  const problems = validateTitle(input?.title);
  if (problems.length > 0) {
    const error = new Error(problems.join("。"));
    error.problems = problems;
    throw error;
  }
  return {
    id,
    title: input.title.trim(),
    done: false,
    createdAt: now.toISOString(),
  };
}

/** 完了にした写しを返す（元は変えない） */
export function completeTodo(todo) {
  return { ...todo, done: true };
}
