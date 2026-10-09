// apps/hub/evals/tools/studio/phonation/checks.ts
import { articulation } from "@ludenlab/ai";
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { frac, kayitlar, lower, mean, nesneVeyaNull, str } from "../../../lib/sharedChecks";
import { BANKA_STASH_KAYBI, letterOf } from "../articulation/checks";
import { turkceMi } from "../comm-board/checks";

export interface PhonationBody {
  targetSounds: string[];
  activityType: "sound_hunt" | "bingo" | "snakes_ladders" | "sound_maze";
  difficulty: "easy" | "medium" | "hard";
  itemCount: number;
  theme?: string;
}
type Rec = Record<string, unknown>;

/** Route'un `allBanked`'i: hedef seslerin HEPSİ kelime bankasında. Boş liste → yok. */
export function bankaVar(sounds: string[]): boolean {
  return sounds.length > 0 && sounds.every((s) => Object.hasOwn(articulation.WORD_BANK, articulation.soundToLetter(s)));
}

export type KelimeKaynagi = "banka" | "model";
/** Son içerikteki kelime/görsel-komutu/(bingo ve yılan–merdivende) hedef etiketini KİM yazdı?
    Route (`enrichContent`) bankalı seslerde bunları bankayla ezer — ama bilinen ürün hatası yüzünden (`BANKA_STASH_KAYBI`)
    yalnız öğrencisiz istekte: öğrenci seçiliyken stash kaybolur ve modelin 'geçici' kelimeleri kalır. Banka yazıyorsa bu alanlar
    sistemin çıktısıdır (puanlanmaz); model yazıyorsa modelin çıktısıdır (puanlanır). */
export function kelimeKaynagi(sounds: string[], ogrencili: boolean): KelimeKaynagi {
  return bankaVar(sounds) && !(BANKA_STASH_KAYBI && ogrencili) ? "banka" : "model";
}

/* Bayat bayrak tespiti: bankanın (kelime → görsel komutu) haritası. Öğrencili istekte kelimelerin çoğu bankadaki görsel komutunu
   AYNEN taşıyorsa sistem kelimeleri yazmıştır = ürün düzelmiştir. Kelimenin kendisi tek başına kanıt değil (model de "araba" yazar);
   bankanın görsel komutları ("a wooden wardrobe cabinet") ise modelin tesadüfen tutturamayacağı kadar özgüldür. */
let bankaGorselleri: Map<string, Set<string>> | undefined;
const gorselNormu = (s: string) => lower(s).replace(/\s+/g, " ").trim();
function bankaGorselHaritasi(): Map<string, Set<string>> {
  if (!bankaGorselleri) {
    bankaGorselleri = new Map();
    for (const pozisyonlar of Object.values(articulation.WORD_BANK)) {
      for (const liste of Object.values(pozisyonlar)) {
        for (const w of liste) {
          const kelime = lower(w.word).trim();
          const kume = bankaGorselleri.get(kelime) ?? new Set<string>();
          kume.add(gorselNormu(w.visualPrompt));
          bankaGorselleri.set(kelime, kume);
        }
      }
    }
  }
  return bankaGorselleri;
}
const BANKA_ESIGI = 0.8;

/** Sayı ya da sayı metni → sayı; başka her şey NaN (`Number(null)` = 0, `Number([5])` = 5 tuzaklarından kaçınır). Boş metin 0 olur:
    0 hiçbir geçerli satır/sütun/konum değildir. */
const sayiOf = (v: unknown): number => (typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN);
const tamSayi = (x: number) => Number.isInteger(x) && x > 0;

/** Labirent: ilk hücre (giriş) ile son hücre (çıkış) arasında hedefli (`hasTargetSound: true`) hücrelerden dört komşuluklu
    (sağ/sol/üst/alt; satır sonu → sonraki satır başı DEĞİL) bir yol var mı? Hücreler satır sıralı dizilir, sütun sayısı `cols`. */
function yolVar(cells: Rec[], cols: number): boolean {
  const n = cells.length;
  const hedefli = cells.map((c) => c.hasTargetSound === true);
  // Giriş hedefli olmalı; çıkışın hedefli olması aramadan çıkar (yol yalnız hedefli hücrelerden geçer).
  if (n < 2 || !tamSayi(cols) || !hedefli[0]) return false;
  const goruldu = new Array<boolean>(n).fill(false);
  goruldu[0] = true;
  const kuyruk = [0];
  while (kuyruk.length) {
    const i = kuyruk.shift()!;
    if (i === n - 1) return true;
    const sutun = i % cols;
    for (const j of [sutun > 0 ? i - 1 : -1, sutun < cols - 1 ? i + 1 : -1, i - cols, i + cols]) {
      if (j >= 0 && j < n && hedefli[j] && !goruldu[j]) {
        goruldu[j] = true;
        kuyruk.push(j);
      }
    }
  }
  return false;
}

