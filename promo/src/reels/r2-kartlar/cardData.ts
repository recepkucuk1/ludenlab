/**
 * Reels 2 için KURGU öğrenme kartı — ürünün GeneratedCard şekliyle birebir
 * (apps/hub/src/modules/studio/lib/prompts/index.ts). Hem gerçek PDF şablonu
 * (scripts/assets/r2-card-entry.tsx) hem sahne maketi bunu kullanır.
 */
export const r2Card = {
  title: "/s/ Sesini Kelime Başında Üretme",
  objective:
    "Çocuk, görsel ve işitsel ipucu desteğiyle /s/ sesini kelime başı pozisyonunda 10 denemenin 8'inde doğru üretir.",
  materials: ["El aynası", "/s/ ile başlayan resimli kartlar", "Yılan kuklası", "Pekiştireç çıkartmaları"],
  instructions: [
    "Adım 1: Aynada dil ucunun alt dişlerin arkasındaki yerini birlikte gösterin.",
    "Adım 2: Yılan kuklasıyla uzun 'sss' sesini oyunlaştırarak modelleyin.",
    "Adım 3: Sesi hecelerde (sa, se, si, so, su) tekrar ettirin.",
    "Adım 4: Resimli kartlarla kelime başı /s/ üretimine geçin; doğru üretimleri çıkartmayla pekiştirin.",
  ],
  exercises: [
    {
      name: "Yılan Oyunu",
      description: "Kukla kartların üzerinden geçerken çocuk uzun 'sss' sesi çıkarır.",
      repetitions: "5 tekrar",
    },
    {
      name: "Hece Merdiveni",
      description: "Her basamakta bir hece söylenir: sa, se, si, so, su.",
      repetitions: "3 tur",
    },
    {
      name: "Kart Avı",
      description: "Seçilen resmin adı söylenir: sabun, saat, simit, soğan.",
      repetitions: "10 deneme",
    },
  ],
  therapistNotes:
    "Dil ucu dişler arasına kayarsa aynadaki görsel ipucuna geri dönün. Başarı %80'e ulaşınca kelime ortası pozisyona geçin.",
  progressIndicators: [
    "/s/ sesini izole olarak ipucusuz üretir",
    "Hecelerde 5 denemenin 4'ünde doğru üretir",
    "Kelime başında 10 denemenin 8'inde doğru üretir",
  ],
  homeExercise:
    "Evde /s/ ile başlayan 5 nesne bulun ve her birinin adını günde iki kez birlikte söyleyin.",
  category: "speech",
  difficulty: "medium",
  ageGroup: "3-6",
} as const;
