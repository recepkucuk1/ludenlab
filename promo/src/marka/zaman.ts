// Marka filmi zaman ızgarası: 100 BPM, 4/4, 30 fps. Görüntü, efekt ve seslendirme bu ızgarayı okur.
export const BPM = 100;
export const FPS = 30;
export const VURUS_KARE = (FPS * 60) / BPM;

export type BolumId = "kanca" | "yuk" | "donus" | "studio" | "atolye" | "cocuk" | "kapanis";
/** Vuruşlar 1'den sayılır; ilk ve son dahil. */
export type Bolum = { id: BolumId; ilk: number; son: number };

/** Vuruş n'nin başladığı kare. */
export const kare = (vurus: number) => Math.round((vurus - 1) * VURUS_KARE);
/** Vuruş n'nin başladığı saniye. */
export const saniye = (vurus: number) => ((vurus - 1) * 60) / BPM;

/** 16:9 ana kurgu, 60 sn (spec: Bölümler). */
export const BOLUMLER_169: Bolum[] = [
  { id: "kanca", ilk: 1, son: 8 },
  { id: "yuk", ilk: 9, son: 24 },
  { id: "donus", ilk: 25, son: 32 },
  { id: "studio", ilk: 33, son: 52 },
  { id: "atolye", ilk: 53, son: 72 },
  { id: "cocuk", ilk: 73, son: 88 },
  { id: "kapanis", ilk: 89, son: 100 },
];

/** 9:16 kesim, 30 sn (spec: 9:16 kesim; "Çocuk + kapanış" 6 + 8 vuruş olarak bölünür). */
export const BOLUMLER_916: Bolum[] = [
  { id: "kanca", ilk: 1, son: 6 },
  { id: "yuk", ilk: 7, son: 14 },
  { id: "donus", ilk: 15, son: 20 },
  { id: "studio", ilk: 21, son: 28 },
  { id: "atolye", ilk: 29, son: 36 },
  { id: "cocuk", ilk: 37, son: 42 },
  { id: "kapanis", ilk: 43, son: 50 },
];

export const toplamKare = (b: Bolum[]) => b[b.length - 1].son * VURUS_KARE;
export const bolumKare = (b: Bolum) => ({ from: kare(b.ilk), durationInFrames: (b.son - b.ilk + 1) * VURUS_KARE });
