import { useState } from "react";

// A checklist the person can tick off. Ticks are kept only on this screen.
export default function Checklist({ name, items }) {
  const [checked, setChecked] = useState({});

  return (
    <ul className="checklist">
      {items.map((item, i) => {
        const id = `${name}-${i}`;
        return (
          <li key={id}>
            <input id={id} type="checkbox" checked={!!checked[item]} onChange={() => setChecked({ ...checked, [item]: !checked[item] })} />
            <label htmlFor={id}>{item}</label>
          </li>
        );
      })}
    </ul>
  );
}
