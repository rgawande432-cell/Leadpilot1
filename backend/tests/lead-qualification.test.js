import test from "node:test";
import assert from "node:assert/strict";
import { qualificationFromScore } from "../../supabase/functions/submit-lead/qualification.js";

test("high-score lead gets 24-hour owner reminder and review-only label", () => {
  const result = qualificationFromScore(70);
  assert.equal(result.status, "High");
  assert.equal(result.delayHours, 24);
  assert.match(result.note, /not verified genuine/i);
});

test("medium-score lead gets 48-hour owner reminder", () => {
  const result = qualificationFromScore(40);
  assert.equal(result.status, "Medium");
  assert.equal(result.delayHours, 48);
});

test("low-score lead gets 72-hour review reminder", () => {
  const result = qualificationFromScore(39);
  assert.equal(result.status, "Low");
  assert.equal(result.delayHours, 72);
  assert.match(result.note, /review details/i);
});

test("score is bounded before qualification", () => {
  assert.equal(qualificationFromScore(120).status, "High");
  assert.equal(qualificationFromScore(-5).status, "Low");
  assert.equal(qualificationFromScore("invalid").status, "Low");
});
