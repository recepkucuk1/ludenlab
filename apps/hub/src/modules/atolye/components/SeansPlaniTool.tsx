"use client";

import { useState } from "react";
import { PAlert, PButton, PField, PInput, PSection, PSelect, PSpinner, PTextarea } from "@ludenlab/ui";
import { ALAN, ALAN_KEYS, KADEME, KADEME_KEYS, type BepInput } from "@atolye/lib/bep";
import { type SeansInput } from "@atolye/lib/seans";
import { StudentPicker } from "@atolye/components/StudentPicker";
import { MebHedefSelect } from "@atolye/components/MebHedefSelect";
import { emptyMebHedef, mebHedefPayload, type MebHedefState } from "@atolye/lib/meb-hedef";
import { ToolResult, type ToolResultData } from "@atolye/components/ToolResult";

const asKademe = (v: string): BepInput["kademe"] =>
  (KADEME_KEYS as readonly string[]).includes(v) ? (v as BepInput["kademe"]) : "ilkokul_1_4";

const tileStyle: React.CSSProperties = {
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
};

export function SeansPlaniTool() {
  const [rumuz, setRumuz] = useState("");
  const [kademe, setKademe] = useState<BepInput["kademe"]>("ilkokul_1_4");
  const [alan, setAlan] = useState<SeansInput["alan"]>("okuma");
  const [seansHedefi, setSeansHedefi] = useState("");
  const [sureDk, setSureDk] = useState("40");
  const [ilgiAlanlari, setIlgiAlanlari] = useState("");
  const [sonSeansNotu, setSonSeansNotu] = useState("");
  const [materyalKisiti, setMateryalKisiti] = useState("");
  const [meb, setMeb] = useState<MebHedefState>(emptyMebHedef);
  const [oneriler, setOneriler] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolResultData | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!rumuz.trim()) return setError("Öğrenci seçin.");
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
        ...mebHedefPayload(meb),
      };
      const res = await fetch("/api/seans-plani", {
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
    <div
      className="poster-tool-grid"
      style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}
    >
      {/* Sol: form */}
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
        <div>
          <span className="p-eyebrow">SEANS PLANI</span>
          <h2 className="p-h3" style={{ margin: "6px 0 0" }}>
            Bugünün seansını tasarlayın
          </h2>
        </div>

        <PSection
          title="Seans bilgisi"
          icon={
            <span style={tileStyle} aria-hidden>
              🗓️
            </span>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <StudentPicker
              onPick={(s) => {
                setRumuz(s.code);
                setKademe(asKademe(s.kademe));
                if (s.ilgiAlanlari) setIlgiAlanlari(s.ilgiAlanlari);
                setOneriler(s.mebBolumler ?? []);
              }}
            />

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

        <MebHedefSelect value={meb} onChange={setMeb} oneriler={oneriler} />

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

      {/* Sağ: çıktı (paylaşılan ToolResult — PDF / Kopyala / Öğrenciye ata) */}
      <ToolResult
        result={result}
        loading={loading}
        title="Seans planı"
        emptyHint="Soldaki bilgileri girip “Seans planı üret” deyin."
        saveType="seans_plani"
        code={rumuz}
        kademe={kademe}
        mebHedef={mebHedefPayload(meb)}
      />
    </div>
  );
}
