import Icon from "./Icon.jsx";

// One card on the Results page: an icon, a heading, and the content.
export default function ResultSection({ id, title, icon, children }) {
  return (
    <section className="result-card" id={id} aria-labelledby={`${id}-title`}>
      <div className="result-head">
        <span className="icon-badge" aria-hidden="true">
          <Icon name={icon} size={20} />
        </span>
        <h2 id={`${id}-title`}>{title}</h2>
      </div>
      <div className="result-body">{children}</div>
    </section>
  );
}
