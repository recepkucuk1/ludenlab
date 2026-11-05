"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { PAlert, PBadge, PButton, PField, PSection, PSpinner, PTextarea } from "@ludenlab/ui";
import { HEDEF_DENETIM_GUNLUK, HEDEF_METNI_MAX, type DenetimSonucu } from "@/lib/hedefDenetimi";
import { HedefDenetimSonucu } from "@/components/HedefDenetimSonucu";
import { MebHedefSelect } from "@atolye/components/MebHedefSelect";
import { StudentPicker, type PickedStudent } from "@atolye/components/StudentPicker";
import { emptyMebHedef, mebHedefPayload, type MebHedefState } from "@atolye/lib/meb-hedef";

/* Hedef Denetçisi aracı (spec §6.3): öğrenci seç → hedefi yaz → Denetle → sonuç kartı; metin düzenlenebilir kalır,
   yeniden denetlenir. Kredi düşmez; "Bugün N/10". Tanı profili alanları İSTENMEZ. */

type Yanit = { sonuc: DenetimSonucu; docId: string | null; caseId: string | null; kalan: number };

export function HedefDenetcisiTool() {
  const [ogrenci, setOgrenci] = useState<PickedStudent | null>(null);
  const [hedef, setHedef] = useState("");
  const [meb, setMeb] = useState<MebHedefState>(emptyMebHedef);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yanit, setYanit] = useState<Yanit | null>(null);
  /** Son denetlenen metin + MEB kodu: değişirse kart "bayat" işaretlenir. */
  const [denetlenen, setDenetlenen] = useState<{ hedef: string; meb: string; davranis: string; ogrenciId: string } | null>(null);
  const sonucRef = useRef<HTMLDivElement>(null);
  const [kalan, setKalan] = useState<number | null>(null);

  const sinirDoldu = kalan === 0;
  const bayat = yanit !== null && denetlenen !== null && (
      hedef.trim() !== denetlenen.hedef ||
      meb.hedefKod !== denetlenen.meb ||
      meb.davranisKodlari.join(",") !== denetlenen.davranis ||
      ogrenci?.id !== denetlenen.ogrenciId
    );

  function ogrenciSec(s: PickedStudent) {
    setOgrenci(s);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!ogrenci) return setError("Öğrenci seçin.");
    if (!hedef.trim()) return setError("Hedef metni gerekli.");
    setLoading(true);
    try {
      const res = await fetch("/atolye/api/hedef-denetcisi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rumuz: ogrenci.code,
          kademe: ogrenci.kademe,
          ...(ogrenci.yas ? { yas: ogrenci.yas } : {}),
          hedef: hedef.trim(),
          ...mebHedefPayload(meb),
        }),
      });
      const data = (await res.json().catch(() => null)) as Yanit | { error: string; code?: string } | null;
      if (data === null) {
        setError(`Sunucu hatası (${res.status}). Tekrar deneyin.`);
        return;
      }
      if (!res.ok || "error" in data) {
        if ("code" in data && data.code === "DAILY_CAP") setKalan(0);
        setError(("error" in data && data.error) || "Bir hata oluştu.");
        return;
      }
      setYanit(data);
      setKalan(data.kalan);
      setDenetlenen({ hedef: hedef.trim(), meb: meb.hedefKod, davranis: meb.davranisKodlari.join(","), ogrenciId: ogrenci.id });
      requestAnimationFrame(() => sonucRef.current?.focus());
    } catch {
      setError("Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="poster-tool-grid" style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
        <PSection title="Öğrenci">
          <StudentPicker onPick={ogrenciSec} />
          {ogrenci && (
            <p className="p-small" style={{ margin: "6px 0 0", color: "var(--poster-ink-3)" }}>
              Yalnız ad, kademe ve yaş kullanılır; ad modele rumuzla gider.
            </p>
          )}
        </PSection>

        <PSection title="Hedef">
          <PField label="Yazdığınız hedef" hint="Davranış + ölçüt + koşul + zaman + taban. Denetçi yeniden yazmaz; eksik bileşen için soru sorar." htmlFor="hd-hedef">
            <PTextarea
              id="hd-hedef"
              aria-describedby="hd-hedef-sayac"
              value={hedef}
              onChange={(e) => setHedef(e.target.value)}
              maxLength={HEDEF_METNI_MAX}
              placeholder="Resim desteğiyle iki heceli 10 sözcüğün 8'ini üç ardışık oturumda doğru okur; şu an 10'da 3; dönem sonuna kadar."
              style={{ minHeight: "6rem", fontSize: 16 }}
            />
            <span className="p-hint" id="hd-hedef-sayac">{hedef.length}/{HEDEF_METNI_MAX}</span>
          </PField>
          <MebHedefSelect value={meb} onChange={setMeb} hint="Seçilirse hedefin MEB hedef davranışıyla uyumu da denetlenir (opsiyonel)." oneriler={ogrenci?.mebBolumler ?? []} />
        </PSection>

        {error && <PAlert tone="error">{error}</PAlert>}

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <PButton type="submit" disabled={loading || sinirDoldu}>
            {loading ? (
              <>
                <PSpinner /> Denetleniyor…
              </>
            ) : yanit ? (
              "Yeniden denetle"
            ) : (
              "Denetle"
            )}
          </PButton>
          <span className="p-small" style={{ color: "var(--poster-ink-3)" }}>
            {kalan === null ? `Günde ${HEDEF_DENETIM_GUNLUK} denetim · kredi düşmez` : `Bugün ${HEDEF_DENETIM_GUNLUK - kalan}/${HEDEF_DENETIM_GUNLUK}`}
          </span>
        </div>
      </form>

      <PSection title="Denetim" action={bayat ? <PBadge tone="accent">Girdi değişti; yeniden denetleyin</PBadge> : null}>
        <div ref={sonucRef} tabIndex={-1} role="region" aria-label="Denetim sonucu" aria-busy={loading} style={{ outline: "none" }}>
        {!yanit ? (
          <p className="p-small" style={{ margin: 0, color: "var(--poster-ink-3)" }}>
            Hedefi yazıp &quot;Denetle&quot;ye basın. Beş bileşen işaretlenir, eksikler için size soru sorulur; hedef yeniden yazılmaz.
          </p>
        ) : (
          <div style={{ opacity: bayat ? 0.7 : 1, transition: "opacity .12s" }}>
            <HedefDenetimSonucu sonuc={yanit.sonuc} mebVar={Boolean(denetlenen?.meb)} />
            <p className="p-small" style={{ margin: "10px 0 0", color: "var(--poster-ink-3)" }}>
              {yanit.docId && yanit.caseId ? (
                <>Kütüphaneye kaydedildi · <Link href={`/atolye/vakalarim/${yanit.caseId}`}>öğrenci sayfası</Link></>
              ) : (
                "Sonuç Kütüphaneye kaydedilemedi; yeniden denetlemeyi deneyebilirsiniz."
              )}
            </p>
          </div>
        )}
        </div>
      </PSection>
    </div>
  );
}
