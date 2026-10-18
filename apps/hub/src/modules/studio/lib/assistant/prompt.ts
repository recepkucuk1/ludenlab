// apps/hub/src/modules/studio/lib/assistant/prompt.ts
import { studioSistemPromptu } from "@studio/lib/prompts/iskelet";
import { PROFIL_BOLUMLERI } from "@studio/lib/studentContext";
import type { GoalRow } from "./schema";

/* Öğrenci asistanı — gözlemden öneri (2026-10 tasarımı §6).
   Sistem prompt'u sabittir (önbellek), A1 iskeletiyle kurulur. Kullanıcı prompt'u: öğrenci bloğu
   (rumuzlu, "Son gözlemler" dahil) → yeni gözlem → hedef listesi → araç kataloğu. Çıktı katı JSON;
   sunucu `validateSuggestions` ile süzer (bilinmeyen goalId, eksik araç parametresi, 4'ten fazla).
   Araç kataloğu ELLE yazılır (4 araç, stabil); şema değişirse burası da güncellenir. */

export const MAX_GOAL_LINES = 60;

export const ASSISTANT_SYSTEM_PROMPT = studioSistemPromptu({
  rol: `Sen LudenLab Studio'nun öğrenci asistanısın. Uzmanın seans sonrası yazdığı bir gözlemi okur, bu öğrenci için en fazla 4 somut öneri çıkarırsın. Önerileri uzman onaylar; sen hiçbir kaydı değiştirmezsin. Emin değilsen öneri yazma: boş liste geçerli bir yanıttır. Kayıt: klinik, yalın Türkçe; "öğrenci/uzman" sözcükleri.`,
  klinikCerceve: [
    `Üç öneri türü vardır. "goal_status": HEDEFLER listesindeki bir hedefin durumunu "in_progress" ya da "completed" yapmak; yalnız gözlem o hedefe açıkça değiniyorsa ve yeni durum mevcut durumdan farklıysa. "profile_note": profilin üç bölümünden birine (${PROFIL_BOLUMLERI.join(" / ")}) tek cümlelik madde eklemek; yalnız gözlem profilde olmayan kalıcı bir bilgi taşıyorsa (tek seferlik durum profil maddesi değildir). "generate_tool": ARAÇLAR kataloğundaki bir araçla materyal üretmeyi önermek; parametreler gözlemden ve öğrenci bloğundan türetilir, kataloğun şemasına BİREBİR uyar.`,
    `"completed" yalnız gözlemde ölçüt düzeyinde kanıt varsa (oran, sayı, "artık bağımsız"). Tek bir iyi seans tamamlama değildir; "in_progress" öner.`,
    `Araç parametresi uydurma: hedef ses gözlemde geçmiyorsa artikülasyon/sesletim önerme. Düzey (level) gözlemdeki mevcut başarıya göre: %80 üstü → bir üst düzey, altı → aynı düzey.`,
  ],
  ozgulluk: [
    `Her önerinin "reason" alanı gözlemdeki ifadeye ya da bloktaki satıra atıf yapar; atıfsız öneri yazılmaz.`,
    `Aynı hedef için tek öneri, aynı araç için tek öneri.`,
    `Öğrenci bloğundaki "Son gözlemler" eski kayıtlardır; yeni öneri YENİ GÖZLEM'den türer, eski kayıtlar yalnız örüntü için kullanılır.`,
  ],
  karsitOrnek: {
    zayif: `{"kind":"profile_note","section":"Öncelikli Çalışma Alanları","text":"Artikülasyon çalışılmalı","reason":"gözlem"}`,
    iyi: `{"kind":"generate_tool","tool":"articulation","params":{"targetSounds":["/r/"],"positions":["initial"],"level":"word","itemCount":12},"reason":"Gözlem: kelime başı /r/ %60; kelime düzeyinde pekiştirme"}`,
  },
  bicim: {
    giris: `SADECE aşağıdaki JSON'u yaz; önsöz, kod çiti, açıklama yok. "suggestions" en fazla 4 öğe; uygun öneri yoksa boş dizi.`,
    sema: `{"suggestions":[
  {"kind":"goal_status","goalId":"<HEDEFLER'deki id>","status":"in_progress|completed","reason":"<≤200 karakter>"},
  {"kind":"profile_note","section":"<üç bölümden biri, aynen>","text":"<≤300 karakter, tek cümle>","reason":"<≤200 karakter>"},
  {"kind":"generate_tool","tool":"articulation|phonation|matching-game|homework","params":{<kataloğun şeması>},"reason":"<≤200 karakter>"}
]}`,
    butce: [
      `reason: en fazla 200 karakter, gözleme atıflı tek cümle.`,
      `profile_note.text: en fazla 300 karakter, tek cümle, uzman kaydı dilinde.`,
      `Toplam en fazla 4 öneri.`,
    ],
  },
  ozDenetim: [
    `Her goalId HEDEFLER listesinde var mı ve durum mevcut durumdan farklı mı?`,
    `Her araç parametresi katalog şemasına birebir uyuyor mu (enum değerleri, sayı aralıkları)?`,
    `Her reason gözleme ya da bloğa atıf yapıyor mu?`,
    `Tek seferlik bir durumu profil maddesi yaptın mı? Yaptıysan çıkar.`,
    `Çıktı yalnız JSON mu?`,
  ],
});

