"use client";

import { useEffect, useState } from "react";
import { PAlert, PButton, PField, PInput, PSpinner } from "@ludenlab/ui";

/**
 * Fatura bilgileri formu (Bireysel / Kurumsal) — /api/hesap/fatura-profili GET/PUT.
 * İki yerde kullanılır: checkout (ödeme öncesi zorunlu adım, init 428 dönünce) ve
 * /hesap/profil (sonradan düzenleme). Kaydedince onSaved çağrılır (checkout ödemeye devam eder).
 */

type ProfileDto = {
  type: "INDIVIDUAL" | "CORPORATE";
  fullName: string;
  tckn: string | null;
  companyName: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
} | null;

const EMPTY = {
  type: "INDIVIDUAL" as "INDIVIDUAL" | "CORPORATE",
  fullName: "",
  tckn: "",
  companyName: "",
  taxNumber: "",
  taxOffice: "",
  address: "",
  city: "",
  district: "",
};

export function BillingProfileForm({ onSaved, saveLabel = "Kaydet" }: { onSaved?: () => void; saveLabel?: string }) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let aborted = false;
    fetch("/api/hesap/fatura-profili")
      .then((r) => r.json())
      .then((d: { profile: ProfileDto; suggestedFullName?: string }) => {
        if (aborted) return;
        const p = d.profile;
        setForm(
          p
            ? {
                type: p.type,
                fullName: p.fullName ?? "",
                tckn: p.tckn ?? "",
                companyName: p.companyName ?? "",
                taxNumber: p.taxNumber ?? "",
                taxOffice: p.taxOffice ?? "",
                address: p.address ?? "",
                city: p.city ?? "",
                district: p.district ?? "",
              }
            : { ...EMPTY, fullName: d.suggestedFullName ?? "" },
        );
      })
      .catch(() => {})
      .finally(() => !aborted && setLoading(false));
    return () => {
      aborted = true;
    };
  }, []);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [k]: "" }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    setSaved(false);
    try {
      const res = await fetch("/api/hesap/fatura-profili", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        issues?: Array<{ path: string; message: string }>;
      };
      if (!res.ok || !d.ok) {
        if (d.issues?.length) {
          const fe: Record<string, string> = {};
          for (const i of d.issues) fe[i.path] = i.message;
          setFieldErrors(fe);
        }
        setError(d.error ?? "Kaydedilemedi, tekrar deneyin.");
        return;
      }
      setSaved(true);
      onSaved?.();
    } catch {
      setError("Bağlantı hatası, tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
        <PSpinner />
      </div>
    );
  }

  const corporate = form.type === "CORPORATE";
  const err = (k: string) =>
    fieldErrors[k] ? (
      <span style={{ display: "block", marginTop: 4, fontSize: 12, color: "var(--poster-danger)", fontWeight: 600 }}>
        {fieldErrors[k]}
      </span>
    ) : null;

  return (
    <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Tip seçimi */}
      <div role="radiogroup" aria-label="Fatura tipi" style={{ display: "flex", gap: 8 }}>
        {(
          [
            { key: "INDIVIDUAL", label: "Bireysel" },
            { key: "CORPORATE", label: "Kurumsal / Şahıs şirketi" },
          ] as const
        ).map((t) => {
          const active = form.type === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setForm((f) => ({ ...f, type: t.key }))}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 10,
                border: "2px solid var(--poster-ink)",
                background: active ? "var(--poster-accent)" : "var(--poster-bg)",
                color: active ? "#fff" : "var(--poster-ink)",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: active ? "2px 2px 0 var(--poster-ink)" : "none",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div>
        <PField label={corporate ? "Yetkili adı soyadı" : "Ad soyad"} htmlFor="bp-fullName">
          <PInput id="bp-fullName" value={form.fullName} onChange={set("fullName")} placeholder="Ad Soyad" required />
        </PField>
        {err("fullName")}
      </div>

      {corporate ? (
        <>
          <div>
            <PField label="Ünvan (şirket adı)" htmlFor="bp-companyName">
              <PInput id="bp-companyName" value={form.companyName} onChange={set("companyName")} placeholder="Örn. Ludens Analytics Ltd. Şti." required />
            </PField>
            {err("companyName")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <PField label="VKN / TCKN" htmlFor="bp-taxNumber">
                <PInput id="bp-taxNumber" inputMode="numeric" value={form.taxNumber} onChange={set("taxNumber")} placeholder="10 ya da 11 hane" required />
              </PField>
              {err("taxNumber")}
            </div>
            <div>
              <PField label="Vergi dairesi" htmlFor="bp-taxOffice">
                <PInput id="bp-taxOffice" value={form.taxOffice} onChange={set("taxOffice")} placeholder="Örn. Kadıköy" required />
              </PField>
              {err("taxOffice")}
            </div>
          </div>
        </>
      ) : (
        <div>
          <PField label="TCKN (opsiyonel — faturada görünsün istersen)" htmlFor="bp-tckn">
            <PInput id="bp-tckn" inputMode="numeric" value={form.tckn} onChange={set("tckn")} placeholder="11 hane" />
          </PField>
          {err("tckn")}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <PField label="İl" htmlFor="bp-city">
            <PInput id="bp-city" value={form.city} onChange={set("city")} placeholder="Örn. İstanbul" required />
          </PField>
          {err("city")}
        </div>
        <div>
          <PField label="İlçe" htmlFor="bp-district">
            <PInput id="bp-district" value={form.district} onChange={set("district")} placeholder="Örn. Kadıköy" />
          </PField>
          {err("district")}
        </div>
      </div>

      <div>
        <PField label={corporate ? "Açık adres" : "Açık adres (opsiyonel)"} htmlFor="bp-address">
          <PInput id="bp-address" value={form.address} onChange={set("address")} placeholder="Mahalle, cadde, no…" />
        </PField>
        {err("address")}
      </div>

      {error && <PAlert tone="error">{error}</PAlert>}
      {saved && !onSaved && <PAlert tone="success">Fatura bilgilerin kaydedildi.</PAlert>}

      <PButton type="submit" disabled={saving} style={{ width: "100%" }}>
        {saving ? "Kaydediliyor…" : saveLabel}
      </PButton>
    </form>
  );
}
