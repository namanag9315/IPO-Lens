import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

interface ButtonLinkProps {
  children: ReactNode;
  className?: string;
  href: string;
  variant?: ButtonVariant;
}

function buttonClass(variant: ButtonVariant, className = "") {
  return `ui-button ui-button-${variant} ${className}`;
}

export function Button({ children, className = "", variant = "secondary", ...props }: ButtonProps) {
  return (
    <button className={buttonClass(variant, className)} type={props.type ?? "button"} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({ children, className = "", href, variant = "secondary" }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, className)} href={href}>
      {children}
    </Link>
  );
}
