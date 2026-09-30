// -----------------------------------------------------------------------------
// SPEECH-TO-TEXT SERVICE
// This is the ONLY file that talks to a speech recognizer. It gives VoiceInput
// (the microphone UI) one small interface, so the actual engine underneath can
// be swapped later without touching any component:
//
//   const recognizer = createSpeechRecognizer("ur");
//   recognizer.supported                -> true/false, check before showing the mic
//   recognizer.start({ onInterim, onFinal, onError, onEnd })
//   recognizer.stop()
//
// TWO ENGINES:
//   "browser"  (default) - uses the Web Speech API already built into Chrome
//                            and Edge. Works today, with no back end.
//   "api"      - placeholder for the team's own Urdu/English speech service.
//                Wire it up in callApiSpeechRecognizer() below once it exists,
//                then set VITE_STT_PROVIDER=api in .env.
//
// LANGUAGE CODES: this file expects the app's own codes ("en", "ur") and maps
// them to whatever the engine needs (BCP-47 tags for the browser engine).
// -----------------------------------------------------------------------------

const PROVIDER = import.meta.env.VITE_STT_PROVIDER || "browser";

const BROWSER_LANG_TAGS = {
  en: "en-US",
  ur: "ur-PK",
  roman_urdu: "en-IN",
};

function getBrowserEngine() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

// Some browsers advertise the API but only truly support English; Urdu
// recognition quality varies by device. We still expose it — the person can
// always fall back to typing or edit the result — but Describe.jsx uses this
// to decide whether to offer the Urdu option in the language picker.
export function isUrduSpeechLikelySupported() {
  const ua = navigator.userAgent || "";
  return /Chrome|Edg/.test(ua); // Chrome and Edge carry the widest language list
}

function browserRecognizer(langCode) {
  const Engine = getBrowserEngine();
  let recognition = null;
  let stoppedByUser = false;

  return {
    supported: !!Engine,

    start({ onInterim, onFinal, onError, onEnd }) {
      if (!Engine) {
        onError({ type: "unsupported" });
        return;
      }
      stoppedByUser = false;
      recognition = new Engine();
      recognition.lang = BROWSER_LANG_TAGS[langCode] || langCode;
      recognition.continuous = true;
      recognition.interimResults = true;

      let finalText = "";

      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += (finalText ? " " : "") + chunk.trim();
          } else {
            interim += chunk;
          }
        }
        onInterim((finalText + " " + interim).trim());
      };

      recognition.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          onError({ type: "permission-denied" });
        } else if (event.error === "no-speech") {
          onError({ type: "no-speech" });
        } else {
          onError({ type: "unknown", detail: event.error });
        }
      };

      recognition.onend = () => {
        // onend fires both after a normal stop and after some errors;
        // only report the final transcript when the user actually asked to stop.
        if (stoppedByUser) onFinal(finalText.trim());
        onEnd();
      };

      try {
        recognition.start();
      } catch (error) {
        onError({ type: "unknown", detail: String(error) });
      }
    },

    stop() {
      stoppedByUser = true;
      recognition?.stop();
    },

    cancel() {
      stoppedByUser = false;
      recognition?.abort();
    },
  };
}

// eslint-disable-next-line no-unused-vars
function apiRecognizer(langCode) {
  // ---- Fill this in once the team's speech-to-text endpoint exists ----
  // Expected shape, to match the rest of services/api.js:
  //   POST /api/speech-to-text   (multipart audio, field "audio", plus "language")
  //   returns { text: "..." }
  //
  // A typical implementation records audio with MediaRecorder, then on stop()
  // uploads the recorded blob and calls onFinal(data.text).
  return {
    supported: false,
    start({ onError }) {
      onError({ type: "unsupported" });
    },
    stop() {},
  };
}

export function createSpeechRecognizer(langCode) {
  return PROVIDER === "api" ? apiRecognizer(langCode) : browserRecognizer(langCode);
}