/** Tema sözcüklerinin (≥ 4 harfli; durak sözcükler hariç) gövde önekleri: ilk 5 harf, altı harfliden kısada son harf atılır
    ("mutfak" → "mutfa" → "mutfağında" da eşleşir) ama gövde en az 4 harftir (dört harflide sözcüğün kendisi: "park" → "parıltı" ya da
    "okul" → "okuyor" eşleşmez). */
const DURAK = new Set(["için", "gibi", "daha", "veya", "olan"]);
function temaGovdeleri(tema: string | undefined): RegExp[] {
  return (lower(tema ?? "").match(/\p{L}+/gu) ?? [])
    .filter((k) => k.length >= 4 && !DURAK.has(k))
    .map((k) => new RegExp(`(?<!\\p{L})${k.slice(0, Math.max(4, Math.min(5, k.length - 1)))}`, "u"));
}

const BINGO_BOYUTLARI = [9, 16, 25];

/** Sesletim aktivitesine özgü kontroller. JSON geçerliliği, dil kuralı, rumuz ve yasak kalıp `studioAdapter`da ortaktır.

    Rota `activityType`, `targetSounds`, `difficulty` ve `theme`'i ezer (puanlanmaz; gövdeden okunur). Bankalı seslerde ayrıca kelime,
    görsel komutu ve (bingo/yılan–merdivende) hedef etiketini bankayla yazar — ama yalnız öğrencisiz istekte (bkz. `kelimeKaynagi`):
    o durumda `hedef_tutarli`, `tekrar_yok`, `gorsel_dolu` ve `gorsel_ingilizce` SİSTEMİN çıktısını ölçerdi (sabit 1) ve puanlanmaz;
    ayrıntıda `banka_tutarli` bilgi amaçlı kalır. Modelin payı yapıdır: öğe sayısı, ızgara boyutu, konumlar, hedef/çeldirici dağılımı
    (ses avı ve labirentte etiketler modelden KALIR), labirent yolu, yılan–merdiven yerleşimi, sahne, yönerge ve notlar. */
