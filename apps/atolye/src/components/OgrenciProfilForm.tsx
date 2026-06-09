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
  /** Öğrenciden gelen çalışılan MEB bölüm kodları — MebHedefSelect önerisi (UI-only). */
  mebBolumler: string[];
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
  mebBolumler: [],
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
  mebBolumler: string[];
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
  const [showDetails, setShowDetails] = useState(false);

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
      mebBolumler: s.mebBolumler ?? [],
    });
    setShowDetails(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
      {/* Öğrenci seçici — kart içinde, eyebrow + tile */}
      <div className="p-card" style={{ padding: "1rem 1.1rem" }}>
        <span className="p-eyebrow">ÖĞRENCİ</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginTop: 10 }}>
          <span
            aria-hidden
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              border: "var(--poster-border)",
              boxShadow: "0 2px 0 var(--poster-ink)",
              background: "var(--poster-bg)",
              display: "grid",
              placeItems: "center",
              fontSize: 24,
              flexShrink: 0,
            }}
          >
            🎒
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
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
                  <a href="/vakalarim" className="p-link">
                    Öğrenciler
                  </a>
                  &apos;den ekleyin.
                </p>
              )}
            </PField>
          </div>
        </div>
      </div>

      {/* Profil alanları veya Özet Kartı */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span className="p-eyebrow">PROFİL ÖZETİ</span>
          {value.rumuz && (
            <button
              type="button"
              className="p-link"
              style={{ fontSize: "0.8rem", cursor: "pointer", border: "none", background: "none", fontWeight: 700 }}
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? "▲ Ayrıntıları Gizle" : "✏️ Profili İncele / Düzenle"}
            </button>
          )}
        </div>

        {/* Özet Kartı */}
        {!showDetails && value.rumuz ? (
          <div className="p-card" style={{ padding: "0.85rem 1.1rem", background: "var(--poster-panel)", borderStyle: "dashed", display: "flex", flexDirection: "column", gap: "0.40rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
              <span className="p-mono" style={{ fontSize: "11px", background: "var(--poster-bg)", padding: "1px 6px", border: "var(--poster-border)", borderRadius: "4px" }}>
                {KADEME[value.kademe] || value.kademe}
              </span>
              {value.yas && (
                <span className="p-mono" style={{ fontSize: "11px", background: "var(--poster-bg)", padding: "1px 6px", border: "var(--poster-border)", borderRadius: "4px" }}>
                  {value.yas} Yaş
                </span>
              )}
              <span className="p-mono" style={{ fontSize: "11px", background: "var(--poster-bg)", padding: "1px 6px", border: "var(--poster-border)", borderRadius: "4px" }}>
                Düzey: {GUCLUK_DUZEYI_LABEL[value.guclukDuzeyi] || value.guclukDuzeyi}
              </span>
            </div>

            {value.taniProfili.length > 0 && (
              <div style={{ fontSize: "11.5px", color: "var(--poster-ink-2)" }}>
                <strong>Güçlükler:</strong> {value.taniProfili.map(t => TANI_LABEL[t]).join(", ")}
              </div>
            )}

            {value.ilgiAlanlari && (
              <div style={{ fontSize: "11.5px", color: "var(--poster-ink-2)" }}>
                <strong>İlgi Alanları:</strong> {value.ilgiAlanlari}
              </div>
            )}

            {value.gucluYonler && (
              <div style={{ fontSize: "11.5px", color: "var(--poster-ink-2)" }}>
                <strong>Güçlü Yönler:</strong> {value.gucluYonler}
              </div>
            )}

            {value.calisilanKazanim && (
              <div style={{ fontSize: "11.5px", color: "var(--poster-ink-2)" }}>
                <strong>Odak Kazanım:</strong> {value.calisilanKazanim}
              </div>
            )}
          </div>
        ) : null}

        {/* Akordeon Form Alanları */}
        {showDetails && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem", marginTop: 8 }}>
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
              <div className="p-chips">
                {TANI_KEYS.map((t) => {
                  const on = value.taniProfili.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      className="p-chip"
                      aria-pressed={on}
                      onClick={() => toggleTani(t)}
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
        )}
      </div>
    </div>
  );
}
