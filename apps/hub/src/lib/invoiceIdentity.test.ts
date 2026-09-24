import { describe, expect, it } from "vitest";
import { buildInvoiceSnapshot, invoiceIdentity } from "./invoiceIdentity";

/**
 * Regresyon kilidi — GEÇMİŞ FATURALAR GÜNCEL PROFİLLE GÖRÜNÜYORDU (2026-09 denetimi).
 * Kimlik yalnız hesap silinirken kopyalanıyordu; kullanıcı fatura bilgisini değiştirince
 * eski tahsilatların alıcısı da değişiyordu (VUK: fatura işlem anındaki alıcıya kesilir).
 */
const OLD = {
  type: "INDIVIDUAL",
  fullName: "Eski Ad",
  tckn: "11111111110",
  companyName: null,
  taxNumber: null,
  taxOffice: null,
  address: "Eski adres",
  city: "Ankara",
  district: null,
};

describe("invoiceIdentity", () => {
  it("tahsilat anındaki kopya, sonradan değişen canlı profile ÜSTÜN gelir", () => {
    const snap = buildInvoiceSnapshot({ email: "eski@x.com", name: "Eski" }, OLD, {
      capturedAt: new Date("2026-09-01T00:00:00Z"),
    });
    const ident = invoiceIdentity({
      account: { email: "yeni@x.com", name: "Yeni", billingProfile: { fullName: "Yeni Ad", city: "İzmir" } },
      invoiceSnapshot: snap,
    });

    expect(ident.profile?.fullName).toBe("Eski Ad");
    expect(ident.profile?.city).toBe("Ankara");
    expect(ident.email).toBe("eski@x.com");
    expect(ident.fromSnapshot).toBe(false); // hesap yaşıyor — "silinmiş" işareti YOK
  });

  it("kopyası olmayan eski kayıtta canlı profil kullanılır", () => {
    const ident = invoiceIdentity({
      account: { email: "a@x.com", name: null, billingProfile: { fullName: "Canlı", city: "İzmir" } },
      invoiceSnapshot: null,
    });
    expect(ident.profile?.fullName).toBe("Canlı");
    expect(ident.fromSnapshot).toBe(false);
  });

  it("hesap silinmişse kopyadan okunur ve silinmiş olarak işaretlenir", () => {
    const snap = buildInvoiceSnapshot({ email: "s@x.com", name: null }, OLD, { deletedAt: new Date() });
    const ident = invoiceIdentity({ account: null, invoiceSnapshot: snap });
    expect(ident.profile?.fullName).toBe("Eski Ad");
    expect(ident.fromSnapshot).toBe(true);
  });
});
