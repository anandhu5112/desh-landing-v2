import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/** Razorpay Blade "Primary / Large" button, recoloured to a black fill. */
export default function Button({ className, ...props }: ButtonProps) {
  return (
    <button
      className={className ? `${styles.button} ${className}` : styles.button}
      {...props}
    />
  );
}
