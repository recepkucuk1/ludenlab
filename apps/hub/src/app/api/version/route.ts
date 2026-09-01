import { NextResponse } from "next/server";

/**
 * Canlıdaki sürüm damgası — "deploy gerçekten indi mi?" sorusunun TEK istekle yanıtı.
 *
 * NEDEN VAR: Hostinger deploy'u doğrudan git'ten çalışır, CI'a bağlı değildir. Kurulum ya da
 * derleme patlarsa eski sürüm SESSİZCE canlı kalır ve tek belirtisi "değişiklik görünmüyor"
 * olur. 2026-08-29'da iki commit üç saat boyunca yayına çıkmadı; fark etmek ancak o
 * sürümle gelen bir DAVRANIŞI tek tek ölçerek mümkün oldu. Bu uç o işi bir istekle yapar:
 *
 *   curl -s https://ludenlab.com/api/version
 *   → {"commit":"0a3dc58...","builtAt":"2026-09-01T...","now":"..."}
 *
 * `commit` git'teki HEAD'i değil, ÇALIŞAN BUILD'in derlendiği commit'i söyler — doğrulamak
 * istediğimiz fark tam olarak budur.
 *
 * KAPSAM: bilerek asgari — kısa commit + derleme zamanı. Ortam değişkeni, sürüm numarası,
 * bağımlılık ya da yapılandırma AYRINTISI YOK; bunlar saldırgana envanter verirdi.
 */
export const runtime = "nodejs";
// Statik olarak önceden üretilip ESKİ bir build'in yanıtı servis edilmesin — damganın
// tüm değeri "şu an çalışan build" olmasında.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      commit: process.env.BUILD_COMMIT ?? "unknown",
      builtAt: process.env.BUILD_TIME ?? "unknown",
      now: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
