// apps/hub/evals/tools/studio/phonation/checks.ts
import { articulation } from "@ludenlab/ai";
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { alanlarDolu, frac, kayitlar, lower, mean, nesneVeyaNull, str, turkceMi } from "../../../lib/sharedChecks";
import { BANKA_STASH_KAYBI, letterOf } from "../articulation/checks";

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
    sistemin çıktısıdır (puanlanmaz); model yazıyorsa modelin çıktısıdır (puanlanır, ama bankalı seste talimata girmez: aşağıda). */
export function kelimeKaynagi(sounds: string[], ogrencili: boolean): KelimeKaynagi {
  return bankaVar(sounds) && !(BANKA_STASH_KAYBI && ogrencili) ? "banka" : "model";
}

/** Sayı ya da sayı metni → sayı; başka her şey NaN (`Number(null)` = 0, `Number([5])` = 5 tuzaklarından kaçınır). Boş metin 0 olur:
    0 hiçbir geçerli satır/sütun/konum değildir. */
export const sayiOf = (v: unknown): number => (typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN);
const tamSayi = (x: number) => Number.isInteger(x) && x > 0;

/** Öğenin kelimesi (ses avında nesne adı, ızgarada hücre kelimesi): tr-TR küçük harf, kenar boşluksuz. */
const ogeKelimesi = (hunt: boolean) => (i: Rec) => lower(str(hunt ? i.name : i.word)).trim();

/* ── Banka tespiti ──
   Bankanın (kelime → görsel komutu) haritası. Bir çıktıdaki kelimelerin çoğu bankadaki görsel komutunu AYNEN taşıyorsa kelimeleri
   sistem bankadan yazmıştır. Kelimenin kendisi tek başına kanıt değil (model de "araba" yazar); bankanın görsel komutları
   ("a wooden wardrobe cabinet") ise modelin tesadüfen tutturamayacağı kadar özgüldür. İki işte kullanılır: öğrencili çıktıda bayat bayrak
   tespiti (`bayatBanka`) ve hakem çiziminin bankalı çıktıyı sıkıştırması (adaptör). */
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
const BANKA_EN_AZ_OGE = 4;

/** Çıktıdaki öğelerin kelimeleri ve görsel komutları sistem bankasından mı geldi? (en az 4 öğe, hedef sesler bankalı, öğelerin ≥ %80'i
    bankanın o kelime için görsel komutunu taşıyor). */
export function bankaYazmis(items: Rec[], hunt: boolean, targetSounds: string[]): boolean {
  if (!bankaVar(targetSounds) || items.length < BANKA_EN_AZ_OGE) return false;
  const harita = bankaGorselHaritasi();
  const kelime = ogeKelimesi(hunt);
  const bankali = items.filter((i) => harita.get(kelime(i))?.has(gorselNormu(str(i.visualPrompt))) === true).length;
  return bankali / items.length >= BANKA_ESIGI;
}

/** Bayat bayrak: öğrencili + bankalı istekte kelimeler bankadan geliyorsa ürün düzelmiştir (BANKA_STASH_KAYBI false yapılmalı; öğrencili
    referanslar yeniden üretilmeli). Yoksa kelime puanları sessizce banka kelimelerini ölçerdi. */
function bayatBanka(items: Rec[], body: PhonationBody, ogrencili: boolean): boolean {
  return BANKA_STASH_KAYBI && ogrencili && bankaYazmis(items, body.activityType === "sound_hunt", body.targetSounds);
}

/** Tombala serbest karesi: arayüz (`BingoView`) kare ızgarada (`rows === cols`) `position === ceil(rows×cols/2)` hücresini kelime yerine
    "⭐ SES" serbest karesi olarak çizer: o hücrenin kelimesi kullanıcıya hiç gösterilmez. Kare değilse (4×4'te bile serbest kare 8. konumda)
    ya da satır/sütun sayı değilse yok (null). Etkinlik türü bingo mu, çağıran bilir. */
export function bingoSerbestPozisyon(grid: Rec | null): number | null {
  const rows = sayiOf(grid?.rows);
  const cols = sayiOf(grid?.cols);
  return tamSayi(rows) && rows === cols ? Math.ceil((rows * cols) / 2) : null;
}

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

