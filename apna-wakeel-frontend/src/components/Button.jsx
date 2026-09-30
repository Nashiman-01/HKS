import Icon from "./Icon.jsx";

// One button for the whole site.
//   variant: "primary" | "secondary" | "accent" | "ondark" | "link"
//   size:    "md" (default) | "sm" | "lg"
//   icon / iconAfter: optional icon names from Icon.jsx
//   href: if given, it renders a link that looks like a button
export default function Button({ variant = "primary", size = "md", icon, iconAfter, href, className = "", children, ...props }) {
  const classes = `btn btn-${variant} btn-${size} ${className}`;
  const content = (
    <>
      {icon && <Icon name={icon} size={18} />}
      <span>{children}</span>
      {iconAfter && <Icon name={iconAfter} size={18} className={iconAfter === "arrow" ? "icon-flip" : ""} />}
    </>
  );

  if (href) {
    return (
      <a className={classes} href={href} {...props}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" className={classes} {...props}>
      {content}
    </button>
  );
}
