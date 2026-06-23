import { TASLAK_NOTU } from "./bep";

/* Atölye taslakları için ORTAK PDF çıktısı. Render edilmiş Markdown HTML'ini markalı
   bir yazdırma penceresinde açar (tarayıcının "PDF olarak kaydet"i). Üretim panelinde
   (ToolResult) ve kayıtlı taslak görüntüleyicide (TaslakViewerModal) aynı şablon. */

/** @returns pencere açıldıysa true; açılır pencere engellendiyse false (çağıran uyarır). */
export function printDraftPdf(title: string, bodyHtml: string): boolean {
  const w = window.open("", "_blank", "width=840,height=1000");
  if (!w) return false;
  w.document.write(
    `<!doctype html><html lang="tr"><head><meta charset="utf-8" /><title>${title}</title>` +
      `<link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />` +
      `<link rel="preconnect" href="https://fonts.googleapis.com" />` +
      `<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />` +
      `<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap" />` +
      `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap" />` +
      `<style>` +
      `:root { --ink: #18272D; --faint: rgba(24,39,45,0.12); }` +
      `body { font-family: "Satoshi", system-ui, sans-serif; color: var(--ink); max-width: 800px; margin: 40px auto; padding: 0 32px; line-height: 1.6; }` +
      `h1, h2, h3 { font-family: "Bricolage Grotesque", sans-serif; line-height: 1.2; margin: 1.2em 0 0.5em; letter-spacing: -0.015em; }` +
      `h1 { font-size: 26px; border-bottom: 2px solid var(--ink); padding-bottom: 8px; }` +
      `h2 { font-size: 20px; }` +
      `h3 { font-size: 16px; }` +
      `p { margin: 0.8em 0; }` +
      `table { border-collapse: collapse; width: 100%; margin: 1.2em 0; }` +
      `th, td { border: 1.5px solid var(--ink); padding: 8px 12px; text-align: left; font-size: 13.5px; }` +
      `th { background: rgba(24,39,45,0.05); font-weight: 700; }` +
      `code { background: rgba(24,39,45,0.06); padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, "SF Mono", monospace; font-size: 0.9em; font-weight: 600; }` +
      `ul, ol { padding-left: 1.5em; margin: 0.8em 0; }` +
      `li { margin-bottom: 0.4em; }` +
      `hr { border: none; border-top: 2px solid var(--faint); margin: 2em 0; }` +
      `.brand-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--ink); padding-bottom: 16px; margin-bottom: 32px; }` +
      `.brand-name { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 18px; }` +
      `.doc-title { font-weight: 600; font-size: 14px; color: rgba(24,39,45,0.6); }` +
      `.notu { margin-top: 40px; padding-top: 16px; border-top: 1.5px dashed var(--ink); color: rgba(24,39,45,0.7); font-size: 11.5px; font-weight: 500; }` +
      `@media print { body { margin: 0; padding: 0; } .brand-head { margin-top: 0; } }` +
      `</style></head>` +
      `<body>` +
      `<div class="brand-head"><div class="brand-name">LudenLab Atölye</div><div class="doc-title">${title}</div></div>` +
      `${bodyHtml}<p class="notu">⚠️ ${TASLAK_NOTU}</p></body></html>`,
  );
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 800);
  return true;
}