export function phonationChecks(args: { body: PhonationBody; output: unknown; raw?: Rec | null; text?: string; alias?: string | null }): ToolCheckOut {
  const { body } = args;
  const output = nesneVeyaNull(args.output);
  const letters = body.targetSounds.map(letterOf).filter(Boolean);
  const grid = nesneVeyaNull(output?.grid);
  const cells = kayitlar(grid?.cells);
  const objects = kayitlar(output?.objects);
  const hunt = body.activityType === "sound_hunt";
  const bingoBenzeri = body.activityType === "bingo" || body.activityType === "snakes_ladders";
  const items = hunt ? objects : cells;
  const n = cells.length;
  const kelime = (i: Rec) => lower(str(hunt ? i.name : i.word)).trim();
  const harfli = (i: Rec) => letters.some((l) => kelime(i).includes(l));
  const ogrencili = typeof args.alias === "string";
  const kaynak = kelimeKaynagi(body.targetSounds, ogrencili);

  const hard: string[] = [];
  if (output && items.length === 0) hard.push("yapi_yok");
  // Bayat bayrak: öğrencili + bankalı istekte kelimelerin çoğu bankanın görsel komutunu taşıyorsa ürün düzelmiştir
  // (BANKA_STASH_KAYBI false yapılmalı; öğrencili referanslar yeniden üretilmeli). Yoksa kelime puanları sessizce banka kelimelerini ölçerdi.
  if (output && BANKA_STASH_KAYBI && ogrencili && bankaVar(body.targetSounds) && items.length >= 4) {
    const harita = bankaGorselHaritasi();
    const bankali = items.filter((i) => harita.get(kelime(i))?.has(gorselNormu(str(i.visualPrompt))) === true).length;
    if (bankali / items.length >= BANKA_ESIGI) hard.push("banka_kaybi_tutarsiz");
  }

  // Yapı (prompt): ses avında sahne + nesneler, grid BOŞ; diğerlerinde ızgara, scene ve objects BOŞ.
  const sahne = str(output?.scene).trim() !== "";
  const yapi = hunt ? sahne && objects.length > 0 && cells.length === 0 : n > 0 && objects.length === 0 && !sahne;
  // Öğe sayısı (prompt): tombala itemCount'a göre 9→3×3, 16→4×4, 25→5×5; yılan–merdiven rows=itemCount/5, cols=5 (5'in katı değilse
  // alt ya da üst yuvarlama); ses avı ve labirent itemCount (±1). Izgara satır × sütun hücre sayısını tutmalı: arayüz sütun sayısıyla dizer.
  const rows = sayiOf(grid?.rows);
  const cols = sayiOf(grid?.cols);
  const itemCount = body.itemCount;
  let ogeSayisi: boolean;
  if (hunt) ogeSayisi = Math.abs(objects.length - itemCount) <= 1;
  else if (body.activityType === "bingo") {
    ogeSayisi = rows === cols && n === rows * cols && BINGO_BOYUTLARI.includes(n) && (!BINGO_BOYUTLARI.includes(itemCount) || n === itemCount);
  } else if (body.activityType === "snakes_ladders") {
    // 5'in katıysa alt ve üst yuvarlama aynıdır; değilse ikisi de kabul (prompt `rows=itemCount/5` der, kesirli satırı tanımlamaz).
    ogeSayisi = cols === 5 && [Math.floor(itemCount / 5), Math.ceil(itemCount / 5)].includes(rows) && n === rows * cols;
  } else ogeSayisi = tamSayi(rows) && tamSayi(cols) && n === rows * cols && Math.abs(n - itemCount) <= 1;

  const alanlar = mean(["title", "instructions", "expertNotes", "adaptations"].map((k) => (str(output?.[k]).trim() ? 1 : 0)));
  const scores: Record<string, number> = { yapi: yapi ? 1 : 0, oge_sayisi: ogeSayisi ? 1 : 0, alanlar };

  // Konum 1..N sırasıyla: yılan–merdiven arayüzü satırları konuma göre kurar, labirent giriş/çıkışı konumdan işaretler, tombala ortayı.
  if (!hunt) scores.pozisyon = n ? cells.filter((c, i) => sayiOf(c.position) === i + 1).length / n : 0;

  // Kelime düzeyi puanlar: kelimeleri model yazdıysa. Ses avı/labirentte etiket zorunlu ve harfle uyumlu (hedef sesli ⇔ hedef harfi taşır);
  // tombala ve yılan–merdivende prompt "tüm kelimeler hedef sesi içermeli" der (etiket false olamaz; arayüz bu iki türde etiketi okumaz).
  // Ses avı/labirentte etiket boolean olmalı: `harfli(i) === i.hasTargetSound` boolean olmayan etikette zaten tutmaz.
  const tutarli = (i: Rec) => kelime(i) !== "" && (bingoBenzeri ? harfli(i) && i.hasTargetSound !== false : harfli(i) === i.hasTargetSound);
  const tutarliOran = items.length ? frac(items, tutarli) : 0;
  const komutlar = items.map((i) => str(i.visualPrompt).trim()).filter(Boolean);
  if (kaynak === "model") {
    scores.hedef_tutarli = tutarliOran;
    // Banka seçimi tekrarsızdır (`selectWords`); aynı kelime iki hücrede/nesnede oyunu bozar. Boş kelime kimseyi saymaz.
    scores.tekrar_yok = items.length ? new Set(items.map(kelime).filter(Boolean)).size / items.length : 0;
    scores.gorsel_dolu = frac(items, (i) => str(i.visualPrompt).trim() !== "");
    // Dil yalnız dolu komutlarda ölçülür (eksiklik `gorsel_dolu`da cezalanır, iki puanda sayılmaz; komut yoksa kusur kanıtlanmamıştır: 1).
    scores.gorsel_ingilizce = komutlar.length ? frac(komutlar, (k) => !turkceMi(k)) : 1;
  }

  // Hedef/çeldirici dağılımı (modelden KALIR): hem hedefli hem çeldirici öğe olmalı ("hedef sesi içerenler + içermeyenler karışık").
  if (hunt || body.activityType === "sound_maze") {
    scores.celdirici = items.some((i) => i.hasTargetSound === true) && items.some((i) => i.hasTargetSound === false) ? 1 : 0;
  }
  if (body.activityType === "sound_maze") scores.yol_var = yolVar(cells, cols) ? 1 : 0;
  if (body.activityType === "snakes_ladders") {
    const merdiven = (c: Rec) => c.isLadder === true;
    const yilan = (c: Rec) => c.isSnake === true;
    const ozel = (c: Rec | undefined) => c !== undefined && (merdiven(c) || yilan(c));
    // "Bazı karelere" merdiven/yılan: ikisi de bulunur, aynı kare ikisi birden olmaz, azınlıkta kalır (≤ yarısı); başlangıç (🏁) ve bitiş (🏆)
    // karelerinde yılan/merdiven anlamsızdır (arayüz o karelere bayrak/kupa koyar).
    const iyi =
      cells.some(merdiven) && cells.some(yilan) && !cells.some((c) => merdiven(c) && yilan(c)) && cells.filter(ozel).length <= n / 2 && !ozel(cells[0]) && !ozel(cells.at(-1));
    scores.yilan_merdiven = iyi ? 1 : 0;
  }
  // Tema: ses avında tema yalnız SAHNEyi etkiler (banka kelimeleri temadan bağımsızdır); sahne tema sözcüğünün gövdesini taşımalı.
  if (hunt) {
    const govdeler = temaGovdeleri(body.theme);
    if (govdeler.length) scores.sahne_tema = govdeler.some((re) => re.test(lower(str(output?.scene)))) ? 1 : 0;
  }

  return {
    scores: { ...scores, talimat: output ? mean(Object.values(scores)) : 0 },
    details: { oge: items.length, kelimeler: kaynak, ...(kaynak === "banka" ? { banka_tutarli: tutarliOran } : {}), ...scores },
    hard,
  };
}
