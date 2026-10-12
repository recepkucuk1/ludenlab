/**
 * Reels 5 verisi. MEB seçimi resmî programdan birebir (tests/r5Plan.test.ts
 * apps/hub/.../meb-program.ts ile karşılaştırır). Seans planı KURGU bir taslaktır;
 * yapısı ürün prompt'unun istediği yapıdır (apps/hub/.../seans-prompts.ts).
 */
export const R5_MEB = {
  modul: { no: 3, ad: "Okuma ve Yazma" },
  bolum: { kod: "3.1", ad: "Erken Okuryazarlık" },
  hedef: { kod: "3.1.2", metin: "Sözcüklerin hece özelliklerini ayırt eder." },
  davranislar: [
    { kod: "3.1.2.1", metin: "Söylenen sözcükleri hecelerine ayırır." },
    { kod: "3.1.2.2", metin: "Söylenen bir sözcüğün ilk hecesini söyler." },
  ],
} as const;

/** Gerçek veriden sayıldı (test doğrular). meb-program.ts başlık yorumu 1079 diyor ama veride 1077 var. */
export const R5_COUNTS = { modul: 6, hedef: 172, davranis: 1077 } as const;

/** Etkinlik akışı — hem Markdown'da hem sahne maketinde. */
export const R5_FLOW = [
  { ad: "Isınma", dk: 5, metin: "Adını el çırparak heceler; her hecede bir alkış." },
  { ad: "Ana Etkinlik 1", dk: 15, metin: "Hece treni: resimli kartlardaki sözcükleri vagonlara hece hece yerleştirir. (3.1.2.1)" },
  { ad: "Ana Etkinlik 2", dk: 10, metin: "İlk hece avı: söylenen sözcüğün ilk hecesiyle başlayan kartı bulur. (3.1.2.2)" },
  { ad: "Tekrar/Oyun", dk: 7, metin: "Hece zıplama: her hece için yere çizili bir kareye zıplar." },
  { ad: "Kapanış", dk: 3, metin: "En sevdiği sözcüğü heceleyerek söyler; çıkartmayla pekiştirilir." },
] as const;

export const R5_PLAN_MD = `## Seans Künyesi

| Öğrenci | Alan | Süre | Hedef |
|---|---|---|---|
| Öğrenci A | Okuma | 40 dk | Sözcükleri hecelerine ayırır, ilk heceyi söyler |

**MEB hedefi:** ${R5_MEB.hedef.kod} ${R5_MEB.hedef.metin} (${R5_MEB.davranislar.map((d) => d.kod).join(", ")})

## Etkinlik Akışı

${R5_FLOW.map((f) => `- *${f.ad}* (${f.dk} dk): ${f.metin}`).join("\n")}

## Materyaller

- Resimli sözcük kartları (8 adet)
- Tren vagonu şablonu ve renkli pullar
- Yere çizilmiş 4 kare

## Ölçme

- 3.1.2.1: 10 sözcükte doğru heceleme sayısı (hedef %80)
- 3.1.2.2: 8 sözcükte doğru ilk hece sayısı (hedef %75)

## Ev Görevi

Evdeki 5 eşyanın adını aileyle birlikte el çırparak heceleyin.

## Sonraki Adım

%80'e ulaşılırsa son heceyi söyleme davranışına (3.1.2.3) geçin.
`;
