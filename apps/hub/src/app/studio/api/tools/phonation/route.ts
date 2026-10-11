import { z } from "zod";
import { createToolHandler, type ToolPromptContext } from "@studio/lib/toolHandler";
import { DIFFICULTY_LABEL } from "@studio/lib/constants";
import { studioKullaniciPromptu, studioSistemPromptu } from "@studio/lib/prompts/iskelet";
import { articulation } from "@ludenlab/ai";
import { lookupCachedWordImage } from "@studio/lib/generateWordImage";

/* Sesletim oyunu — spec A1 prompt'u (Faz 2 / Task 10).
   Sistem prompt'u sabittir (önbellek) ve `studioSistemPromptu` ile A1 sırasında kurulur; kullanıcı
   prompt'u ortak öğrenci bloğunu (`ctx.studentBlock`, spec A2; öğrencisiz araçta boş) olduğu gibi gömer —
   eski "Öğrenci bilgileri" satırları kalktı, kimlik bloktadır. Dört oyun türünün yapı kuralı eval
   kontrollerinin (`evals/tools/studio/phonation/checks.ts`) ölçtüğü biçimde yazılır: hangi alan dolu/boş,
   ızgara ölçüsü, konum sırası, etiket–kelime tutarlılığı, labirentte girişten çıkışa dört komşuluklu yol,
   yılan–merdiven yerleşimi. JSON alan adları, istemci (`PhonationView`), PDF, banka mekanizması (`__bank`),
   `enrichContent`, kredi ve SSE DEĞİŞMEZ (A4). Sözleşme: `prompt.test.ts`. */

const bodySchema = z.object({
  studentId:    z.string().optional(),
  // Prompt'a giren her alan sınırlı (denetim #29): girdi boyutu = doğrudan LLM maliyeti.
  targetSounds: z.array(z.string().max(20)).min(1, "En az bir hedef ses seçin").max(20),
  activityType: z.enum(["sound_hunt", "bingo", "snakes_ladders", "sound_maze"]),
  difficulty:   z.enum(["easy", "medium", "hard"]),
  itemCount:    z.number().int().min(8).max(25),
  theme:        z.string().max(100).optional(),
});
type PhonationBody = z.infer<typeof bodySchema>;
type ActivityType = PhonationBody["activityType"];

/** Parametre etiketleri — eval adaptörü (`evals/tools/studio/phonation/adapter.ts` ACT_TR) hakeme aynı metinleri gösterir. */
const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  sound_hunt:     "Ses Avı",
  bingo:          "Tombala",
  snakes_ladders: "Yılan Merdiven",
  sound_maze:     "Ses Labirenti",
};

// ─── Kelime bankası (artikülasyon ile ortak) ────────────────────────────────────
// Sesletim kelimeleri uzman-onaylı bankadan gelir (uydurma kelime YOK, hedef sesi
// kesin içerir, her kelimenin visualPrompt'u var, görseller çoğunlukla cache'te ÜCRETSİZ).
const ALL_POSITIONS: articulation.Position[] = ["initial", "medial", "final"];

type BankStash = {
  __bank?: { target: articulation.SelectedWord[]; distractor: articulation.SelectedWord[] };
};

// Hedef sesli kelimeler (tüm sesler bankada olmalı — 29 harf var, pratikte hep var).
function bankTargetWords(targetSounds: string[], count: number): articulation.SelectedWord[] {
  const allBanked = targetSounds.every((s) => articulation.WORD_BANK[articulation.soundToLetter(s)]);
  if (!allBanked) return [];
  return articulation.selectWordsMulti(articulation.WORD_BANK, targetSounds, ALL_POSITIONS, count);
}

// Çeldiriciler: hedef ses(ler)i İÇERMEYEN kelimeler (diğer harflerden, hedef harf filtreli).
function bankDistractorWords(targetSounds: string[], count: number): articulation.SelectedWord[] {
  if (count <= 0) return [];
  const targetLetters = new Set(targetSounds.map((s) => articulation.soundToLetter(s)));
  const otherLetters = Object.keys(articulation.WORD_BANK).filter((l) => !targetLetters.has(l));
  for (let i = otherLetters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [otherLetters[i], otherLetters[j]] = [otherLetters[j]!, otherLetters[i]!];
  }
  const picked: articulation.SelectedWord[] = [];
  const seen = new Set<string>();
  for (const letter of otherLetters) {
    for (const w of articulation.selectWords(articulation.WORD_BANK, letter, ALL_POSITIONS, 4)) {
      if (seen.has(w.word)) continue;
      const lw = w.word.toLocaleLowerCase("tr-TR");
      if ([...targetLetters].some((l) => lw.includes(l))) continue; // hedef sesi yanlışlıkla içermesin
      seen.add(w.word);
      picked.push(w);
      if (picked.length >= count) return picked;
    }
  }
  return picked;
}

