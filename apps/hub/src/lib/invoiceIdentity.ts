/**
 * Bir tahsilat kaydının FATURA KİMLİĞİ — tahsilat anındaki kopyadan, yoksa canlı hesaptan.
 *
 * NEDEN (2026-08 denetimi #03): hesap silme `Payment.accountId`'yi NULL'a düşürür (kayıt VUK
 * gereği SİLİNMEZ, bkz. sql/0015); kimlik `invoiceSnapshot`'a kopyalanır.
 *
 * NEDEN (2026-09 denetimi): kimlik yalnız silmede kopyalanıyordu; hesap yaşarken fatura
 * ekranı GÜNCEL profili okuyordu → kullanıcı fatura bilgisini değiştirince GEÇMİŞ
 * tahsilatlar da yeni kimlikle görünüyordu (VUK: fatura, işlem anındaki alıcıya kesilir).
 * Artık kopya tahsilat anında (webhook, Payment oluşurken) alınır ve ÖNCELİKLİDİR; canlı
 * profil yalnız kopyası olmayan eski kayıtlar için yedektir.
 */

type SnapshotProfile = {
  type: string;
  fullName: string;
  tckn: string | null;
  companyName: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  address: string | null;
  city: string;
  district: string | null;
} | null;

/**
 * `Payment.invoiceSnapshot` içeriği. Tahsilat anında `capturedAt`, hesap silmede
 * `deletedAt` ile yazılır; okuma tarafı ikisini aynı biçimde çözer.
 */
export function buildInvoiceSnapshot(
  account: { email: string; name: string | null },
  profile: SnapshotProfile,
  at: { capturedAt?: Date; deletedAt?: Date },
): Record<string, unknown> {
  return {
    ...(at.capturedAt ? { capturedAt: at.capturedAt.toISOString() } : {}),
    ...(at.deletedAt ? { deletedAt: at.deletedAt.toISOString() } : {}),
    email: account.email,
    name: account.name ?? null,
    profile: profile
      ? {
          type: profile.type,
          fullName: profile.fullName,
          tckn: profile.tckn,
          companyName: profile.companyName,
          taxNumber: profile.taxNumber,
          taxOffice: profile.taxOffice,
          address: profile.address,
          city: profile.city,
          district: profile.district,
        }
      : null,
  };
}

export interface InvoiceProfile {
  type: string | null;
  fullName: string | null;
  tckn: string | null;
  companyName: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
}

export interface InvoiceIdentity {
  email: string;
  name: string | null;
  profile: InvoiceProfile | null;
  /** Hesap silinmiş (kimlik tahsilat/silme anındaki kopyadan geliyor). */
  fromSnapshot: boolean;
}

type LiveAccount = {
  email: string;
  name: string | null;
  billingProfile: Partial<InvoiceProfile> | null;
} | null;

function pick(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function invoiceIdentity(payment: {
  account: LiveAccount;
  invoiceSnapshot?: unknown;
}): InvoiceIdentity {
  const live = payment.account;
  const snap = payment.invoiceSnapshot;
  // Kopya varsa O otoriterdir (işlem anındaki alıcı); yoksa canlı profil.
  if (live && !(snap && typeof snap === "object")) {
    const bp = live.billingProfile;
    return {
      email: live.email,
      name: live.name ?? null,
      profile: bp
        ? {
            type: pick(bp.type),
            fullName: pick(bp.fullName),
            tckn: pick(bp.tckn),
            companyName: pick(bp.companyName),
            taxNumber: pick(bp.taxNumber),
            taxOffice: pick(bp.taxOffice),
            address: pick(bp.address),
            city: pick(bp.city),
            district: pick(bp.district),
          }
        : null,
      fromSnapshot: false,
    };
  }

  // Tahsilat anındaki (ya da hesap silindiyse silme anındaki) kopya.
  if (snap && typeof snap === "object") {
    const s = snap as Record<string, unknown>;
    const p = (s.profile && typeof s.profile === "object" ? s.profile : null) as Record<
      string,
      unknown
    > | null;
    return {
      email: pick(s.email) ?? "(silinmiş hesap)",
      name: pick(s.name),
      profile: p
        ? {
            type: pick(p.type),
            fullName: pick(p.fullName),
            tckn: pick(p.tckn),
            companyName: pick(p.companyName),
            taxNumber: pick(p.taxNumber),
            taxOffice: pick(p.taxOffice),
            address: pick(p.address),
            city: pick(p.city),
            district: pick(p.district),
          }
        : null,
      fromSnapshot: !live,
    };
  }

  // Ne hesap ne snapshot (0015 öncesi öksüz kalmış olamaz; savunmacı).
  return { email: "(silinmiş hesap)", name: null, profile: null, fromSnapshot: true };
}
