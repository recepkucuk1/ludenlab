/**
 * Bir tahsilat kaydının FATURA KİMLİĞİ — canlı hesaptan ya da silme anındaki kopyadan.
 *
 * NEDEN (2026-08 denetimi #03): hesap silme artık `Payment.accountId`'yi NULL'a düşürüyor
 * (kayıt VUK gereği SİLİNMEZ, bkz. sql/0015). Böyle "öksüz" kalmış kayıtların kimliği
 * silme anında `invoiceSnapshot`'a kopyalanır. Fatura ekranı/CSV'si her iki durumu da
 * okuyabilmeli: hesap duruyorsa canlı veriden, silinmişse snapshot'tan.
 */

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
  /** Hesap silinmiş ve kimlik snapshot'tan geliyor. */
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
  if (live) {
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

  // Hesap silinmiş → silme anındaki kopya.
  const snap = payment.invoiceSnapshot;
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
      fromSnapshot: true,
    };
  }

  // Ne hesap ne snapshot (0015 öncesi öksüz kalmış olamaz; savunmacı).
  return { email: "(silinmiş hesap)", name: null, profile: null, fromSnapshot: true };
}
