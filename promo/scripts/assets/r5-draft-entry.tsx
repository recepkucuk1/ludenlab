/**
 * Atölye'nin GERÇEK PDF fonksiyonu (apps/hub/src/modules/atolye/lib/pdf.tsx →
 * downloadDraftPdf) — kopya değil. Fonksiyon tarayıcıda Blob'u <a download> ile
 * indirir; Node'da document/URL parçalarını taklit edip Blob'u yakalıyoruz.
 * window.location.origin'i çalıştırıcı (render-card-asset.ts) hub public/'e ayarlar.
 */
import { writeFileSync } from "node:fs";
import { downloadDraftPdf } from "@atolye/lib/pdf";
import { R5_PLAN_MD } from "../../src/reels/r5-meb-atolye/plan";

export const renderDraftPdf = async (outPath: string) => {
  let captured: Blob | undefined;
  (globalThis as { document?: unknown }).document = { createElement: () => ({ click() {} }) };
  URL.createObjectURL = (b: Blob) => {
    captured = b;
    return "blob:promo";
  };
  URL.revokeObjectURL = () => {};
  await downloadDraftPdf("Seans Planı", R5_PLAN_MD);
  if (!captured) throw new Error("downloadDraftPdf Blob üretmedi");
  writeFileSync(outPath, Buffer.from(await captured.arrayBuffer()));
};
