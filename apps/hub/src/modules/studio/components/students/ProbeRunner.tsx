// apps/hub/src/modules/studio/components/students/ProbeRunner.tsx
"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, X, RotateCcw, Eye, EyeOff } from "lucide-react";
import { PBtn, PTextarea } from "@studio/components/poster";
import { POSITION_LABEL, type ProbePosition, type ProbeWord, type RunItem } from "@studio/lib/probe/schema";
import { scoreItems } from "@studio/lib/probe/score";

/* Tam ekran sayaç (spec §7). Tek dokunuş doğru/yanlış, öğe başına "ipucuyla", geri al, kelimeyi gizle.
   Klavye: D doğru · Y yanlış · İ/I ipucu · Backspace geri al · Esc vazgeç; Tab odağı panelde tutar (odak tuzağı). Yarım prob kaydedilmez. */
interface Props {
  sound: string;
  position: ProbePosition;
  words: ProbeWord[];
  onCancel: () => void;
  onSave: (items: RunItem[], note: string) => Promise<void>;
}

export function ProbeRunner({ sound, position, words, onCancel, onSave }: Props) {
  const [items, setItems] = useState<RunItem[]>([]);
  const [cued, setCued] = useState(false);
  const [showWord, setShowWord] = useState(true);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(() => new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLHeadingElement>(null);
  const index = items.length;
  const current = words[index];
  const done = index >= words.length;

  const mark = useCallback((correct: boolean) => {
    setItems((prev) => {
      const w = words[prev.length];
      return w ? [...prev, { word: w.word, correct, cued }] : prev;
    });
    setCued(false);
  }, [words, cued]);

  const undo = useCallback(() => {
    setItems((prev) => prev.slice(0, -1));
    setCued(false);
  }, []);

  // Kaydederken kapatma yok; kayıtsız veri varken (sayaç ya da özet) onay iste.
  const cancel = useCallback(() => {
    if (saving) return;
    if (items.length > 0 && !window.confirm("Prob kaydedilmeden kapatılacak. Emin misiniz?")) return;
    onCancel();
  }, [saving, items.length, onCancel]);

  // Dinleyici bir kez abone olur; güncel değerleri ref'ten okur (odak/dinleyici çalkantısı yok).
  const latest = useRef({ done, saving, mark, undo, cancel });
  useLayoutEffect(() => { latest.current = { done, saving, mark, undo, cancel }; });

  // Açılışta panele, özete geçince başlığa, "Son öğeyi düzelt" ile geri dönünce yeniden panele odak.
  useEffect(() => { (done ? summaryRef : panelRef).current?.focus(); }, [done]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const nodes = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement as HTMLElement | null;
        const inside = !!active && nodes.includes(active);
        if (e.shiftKey) {
          if (!inside || active === first) { e.preventDefault(); last.focus(); }
        } else if (!inside) { e.preventDefault(); first.focus(); }
        else if (active === last) { e.preventDefault(); first.focus(); }
        return;
      }
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const l = latest.current;
      if (l.saving) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") { l.cancel(); return; }
      if (l.done) return;
      const k = e.key.toLocaleLowerCase("tr-TR");
      if (k === "d") l.mark(true);
      else if (k === "y") l.mark(false);
      else if (k === "i" || k === "ı") setCued((c) => !c);
      else if (e.key === "Backspace") l.undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function save() {
    setSaving(true);
    try { await onSave(items, note.trim()); } finally { setSaving(false); }
  }

  const skor = scoreItems(items);
  // Özet: ipucuyla doğru ayrı sayılır; ipucuyla yanlış "yanlış"ta (kalite incelemesi Task 2: salt cuedCount belirsizdi).
  const ipucuylaDogru = items.filter((i) => i.cued && i.correct).length;
  const yanlis = skor.total - skor.correct - ipucuylaDogru;

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Prob: ${sound} ${POSITION_LABEL[position]}`}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--poster-bg)", color: "var(--poster-ink)", display: "flex", flexDirection: "column", padding: 16, outline: "none", overflowY: "auto", overscrollBehavior: "contain" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <strong style={{ fontFamily: "var(--font-display)" }}>{sound} · {POSITION_LABEL[position]}</strong>
        <span aria-live="polite" style={{ fontWeight: 800 }}>{Math.min(index + 1, words.length)} / {words.length}</span>
        {!done ? <PBtn as="button" variant="white" size="sm" onClick={cancel} disabled={saving}>Vazgeç</PBtn> : <span />}
      </div>

      {!done && current && (
        <>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 0 }}>
            <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {current.imageUrl && !brokenImages.has(current.imageUrl) ? (
              // Kelime gizliyken alt boş: resim adlandırmada ipucu sızmasın. Yüklenemeyen görsel (silinmiş önbellek) → yalnız kelime.
              <img src={current.imageUrl} alt={showWord ? current.word : ""} onError={() => setBrokenImages((s) => new Set(s).add(current.imageUrl!))} style={{ maxHeight: "min(48vh, 100%)", maxWidth: "90vw", borderRadius: 18, border: "2px solid var(--poster-ink)", boxShadow: "0 6px 0 var(--poster-ink)", objectFit: "contain" }} />
            ) : null}
            </div>
            <div style={{ fontSize: current.imageUrl && !brokenImages.has(current.imageUrl) ? 28 : 48, fontWeight: 800, fontFamily: "var(--font-display)", minHeight: 40, visibility: showWord ? "visible" : "hidden" }} aria-hidden={!showWord}>
              {current.word}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button type="button" onClick={() => mark(true)} aria-label="Doğru (D)" style={{ padding: "22px 10px", fontSize: 20, fontWeight: 800, borderRadius: 14, border: "2px solid var(--poster-ink)", boxShadow: "0 4px 0 var(--poster-ink)", background: "var(--poster-green)", color: "var(--poster-on-color)", cursor: "pointer" }}>
              <Check size={22} aria-hidden /> Doğru
            </button>
            <button type="button" onClick={() => mark(false)} aria-label="Yanlış (Y)" style={{ padding: "22px 10px", fontSize: 20, fontWeight: 800, borderRadius: 14, border: "2px solid var(--poster-ink)", boxShadow: "0 4px 0 var(--poster-ink)", background: "var(--poster-accent)", color: "var(--poster-on-color)", cursor: "pointer" }}>
              <X size={22} aria-hidden /> Yanlış
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <PBtn as="button" variant={cued ? "accent" : "white"} size="sm" onClick={() => setCued((c) => !c)} aria-pressed={cued} aria-label="İpucuyla (İ)">
              {cued ? "İpucuyla ✓" : "İpucuyla"}
            </PBtn>
            <PBtn as="button" variant="white" size="sm" onClick={undo} disabled={index === 0} aria-label="Geri al (Backspace)"><RotateCcw size={14} aria-hidden /> Geri al</PBtn>
            <PBtn as="button" variant="white" size="sm" onClick={() => setShowWord((s) => !s)} aria-label={showWord ? "Kelimeyi gizle" : "Kelimeyi göster"}>
              {showWord ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />} {showWord ? "Kelimeyi gizle" : "Kelimeyi göster"}
            </PBtn>
          </div>
        </>
      )}

      {done && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12, maxWidth: 520, margin: "0 auto", width: "100%" }}>
          <h2 ref={summaryRef} tabIndex={-1} style={{ fontFamily: "var(--font-display)", fontSize: 28, margin: 0, outline: "none" }}>%{skor.pct} bağımsız ({skor.correct}/{skor.total})</h2>
          <p style={{ margin: 0, color: "var(--poster-ink-3)" }}>{ipucuylaDogru} ipucuyla doğru · {yanlis} yanlış</p>
          <PTextarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} placeholder="Tek satır not (isteğe bağlı)" rows={2} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <PBtn as="button" variant="accent" onClick={save} disabled={saving || items.length === 0}>Kaydet</PBtn>
            <PBtn as="button" variant="white" onClick={undo} disabled={saving}>Son öğeyi düzelt</PBtn>
            <PBtn as="button" variant="white" onClick={cancel} disabled={saving}>Vazgeç</PBtn>
          </div>
        </div>
      )}
    </div>
  );
}
