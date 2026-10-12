// Vuruş olayları: görüntü (acilisDurumu.ts, filmDurumu.ts) ve efekt izi (scripts/lib/sfx.ts) aynı sayıları okur.

export type SesTuru = "whoosh" | "tok" | "tik" | "kagit" | "donus" | "sayfa" | "can";
/** vurus: 1'den sayılır; vurusSure: süreli seslerin vuruş cinsinden uzunluğu; perde: tık perdesi çarpanı (1 = temel). */
export type SesOlayi = { vurus: number; tur: SesTuru; vurusSure?: number; perde?: number };

/** Kanca (v1–8) görüntü vuruşları (spec "0 · Kanca"). */
export const KANCA = {
  /** Blok düşmeye başlar. */
  dusus: 1,
  /** Blok yuvasına tok oturur. */
  inis: 3,
  /** Başlık satırlarının açıldığı vuruşlar ("HER ÇOCUK", "AYRI."). */
  baslik: [1, 3],
  /** Üst cümle ("Özel eğitimde"). */
  ustCumle: 5,
  /** Etiket çizgilerinin raptiyeye vardığı vuruşlar (HEDEFLER sırasıyla). */
  etiketler: [5, 6, 7],
} as const;

export type YiginId = "S1" | "S2" | "S3" | "S4";
/** Bir deste: vuruşunda yığınına iner; etiketliyse o vuruşta adı görünür. */
export type Deste = { vurus: number; yigin: YiginId; adet: number; etiket?: string };

/** Yük (v9–24, spec "1 · Yük"): her vuruşta bir deste; desteler büyür, ön yığın (S4) v22'de bloğu örter. */
export const YUK: { baslik: number; altCumle: number; desteler: readonly Deste[] } = {
  baslik: 9,
  altCumle: 19,
  desteler: [
    { vurus: 9, yigin: "S3", adet: 2, etiket: "seans planı" },
    { vurus: 10, yigin: "S1", adet: 2 },
    { vurus: 11, yigin: "S2", adet: 3, etiket: "BEP" },
    { vurus: 12, yigin: "S4", adet: 3 },
    { vurus: 13, yigin: "S3", adet: 3, etiket: "çalışma kâğıdı" },
    { vurus: 14, yigin: "S1", adet: 4 },
    { vurus: 15, yigin: "S2", adet: 4, etiket: "veli mektubu" },
    { vurus: 16, yigin: "S4", adet: 4 },
    { vurus: 17, yigin: "S3", adet: 5, etiket: "hedef takibi" },
    { vurus: 18, yigin: "S1", adet: 5 },
    { vurus: 19, yigin: "S2", adet: 5, etiket: "ev ödevi" },
    { vurus: 20, yigin: "S4", adet: 6 },
    { vurus: 21, yigin: "S3", adet: 4, etiket: "rapor" },
    { vurus: 22, yigin: "S4", adet: 8 },
  ],
};

/** Dönüş (v25–32, spec "2 · Dönüş"). */
export const DONUS = {
  /** Tabla −90° döner, kamera nefes alır, kâğıtlar kalkar. */
  tabla: 25,
  /** "Bu yükü tek başına…" satır satır. */
  cumle: 26,
  /** Kâğıtlar modül yığınlarına oturdukça tık. */
  yerlesme: [26, 27, 28],
  /** Künye (logo + adres) gelir. */
  kunye: 29,
  /** "01 Studio", "02 Atölye" çipleri. */
  cipler: [29, 30],
} as const;

/** Studio (v33–52, spec "3 · Studio"). */
export const STUDIO = {
  /** Tabla −180°, kamera Studio yığınına; "01 STUDIO" kilidi. */
  tabla: 33,
  kilit: 33,
  /** "Dil ve konuşma alanında çalışan uzmanlar için." */
  kitle: 34,
  /** dil, konuşma, işitme etiketleri raptiyeye varır. */
  etiketler: [37, 38, 39],
  /** Üst kâğıt kalkar, Artikülasyon kâğıdına açılır (2 vuruş). */
  kart: 41,
  /** "Hedef sesi seç; …" */
  cumle: 42,
  /** hedef ses: /r/, görseliyle kelimeler. */
  kartEtiketleri: [44, 45],
  /** "Öğrenme Kartı · Sosyal Hikaye · Artikülasyon ve 7 araç daha" */
  araclar: 47,
  /** Deste çevrilir: Sosyal Hikaye, sonra Öğrenme Kartı öne gelir. */
  cevir: [48, 50],
} as const;

