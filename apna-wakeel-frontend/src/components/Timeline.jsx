// The procedure: numbered stages joined by a line.
// items: [ { title, time, detail } ]
export default function Timeline({ items }) {
  return (
    <ol className="timeline">
      {items.map((step, i) => (
        <li key={step.title}>
          <span className="timeline-node" aria-hidden="true">
            {i + 1}
          </span>
          <div className="timeline-body">
            <h3>{step.title}</h3>
            {step.time && <p className="timeline-time">{step.time}</p>}
            <p>{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
