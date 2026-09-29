import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { ORNEKLEME, muzikIzi, shakerBankasi, stereoWavYaz, type StereoIz } from "../scripts/lib/muzik.ts";
import { akorSegmentleri, katmanSec, vurustakiAkor } from "../src/marka/muzikPlani.ts";
import { BOLUMLER_169, BOLUMLER_916, saniye, type Bolum } from "../src/marka/zaman.ts";

// Her biçim bir kez çizilir; dinamik testleri aynı izi okur.
const iz169 = muzikIzi(BOLUMLER_169, { sonAkorVurusu: 93 });
const iz916 = muzikIzi(BOLUMLER_916);

/** İki kanalın birlikte RMS'i, [a, b) saniye aralığında. */
const rms = (iz: StereoIz, a: number, b: number) => {
  const i0 = Math.max(0, Math.round(a * ORNEKLEME)), i1 = Math.min(iz.sol.length, Math.round(b * ORNEKLEME));
  let s = 0;
  for (let i = i0; i < i1; i++) s += iz.sol[i] ** 2 + iz.sag[i] ** 2;
  return Math.sqrt(s / Math.max(1, 2 * (i1 - i0)));
};
const vurusRms = (iz: StereoIz, v: number) => rms(iz, saniye(v), saniye(v + 1));
const araRms = (iz: StereoIz, ilk: number, son: number) => rms(iz, saniye(ilk), saniye(son + 1));
const ozet = (iz: StereoIz) => createHash("sha256").update(Buffer.from(iz.sol.buffer)).update(Buffer.from(iz.sag.buffer)).digest("hex");

test("16:9 akorları: bölüm başından 4 vuruşta bir, Atölye G'den başlar, v93'te son C", () => {
  const beklenen: [number, string][] = [
    [1, "Am"], [5, "F"], [8, "F"],
    [9, "Am"], [13, "F"], [17, "C"], [21, "G"], [24, "G"],
    [25, "C"], [29, "G"],
    [33, "C"], [37, "G"], [41, "Am"], [45, "F"], [49, "C"],
    [53, "G"], [57, "Am"], [61, "F"], [65, "C"], [69, "G"],
    [73, "F"], [77, "C"], [81, "Am"], [85, "F"],
    [89, "G"], [92, "G"], [93, "C"], [100, "C"],
  ];
  for (const [v, akor] of beklenen) assert.equal(vurustakiAkor(BOLUMLER_169, v, 93)?.akor, akor, `v${v}`);
  assert.equal(vurustakiAkor(BOLUMLER_169, 92, 93)?.kapanisAkoru, false);
  assert.deepEqual(
    { ...vurustakiAkor(BOLUMLER_169, 93, 93) },
    { bolum: "kapanis", indeks: 1, akor: "C", ilk: 93, son: 100, kapanisAkoru: true },
  );
});

test("9:16 akorları: 4'ün katı olmayan bölüm kısa akorla biter", () => {
  // kanca v1–6: Am (1–4) + F (5–6); dönüş v15–20: C (15–18) + G (19–20)
  assert.equal(vurustakiAkor(BOLUMLER_916, 4)?.akor, "Am");
  assert.deepEqual(
    { ...vurustakiAkor(BOLUMLER_916, 6) },
    { bolum: "kanca", indeks: 1, akor: "F", ilk: 5, son: 6, kapanisAkoru: false },
  );
  assert.equal(vurustakiAkor(BOLUMLER_916, 7)?.akor, "Am");
  assert.equal(vurustakiAkor(BOLUMLER_916, 18)?.akor, "C");
  assert.deepEqual({ ...vurustakiAkor(BOLUMLER_916, 19) }, { bolum: "donus", indeks: 1, akor: "G", ilk: 19, son: 20, kapanisAkoru: false });
  assert.deepEqual({ ...vurustakiAkor(BOLUMLER_916, 41) }, { bolum: "cocuk", indeks: 1, akor: "Am", ilk: 41, son: 42, kapanisAkoru: false });
  // son akor varsayılanı: kapanış.ilk + 4 = v47
  assert.equal(vurustakiAkor(BOLUMLER_916, 46)?.akor, "G");
  assert.deepEqual({ ...vurustakiAkor(BOLUMLER_916, 47) }, { bolum: "kapanis", indeks: 1, akor: "C", ilk: 47, son: 50, kapanisAkoru: true });
});

