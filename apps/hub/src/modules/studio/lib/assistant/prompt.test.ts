// apps/hub/src/modules/studio/lib/assistant/prompt.test.ts
import { describe, expect, it, vi } from "vitest";
import { promptPenceresi, PROMPT_PENCERESI_GENIS } from "@studio/lib/prompts/iskelet";

vi.mock("@studio/lib/db", () => ({ prisma: {} }));

const { ASSISTANT_SYSTEM_PROMPT, buildAssistantUserPrompt } = await import("./prompt");

describe("asistan sistem prompt'u", () => {
  it("geniş pencerede, A1 sırasında, üç öneri türünü ve JSON şemasını içerir", () => {
    expect(promptPenceresi(ASSISTANT_SYSTEM_PROMPT, PROMPT_PENCERESI_GENIS).uygun).toBe(true);
    for (const b of ["ROL", "KLİNİK ÇERÇEVE", "ÖZGÜLLÜK KURALLARI", "BİÇİM", "ÖZ-DENETİM"]) expect(ASSISTANT_SYSTEM_PROMPT).toContain(b);
    expect(ASSISTANT_SYSTEM_PROMPT).toContain('"goal_status"');
    expect(ASSISTANT_SYSTEM_PROMPT).toContain('"profile_note"');
    expect(ASSISTANT_SYSTEM_PROMPT).toContain('"generate_tool"');
    expect(ASSISTANT_SYSTEM_PROMPT).toContain("en fazla 4");
  });
});

describe("buildAssistantUserPrompt", () => {
  const temel = {
    studentBlock: "Öğrenci: Nisa, 6 yaş\nÇalışma alanı: Konuşma",
    observation: "Kelime başı /r/ %60, oyunla daha iyi",
    goals: [{ id: "g1", code: "3.1", title: "Kelime başı /r/", status: "in_progress" }],
    hasProfile: true,
  };

  it("sıra: öğrenci bloğu → yeni gözlem → hedef listesi (id|kod|başlık|durum) → araç kataloğu", () => {
    const p = buildAssistantUserPrompt(temel);
    expect(p.indexOf("ÖĞRENCİ")).toBeLessThan(p.indexOf("YENİ GÖZLEM"));
    expect(p.indexOf("YENİ GÖZLEM")).toBeLessThan(p.indexOf("HEDEFLER"));
    expect(p.indexOf("HEDEFLER")).toBeLessThan(p.indexOf("ARAÇLAR"));
    expect(p).toContain("g1 | 3.1 | Kelime başı /r/ | in_progress");
    expect(p).toContain("Kelime başı /r/ %60, oyunla daha iyi");
    expect(p).toContain("articulation:");
    expect(p).toContain("homework:");
  });

  it("hedef listesi boşsa 'hedef listesi boş' yazılır; profil yoksa profile_note yasaklanır", () => {
    const p = buildAssistantUserPrompt({ ...temel, goals: [], hasProfile: false });
    expect(p).toContain("hedef listesi boş");
    expect(p).toContain("profile_note ÖNERME");
  });

  it("hedef listesi 60 satırla sınırlı", () => {
    const goals = Array.from({ length: 80 }, (_, i) => ({ id: `g${i}`, code: `${i}`, title: `H${i}`, status: "not_started" }));
    const p = buildAssistantUserPrompt({ ...temel, goals });
    expect(p).toContain("g59 |");
    expect(p).not.toContain("g60 |");
  });
});
