// apps/hub/evals/tools/studio/homework/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { frac, kayitlar, lower, mean, str, zorunluKip } from "../../../lib/sharedChecks";

export interface HomeworkBody {
  targetArea: string;
  duration: "10" | "15" | "20";
  parentLevel: "basic" | "detailed";
  materialType: "exercise" | "observation" | "daily_activity";
  extraNote?: string;
}
type Rec = Record<string, unknown>;
/** Temel veli düzeyinde geçmemesi gereken terimler (ses/dil bilimi ve uzman jargonu). */
const TEKNIK =
  /fonem|fonolojik|fonoloji|artikülasyon|morfem|morfolojik|morfoloji|fonetik|pragmatik|sentaks|semantik|reseptif|ekspresif|prozodi|öne alma|ifade edici|alıcı dil|velar|alveolar|bilabial|minimal çift/u;
/** Öneri kipi: "yapabilirsiniz", "isterseniz" (prompt: "'yapın' yerine 'yapabilirsiniz'"). Küçük harfe indirilmiş metne uygulanır. */
const ONERI = /[ae]bilir(?:siniz)?(?!\p{L})|isterseniz/u;

export function homeworkChecks(args: { body: HomeworkBody; output: unknown; raw?: Rec | null; text?: string; alias?: string | null }): ToolCheckOut {
  const { body } = args;
  const output = args.output && typeof args.output === "object" && !Array.isArray(args.output) ? (args.output as Rec) : null;
  const steps = kayitlar(output?.steps);
  const hard: string[] = [];
  if (output && steps.length === 0) hard.push("adim_yok");
  const adimSayisi = steps.length >= 3 ? 1 : 0;
  const adimSira = steps.length && steps.every((s, i) => Number(s.stepNumber) === i + 1) ? 1 : 0;
  // Prompt "(varsa)" der: malzeme listesi bulunmalı ama boş olabilir.
  const materyal = Array.isArray(output?.materials) ? 1 : 0;
  const alanlar = mean(["title", "introduction", "watchFor", "celebration", "frequency", "expertNotes", "adaptations"].map((k) => (str(output?.[k]).trim() ? 1 : 0)));
  // Prompt kuralı: veliye emir/zorunluluk değil öneri kipi. Adım öneri biçimi taşımalı VE zorunluluk kipi içermemeli.
  const oneriKipi = steps.length
    ? frac(steps, (s) => {
        const t = lower(str(s.instruction));
        return ONERI.test(t) && !zorunluKip(t);
      })
    : 0;
  // Uzman notları (expertNotes) ve başlık veliye dönük sayılmaz; veliye giden diğer alanların hepsi taranır.
  const veliMetni = [
    str(output?.introduction),
    ...steps.map((s) => `${str(s.instruction)} ${str(s.tip)}`),
    str(output?.watchFor),
    str(output?.celebration),
    str(output?.frequency),
    str(output?.adaptations),
  ].join(" ");
  // Çıktı yoksa "teknik terim yok" kanıtlanamaz: 0.
  const teknikTerim = !output ? 0 : body.parentLevel === "basic" ? (TEKNIK.test(lower(veliMetni)) ? 0 : 1) : 1;
  const scores = { adim_sayisi: adimSayisi, adim_sira: adimSira, materyal, alanlar, oneri_kipi: oneriKipi, teknik_terim: teknikTerim };
  return { scores: { ...scores, talimat: output ? mean(Object.values(scores)) : 0 }, details: { adim: steps.length, ...scores }, hard };
}
