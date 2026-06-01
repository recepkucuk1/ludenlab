import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "./lib/cn";

export type PBadgeTone = "default" | "accent" | "green" | "blue" | "danger";

export interface PBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: PBadgeTone;
}

export function PBadge({ tone = "default", className, ...props }: PBadgeProps) {
  return (
    <span
      className={cn("p-badge", tone !== "default" && `p-badge--${tone}`, className)}
      {...props}
    />
  );
}

export type PAlertTone = "error" | "success" | "warning" | "info";

export interface PAlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: PAlertTone;
  icon?: ReactNode;
}

export function PAlert({ tone = "info", icon, className, children, ...props }: PAlertProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("p-alert", `p-alert--${tone}`, className)}
      {...props}
    >
      {icon}
      <div>{children}</div>
    </div>
  );
}

export interface PSpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  label?: string;
}

export function PSpinner({ label = "Yükleniyor", className, ...props }: PSpinnerProps) {
  return <span role="status" aria-label={label} className={cn("p-spinner", className)} {...props} />;
}

export interface PSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
}

export function PSkeleton({ className, width, height, style, ...props }: PSkeletonProps) {
  return (
    <div
      className={cn("p-skeleton", className)}
      style={{ width, height, ...style }}
      {...props}
    />
  );
}
