"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PAlert, PButton, PCard, PField, PInput, PSpinner } from "@ludenlab/ui";

type Msg = { tone: "success" | "error"; text: string } | null;

export function ProfilForm({ initialName, email }: { initialName: string; email: string }) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [pMsg, setPMsg] = useState<Msg>(null);
  const [pLoading, setPLoading] = useState(false);

  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [sMsg, setSMsg] = useState<Msg>(null);
  const [sLoading, setSLoading] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setPMsg(null);
    setPLoading(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) setPMsg({ tone: "error", text: d.error ?? "Kaydedilemedi." });
      else {
        setPMsg({ tone: "success", text: "Profil güncellendi." });
        router.refresh();
      }
    } catch {
      setPMsg({ tone: "error", text: "Sunucuya ulaşılamadı." });
    }
    setPLoading(false);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setSMsg(null);
    setSLoading(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: cur, next }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) setSMsg({ tone: "error", text: d.error ?? "Değiştirilemedi." });
      else {
        setSMsg({ tone: "success", text: "Şifre değiştirildi." });
        setCur("");
        setNext("");
      }
    } catch {
      setSMsg({ tone: "error", text: "Sunucuya ulaşılamadı." });
    }
    setSLoading(false);
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <PCard>
        <h2 className="p-h3" style={{ margin: "0 0 12px" }}>Profil</h2>
        <form onSubmit={saveProfile} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <PField label="Ad soyad" htmlFor="p-name">
            <PInput id="p-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </PField>
          <PField label="E-posta" hint="giriş kimliğin — değiştirilemez" htmlFor="p-email">
            <PInput id="p-email" value={email} disabled />
          </PField>
          {pMsg && <PAlert tone={pMsg.tone}>{pMsg.text}</PAlert>}
          <div>
            <PButton type="submit" disabled={pLoading || name.trim().length < 2 || name.trim() === initialName.trim()}>
              {pLoading ? (
                <>
                  <PSpinner /> Kaydediliyor…
                </>
              ) : (
                "Kaydet"
              )}
            </PButton>
          </div>
        </form>
      </PCard>

      <PCard>
        <h2 className="p-h3" style={{ margin: "0 0 12px" }}>Şifre</h2>
        <form onSubmit={changePassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <PField label="Mevcut şifre" htmlFor="p-cur">
            <PInput id="p-cur" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required />
          </PField>
          <PField label="Yeni şifre" hint="en az 8 karakter" htmlFor="p-next">
            <PInput id="p-next" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} />
          </PField>
          {sMsg && <PAlert tone={sMsg.tone}>{sMsg.text}</PAlert>}
          <div>
            <PButton type="submit" disabled={sLoading || !cur || next.length < 8}>
              {sLoading ? (
                <>
                  <PSpinner /> Değiştiriliyor…
                </>
              ) : (
                "Şifreyi değiştir"
              )}
            </PButton>
          </div>
        </form>
      </PCard>
    </div>
  );
}
