// apps/hub/src/modules/studio/lib/prompts/iskelet.ts
/* Spec A1 — Studio araç prompt iskeleti.
   Sistem prompt'u sabittir (önbellek), bölümler sabit sırada kurulur:
   rol → klinik çerçeve → özgüllük → karşıt örnek → biçim → öz-denetim → ortak son blok.
   Kullanıcı prompt'u değişken kısımdır: öğrenci bloğu → parametreler → tek satır odak → son hatırlatma.
   JSON alan adları, istemci ve PDF DEĞİŞMEZ (A4); şema `bicim.sema` ile aynen geçer. */
import { ORTAK_SON_BLOK } from "@/lib/prompts/ortakBloklar";

/** Spec A1 sistem prompt iskeleti. Bölümler sabit sırada; kurulum anında bütçe denetimi. */
export interface SistemPromptParcalari {
  /** 1 — rol, kitle (uzman / veli / çocuk), kayıt. */
  rol: string;
  /** 2 — araca özgü klinik çerçeve maddeleri. */
  klinikCerceve: string[];
  /** 3 — araca özgü EK özgüllük kuralları (ortak kurallar iskelette, bunların önüne gelir). */
  ozgulluk?: string[];
  /** 4 — zayıf/iyi mini örnek; toplam ≤120 kelime (kurulumda denetlenir). */
  karsitOrnek: { zayif: string; iyi: string };
  /** 5 — JSON şeması (alan adları değişmez) + alan başına cümle/kelime bütçesi. */
  bicim: { giris: string; sema: string; butce: string[] };
  /** 6 — 4–6 evet/hayır maddesi (kurulumda denetlenir); çıktıya yazılmaz. */
  ozDenetim: string[];
}

const KARSIT_ORNEK_KELIME_SINIRI = 120;
const OZ_DENETIM_MADDE = { min: 4, max: 6 } as const;

const kelime = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const madde = (xs: readonly string[]) => xs.map((x) => `- ${x}`).join("\n");

/** Her araçta ortak özgüllük kuralları (A1 madde 3); araca özgü kurallar bunların ARKASINA eklenir. */
const ORTAK_OZGULLUK: readonly string[] = [
  "Her öneri, profildeki en az bir somut veriye (yaş, tanı, güçlü yön, ilgi alanı, geçmiş çalışma, uzman notu, son oturum) açıkça bağlanır; bağlanamayan öneri yazılmaz.",
  "İlgi alanı verilmişse en az iki yerde malzeme olarak kullan.",
  "Geçmiş çalışmalar verilmişse tekrar etme; bir sonraki adımı kur.",
  'Yapılacak şeyi söyle ("yap"), yapılmayacak şeyi uzun uzun anlatma.',
];

export function studioSistemPromptu(p: SistemPromptParcalari): string {
  const n = kelime(p.karsitOrnek.zayif) + kelime(p.karsitOrnek.iyi);
  if (n > KARSIT_ORNEK_KELIME_SINIRI) {
    throw new Error(`karşıt örnek çifti ${n} kelime (≤${KARSIT_ORNEK_KELIME_SINIRI} olmalı)`);
  }
  if (p.ozDenetim.length < OZ_DENETIM_MADDE.min || p.ozDenetim.length > OZ_DENETIM_MADDE.max) {
    throw new Error(`öz-denetim ${p.ozDenetim.length} madde (${OZ_DENETIM_MADDE.min}–${OZ_DENETIM_MADDE.max} olmalı)`);
  }
  return [
    `ROL\n${p.rol}`,
    `KLİNİK ÇERÇEVE\n${madde(p.klinikCerceve)}`,
    `ÖZGÜLLÜK KURALLARI\n${madde([...ORTAK_OZGULLUK, ...(p.ozgulluk ?? [])])}`,
    `ZAYIF ÖRNEK (böyle yazma): ${p.karsitOrnek.zayif}\nİYİ ÖRNEK (böyle yaz): ${p.karsitOrnek.iyi}`,
    `BİÇİM\n${p.bicim.giris}\n${p.bicim.sema}\nAlan bütçeleri:\n${madde(p.bicim.butce)}`,
    `ÖZ-DENETİM (yanıtı yazmadan önce kendine sor; listeyi çıktıya YAZMA)\n${p.ozDenetim.map((x, i) => `${i + 1}. ${x}`).join("\n")}`,
    ORTAK_SON_BLOK,
  ].join("\n\n");
}

