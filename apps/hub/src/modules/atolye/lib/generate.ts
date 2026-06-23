import { estimateCredits, type RunPromptResult } from "@ludenlab/ai";
import { withCredits } from "./credits";
import { saveDocument } from "./cases";

/* Araç üretimi + otomatik kalıcılık (Studio paritesi).

   Studio'da her üretim, kredi düşümüyle aynı akışta Card olarak KAYDEDİLİR; çıktı
   anında Kütüphane'ye ve (öğrenci seçiliyse) öğrencinin sayfasına düşer. Atölye'de
   veri yapısı zaten aynı (Case ← GeneratedDocument; Kütüphane = tüm dökümanlar),
   tek eksik üretimde otomatik kayıttı — bu yardımcı onu kapatır.

   Tüm araç şemaları ogrenciProfiliSchema (rumuz+kademe) ve mebHedefFields içerir;
   bu yüzden `parsed.data` güvenle bu girdiyi karşılar. */

/** Üretim girdisinden kalıcılık için gereken ortak alanlar. */
export interface ToolPersistInput {
  rumuz: string;
  kademe: string;
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}

export type RunToolResult =
  | {
      ok: true;
      data: {
        text: string;
        model: string;
        credits: number;
        creditsLeft: number;
        /** Kayıt başarılıysa öğrenci (Case) kimliği — istemci öğrenci sayfasına link verir. */
        caseId: string | null;
        docId: string | null;
      };
    }
  | { ok: false; status: number; error: string };

/** Üret → krediyi düş → çıktıyı öğrenciye KALICI kaydet (Kütüphane + öğrenci sayfası).
    Kayıt best-effort: olası DB hatası üretilen metni/krediyi kaybettirmez (caseId=null
    döner; istemci elle "Öğrenciye ata" fallback'ini gösterir). */
export async function runTool(
  accountId: string,
  opts: {
    input: ToolPersistInput;
    /** Döküman türü (doc-types) — araç başına sabit; bkz. ToolResult saveType. */
    type: string;
    generate: () => Promise<RunPromptResult>;
  },
): Promise<RunToolResult> {
  const charged = await withCredits(accountId, opts.generate);
  if (!charged.ok) return { ok: false, status: charged.status, error: charged.error };

  const { result, balance } = charged;
  const credits = estimateCredits(result.model, result.usage);

  // Otomatik kalıcılık — öğrenciyi adıyla (code) bul-veya-oluştur, taslağı ona ata.
  let caseId: string | null = null;
  let docId: string | null = null;
  try {
    const saved = await saveDocument(accountId, {
      code: opts.input.rumuz,
      kademe: opts.input.kademe,
      type: opts.type,
      content: result.text,
      model: result.model,
      credits,
      mebHedefKod: opts.input.mebHedefKod,
      mebDavranisKodlari: opts.input.mebDavranisKodlari ?? [],
    });
    caseId = saved.caseId;
    docId = saved.docId;
  } catch (err) {
    // best-effort: metni yine döndür; istemci elle kaydetme fallback'i sunar.
    console.error("[atolye/runTool] otomatik kayıt başarısız", err);
  }

  return {
    ok: true,
    data: { text: result.text, model: result.model, credits, creditsLeft: balance, caseId, docId },
  };
}
