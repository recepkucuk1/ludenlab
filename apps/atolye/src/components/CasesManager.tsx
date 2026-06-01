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
import {
  GUCLUK_DUZEYI_KEYS,
  GUCLUK_DUZEYI_LABEL,
  TANI_KEYS,
  TANI_LABEL,
  type GuclukDuzeyi,
  type Tani,
} from "@/lib/ogrenci-profili";

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
  docs: number;
  updatedAt: string;
}

interface FormState {
  code: string; // Ad Soyad
  kademe: Kademe;
  yas: string;
  taniProfili: Tani[];
  guclukDuzeyi: GuclukDuzeyi;
  gucluYonler: string;
  ilgiAlanlari: string;
  okul: string;
  veliIletisim: string;
  notes: string;
}

const EMPTY: FormState = {
  code: "",
  kademe: "ilkokul_1_4",
  yas: "",
  taniProfili: [],
  guclukDuzeyi: "orta",
  gucluYonler: "",
  ilgiAlanlari: "",
  okul: "",
  veliIletisim: "",
  notes: "",
};

const asTani = (arr: string[]): Tani[] =>
  arr.filter((t): t is Tani => (TANI_KEYS as readonly string[]).includes(t));
const asDuzey = (v: string | null): GuclukDuzeyi =>
  v && (GUCLUK_DUZEYI_KEYS as readonly string[]).includes(v) ? (v as GuclukDuzeyi) : "orta";
const asKademe = (v: string): Kademe =>
  (KADEME_KEYS as readonly string[]).includes(v) ? (v as Kademe) : "ilkokul_1_4";

export function CasesManager({ initial }: { initial: StudentRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [kf, setKf] = useState<"all" | Kademe>("all");
  const [sort, setSort] = useState<"recent" | "code" | "docs">("recent");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setF<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function toggleTani(t: Tani) {
    setForm((f) => ({
      ...f,
      taniProfili: f.taniProfili.includes(t)
        ? f.taniProfili.filter((x) => x !== t)
        : [...f.taniProfili, t],
    }));
  }

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
    setForm(EMPTY);
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
      okul: c.okul ?? "",
      veliIletisim: c.veliIletisim ?? "",
      notes: c.notes ?? "",
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
      okul: form.okul.trim() || undefined,
      veliIletisim: form.veliIletisim.trim() || undefined,
      notes: form.notes.trim() || undefined,
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
  const chipStyle = (on: boolean) => ({
    border: "var(--poster-border)",
    borderRadius: "var(--poster-radius-pill)",
    padding: "0.3rem 0.65rem",
    fontSize: "0.78rem",
    fontWeight: 700,
    cursor: "pointer",
    background: on ? "var(--poster-accent)" : "var(--poster-panel)",
    color: on ? "#fff" : "var(--poster-ink)",
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
          {filtered.map((c) => (
            <PCard key={c.id} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                <Link
                  href={`/vakalarim/${c.id}`}
                  style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--poster-ink)", textDecoration: "none", minWidth: 0 }}
                >
                  {c.code}
                </Link>
                <PBadge tone="blue">{c.docs} taslak</PBadge>
              </div>
              <span style={{ color: "var(--poster-ink-2)", fontSize: "0.85rem" }}>
                {KADEME[c.kademe as Kademe] ?? c.kademe}
              </span>
              {c.taniProfili.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                  {asTani(c.taniProfili).map((t) => (
                    <PBadge key={t} tone="accent">
                      {TANI_LABEL[t].split(" (")[0]}
                    </PBadge>
                  ))}
                </div>
              )}
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

      <PModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Öğrenciyi düzenle" : "Yeni öğrenci"}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.9rem",
            maxHeight: "70vh",
            overflowY: "auto",
            paddingRight: "0.25rem",
          }}
        >
          <PField label="Ad Soyad" hint="Öğrencinin adı soyadı." htmlFor="s-code">
            <PInput id="s-code" value={form.code} onChange={(e) => setF("code", e.target.value)} maxLength={120} placeholder="Ali Yılmaz" />
          </PField>

          <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "2fr 1fr" }}>
            <PField label="Kademe" htmlFor="s-kademe">
              <PSelect id="s-kademe" value={form.kademe} onChange={(e) => setF("kademe", e.target.value as Kademe)}>
                {KADEME_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {KADEME[k]}
                  </option>
                ))}
              </PSelect>
            </PField>
            <PField label="Yaş" hint="ops." htmlFor="s-yas">
              <PInput id="s-yas" type="number" min={3} max={22} value={form.yas} onChange={(e) => setF("yas", e.target.value)} />
            </PField>
          </div>

          <PField label="Güçlük profili" hint="Birden çok seçebilirsiniz.">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {TANI_KEYS.map((t) => (
                <button key={t} type="button" aria-pressed={form.taniProfili.includes(t)} style={chipStyle(form.taniProfili.includes(t))} onClick={() => toggleTani(t)}>
                  {TANI_LABEL[t]}
                </button>
              ))}
            </div>
          </PField>

          <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "1fr 2fr" }}>
            <PField label="Güçlük düzeyi" htmlFor="s-duzey">
              <PSelect id="s-duzey" value={form.guclukDuzeyi} onChange={(e) => setF("guclukDuzeyi", e.target.value as GuclukDuzeyi)}>
                {GUCLUK_DUZEYI_KEYS.map((d) => (
                  <option key={d} value={d}>
                    {GUCLUK_DUZEYI_LABEL[d]}
                  </option>
                ))}
              </PSelect>
            </PField>
            <PField label="İlgi alanları" hint="etkinliklere taşınır" htmlFor="s-ilgi">
              <PInput id="s-ilgi" value={form.ilgiAlanlari} onChange={(e) => setF("ilgiAlanlari", e.target.value)} placeholder="dinozorlar, futbol…" />
            </PField>
          </div>

          <PField label="Güçlü yönler" hint="ops." htmlFor="s-guclu">
            <PTextarea id="s-guclu" value={form.gucluYonler} onChange={(e) => setF("gucluYonler", e.target.value)} style={{ minHeight: "3.5rem" }} />
          </PField>

          <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "1fr 1fr" }}>
            <PField label="Okul / sınıf" hint="ops." htmlFor="s-okul">
              <PInput id="s-okul" value={form.okul} onChange={(e) => setF("okul", e.target.value)} maxLength={120} />
            </PField>
            <PField label="Veli iletişim" hint="ops." htmlFor="s-veli">
              <PInput id="s-veli" value={form.veliIletisim} onChange={(e) => setF("veliIletisim", e.target.value)} maxLength={200} />
            </PField>
          </div>

          <PField label="Not" hint="opsiyonel" htmlFor="s-notes">
            <PTextarea id="s-notes" value={form.notes} onChange={(e) => setF("notes", e.target.value)} style={{ minHeight: "4rem" }} />
          </PField>

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