/** Spec A1 kullanıcı prompt sırası: (a) öğrenci bloğu (A2; boşsa başlık da yok), (b) parametreler,
    (c) koddan türetilen tek satır odak, (d) o araç için en kritik kuralların son hatırlatması. */
export function studioKullaniciPromptu(p: { studentBlock: string; parametreler: string[]; odak: string; hatirlatma: string[] }): string {
  const bolumler: string[] = [];
  const ogrenci = p.studentBlock.trim();
  if (ogrenci) bolumler.push(`ÖĞRENCİ\n${ogrenci}`);
  bolumler.push(`PARAMETRELER\n${p.parametreler.join("\n")}`);
  bolumler.push(`Odak: ${p.odak}`);
  bolumler.push(`Son hatırlatma: ${p.hatirlatma.join(" ")}`);
  return bolumler.join("\n\n");
}

/** Eval düzeneğiyle aynı tahmin (`evals/lib/exchange.ts`): 3,2 karakter ≈ 1 token. */
export const yaklasikToken = (s: string) => Math.ceil(s.length / 3.2);

/** Sistem prompt'u hedef uzunluğu (A1): 1.200–2.000 token ≈ 3.840–6.400 karakter. */
export const PENCERE = { min: 1200, max: 2000 } as const;

export function promptPenceresi(s: string): { token: number; uygun: boolean } {
  const token = yaklasikToken(s);
  return { token, uygun: token >= PENCERE.min && token <= PENCERE.max };
}

/** DİL KURALI'nın "öğrenci/uzman" karşılığı olarak yasakladığı sözcükler; prompt'un kendisi de bunları kullanmamalı. */
const YASAK_SOZCUKLER = ["hasta", "terapist"] as const;

/** Araç prompt testlerinin ortak iddiası: pencere + şema alan adları + yasak sözcükler.
    Hata iletileri konumlandırmaya yetecek kadar somuttur (token sayısı / eksik alan adı / sözcük + bağlam).
    Yasak sözcük denetimi tam sözcük arar: "hastane", "terapistlik" gibi başka sözcükler ve tırnaklı
    anışlar ('"hasta/terapist" yok mu?') serbesttir; DİL KURALI bloğu bütünüyle denetim dışıdır.
    Çekimli biçimler ("hastanın") bilinçli olarak yakalanmaz. */
export function promptIddialari(system: string, beklenenAlanlar: string[]): void {
  const { token, uygun } = promptPenceresi(system);
  if (!uygun) throw new Error(`sistem prompt'u ${token} token; pencere ${PENCERE.min}–${PENCERE.max}`);
  for (const a of beklenenAlanlar) {
    if (!system.includes(`"${a}"`)) throw new Error(`şemada alan yok: ${a}`);
  }
  const govde = system.replace(/DİL KURALI[\s\S]*?(?:\n\n|$)/u, "");
  for (const y of YASAK_SOZCUKLER) {
    const re = new RegExp(`(?<![\\p{L}'"])${y}(?![\\p{L}'"])`, "iu");
    const m = re.exec(govde);
    if (!m) continue;
    const baglam = govde.slice(Math.max(0, m.index - 30), m.index + y.length + 30).replace(/\s+/g, " ").trim();
    throw new Error(`prompt '${y}' sözcüğünü kullanıyor: "…${baglam}…"`);
  }
}
