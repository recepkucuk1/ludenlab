"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Pencil, StickyNote, Trash2 } from "lucide-react";
import {
  PAlert,
  PBadge,
  PButton,
  PField,
  PInput,
  PModal,
  PSelect,
  PSpinner,
  PTabs,
  PTextarea,
  toast,
} from "@ludenlab/ui";
import { KADEME, KADEME_KEYS, type Kademe } from "@atolye/lib/bep";
import { docTypeLabel } from "@atolye/lib/doc-types";
import { MEB_MODULLER } from "@atolye/lib/meb-program";
import { TaslakViewerModal } from "@atolye/components/TaslakViewerModal";

interface Doc {
  id: string;
  type: string;
  content: string;
  model: string;
  credits: number;
  createdAt: string;
}
interface Kase {
  id: string;
  code: string;
  kademe: string;
  mebBolumler: string[];
  notes: string;
  documents: Doc[];
}

/** Bölüm kodlarını modüllere göre gruplar (yalnız seçili bölümler). */
const mebGruplari = (kodlar: string[]) => {
  const set = new Set(kodlar);
  return MEB_MODULLER.map((m) => ({
    no: m.no,
    ad: m.ad,
    bolumler: m.bolumler.filter((b) => set.has(b.kod)),
  })).filter((g) => g.bolumler.length > 0);
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

/** Markdown taslağından kart önizlemesi için düz-metin özet. */
function excerpt(md: string, n = 160): string {
  const text = md
    .replace(/```[\s\S]*?```/g, " ") // kod blokları
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // görseller
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // linkler → metin
    .replace(/-{2,}/g, " ") // tablo/çizgi ayraçları
    .replace(/[#>*_`~|]/g, " ") // md sembolleri
    .replace(/\s+/g, " ")
    .trim();
  return text.length > n ? `${text.slice(0, n).trimEnd()}…` : text;
}

export function CaseDetail({ kase }: { kase: Kase }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [code, setCode] = useState(kase.code);
  const [kademe, setKademe] = useState<Kademe>(kase.kademe as Kademe);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [notes, setNotes] = useState(kase.notes);
  const [savingNotes, setSavingNotes] = useState(false);
  const [viewDoc, setViewDoc] = useState<Doc | null>(null);

  async function saveEdit() {
    if (!code.trim()) {
      setEditErr("Ad Soyad gerekli.");
      return;
    }
    setSavingEdit(true);
    setEditErr(null);
    const res = await fetch(`/atolye/api/cases/${kase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), kademe }),
    });
    setSavingEdit(false);
    if (res.ok) {
      setEditOpen(false);
      toast.success("Öğrenci güncellendi");
      router.refresh();
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setEditErr(d.error ?? "Kaydedilemedi.");
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    const res = await fetch(`/atolye/api/cases/${kase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSavingNotes(false);
    if (res.ok) toast.success("Notlar kaydedildi");
    else toast.error("Kaydedilemedi");
  }

  async function delCase() {
    if (!confirm(`"${kase.code}" öğrencisi ve tüm taslakları silinsin mi? Geri alınamaz.`)) return;
    const res = await fetch(`/atolye/api/cases/${kase.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Öğrenci silindi");
      router.push("/atolye/vakalarim");
    } else {
      toast.error("Silinemedi");
    }
  }

  async function delDoc(id: string) {
    if (!confirm("Bu taslak silinsin mi?")) return;
    const res = await fetch(`/atolye/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Taslak silindi");
      router.refresh();
    } else {
      toast.error("Silinemedi");
    }
  }

  const docsTab =
    kase.documents.length === 0 ? (
      <div className="p-card" style={{ display: "flex", alignItems: "center", gap: "0.85rem", maxWidth: 560 }}>
        <span style={tileStyle} aria-hidden>
          <FileText size={22} aria-hidden />
        </span>
        <p className="p-body" style={{ margin: 0 }}>
          Bu öğrenciye henüz taslak atanmadı. Bir araçla üretip “Öğrenciye ata” deyin.
        </p>
      </div>
    ) : (
      <section
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        }}
      >
        {kase.documents.map((d) => (
          <article
            key={d.id}
            className="p-card p-card--hover"
            role="button"
            tabIndex={0}
            aria-label={`${docTypeLabel(d.type)} taslağını aç`}
            onClick={() => setViewDoc(d)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setViewDoc(d);
              }
            }}
            style={{
              padding: 18,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: "0.8rem",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
              <PBadge tone="accent">{docTypeLabel(d.type)}</PBadge>
              <span className="p-mono" style={{ fontSize: 12 }}>
                {new Date(d.createdAt).toLocaleDateString("tr-TR")}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.7rem", minWidth: 0 }}>
              <span style={tileStyle} aria-hidden>
                <FileText size={22} aria-hidden />
              </span>
              <p
                className="p-small"
                style={{
                  margin: 0,
                  color: "var(--poster-ink-2)",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  lineHeight: 1.4,
                }}
              >
                {excerpt(d.content)}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
                marginTop: "auto",
              }}
            >
              <PBadge tone="blue">~{d.credits} kredi</PBadge>
              <PButton
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  delDoc(d.id);
                }}
                aria-label="Taslağı sil"
              >
                <Trash2 size={15} aria-hidden />
              </PButton>
            </div>
          </article>
        ))}
      </section>
    );

  const notesTab = (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 680 }}>
      <PField label="Eğitsel gözlem notları" hint="Kısa eğitsel gözlemler — yalnız sizin hesabınıza görünür.">
        <PTextarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: "10rem" }} />
      </PField>
      <PButton onClick={saveNotes} disabled={savingNotes} style={{ alignSelf: "flex-start" }}>
        {savingNotes ? (
          <>
            <PSpinner /> Kaydediliyor…
          </>
        ) : (
          "Notları kaydet"
        )}
      </PButton>
    </div>
  );

  const col = avatarColor(kase.id);

  return (
    <>
      <Link
        className="p-link"
        href="/atolye/vakalarim"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.9rem" }}
      >
        <ArrowLeft size={15} aria-hidden /> Öğrenciler
      </Link>

      <span className="p-eyebrow" style={{ display: "block", margin: "1rem 0 0.5rem" }}>
        ÖĞRENCİ DETAYI
      </span>

      <header
        style={{
          margin: "0 0 1.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.85rem",
          alignItems: "center",
        }}
      >
        <span
          style={{
            width: 52,
            height: 52,
            borderRadius: 999,
            flexShrink: 0,
            background: col,
            color: col === "var(--poster-yellow)" ? "var(--poster-ink)" : "#fff",
            border: "var(--poster-border)",
            boxShadow: "0 2px 0 var(--poster-ink)",
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            fontSize: 18,
          }}
          aria-hidden
        >
          {initials(kase.code)}
        </span>
        <div style={{ minWidth: 0 }}>
          <h1 className="p-h2" style={{ margin: 0 }}>{kase.code}</h1>
          <PBadge style={{ marginTop: 6 }}>
            {KADEME[kase.kademe as Kademe] ?? kase.kademe}
          </PBadge>
        </div>
        <div style={{ flex: 1 }} />
        <PButton size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
          <Pencil size={15} aria-hidden /> Düzenle
        </PButton>
        <PButton size="sm" variant="danger" onClick={delCase}>
          <Trash2 size={15} aria-hidden /> Sil
        </PButton>
      </header>

      {mebGruplari(kase.mebBolumler).length > 0 && (
        <div className="p-card" style={{ padding: "0.9rem 1.1rem", margin: "0 0 1.5rem" }}>
          <span className="p-eyebrow">ÇALIŞILAN MEB MODÜLLERİ</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginTop: 10 }}>
            {mebGruplari(kase.mebBolumler).map((g) => (
              <div key={g.no} style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: "0.82rem", minWidth: 160 }}>
                  {g.no}. {g.ad}
                </span>
                {g.bolumler.map((b) => (
                  <span
                    key={b.kod}
                    title={b.kod}
                    style={{
                      border: "var(--poster-border)",
                      borderRadius: "var(--poster-radius-pill)",
                      padding: "0.18rem 0.55rem",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "var(--poster-ink-2)",
                      background: "var(--poster-panel)",
                    }}
                  >
                    {b.ad}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <PTabs
        tabs={[
          {
            key: "docs",
            label: (
              <>
                <FileText size={15} aria-hidden /> Dökümanlar ({kase.documents.length})
              </>
            ),
            content: docsTab,
          },
          {
            key: "notes",
            label: (
              <>
                <StickyNote size={15} aria-hidden /> Notlar
              </>
            ),
            content: notesTab,
          },
        ]}
      />

      <PModal open={editOpen} onClose={() => setEditOpen(false)} title="Öğrenciyi düzenle">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <PField label="Ad Soyad" htmlFor="cd-code">
            <PInput id="cd-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={120} />
          </PField>
          <PField label="Kademe" htmlFor="cd-kademe">
            <PSelect id="cd-kademe" value={kademe} onChange={(e) => setKademe(e.target.value as Kademe)}>
              {KADEME_KEYS.map((k) => (
                <option key={k} value={k}>
                  {KADEME[k]}
                </option>
              ))}
            </PSelect>
          </PField>
          {editErr && <PAlert tone="error">{editErr}</PAlert>}
          <PButton onClick={saveEdit} disabled={savingEdit}>
            {savingEdit ? (
              <>
                <PSpinner /> Kaydediliyor…
              </>
            ) : (
              "Kaydet"
            )}
          </PButton>
        </div>
      </PModal>

      <TaslakViewerModal doc={viewDoc} onClose={() => setViewDoc(null)} />
    </>
  );
}
