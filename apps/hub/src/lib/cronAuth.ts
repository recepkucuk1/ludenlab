import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Cron uçlarının paylaşılan Bearer doğrulaması (2026-08 denetimi #34).
 *
 * Eskiden her cron kendi `provided !== expected` karşılaştırmasını yapıyordu. JS'in `!==`
 * operatörü ilk farklı baytta kısa devre yapar; teoride yanıt süresinden sır bayt bayt
 * çıkarılabilir. Yüksek entropili bir sırla ağ üzerinden pratikte istismarı çok zordur —
 * ama doğrusu ucuz: sabit süreli karşılaştırma + tek yerde toplama.
 *
 * `null` döner = yetkili. Aksi hâlde döndürülecek yanıt.
 */
export function requireCronSecret(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] CRON_SECRET tanımlı değil — uç fail-closed reddediyor");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const provided = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  // timingSafeEqual EŞİT UZUNLUK ister; farklı uzunlukta fırlatır. Uzunluğu önce
  // karşılaştırmak sırrın UZUNLUĞUNU sızdırır ama içeriğini değil — kabul edilebilir.
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
