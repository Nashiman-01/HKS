import assert from "node:assert/strict";
import test from "node:test";

import { cleanSpeechText, createSpeechRecognizer, speakText, splitSpeechText, stopSpeaking } from "../src/services/speech.js";

class FakeRecognition {
  static instances = [];

  constructor() {
    FakeRecognition.instances.push(this);
  }

  start() {}
  stop() { this.stopCalled = true; }
  abort() { this.abortCalled = true; }
}

function withWindow(value, callback) {
  const previousWindow = globalThis.window;
  globalThis.window = value;
  try {
    callback();
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
}

function resultChunk(transcript, isFinal) {
  const chunk = [{ transcript }];
  chunk.isFinal = isFinal;
  return chunk;
}

test("recognition emits one final transcript on end and preserves locale", () => {
  FakeRecognition.instances = [];
  withWindow({ SpeechRecognition: FakeRecognition }, () => {
    const recognizer = createSpeechRecognizer("roman_urdu");
    const finalTexts = [];
    const interimTexts = [];
    recognizer.start({
      onInterim: (text) => interimTexts.push(text),
      onFinal: (text) => finalTexts.push(text),
    });
    const instance = FakeRecognition.instances[0];
    assert.equal(instance.lang, "en-IN");
    instance.onresult({ results: [resultChunk("Mera bhai", true)] });
    instance.onend();
    instance.onend();
    assert.deepEqual(finalTexts, ["Mera bhai"]);
    assert.deepEqual(interimTexts, ["Mera bhai"]);
  });
});

test("cancellation aborts recognition without delivering a transcript", () => {
  FakeRecognition.instances = [];
  withWindow({ SpeechRecognition: FakeRecognition }, () => {
    const recognizer = createSpeechRecognizer("en");
    const finalTexts = [];
    recognizer.start({ onFinal: (text) => finalTexts.push(text) });
    recognizer.cancel();
    const instance = FakeRecognition.instances[0];
    instance.onresult({ results: [resultChunk("cancelled words", true)] });
    instance.onend();
    assert.equal(instance.abortCalled, true);
    assert.deepEqual(finalTexts, []);
  });
});

test("permission errors are reported without delivering a partial transcript", () => {
  FakeRecognition.instances = [];
  withWindow({ SpeechRecognition: FakeRecognition }, () => {
    const recognizer = createSpeechRecognizer("ur");
    const errors = [];
    const finalTexts = [];
    recognizer.start({
      onError: (error) => errors.push(error),
      onFinal: (text) => finalTexts.push(text),
    });
    const instance = FakeRecognition.instances[0];
    assert.equal(instance.lang, "ur-PK");
    instance.onresult({ results: [resultChunk("جزوی", true)] });
    instance.onerror({ error: "not-allowed" });
    instance.onend();
    assert.equal(errors[0].type, "permission-denied");
    assert.deepEqual(finalTexts, []);
  });
});

test("empty recognition does not emit a final transcript", () => {
  FakeRecognition.instances = [];
  withWindow({ SpeechRecognition: FakeRecognition }, () => {
    const recognizer = createSpeechRecognizer("en");
    const finalTexts = [];
    recognizer.start({ onFinal: (text) => finalTexts.push(text) });
    FakeRecognition.instances[0].onend();
    assert.deepEqual(finalTexts, []);
  });
});

test("normal end preserves a transcript that remained interim", () => {
  FakeRecognition.instances = [];
  withWindow({ SpeechRecognition: FakeRecognition }, () => {
    const recognizer = createSpeechRecognizer("en");
    const finalTexts = [];
    recognizer.start({ onFinal: (text) => finalTexts.push(text) });
    FakeRecognition.instances[0].onresult({ results: [resultChunk("My land dispute", false)] });
    FakeRecognition.instances[0].onend();
    assert.deepEqual(finalTexts, ["My land dispute"]);
  });
});

test("speech synthesis receives the answer text and selected language", () => {
  class FakeUtterance {
    constructor(text) { this.text = text; }
  }
  const utterances = [];
  const synthesis = {
    cancel() {},
    speak(utterance) { utterances.push(utterance); },
  };

  withWindow({ speechSynthesis: synthesis, SpeechSynthesisUtterance: FakeUtterance }, () => {
    const events = [];
    speakText("The legal answer.", "ur", {
      onStart: () => events.push("start"),
      onEnd: () => events.push("end"),
    });
    assert.equal(utterances[0].text, "The legal answer.");
    assert.equal(utterances[0].lang, "ur-PK");
    utterances[0].onstart();
    utterances[0].onend();
    assert.deepEqual(events, ["start", "end"]);
    stopSpeaking();
  });
});

test("starting a new spoken answer cancels the previous stream and ignores its callbacks", () => {
  class FakeUtterance {
    constructor(text) { this.text = text; }
  }
  const utterances = [];
  let cancelCount = 0;
  const synthesis = {
    cancel() { cancelCount += 1; },
    speak(utterance) { utterances.push(utterance); },
  };

  withWindow({ speechSynthesis: synthesis, SpeechSynthesisUtterance: FakeUtterance }, () => {
    const events = [];
    speakText("First answer", "en", { onEnd: () => events.push("first-ended") });
    speakText("Second answer", "en", { onStart: () => events.push("second-started") });
    utterances[0].onend();
    utterances[1].onstart();
    assert.equal(utterances.length, 2);
    assert.ok(cancelCount >= 2);
    assert.deepEqual(events, ["second-started"]);
    stopSpeaking();
  });
});

test("speech cleanup excludes case summaries, UI headings, references, and URLs", () => {
  const spoken = cleanSpeechText(
    "Case summary:\nThe user's landlord withheld a deposit.\n\nAI-generated guidance\nWhat we can tell you now:\nKeep the signed lease and request a written reason.\n\nYour to-do list:\n1. Save the payment receipt.\n\nOfficial legal references:\n- Act section 5\n  https://official.example/act\n\nThe available sources do not specify the deadline.",
    {
      caseSummary: "Case summary",
      aiGenerated: "AI-generated guidance",
      currentGuidance: "What we can tell you now",
      nextSteps: "Your to-do list",
      officialReferences: "Official legal references",
      uncertainty: "The available sources do not specify",
    },
  );

  assert.equal(spoken.includes("landlord withheld a deposit"), false);
  assert.equal(spoken.includes("AI-generated guidance"), false);
  assert.equal(spoken.includes("Official legal references"), false);
  assert.equal(spoken.includes("official.example"), false);
  assert.match(spoken, /Keep the signed lease and request a written reason/);
  assert.match(spoken, /Save the payment receipt/);
  assert.match(spoken, /sources do not specify the deadline/);
});

test("long spoken responses are split into bounded sequential chunks", () => {
  class FakeUtterance {
    constructor(text) { this.text = text; }
  }
  const utterances = [];
  let ended = 0;
  const answer = "A verified next step. ".repeat(35);
  const chunks = splitSpeechText(answer);

  withWindow({
    speechSynthesis: { cancel() {}, speak: (utterance) => utterances.push(utterance), getVoices: () => [] },
    SpeechSynthesisUtterance: FakeUtterance,
  }, () => {
    speakText(answer, "en", { onEnd: () => { ended += 1; } });
    assert.equal(utterances.length, 1);
    for (let index = 0; index < chunks.length; index += 1) {
      assert.ok(utterances[index].text.length <= 240);
      utterances[index].onend();
      assert.equal(utterances.length, Math.min(index + 2, chunks.length));
    }
    assert.equal(ended, 1);
    stopSpeaking();
  });
});

test("Urdu synthesis reports when the browser has no Urdu voice", () => {
  class FakeUtterance {
    constructor(text) { this.text = text; }
  }
  withWindow({
    speechSynthesis: { cancel() {}, speak() {}, getVoices: () => [{ lang: "en-US" }] },
    SpeechSynthesisUtterance: FakeUtterance,
  }, () => {
    assert.throws(() => speakText("اردو جواب", "ur"), { message: "tts-language-unavailable" });
  });
});