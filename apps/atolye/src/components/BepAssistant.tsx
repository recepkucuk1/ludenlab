"use client";

import { useState } from "react";
import {
  PAlert,
  PButton,
  PField,
  PInput,
  PSection,
  PSelect,
  PSpinner,
  PTextarea,
} from "@ludenlab/ui";
import { ALAN, ALAN_KEYS, KADEME, KADEME_KEYS, type Alan, type BepInput } from "@/lib/bep";
import { StudentPicker } from "@/components/StudentPicker";
import { ToolResult, type ToolResultData } from "@/components/ToolResult";

const asKademe = (v: string): BepInput["kademe"] =>
  (KADEME_KEYS as readonly string[]).includes(v) ? (v as BepInput["kademe"]) : "ilkokul_1_4";

export function BepAssistant() {
  const [rumuz, setRumuz] = useState("");
  const [kademe, setKademe] = useState<BepInput["kademe"]>("ilkokul_1_4");
  const [yas, setYas] = useState("");
  const [alanlar, setAlanlar] = useState<Alan[]>(["okuma"]);
  const [gucluYonler, setGucluYonler] = useState("");
  const [guclukAlanlari, setGuclukAlanlari] = useState("");
  const [ekNotlar, setEkNotlar] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolResultData | null>(null);

  function toggleAlan(a: Alan) {
    setAlanlar((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!rumuz.trim()) return setError("Öğrenci seçin.");
    if (alanlar.length === 0) return setError("En az bir çalışma alanı seçin.");
    if (!guclukAlanlari.trim()) return setError("Güçlük alanları / mevcut düzey gerekli.");

    setLoading(true);
    setResult(null);
    try {
      const payload: BepInput = {
        outputType: "bep_hedef",
        rumuz: rumuz.trim(),
        kademe,
        yas: yas ? Number(yas) : undefined,
        alanlar,
        gucluYonler: gucluYonler.trim(),
        guclukAlanlari: guclukAlanlari.trim(),
        ekNotlar: ekNotlar.trim(),
      };
      const res = await fetch("/api/bep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as ToolResultData | { error: string };
      if (!res.ok || "error" in data) {
        setError(("error" in data && data.error) || "Bir hata oluştu.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="poster-tool-grid" style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
      {/* Sol: form */}
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
        <PSection title="Öğrenci profili">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <StudentPicker
              onPick={(s) => {
                setRumuz(s.code);
                setKademe(asKademe(s.kademe));
                if (s.yas != null) setYas(String(s.yas));
                if (s.gucluYonler) setGucluYonler(s.gucluYonler);
              }}
            />

            <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "2fr 1fr" }}>
              <PField label="Kademe" htmlFor="kademe">
                <PSelect
                  id="kademe"
                  value={kademe}
                  onChange={(e) => setKademe(e.target.value as BepInput["kademe"])}
                >
                  {KADEME_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {KADEME[k]}
                    </option>
                  ))}
                </PSelect>
              </PField>
              <PField label="Yaş" hint="opsiyonel" htmlFor="yas">
                <PInput
                  id="yas"
                  type="number"
                  min={3}
                  max={20}
                  value={yas}
                  onChange={(e) => setYas(e.target.value)}
                />
              </PField>
            </div>

            <PField label="Çalışma alan(lar)ı">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {ALAN_KEYS.map((a) => (
                  <label
                    key={a}
                    style={{
                      display: "inline-flex",
                      gap: "0.4rem",
                      alignItems: "center",
                      cursor: "pointer",
                      padding: "0.35rem 0.7rem",
                      border: "var(--poster-border)",
                      borderRadius: "var(--poster-radius-pill)",
                      background: alanlar.includes(a) ? "var(--poster-accent-soft)" : "transparent",
                      fontSize: "0.85rem",
                    }}
                  >
                    <input type="checkbox" checked={alanlar.includes(a)} onChange={() => toggleAlan(a)} />
                    {ALAN[a]}
                  </label>
                ))}
              </div>
            </PField>

            <PField label="Güçlü yönler" hint="opsiyonel ama önerilir" htmlFor="gucluYonler">
              <PTextarea
                id="gucluYonler"
                value={gucluYonler}
                onChange={(e) => setGucluYonler(e.target.value)}
                placeholder="Görsel hafızası güçlü, sözel anlatımı iyi, müziğe ilgili…"
                style={{ minHeight: "4.5rem" }}
              />
            </PField>

            <PField
              label="Güçlük alanları / mevcut düzey"
              hint="Gözlemlerinizi yazın — taslağın temeli budur."
              htmlFor="guclukAlanlari"
            >
              <PTextarea
                id="guclukAlanlari"
                value={guclukAlanlari}
                onChange={(e) => setGuclukAlanlari(e.target.value)}
                placeholder="Hece birleştirmede zorlanıyor, akıcı okuma yaşıtlarının gerisinde, b-d karışıyor…"
              />
            </PField>

            <PField label="Ek notlar" hint="opsiyonel" htmlFor="ekNotlar">
              <PTextarea
                id="ekNotlar"
                value={ekNotlar}
                onChange={(e) => setEkNotlar(e.target.value)}
                style={{ minHeight: "4.5rem" }}
              />
            </PField>
          </div>
        </PSection>

        {error && <PAlert tone="error">{error}</PAlert>}

        <PButton type="submit" size="lg" disabled={loading}>
          {loading ? (
            <>
              <PSpinner /> Üretiliyor…
            </>
          ) : (
            <>Taslak üret →</>
          )}
        </PButton>
      </form>

      {/* Sağ: çıktı (paylaşılan ToolResult — PDF / Kopyala / Öğrenciye ata) */}
      <ToolResult
        result={result}
        loading={loading}
        title="BEP hedef taslağı"
        emptyHint="Soldaki formu doldurup “Taslak üret” deyin. Sonuç burada görünecek."
        saveType="bep_hedef"
        code={rumuz}
        kademe={kademe}
      />
    </div>
  );
}
