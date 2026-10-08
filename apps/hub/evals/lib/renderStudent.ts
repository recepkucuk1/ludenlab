// apps/hub/evals/lib/renderStudent.ts
import { GUCLUK_DUZEYI_LABEL, TANI_LABEL, type Tani } from "@atolye/lib/ogrenci-profili";
import { KADEME_TR, WORK_AREA_TR, type AtolyeFixture, type StudioFixture } from "./core";

/* Hakemin gördüğü öğrenci bağlamı: uzmanın ekranda bildiği her şey (fikstürün tamamı), satır satır.
   Boş alanlar yazılmaz — "—" satırları hakemi "veri eksik" yönünde yanıltmasın. */

export const RUMUZ_NOTU =
  "- Not: görsel tanımlarında (visualPrompt) farklı bir ad ya da cinsiyet görünebilir; bu gizlilik kapısının rumuzudur, hata değildir.";

/** AI profilinden hakeme yalnız bu bölümler gider; ikisi de yoksa profilin başı. */
const PROFIL_BOLUMLERI = ["Öncelikli Çalışma Alanları", "Dikkat Edilmesi Gereken Noktalar"];
const PROFIL_KESIT = 600;

const dolu = (s: string | null | undefined): s is string => typeof s === "string" && s.trim().length > 0;
/** Fikstür tarihleri "YYYY-MM-DDT12:00:00" — hakeme yalnız gün gider. */
const gun = (iso: string) => iso.slice(0, 10);
const yeniOnce = <T extends { createdAt: string }>(xs: T[]) => [...xs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/** Markdown başlığı (`## X`, `### X`) altındaki satırları bir sonraki başlığa kadar toplar; madde işaretleri atılır. */
function profilBolumu(md: string, baslik: string): string[] | null {
  const satirlar = md.split("\n");
  const i = satirlar.findIndex((l) => /^#{1,6}\s+/.test(l) && l.replace(/^#{1,6}\s+/, "").trim() === baslik);
  if (i < 0) return null;
  const govde: string[] = [];
  for (const l of satirlar.slice(i + 1)) {
    if (/^#{1,6}\s+/.test(l)) break;
    const t = l.replace(/^\s*[-*•]\s+/, "").trim();
    if (t) govde.push(t);
  }
  return govde.length ? govde : null;
}

function profilOzeti(md: string): string {
  const bolumler = PROFIL_BOLUMLERI.flatMap((b) => {
    const govde = profilBolumu(md, b);
    return govde ? [`  ${b}:`, ...govde.map((g) => `    - ${g}`)] : [];
  });
  if (bolumler.length) return ["- AI profili:", ...bolumler].join("\n");
  const t = md.trim();
  return `- AI profili: ${t.length > PROFIL_KESIT ? `${t.slice(0, PROFIL_KESIT)}…` : t}`;
}

export function renderStudioStudent(f: StudioFixture): string {
  const yas = new Date().getFullYear() - new Date(f.birthDate).getFullYear();
  const kartlar = yeniOnce(f.recentCards);
  const ozet = f.lastSummary;
  const ozetParcalari = ozet
    ? [
        ozet.overallAssessment,
        ozet.nextSessionPlan ? `Sonraki oturum planı: ${ozet.nextSessionPlan}` : "",
        dolu(ozet.behaviorNotes) ? `Davranış notu: ${ozet.behaviorNotes}` : "",
      ].filter(dolu)
    : [];
  return [
    `- Öğrenci: ${f.name}, ${yas} yaş · Çalışma alanı: ${WORK_AREA_TR[f.workArea] ?? f.workArea}`,
    dolu(f.diagnosis) ? `- Tanı: ${f.diagnosis}` : "",
    dolu(f.notes) ? `- Uzman notları: ${f.notes}` : "",
    dolu(f.aiProfile) ? profilOzeti(f.aiProfile) : "",
    kartlar.length
      ? ["- Son kartlar (yeniden eskiye):", ...kartlar.map((k) => `  ${k.title} · ${k.toolType} · ${gun(k.createdAt)}`)].join("\n")
      : "",
    ozetParcalari.length ? `- Son oturum özeti (${gun(ozet!.createdAt)}): ${ozetParcalari.join(" · ")}` : "",
    f.curriculumTitles.length ? `- Atanmış müfredat: ${f.curriculumTitles.join(", ")}` : "",
    f.completedGoalCodes.length ? `- Tamamlanan hedef kodları: ${f.completedGoalCodes.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderAtolyeCase(f: AtolyeFixture): string {
  const belgeler = yeniOnce(f.documents);
  const ilkSatir = (c: string) => (c.split("\n").find((l) => l.trim()) ?? "").replace(/^#{1,6}\s+/, "").trim();
  return [
    `- Öğrenci: ${f.code}, ${KADEME_TR[f.kademe] ?? f.kademe}${f.yas ? `, ${f.yas} yaş` : ""}`,
    f.taniProfili.length ? `- Güçlük profili: ${f.taniProfili.map((t) => TANI_LABEL[t as Tani] ?? t).join(", ")}` : "",
    f.guclukDuzeyi ? `- Güçlük düzeyi: ${GUCLUK_DUZEYI_LABEL[f.guclukDuzeyi]}` : "",
    dolu(f.gucluYonler) ? `- Güçlü yönler: ${f.gucluYonler}` : "",
    dolu(f.ilgiAlanlari) ? `- İlgi alanları: ${f.ilgiAlanlari}` : "",
    f.mebBolumler.length ? `- Çalışılan MEB bölümleri: ${f.mebBolumler.join(", ")}` : "",
    belgeler.length
      ? ["- Son belgeler (yeniden eskiye):", ...belgeler.map((d) => `  ${d.type} · ${gun(d.createdAt)} · ${ilkSatir(d.content)}`)].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