export const SYSTEM_PROMPT = studioSistemPromptu({
  rol: `Sen LudenLab'in sesletim oyunu üreticisisin. Oyunu uzman ister, yazdırır ve seansta yönetir; OYNAYAN ÇOCUKTUR (istek "Oyuncu: yetişkin" derse çocuksu çerçeve yazılmaz). Hedef ses her kelimede net duyulur. instructions uzmana sade Türkçe; expertNotes yalnız uzmana: terim serbest, "öğrenci/uzman" sözcükleri burada da geçerli.`,
  klinikCerceve: [
    `sound_hunt: scene (ortam) + objects itemCount nesne, hedefli ve çeldirici karışık (yarı yarıya); grid null.`,
    `bingo: itemCount → kare ızgara 9→3×3, 16→4×4, 25→5×5; TÜM hücreler hedefli; scene null, objects [].`,
    `snakes_ladders: cols 5, rows = itemCount/5, hepsi hedefli; bazı hücrelerde isLadder (ileri) ya da isSnake (yeniden dene): ikisi birden olmaz, toplamı yarısından az, 1. hücrede yılan, son hücrede yılan/merdiven yazılmaz; scene null, objects [].`,
    `sound_maze: rows×cols = itemCount (25→5×5, 20→4×5; gerekirse ±1); 1. hücre giriş, son hücre çıkış, ikisi hedefli; girişten çıkışa YALNIZ hedefli hücrelerden sağ/sol/üst/alt komşulukla (çapraz yok, satır sonundan sonraki satıra geçiş yok) kesintisiz yol; kalanların çoğu çeldirici; scene null, objects [].`,
    `"hasTargetSound" kelimeyle tutarlı: true → kelime hedef sesi taşır; false → hedef ses HİÇBİR konumda yok. Kelimeler gerçek Türkçe, tekrarsız; position 1'den N'e ardışık.`,
    `BANKA: istekte banka kelimeleri listelenmişse YALNIZ onları kullan; sıralama ve yerleşim senin işin. İstek "sistem değiştirecek" derse geçici kelimeleri yine gerçek ve etiketiyle tutarlı yaz; yönerge ve notlar tek tek kelimeye dayanmaz.`,
    `Yaş kelime sıklığını belirler: 3–6 yaş gündelik nesneler, 7–12 okul sözlüğü, yetişkinde yetişkin sözlüğü. Zorluk: kolay = hedef kelime başında, 1–2 hece; orta = baş ve orta, 2–3 hece; zor = her konum, çok heceli, ikame sese benzer çeldiriciler.`,
    `Ödül yok: oyunun kendisi motivasyondur. Hatada uzman doğru modeli bir kez söyler, çocuk yeniden dener.`,
  ],
  // Ortak dört kural iskeletten gelir; buradakiler yalnız araca özgü ekler.
  ozgulluk: [
    `Tema verildiyse sahne ve kelimeler temadan; tema yoksa ve öğrenci varsa sahne/tema "Uzman notları"ndaki ilgi alanından ("…oyuncaklarıyla oynarken konuşkan" → o oyuncaklar sahnede).`,
    `Tanıdaki hata örüntüsü (öne alma /k/→/t/, ikame /r/→/l/, /s/–/ş/) çeldiricileri ve expertNotes'u belirler: ses avı/labirentte çeldiricilerin bir bölümü o sesten; expertNotes bu bozulmaya göre ne gözleneceğini söyler.`,
    `"Dikkat edilmesi gerekenler" ve işitme/dikkat notları sunuma girer (dudak okuyan çocukta uzman yüzü görünür söyler).`,
    `visualPrompt: İngilizce, tek somut nesne, sade ("a wooden spoon"); soyut/eylem kelimesinde "". Stil, yazı, ad yazılmaz.`,
  ],
  karsitOrnek: {
    zayif: "Oyun eğlenceli olsun, çocuk motive olsun; kelimeler: su, süt, sarı, güneş.",
    iyi: "Tombala 3×3: sandal, sepet, salıncak, simit, sabun, saat, süt, soba, sincap — hepsi /s/ başta; çocuk okunan kelimeyi bulup üstüne mavi pul koyar.",
  },
  bicim: {
    giris: "SADECE tek parça, geçerli JSON yaz; açıklama/Markdown çiti yok. Alan adları aynen:",
    sema: `{
  "title": "…",
  "activityType": "sound_hunt|bingo|snakes_ladders|sound_maze",
  "targetSounds": ["/s/"],
  "difficulty": "easy|medium|hard",
  "theme": "tema ya da null",
  "grid": { "rows": 3, "cols": 3, "cells": [ { "position": 1, "word": "…", "hasTargetSound": true, "isLadder": false, "isSnake": false, "instruction": null, "visualPrompt": "a … ya da \\"\\"" } ] },
  "scene": "… ya da null",
  "objects": [ { "name": "…", "hasTargetSound": true, "description": "…", "visualPrompt": "a … ya da \\"\\"" } ],
  "instructions": "…",
  "expertNotes": "…",
  "adaptations": "Kolay: … Zor: …"
}`,
    butce: [
      `title: ≤ 6 kelime; tür + hedef ses.`,
      `scene (yalnız sound_hunt): ≤ 2 cümle.`,
      `objects: itemCount nesne; name tek kelime; description ≤ 8 kelime; visualPrompt ≤ 6 kelime İngilizce.`,
      `grid.cells: sayı tür kuralından; word tek kelime; instruction ≤ 1 cümle, yalnız giriş/çıkış/merdiven/yılan hücresinde, diğerlerinde null; visualPrompt ≤ 6 kelime İngilizce.`,
      `instructions: ≤ 4 cümle — kurulum, hamle, kelime söylenince ne olur (doğru/yanlış), bitiş.`,
      `expertNotes: ≤ 3 cümle — hedef sesin bu çocuktaki durumu, ne gözlenecek.`,
      `adaptations: tek dizede "Kolay: …" ve "Zor: …", her biri ≤ 2 cümle.`,
    ],
  },
  ozDenetim: [
    `Tür kuralına göre doğru alanlar dolu, diğerleri boş mu?`,
    `Hücre/nesne sayısı ve ızgara ölçüsü itemCount'a uyuyor; position 1'den N'e mi?`,
    `Her "hasTargetSound" kelimeyle tutarlı; labirentte girişten çıkışa hedefli komşu yol var; yılan–merdivende son hücre işaretsiz mi?`,
    `Banka kelimeleri verildiyse yalnız onlar; tekrar yok; visualPrompt İngilizce mi?`,
    `Ödül, puan, çıkartma yok; "hasta/terapist" yok mu?`,
    `JSON tek parça, alan adları aynen, bütçeler içinde mi?`,
  ],
});

