"use client";

import { PAlert, PButton, PField, PInput, PSection, PSelect, PSpinner, PTextarea } from "@ludenlab/ui";
import { KADEME, KADEME_KEYS, type Kademe } from "@/lib/bep";
import {
  GUCLUK_DUZEYI_KEYS,
  GUCLUK_DUZEYI_LABEL,
  TANI_KEYS,
  TANI_LABEL,
  type GuclukDuzeyi,
  type Tani,
} from "@/lib/ogrenci-profili";
import { MebModulSecici } from "@/components/MebModulSecici";

/* Yeni/Düzenle öğrenci formu — bölümlü container (PSection'lar).
   CasesManager modal'ı bunu render eder; durum + kaydetme dışarıda (kontrollü). */

export interface FormState {
  code: string; // Ad Soyad
  kademe: Kademe;
  yas: string;
  taniProfili: Tani[];
  guclukDuzeyi: GuclukDuzeyi;
  gucluYonler: string;
  ilgiAlanlari: string;
  notes: string;
  mebBolumler: string[];
}

export const EMPTY_FORM: FormState = {
  code: "",
  kademe: "ilkokul_1_4",
  yas: "",
  taniProfili: [],
  guclukDuzeyi: "orta",
  gucluYonler: "",
  ilgiAlanlari: "",
  notes: "",
  mebBolumler: [],
};

const chip = (on: boolean): React.CSSProperties => ({
  border: "var(--poster-border)",
  borderRadius: "var(--poster-radius-pill)",
  padding: "0.3rem 0.65rem",
  fontSize: "0.78rem",
  fontWeight: 700,
  cursor: "pointer",
  background: on ? "var(--poster-accent)" : "var(--poster-panel)",
  color: on ? "#fff" : "var(--poster-ink)",
});

export function OgrenciForm({
  value,
  onChange,
  error,
  saving,
  onSave,
  isEdit,
}: {
  value: FormState;
  onChange: (next: FormState) => void;
  error: string | null;
  saving: boolean;
  onSave: () => void;
  isEdit: boolean;
}) {
  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    onChange({ ...value, [k]: v });
  }
  function toggleTani(t: Tani) {
    set(
      "taniProfili",
      value.taniProfili.includes(t)
        ? value.taniProfili.filter((x) => x !== t)
        : [...value.taniProfili, t],
    );
  }

  return (
    <div style={{ maxHeight: "72vh", overflowY: "auto", paddingRight: "0.3rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <PSection title="Kimlik & Kademe">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <PField label="Ad Soyad" hint="Öğrencinin adı soyadı." htmlFor="s-code">
            <PInput
              id="s-code"
              value={value.code}
              onChange={(e) => set("code", e.target.value)}
              maxLength={120}
              placeholder="Ali Yılmaz"
            />
          </PField>
          <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "2fr 1fr" }}>
            <PField label="Kademe" htmlFor="s-kademe">
              <PSelect
                id="s-kademe"
                value={value.kademe}
                onChange={(e) => set("kademe", e.target.value as Kademe)}
              >
                {KADEME_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {KADEME[k]}
                  </option>
                ))}
              </PSelect>
            </PField>
            <PField label="Yaş" hint="ops." htmlFor="s-yas">
              <PInput
                id="s-yas"
                type="number"
                min={3}
                max={22}
                value={value.yas}
                onChange={(e) => set("yas", e.target.value)}
              />
            </PField>
          </div>
        </div>
      </PSection>

      <PSection title="Güçlük Profili">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <PField label="Güçlük profili" hint="Birden çok seçebilirsiniz.">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {TANI_KEYS.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={value.taniProfili.includes(t)}
                  style={chip(value.taniProfili.includes(t))}
                  onClick={() => toggleTani(t)}
                >
                  {TANI_LABEL[t]}
                </button>
              ))}
            </div>
          </PField>
          <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "1fr 2fr" }}>
            <PField label="Güçlük düzeyi" htmlFor="s-duzey">
              <PSelect
                id="s-duzey"
                value={value.guclukDuzeyi}
                onChange={(e) => set("guclukDuzeyi", e.target.value as GuclukDuzeyi)}
              >
                {GUCLUK_DUZEYI_KEYS.map((d) => (
                  <option key={d} value={d}>
                    {GUCLUK_DUZEYI_LABEL[d]}
                  </option>
                ))}
              </PSelect>
            </PField>
            <PField label="İlgi alanları" hint="etkinliklere taşınır" htmlFor="s-ilgi">
              <PInput
                id="s-ilgi"
                value={value.ilgiAlanlari}
                onChange={(e) => set("ilgiAlanlari", e.target.value)}
                placeholder="dinozorlar, futbol…"
              />
            </PField>
          </div>
          <PField label="Güçlü yönler" hint="ops." htmlFor="s-guclu">
            <PTextarea
              id="s-guclu"
              value={value.gucluYonler}
              onChange={(e) => set("gucluYonler", e.target.value)}
              style={{ minHeight: "3.5rem" }}
            />
          </PField>
        </div>
      </PSection>

      <PSection title="MEB Modülleri">
        <p className="p-small" style={{ margin: "0 0 10px", color: "var(--poster-ink-2)" }}>
          Öğrencinin üzerinde çalıştığı modül ve bölümleri işaretleyin (opsiyonel). Araçlarda hedef
          seçerken yol gösterir.
        </p>
        <MebModulSecici value={value.mebBolumler} onChange={(v) => set("mebBolumler", v)} />
      </PSection>

      <PField label="Not" hint="opsiyonel — kısa eğitsel gözlem" htmlFor="s-notes">
        <PTextarea
          id="s-notes"
          value={value.notes}
          onChange={(e) => set("notes", e.target.value)}
          style={{ minHeight: "5rem" }}
        />
      </PField>

      {error && <PAlert tone="error">{error}</PAlert>}
        <PButton onClick={onSave} disabled={saving}>
          {saving ? (
            <>
              <PSpinner /> Kaydediliyor…
            </>
          ) : isEdit ? (
            "Güncelle"
          ) : (
            "Kaydet"
          )}
        </PButton>
      </div>
    </div>
  );
}