test("akor bölütleri her vuruşu bir kez kapsar, bölüt en çok 4 vuruş (son akor hariç)", () => {
  for (const [bolumler, son] of [[BOLUMLER_169, 93], [BOLUMLER_916, undefined]] as [Bolum[], number | undefined][]) {
    const b = akorSegmentleri(bolumler, son);
    assert.equal(b[0].ilk, 1);
    b.forEach((s, i) => {
      if (i > 0) assert.equal(s.ilk, b[i - 1].son + 1);
      if (!s.kapanisAkoru) assert.ok(s.son - s.ilk + 1 <= 4, `${s.bolum} v${s.ilk}`);
    });
    assert.equal(b[b.length - 1].son, bolumler[bolumler.length - 1].son);
    assert.equal(b.filter((s) => s.kapanisAkoru).length, 1);
  }
});

test("son akor vuruşu kapanış bölümünün dışındaysa hata", () => {
  assert.throws(() => akorSegmentleri(BOLUMLER_169, 88), RangeError);
  assert.throws(() => akorSegmentleri(BOLUMLER_169, 101), RangeError);
});

test("Yük bölüt bölüt kurulur; kısa Yük (9:16) kurulumun son basamaklarını çalar", () => {
  assert.deepEqual([0, 1, 2, 3].map((i) => katmanSec("yuk", i, 4)), [0, 1, 2, 3]);
  assert.deepEqual([0, 1].map((i) => katmanSec("yuk", i, 2)), [2, 3]);
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => katmanSec("studio", i, 5)), [0, 0, 0, 0, 0]);
});

test("uzunluk: toplam vuruş × 0,6 sn × örnekleme (16:9 = 60 sn, 9:16 = 30 sn)", () => {
  assert.equal(iz169.sol.length, 100 * 0.6 * ORNEKLEME);
  assert.equal(iz169.sag.length, iz169.sol.length);
  assert.equal(iz916.sol.length, 50 * 0.6 * ORNEKLEME);
  assert.equal(iz916.sag.length, iz916.sol.length);
});

test("belirlenimci: aynı girdi aynı örnekler; tohum değişince gürültü değişir", () => {
  assert.equal(ozet(muzikIzi(BOLUMLER_916)), ozet(iz916));
  const kisa: Bolum[] = [{ id: "donus", ilk: 1, son: 4 }];
  assert.equal(ozet(muzikIzi(kisa, { tohum: 3 })), ozet(muzikIzi(kisa, { tohum: 3 })));
  assert.notEqual(ozet(muzikIzi(kisa, { tohum: 3 })), ozet(muzikIzi(kisa, { tohum: 4 })));
});

test("tepe yaklaşık −3 dBFS, hiçbir örnek ±1'i aşmaz; iki kanal eş değil (stereo)", () => {
  for (const iz of [iz169, iz916]) {
    let tepe = 0, fark = 0;
    for (let i = 0; i < iz.sol.length; i++) {
      tepe = Math.max(tepe, Math.abs(iz.sol[i]), Math.abs(iz.sag[i]));
      fark = Math.max(fark, Math.abs(iz.sol[i] - iz.sag[i]));
    }
    assert.ok(tepe <= 1);
    assert.ok(Math.abs(tepe - 10 ** (-3 / 20)) < 0.005, `${tepe}`);
    assert.ok(fark > 0.01, `${fark}`);
  }
});

test("giriş sessizden açılır, çıkış tam sonda sessizliğe iner", () => {
  for (const iz of [iz169, iz916]) {
    const N = iz.sol.length, sure = N / ORNEKLEME;
    assert.ok(iz.sol[0] === 0 && iz.sag[0] === 0);
    assert.ok(iz.sol[N - 1] === 0 && iz.sag[N - 1] === 0, `${iz.sol[N - 1]} ${iz.sag[N - 1]}`);
    assert.ok(rms(iz, sure - 0.05, sure) < 0.002, `son 50 ms ${rms(iz, sure - 0.05, sure)}`);
    assert.ok(rms(iz, 0, 0.05) < 0.3 * rms(iz, 0.3, 0.6), "ilk 50 ms");
  }
});

