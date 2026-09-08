import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

/** Renders an <a> when given an href, a <button> otherwise — the booking
    CTAs navigate to Cal.com and must be real links (middle-click, copy link
    address, "open in new tab"), not buttons that call location.assign. */
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
