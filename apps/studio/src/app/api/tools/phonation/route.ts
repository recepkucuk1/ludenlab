import { z } from "zod";
import { createToolHandler } from "@/lib/toolHandler";
import { DIFFICULTY_LABEL } from "@/lib/constants";

const ACTIVITY_TYPE_LABEL: Record<string, string> = {
  sound_hunt:     "Ses Avı",
  bingo:          "Tombala",
  snakes_ladders: "Yılan Merdiven",
  word_chain:     "Kelime Zinciri",
  sound_maze:     "Ses Labirenti",
};

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
- scene, objects, wordChain BOŞ bırak

YILAN MERDİVEN (snakes_ladders):
- itemCount kadar kare, her karede hedef sesli bir kelime
- Bazı karelere isLadder:true (kelimeyi doğru söylersen yukarı), isSnake:true (yeniden dene) ekle
- grid alanını doldur (rows=itemCount/5, cols=5)
- scene, objects, wordChain BOŞ bırak

KELİME ZİNCİRİ (word_chain):
- Her kelimenin son sesi/hecesiyle başlayan yeni kelime zinciri
- Tüm kelimeler hedef sesi içermeli
- wordChain dizisini doldur
- grid, scene, objects BOŞ bırak

SES LABİRENTİ (sound_maze):
- Grid tabanlı basit labirent
- Doğru yol: hedef sesi içeren kelimeler (hasTargetSound: true)
- Yanlış yollar: hedef sesi içermeyen kelimeler (hasTargetSound: false)
- grid alanını doldur
- scene, objects, wordChain BOŞ bırak

Genel kurallar:
- Yaşa uygun, gerçek Türkçe kelimeler kullan
- Eğlenceli ve motive edici içerik
- 'hasta' yerine 'öğrenci', 'terapist' yerine 'uzman' de

Yanıtını SADECE JSON formatında ver, başka hiçbir şey yazma:
{
  "title": "Aktivite başlığı",
  "activityType": "sound_hunt|bingo|snakes_ladders|word_chain|sound_maze",
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
        "instruction": null
      }
    ]
  },
  "scene": "Sahne açıklaması veya null",
  "objects": [
    {
      "name": "nesne adı",
      "hasTargetSound": true,
      "description": "kısa görsel açıklama"
    }
  ],
  "wordChain": [
    {
      "order": 1,
      "word": "kelime",
      "connection": "bağlantı açıklaması"
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
    activityType: z.enum(["sound_hunt", "bingo", "snakes_ladders", "word_chain", "sound_maze"]),
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
    const studentBlock = student
      ? `Öğrenci bilgileri:\n- Ad: ${student.name}${ageText ? `, ${ageText}` : ""}\n- Çalışma alanı: ${student.workArea}${student.diagnosis ? `\n- Tanı: ${student.diagnosis}` : ""}\n\n`
      : "";

    return `${studentBlock}Parametreler:
- Aktivite türü: ${ACTIVITY_TYPE_LABEL[data.activityType]}
- Hedef ses(ler): ${data.targetSounds.join(", ")}
- Zorluk: ${DIFFICULTY_LABEL[data.difficulty]}
- Öğe sayısı: ${data.itemCount}
- Tema: ${data.theme || "Karışık (tema yok)"}

Bu parametrelere uygun sesletim aktivitesi üret.`;
  },

  enrichContent(content, data) {
    content.activityType = data.activityType;
    content.targetSounds = data.targetSounds;
    content.difficulty   = data.difficulty;
    content.theme        = data.theme ?? "";
  },
});
