import { PROFIL_BOLUMLERI } from "@studio/lib/studentContext";

/**
 * Profil Markdown'ında verilen bölümün gövdesinin sonuna `- <madde>` ekler. Başlık sözleşmesi
 * `generateProfile.ts` şablonu (### Başlık). Bölüm yoksa `null` (uzmana "bulunamadı" denir),
 * aynı madde varsa metin aynen döner. Saf; istemci ve sunucu ortak.
 */
const BOLUM_SONU = /^(?:#{1,6}\s|---\s*$)/m;

export function applyProfileNote(profile: string, section: (typeof PROFIL_BOLUMLERI)[number], text: string): string | null {
  const madde = `- ${text.trim()}`;
  const re = new RegExp(`^#{1,6}[ \\t]*${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[ \\t]*$`, "m");
  const m = re.exec(profile);
  if (!m) return null;
  const basi = m.index + m[0].length;
  const kalan = profile.slice(basi);
  const sonRel = kalan.slice(1).search(BOLUM_SONU); // başlığın hemen ardındaki \n atlanır
  const son = sonRel < 0 ? profile.length : basi + 1 + sonRel;
  const govde = profile.slice(basi, son);
  if (govde.split("\n").some((l) => l.trim() === madde)) return profile;
  const govdeTrim = govde.replace(/\s+$/, "");
  const sonuc = profile.slice(0, basi) + govdeTrim + "\n" + madde + "\n\n" + profile.slice(son).replace(/^\n+/, "");
  // Son bölümde sonda boş satır birikmesin
  return son === profile.length ? sonuc.trimEnd() : sonuc;
}
