import { describe, expect, it } from "vitest";
import {
  clinicalAccess,
  maskLessonRow,
  maskNameIn,
  maskPersonName,
  maskStudentRow,
} from "./adminPrivacy";

/**
 * Regresyon kilidi — "admin çocuk klinik verisini rızasız/izsiz okuyor"
 * (2026-08 güvenlik denetimi #23).
 *
 * `impersonate` KVKK rızası isterken admin kullanıcı-detay ucu aynı veriye rızasız
 * ulaşıyordu. Burada kilitlenen sözleşme: rıza YOKKEN kimlik maskeli, TANI hiç yok.
 */
const NOW = new Date("2026-08-29T12:00:00Z");

describe("maskPersonName", () => {
  it("her ad parçasının yalnız ilk harfini bırakır", () => {
    expect(maskPersonName("Elif Kaya")).toBe("E*** K***");
    expect(maskPersonName("Ahmet Can Yılmaz")).toBe("A*** C*** Y***");
  });

  it("Türkçe harfleri bozmaz", () => {
    expect(maskPersonName("Şeyma Öztürk")).toBe("Ş*** Ö***");
    expect(maskPersonName("İpek Çınar")).toBe("İ*** Ç***");
  });

  it("boş/eksik adda tire döner (çökmeye yer yok)", () => {
    expect(maskPersonName("")).toBe("—");
    expect(maskPersonName("   ")).toBe("—");
    expect(maskPersonName(null)).toBe("—");
    expect(maskPersonName(undefined)).toBe("—");
  });

  it("tek harfli parçayı olduğu gibi bırakır (zaten kimlik taşımaz)", () => {
    expect(maskPersonName("Ali B")).toBe("A*** B");
  });
});

describe("maskNameIn", () => {
  it("serbest metindeki adı maskeler, kalanını korur", () => {
    expect(maskNameIn("Elif ile ses çalışması", "Elif Kaya")).toBe("E*** ile ses çalışması");
  });

  it("büyük/küçük harf farkına bakmaz — Türkçe noktalı İ dahil", () => {
    // JS'in varsayılan case-folding'i burada YANILIR: /Elif/i.test("ELİF") === false.
    // Maskenin BÜYÜK harfli başlıklarda sessizce ıskalaması tam da kapatılan sızıntıydı.
    expect(maskNameIn("ELİF seansı", "Elif")).toBe("E*** seansı");
  });

  it("noktasız ı yönünü de yakalar (IŞIL ↔ Işıl)", () => {
    expect(maskNameIn("IŞIL değerlendirmesi", "Işıl")).toBe("I*** değerlendirmesi");
  });

  it("aynı ad metinde birden çok geçerse hepsi maskelenir", () => {
    expect(maskNameIn("Elif geldi, Elif gitti", "Elif")).toBe("E*** geldi, E*** gitti");
  });

  it("uzun parçayı önce yakalar — kısa parça uzunun içini kesmez", () => {
    expect(maskNameIn("Elifnaz değerlendirme", "Elifnaz Elif")).toBe("E*** değerlendirme");
  });

  it("3 harften kısa parçalar sıradan kelimelerle çakışmasın diye atlanır", () => {
    expect(maskNameIn("Ev ödevi kontrolü", "Ev")).toBe("Ev ödevi kontrolü");
  });

  it("ad yoksa metne dokunmaz", () => {
    expect(maskNameIn("Genel seans", null)).toBe("Genel seans");
    expect(maskNameIn(null, "Elif")).toBe("");
  });

  it("regex özel karakterli adda patlamaz", () => {
    expect(maskNameIn("A.C. seansı", "A.C.")).toBe("A*** seansı");
  });
});

describe("clinicalAccess", () => {
  it("rıza penceresi açıkken izin verir", () => {
    const a = clinicalAccess(
      { supportAccessExpiresAt: new Date("2026-08-29T13:00:00Z"), supportAccessReason: "fatura" },
      NOW,
    );
    expect(a.granted).toBe(true);
    expect(a.reason).toBe("fatura");
  });

  it("süresi geçmiş rıza GEÇERSİZ", () => {
    const a = clinicalAccess(
      { supportAccessExpiresAt: new Date("2026-08-29T11:59:59Z"), supportAccessReason: null },
      NOW,
    );
    expect(a.granted).toBe(false);
  });

  it("hiç rıza yoksa izin yok (varsayılan kapalı)", () => {
    expect(clinicalAccess({ supportAccessExpiresAt: null, supportAccessReason: null }, NOW).granted).toBe(false);
  });
});

describe("satır maskeleri", () => {
  it("öğrenci satırında TANI hiç gönderilmez", () => {
    const masked = maskStudentRow({
      id: "s1",
      name: "Elif Kaya",
      workArea: "artikulasyon",
      diagnosis: "Otizm Spektrum Bozukluğu",
      createdAt: "2026-01-01",
      _count: { lessons: 5, assignments: 2, progress: 3 },
    });
    expect(masked.name).toBe("E*** K***");
    expect(masked.diagnosis).toBeNull(); // ← asıl sızıntı buydu
    expect(masked.workArea).toBe("artikulasyon"); // işletimsel bağlam korunur
    expect(masked._count.lessons).toBe(5);
  });

  it("randevu satırında hem başlık hem öğrenci adı maskelenir", () => {
    const masked = maskLessonRow({
      id: "l1",
      title: "Elif ile ses çalışması",
      student: { id: "s1", name: "Elif Kaya" },
      date: "2026-08-01",
    });
    expect(masked.title).toBe("E*** ile ses çalışması");
    expect(masked.student?.name).toBe("E*** K***");
    expect(masked.date).toBe("2026-08-01"); // diğer alanlara dokunulmaz
  });

  it("öğrencisiz randevuda çökmez", () => {
    const masked = maskLessonRow({ id: "l2", title: "Boş slot", student: null });
    expect(masked.title).toBe("Boş slot");
    expect(masked.student).toBeNull();
  });
});
