"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Logo, PButton } from "@ludenlab/ui";
import { AuthShell, AuthInput, AuthLabel, AuthAlert, PasswordMeter, type AuthModule } from "@/components/auth/AuthShell";

type ModuleKey = "STUDIO" | "ATOLYE";
const MODULES: { key: ModuleKey; title: string; desc: string }[] = [
  { key: "STUDIO", title: "Studio", desc: "Dil-konuşma-işitme (DKT) AI araçları" },
  { key: "ATOLYE", title: "Atölye", desc: "Özgül öğrenme güçlüğü & DEHB araçları" },
];

function KayitForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const m = sp.get("module")?.toLowerCase();
  const panelModule: AuthModule = m === "studio" ? "studio" : m === "atolye" ? "atolye" : "generic";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [modules, setModules] = useState<Record<ModuleKey, boolean>>({ STUDIO: true, ATOLYE: true });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [kvkk, setKvkk] = useState(false);

  // Geldiğin modüle göre ön-seçim (?module=studio|atolye); yoksa ikisi açık.
  useEffect(() => {
    if (m === "studio") setModules({ STUDIO: true, ATOLYE: false });
    else if (m === "atolye") setModules({ STUDIO: false, ATOLYE: true });
  }, [m]);

  const selected = (Object.keys(modules) as ModuleKey[]).filter((k) => modules[k]);
  const mismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (selected.length === 0) return setError("En az bir modül seç.");
    if (password.length < 8) return setError("Şifre en az 8 karakter olmalı.");
    if (mismatch) return setError("Şifreler eşleşmiyor.");
    if (!kvkk) return setError("Devam etmek için KVKK Aydınlatma Metni'ni onaylamalısın.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, modules: selected, kvkkAccepted: kvkk }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Kayıt başarısız.");
        setLoading(false);
        return;
      }
      // Hard gate: doğrulamadan giriş yok → "e-postanı kontrol et" ekranına git.
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError("Sunucuya ulaşılamadı.");
      setLoading(false);
    }
  }

  return (
    <AuthShell module={panelModule}>
      <div className="auth-mobile-logo" style={{ justifyContent: "center", marginBottom: 20 }}>
        <Link href="/">
          <Logo height={44} />
        </Link>
      </div>

      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(24px,6vw,30px)", letterSpacing: "-.02em", color: "var(--poster-ink)", margin: 0 }}>
          Kayıt ol
        </h1>
        <p style={{ marginTop: 6, fontSize: 14, color: "var(--poster-ink-2)", lineHeight: 1.5, fontFamily: "var(--font-display)" }}>
          Tek hesapla LudenLab modülleri — hangi modül(ler)e üye olacağını seç, sonradan diğerini de ekleyebilirsin.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <AuthLabel htmlFor="k-name">Ad soyad</AuthLabel>
          <AuthInput id="k-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <AuthLabel htmlFor="k-email">E-posta</AuthLabel>
          <AuthInput id="k-email" type="email" autoComplete="email" placeholder="ad@ornek.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <AuthLabel htmlFor="k-pass">Şifre</AuthLabel>
          <div style={{ position: "relative" }}>
            <AuthInput
              id="k-pass"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="en az 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
              style={{ position: "absolute", right: 2, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "var(--poster-ink-2)", display: "inline-flex", padding: 13 }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <PasswordMeter password={password} />
        </div>
        <div>
          <AuthLabel htmlFor="k-pass2">Şifre (tekrar)</AuthLabel>
          <AuthInput
            id="k-pass2"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="şifreyi tekrar gir"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            invalid={mismatch}
          />
          {mismatch && (
            <p style={{ marginTop: 6, fontSize: 12, color: "#c53030", fontWeight: 600, fontFamily: "var(--font-display)" }}>Şifreler eşleşmiyor</p>
          )}
        </div>

        <div>
          <AuthLabel>Üye olunacak modül(ler)</AuthLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {MODULES.map((mod) => (
              <label
                key={mod.key}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  cursor: "pointer",
                  padding: "10px 12px",
                  border: `2px solid ${modules[mod.key] ? "var(--poster-accent)" : "var(--poster-ink-faint, #e5e0d5)"}`,
                  borderRadius: 12,
                  background: modules[mod.key] ? "var(--poster-accent-soft, #fff1ea)" : "#fff",
                  transition: "border-color .12s, background .12s",
                }}
              >
                <input
                  type="checkbox"
                  checked={modules[mod.key]}
                  onChange={(e) => setModules((prev) => ({ ...prev, [mod.key]: e.target.checked }))}
                  style={{ marginTop: 3, width: 18, height: 18, accentColor: "var(--poster-accent)" }}
                />
                <span style={{ fontFamily: "var(--font-display)" }}>
                  <span style={{ fontWeight: 700, display: "block", color: "var(--poster-ink)" }}>{mod.title}</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--poster-ink-3)" }}>{mod.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontFamily: "var(--font-display)" }}>
          <input
            type="checkbox"
            checked={kvkk}
            onChange={(e) => setKvkk(e.target.checked)}
            aria-label="KVKK Aydınlatma Metni'ni okudum, onaylıyorum"
            style={{ marginTop: 3, width: 18, height: 18, accentColor: "var(--poster-accent)", flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, color: "var(--poster-ink-2)", lineHeight: 1.5 }}>
            <Link href="/kosullar" target="_blank" style={{ fontWeight: 700, color: "var(--poster-accent)" }}>Kullanım Koşulları</Link>,{" "}
            <Link href="/kvkk" target="_blank" style={{ fontWeight: 700, color: "var(--poster-accent)" }}>KVKK Aydınlatma Metni</Link> ve{" "}
            <Link href="/gizlilik" target="_blank" style={{ fontWeight: 700, color: "var(--poster-accent)" }}>Gizlilik Politikası</Link>&apos;nı okudum, onaylıyorum.
          </span>
        </label>

        {error && <AuthAlert tone="error">{error}</AuthAlert>}

        <PButton type="submit" size="lg" disabled={loading || selected.length === 0 || !kvkk} style={{ width: "100%", marginTop: 2 }}>
          {loading ? "Hesap oluşturuluyor…" : "Kayıt ol"}
        </PButton>
      </form>

      <p style={{ textAlign: "center", fontSize: 14, color: "var(--poster-ink-2)", marginTop: 22, fontFamily: "var(--font-display)" }}>
        Zaten hesabın var mı?{" "}
        <Link href="/giris" style={{ fontWeight: 700, color: "var(--poster-accent)" }}>
          Giriş yap
        </Link>
      </p>
    </AuthShell>
  );
}

export default function KayitPage() {
  return (
    <Suspense>
      <KayitForm />
    </Suspense>
  );
}