test("Kanca: marimba bölümün ikinci yarısında girer", () => {
  assert.ok(araRms(iz169, 5, 8) > 1.5 * araRms(iz169, 1, 4), `${araRms(iz169, 5, 8)} / ${araRms(iz169, 1, 4)}`);
});

test("Yük yoğunlaşır: her bölüt bir öncekinden güçlü", () => {
  const b = [araRms(iz169, 9, 12), araRms(iz169, 13, 16), araRms(iz169, 17, 20), araRms(iz169, 21, 23)];
  for (let i = 1; i < b.length; i++) assert.ok(b[i] > 1.05 * b[i - 1], `bölüt ${i}: ${b.map((x) => x.toFixed(4))}`);
});

test("nefes: v24 pad'e iner (v23 ve v25'ten belirgin kısık)", () => {
  const [v23, v24, v25] = [23, 24, 25].map((v) => vurusRms(iz169, v));
  assert.ok(v24 < 0.6 * v23, `v24 ${v24} / v23 ${v23}`);
  assert.ok(v24 < 0.6 * v25, `v24 ${v24} / v25 ${v25}`);
  // 9:16'da da Yük'ün son vuruşu (v14) nefes
  const [k13, k14, k15] = [13, 14, 15].map((v) => vurusRms(iz916, v));
  assert.ok(k14 < 0.6 * k13 && k14 < 0.6 * k15, `${k13} ${k14} ${k15}`);
});

test("Çocuk seyrek: ortalama RMS Dönüş'ün belirgin altında", () => {
  const cocuk = araRms(iz169, 73, 88), donus = araRms(iz169, 25, 32);
  assert.ok(cocuk < 0.6 * donus, `${cocuk} / ${donus}`);
  assert.ok(araRms(iz916, 37, 42) < 0.6 * araRms(iz916, 15, 20));
});

test("son akor: v93'te enerji girer (9:16'da v47)", () => {
  for (const [iz, v] of [[iz169, 93], [iz916, 47]] as [StereoIz, number][]) {
    const t = saniye(v);
    const once = rms(iz, t - 0.3, t), sonra = rms(iz, t, t + 0.3);
    assert.ok(sonra > 1.3 * once, `v${v}: ${sonra} / ${once}`);
  }
});

test("iki biçimde de hiçbir akor iki bölütte üst üste tutulmaz (bölüm sınırında akor değişir)", () => {
  for (const [ad, bolumler, son] of [["16:9", BOLUMLER_169, 93], ["9:16", BOLUMLER_916, undefined]] as [string, Bolum[], number | undefined][]) {
    const b = akorSegmentleri(bolumler, son);
    b.forEach((s, i) => {
      if (i > 0) assert.notEqual(s.akor, b[i - 1].akor, `${ad}: v${b[i - 1].ilk}–${b[i - 1].son} ${b[i - 1].akor} → v${s.ilk} ${s.akor}`);
    });
  }
  // 16:9: Studio C'de biter, Atölye G'den başlar (kayma yok).
  assert.equal(vurustakiAkor(BOLUMLER_169, 52, 93)?.akor, "C");
  assert.equal(vurustakiAkor(BOLUMLER_169, 53, 93)?.akor, "G");
  // 9:16: Studio G'de biter → Atölye Am'den; Atölye F'de biter → Çocuk C'den.
  assert.deepEqual([28, 29, 33, 36, 37, 41].map((v) => vurustakiAkor(BOLUMLER_916, v)?.akor), ["G", "Am", "F", "F", "C", "Am"]);
});

test("16:9 akor bölütleri kuraldan etkilenmez (her bölütün başı ve akoru)", () => {
  assert.deepEqual(
    akorSegmentleri(BOLUMLER_169, 93).map((s) => [s.ilk, s.akor]),
    [[1, "Am"], [5, "F"], [9, "Am"], [13, "F"], [17, "C"], [21, "G"], [25, "C"], [29, "G"], [33, "C"], [37, "G"], [41, "Am"], [45, "F"], [49, "C"], [53, "G"], [57, "Am"], [61, "F"], [65, "C"], [69, "G"], [73, "F"], [77, "C"], [81, "Am"], [85, "F"], [89, "G"], [93, "C"]],
  );
});

