"use client";

import { useMemo } from "react";
import { evaluatePasswordStrength } from "@/lib/passwordStrength";

interface PasswordStrengthBarProps {
  password: string;
}

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const { score, label, feedback } = useMemo(
    () => evaluatePasswordStrength(password),
    [password]
  );

  if (!password) return null;

  const colors = {
    weak: "bg-red-500",
    medium: "bg-yellow-500",
    strong: "bg-green-500",
  };
  const textColors = {
    weak: "text-red-600",
    medium: "text-yellow-700",
    strong: "text-green-600",
  };

  const filledBars = Math.max(1, score);

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < filledBars ? colors[label] : "bg-zinc-200"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${textColors[label]}`}>{feedback}</p>
    </div>
  );
}
