import { ASISTAN_SATIRI } from "./applyProfileNote";

/**
 * Eğitim Profili bölüm gövdesini parçalar: asistan maddeleri (`- metin _(asistan)_`) ayrı,
 * aradaki metin bütün Markdown. Saf; bileşen (`ProfileSectionBody.tsx`) ve test bunu kullanır.
 */
export type Parca = { tur: "md"; metin: string } | { tur: "asistan"; satir: string; metin: string };

export function parcala(content: string): Parca[] {
  const out: Parca[] = [];
  let tampon: string[] = [];
  const bosalt = () => {
    const md = tampon.join("\n").trim();
    if (md) out.push({ tur: "md", metin: md });
    tampon = [];
  };
  for (const satir of content.split("\n")) {
    const m = ASISTAN_SATIRI.exec(satir.trim());
    if (m) {
      bosalt();
      out.push({ tur: "asistan", satir: satir.trim(), metin: m[1] });
    } else {
      tampon.push(satir);
    }
  }
  bosalt();
  return out;
}

