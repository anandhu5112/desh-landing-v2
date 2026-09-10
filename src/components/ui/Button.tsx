import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

/** Renders an <a> when given an href, a <button> otherwise — navigation
    actions stay real links (middle-click, copy link address), rather than
    buttons that imperatively assign a location. */
type ButtonProps =
  | ({ href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
  | ({ href: string } & AnchorHTMLAttributes<HTMLAnchorElement>);

/** Razorpay Blade "Primary / Large" button, recoloured to a black fill. */
export default function Button({ className, ...props }: ButtonProps) {
  const classes = className ? `${styles.button} ${className}` : styles.button;

  if (props.href !== undefined) {
    return <a className={classes} {...props} />;
  }

  return <button className={classes} {...props} />;
}
