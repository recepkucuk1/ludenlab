"use client";
import { PAlert } from "@studio/components/poster";

/** Asistan ön-doldurma uyarısı: formu uzman kontrol eder, Üret'e kendisi basar (kredi orada düşer). */
export function PrefillBanner() {
  return (
    <div style={{ marginBottom: 14 }}>
      <PAlert tone="info">Alanlar Asistan önerisiyle dolduruldu; kontrol edip <b>Üret</b>&apos;e basın.</PAlert>
    </div>
  );
}
