import { z } from "zod";
import { createToolHandler } from "@studio/lib/toolHandler";
import { DIFFICULTY_LABEL } from "@studio/lib/constants";
import { articulation } from "@ludenlab/ai";
import { lookupCachedWordImage } from "@studio/lib/generateWordImage";

const ACTIVITY_TYPE_LABEL: Record<string, string> = {
  sound_hunt:     "Ses Avı",
  bingo:          "Tombala",
  snakes_ladders: "Yılan Merdiven",
  word_chain:     "Kelime Zinciri",
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

const SYSTEM_PROMPT = `Sen LudenLab platformunun sesletim aktivitesi üretici aracısın.
Konuşma sesi çalışmaları için oyunlaştırılmış, yazdırılabilir aktiviteler üretiyorsun.

Aktivite türlerine göre kurallar:

SES AVI (sound_hunt):
- Bir sahne/ortam tanımla (örn: 'Çiftlik', 'Mutfak', 'Park')
- O sahnedeki nesneleri listele (hedef sesi içerenler + içermeyenler karışık)
- Çocuk hedef sesli olanları bulacak
- objects dizisini doldur, scene alanını yaz
- grid alanını BOŞ bırak

TOMBALA (bingo):
- itemCount'a göre grid boyutunu belirle: 9→3x3, 16→4x4, 25→5x5
- Tüm kelimeler hedef sesi içermeli
- grid alanını doldur (rows, cols, cells), her hücrede word ver
- scene, objects BOŞ bırak

YILAN MERDİVEN (snakes_ladders):
- itemCount kadar kare, her karede hedef sesli bir kelime
- Bazı karelere isLadder:true (kelimeyi doğru söylersen yukarı), isSnake:true (yeniden dene) ekle
- grid alanını doldur (rows=itemCount/5, cols=5)
- scene, objects BOŞ bırak

SES LABİRENTİ (sound_maze):
- Grid tabanlı basit labirent
- Doğru yol: hedef sesi içeren kelimeler (hasTargetSound: true)
- Yanlış yollar: hedef sesi içermeyen kelimeler (hasTargetSound: false)
- grid alanını doldur
- scene, objects BOŞ bırak

Genel kurallar:
- Yaşa uygun, gerçek Türkçe kelimeler kullan
- Eğlenceli ve motive edici içerik
- Görsel: bir kelime/nesne SOMUT, çizilebilir tek bir nesneyse (örn. elma, top, kuş)
  o öğeye "visualPrompt" ver → İngilizce, tek nesne, sade (örn. "a red apple", "a yellow ball").
  Bu öğeler için yazdırılabilir görsel üretilir (resimli oyun). Soyut/çok-heceli/eylem
  kelimelerinde (örn. mutluluk, koşmak) visualPrompt'u boş bırak ("").
  Hangi diziyi dolduruyorsan (objects / grid.cells) görsel-uygun öğelerde visualPrompt ekle.
- 'hasta' yerine 'öğrenci', 'terapist' yerine 'uzman' de

Yanıtını SADECE JSON formatında ver, başka hiçbir şey yazma:
{
  "title": "Aktivite başlığı",
  "activityType": "sound_hunt|bingo|snakes_ladders|sound_maze",
  "targetSounds": ["/s/"],
  "difficulty": "easy|medium|hard",
  "theme": "tema veya null",
  "grid": {
    "rows": 3,
    "cols": 3,
    "cells": [
      {
        "position": 1,
        "word": "kelime",
        "hasTargetSound": true,
        "isLadder": false,
        "isSnake": false,
        "instruction": null,
        "visualPrompt": "İngilizce tek-nesne görsel tanımı (kelime somut nesneyse) yoksa \"\""
      }
    ]
  },
  "scene": "Sahne açıklaması veya null",
  "objects": [
    {
      "name": "nesne adı",
      "hasTargetSound": true,
      "description": "kısa görsel açıklama",
      "visualPrompt": "İngilizce tek-nesne görsel tanımı (nesne somutsa) yoksa \"\""
    }
  ],
  "instructions": "Oyun nasıl oynanır",
  "expertNotes": "Uzman önerileri",
  "adaptations": "Kolaylaştırma/zorlaştırma önerileri"
}`;

export const POST = createToolHandler({
  rateLimitKey: "phonation",
  bodySchema: z.object({
    studentId:    z.string().optional(),
    targetSounds: z.array(z.string()).min(1, "En az bir hedef ses seçin"),
    activityType: z.enum(["sound_hunt", "bingo", "snakes_ladders", "sound_maze"]),
    difficulty:   z.enum(["easy", "medium", "hard"]),
    itemCount:    z.number().int().min(8).max(25),
    theme:        z.string().max(100).optional(),
  }),
  cost: 15,
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

  buildUserPrompt(data, student, ageText) {
    // Kelimeleri bankadan önceden seç + stash'le (enrichContent otoriter yazacak).
    const needsDistractor = data.activityType === "sound_hunt" || data.activityType === "sound_maze";
    const target = bankTargetWords(data.targetSounds, data.itemCount);
    const distractor = target.length > 0 && needsDistractor
      ? bankDistractorWords(data.targetSounds, data.itemCount)
      : [];
    if (target.length > 0) {
      (data as typeof data & BankStash).__bank = { target, distractor };
    }

    const studentBlock = student
      ? `Öğrenci bilgileri:\n- Ad: ${student.name}${ageText ? `, ${ageText}` : ""}\n- Çalışma alanı: ${student.workArea}${student.diagnosis ? `\n- Tanı: ${student.diagnosis}` : ""}\n\n`
      : "";

    const bankNote = target.length > 0
      ? `\n\nNOT: Kelimeler sistem tarafından uzman-onaylı bankadan otomatik yazılacak — sen YAPIYI üret: ${needsDistractor ? "hangi öğe hedef-sesli (hasTargetSound:true) hangi çeldirici (false), " : ""}${data.activityType === "snakes_ladders" ? "merdiven/yılan yerleşimi, " : ""}${data.activityType === "sound_hunt" ? "sahne, " : ""}grid/öğe sayısı, talimatlar, uzman notları, uyarlamalar. Kelime alanlarına geçici Türkçe kelime yaz (sistem değiştirecek); kelime seçimine takılma.`
      : "";

    return `${studentBlock}Parametreler:
- Aktivite türü: ${ACTIVITY_TYPE_LABEL[data.activityType]}
- Hedef ses(ler): ${data.targetSounds.join(", ")}
- Zorluk: ${DIFFICULTY_LABEL[data.difficulty]}
- Öğe sayısı: ${data.itemCount}
- Tema: ${data.theme || "Karışık (tema yok)"}

Bu parametrelere uygun sesletim aktivitesi üret.${bankNote}`;
  },

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
