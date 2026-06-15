import { z } from "zod";
import { createToolHandler } from "@/lib/toolHandler";

const BOARD_TYPE_LABEL: Record<string, string> = {
  basic_needs:    "Temel İhtiyaçlar",
  emotions:       "Duygular",
  daily_routines: "Günlük Rutinler",
  school:         "Okul Aktiviteleri",
  social:         "Sosyal İfadeler",
  requests:       "İstek ve Seçim",
  custom:         "Özel",
};

const SYSTEM_PROMPT = `Sen LudenLab platformunun iletişim panosu üretici aracısın.
Söz öncesi dönemde veya alternatif-destekleyici iletişim (ADİ/AAC) kullanan öğrenciler için
yazdırılabilir görsel iletişim panoları üretiyorsun.

Kurallar:
- Her hücre için bir kelime/ifade ve detaylı görsel açıklama üret
- Görsel açıklama, basit ve net bir sembol/resim tarif etmeli
  (uzman veya veli bu açıklamaya göre sembol/resim yapıştırabilir)
- Kelimeler öğrencinin yaş ve gelişim düzeyine uygun olsun
- Temel iletişim fonksiyonlarını kapsa: istek, ret, selamlama, bilgi
- Fitzgerald renk kodlaması kullanılıyorsa her hücrenin renk kategorisini belirt:
  noun=sarı, verb=yeşil, adjective=mavi, social=pembe, question=turuncu, other=beyaz
- Cümle modu seçildiyse her kelime için kısa model cümle ekle (örn: 'Su' → 'Su istiyorum lütfen')

Yanıtını SADECE JSON formatında ver, başka hiçbir şey yazma:
{
  "title": "Pano başlığı",
  "boardType": "basic_needs|emotions|daily_routines|school|social|requests|custom",
  "layout": "grid|strip",
  "rows": 3,
  "cols": 3,
  "cells": [
    {
      "position": 1,
      "word": "Su",
      "sentence": "Su istiyorum lütfen",
      "category": "noun",
      "fitzgeraldColor": "yellow",
      "visualDescription": "Mavi bir su bardağı, içinde su dalgalanıyor",
      "usage": "Çocuk su istediğinde bu sembole işaret eder veya dokunur"
    }
  ],
  "instructions": "Panonun kullanım talimatları",
  "expertNotes": "Uzman için uygulama önerileri (modelleme, sabretme, genişletme stratejileri)",
  "homeGuidance": "Veli için rehber (panoyu evde nasıl kullanacağı)",
  "adaptations": "Kolaylaştırma (daha az hücre) ve zorlaştırma (cümle düzeyi) önerileri"
}`;

export const POST = createToolHandler({
  rateLimitKey: "comm-board",
  bodySchema: z.object({
    studentId:      z.string().optional(),
    boardType:      z.enum(["basic_needs", "emotions", "daily_routines", "school", "social", "requests", "custom"]),
    customCategory: z.string().max(100).optional(),
    symbolCount:    z.number().int().refine((v) => [4, 6, 9, 12].includes(v), "Geçersiz sembol sayısı"),
    layout:         z.enum(["grid", "strip"]),
    textMode:       z.enum(["word_only", "word_sentence"]),
    colorCoding:    z.boolean().default(true),
  }),
  cost: 15,
  systemPrompt: SYSTEM_PROMPT,
  toolType: "COMMUNICATION_BOARD",
  category: "language",
  categoryFromWorkArea: true,
  difficulty: "easy",
  creditDescription: "İletişim panosu üretimi",
  responseKey: "board",
  fallbackTitle: "İletişim Panosu",
  studentRequired: false,

  buildUserPrompt(data, student, ageText) {
    const gridMap: Record<number, { rows: number; cols: number }> = {
      4:  { rows: 2, cols: 2 },
      6:  { rows: 2, cols: 3 },
      9:  { rows: 3, cols: 3 },
      12: { rows: 3, cols: 4 },
    };
    const grid = gridMap[data.symbolCount] ?? { rows: 3, cols: 3 };

    const studentBlock = student
      ? `Öğrenci bilgileri:\n- Ad: ${student.name}${ageText ? `, ${ageText}` : ""}\n- Çalışma alanı: ${student.workArea}${student.diagnosis ? `\n- Tanı: ${student.diagnosis}` : ""}\n\n`
      : "";

    const boardLabel = data.boardType === "custom" && data.customCategory
      ? `Özel — ${data.customCategory}`
      : BOARD_TYPE_LABEL[data.boardType] ?? data.boardType;

    return `${studentBlock}Parametreler:
- Pano türü: ${boardLabel}
- Sembol sayısı: ${data.symbolCount} (${grid.rows}×${grid.cols} grid)
- Düzen: ${data.layout === "grid" ? "Grid" : "Satır (iletişim şeridi)"}
- Metin modu: ${data.textMode === "word_only" ? "Sadece kelime" : "Kelime + kısa cümle"}
- Fitzgerald renk kodlaması: ${data.colorCoding ? "Evet" : "Hayır"}

Bu parametrelere uygun iletişim panosu üret. Tam olarak ${data.symbolCount} hücre oluştur.`;
  },

  enrichContent(content, data) {
    content.boardType   = data.boardType;
    content.symbolCount = data.symbolCount;
    content.layout      = data.layout;
    content.textMode    = data.textMode;
    content.colorCoding = data.colorCoding;
  },
});
