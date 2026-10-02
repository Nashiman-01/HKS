import assert from "node:assert/strict";
import test from "node:test";

import { sendRecognizedTranscript } from "../src/services/voiceFlow.js";

test("recognized text uses the existing send callback with its selected language", async () => {
  const calls = [];
  const result = await sendRecognizedTranscript("  Mera bhai zameen rok raha hai.  ", "roman_urdu", async (...args) => {
    calls.push(args);
    return { success: true };
  });

  assert.deepEqual(calls, [["Mera bhai zameen rok raha hai.", "roman_urdu"]]);
  assert.deepEqual(result, { success: true });
});

test("empty recognized text is not submitted", () => {
  let submitted = false;
  const result = sendRecognizedTranscript("  \n ", "en", () => { submitted = true; });

  assert.equal(result, false);
  assert.equal(submitted, false);
});