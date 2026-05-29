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
import { ALAN, ALAN_KEYS, KADEME, KADEME_KEYS, TASLAK_NOTU, type BepInput } from "@/lib/bep";
import { type SeansInput } from "@/lib/seans";

interface ApiOk {
  text: string;
  credits: number;
}

export function SeansPlaniTool() {
  const [rumuz, setRumuz] = useState("");
  const [kademe, setKademe] = useState<BepInput["kademe"]>("ilkokul_1_4");
  const [alan, setAlan] = useState<SeansInput["alan"]>("okuma");
  const [seansHedefi, setSeansHedefi] = useState("");
  const [sureDk, setSureDk] = useState("40");
  const [ilgiAlanlari, setIlgiAlanlari] = useState("");
  const [sonSeansNotu, setSonSeansNotu] = useState("");
  const [materyalKisiti, setMateryalKisiti] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiOk | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!rumuz.trim()) return setError("Kod/rumuz gerekli.");
    if (!seansHedefi.trim()) return setError("Bu seansın hedefi gerekli.");

    setLoading(true);
    setResult(null);
    try {
      const payload: SeansInput = {
        rumuz: rumuz.trim(),
        kademe,
        alan,
        seansHedefi: seansHedefi.trim(),
        sureDk: Number(sureDk) || 40,
        ilgiAlanlari: ilgiAlanlari.trim(),
        sonSeansNotu: sonSeansNotu.trim(),
        materyalKisiti: materyalKisiti.trim(),
      };
      const res = await fetch("/api/seans-plani", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as ApiOk | { error: string };
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
    toast.success("Plan panoya kopyalandı");
  }

  return (
    <div
      className="poster-tool-grid"
      style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}
    >
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
        <PSection title="Seans bilgisi">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <PField label="Kod / rumuz" hint="Gerçek ad kullanmayın." htmlFor="s-rumuz">
              <PInput
                id="s-rumuz"
                value={rumuz}
                onChange={(e) => setRumuz(e.target.value)}
                placeholder="Ö-2024-07"
                maxLength={40}
              />
            </PField>

            <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "1fr 1fr" }}>
              <PField label="Kademe" htmlFor="s-kademe">
                <PSelect
                  id="s-kademe"
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
              <PField label="Alan" htmlFor="s-alan">
                <PSelect
                  id="s-alan"
                  value={alan}
                  onChange={(e) => setAlan(e.target.value as SeansInput["alan"])}
                >
                  {ALAN_KEYS.map((a) => (
                    <option key={a} value={a}>
                      {ALAN[a]}
                    </option>
                  ))}
                </PSelect>
              </PField>
            </div>

            <PField
              label="Bu seansın hedefi"
              hint="Tek-iki ölçülebilir hedef (genelde BEP'ten gelir)."
              htmlFor="s-hedef"
            >
              <PTextarea
                id="s-hedef"
                value={seansHedefi}
                onChange={(e) => setSeansHedefi(e.target.value)}
                placeholder="b-d ayrımını kinestetik ipucuyla %80 doğrulukla yapar."
                style={{ minHeight: "5rem" }}
              />
            </PField>

            <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "1fr 2fr" }}>
              <PField label="Süre (dk)" htmlFor="s-sure">
                <PInput
                  id="s-sure"
                  type="number"
                  min={15}
                  max={120}
                  value={sureDk}
                  onChange={(e) => setSureDk(e.target.value)}
                />
              </PField>
              <PField label="İlgi alanları" hint="etkinliğe taşınır" htmlFor="s-ilgi">
                <PInput
                  id="s-ilgi"
                  value={ilgiAlanlari}
                  onChange={(e) => setIlgiAlanlari(e.target.value)}
                  placeholder="dinozorlar, futbol, çizgi film…"
                />
              </PField>
            </div>

            <PField label="Son seans notu" hint="opsiyonel" htmlFor="s-son">
              <PTextarea
                id="s-son"
                value={sonSeansNotu}
                onChange={(e) => setSonSeansNotu(e.target.value)}
                style={{ minHeight: "4rem" }}
              />
            </PField>

            <PField label="Materyal kısıtı" hint="opsiyonel" htmlFor="s-mat">
              <PInput
                id="s-mat"
                value={materyalKisiti}
                onChange={(e) => setMateryalKisiti(e.target.value)}
                placeholder="yalnız kâğıt-kalem, kum tepsisi yok…"
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
            <>Seans planı üret →</>
          )}
        </PButton>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <PAlert tone="warning">
          <strong>Önemli:</strong> Plan bir <strong>taslaktır</strong>; uygulanmadan önce uzman
          tarafından gözden geçirilmelidir.
        </PAlert>

        {!result && !loading && (
          <PSection title="Plan">
            <p style={{ color: "var(--poster-ink-3)" }}>
              Soldaki bilgileri girip “Seans planı üret” deyin.
            </p>
          </PSection>
        )}

        {loading && (
          <PSection title="Plan">
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--poster-ink-2)" }}
            >
              <PSpinner /> Claude planı hazırlıyor…
            </div>
          </PSection>
        )}

        {result && (
          <PSection
            title="Seans planı"
            action={
              <span style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
                <PBadge tone="blue">~{result.credits} kredi</PBadge>
                <PButton size="sm" variant="ghost" onClick={copyResult}>
                  Kopyala
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
