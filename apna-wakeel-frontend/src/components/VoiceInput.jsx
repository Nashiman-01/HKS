import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import Button from "./Button.jsx";
import { createSpeechRecognizer, isUrduSpeechLikelySupported } from "../services/speech.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

// Speak-your-problem panel, used inside Describe.jsx.
//
// States:
//   idle        -> just the "Or speak your problem" row with a mic button
//   listening   -> recording, with a pulsing dot and the live transcript
//   review      -> recording stopped; shows the final text with Edit / Use
//   permission  -> the browser blocked the microphone
//   unsupported -> this browser has no speech recognition at all
//
// onAppend(text) is called only when the person taps "Use this text" — the
// panel never changes the problem textarea on its own.

export default function VoiceInput({ onAppend }) {
  const { t, language } = useLanguage();
  const [speechLang, setSpeechLang] = useState(language === "ur" ? "ur" : "en");
  const [status, setStatus] = useState("idle");
  const [liveText, setLiveText] = useState("");
  const [finalText, setFinalText] = useState("");
  const recognizerRef = useRef(null);
  const supportedRef = useRef(null);
  const liveTextRef = useRef(""); // latest interim text, for onEnd's fallback (state can be stale in that closure)

  // Keep the speech language in step with the interface language until the
  // person picks one themselves.
  useEffect(() => {
    setSpeechLang(language === "ur" ? "ur" : "en");
  }, [language]);

  if (supportedRef.current === null) {
    supportedRef.current = createSpeechRecognizer(speechLang).supported;
  }

  // If this browser has no speech recognition at all, say so up front instead
  // of leaving a mic button that can never be pressed.
  useEffect(() => {
    if (supportedRef.current === false) setStatus("unsupported");
  }, []);

  function startListening() {
    const recognizer = createSpeechRecognizer(speechLang);
    if (!recognizer.supported) {
      setStatus("unsupported");
      return;
    }
    recognizerRef.current = recognizer;
    setLiveText("");
    setFinalText("");
    liveTextRef.current = "";
    setStatus("listening");

    recognizer.start({
      onInterim: (text) => {
        liveTextRef.current = text;
        setLiveText(text);
      },
      onFinal: (text) => {
        setFinalText(text);
        setStatus("review");
      },
      onError: (error) => {
        if (error.type === "permission-denied") setStatus("permission");
        else if (error.type === "unsupported") setStatus("unsupported");
        else if (error.type === "no-speech") setStatus("idle");
        else setStatus("error");
      },
      onEnd: () => {
        // If recognition stopped on its own before onFinal fired, fall back
        // to whatever was heard so far rather than losing it silently.
        setStatus((current) => (current === "listening" ? "review" : current));
        setFinalText((current) => current || liveTextRef.current);
      },
    });
  }

  function stopListening() {
    recognizerRef.current?.stop();
  }

  function reset() {
    setStatus("idle");
    setLiveText("");
    setFinalText("");
  }

  function useTranscript() {
    if (finalText.trim()) onAppend(finalText.trim());
    reset();
  }

  const showLangPicker = status === "idle";

  return (
    <div className="voice-input" role="group" aria-label={t("voice.speak")}>
      {status === "idle" && (
        <div className="voice-row">
          <button
            type="button"
            className="voice-mic-btn"
            onClick={startListening}
            aria-label={t("voice.start")}
            disabled={supportedRef.current === false}
          >
            <Icon name="mic" size={20} />
          </button>
          <span className="voice-row-label">{t("voice.speak")}</span>

          {showLangPicker && isUrduSpeechLikelySupported() && (
            <div className="voice-lang" role="radiogroup" aria-label={t("voice.language")}>
              <button
                type="button"
                role="radio"
                aria-checked={speechLang === "en"}
                className={speechLang === "en" ? "active" : ""}
                onClick={() => setSpeechLang("en")}
              >
                English
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={speechLang === "ur"}
                className={speechLang === "ur" ? "active" : ""}
                onClick={() => setSpeechLang("ur")}
              >
                اردو
              </button>
            </div>
          )}
        </div>
      )}

      {status === "listening" && (
        <div className="voice-panel voice-panel-live">
          <div className="voice-live-head">
            <span className="voice-rec-dot" aria-hidden="true" />
            <span>{t("voice.listening")}</span>
            <span className="voice-bars" aria-hidden="true">
              <span /><span /><span /><span />
            </span>
          </div>
          <p className="voice-live-text" aria-live="polite">
            {liveText || "…"}
          </p>
          <Button variant="secondary" icon="stop" onClick={stopListening}>
            {t("voice.stop")}
          </Button>
        </div>
      )}

      {status === "review" && (
        <div className="voice-panel voice-panel-review">
          <p className="voice-panel-label">{t("voice.transcriptLabel")}</p>
          {finalText.trim() ? (
            <textarea
              className="voice-transcript-box"
              rows={3}
              value={finalText}
              onChange={(e) => setFinalText(e.target.value)}
              aria-label={t("voice.edit")}
            />
          ) : (
            <p className="hint">{t("voice.empty")}</p>
          )}
          <div className="btn-row">
            <Button onClick={useTranscript} disabled={!finalText.trim()}>
              {t("voice.use")}
            </Button>
            <Button variant="secondary" onClick={reset}>
              {t("voice.discard")}
            </Button>
          </div>
        </div>
      )}

      {status === "permission" && (
        <div className="voice-panel voice-panel-error" role="alert">
          <Icon name="micOff" size={18} />
          <div>
            <p className="voice-panel-label">{t("voice.permissionTitle")}</p>
            <p className="hint">{t("voice.permissionText")}</p>
            <Button variant="secondary" size="sm" onClick={reset}>
              {t("common.tryAgain")}
            </Button>
          </div>
        </div>
      )}

      {status === "unsupported" && (
        <div className="voice-panel voice-panel-error" role="note">
          <Icon name="micOff" size={18} />
          <div>
            <p className="voice-panel-label">{t("voice.unsupportedTitle")}</p>
            <p className="hint">{t("voice.unsupportedText")}</p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="voice-panel voice-panel-error" role="alert">
          <Icon name="micOff" size={18} />
          <div>
            <p className="hint">{t("voice.genericError")}</p>
            <Button variant="secondary" size="sm" onClick={reset}>
              {t("common.tryAgain")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
