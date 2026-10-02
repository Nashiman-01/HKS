import assert from "node:assert/strict";
import test from "node:test";

import { copyTextToClipboard, getCopyableAnswerText } from "../src/services/clipboard.js";

test("copy text preserves answer formatting and excludes official references", () => {
  const answer = "Case summary:\nA tenant was locked out.\n\nYour to-do list:\n1. Keep the lease.\n- Contact the local authority.\n\nOfficial legal references:\n- Act, section 1\n  https://official.example/law\n\nDisclaimer: General information.";
  const copied = getCopyableAnswerText(answer, "Official legal references");

  assert.equal(copied, "Case summary:\nA tenant was locked out.\n\nYour to-do list:\n1. Keep the lease.\n- Contact the local authority.\n\nDisclaimer: General information.");
});

test("clipboard API receives the complete copyable answer text", async () => {
  let copiedText = "";
  const result = await copyTextToClipboard("Answer:\n1. First step", {
    clipboard: { writeText: async (text) => { copiedText = text; } },
    documentRef: null,
  });

  assert.equal(result, true);
  assert.equal(copiedText, "Answer:\n1. First step");
});

test("clipboard rejection falls back to document copy command", async () => {
  let selectedText = "";
  const textArea = {
    style: {},
    setAttribute() {},
    select() { selectedText = this.value; },
  };
  const documentRef = {
    body: {
      appendChild() {},
      removeChild() {},
    },
    createElement: () => textArea,
    execCommand: (command) => command === "copy" && selectedText === "Fallback answer",
  };

  assert.equal(await copyTextToClipboard("Fallback answer", {
    clipboard: { writeText: async () => { throw new Error("blocked"); } },
    documentRef,
  }), true);
});