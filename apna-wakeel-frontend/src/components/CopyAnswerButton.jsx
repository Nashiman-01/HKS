import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { copyTextToClipboard, getCopyableAnswerText } from "../services/clipboard.js";

export default function CopyAnswerButton({ content }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState("idle");
  const timeoutRef = useRef(null);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  async function copyAnswer() {
    window.clearTimeout(timeoutRef.current);
    const text = getCopyableAnswerText(content, t("chat.officialReferences"));
    const copied = await copyTextToClipboard(text);
    setStatus(copied ? "copied" : "failed");
    timeoutRef.current = window.setTimeout(() => setStatus("idle"), 1800);
  }

  const label = status === "copied" ? t("chat.copied") : status === "failed" ? t("chat.copyFailed") : t("chat.copy");

  return (
    <button className="chat-copy-button" type="button" onClick={copyAnswer} disabled={!content} aria-live="polite">
      <Icon name={status === "copied" ? "check" : "copy"} size={15} />
      {label}
    </button>
  );
}