test("shaker şablonu cızırdamaz: enerjinin çoğu 12 kHz'in altında, üstü küçük pay", () => {
  let tohum = 7;
  const rastgele = () => ((tohum = (tohum * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const banka = shakerBankasi(ORNEKLEME, rastgele);
  assert.equal(banka.length, 16);
  /** [a, b) Hz aralığında Hann pencereli DFT enerjisi (200 Hz adım). */
  const enerji = (a: number, b: number) => {
    let toplam = 0;
    for (const o of banka)
      for (let f = a; f < b; f += 200) {
        const w = (2 * Math.PI * f) / ORNEKLEME;
        let re = 0, im = 0;
        for (let i = 0; i < o.length; i++) {
          const h = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (o.length - 1));
          re += o[i] * h * Math.cos(w * i);
          im -= o[i] * h * Math.sin(w * i);
        }
        toplam += re * re + im * im;
      }
    return toplam;
  };
  const hepsi = enerji(200, 21000);
  const ust = enerji(12000, 21000) / hepsi;
  const cokUst = enerji(16000, 21000) / hepsi;
  assert.ok(ust < 0.15, `12 kHz üstü pay ${ust.toFixed(3)}`);
  assert.ok(cokUst < 0.03, `16 kHz üstü pay ${cokUst.toFixed(3)}`);
  // hâlâ shaker: tık gibi değil, gürültülü ve sönümlü (ilk 10 ms enerjisi sondan çok)
  for (const o of banka) {
    let bas = 0, son = 0;
    for (let i = 0; i < 441; i++) bas += o[i] ** 2;
    for (let i = o.length - 441; i < o.length; i++) son += o[i] ** 2;
    assert.ok(bas > 20 * son && bas > 0, "sönümlü");
  }
});

test("Studio ve Atölye pompalamaz: 1+3 ile 2+4 vuruşları arası RMS farkı yumuşak ama hâlâ bir nabız", () => {
  const fark = (ilk: number, son: number) => {
    const g = (k: number) => {
      const r: number[] = [];
      for (let v = ilk + k; v <= son; v += 2) r.push(vurusRms(iz169, v) ** 2);
      return r.reduce((a, b) => a + b, 0) / r.length;
    };
    return 10 * Math.log10(g(0) / g(1));
  };
  // önce 3,7 / 3,9 dB idi; en az 1,5 dB düşmeli
  for (const [ad, ilk, son] of [["Studio", 33, 52], ["Atölye", 53, 72]] as [string, number, number][]) {
    const d = fark(ilk, son);
    assert.ok(d <= 2.2, `${ad}: 1+3 / 2+4 farkı ${d.toFixed(2)} dB`);
    assert.ok(d >= 0.5, `${ad}: nabız kaybolmuş (${d.toFixed(2)} dB)`);
  }
});

test("stereo WAV: başlık, iki kanal, örnekler aynen (ek kazanç yok)", () => {
  const w = stereoWavYaz(iz916);
  assert.equal(w.toString("ascii", 0, 4), "RIFF");
  assert.equal(w.toString("ascii", 8, 12), "WAVE");
  assert.equal(w.readUInt16LE(20), 1);
  assert.equal(w.readUInt16LE(22), 2);
  assert.equal(w.readUInt32LE(24), ORNEKLEME);
  assert.equal(w.readUInt16LE(34), 16);
  assert.equal(w.readUInt32LE(40), iz916.sol.length * 4);
  assert.equal(w.length, 44 + iz916.sol.length * 4);
  const i = Math.round(saniye(16) * ORNEKLEME);
  assert.equal(w.readInt16LE(44 + i * 4), Math.round(iz916.sol[i] * 32767));
  assert.equal(w.readInt16LE(46 + i * 4), Math.round(iz916.sag[i] * 32767));
});
