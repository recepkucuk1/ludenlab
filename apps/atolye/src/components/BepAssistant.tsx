"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  PAlert,
  PBadge,
  PButton,
  PField,
  PInput,
  PSection,
  PSelect,
  PSpinner,
  PTextarea,
  toast,
} from "@ludenlab/ui";
import {
  ALAN,
  ALAN_KEYS,
  KADEME,
  KADEME_KEYS,
  OUTPUT,
  OUTPUT_KEYS,
  TASLAK_NOTU,
  type Alan,
  type BepInput,
  type OutputType,
} from "@/lib/bep";

interface ApiOk {
  text: string;
  credits: number;
  model: string;
}
interface ApiErr {
  error: string;
  issues?: { path: string; message: string }[];
}

export function BepAssistant() {
  const [outputType, setOutputType] = useState<OutputType>("bep_hedef");
  const [rumuz, setRumuz] = useState("");
  const [kademe, setKademe] = useState<BepInput["kademe"]>("ilkokul_1_4");
  const [yas, setYas] = useState("");
  const [alanlar, setAlanlar] = useState<Alan[]>(["okuma"]);
  const [gucluYonler, setGucluYonler] = useState("");
  const [guclukAlanlari, setGuclukAlanlari] = useState("");
  const [olcumVerileri, setOlcumVerileri] = useState("");
  const [donem, setDonem] = useState("");
  const [ekNotlar, setEkNotlar] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiOk | null>(null);
  const [saved, setSaved] = useState(false);

  const isProgress = outputType === "ilerleme_raporu";

  function toggleAlan(a: Alan) {
    setAlanlar((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!rumuz.trim()) return setError("Kod/rumuz gerekli.");
    if (alanlar.length === 0) return setError("En az bir çalışma alanı seçin.");
    if (!guclukAlanlari.trim()) return setError("Güçlük alanları / mevcut düzey gerekli.");

    setLoading(true);
    setResult(null);
    setSaved(false);
    try {
      const payload: BepInput = {
        outputType,
        rumuz: rumuz.trim(),
        kademe,
        yas: yas ? Number(yas) : undefined,
        alanlar,
        gucluYonler: gucluYonler.trim(),
        guclukAlanlari: guclukAlanlari.trim(),
        olcumVerileri: olcumVerileri.trim(),
        donem: donem.trim(),
        ekNotlar: ekNotlar.trim(),
      };
      const res = await fetch("/api/bep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: ApiOk | ApiErr = await res.json();
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

  async function copyResult() {
    if (!result) return;
    await navigator.clipboard.writeText(result.text);
    toast.success("Taslak panoya kopyalandı");
  }

  async function saveToCase() {
    if (!result) return;
    const res = await fetch("/api/cases/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: rumuz.trim(),
        kademe,
        type: outputType,
        content: result.text,
        model: result.model,
        credits: result.credits,
      }),
    });
    if (res.ok) {
      setSaved(true);
      toast.success(`“${rumuz.trim()}” vakasına kaydedildi`);
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(d.error ?? "Kaydedilemedi.");
    }
  }

  return (
    <div className="poster-tool-grid" style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
      {/* Sol: form */}
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
        <PSection title="Çıktı türü">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {OUTPUT_KEYS.map((key) => (
              <label
                key={key}
                style={{
                  display: "flex",
                  gap: "0.6rem",
                  alignItems: "flex-start",
                  cursor: "pointer",
                  padding: "0.6rem 0.75rem",
                  border: "var(--poster-border)",
                  borderRadius: "var(--poster-radius-md)",
                  background: outputType === key ? "var(--poster-accent-soft)" : "transparent",
                }}
              >
                <input
                  type="radio"
                  name="outputType"
                  checked={outputType === key}
                  onChange={() => setOutputType(key)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <strong>{OUTPUT[key].label}</strong>
                  <br />
                  <span style={{ color: "var(--poster-ink-3)", fontSize: "0.85rem" }}>
                    {OUTPUT[key].desc}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </PSection>

        <PSection title="Öğrenci profili">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <PField
              label="Kod / rumuz"
              hint="KVKK gereği gerçek ad kullanmayın (ör. Ö-2024-07)."
              htmlFor="rumuz"
            >
              <PInput
                id="rumuz"
                value={rumuz}
                onChange={(e) => setRumuz(e.target.value)}
                placeholder="Ö-2024-07"
                maxLength={40}
              />
            </PField>

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
                    <input
                      type="checkbox"
                      checked={alanlar.includes(a)}
                      onChange={() => toggleAlan(a)}
                    />
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

            {isProgress && (
              <>
                <PField label="Dönem" hint="opsiyonel" htmlFor="donem">
                  <PInput
                    id="donem"
                    value={donem}
                    onChange={(e) => setDonem(e.target.value)}
                    placeholder="2025–2026 Güz"
                  />
                </PField>
                <PField
                  label="Ölçüm verileri / gözlemler"
                  hint="Sayısal veriler varsa girin; yoksa nitel gözlem yeterli."
                  htmlFor="olcumVerileri"
                >
                  <PTextarea
                    id="olcumVerileri"
                    value={olcumVerileri}
                    onChange={(e) => setOlcumVerileri(e.target.value)}
                    placeholder="Okuma akıcılığı: 38→61 doğru sözcük/dk. Hedef kazanımı: 8/12…"
                  />
                </PField>
              </>
            )}

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

      {/* Sağ: çıktı */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <PAlert tone="warning">
          <strong>Önemli:</strong> Bu araç tıbbi tanı koymaz. Üretilen metin bir <strong>taslaktır</strong>;
          uzman onayı gerektirir.
        </PAlert>

        {!result && !loading && (
          <PSection title="Çıktı">
            <p style={{ color: "var(--poster-ink-3)" }}>
              Soldaki formu doldurup “Taslak üret” deyin. Sonuç burada görünecek.
            </p>
          </PSection>
        )}

        {loading && (
          <PSection title="Çıktı">
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--poster-ink-2)" }}>
              <PSpinner /> Claude taslağı hazırlıyor…
            </div>
          </PSection>
        )}

        {result && (
          <PSection
            title={OUTPUT[outputType].label}
            action={
              <span style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
                <PBadge tone="blue">~{result.credits} kredi</PBadge>
                <PButton size="sm" variant="ghost" onClick={copyResult}>
                  Kopyala
                </PButton>
                <PButton size="sm" onClick={saveToCase} disabled={saved}>
                  {saved ? "Kaydedildi ✓" : "Vakaya kaydet"}
                </PButton>
              </span>
            }
          >
            <div className="md">
              <ReactMarkdown>{result.text}</ReactMarkdown>
            </div>
            <p
              style={{
                marginTop: "1rem",
                paddingTop: "0.75rem",
                borderTop: "var(--poster-border)",
                color: "var(--poster-ink-3)",
                fontSize: "0.8rem",
              }}
            >
              ⚠️ {TASLAK_NOTU}
            </p>
          </PSection>
        )}
      </div>
    </div>
  );
}
