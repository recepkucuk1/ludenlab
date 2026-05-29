"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  PAlert,
  PBadge,
  PButton,
  PCard,
  PField,
  PInput,
  PModal,
  PSelect,
  PSpinner,
  PTextarea,
  toast,
} from "@ludenlab/ui";
import { KADEME, KADEME_KEYS, type Kademe } from "@/lib/bep";

interface CaseRow {
  id: string;
  code: string;
  kademe: string;
  docs: number;
  updatedAt: string;
}

export function CasesManager({ initial }: { initial: CaseRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [kf, setKf] = useState<"all" | Kademe>("all");
  const [sort, setSort] = useState<"recent" | "code" | "docs">("recent");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [kademe, setKademe] = useState<Kademe>("ilkokul_1_4");
  const [notes, setNotes] = useState("");
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
    setCode("");
    setKademe("ilkokul_1_4");
    setNotes("");
    setErr(null);
    setModalOpen(true);
  }
  function openEdit(c: CaseRow) {
    setEditId(c.id);
    setCode(c.code);
    setKademe(c.kademe as Kademe);
    setNotes("");
    setErr(null);
    setModalOpen(true);
  }

  async function save() {
    if (!code.trim()) {
      setErr("Kod/rumuz gerekli.");
      return;
    }
    setSaving(true);
    setErr(null);
    const res = await fetch(editId ? `/api/cases/${editId}` : "/api/cases", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), kademe, notes: notes.trim() || undefined }),
    });
    setSaving(false);
    if (res.ok) {
      setModalOpen(false);
      toast.success(editId ? "Vaka güncellendi" : "Vaka oluşturuldu");
      router.refresh();
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(d.error ?? "Kaydedilemedi.");
    }
  }

  async function del(c: CaseRow) {
    if (!confirm(`"${c.code}" vakası ve tüm taslakları silinsin mi? Bu işlem geri alınamaz.`)) return;
    const res = await fetch(`/api/cases/${c.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Vaka silindi");
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
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", margin: 0 }}>Vakalar</h1>
        <PButton onClick={openCreate}>
          <Plus size={18} aria-hidden /> Yeni vaka
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
          placeholder="Rumuz ara…"
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
          <option value="code">Rumuz (A-Z)</option>
          <option value="docs">En çok taslak</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <PCard>
          <p style={{ margin: 0, color: "var(--poster-ink-2)" }}>
            {initial.length === 0
              ? "Henüz vaka yok. “Yeni vaka” ile başla ya da bir araçtan taslak üretip kaydet."
              : "Filtreyle eşleşen vaka yok."}
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
          {filtered.map((c) => (
            <PCard key={c.id} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Link
                  href={`/vakalarim/${c.id}`}
                  style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--poster-ink)", textDecoration: "none" }}
                >
                  {c.code}
                </Link>
                <PBadge tone="blue">{c.docs} taslak</PBadge>
              </div>
              <span style={{ color: "var(--poster-ink-2)", fontSize: "0.9rem" }}>
                {KADEME[c.kademe as Kademe] ?? c.kademe}
              </span>
              <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.25rem" }}>
                <Link className="p-btn p-btn--ghost p-btn--sm" href={`/vakalarim/${c.id}`}>
                  Aç
                </Link>
                <PButton size="sm" variant="ghost" onClick={() => openEdit(c)} aria-label="Düzenle">
                  <Pencil size={15} aria-hidden />
                </PButton>
                <PButton size="sm" variant="ghost" onClick={() => del(c)} aria-label="Sil">
                  <Trash2 size={15} aria-hidden />
                </PButton>
              </div>
            </PCard>
          ))}
        </section>
      )}

      <PModal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Vakayı düzenle" : "Yeni vaka"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <PField label="Kod / rumuz" hint="Gerçek ad kullanmayın." htmlFor="c-code">
            <PInput id="c-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={40} />
          </PField>
          <PField label="Kademe" htmlFor="c-kademe">
            <PSelect id="c-kademe" value={kademe} onChange={(e) => setKademe(e.target.value as Kademe)}>
              {KADEME_KEYS.map((k) => (
                <option key={k} value={k}>
                  {KADEME[k]}
                </option>
              ))}
            </PSelect>
          </PField>
          {!editId && (
            <PField label="Not" hint="opsiyonel" htmlFor="c-notes">
              <PTextarea id="c-notes" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: "4rem" }} />
            </PField>
          )}
          {err && <PAlert tone="error">{err}</PAlert>}
          <PButton onClick={save} disabled={saving}>
            {saving ? (
              <>
                <PSpinner /> Kaydediliyor…
              </>
            ) : (
              "Kaydet"
            )}
          </PButton>
        </div>
      </PModal>
    </>
  );
}
