export type SceneScript = {
  id: string;
  /** Seslendirme metni — altyazı da bundan üretilir. */
  vo: string;
  /** Ekranda vo'dan farklı yazılması gerekiyorsa (ör. TTS için "Luden Lab" → "LudenLab"). */
  caption?: string;
  /** Ekrandaki ana yazı / sahne notu (spec tablosundaki "Ekran" sütunu). */
  screen: string;
  /** Ses dosyası yokken sahne süresi (sn). */
  defaultSec: number;
  /** Sahnenin animasyonu için gereken asgari süre (sn); kısa sesle de kesilmez. */
  minSec?: number;
  /** Kapanış kartı gibi yazının zaten ekranda olduğu sahnelerde altyazıyı gizler. */
  hideCaption?: boolean;
};

export type ReelScript = {
  /** "r1" — ses dosyası öneki ve betik argümanı. */
  id: string;
  /** "r1-lansman" — çıktı dosya adı. */
  slug: string;
  title: string;
  scenes: SceneScript[];
};

export type TimelineScene = {
  id: string;
  from: number;
  durationInFrames: number;
  /** Altyazının tamamlanacağı kare sayısı (sahne başından). */
  captionFrames: number;
  /** `public/` altındaki yol; ses yoksa null. */
  audioSrc: string | null;
};

export type Timeline = {
  scenes: TimelineScene[];
  durationInFrames: number;
};
