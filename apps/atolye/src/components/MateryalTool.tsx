"use client";

import { useState } from "react";
import { PAlert, PButton, PField, PInput, PSection, PSelect, PSpinner } from "@ludenlab/ui";
import {
  OgrenciProfilForm,
  emptyProfil,
  profilPayload,
  type ProfilState,
} from "@/components/OgrenciProfilForm";
import { ToolResult, type ToolResultData } from "@/components/ToolResult";
import { type MateryalInput } from "@/lib/materyal";

export function MateryalTool() {
  const [profil, setProfil] = useState<ProfilState>(emptyProfil);
  const [materyalTuru, setMateryalTuru] =
    useState<MateryalInput["materyalTuru"]>("calisma_yapragi");
  const [konu, setKonu] = useState("");
  const [zorlukVaryanti, setZorlukVaryanti] =
    useState<MateryalInput["zorlukVaryanti"]>("kolay_orta");
  const [cevapAnahtari, setCevapAnahtari] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolResultData | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!profil.rumuz.trim()) return setError("Öğrenci seçin.");
    if (profil.taniProfili.length === 0) return setError("En az bir güçlük alanı seçin.");
    if (!konu.trim()) return setError("Konu/beceri gerekli.");

    setLoading(true);
    setResult(null);
    try {
      const payload = {
        ...profilPayload(profil),
        materyalTuru,
        konu: konu.trim(),
        zorlukVaryanti,
        cevapAnahtari,
      };
      const res = await fetch("/api/materyal", {
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
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
        <PSection title="Öğrenci profili">
          <OgrenciProfilForm value={profil} onChange={setProfil} />
        </PSection>

        <PSection title="Materyal ayarları">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <PField label="Materyal türü" htmlFor="m-tur">
              <PSelect
                id="m-tur"
                value={materyalTuru}
                onChange={(e) => setMateryalTuru(e.target.value as MateryalInput["materyalTuru"])}
              >
                <option value="calisma_yapragi">Çalışma yaprağı</option>
                <option value="etkinlik">Etkinlik</option>
                <option value="okuma_metni">Okuma metni</option>
                <option value="alistirma">Alıştırma</option>
              </PSelect>
            </PField>

            <PField label="Konu / beceri" hint="Çalışılacak konu." htmlFor="m-konu">
              <PInput
                id="m-konu"
                value={konu}
                onChange={(e) => setKonu(e.target.value)}
                placeholder="6'lar çarpım tablosu / b-d ayrımı…"
                maxLength={200}
              />
            </PField>

            <PField label="Zorluk varyantı" htmlFor="m-zorluk">
              <PSelect
                id="m-zorluk"
                value={zorlukVaryanti}
                onChange={(e) => setZorlukVaryanti(e.target.value as MateryalInput["zorlukVaryanti"])}
              >
                <option value="tek">Tek düzey</option>
                <option value="kolay_orta">Kolay + Orta</option>
                <option value="kolay_orta_ileri">Kolay + Orta + İleri</option>
              </PSelect>
            </PField>

            <label
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", fontWeight: 600 }}
            >
              <input
                type="checkbox"
                checked={cevapAnahtari}
                onChange={(e) => setCevapAnahtari(e.target.checked)}
              />
              Cevap anahtarı ekle
            </label>
          </div>
        </PSection>

        {error && <PAlert tone="error">{error}</PAlert>}

        <PButton type="submit" size="lg" disabled={loading}>
          {loading ? (
            <>
              <PSpinner /> Üretiliyor…
            </>
          ) : (
            <>Materyal üret →</>
          )}
        </PButton>
      </form>

      <ToolResult
        result={result}
        loading={loading}
        title="Materyal"
        emptyHint="Soldaki profili ve konuyu girip “Materyal üret” deyin."
        saveType="cok_duyulu_materyal"
        code={profil.rumuz}
        kademe={profil.kademe}
      />
    </div>
  );
}
