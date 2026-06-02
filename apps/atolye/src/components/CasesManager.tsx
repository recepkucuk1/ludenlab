"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PBadge, PButton, PCard, PModal, toast } from "@ludenlab/ui";
import { KADEME, KADEME_KEYS, type Kademe } from "@/lib/bep";
import {
  GUCLUK_DUZEYI_KEYS,
  TANI_KEYS,
  TANI_LABEL,
  type GuclukDuzeyi,
  type Tani,
} from "@/lib/ogrenci-profili";
import { MEB_MODULLER } from "@/lib/meb-program";
import { OgrenciForm, EMPTY_FORM, type FormState } from "@/components/OgrenciForm";

export interface StudentRow {
  id: string;
  code: string; // Ad Soyad
  kademe: string;
  yas: number | null;
  taniProfili: string[];
  guclukDuzeyi: string | null;
  gucluYonler: string | null;
  ilgiAlanlari: string | null;
  okul: string | null;
  veliIletisim: string | null;
  notes: string | null;
  mebBolumler: string[];
  docs: number;
  updatedAt: string;
}

const asTani = (arr: string[]): Tani[] =>
  arr.filter((t): t is Tani => (TANI_KEYS as readonly string[]).includes(t));
const asDuzey = (v: string | null): GuclukDuzeyi =>
  v && (GUCLUK_DUZEYI_KEYS as readonly string[]).includes(v) ? (v as GuclukDuzeyi) : "orta";
const asKademe = (v: string): Kademe =>
  (KADEME_KEYS as readonly string[]).includes(v) ? (v as Kademe) : "ilkokul_1_4";

/** Bölüm kodlarından (ör. "3.1") kapsanan modül adlarını türetir. */
const modulAdlari = (bolumKodlari: string[]): string[] => {
  const nos = [...new Set(bolumKodlari.map((k) => Number(k.split(".")[0])))]
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  return nos
    .map((no) => MEB_MODULLER.find((m) => m.no === no)?.ad)
    .filter((x): x is string => Boolean(x));
};