/** Son hatırlatma (A1 kullanıcı prompt'u, d): banka sadakati + tür kuralı. */
export const HATIRLATMA = ["Banka kelimeleri verildiyse başka kelime yok.", "Tür kuralına göre scene/grid/objects."] as const;

const YETISKIN_YASI = 18;
const BINGO_KENARLARI = [3, 4, 5] as const;

/**
 * 18+ öğrencide oynayan çocuk değil öğrencinin kendisidir. Doğum tarihi varsa yaş oradan (kapıdaki `calcAgeYears`
 * ile aynı yıl farkı); yoksa kapının verdiği yaş metni ("34 yaşında"); ikisi de yoksa çocuk varsayılır.
 */
export function yetiskinMi(student: { birthDate: Date | null } | null, ageText: string): boolean {
  const yas = student?.birthDate
    ? new Date().getFullYear() - new Date(student.birthDate).getFullYear()
    : Number(/^(\d+)\s/.exec(ageText)?.[1]);
  return Number.isFinite(yas) && yas >= YETISKIN_YASI;
}

/**
 * Türe göre ızgara ölçüsü — eval `oge_sayisi` kuralıyla aynı: tombala kare (9/16/25; başka sayıda en yakın kenar),
 * yılan–merdiven 5 sütun × en yakın satır (arayüz 15/20/25 sunar), labirent rows×cols = itemCount (±1; kareye en yakın
 * çarpan çifti). Ses avı ızgarasız (null).
 */
