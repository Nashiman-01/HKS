import Icon from "./Icon.jsx";

// A message box. tone: "info" | "warning" | "error" | "success"
// Use role="alert" for errors that need attention right away.
export default function Alert({ tone = "info", icon, role = "note", children }) {
  return (
    <div className={`alert alert-${tone}`} role={role}>
      {icon && <Icon name={icon} size={20} />}
      <div>{children}</div>
    </div>
  );
}
