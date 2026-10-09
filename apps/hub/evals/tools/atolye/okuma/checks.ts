// apps/hub/evals/tools/atolye/okuma/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { lower } from "../../../lib/sharedChecks";
import { bolumSatirlari, olumluGecisler } from "../ortak";

export interface OkumaBody { okumaDuzeyi: "hece" | "kelime" | "cumle" | "paragraf"; hedefAkicilik?: string; takilanDesenler?: string; mebHedefKod?: string }

/**
 * İngilizce okuma öğretimine özgü terimler (tr-TR küçük harfe indirilmiş metinde; büyük "I" → "ı" olur, bu yüzden `[iı]`).
 * Türkçe şeffaf ortografide karşılığı olmayan kavramlar: phonics, sight words, Dolch listesi, silent/magic e, digraph,
 * vowel team, word family. `CVC` bilerek yok: Türkçe hece yapısı da ünsüz-ünlü-ünsüz diye anlatılabilir.
 */
const INGILIZCE = new RegExp(
  String.raw`(?<!\p{L})(?:phon[iı]cs|s[iı]ght[\s-]?words?|dolch|(?:s[iı]lent|mag[iı]c) e|d[iı]graphs?|vowel teams?|word fam[iı]l(?:y|ies))(?!\p{L})`,
  "u",
);

/** Rubrik bölümü: önce `rubrik`, yoksa `ölçüm`/`ölçme` başlığı. */
const RUBRIK = /rubri/;
const OLCUM = /ölçüm|ölçme/;
/** Hız: "kelime/dk", "dakikada … kelime", "dakika başına kelime", "kelime sayısı (dakikada)". */
const HIZ = new RegExp(
  [
    String.raw`(?:kelime|sözcük)(?: sayısı)?\s*[/\\]\s*(?:dk|dakika)`,
    String.raw`(?:kelime|sözcük)\s+(?:dk|dakika)(?!\p{L})`,
    String.raw`(?:dakikada|dakikadaki|dakika başına|dk başına)[^\n]*(?:kelime|sözcük)`,
    String.raw`(?:kelime|sözcük)[^\n]*(?:dakikada|dakika başına|dk başına)`,
  ].join("|"),
  "u",
);
/** "doğruluk", "doğruluğu", "doğruluğa" (ğ'ye dönüşür). */
const DOGRULUK = /doğrulu[kğ]/u;
const PROZODI = /prozodi|prosody|tonlama|vurgu|ifadeli okuma/u;

export function okumaChecks(args: { body: OkumaBody; text: string }): ToolCheckOut {
  // Prompt: "İngilizce fonik mantığını OLDUĞU GİBİ aktarma" / "İngilizceye özgü stratejileri körlemesine aktarma".
  // Olumsuzlama korumalı: "İngilizce phonics yöntemleri aktarılmadı" ihlal değildir.
  const ingilizce = olumluGecisler(args.text, INGILIZCE);
  // Prompt: "Akıcılık ölçüm rubriği — kelime/dk, doğruluk %, prozodi". Ölçütler rubrik bölümünde (alt başlıkları dahil) aranır;
  // bölüm hiç bulunamazsa metnin tamamında (başlık adı sapması yapı puanında zaten görünür, burada çift cezalandırılmaz).
  const bolum = bolumSatirlari(args.text, RUBRIK) ?? bolumSatirlari(args.text, OLCUM);
  const rubrikMetni = lower(bolum ? bolum.join("\n") : args.text);
  const scores = {
    fonik_yok: ingilizce.length ? 0 : 1,
    rubrik: HIZ.test(rubrikMetni) && DOGRULUK.test(rubrikMetni) ? 1 : 0,
    prozodi: PROZODI.test(rubrikMetni) ? 1 : 0,
  };
  return { scores, details: { ...scores, ingilizce: ingilizce.join("|") }, hard: [] };
}
