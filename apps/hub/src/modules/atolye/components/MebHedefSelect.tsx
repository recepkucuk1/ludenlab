"use client";

import { useMemo, useState } from "react";
import { PField, PSelect } from "@ludenlab/ui";
import { MEB_MODULLER, mebBolum, mebHedef } from "@atolye/lib/meb-program";
import { type MebHedefState } from "@atolye/lib/meb-hedef";

/* MEB hedef seçici — Modül → Bölüm → Hedef cascading + Hedef Davranış checklist.
   Modül 5 (Matematik) hedeflerinde Düzey 1–4 filtresi gösterilir.
   Kontrollü: `value` + `onChange`. Veriyi meb-program.ts'ten okur. */

export function MebHedefSelect({
  value,
  onChange,
  hint = "Aracı resmî MEB hedefine demirler (opsiyonel).",
  oneriler = [],
}: {
  value: MebHedefState;
  onChange: (next: MebHedefState) => void;
  hint?: string;
  /** Öğrenci profilinden gelen önerilen bölüm kodları — öne çıkarılır. */
  oneriler?: string[];
}) {
  const [duzeyFiltre, setDuzeyFiltre] = useState("");

  const onerilenBolumler = useMemo(
    () =>
      oneriler
        .map((k) => mebBolum(k))
        .filter((b): b is NonNullable<ReturnType<typeof mebBolum>> => Boolean(b)),
    [oneriler],
  );
  const onerilenModulSet = useMemo(
    () => new Set(onerilenBolumler.map((b) => b.kod.split(".")[0])),
    [onerilenBolumler],
  );
  const onerilenBolumSet = useMemo(
    () => new Set(onerilenBolumler.map((b) => b.kod)),
    [onerilenBolumler],
  );

  const modul = useMemo(
    () => MEB_MODULLER.find((m) => String(m.no) === value.modulNo),
    [value.modulNo],
  );
  const bolum = value.bolumKod ? mebBolum(value.bolumKod) : undefined;
  const hedef = value.hedefKod ? mebHedef(value.hedefKod) : undefined;
  const hasDuzey = !!hedef?.hedefDavranislar.some((d) => d.duzey);

  const davranislar = useMemo(() => {
    if (!hedef) return [];
    if (!duzeyFiltre) return hedef.hedefDavranislar;
    return hedef.hedefDavranislar.filter((d) => String(d.duzey ?? "") === duzeyFiltre);
  }, [hedef, duzeyFiltre]);

  function setModul(no: string) {
    onChange({ modulNo: no, bolumKod: "", hedefKod: "", davranisKodlari: [] });
    setDuzeyFiltre("");
  }
  function setBolum(kod: string) {
    onChange({ ...value, bolumKod: kod, hedefKod: "", davranisKodlari: [] });
    setDuzeyFiltre("");
  }
  function setHedef(kod: string) {
    onChange({ ...value, hedefKod: kod, davranisKodlari: [] });
    setDuzeyFiltre("");
  }
  function toggleDavranis(kod: string) {
    const on = value.davranisKodlari.includes(kod);
    onChange({
      ...value,
      davranisKodlari: on
        ? value.davranisKodlari.filter((k) => k !== kod)
        : [...value.davranisKodlari, kod],
    });
  }
  function pickOneri(bolumKod: string) {
    onChange({ modulNo: bolumKod.split(".")[0], bolumKod, hedefKod: "", davranisKodlari: [] });
    setDuzeyFiltre("");
  }

  return (
    <div className="p-card" style={{ padding: "1rem 1.1rem" }}>
      <span className="p-eyebrow">MEB HEDEFİ</span>
      <p className="p-small" style={{ margin: "6px 0 12px", color: "var(--poster-ink-2)" }}>
        {hint}
      </p>

      {onerilenBolumler.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <span
            className="p-small"
            style={{ fontWeight: 700, color: "var(--poster-ink-2)", display: "block", marginBottom: 6 }}
          >
            ⭐ Öğrenci için önerilenler — tıklayıp doğrudan seçin
          </span>
          <div className="p-chips">
            {onerilenBolumler.map((b) => (
              <button
                key={b.kod}
                type="button"
                className="p-chip"
                aria-pressed={value.bolumKod === b.kod}
                onClick={() => pickOneri(b.kod)}
                title={b.kod}
              >
                {b.ad}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <PField label="Modül" htmlFor="meb-modul">
          <PSelect id="meb-modul" value={value.modulNo} onChange={(e) => setModul(e.target.value)}>
            <option value="">Modül seçin…</option>
            {MEB_MODULLER.map((m) => (
              <option key={m.no} value={String(m.no)}>
                {onerilenModulSet.has(String(m.no)) ? "⭐ " : ""}
                {m.no}. {m.ad}
              </option>
            ))}
          </PSelect>
        </PField>

        <PField label="Bölüm" htmlFor="meb-bolum">
          <PSelect
            id="meb-bolum"
            value={value.bolumKod}
            disabled={!modul}
            onChange={(e) => setBolum(e.target.value)}
          >
            <option value="">{modul ? "Bölüm seçin…" : "Önce modül seçin"}</option>
            {modul?.bolumler.map((b) => (
              <option key={b.kod} value={b.kod}>
                {onerilenBolumSet.has(b.kod) ? "⭐ " : ""}
                {b.kod} {b.ad}
              </option>
            ))}
          </PSelect>
        </PField>

        <PField label="Hedef" htmlFor="meb-hedef">
          <PSelect
            id="meb-hedef"
            value={value.hedefKod}
            disabled={!bolum}
            onChange={(e) => setHedef(e.target.value)}
          >
            <option value="">{bolum ? "Hedef seçin…" : "Önce bölüm seçin"}</option>
            {bolum?.hedefler.map((h) => (
              <option key={h.kod} value={h.kod}>
                {h.kod} {h.metin}
              </option>
            ))}
          </PSelect>
        </PField>

        {hedef && (
          <PField
            label="Hedef davranışlar"
            hint={`Odaklanılacakları işaretleyin — boş bırakırsanız hedefin tümü kullanılır.${
              value.davranisKodlari.length ? ` (${value.davranisKodlari.length} seçili)` : ""
            }`}
          >
            {hasDuzey && (
              <PSelect
                value={duzeyFiltre}
                onChange={(e) => setDuzeyFiltre(e.target.value)}
                style={{ marginBottom: 10, maxWidth: 220 }}
              >
                <option value="">Tüm düzeyler</option>
                <option value="1">Düzey 1</option>
                <option value="2">Düzey 2</option>
                <option value="3">Düzey 3</option>
                <option value="4">Düzey 4</option>
              </PSelect>
            )}
            <div className="p-chips">
              {davranislar.map((d) => {
                const on = value.davranisKodlari.includes(d.kod);
                return (
                  <button
                    key={d.kod}
                    type="button"
                    className="p-chip"
                    aria-pressed={on}
                    onClick={() => toggleDavranis(d.kod)}
                    title={d.kod}
                  >
                    {d.kod}
                    {d.duzey ? ` · D${d.duzey}` : ""} — {d.metin}
                  </button>
                );
              })}
            </div>
          </PField>
        )}
      </div>
    </div>
  );
}
