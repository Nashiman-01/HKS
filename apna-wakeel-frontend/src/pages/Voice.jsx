import { useEffect, useRef, useState } from "react";
import Icon from "../components/Icon.jsx";
import { languages, useLanguage } from "../i18n/LanguageContext.jsx";
import { createSpeechRecognizer } from "../services/speech.js";

const speechCode = { en: "en", ur: "ur", roman_urdu: "roman_urdu" };
const speechOutputTags = { en: "en-US", ur: "ur-PK", roman_urdu: "en-IN" };

export default function Voice({ conversation, conversations, conversationId, sending, onSend, onNewConversation, onSelectConversation, onExit, error }) {
  const { t, voiceLanguage, setVoiceLanguage } = useLanguage();
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [liveText, setLiveText] = useState("");
  const recognizerRef = useRef(null);
  const cancelRef = useRef(false);
  const sendingRef = useRef(false);
  const liveTextRef = useRef("");

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  useEffect(() => () => recognizerRef.current?.cancel?.(), []);

  function startListening() {
    const recognizer = createSpeechRecognizer(speechCode[voiceLanguage]);
    if (!recognizer.supported) {
      setStatus("unsupported");
      return;
    }
    cancelRef.current = false;
    recognizerRef.current = recognizer;
    setTranscript("");
    setLiveText("");
    liveTextRef.current = "";
    setStatus("listening");
    recognizer.start({
      onInterim: (text) => {
        liveTextRef.current = text;
        setLiveText(text);
      },
      onFinal: (text) => {
        setTranscript(text);
        setStatus("review");
      },
      onError: (speechError) => {
        setStatus(speechError.type === "permission-denied" ? "permission" : speechError.type === "unsupported" ? "unsupported" : speechError.type === "no-speech" ? "empty" : "error");
      },
      onEnd: () => {
        if (cancelRef.current) {
          setStatus("idle");
          setLiveText("");
        } else {
          setStatus((current) => current === "listening" ? "review" : current);
          setTranscript((current) => current || liveTextRef.current);
        }
      },
    });
  }

  function stopListening() {
    recognizerRef.current?.stop();
    setStatus("processing");
  }

  function cancelListening() {
    cancelRef.current = true;
    recognizerRef.current?.cancel?.();
    setStatus("idle");
    setLiveText("");
    liveTextRef.current = "";
    setTranscript("");
  }

  async function sendTranscript() {
    if (!transcript.trim() || sending || sendingRef.current) return;
    sendingRef.current = true;
    try {
      const sent = await onSend(transcript.trim());
      if (sent) {
        setTranscript("");
        setLiveText("");
        liveTextRef.current = "";
        setStatus("idle");
      }
    } finally {
      sendingRef.current = false;
    }
  }

  function speakResponse(text) {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      setStatus("tts-unavailable");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechOutputTags[voiceLanguage] || "en-US";
    utterance.onerror = (event) => {
      if (import.meta.env.DEV) console.error("Browser speech synthesis failed:", event.error);
      setStatus("tts-error");
    };
    window.speechSynthesis.speak(utterance);
  }

  return (
    <section className="workspace-page voice-page" aria-labelledby="voice-title">
      <header className="workspace-page-heading">
        <p className="app-eyebrow">{t("chat.workspace")}</p>
        <h2 id="voice-title">{t("voice.title")}</h2>
        <p>{t("voice.intro")}</p>
        <button className="app-button app-button-quiet voice-exit" type="button" onClick={onExit}><Icon name="message" size={17} />{t("voice.exit")}</button>
      </header>

      <section className="voice-workspace" aria-label={t("voice.controls")}>
        <div className="voice-language-control">
          <label htmlFor="voice-language">{t("voice.language")}</label>
          <select id="voice-language" value={voiceLanguage} disabled={status === "listening" || status === "processing"} onChange={(event) => setVoiceLanguage(event.target.value)}>
            {Object.values(languages).map((language) => <option key={language.code} value={language.code}>{language.name}</option>)}
          </select>
        </div>

        <div className="voice-main-control">
          {status === "idle" && (
            <button type="button" className="voice-start-button" onClick={startListening}>
              <span className="voice-start-icon"><Icon name="mic" size={25} /></span>
              <span>{t("voice.start")}</span>
            </button>
          )}
          {status === "listening" && (
            <div className="voice-listening-state" role="status" aria-live="polite">
              <span className="voice-rec-dot" aria-hidden="true" />
              <strong>{t("voice.listening")}</strong>
              <p>{liveText || t("voice.speakNow")}</p>
              <div className="voice-control-actions">
                <button className="app-button app-button-primary" type="button" onClick={stopListening}><Icon name="stop" size={17} />{t("voice.stop")}</button>
                <button className="app-button app-button-quiet" type="button" onClick={cancelListening}><Icon name="close" size={17} />{t("voice.cancel")}</button>
              </div>
            </div>
          )}
          {status === "processing" && <p className="voice-status-line" role="status">{t("voice.processing")}</p>}
          {status === "review" && (
            <div className="voice-transcript-review">
              <label htmlFor="voice-transcript">{t("voice.transcriptLabel")}</label>
              {transcript ? (
                <textarea id="voice-transcript" rows={5} value={transcript} onChange={(event) => setTranscript(event.target.value)} />
              ) : <p className="voice-empty-transcript">{t("voice.empty")}</p>}
              <div className="voice-control-actions">
                <button className="app-button app-button-primary" type="button" disabled={!transcript.trim() || sending} onClick={sendTranscript}>
                  <Icon name="send" size={17} />{sending ? t("voice.processing") : t("voice.send")}
                </button>
                <button className="app-button app-button-quiet" type="button" onClick={() => { setTranscript(""); setStatus("idle"); }}>
                  <Icon name="restart" size={17} />{t("voice.recordAgain")}
                </button>
              </div>
            </div>
          )}
          {(status === "unsupported" || status === "permission" || status === "error" || status === "empty") && (
            <div className="voice-unavailable" role={status === "error" || status === "permission" ? "alert" : "status"}>
              <Icon name="micOff" size={21} />
              <div>
                <strong>{t(status === "permission" ? "voice.permissionTitle" : status === "unsupported" ? "voice.unsupportedTitle" : status === "empty" ? "voice.empty" : "voice.error")}</strong>
                <p>{t(status === "permission" ? "voice.permissionText" : status === "empty" ? "voice.emptyHint" : "voice.unsupportedText")}</p>
              </div>
              <button className="app-button app-button-quiet" type="button" onClick={() => setStatus("idle")}>{t("common.tryAgain")}</button>
            </div>
          )}
        </div>

        <div className="voice-service-note">
          <Icon name="info" size={18} />
          <p>{t("voice.ttsBrowserNote")}</p>
        </div>
        {(status === "tts-unavailable" || status === "tts-error") && <p className="voice-chat-error" role="alert">{t(status === "tts-unavailable" ? "voice.ttsUnavailable" : "voice.ttsError")}</p>}
        {error && <p className="voice-chat-error" role="alert">{t(error)}</p>}
      </section>

      <section className="voice-history" aria-labelledby="voice-history-title">
        <div className="dashboard-section-head">
          <div><p className="app-eyebrow">{t("chat.workspace")}</p><h2 id="voice-history-title">{t("voice.history")}</h2></div>
          <div className="voice-history-actions">
            <label className="visually-hidden" htmlFor="voice-conversation">{t("voice.chooseConversation")}</label>
            <select id="voice-conversation" value={conversationId} onChange={(event) => onSelectConversation(event.target.value)} disabled={conversations.length === 0}>
              <option value="">{t("voice.chooseConversation")}</option>
              {conversations.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}
            </select>
            <button className="app-button app-button-quiet" type="button" onClick={onNewConversation}><Icon name="plus" size={17} />{t("chat.newChat")}</button>
          </div>
        </div>
        {conversation?.messages?.length ? (
          <ol className="voice-history-list">
            {conversation.messages.map((message) => <li className={`voice-history-message voice-history-${message.role}`} key={message.id}><strong>{message.role === "user" ? t("chat.you") : t("chat.assistant")}</strong><p>{message.content}</p>{message.role === "assistant" && <button className="app-button app-button-quiet" type="button" onClick={() => speakResponse(message.content)} disabled={!message.content}><Icon name="volume" size={17} />{t("voice.speakResponse")}</button>}</li>)}
          </ol>
        ) : <p className="dashboard-no-recent">{t("chat.noHistory")}</p>}
      </section>
      <p className="workspace-disclaimer">{t("settings.disclaimer")}</p>
    </section>
  );
}
