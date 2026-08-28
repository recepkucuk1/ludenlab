import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "./safeUrl";

/**
 * Giriş-sonrası open redirect regresyon kilidi (2026-08 denetimi #16).
 *
 * Eski kontrol `startsWith("/") && !startsWith("//")` idi ve TERS EĞİK ÇİZGİYİ kaçırıyordu:
 * WHATWG URL ayrıştırıcısı özel şemalarda `\` ile `/` karakterini eşdeğer sayar, yani
 * `/\evil.com` → `https://evil.com`. Kurban GERÇEK sitede giriş yapıp evil.com'a düşüyordu.
 */
const ORIGIN = "https://ludenlab.com";
const FALLBACK = "/hesap";

describe("safeCallbackUrl — saldırı vektörleri", () => {
  const attacks: Array<[string, string]> = [
    ["ters eğik çizgi", "/\\evil.com"],
    ["ters eğik çizgi + yol", "/\\evil.com/x"],
    ["protokol-göreli", "//evil.com"],
    ["mutlak http", "http://evil.com"],
    ["mutlak https", "https://evil.com/x"],
    ["sekme enjeksiyonu", "/\t/evil.com"],
    ["satır sonu + ters eğik", "/\n\\evil.com"],
    ["javascript şeması", "javascript:alert(1)"],
    ["yüzde-kodlu ters eğik", "/%5Cevil.com"],
    ["çift ters eğik", "\\\\evil.com"],
    ["auth sayfası (döngü)", "/giris"],
    ["auth sayfası + query", "/kayit?x=1"],
    ["boş", ""],
  ];

  for (const [label, raw] of attacks) {
    it(`reddeder: ${label}`, () => {
      expect(safeCallbackUrl(raw, ORIGIN)).toBe(FALLBACK);
    });
  }
});

describe("safeCallbackUrl — meşru yollar korunur", () => {
  const ok = [
    "/studio/dashboard",
    "/hesap/tahsilat",
    "/atolye/araclar?tab=bep",
    "/",
    "/odeme?plan=PRO#detay",
  ];

  for (const path of ok) {
    it(`korur: ${path}`, () => {
      expect(safeCallbackUrl(path, ORIGIN)).toBe(path);
    });
  }
});