const BINGO_BOYUTLARI = [9, 16, 25];

/** Öğe sayısı/ızgara boyutu (prompt): tombala itemCount'a göre 9→3×3, 16→4×4, 25→5×5; yılan–merdiven rows=itemCount/5, cols=5 (5'in
    katı değilse alt ya da üst yuvarlama); ses avı ve labirent itemCount (±1). Izgara satır × sütun hücre sayısını tutmalı: arayüz
    sütun sayısıyla dizer. */
function ogeSayisiDogru(body: PhonationBody, g: { nesne: number; hucre: number; rows: number; cols: number }): boolean {
  const { hucre: n, rows, cols } = g;
  const itemCount = body.itemCount;
  switch (body.activityType) {
    case "sound_hunt":
      return Math.abs(g.nesne - itemCount) <= 1;
    case "bingo":
      return rows === cols && n === rows * cols && BINGO_BOYUTLARI.includes(n) && (!BINGO_BOYUTLARI.includes(itemCount) || n === itemCount);
    case "snakes_ladders":
      // 5'in katıysa alt ve üst yuvarlama aynıdır; değilse ikisi de kabul (prompt `rows=itemCount/5` der, kesirli satırı tanımlamaz).
      return cols === 5 && [Math.floor(itemCount / 5), Math.ceil(itemCount / 5)].includes(rows) && n === rows * cols;
    case "sound_maze":
      return tamSayi(rows) && tamSayi(cols) && n === rows * cols && Math.abs(n - itemCount) <= 1;
  }
}

/** Yılan–merdiven yerleşimi. Prompt: "bazı karelere isLadder:true (…), isSnake:true (…) ekle": ikisi de bulunur, aynı kare ikisi birden
    olmaz, azınlıkta kalır (≤ yarısı). Bitiş karesinde (🏆) yılan/merdiven, başlangıç karesinde (🏁) yılan anlamsızdır (başlangıçta merdiven
    olabilir). Başlangıç/bitiş kuralı prompt'ta YOK, arayüzün 🏁/🏆 işaretlerinden türetildi: baseline bu yüzden düşük puan alabilir (tasarım gereği). */
function yilanMerdivenIyi(cells: Rec[]): boolean {
  const merdiven = (c: Rec) => c.isLadder === true;
  const yilan = (c: Rec) => c.isSnake === true;
  const ilk = cells[0];
  const son = cells.at(-1);
  return (
    cells.some(merdiven) &&
    cells.some(yilan) &&
    !cells.some((c) => merdiven(c) && yilan(c)) &&
    cells.filter((c) => merdiven(c) || yilan(c)).length <= cells.length / 2 &&
    !(ilk !== undefined && yilan(ilk)) &&
    !(son !== undefined && (merdiven(son) || yilan(son)))
  );
}

/** Kelime düzeyi puanlar (kelimeleri model yazdıysa anlamlı). Ses avı/labirentte etiket zorunlu ve harfle uyumlu (hedef sesli ⇔ hedef harfi
    taşır); tombala ve yılan–merdivende prompt "tüm kelimeler hedef sesi içermeli" der (etiket false olamaz; arayüz bu iki türde etiketi
    okumaz). `ogeler` serbest kare hariçtir. `gorsel_dolu` YALNIZ ayrıntıdır: prompt soyut/çok heceli/eylem kelimelerinde boş görsel
    komutuna izin verir. */