const ARAC_KATALOGU = `articulation: {"targetSounds":["/r/",…] (1–20, "/x/" biçimi), "positions":["initial"|"medial"|"final"] (≥1), "level":"isolated"|"syllable"|"word"|"sentence"|"contextual", "itemCount":5–30}
phonation: {"targetSounds":["/s/",…] (1–20), "activityType":"sound_hunt"|"bingo"|"snakes_ladders"|"sound_maze", "difficulty":"easy"|"medium"|"hard", "itemCount":8–25, "theme"?:"≤100 karakter"}
matching-game: {"matchType":"definition"|"image_desc"|"synonym"|"antonym"|"category"|"sentence", "pairCount":"6"|"8"|"10"|"12", "difficulty":"easy"|"medium"|"hard", "theme"?:"≤100", "goalTitle"?:"≤300"}
homework: {"targetArea":"≤300 karakter (ör. Artikülasyon / Ses çalışması)", "duration":"10"|"15"|"20", "parentLevel":"basic"|"detailed", "materialType":"exercise"|"observation"|"daily_activity", "extraNote"?:"≤500"}`;

export interface AssistantPromptInput {
  /** Rumuzlu öğrenci bloğu (studentContext). */
  studentBlock: string;
  /** Rumuzlanmış yeni gözlem metni. */
  observation: string;
  goals: GoalRow[];
  hasProfile: boolean;
}

export function buildAssistantUserPrompt(p: AssistantPromptInput): string {
  const bolumler: string[] = [];
  if (p.studentBlock.trim()) bolumler.push(`ÖĞRENCİ\n${p.studentBlock.trim()}`);
  bolumler.push(`YENİ GÖZLEM\n${p.observation.trim()}`);
  const hedefler = p.goals.slice(0, MAX_GOAL_LINES).map((g) => `${g.id} | ${g.code} | ${g.title} | ${g.status}`);
  bolumler.push(`HEDEFLER (id | kod | başlık | durum)\n${hedefler.length ? hedefler.join("\n") : "hedef listesi boş — goal_status ÖNERME"}`);
  bolumler.push(`ARAÇLAR (tool: params şeması)\n${ARAC_KATALOGU}`);
  bolumler.push(p.hasProfile ? `Profil mevcut; profile_note üç bölümden birine eklenir.` : `Profil yok; profile_note ÖNERME.`);
  return bolumler.join("\n\n");
}
