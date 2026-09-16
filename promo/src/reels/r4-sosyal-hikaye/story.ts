const BUCKET = "https://kgbhvruzoaqwwwkhzdex.supabase.co/storage/v1/object/public/tool-images";

/**
 * Reels 4 için KURGU sosyal hikaye — ürünün SocialStoryContent şekli
 * (apps/hub/src/modules/studio/components/cards/SocialStoryView.tsx).
 * Görseller Studio'nun global sahne önbelleğinden (flux-scene-v1, PII yok),
 * yerel kopyaları `npm run fetch:r4` ile public/real/r4/ altına iner.
 */
export const r4Story = {
  title: "Markette Sıra Bekliyorum",
  sentences: [
    {
      type: "descriptive",
      text: "Bazen annemle markete giderim. Kasada sıra olabilir.",
      file: "real/r4/s1.png",
      sourceUrl: `${BUCKET}/a_young_boy_holding_a_small_shopping_basket_walking_toward_a_checkout_counter_in-15pa8pt.png`,
    },
    {
      type: "perspective",
      text: "Sıradaki insanlar da kendi sıralarını bekler.",
      file: "real/r4/s2.png",
      sourceUrl: `${BUCKET}/a_few_people_standing_in_a_checkout_line_at_a_grocery_store_each_holding_their_i-4x0etg.png`,
    },
    {
      type: "directive",
      text: "Sıram gelene kadar ellerimi yanımda tutup sakince bekleyebilirim.",
      file: "real/r4/s3.png",
      sourceUrl: `${BUCKET}/a_young_boy_standing_quietly_next_to_an_adult_in_a_checkout_line_hands_at_his_si-1wv90zu.png`,
    },
    {
      type: "affirmative",
      text: "Sıramı beklediğimde kendimle gurur duyarım.",
      file: "real/r4/s4.png",
      sourceUrl: `${BUCKET}/a_young_boy_smiling_proudly_at_a_checkout_counter_as_the_cashier_gives_him_a_thu-1v34i1v.png`,
    },
  ],
  expertNotes:
    "Hikayeyi markete gitmeden önce birlikte okuyun. Bekleme sırasında sayı saymak ya da sepetteki ürünleri söylemek gibi bir görev verin.",
  homeGuidance:
    "Evde küçük sıra oyunları oynayın (oyuncak sırası, lavabo sırası). Sakince beklediğinde davranışı adıyla övün.",
} as const;

export const SENTENCE_TYPE = {
  descriptive: { label: "Tanımlayıcı", pdfColor: "#107996" },
  perspective: { label: "Perspektif", pdfColor: "#023435" },
  directive: { label: "Yönlendirici", pdfColor: "#FE703A" },
  affirmative: { label: "Olumlu", pdfColor: "#b45309" },
} as const;
