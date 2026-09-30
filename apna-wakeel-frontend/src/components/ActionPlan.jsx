// The action plan: big numbers 01, 02, 03... with what to do and when.
// items: [ { when, title, detail } ]
export default function ActionPlan({ items }) {
  return (
    <ol className="action-plan">
      {items.map((item, i) => (
        <li key={i} className="action-item">
          <span className="action-number" aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div>
            <p className="action-when">{item.when}</p>
            <h3>{item.title}</h3>
            <p className="action-detail">{item.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
