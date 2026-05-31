"use client";

import { PField, PInput, PSelect, PTextarea } from "@ludenlab/ui";
import { KADEME, KADEME_KEYS } from "@/lib/bep";
import {
  GUCLUK_DUZEYI_KEYS,
  GUCLUK_DUZEYI_LABEL,
  TANI_KEYS,
  TANI_LABEL,
  type GuclukDuzeyi,
  type Tani,
} from "@/lib/ogrenci-profili";

/* Tüm araçların sol kolonunda kullanılan paylaşılan profil alt-formu.
   Kontrollü: `value` + `onChange`. Araç-özgü alanlar bu formun ALTINA eklenir. */

export interface ProfilState {
  rumuz: string;
  kademe: (typeof KADEME_KEYS)[number];
  yas: string;
  taniProfili: Tani[];
  guclukDuzeyi: GuclukDuzeyi;
  gucluYonler: string;
  ilgiAlanlari: string;
  calisilanKazanim: string;
}

export const emptyProfil: ProfilState = {
  rumuz: "",
  kademe: "ilkokul_1_4",
  yas: "",
  taniProfili: [],
  guclukDuzeyi: "orta",
  gucluYonler: "",
  ilgiAlanlari: "",
  calisilanKazanim: "",
};

/** Form state → API payload (OgrenciProfili şekli). Trim + boş→undefined. */
export function profilPayload(p: ProfilState) {
  return {
    rumuz: p.rumuz.trim(),
    kademe: p.kademe,
    yas: p.yas ? Number(p.yas) : undefined,
    taniProfili: p.taniProfili,
    guclukDuzeyi: p.guclukDuzeyi,
    gucluYonler: p.gucluYonler.trim() || undefined,
    ilgiAlanlari: p.ilgiAlanlari.trim() || undefined,
    calisilanKazanim: p.calisilanKazanim.trim() || undefined,
  };
}

export function OgrenciProfilForm({
  value,
  onChange,
}: {
  value: ProfilState;
  onChange: (next: ProfilState) => void;
}) {
  function set<K extends keyof ProfilState>(key: K, v: ProfilState[K]) {
    onChange({ ...value, [key]: v });
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
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <PField label="Kod / rumuz" hint="Gerçek ad kullanmayın (KVKK)." htmlFor="p-rumuz">
        <PInput
          id="p-rumuz"
          value={value.rumuz}
          onChange={(e) => set("rumuz", e.target.value)}
          placeholder="Ö-2024-07"
          maxLength={40}
        />
      </PField>

      <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "2fr 1fr" }}>
        <PField label="Kademe" htmlFor="p-kademe">
          <PSelect
            id="p-kademe"
            value={value.kademe}
            onChange={(e) => set("kademe", e.target.value as ProfilState["kademe"])}
          >
            {KADEME_KEYS.map((k) => (
              <option key={k} value={k}>
                {KADEME[k]}
              </option>
            ))}
          </PSelect>
        </PField>
        <PField label="Yaş" hint="opsiyonel" htmlFor="p-yas">
          <PInput
            id="p-yas"
            type="number"
            min={3}
            max={22}
            value={value.yas}
            onChange={(e) => set("yas", e.target.value)}
          />
        </PField>
      </div>

      <PField label="Güçlük profili" hint="Eştanı yaygın — birden çok seçebilirsiniz.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {TANI_KEYS.map((t) => {
            const on = value.taniProfili.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTani(t)}
                aria-pressed={on}
                style={{
                  border: "var(--poster-border)",
                  borderRadius: "var(--poster-radius-pill)",
                  padding: "0.35rem 0.7rem",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: on ? "var(--poster-accent)" : "var(--poster-panel)",
                  color: on ? "#fff" : "var(--poster-ink)",
                  boxShadow: on ? "var(--poster-shadow-sm)" : "none",
                }}
              >
                {TANI_LABEL[t]}
              </button>
            );
          })}
        </div>
      </PField>

      <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "1fr 2fr" }}>
        <PField label="Güçlük düzeyi" htmlFor="p-duzey">
          <PSelect
            id="p-duzey"
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
        <PField label="İlgi alanları" hint="etkinliklere taşınır (ops.)" htmlFor="p-ilgi">
          <PInput
            id="p-ilgi"
            value={value.ilgiAlanlari}
            onChange={(e) => set("ilgiAlanlari", e.target.value)}
            placeholder="dinozorlar, futbol, çizgi film…"
          />
        </PField>
      </div>

      <PField label="Güçlü yönler" hint="opsiyonel" htmlFor="p-guclu">
        <PTextarea
          id="p-guclu"
          value={value.gucluYonler}
          onChange={(e) => set("gucluYonler", e.target.value)}
          style={{ minHeight: "3.5rem" }}
        />
      </PField>

      <PField label="Çalışılan kazanım" hint="opsiyonel — varsa odak kazanım" htmlFor="p-kazanim">
        <PTextarea
          id="p-kazanim"
          value={value.calisilanKazanim}
          onChange={(e) => set("calisilanKazanim", e.target.value)}
          style={{ minHeight: "3.5rem" }}
        />
      </PField>
    </div>
  );
}
