import { z } from "zod";
import { ogrenciProfiliSchema } from "./ogrenci-profili";

/* İlerleme İzleme Çizelgesi — form alanları. Profil omurgasını genişletir. */

export const ilerlemeCizelgesiInputSchema = ogrenciProfiliSchema.extend({
  hedefMetni: z.string().trim().min(1, "Ölçülebilir hedef gerekli").max(600),
});

export type IlerlemeCizelgesiInput = z.infer<typeof ilerlemeCizelgesiInputSchema>;
