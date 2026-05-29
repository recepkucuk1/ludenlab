import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "./lib/cn";

export interface PFieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

/** Label + hint + error sarmalayıcısı. */
export function PField({ label, hint, error, htmlFor, children, className }: PFieldProps) {
  return (
    <div className={cn("p-field", className)}>
      {label && (
        <label className="p-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {hint && !error && <span className="p-hint">{hint}</span>}
      {error && (
        <span className="p-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export interface PInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const PInput = forwardRef<HTMLInputElement, PInputProps>(function PInput(
  { invalid, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn("p-input", className)}
      {...props}
    />
  );
});

export interface PTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const PTextarea = forwardRef<HTMLTextAreaElement, PTextareaProps>(function PTextarea(
  { invalid, className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn("p-textarea", className)}
      {...props}
    />
  );
});

export interface PSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const PSelect = forwardRef<HTMLSelectElement, PSelectProps>(function PSelect(
  { invalid, className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn("p-select", className)}
      {...props}
    >
      {children}
    </select>
  );
});

/** label/input id'sini otomatik bağlayan birleşik alan. */
export interface PTextFieldProps extends PInputProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export function PTextField({ label, hint, error, id, ...inputProps }: PTextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <PField label={label} hint={hint} error={error} htmlFor={fieldId}>
      <PInput id={fieldId} invalid={Boolean(error)} {...inputProps} />
    </PField>
  );
}
