"use client";

import { useEffect, useState } from "react";
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
   Üstte ÖĞRENCİ SEÇİCİ: kayıtlı öğrenciden profili otomatik doldurur.
   Kontrollü: `value` + `onChange`. */

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

interface StudentPick {
  id: string;
  code: string; // Ad Soyad
  kademe: string;
  yas: number | null;
  taniProfili: string[];
  guclukDuzeyi: string | null;
  gucluYonler: string | null;
  ilgiAlanlari: string | null;
}

const isKademe = (v: string): v is ProfilState["kademe"] =>
  (KADEME_KEYS as readonly string[]).includes(v);
const isDuzey = (v: string): v is GuclukDuzeyi =>
  (GUCLUK_DUZEYI_KEYS as readonly string[]).includes(v);

export function OgrenciProfilForm({
  value,
  onChange,
}: {
  value: ProfilState;
  onChange: (next: ProfilState) => void;
}) {
  const [students, setStudents] = useState<StudentPick[]>([]);
  const [picked, setPicked] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/cases")
      .then((r) => (r.ok ? r.json() : { students: [] }))
      .then((d: { students?: StudentPick[] }) => {
        if (alive) setStudents(d.students ?? []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

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

  function pickStudent(id: string) {
    setPicked(id);
    if (!id) return; // manuel — mevcut formu koru
    const s = students.find((x) => x.id === id);
    if (!s) return;
    onChange({
      rumuz: s.code,
      kademe: isKademe(s.kademe) ? s.kademe : "ilkokul_1_4",
      yas: s.yas != null ? String(s.yas) : "",
      taniProfili: (s.taniProfili ?? []).filter((t): t is Tani =>
        (TANI_KEYS as readonly string[]).includes(t),
      ),
      guclukDuzeyi: s.guclukDuzeyi && isDuzey(s.guclukDuzeyi) ? s.guclukDuzeyi : "orta",
      gucluYonler: s.gucluYonler ?? "",
      ilgiAlanlari: s.ilgiAlanlari ?? "",
      calisilanKazanim: value.calisilanKazanim, // araç-özgü; öğrenciden gelmez
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <PField label="Öğrenci seç" hint="Araçlar kayıtlı öğrenci üzerinde çalışır.">
        {students.length > 0 ? (
          <PSelect value={picked} onChange={(e) => pickStudent(e.target.value)}>
            <option value="">Öğrenci seçin…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code}
              </option>
            ))}
          </PSelect>
        ) : (
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--poster-ink-2)" }}>
            Henüz öğrenci yok —{" "}
            <a href="/vakalarim" style={{ color: "var(--poster-accent)", fontWeight: 700 }}>
              Öğrenciler
            </a>
            &apos;den ekleyin.
          </p>
        )}
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
