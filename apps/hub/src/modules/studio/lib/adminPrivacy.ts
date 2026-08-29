/**
 * Admin görünümünde çocuk PII maskesi + klinik erişim kapısı
 * (2026-08 güvenlik denetimi #23).
 *
 * SORUN: `impersonate` ucu KVKK rızası (`supportAccessExpiresAt`) istiyor ve her kullanımı
 * audit'liyordu; ama admin KULLANICI DETAY ucu aynı çocuk klinik verisine (ad + TANI +
 * randevu başlıkları) rızasız ulaşıyordu ve bu okuma HİÇBİR İZ BIRAKMIYORDU. Yani rıza
 * kapısı, yanından dolaşılabilen bir kapıydı.
 *
 * ÇÖZÜM — iki kademe:
 *   1. VARSAYILAN (rıza yok): kimlik maskelenir, TANI hiç gönderilmez. Destek için gereken
 *      işletimsel bağlam (kaç öğrenci, kaç randevu, çalışma alanı, tarihler) korunur —
 *      yani ekran işlevsiz kalmaz, yalnız çocuğun kimliği ve klinik teşhisi gizlenir.
 *   2. RIZA VARSA (supportAccessExpiresAt > now): tam veri döner VE okuma audit'lenir.
 *
 * Maskeleme sunucuda yapılır: maskelenmiş veri istemciye HİÇ gitmez (client-side gizleme
 * gerçek bir kontrol değildir).
 */

/**
 * Türkçe-duyarlı küçültme + karakter indeks eşlemesi.
 *
 * NEDEN REGEX `/i` KULLANMIYORUZ: JS'in varsayılan case-folding'i Türkçe'nin noktalı/
 * noktasız İ ayrımını bilmez — `/Elif/i.test("ELİF")` **false** döner (İ = U+0130 varsayılan
 * eşlemede `i`'ye katlanmaz). Yani ad BÜYÜK HARFLE yazılmış bir randevu başlığında maske
 * sessizce ıskalanır — tam da kapatmaya çalıştığımız sızıntı. Ayrıca `"İ".toLowerCase()`
 * varsayılan yerelde 2 karakter üretir (i + birleşen nokta), bu da indeks hizasını bozar.
 *
 * Bu yüzden karakter karakter `tr` yerelinde küçültüp, küçültülmüş metnin her karakteri
 * için ORİJİNAL indeksi tutuyoruz: uzunluk değişse bile eşleşme yerini şaşırmıyoruz.
 */
function foldWithIndex(text: string): { folded: string; origIndex: number[] } {
  let folded = "";
  const origIndex: number[] = [];
  for (let i = 0; i < text.length; i++) {
    for (const ch of text[i]!.toLocaleLowerCase("tr")) {
      folded += ch;
      origIndex.push(i);
    }
  }
  return { folded, origIndex };
}

const fold = (s: string) => foldWithIndex(s).folded;

/**
 * "Elif Kaya" → "E*** K***". Kimliği gizler ama satırları birbirinden ayırt edilebilir
 * tutar (admin "aynı çocuk mu, başka çocuk mu" sorusunu yine yanıtlayabilir).
 */
export function maskPersonName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return "—";
  return trimmed
    .split(/\s+/)
    .map((token) => (token.length <= 1 ? token : `${[...token][0]}***`))
    .join(" ");
}

/**
 * Serbest metinde (randevu başlığı gibi terapist yazımı alanlarda) geçen adı maskeler.
 * Başlığın geri kalanı korunur — "Elif ile ses çalışması" → "E*** ile ses çalışması".
 */
export function maskNameIn(text: string | null | undefined, name: string | null | undefined): string {
  const value = text ?? "";
  const tokens = (name ?? "")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3); // çok kısa parçalar sıradan kelimelerle çakışır
  if (tokens.length === 0 || !value) return value;

  const { folded, origIndex } = foldWithIndex(value);

  // Eşleşme aralıklarını topla. UZUN parçadan kısaya: "Elifnaz" varken önce onu yakala,
  // sonra "Elif" — aksi halde kısa parça uzunun içini keser ("E***naz").
  const ranges: Array<{ start: number; end: number }> = [];
  const overlaps = (s: number, e: number) => ranges.some((r) => s < r.end && e > r.start);

  for (const token of [...tokens].sort((a, b) => b.length - a.length)) {
    const needle = fold(token);
    if (!needle) continue;
    for (let at = folded.indexOf(needle); at !== -1; at = folded.indexOf(needle, at + 1)) {
      const start = origIndex[at]!;
      const end = origIndex[at + needle.length - 1]! + 1;
      if (!overlaps(start, end)) ranges.push({ start, end });
    }
  }
  if (ranges.length === 0) return value;

  ranges.sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;
  for (const r of ranges) {
    out += value.slice(cursor, r.start) + maskPersonName(value.slice(r.start, r.end));
    cursor = r.end;
  }
  return out + value.slice(cursor);
}

export interface ClinicalAccess {
  /** Terapistin geçerli destek erişimi rızası var mı? */
  granted: boolean;
  expiresAt: Date | null;
  reason: string | null;
}

/**
 * Klinik veri kapısı — `impersonate` ucuyla AYNI rıza koşulu (tek doğruluk kaynağı olsun
 * diye burada toplandı; iki uç birbirinden ayrışmasın).
 */
export function clinicalAccess(
  therapist: { supportAccessExpiresAt: Date | null; supportAccessReason: string | null },
  now: Date = new Date(),
): ClinicalAccess {
  const expiresAt = therapist.supportAccessExpiresAt;
  return {
    granted: Boolean(expiresAt && expiresAt > now),
    expiresAt: expiresAt ?? null,
    reason: therapist.supportAccessReason ?? null,
  };
}

/* ── Satır maskeleri ─────────────────────────────────────────────────────── */

export interface AdminStudentRow {
  id: string;
  name: string;
  workArea: string;
  diagnosis: string | null;
  createdAt: Date | string;
  _count: { lessons: number; assignments: number; progress: number };
}

export interface AdminLessonRow {
  id: string;
  title: string;
  student: { id: string; name: string } | null;
  [k: string]: unknown;
}

/** Kimlik maskelenir, TANI hiç gönderilmez (null ≠ "tanı yok" ayrımı `piiMasked` ile). */
export function maskStudentRow<T extends AdminStudentRow>(row: T): T {
  return { ...row, name: maskPersonName(row.name), diagnosis: null };
}

/** Randevu başlığı terapist yazımıdır — içindeki ad da maskelenir. */
export function maskLessonRow<T extends AdminLessonRow>(row: T): T {
  return {
    ...row,
    title: maskNameIn(row.title, row.student?.name),
    student: row.student ? { ...row.student, name: maskPersonName(row.student.name) } : null,
  };
}
