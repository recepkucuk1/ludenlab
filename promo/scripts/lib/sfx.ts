import type { SesOlayi } from "../../src/marka/olaylar.ts";

// Vuruş ızgarasındaki olaylardan efekt izi (LudenMain/video/scripts/sfx.mjs'ten uyarlandı).
// Bağımlılıksız; tohumlu gürültü: aynı olay listesi her zaman aynı izi verir.

export const ORNEKLEME = 44100;

/** Olay listesini mono örneklere çevirir; son olaydan sonra 2 sn kuyruk bırakır. */
export function sesIzi(olaylar: SesOlayi[], bpm: number, sr = ORNEKLEME): Float32Array {
  const vurusSn = 60 / bpm;
  const zaman = (v: number) => (v - 1) * vurusSn;
  const sure = Math.max(...olaylar.map((s) => zaman(s.vurus) + (s.vurusSure ?? 0) * vurusSn)) + 2;
  const cikis = new Float32Array(Math.ceil(sr * sure));

  let tohum = 11;
  const gurultu = () => ((tohum = (tohum * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const uret = (sn: number, f: (t: number) => number) => {
    const o = new Float32Array(Math.floor(sn * sr));
    for (let i = 0; i < o.length; i++) o[i] = f(i / sr);
    return o;
  };
  const ekle = (t0: number, o: Float32Array) => {
    const bas = Math.round(t0 * sr);
    for (let i = 0; i < o.length && bas + i < cikis.length; i++) if (bas + i >= 0) cikis[bas + i] += o[i];
  };

  // Kesim frekansı yükselen gürültü; tam bitiş anında (iniş) susar.
  const whoosh = (sn: number) => {
    let lp = 0;
    return uret(sn, (t) => {
      const u = t / sn;
      const kesim = 250 + 3200 * u * u;
      const a = 1 - Math.exp((-2 * Math.PI * kesim) / sr);
      lp += a * (gurultu() - lp);
      const zarf = Math.pow(u, 1.6) * Math.min(1, (sn - t) / 0.03);
      return 0.5 * zarf * lp;
    });
  };
  // Ahşap blok inişi: alçak gövde darbesi + kısa tahta tıkırtısı.
  const tok = () => {
    let faz = 0;
    return uret(0.45, (t) => {
      faz += (2 * Math.PI * (55 + 60 * Math.exp(-t * 30))) / sr;
      const govde = Math.sin(faz) * Math.exp(-t * 10) * 0.85;
      const tahta = (Math.sin(2 * Math.PI * 680 * t) * 0.3 + Math.sin(2 * Math.PI * 1150 * t) * 0.18) * Math.exp(-t * 45);
      const tik = t < 0.004 ? gurultu() * 0.25 * (1 - t / 0.004) : 0;
      return govde + tahta + tik;
    });
  };
  // Etiket varışı: kısa, parlak tık.
  const tik = () =>
    uret(0.08, (t) => {
      const ton = (Math.sin(2 * Math.PI * 2200 * t) * 0.6 + Math.sin(2 * Math.PI * 3300 * t) * 0.18) * Math.exp(-t * 90);
      const tiklama = t < 0.003 ? gurultu() * 0.3 * (1 - t / 0.003) : 0;
      return ton + tiklama;
    });

  for (const s of olaylar) {
    const t0 = zaman(s.vurus);
    switch (s.tur) {
      case "whoosh":
        ekle(t0, whoosh((s.vurusSure ?? 1) * vurusSn));
        break;
      case "tok":
        ekle(t0, tok());
        break;
      case "tik":
        ekle(t0, tik());
        break;
      default: {
        const bilinmeyen: never = s.tur;
        throw new Error(`bilinmeyen ses: ${String(bilinmeyen)}`);
      }
    }
  }
  return cikis;
}

/** Tepesi 0,8'e ölçeklenmiş, iki kanalı eş 16 bit PCM WAV (müzikle aynı kanal düzeni). */
export function wavYaz(ornekler: Float32Array, sr = ORNEKLEME): Buffer {
  let tepe = 0;
  for (const x of ornekler) tepe = Math.max(tepe, Math.abs(x));
  const kazanc = tepe > 0 ? 0.8 / tepe : 0;
  const N = ornekler.length;
  const buf = Buffer.alloc(44 + N * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + N * 4, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) {
    const o = Math.max(-32768, Math.min(32767, Math.round(ornekler[i] * kazanc * 32767)));
    buf.writeInt16LE(o, 44 + i * 4);
    buf.writeInt16LE(o, 46 + i * 4);
  }
  return buf;
}
