/**
 * CSV utilities — admin export feature.
 *
 * Excel uyumlu BOM + CRLF satır sonları yazıyoruz; Türkçe karakterler doğru
 * görünsün. Tek hücredeki virgül/çift tırnak/satır sonu karakterleri RFC 4180
 * kuralıyla escape edilir (çift tırnak içinde, içeride tırnak çift tırnağa
 * dönüştürülür).
 */

export function csvEscape(value: unknown): string {
  if (value == null) return "";
  let s: string;
  if (value instanceof Date) {
    s = value.toISOString();
  } else if (typeof value === "object") {
    s = JSON.stringify(value);
  } else {
    s = String(value);
  }
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv(headers: string[], rows: Array<Record<string, unknown>>, keys?: string[]): string {
  const cols = keys ?? headers;
  const headerLine = headers.map(csvEscape).join(",");
  const bodyLines = rows.map((r) => cols.map((k) => csvEscape(r[k])).join(","));
  // Excel BOM + CRLF
  return "﻿" + [headerLine, ...bodyLines].join("\r\n");
}

/**
 * Tarayıcıda CSV string'ini dosya olarak indirme tetikler.
 * Yalnızca client-side çağrılır.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