export function izgaraOlcusu(activityType: ActivityType, itemCount: number): { rows: number; cols: number } | null {
  switch (activityType) {
    case "sound_hunt":
      return null;
    case "bingo": {
      const kenar = Math.min(BINGO_KENARLARI[2], Math.max(BINGO_KENARLARI[0], Math.round(Math.sqrt(itemCount))));
      return { rows: kenar, cols: kenar };
    }
    case "snakes_ladders":
      return { rows: Math.max(1, Math.round(itemCount / 5)), cols: 5 };
    case "sound_maze": {
      for (const hedef of [itemCount, itemCount - 1, itemCount + 1]) {
        for (let r = Math.floor(Math.sqrt(hedef)); r >= 2; r--) {
          if (hedef % r === 0) return { rows: r, cols: hedef / r };
        }
      }
      return { rows: 1, cols: itemCount };
    }
  }
}

/** A1 odak satırı — koddan türetilir: tür + öğe sayısı → doldurulacak alan / ızgara ölçüsü; hedef sesler. */
export function odakSatiri(data: Pick<PhonationBody, "activityType" | "itemCount" | "targetSounds">): string {
  const { activityType: tur, itemCount: n } = data;
  const olcu = izgaraOlcusu(tur, n);
  const hucre = olcu ? olcu.rows * olcu.cols : n;
  const ICERIK: Record<ActivityType, string> = {
    sound_hunt:     `scene + objects (${n} nesne, hedefli/çeldirici karışık), grid null`,
    bingo:          `grid ${olcu?.rows}×${olcu?.cols} (${hucre} hücre, hepsi hedefli), scene null, objects []`,
    snakes_ladders: `grid ${olcu?.rows}×${olcu?.cols} (${hucre} hücre, hepsi hedefli, bazıları merdiven/yılan), scene null, objects []`,
    sound_maze:     `grid ${olcu?.rows}×${olcu?.cols} (${hucre} hücre, girişten çıkışa hedefli yol), scene null, objects []`,
  };
  return `${tur}: ${n} öğe → ${ICERIK[tur]}; hedef ${data.targetSounds.join(", ")}.`;
}

/**
 * A1 kullanıcı prompt'u: öğrenci bloğu (A2, boşsa başlıksız) → parametreler → banka bloğu (kelimeler bankadan
 * yazılacaksa; kendi bölümü, PARAMETRELER'den sonra) → odak → son hatırlatma. Banka notu eski metniyle korunur:
 * eval adaptörü hakeme "model 'geçici kelime yaz, sistem değiştirecek' talimatını alır" diye anlatır. Kelimeleri
 * bankadan önceden seçer ve `__bank`'a stash'ler (`enrichContent` otoriter yazacak).
 */