const AVATAR = [
  "var(--poster-green)",
  "var(--poster-yellow)",
  "var(--poster-pink)",
  "var(--poster-blue)",
  "var(--poster-accent)",
];
const avatarColor = (id: string) =>
  AVATAR[[...id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR.length];
const initials = (s: string) =>
  s
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function CasesManager({ initial }: { initial: StudentRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [kf, setKf] = useState<"all" | Kademe>("all");
  const [sort, setSort] = useState<"recent" | "code" | "docs">("recent");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = initial;
    if (kf !== "all") list = list.filter((c) => c.kademe === kf);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((c) => c.code.toLowerCase().includes(s));
    return [...list].sort((a, b) =>
      sort === "code"
        ? a.code.localeCompare(b.code, "tr")
        : sort === "docs"
          ? b.docs - a.docs
          : b.updatedAt.localeCompare(a.updatedAt),
    );
  }, [initial, q, kf, sort]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setErr(null);
    setModalOpen(true);
  }
  function openEdit(c: StudentRow) {
    setEditId(c.id);
    setForm({
      code: c.code,
      kademe: asKademe(c.kademe),
      yas: c.yas != null ? String(c.yas) : "",
      taniProfili: asTani(c.taniProfili),
      guclukDuzeyi: asDuzey(c.guclukDuzeyi),
      gucluYonler: c.gucluYonler ?? "",
      ilgiAlanlari: c.ilgiAlanlari ?? "",
      notes: c.notes ?? "",
      mebBolumler: c.mebBolumler ?? [],
    });
    setErr(null);
    setModalOpen(true);
  }

  async function save() {
    if (!form.code.trim()) {
      setErr("Ad Soyad gerekli.");
      return;
    }
    setSaving(true);
    setErr(null);
    const payload = {
      code: form.code.trim(),
      kademe: form.kademe,
      yas: form.yas ? Number(form.yas) : undefined,
      taniProfili: form.taniProfili,
      guclukDuzeyi: form.guclukDuzeyi,
      gucluYonler: form.gucluYonler.trim() || undefined,
      ilgiAlanlari: form.ilgiAlanlari.trim() || undefined,
      notes: form.notes.trim() || undefined,
      mebBolumler: form.mebBolumler,
    };
    const res = await fetch(editId ? `/api/cases/${editId}` : "/api/cases", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      setModalOpen(false);
      toast.success(editId ? "Öğrenci güncellendi" : "Öğrenci eklendi");
      router.refresh();
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(d.error ?? "Kaydedilemedi.");
    }
  }

  async function del(c: StudentRow) {
    if (!confirm(`"${c.code}" öğrencisi ve tüm taslakları silinsin mi? Bu işlem geri alınamaz.`)) return;
    const res = await fetch(`/api/cases/${c.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Öğrenci silindi");
      router.refresh();
    } else {
      toast.error("Silinemedi");
    }
  }

  const pillStyle = (active: boolean) => ({
    padding: "0.35rem 0.8rem",
    border: "var(--poster-border)",
    borderRadius: "var(--poster-radius-pill)",
    background: active ? "var(--poster-accent-soft)" : "transparent",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
  });

  return (
    <>
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
        }}
      >
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: 0 }}>Öğrenciler</h1>
        <PButton onClick={openCreate}>
          <Plus size={18} aria-hidden /> Yeni öğrenci
        </PButton>
      </header>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
          marginBottom: "1.25rem",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          <button type="button" style={pillStyle(kf === "all")} onClick={() => setKf("all")}>
            Tümü
          </button>
          {KADEME_KEYS.map((k) => (
            <button type="button" key={k} style={pillStyle(kf === k)} onClick={() => setKf(k)}>
              {KADEME[k]}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <input
          className="p-input"
          placeholder="Ad ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 200 }}
        />
        <select
          className="p-select"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          style={{ maxWidth: 170 }}
        >
          <option value="recent">En yeni</option>
          <option value="code">Ad (A-Z)</option>
          <option value="docs">En çok taslak</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <PCard>
          <p style={{ margin: 0, color: "var(--poster-ink-2)" }}>
            {initial.length === 0
              ? "Henüz öğrenci yok. “Yeni öğrenci” ile başla; sonra araçlar bu öğrenciyi seçip profili otomatik doldurur."
              : "Filtreyle eşleşen öğrenci yok."}
          </p>
        </PCard>
      ) : (
        <section
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          }}
        >
          {filtered.map((c) => {
            const col = avatarColor(c.id);
            const moduller = modulAdlari(c.mebBolumler);
            return (
              <PCard key={c.id} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                  <span
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 999,
                      flexShrink: 0,
                      background: col,
                      color: col === "var(--poster-yellow)" ? "var(--poster-ink)" : "#fff",
                      border: "var(--poster-border)",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                    aria-hidden
                  >
                    {initials(c.code)}
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <Link
                      href={`/vakalarim/${c.id}`}
                      style={{ fontSize: "1rem", fontWeight: 800, color: "var(--poster-ink)", textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {c.code}
                    </Link>
                    <span style={{ color: "var(--poster-ink-3)", fontSize: "0.8rem" }}>
                      {c.yas ? `${c.yas} yaş · ` : ""}
                      {KADEME[c.kademe as Kademe] ?? c.kademe}
                    </span>
                  </span>
                  <PBadge tone="blue">{c.docs}</PBadge>
                </div>
                {c.taniProfili.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                    {asTani(c.taniProfili).map((t) => (
                      <PBadge key={t} tone="accent">
                        {TANI_LABEL[t].split(" (")[0]}
                      </PBadge>
                    ))}
                  </div>
                )}
                {moduller.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }} title="Çalışılan MEB modülleri">
                    {moduller.map((ad) => (
                      <span
                        key={ad}
                        style={{
                          border: "var(--poster-border)",
                          borderRadius: "var(--poster-radius-pill)",
                          padding: "0.12rem 0.5rem",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          color: "var(--poster-ink-2)",
                          background: "var(--poster-panel)",
                        }}
                      >
                        {ad}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: "0.4rem", marginTop: "auto" }}>
                  <Link className="p-btn p-btn--solid p-btn--sm" href={`/vakalarim/${c.id}`} style={{ flex: 1 }}>
                    Profil →
                  </Link>
                  <PButton size="sm" variant="ghost" onClick={() => openEdit(c)} aria-label="Düzenle">
                    <Pencil size={15} aria-hidden />
                  </PButton>
                  <PButton size="sm" variant="ghost" onClick={() => del(c)} aria-label="Sil">
                    <Trash2 size={15} aria-hidden />
                  </PButton>
                </div>
              </PCard>
            );
          })}
        </section>
      )}

      <PModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Öğrenciyi düzenle" : "Yeni öğrenci"}
        maxWidth={680}
      >
        <OgrenciForm
          value={form}
          onChange={setForm}
          error={err}
          saving={saving}
          onSave={save}
          isEdit={!!editId}
        />
      </PModal>
    </>
  );
}
