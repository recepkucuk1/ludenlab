// apps/hub/evals/tools/atolye/ilerleme-cizelgesi/adapter.ts
import { atolyeAdapter, profilBody } from "../../../lib/adapterFactory";
import { mebSatirlari } from "../ortak";
import { ILERLEME_BOLUM_LISTESI, ilerlemeChecks, type IlerlemeBody } from "./checks";

export const adapter = atolyeAdapter<IlerlemeBody>({
  id: "atolye/ilerleme-cizelgesi",
  label: "İlerleme çizelgesi (Atölye)",
  dir: import.meta.dirname,
  route: () => import("@/app/atolye/api/ilerleme-cizelgesi/route"),

  body: (b, f) => ({ ...profilBody(f), ...b }),

  // `ilerleme-cizelgesi-prompts.ts` hedefi etiketsiz, "HEDEF" başlığının altına düz metin olarak basar (`HEDEF\n<metin>`; adapter.selftest gerçek istemde doğrular);
  // hakem görevinde bu "- Hedef:" etiketiyle gösterilir.
  requestLines: (b) => [`- Hedef: ${b.hedefMetni}`, ...mebSatirlari(b.mebHedefKod, b.mebDavranisKodlari)],

  sections: ILERLEME_BOLUM_LISTESI, // tek kaynak: checks.ts
  checks: ilerlemeChecks,

  criteria: [
    { key: "veri_sadakati", question: "Çizelge boş mu (hiçbir sonuç/veri uydurulmamış, örnek satırlar yalnız ölçüt adı taşıyor); hedefin gözlenebilir bileşenleri verilen hedef metninden (davranış + ölçüt + koşul) türetilmiş mi, metinde olmayan ölçüt/koşul eklenmemiş mi?" },
    { key: "olcut_netligi", question: "Göstergeler sayılabilir/ölçülebilir mi (yüzde, sıklık, süre); ölçüm sıklığı ve yöntemi uygulanabilir; yorumlama notu ilerleme/plato/gerileme için karar kuralı (eşik, kaç ardışık ölçüm) veriyor mu; hedef belirsizse hangi bilginin gerektiği belirtilmiş mi?" },
  ],
});
