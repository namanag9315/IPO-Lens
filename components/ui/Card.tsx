import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type CardProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export default function Card<T extends ElementType = "div">({ as, children, className = "", ...props }: CardProps<T>) {
  const Component = as ?? "div";

  return (
    <Component className={`premium-card ${className}`} {...props}>
      {children}
    </Component>
  );
}
