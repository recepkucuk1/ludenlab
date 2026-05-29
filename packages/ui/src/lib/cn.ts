import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Poster primitive'lerinin class birleştiricisi (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
