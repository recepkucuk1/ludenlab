import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "./lib/cn";

export function PCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-card", className)} {...props} />;
}

export interface PSectionProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  icon?: ReactNode;
  /** Başlık satırının sağına yerleştirilecek aksiyon(lar). */
  action?: ReactNode;
}

export function PSection({ title, icon, action, className, children, ...props }: PSectionProps) {
  return (
    <section className={cn("p-section", className)} {...props}>
      {(title || action) && (
        <div className="p-section__head">
          {icon}
          <span style={{ flex: 1 }}>{title}</span>
          {action}
        </div>
      )}
      <div className="p-section__body">{children}</div>
    </section>
  );
}