/** Atölye (v53–72, spec "4 · Atölye"). */
export const ATOLYE = {
  /** Tabla −270°, kamera Atölye yığınına; "02 ATÖLYE" kilidi. */
  tabla: 53,
  kilit: 53,
  /** "Öğrenme güçlüğü alanında çalışan uzmanlar için." */
  kitle: 54,
  /** MEB program adı · 172 hedef. */
  meb: 55,
  /** modül → bölüm → hedef basamakları (perde yükselir). */
  basamaklar: [57, 58, 59],
  /** Üst kâğıt seans planı taslağına açılır (2 vuruş). */
  kart: 61,
  /** "Hedefini seç; …" */
  cumle: 62,
  /** TASLAK damgası iner. */
  damga: 65,
  /** "Son söz her zaman senin." */
  sonSoz: 66,
  /** MEB hedefi 3.1.2, etkinlik akışı. */
  kartEtiketleri: [67, 68],
  /** "Seans Planı · BEP & Rapor · Veli Mektubu ve 8 araç daha" */
  araclar: 69,
} as const;

/** Çocuk (v73–88, spec "5 · Çocuk"). */
export const COCUK = {
  /** Tabla son çeyreği döner (−360°), kamera genel plana; modül yığınları incelip kenara kayar. */
  tabla: 73,
  /** "VAKTİN / ÇOCUĞA / KALSIN." satırları bu vuruşlarda açılmaya başlar. */
  baslik: [74, 75, 76],
  /** Açılışın üç hedef etiketi modül renkleriyle raptiyeye varır (yumuşak tık). */
  etiketler: [77, 78, 79],
  /** Etiketler çıkar, yatay yörünge çizilmeye başlar (Çocuk'un son ölçüsü); yükselen whoosh. */
  yorunge: 85,
  /** Başlık çıkar. */
  baslikCikis: 88,
} as const;

/** Kapanış (v89–100, spec "6 · Kapanış"). */
export const KAPANIS = {
  /** Tabla ve yığınlar bulanıklaşarak çekilir (2 vuruş); whoosh doruğa varır. */
  cekilme: 89,
  /** "HER ŞEY / ÇOCUĞUN / ETRAFINDA." satırları bu vuruşlarda açılmaya başlar. */
  baslik: [89, 90, 91],
  /** Yatay yörünge tamamlanır; dikey yörünge yükselir (2 vuruş). */
  dikey: 90,
  /** Künye gider (logo iki kez görünmesin). */
  kunye: 92,
  /** Halkalar işarete dönüşür (2 vuruş), blok kesişime akar; çan. Başlık çıkar. */
  donusum: 93,
  /** Logo kilidi oturur (seslendirme "Luden Lab"). */
  logo: 94,
  /** Slogan, çipler ve ludenlab.com düğmesi. */
  slogan: 95,
  /** Düğme basılır; tık. */
  dugme: 96,
} as const;

const olaylar: SesOlayi[] = [
  { vurus: KANCA.dusus, tur: "whoosh", vurusSure: KANCA.inis - KANCA.dusus },
  { vurus: KANCA.inis, tur: "tok" },
  ...KANCA.etiketler.map((vurus): SesOlayi => ({ vurus, tur: "tik" })),
  ...YUK.desteler.map((d): SesOlayi => ({ vurus: d.vurus, tur: "kagit" })),
  { vurus: DONUS.tabla, tur: "donus", vurusSure: 2 },
  ...DONUS.yerlesme.map((vurus): SesOlayi => ({ vurus, tur: "tik" })),
  { vurus: DONUS.kunye, tur: "tik" },
  { vurus: STUDIO.tabla, tur: "donus", vurusSure: 2 },
  ...STUDIO.etiketler.map((vurus): SesOlayi => ({ vurus, tur: "tik" })),
  { vurus: STUDIO.kart, tur: "sayfa" },
  ...STUDIO.kartEtiketleri.map((vurus): SesOlayi => ({ vurus, tur: "tik" })),
  ...STUDIO.cevir.map((vurus): SesOlayi => ({ vurus, tur: "sayfa" })),
  { vurus: ATOLYE.tabla, tur: "donus", vurusSure: 2 },
  ...ATOLYE.basamaklar.map((vurus, i): SesOlayi => ({ vurus, tur: "tik", perde: 1 + 0.13 * i })),
  { vurus: ATOLYE.kart, tur: "sayfa" },
  { vurus: ATOLYE.damga, tur: "tok" },
  ...ATOLYE.kartEtiketleri.map((vurus): SesOlayi => ({ vurus, tur: "tik" })),
  { vurus: COCUK.tabla, tur: "donus", vurusSure: 2 },
  ...COCUK.etiketler.map((vurus): SesOlayi => ({ vurus, tur: "tik", perde: 0.8 })),
  { vurus: COCUK.yorunge, tur: "whoosh", vurusSure: KAPANIS.cekilme - COCUK.yorunge },
  { vurus: KAPANIS.donusum, tur: "can" },
  { vurus: KAPANIS.dugme, tur: "tik" },
];

/** 16:9 ses olayları, vuruş sırasıyla (kararlı sıralama: aynı vuruştakiler listedeki sırayı korur). */
export const SESLER_169: SesOlayi[] = [...olaylar].sort((a, b) => a.vurus - b.vurus);