function kelimePuanlari(ogeler: Rec[], body: PhonationBody): { puanlar: Record<string, number>; tutarliOran: number; gorselDolu: number } {
  const hunt = body.activityType === "sound_hunt";
  const bingoBenzeri = body.activityType === "bingo" || body.activityType === "snakes_ladders";
  const letters = body.targetSounds.map(letterOf).filter(Boolean);
  const kelime = ogeKelimesi(hunt);
  const harfli = (i: Rec) => letters.some((l) => kelime(i).includes(l));
  // Ses avı/labirentte etiket boolean olmalı: `harfli(i) === i.hasTargetSound` boolean olmayan etikette zaten tutmaz.
  const tutarli = (i: Rec) => kelime(i) !== "" && (bingoBenzeri ? harfli(i) && i.hasTargetSound !== false : harfli(i) === i.hasTargetSound);
  const tutarliOran = frac(ogeler, tutarli);
  const komutlar = ogeler.map((i) => str(i.visualPrompt).trim()).filter(Boolean);
  const puanlar: Record<string, number> = {
    hedef_tutarli: tutarliOran,
    // Banka seçimi tekrarsızdır (`selectWords`); aynı kelime iki hücrede/nesnede oyunu bozar. Boş kelime kimseyi saymaz.
    tekrar_yok: ogeler.length ? new Set(ogeler.map(kelime).filter(Boolean)).size / ogeler.length : 0,
  };
  // Dil yalnız dolu komutlarda ölçülür; komut yoksa dil kanıtlanamaz: puan YAZILMAZ (comm-board ile aynı kural).
  if (komutlar.length) puanlar.gorsel_ingilizce = frac(komutlar, (k) => !turkceMi(k));
  return { puanlar, tutarliOran, gorselDolu: frac(ogeler, (i) => str(i.visualPrompt).trim() !== "") };
}

/** Sesletim aktivitesine özgü kontroller. JSON geçerliliği, dil kuralı, rumuz ve yasak kalıp `studioAdapter`da ortaktır.

    Kural: `talimat` bileşeni yalnız çıktı route prompt'unun söylediği ya da arayüzün okuduğu bir şeyi bozuyorsa düşer; gerisi ayrıntıya
    (`details`) ya da hakeme gider. Bu yüzden: `gorsel_dolu` (prompt soyut kelimede boş komuta izin verir) ayrıntıdır; tema uyumu
    (banka kelimeleri temadan bağımsızdır, yalnız ses avının sahnesi temaya bağlıdır) hakem sorusudur.

    Rota `activityType`, `targetSounds`, `difficulty` ve `theme`'i ezer (puanlanmaz; gövdeden okunur). Bankalı seslerde ayrıca kelime,
    görsel komutu ve (bingo/yılan–merdivende) hedef etiketini bankayla yazar — ama yalnız öğrencisiz istekte (bkz. `kelimeKaynagi`):
    o durumda kelime puanları SİSTEMİN çıktısını ölçerdi (sabit 1) ve yazılmaz; ayrıntıda `banka_tutarli` bilgi amaçlı kalır.
    Öğrencili (bilinen ürün hatası) bankalı istekte kelime puanları (`hedef_tutarli`, `tekrar_yok`, `gorsel_ingilizce`) yazılır ama
    TALİMATA GİRMEZ: prompt modele "geçici kelime yaz… kelime seçimine takılma" der, yani kelime kalitesi bu istekte prompt'un
    istediği bir şey değildir (ürün hatası yüzünden kullanıcıya ulaşsa da). Bankasız seste kelimeleri model gerçekten seçer: `hedef_tutarli` ve
    `gorsel_ingilizce` talimata girer, `tekrar_yok` yalnız ayrıntıya düşer (UI'nin sunduğu seslerin hepsi bankalı: bu yol ulaşılamaz).
    Modelin payı yapıdır: öğe sayısı, ızgara boyutu, konumlar, hedef/çeldirici dağılımı (ses avı ve labirentte etiketler modelden KALIR),
    labirent yolu, yılan–merdiven yerleşimi, sahne, yönerge ve notlar. */
