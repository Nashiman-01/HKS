import Badge from "./Badge.jsx";
import Icon from "./Icon.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

// One source. Shows where the information comes from and how far it has been checked.
// source: { title, type, note, url?, status? }   status: "verified" | "unverified" | "demo"
// If the back end sends no status, we say "not yet verified" rather than assume it is correct.
export default function SourceCard({ source }) {
  const { t } = useLanguage();
  const status = source.status || "unverified";

  const statusBadge = {
    verified: <Badge tone="green">{t("source.verified")}</Badge>,
    demo: <Badge tone="amber">{t("source.demo")}</Badge>,
    unverified: <Badge tone="amber">{t("source.unverified")}</Badge>,
  }[status];

  return (
    <li className="source-card">
      <div className="source-top">
        {source.type && <Badge tone="neutral">{source.type}</Badge>}
        {statusBadge}
      </div>
      <h3>{source.title}</h3>
      {source.note && <p>{source.note}</p>}
      {source.url && (
        <a className="source-link" href={source.url} target="_blank" rel="noopener noreferrer">
          {t("source.open")}
          <Icon name="external" size={16} />
        </a>
      )}
    </li>
  );
}
