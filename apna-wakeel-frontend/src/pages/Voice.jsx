import { useEffect, useRef, useState } from "react";
import Icon from "../components/Icon.jsx";
import CopyAnswerButton from "../components/CopyAnswerButton.jsx";
import { languages, useLanguage } from "../i18n/LanguageContext.jsx";
import { createSpeechRecognizer, speakText, stopSpeaking } from "../services/speech.js";
import { sendRecognizedTranscript } from "../services/voiceFlow.js";

export default function Voice({ conversation, conversations, conversationId, sending, onSend, onNewConversation, onSelectConversation, onExit, error }) {
  const { t, language, setLanguage } = useLanguage();
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [liveText, setLiveText] = useState("");
  const recognizerRef = useRef(null);
  const recognitionSessionRef = useRef(null);
  const sendingRef = useRef(false);
  const voiceModeIdRef = useRef(0);
  const languageRef = useRef(language);
  const transcriptLanguageRef = useRef(language);
  languageRef.current = language;

  useEffect(() => () => {
    voiceModeIdRef.current += 1;
    const session = recognitionSessionRef.current;
    if (session) {
      session.cancelled = true;
      session.recognizer.cancel();
    }
    stopSpeaking();
  }, []);

  useEffect(() => {
    if (sendingRef.current) return;
    voiceModeIdRef.current += 1;
    const session = recognitionSessionRef.current;
    if (session) {
      session.cancelled = true;
      session.recognizer.cancel();
      recognitionSessionRef.current = null;
    }
    stopSpeaking();
    setTranscript("");
    setLiveText("");
    setStatus("idle");
  }, [conversationId]);

  function startListening() {
    if (["listening", "processing", "sending"].includes(status)) return;
    stopSpeaking();
    const selectedLanguage = language;
    const recognizer = createSpeechRecognizer(selectedLanguage);
    if (!recognizer.supported) {
      setStatus("unsupported");
      return;
    }
    const session = { recognizer, language: selectedLanguage, finalReceived: false, failed: false, cancelled: false };
    recognitionSessionRef.current = session;
    transcriptLanguageRef.current = selectedLanguage;
    recognizerRef.current = recognizer;
    setTranscript("");
    setLiveText("");
    setStatus("listening");
    recognizer.start({
      onInterim: (text) => {
        if (recognitionSessionRef.current === session && !session.cancelled) setLiveText(text);
      },
      onFinal: (text) => {
        if (recognitionSessionRef.current !== session || session.cancelled || session.finalReceived) return;
        session.finalReceived = true;
        const finalText = String(text || "").trim();
        if (!finalText) {
          setStatus("empty");
          return;
        }
        if (languageRef.current !== session.language) {
          setStatus("languageChanged");
          return;
        }
        setTranscript(finalText);
        setStatus("review");
        void sendTranscript(finalText, session.language);
      },
      onError: (speechError) => {
        if (recognitionSessionRef.current !== session || session.cancelled) return;
        session.failed = true;
        setStatus(speechError.type === "permission-denied" ? "permission" : speechError.type === "unsupported" ? "unsupported" : speechError.type === "no-speech" ? "empty" : speechError.type === "audio-capture" ? "audioCapture" : "error");
      },
      onEnd: () => {
        if (recognitionSessionRef.current !== session || session.cancelled) return;
        if (!session.finalReceived && !session.failed) setStatus("empty");
      },
    });
  }

  function stopListening() {
    recognizerRef.current?.stop();
    setStatus("processing");
  }

  function cancelListening() {
    const session = recognitionSessionRef.current;
    if (session) {
      session.cancelled = true;
      session.recognizer.cancel();
    }
    recognitionSessionRef.current = null;
    setStatus("idle");
    setLiveText("");
    setTranscript("");
  }

  async function sendTranscript(content = transcript, selectedLanguage = transcriptLanguageRef.current) {
    if (!String(content || "").trim() || sending || sendingRef.current) return;
    if (languageRef.current !== transcriptLanguageRef.current) {
      setStatus("languageChanged");
      return;
    }
    sendingRef.current = true;
    const currentVoiceModeId = voiceModeIdRef.current;
    setStatus("sending");
    try {
      const sent = await sendRecognizedTranscript(
        content,
        selectedLanguage,
        (content, submittedLanguage) => onSend(content, "", submittedLanguage),
      );
      if (voiceModeIdRef.current !== currentVoiceModeId) return;
      if (sent?.success) {
        setTranscript("");
        setLiveText("");
        if (sent.response) speakResponse(sent.response, selectedLanguage);
        else setStatus("idle");
      } else {
        setTranscript(String(content).trim());
        setStatus("sendError");
      }
    } catch {
      if (voiceModeIdRef.current !== currentVoiceModeId) return;
      setTranscript(String(content).trim());
      setStatus("sendError");
    } finally {
      sendingRef.current = false;
    }
  }

  function speakResponse(text, selectedLanguage = language) {
    setStatus("processing");
    try {
      speakText(text, selectedLanguage, {
        onStart: () => setStatus("speaking"),
        onEnd: () => setStatus("idle"),
        onError: () => setStatus("tts-error"),
      }, {
        caseSummary: t("chat.caseSummary"),
        aiGenerated: t("chat.aiGenerated"),
        currentGuidance: t("chat.currentGuidance"),
        nextSteps: t("chat.nextSteps"),
        documentsNeeded: t("chat.documentsNeeded"),
        optionalDetails: t("chat.optionalDetails"),
        officialReferences: t("chat.officialReferences"),
        uncertainty: t("chat.uncertainty"),
      });
    } catch (error) {
      setStatus(error.message === "tts-unavailable" ? "tts-unavailable" : error.message === "tts-language-unavailable" ? "tts-language-unavailable" : "tts-error");
    }
  }

  function stopResponse() {
    stopSpeaking();
    setStatus("idle");
  }

  function retryVoice() {
    setTranscript("");
    setLiveText("");
    setStatus("idle");
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
          <select id="voice-language" value={language} disabled={["listening", "processing", "sending", "speaking"].includes(status)} onChange={(event) => setLanguage(event.target.value)}>
            {Object.values(languages).map((option) => <option key={option.code} value={option.code}>{t(`settings.languageName.${option.code}`)}</option>)}
          </select>
        </div>

        <div className="voice-main-control">
          {status === "idle" && (
            <button type="button" className="voice-start-button" onClick={startListening} disabled={sending}>
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
          {status === "processing" && <div className="voice-status-line" role="status">{t("voice.processing")}<button className="app-button app-button-quiet" type="button" onClick={cancelListening}><Icon name="close" size={15} />{t("voice.cancel")}</button></div>}
          {status === "sending" && <div className="voice-status-line" role="status"><p>{t("voice.sending")}</p><p className="voice-transcript-preview">{transcript}</p></div>}
          {status === "speaking" && <div className="voice-status-line" role="status">{t("voice.speaking")}<button className="app-button app-button-quiet" type="button" onClick={stopResponse}><Icon name="stop" size={15} />{t("voice.stopSpeaking")}</button></div>}
          {(status === "review" || status === "sendError") && (
            <div className="voice-transcript-review">
              <label htmlFor="voice-transcript">{t("voice.transcriptLabel")}</label>
              {status === "sendError" && <p className="voice-chat-error" role="alert">{t("voice.sendError")}</p>}
              {transcript ? (
                <textarea id="voice-transcript" rows={5} value={transcript} onChange={(event) => setTranscript(event.target.value)} />
              ) : <p className="voice-empty-transcript">{t("voice.empty")}</p>}
              <div className="voice-control-actions">
                <button className="app-button app-button-primary" type="button" disabled={!transcript.trim() || sending || status === "sending"} onClick={() => sendTranscript()}>
                  <Icon name="send" size={17} />{sending || status === "sending" ? t("voice.sending") : t("voice.send")}
                </button>
                <button className="app-button app-button-quiet" type="button" onClick={retryVoice}>
                  <Icon name="restart" size={17} />{t("voice.recordAgain")}
                </button>
              </div>
            </div>
          )}
          {(status === "unsupported" || status === "permission" || status === "error" || status === "audioCapture" || status === "empty" || status === "languageChanged") && (
            <div className="voice-unavailable" role={["error", "permission", "audioCapture"].includes(status) ? "alert" : "status"}>
              <Icon name="micOff" size={21} />
              <div>
                <strong>{t(status === "permission" ? "voice.permissionTitle" : status === "unsupported" ? "voice.unsupportedTitle" : status === "empty" ? "voice.empty" : status === "languageChanged" ? "voice.languageChanged" : status === "audioCapture" ? "voice.audioCapture" : "voice.error")}</strong>
                <p>{t(status === "permission" ? "voice.permissionText" : status === "empty" ? "voice.emptyHint" : status === "languageChanged" ? "voice.languageChangedText" : status === "audioCapture" ? "voice.audioCapture" : "voice.unsupportedText")}</p>
              </div>
              <button className="app-button app-button-quiet" type="button" onClick={retryVoice}>{t("common.tryAgain")}</button>
            </div>
          )}
        </div>

        <div className="voice-service-note">
          <Icon name="info" size={18} />
          <p>{t("voice.ttsBrowserNote")}</p>
        </div>
        {(status === "tts-unavailable" || status === "tts-language-unavailable" || status === "tts-error") && <div className="voice-chat-error" role="alert"><span>{t(status === "tts-unavailable" ? "voice.ttsUnavailable" : status === "tts-language-unavailable" ? "voice.urduVoiceUnavailable" : "voice.ttsError")}</span><button className="app-button app-button-quiet" type="button" onClick={retryVoice}>{t("common.tryAgain")}</button></div>}
        {error && <p className="voice-chat-error" role="alert">{t(error)}</p>}
      </section>

      <section className="voice-history" aria-labelledby="voice-history-title">
        <div className="dashboard-section-head">
          <div><p className="app-eyebrow">{t("chat.workspace")}</p><h2 id="voice-history-title">{t("voice.history")}</h2></div>
          <div className="voice-history-actions">
            <label className="visually-hidden" htmlFor="voice-conversation">{t("voice.chooseConversation")}</label>
            <select id="voice-conversation" value={conversationId} onChange={(event) => onSelectConversation(event.target.value)} disabled={conversations.length === 0 || sending || status === "sending"}>
              <option value="">{t("voice.chooseConversation")}</option>
              {conversations.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}
            </select>
            <button className="app-button app-button-quiet" type="button" onClick={onNewConversation} disabled={sending || status === "sending"}><Icon name="plus" size={17} />{t("chat.newChat")}</button>
          </div>
        </div>
        {conversation?.messages?.length ? (
          <ol className="voice-history-list">
            {conversation.messages.map((message) => <li className={`voice-history-message voice-history-${message.role}`} key={message.id}><strong>{message.role === "user" ? t("chat.you") : t("chat.assistant")}</strong><p>{message.content}</p>{message.role === "assistant" && <div className="voice-history-actions-row"><CopyAnswerButton content={message.content} /><button className="app-button app-button-quiet" type="button" onClick={() => speakResponse(message.content)} disabled={!message.content}><Icon name="volume" size={17} />{t("voice.speakResponse")}</button></div>}</li>)}
          </ol>
        ) : <p className="dashboard-no-recent">{t("chat.noHistory")}</p>}
      </section>
      <p className="workspace-disclaimer">{t("settings.disclaimer")}</p>
    </section>
  );
}
