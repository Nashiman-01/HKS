import { useState } from "react";
import FlowSteps from "../components/FlowSteps.jsx";
import Button from "../components/Button.jsx";
import Icon from "../components/Icon.jsx";
import VoiceInput from "../components/VoiceInput.jsx";
import { provinces } from "../data/demoData.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const MIN_LENGTH = 20;

export default function Describe({ initialValue, onContinue }) {
  const { t } = useLanguage();
  const [text, setText] = useState(initialValue.text);
  const [province, setProvince] = useState(initialValue.province);
  const [errors, setErrors] = useState({});
  const [justAppended, setJustAppended] = useState(false);

  // Called when the person confirms a voice transcript. It is added to
  // whatever is already typed, never silently replacing it.
  function handleVoiceText(spokenText) {
    setText((current) => (current ? `${current.trim()} ${spokenText}` : spokenText));
    setErrors((current) => ({ ...current, text: undefined }));
    setJustAppended(true);
    window.setTimeout(() => setJustAppended(false), 3000);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const newErrors = {};
    if (text.trim().length < MIN_LENGTH) {
      newErrors.text = t("describe.errText", { min: MIN_LENGTH });
    }
    if (province === "") {
      newErrors.province = t("describe.errProvince");
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      onContinue({ text: text.trim(), province });
    }
  }

  return (
    <div className="container flow-page">
      <FlowSteps current={1} />

      <h1 className="page-title">{t("describe.title")}</h1>
      <p className="page-intro">{t("describe.intro")}</p>

      <form onSubmit={handleSubmit} noValidate className="form form-card">
        <div className="field">
          <label htmlFor="problem">{t("describe.label")}</label>
          <textarea
            id="problem"
            rows={9}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("describe.placeholder")}
            aria-describedby={errors.text ? "problem-error problem-hint" : "problem-hint"}
            aria-invalid={errors.text ? "true" : "false"}
          />
          <p id="problem-hint" className="hint hint-icon">
            <Icon name="lock" size={16} />
            <span>{t("describe.hint")}</span>
          </p>
          {errors.text && (
            <p id="problem-error" className="error" role="alert">
              {errors.text}
            </p>
          )}
          {justAppended && (
            <p className="voice-appended-note" role="status">
              <Icon name="check" size={15} />
              <span>{t("voice.appended")}</span>
            </p>
          )}

          <VoiceInput onAppend={handleVoiceText} />
        </div>

        <div className="field field-short">
          <label htmlFor="province">{t("describe.provinceLabel")}</label>
          <select
            id="province"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            aria-describedby={errors.province ? "province-error" : undefined}
            aria-invalid={errors.province ? "true" : "false"}
          >
            <option value="">{t("describe.provinceChoose")}</option>
            {provinces.map((name) => (
              <option key={name} value={name}>
                {t(`province.${name}`)}
              </option>
            ))}
          </select>
          {errors.province && (
            <p id="province-error" className="error" role="alert">
              {errors.province}
            </p>
          )}
        </div>

        <div className="form-actions">
          <Button type="submit" size="lg" iconAfter="arrow">
            {t("common.continue")}
          </Button>
        </div>
      </form>
    </div>
  );
}