export function buildUserPrompt(data: PhonationBody, student: { birthDate: Date | null } | null, ageText: string, ctx: ToolPromptContext): string {
  const needsDistractor = data.activityType === "sound_hunt" || data.activityType === "sound_maze";
  const target = bankTargetWords(data.targetSounds, data.itemCount);
  const distractor = target.length > 0 && needsDistractor
    ? bankDistractorWords(data.targetSounds, data.itemCount)
    : [];
  if (target.length > 0) {
    (data as PhonationBody & BankStash).__bank = { target, distractor };
  }

  const bankNote = target.length > 0
    ? `NOT: Kelimeler sistem tarafından uzman-onaylı bankadan otomatik yazılacak — sen YAPIYI üret: ${needsDistractor ? "hangi öğe hedef-sesli (hasTargetSound:true) hangi çeldirici (false), " : ""}${data.activityType === "snakes_ladders" ? "merdiven/yılan yerleşimi, " : ""}${data.activityType === "sound_hunt" ? "sahne, " : ""}grid/öğe sayısı, talimatlar, uzman notları, uyarlamalar. Kelime alanlarına geçici Türkçe kelime yaz (sistem değiştirecek); geçici kelimeler de gerçek, hedef sese ve etiketine uygun olsun.`
    : "";

  const govde = studioKullaniciPromptu({
    studentBlock: ctx.studentBlock,
    parametreler: [
      `- Aktivite türü: ${ACTIVITY_TYPE_LABEL[data.activityType]}`,
      `- Hedef ses(ler): ${data.targetSounds.join(", ")}`,
      `- Öğe sayısı: ${data.itemCount}`,
      `- Zorluk: ${DIFFICULTY_LABEL[data.difficulty]}`,
      `- Tema: ${data.theme || "Karışık (tema yok)"}`,
      ...(yetiskinMi(student, ageText)
        ? [`- Oyuncu: yetişkin öğrenci — çocuksu çerçeve ("çocuk", "oyuncak", "masal") yazılmaz; kelimeler yetişkin sözlüğünden.`]
        : []),
    ],
    odak: odakSatiri(data),
    hatirlatma: [...HATIRLATMA],
  });
  // Banka bloğu PARAMETRELER'den hemen sonra, odak ve son hatırlatma A1 gereği en sonda kalır.
  return bankNote ? govde.replace("\n\nOdak: ", `\n\n${bankNote}\n\nOdak: `) : govde;
}

export const POST = createToolHandler({
  rateLimitKey: "phonation",
  bodySchema,
  cost: 1,
  systemPrompt: SYSTEM_PROMPT,
  toolType: "PHONATION_ACTIVITY",
  category: "speech",
  categoryFromWorkArea: true,
  creditDescription: "Sesletim aktivitesi üretimi",
  responseKey: "activity",
  fallbackTitle: "Sesletim Aktivitesi",
  studentRequired: false,

  deriveAgeGroup(years) {
    if (years === null) return "7-12";
    if (years <= 6) return "3-6";
    if (years <= 12) return "7-12";
    if (years <= 18) return "13-18";
    return "adult";
  },

  buildUserPrompt,

  async enrichContent(content, data) {
    content.activityType = data.activityType;
    content.targetSounds = data.targetSounds;
    content.difficulty   = data.difficulty;
    content.theme        = data.theme ?? "";

    // Kelimeleri bankadan OTORİTER yaz (yapı Claude'dan; kelime + görsel-tanım bankadan).
    const stash = (data as typeof data & BankStash).__bank;
    if (stash) {
      const { target, distractor } = stash;
      let ti = 0, di = 0;
      const applyTo = (rec: Record<string, unknown>, key: "word" | "name") => {
        const isTarget = rec.hasTargetSound !== false; // bingo/snakes hep hedef; hunt/maze flag'e göre
        const bw = isTarget ? target[ti++] : distractor[di++];
        if (!bw) return;
        rec[key] = bw.word;
        rec.visualPrompt = bw.visualPrompt;
        rec.hasTargetSound = isTarget;
      };
      const cells = (content.grid as { cells?: Record<string, unknown>[] } | undefined)?.cells;
      if (data.activityType === "bingo" || data.activityType === "snakes_ladders") {
        if (Array.isArray(cells)) for (const c of cells) { c.hasTargetSound = true; applyTo(c, "word"); }
      } else if (data.activityType === "sound_maze") {
        if (Array.isArray(cells)) for (const c of cells) applyTo(c, "word");
      } else if (data.activityType === "sound_hunt") {
        const objects = content.objects as Record<string, unknown>[] | undefined;
        if (Array.isArray(objects)) for (const o of objects) applyTo(o, "name");
      }
    }

    // Banka kelimelerinin hazır görselini cache'ten ÜCRETSİZ iliştir (yoksa istemci Flux ile üretir).
    const attach = async (arr: unknown) => {
      if (!Array.isArray(arr)) return;
      await Promise.all(
        arr.map(async (it) => {
          const rec = it as { word?: unknown; name?: unknown; imageUrl?: unknown };
          const w = typeof rec.word === "string" ? rec.word : typeof rec.name === "string" ? rec.name : "";
          if (w && !rec.imageUrl) {
            const url = await lookupCachedWordImage(w);
            if (url) rec.imageUrl = url;
          }
        }),
      );
    };
    await attach(content.objects);
    await attach((content.grid as { cells?: unknown[] } | undefined)?.cells);
  },
});
