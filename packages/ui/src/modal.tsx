"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export interface PModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Maks. genişlik (px). Varsayılan 520. */
  maxWidth?: number;
}

export function PModal({ open, onClose, title, children, maxWidth = 520 }: PModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="p-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="p-modal"
        role="dialog"
        aria-modal="true"
        style={{ width: `min(${maxWidth}px, 100%)` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-modal__head">
          <strong style={{ fontSize: "1.05rem" }}>{title}</strong>
          <button
            type="button"
            className="p-btn p-btn--ghost p-btn--sm"
            aria-label="Kapat"
            onClick={onClose}
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="p-modal__body">{children}</div>
      </div>
    </div>
  );
}
