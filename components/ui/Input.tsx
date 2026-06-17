import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
}

export default function Input({ className = "", wrapperClassName = "", ...props }: InputProps) {
  return (
    <div className={`ui-input-wrap ${wrapperClassName}`}>
      <input className={`ui-input ${className}`} {...props} />
    </div>
  );
}
