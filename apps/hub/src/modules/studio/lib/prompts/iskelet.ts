// apps/hub/src/modules/studio/lib/prompts/iskelet.ts
/* Spec A1 — Studio araç prompt iskeleti.
   Sistem prompt'u sabittir (önbellek), bölümler sabit sırada kurulur:
   rol → klinik çerçeve → özgüllük → karşıt örnek → biçim → öz-denetim → ortak son blok.
   Kullanıcı prompt'u değişken kısımdır: öğrenci bloğu → parametreler → tek satır odak → son hatırlatma.
   JSON alan adları, istemci ve PDF DEĞİŞMEZ (A4); şema `bicim.sema` ile aynen geçer. */
import { ORTAK_SON_BLOK } from "@/lib/prompts/ortakBloklar";

/** Spec A1 sistem prompt iskeleti. Bölümler sabit sırada; kurulum anında bütçe ve boşluk denetimi. */
export interface SistemPromptParcalari {
  /** 1 — rol, kitle (uzman / veli / çocuk), kayıt. */
  rol: string;
  /** 2 — araca özgü klinik çerçeve maddeleri (en az bir). */
  klinikCerceve: string[];
  /** 3 — araca özgü EK özgüllük kuralları: ortak dört kuralı yeniden yazma; yalnız araca özgü ekler. */
  ozgulluk?: string[];
  /** 4 — zayıf/iyi mini örnek; toplam ≤120 kelime (kurulumda denetlenir). */
  karsitOrnek: { zayif: string; iyi: string };
  /** 5 — JSON şeması (alan adları değişmez) + alan başına cümle/kelime bütçesi (en az bir). */
  bicim: { giris: string; sema: string; butce: string[] };
  /** 6 — 4–6 evet/hayır maddesi (kurulumda denetlenir); çıktıya yazılmaz. */
  ozDenetim: string[];
}

const KARSIT_ORNEK_KELIME_SINIRI = 120;
const OZ_DENETIM_MADDE = { min: 4, max: 6 } as const;

const kelime = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const madde = (xs: readonly string[]) => xs.map((x) => `- ${x}`).join("\n");

/** Liste bölümü denetimi: `enAz` madde şartı + hiçbir madde boş olmasın (1-tabanlı sıra numarasıyla). */
function listeDenetimi(ad: string, xs: readonly string[], enAz: number): void {
  if (xs.length < enAz) throw new Error(`${ad} boş (en az ${enAz} madde)`);
  xs.forEach((x, i) => {
    if (!x.trim()) throw new Error(`${ad} ${i + 1}. madde boş`);
  });
}

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
  listeDenetimi("klinik çerçeve", p.klinikCerceve, 1);
  listeDenetimi("özgüllük", p.ozgulluk ?? [], 0);
  listeDenetimi("alan bütçeleri", p.bicim.butce, 1);
  listeDenetimi("öz-denetim", p.ozDenetim, 0);
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
  listeDenetimi("parametreler", p.parametreler, 1);
  listeDenetimi("son hatırlatma", p.hatirlatma, 1);
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
export const PROMPT_PENCERESI = { min: 1200, max: 2000 } as const;

/**
 * Geniş pencere (1.200–2.600 token ≈ 3.840–8.320 karakter): YALNIZ çıktısı çok sayıda zengin alandan
 * oluşan araçlar için (bugün: kart üreticisi). Alt sınır aynı kalır; yalnız tavan açılır. Varsayılan
 * `PROMPT_PENCERESI`dir — bir araç bu pencereyi kullanıyorsa prompt testine açıkça geçirir.
 */
export const PROMPT_PENCERESI_GENIS = { min: 1200, max: 2600 } as const;

export type PromptPenceresi = { min: number; max: number };

export function promptPenceresi(s: string, pencere: PromptPenceresi = PROMPT_PENCERESI): { token: number; uygun: boolean } {
  const token = yaklasikToken(s);
  return { token, uygun: token >= pencere.min && token <= pencere.max };
}

/** DİL KURALI'nın "öğrenci/uzman" karşılığı olarak yasakladığı sözcükler; prompt'un kendisi de bunları
    kullanmamalı. Biçim eval düzeneğindeki `dilKurali` ile aynı (`evals/lib/sharedChecks.ts`): küçük
    harfe indirilmiş metinde (tr-TR) çekimli biçimler dahil ("hastanın", "terapiste", "konuşma terapisti"),
    başka sözcükler dışarıda ("hastane", "hastalık", "hastalanmak", "hasta ol…", "terapistlik",
    "fizyoterapist"). Ek olarak tırnaklı anışlar ('"hasta" yerine', '"hasta/terapist" yok mu?') serbest;
    DİL KURALI bloğunun kendi anışı da bu yolla geçer. */
const YASAK_SOZCUKLER: ReadonlyArray<{ sozcuk: string; re: RegExp }> = [
  { sozcuk: "hasta", re: /(?<![\p{L}'"])hasta(?!ne|l[ıi][kğ]|lan|\s+ol)(?!['"])/u },
  { sozcuk: "terapist", re: /(?<![\p{L}'"])terapist(?!li[kğ])(?!['"])/u },
];

/** Araç prompt testlerinin ortak iddiası: pencere + şema alan adları + yasak sözcükler.
    Hata iletileri konumlandırmaya yetecek kadar somuttur (token sayısı / eksik alan adı / sözcük + bağlam).
    `pencere` araç başına geçilebilir (bkz. `PROMPT_PENCERESI_GENIS`); alan/sözcük denetimleri pencereden bağımsızdır. */
export function promptIddialari(system: string, beklenenAlanlar: string[], pencere: PromptPenceresi = PROMPT_PENCERESI): void {
  const { token, uygun } = promptPenceresi(system, pencere);
  if (!uygun) throw new Error(`sistem prompt'u ${token} token; pencere ${pencere.min}–${pencere.max}`);
  for (const a of beklenenAlanlar) {
    if (!system.includes(`"${a}"`)) throw new Error(`şemada alan yok: ${a}`);
  }
  const kucuk = system.toLocaleLowerCase("tr-TR");
  for (const { sozcuk, re } of YASAK_SOZCUKLER) {
    const m = re.exec(kucuk);
    if (!m) continue;
    const baglam = kucuk.slice(Math.max(0, m.index - 30), m.index + sozcuk.length + 30).replace(/\s+/g, " ").trim();
    throw new Error(`prompt '${sozcuk}' sözcüğünü kullanıyor: "…${baglam}…"`);
  }
}
