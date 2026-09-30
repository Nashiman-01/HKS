import logoUrl from "../assets/logo.png";

// The official Apna Wakeel emblem. It is used exactly as supplied (never recoloured or stretched):
// width and height are always equal, so the proportions stay correct.
export default function Logo({ size = 48, alt = "", className = "" }) {
  return <img src={logoUrl} width={size} height={size} alt={alt} className={`logo ${className}`} />;
}
