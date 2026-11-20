import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_DESCRIPTION_LENGTH, validateDescription } from "../index.js";

const TYPE = "説明は文字で書いてください";
const TOO_LONG = "説明は200文字までです";

test("未指定は空の並び", () => {
  assert.deepEqual(validateDescription(undefined), []);
  assert.deepEqual(validateDescription(null), []);
});

test("空文字は空の並び", () => {
  assert.deepEqual(validateDescription(""), []);
});

test("文字列でなければ理由を1つ", () => {
  for (const value of [5, {}, ["a"]]) {
    assert.deepEqual(validateDescription(value), [TYPE]);
  }
});

test("200文字ちょうどは空の並び（前後の空白は数えない）", () => {
  assert.equal(MAX_DESCRIPTION_LENGTH, 200);
  const text = "あ".repeat(200);
  assert.deepEqual(validateDescription(text), []);
  assert.deepEqual(validateDescription(`  ${text}　\n`), []);
});

test("201文字は理由を1つ", () => {
  assert.deepEqual(validateDescription("あ".repeat(201)), [TOO_LONG]);
});
