import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "./lib/cn";

export type PButtonVariant = "accent" | "solid" | "ghost" | "danger";
export type PButtonSize = "sm" | "md" | "lg";

export interface PButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PButtonVariant;
  size?: PButtonSize;
}

export const PButton = forwardRef<HTMLButtonElement, PButtonProps>(function PButton(
  { variant = "accent", size = "md", className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn("p-btn", `p-btn--${variant}`, `p-btn--${size}`, className)}
      {...props}
    />
  );
});
