// Todo の項目の形と確かめ。アプリ（サーバーとクライアント）の両方から使う。

export const MAX_TITLE_LENGTH = 100;

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
  ];
  if (problems.length > 0) {
    const error = new Error(problems.join("。"));
    error.problems = problems;
    throw error;
  }
  const todo = {
    id,
    title: input.title.trim(),
    done: false,
    createdAt: now.toISOString(),
  };
  if (typeof input.dueDate === "string" && input.dueDate !== "") {
    todo.dueDate = input.dueDate;
  }
  return todo;
}

/** 完了にした写しを返す（元は変えない） */
export function completeTodo(todo) {
  return { ...todo, done: true };
}
