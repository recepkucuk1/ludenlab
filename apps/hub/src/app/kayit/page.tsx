"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PAlert, PButton, PCard, PField, PInput, PSpinner } from "@ludenlab/ui";
import { Brand } from "@/components/Brand";

type ModuleKey = "STUDIO" | "ATOLYE";
const MODULES: { key: ModuleKey; title: string; desc: string }[] = [
  { key: "STUDIO", title: "Stüdyo", desc: "Dil-konuşma-işitme (DKT) AI araçları" },
  { key: "ATOLYE", title: "Atölye", desc: "Özgül öğrenme güçlüğü & DEHB araçları" },
];

export default function KayitPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modules, setModules] = useState<Record<ModuleKey, boolean>>({ STUDIO: true, ATOLYE: true });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Geldiğin modüle göre ön-seçim (?module=studio|atolye); yoksa ikisi açık.
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("module")?.toUpperCase();
    if (m === "STUDIO") setModules({ STUDIO: true, ATOLYE: false });
    else if (m === "ATOLYE") setModules({ STUDIO: false, ATOLYE: true });
  }, []);

  const selected = (Object.keys(modules) as ModuleKey[]).filter((k) => modules[k]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (selected.length === 0) {
      setError("En az bir modül seç.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, modules: selected }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Kayıt başarısız.");
        setLoading(false);
        return;
      }
      // Hard gate: doğrulamadan giriş yok → otomatik giriş YOK. "E-postanı kontrol et" ekranına git.
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError("Sunucuya ulaşılamadı.");
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 440, margin: "clamp(2rem, 8vh, 5rem) auto", padding: "0 1rem" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <Brand />
        <span className="p-eyebrow">LUDENLAB HESABI</span>
      </div>

      <PCard>
        <h1 className="p-h3" style={{ margin: "0 0 6px" }}>
          Kayıt ol
        </h1>
        <p className="p-body" style={{ margin: "0 0 1.25rem" }}>
          Tek hesapla LudenLab modülleri (Stüdyo · Atölye). Hangi modül(ler)e üye olacağını seç —
          sonradan diğerini de ekleyebilirsin.
        </p>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <PField label="Ad soyad" htmlFor="k-name">
            <PInput id="k-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </PField>
          <PField label="E-posta" htmlFor="k-email">
            <PInput id="k-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </PField>
          <PField label="Şifre" hint="en az 8 karakter" htmlFor="k-pass">
            <PInput id="k-pass" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </PField>

          <div>
            <span className="p-label" style={{ display: "block", marginBottom: 8 }}>
              Üye olunacak modül(ler)
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {MODULES.map((m) => (
                <label
                  key={m.key}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    cursor: "pointer",
                    padding: "10px 12px",
                    border: `2px solid ${modules[m.key] ? "var(--poster-accent)" : "var(--poster-ink-faint)"}`,
                    borderRadius: 12,
                    background: modules[m.key] ? "var(--poster-accent-soft)" : "transparent",
                    transition: "border-color .12s, background .12s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={modules[m.key]}
                    onChange={(e) => setModules((prev) => ({ ...prev, [m.key]: e.target.checked }))}
                    style={{ marginTop: 3, width: 18, height: 18, accentColor: "var(--poster-accent)" }}
                  />
                  <span>
                    <span style={{ fontWeight: 600, display: "block" }}>{m.title}</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--poster-ink-3)" }}>{m.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && <PAlert tone="error">{error}</PAlert>}
          <PButton type="submit" size="lg" disabled={loading || selected.length === 0}>
            {loading ? (
              <>
                <PSpinner /> Hesap oluşturuluyor…
              </>
            ) : (
              "Kayıt ol"
            )}
          </PButton>
        </form>
        <p style={{ marginTop: "1.25rem", fontSize: "0.9rem", color: "var(--poster-ink-3)" }}>
          Zaten hesabın var mı?{" "}
          <Link href="/giris" className="p-link">
            Giriş yap
          </Link>
        </p>
      </PCard>
    </div>
  );
}
