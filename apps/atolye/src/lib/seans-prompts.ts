import { definePrompt, type RunPromptResult } from "@ludenlab/ai";
import { ALAN, KADEME } from "./bep";
import { ATOLYE_SYSTEM } from "./atolye-system";
import { type SeansInput } from "./seans";

/* SERVER-ONLY. */

const seansPlani = definePrompt<SeansInput>({
  name: "seans_plani",
  temperature: 0.5,
  maxTokens: 2600,
  system: ATOLYE_SYSTEM,
  user: (input) => `Aşağıdaki bilgilerle tek bir BİREYSEL SEANS PLANI üret.

SEANS BİLGİSİ
- Kod/rumuz: ${input.rumuz}
- Kademe: ${KADEME[input.kademe]}
- Alan: ${ALAN[input.alan]}
- Bu seansın hedefi: ${input.seansHedefi}
- Süre: ${input.sureDk} dakika
- İlgi alanları (etkinliklere taşı): ${input.ilgiAlanlari || "—"}
- Son seans notu: ${input.sonSeansNotu || "—"}
- Materyal kısıtı: ${input.materyalKisiti || "—"}

İSTENEN YAPI (MEB seans şablonu)
1. **Seans Künyesi** (rumuz, alan, süre, hedef — kısa tablo)
2. **Etkinlik Akışı** — süre dağılımıyla:
   - *Isınma* · *Ana Etkinlik(ler)* · *Tekrar/Oyun* · *Kapanış*
   - Her adımda çok duyulu yöntem ve (varsa) çocuğun ilgi alanını kullan; toplam süre = ${input.sureDk} dk
3. **Materyaller** (madde madde; materyal kısıtına uy)
4. **Ölçme** (bu seansta ne, nasıl kaydedilecek: doğruluk %, süre, gözlem)
5. **Ev Görevi** (kısa, yapılandırılmış, 1 etkinlik)
6. **Sonraki Adım** (bir sonraki seans için uyarlama önerisi)`,
});

export function generateSeans(input: SeansInput): Promise<RunPromptResult> {
  return seansPlani.run(input);
}
