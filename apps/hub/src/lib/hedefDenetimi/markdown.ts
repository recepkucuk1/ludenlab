import { BILESENLER, BILESEN_ETIKETI, MEB_UYUM_ETIKETI, type DenetimSonucu, type Durum } from "./schema";

/* Deterministik Markdown (spec §4.6): Atölye dokümanı ve Kütüphane görüntüsü. */

export const DENETIM_NOTU = "Bu denetim bir yapay zekâ taslağıdır; hedef uzmanın kararıdır.";
const SIMGE: Record<Durum, string> = { var: "✓ var", eksik: "○ eksik", belirsiz: "~ belirsiz" };
/** Tablo hücresi: satır sonu boşluğa, `|` kaçışlı. */
const hucre = (s: string) => s.replace(/\r?\n/g, " ").replace(/\\/g, "\\\\").replace(/\|/g, "\\|").trim();

export function denetimToMarkdown(hedef: string, s: DenetimSonucu): string {
  const satirlar = [
    "## Hedef",
    ...hedef.trim().split(/\r?\n/).map((l) => `> ${l}`),
    "",
    "## Bileşenler",
    "| Bileşen | Durum | Alıntı | Not |",
    "| --- | --- | --- | --- |",
    ...BILESENLER.map((k) => {
      const b = s.bilesenler[k];
      return `| ${BILESEN_ETIKETI[k]} | ${SIMGE[b.durum]} | ${b.alinti ? `"${hucre(b.alinti)}"` : ""} | ${hucre(b.not)} |`;
    }),
  ];
  if (s.mebUyum) {
    satirlar.push("", "## MEB uyumu", `**${MEB_UYUM_ETIKETI[s.mebUyum.durum]}**${s.mebUyum.not ? ` — ${s.mebUyum.not}` : ""}`);
  }
  if (s.sorular.length) {
    satirlar.push("", "## Uzmana sorular", ...s.sorular.map((q) => `- **${BILESEN_ETIKETI[q.bilesen]}:** ${q.soru}${q.ornek ? ` _örn. ${q.ornek.replace(/([_*])/g, "\\$1")}_` : ""}`));
  }
  satirlar.push("", "## Özet", s.ozet, "", `⚠️ ${DENETIM_NOTU}`);
  return satirlar.join("\n");
}