export function phonationChecks(args: { body: PhonationBody; output: unknown; raw?: Rec | null; text?: string; alias?: string | null }): ToolCheckOut {
  const { body } = args;
  const output = nesneVeyaNull(args.output);
  const grid = nesneVeyaNull(output?.grid);
  const cells = kayitlar(grid?.cells);
  const objects = kayitlar(output?.objects);
  const hunt = body.activityType === "sound_hunt";
  const items = hunt ? objects : cells;
  const n = cells.length;
  const ogrencili = typeof args.alias === "string";
  const kaynak = kelimeKaynagi(body.targetSounds, ogrencili);

  const hard: string[] = [];
  if (output && items.length === 0) hard.push("yapi_yok");
  if (output && bayatBanka(items, body, ogrencili)) hard.push("banka_kaybi_tutarsiz");

  // Yapı (prompt): ses avında sahne + nesneler, grid BOŞ; diğerlerinde ızgara, scene ve objects BOŞ.
  const sahne = str(output?.scene).trim() !== "";
  const yapi = hunt ? sahne && objects.length > 0 && cells.length === 0 : n > 0 && objects.length === 0 && !sahne;
  const rows = sayiOf(grid?.rows);
  const cols = sayiOf(grid?.cols);
  const yapisal: Record<string, number> = {
    yapi: yapi ? 1 : 0,
    oge_sayisi: ogeSayisiDogru(body, { nesne: objects.length, hucre: n, rows, cols }) ? 1 : 0,
    alanlar: alanlarDolu(output, ["title", "instructions", "expertNotes", "adaptations"]),
  };
  // Konum 1..N sırasıyla: yılan–merdiven arayüzü satırları konuma göre kurar, labirent giriş/çıkışı konumdan işaretler, tombala ortayı.
  if (!hunt) yapisal.pozisyon = n ? cells.filter((c, i) => sayiOf(c.position) === i + 1).length / n : 0;
  // Hedef/çeldirici dağılımı (modelden KALIR): hem hedefli hem çeldirici öğe olmalı ("hedef sesi içerenler + içermeyenler karışık").
  if (hunt || body.activityType === "sound_maze") {
    yapisal.celdirici = items.some((i) => i.hasTargetSound === true) && items.some((i) => i.hasTargetSound === false) ? 1 : 0;
  }
  // Doğru yol bağlantısı prompt'ta YOK ("grid tabanlı basit labirent; doğru yol hedef sesli kelimeler" der); arayüzün giriş/çıkış işaretleri ve
  // "hedef sesi içeren kelimeleri takip ederek çıkışa ulaşın" yönergesinden türetilmiş çözülebilirlik kuralı: baseline bu yüzden düşük puan
  // alabilir (tasarım gereği).
  if (body.activityType === "sound_maze") yapisal.yol_var = yolVar(cells, cols) ? 1 : 0;
  if (body.activityType === "snakes_ladders") yapisal.yilan_merdiven = yilanMerdivenIyi(cells) ? 1 : 0;

  // Kelime puanları: tombala serbest karesi (arayüz kelimeyi göstermez) hariç.
  const serbest = body.activityType === "bingo" ? bingoSerbestPozisyon(grid) : null;
  const kelimeOgeleri = serbest === null ? items : items.filter((i) => sayiOf(i.position) !== serbest);
  const kelime = kelimePuanlari(kelimeOgeleri, body);
  const bankali = bankaVar(body.targetSounds);
  // Bankasız seste (UI'nin sunduğu seslerin hepsi bankalı: ulaşılamayan yol) `tekrar_yok` yalnız ayrıntıdır: puan olarak yazılmaz,
  // talimata girmez. Prompt "tekrarsız kelime" demez; tekrarsızlığı bankanın seçimi (`selectWords`) sağlar, bankasız yolun ürün karşılığı yok.
  const { tekrar_yok: tekrarYok, ...kelimeDigerleri } = kelime.puanlar;
  const kelimeScores = kaynak === "model" ? (bankali ? kelime.puanlar : kelimeDigerleri) : {};
  // Bankalı seste kelimeler prompt'ta "geçici": kelime puanları yazılır ama talimata girmez.
  const talimatParcalari = bankali ? yapisal : { ...yapisal, ...kelimeScores };

  return {
    scores: { ...yapisal, ...kelimeScores, talimat: output ? mean(Object.values(talimatParcalari)) : 0 },
    details: {
      oge: items.length,
      kelimeler: kaynak,
      gorsel_dolu: kelime.gorselDolu,
      ...(serbest === null ? {} : { serbest_kare: serbest }),
      ...(kaynak === "banka" ? { banka_tutarli: kelime.tutarliOran } : {}),
      ...(kaynak === "model" && !bankali ? { tekrar_yok: tekrarYok } : {}),
      ...yapisal,
      ...kelimeScores,
    },
    hard,
  };
}
