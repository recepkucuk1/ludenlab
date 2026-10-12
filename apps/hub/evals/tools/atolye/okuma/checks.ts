// apps/hub/evals/tools/atolye/okuma/checks.ts
import { OKUMA_DUZEY_KEYS } from "@atolye/lib/okuma";
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { lower } from "../../../lib/sharedChecks";
import { bolumSatirlari, olumluGecisler } from "../ortak";

export interface OkumaBody {
  okumaDuzeyi: (typeof OKUMA_DUZEY_KEYS)[number];
  hedefAkicilik?: string;
  takilanDesenler?: string;
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}

/* ── Bölüm regex'leri: TEK KAYNAK (adapter `sections` bunları kullanır) ──
   Başlıklar küçük harfe indirilir ve `-`/`_` boşluğa çevrilir: "Hece-ses" → "hece ses". */

/** Rubrik bölümü: önce "rubrik/rubriği" (`rubri`: "rubriği" `rubrik` içermez), yoksa "ölçüm"/"ölçme" başlığı. */
const RUBRIK_BASLIGI = /rubri/;
const OLCUM_BASLIGI = /ölçüm|ölçme/;
/** Prompt: "1. Seviyeli okuma parçası 2. Hece-ses çalışması 3. Akıcılık egzersizleri 4. Kelime dağarcığı desteği 5. Akıcılık ölçüm rubriği". */
export const OKUMA_BOLUMLERI = {
  parca: /okuma parçası|metin/,
  hece: /hece|ses çalışması/,
  egzersiz: /akıcılık (?:egzersiz|çalışma|etkinlik)/,
  sozcuk: /kelime dağarcığı|sözcük/,
  rubrik: new RegExp(`${RUBRIK_BASLIGI.source}|${OLCUM_BASLIGI.source}`),
} as const;
export const OKUMA_BOLUM_LISTESI: RegExp[] = Object.values(OKUMA_BOLUMLERI);

/**
 * İngilizce okuma öğretimine özgü terimler (tr-TR küçük harfe indirilmiş metinde; büyük "I" → "ı" olur, bu yüzden `[iı]`).
 * Türkçe şeffaf ortografide karşılığı olmayan kavramlar: phonics, sight words, Dolch listesi, silent/magic e, digraph,
 * vowel team, word family. `CVC` bilerek yok: Türkçe hece yapısı da ünsüz-ünlü-ünsüz diye anlatılabilir.
 */
const INGILIZCE = new RegExp(
  String.raw`(?<!\p{L})(?:phon[iı]cs|s[iı]ght[\s-]?words?|dolch|(?:s[iı]lent|mag[iı]c) e|d[iı]graphs?|vowel teams?|word fam[iı]l(?:y|ies))(?!\p{L})`,
  "u",
);

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
/** "doğruluk", "doğruluğu", "doğruluğa" (ğ'ye dönüşür), "doğru okuma %". */
const DOGRULUK = /doğrulu[kğ]|doğru okuma/u;
const PROZODI = /prozodi|prosody|tonlama|vurgu|ifadeli okuma/u;

/** Terim olumlu önerilmiyor, kıyaslanıyor: "İngilizcedeki phonics yaklaşımından farklı olarak…", "phonics'in aksine", "gereksiz", "aktarılmaması". */
const KARSIT = /\p{L}*(?:ten|tan|den|dan) farklı|farklı olarak|aksine|kıyasla|gereksiz|aktarılmaması|aktarmadan/u;

export function okumaChecks(args: { body: OkumaBody; text: string }): ToolCheckOut {
  // Prompt: "İngilizce fonik mantığını OLDUĞU GİBİ aktarma" / "İngilizceye özgü stratejileri körlemesine aktarma".
  // Olumsuzlama korumalı: "İngilizce phonics yöntemleri aktarılmadı" ihlal değildir.
  const ingilizce = olumluGecisler(args.text, INGILIZCE, KARSIT);
  // Prompt: "Akıcılık ölçüm rubriği — kelime/dk, doğruluk %, prozodi". Ölçütler rubrik bölümünde (alt başlıkları dahil) aranır;
  // bölüm hiç bulunamazsa metnin tamamında (başlık adı sapması yapı puanında zaten görünür, burada çift cezalandırılmaz).
  const bolum = bolumSatirlari(args.text, RUBRIK_BASLIGI) ?? bolumSatirlari(args.text, OLCUM_BASLIGI);
  const rubrikMetni = lower(bolum ? bolum.join("\n") : args.text);
  const scores = {
    fonik_yok: ingilizce.length ? 0 : 1,
    rubrik: HIZ.test(rubrikMetni) && DOGRULUK.test(rubrikMetni) ? 1 : 0,
    prozodi: PROZODI.test(rubrikMetni) ? 1 : 0,
  };
  return { scores, details: { ...scores, ingilizce: ingilizce.join("|") }, hard: [] };
}
