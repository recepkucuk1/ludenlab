"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import {
  PAlert,
  PBadge,
  PButton,
  PField,
  PInput,
  PModal,
  PSection,
  PSelect,
  PSpinner,
  PTabs,
  PTextarea,
  toast,
} from "@ludenlab/ui";
import { KADEME, KADEME_KEYS, type Kademe } from "@/lib/bep";
import { docTypeLabel } from "@/lib/doc-types";
import { Markdown } from "@/components/Markdown";

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
  notes: string;
  documents: Doc[];
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

  async function saveEdit() {
    if (!code.trim()) {
      setEditErr("Ad Soyad gerekli.");
      return;
    }
    setSavingEdit(true);
    setEditErr(null);
    const res = await fetch(`/api/cases/${kase.id}`, {
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
    const res = await fetch(`/api/cases/${kase.id}`, {
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
    const res = await fetch(`/api/cases/${kase.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Öğrenci silindi");
      router.push("/vakalarim");
    } else {
      toast.error("Silinemedi");
    }
  }

  async function delDoc(id: string) {
    if (!confirm("Bu taslak silinsin mi?")) return;
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Taslak silindi");
      router.refresh();
    } else {
      toast.error("Silinemedi");
    }
  }

  const docsTab =
    kase.documents.length === 0 ? (
      <p style={{ color: "var(--poster-ink-3)" }}>
        Bu öğrenciye henüz taslak atanmadı. Bir araçla üretip “Öğrenciye ata” deyin.
      </p>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {kase.documents.map((d) => (
          <PSection
            key={d.id}
            title={`${docTypeLabel(d.type)} · ${new Date(d.createdAt).toLocaleDateString("tr-TR")}`}
            action={
              <span style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
                <PBadge tone="blue">~{d.credits} kredi</PBadge>
                <PButton size="sm" variant="ghost" onClick={() => delDoc(d.id)} aria-label="Taslağı sil">
                  <Trash2 size={15} aria-hidden />
                </PButton>
              </span>
            }
          >
            <Markdown>{d.content}</Markdown>
          </PSection>
        ))}
      </div>
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

  return (
    <>
      <Link
        href="/vakalarim"
        style={{ color: "var(--poster-ink-3)", fontSize: "0.9rem", textDecoration: "none" }}
      >
        ← Öğrenciler
      </Link>
      <header
        style={{
          margin: "0.75rem 0 1.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
        }}
      >
        <h1 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.1rem)", margin: 0 }}>{kase.code}</h1>
        <PBadge>{KADEME[kase.kademe as Kademe] ?? kase.kademe}</PBadge>
        <div style={{ flex: 1 }} />
        <PButton size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
          <Pencil size={15} aria-hidden /> Düzenle
        </PButton>
        <PButton size="sm" variant="danger" onClick={delCase}>
          <Trash2 size={15} aria-hidden /> Sil
        </PButton>
      </header>

      <PTabs
        tabs={[
          { key: "docs", label: `Dökümanlar (${kase.documents.length})`, content: docsTab },
          { key: "notes", label: "Notlar", content: notesTab },
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
    </>
  );
}
