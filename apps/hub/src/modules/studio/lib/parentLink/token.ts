import { randomBytes } from "node:crypto";

/* Bağlantı token'ı (spec §5): 24 bayt rastgele → base64url 32 karakter (192 bit). Sunucu tarafı (node:crypto). */
export const TOKEN_LENGTH = 32;
const SHAPE = /^[A-Za-z0-9_-]{32}$/;

export function generateToken(random: (n: number) => Buffer = randomBytes): string {
  return random(24).toString("base64url");
}

/** Biçimsiz token DB'ye sorulmadan 404 alır. */
export function isTokenShape(s: string): boolean {
  return SHAPE.test(s);
}
