"use client";
import { useEffect, useRef, useState } from "react";
import { EASY_CHIPS, HARD_CHIPS, PARENT_NOTE_MAX } from "@studio/lib/parentLink/schema";

/* Veli formu (spec §6): 3 soru, mobil öncelikli, hesapsız. Tasarım token'ları poster; studio.css yüklü DEĞİL,
   bu yüzden düğmeler satır içi stil (PBtn kullanılmaz). Çocuk verisi yok. */
type Durum = "form" | "gonderiliyor" | "tesekkur";
const DUGME: React.CSSProperties = { minHeight: 44, padding: "10px 14px", borderRadius: 12, border: "2px solid var(--poster-ink)", background: "var(--poster-panel)", color: "var(--poster-ink)", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" };
const SECILI: React.CSSProperties = { background: "var(--poster-ink)", color: "var(--poster-panel)" };

type ChipListe = readonly { key: string; label: string }[];

function Chips({ list, value, onToggle, legend }: { list: ChipListe; value: string[]; onToggle: (k: string) => void; legend: string }) {
  return (
    <fieldset style={{ border: "none", padding: 0, margin: "0 0 14px" }}>
      <legend style={{ fontWeight: 700, marginBottom: 8 }}>{legend}</legend>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {list.map((c) => {
          const on = value.includes(c.key);
          return (
            <button key={c.key} type="button" aria-pressed={on} onClick={() => onToggle(c.key)} style={{ ...DUGME, ...(on ? SECILI : null) }}>{c.label}</button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ParentFeedbackForm({ token, therapistName }: { token: string; therapistName: string }) {
  const [days, setDays] = useState<number | null>(null);
  const [easy, setEasy] = useState<string[]>([]);
  const [hard, setHard] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [durum, setDurum] = useState<Durum>("form");
  const [hata, setHata] = useState<string | null>(null);
  const tesekkurBaslik = useRef<HTMLHeadingElement>(null);
  const ilkGun = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (durum === "tesekkur") tesekkurBaslik.current?.focus(); }, [durum]);
  const toggle = (set: (f: (p: string[]) => string[]) => void, key: string) => set((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  async function gonder() {
    if (days === null) { setHata("Lütfen kaç gün çalışıldığını seçin."); ilkGun.current?.focus(); return; }
    setDurum("gonderiliyor"); setHata(null);
    try {
      const r = await fetch(`/api/veli/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ days, easy, hard, note: note.trim() || undefined }) });
      if (r.status === 404) { setHata("Bu bağlantı artık geçerli değil. Lütfen uzmanınızdan yeni bağlantı isteyin."); setDurum("form"); return; }
      if (r.status === 429) { setHata("Çok sık yanıt gönderildi, biraz sonra tekrar deneyin."); setDurum("form"); return; }
      if (!r.ok) { setHata("Bir hata oluştu, lütfen tekrar deneyin."); setDurum("form"); return; }
      setDurum("tesekkur");
    } catch { setHata("Bağlantı kurulamadı, lütfen tekrar deneyin."); setDurum("form"); }
  }

  if (durum === "tesekkur") {
    return (
      <section aria-live="polite">
        <h1 ref={tesekkurBaslik} tabIndex={-1} style={{ fontFamily: "var(--font-display)", fontSize: 22, outline: "none" }}>Teşekkürler, yanıtınız iletildi.</h1>
        <p style={{ color: "var(--poster-ink-2)" }}>{therapistName} yanıtınızı öğrencinin kaydında görecek.</p>
        <button type="button" style={DUGME} onClick={() => { setDays(null); setEasy([]); setHard([]); setNote(""); setDurum("form"); }}>Yeni yanıt</button>
      </section>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void gonder(); }} aria-busy={durum === "gonderiliyor"}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: "0 0 4px" }}>Haftalık geri bildirim</h1>
      <p style={{ color: "var(--poster-ink-2)", margin: "0 0 20px" }}>{therapistName}</p>

      <fieldset style={{ border: "none", padding: 0, margin: "0 0 18px" }}>
        <legend style={{ fontWeight: 700, marginBottom: 8 }}>Bu hafta evde kaç gün çalıştınız?</legend>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {Array.from({ length: 8 }, (_, i) => i).map((n) => (
            <button key={n} ref={n === 0 ? ilkGun : undefined} type="button" aria-pressed={days === n} onClick={() => setDays(n)} style={{ ...DUGME, ...(days === n ? SECILI : null), fontSize: 18 }}>{n}</button>
          ))}
        </div>
      </fieldset>

      <Chips list={EASY_CHIPS} value={easy} onToggle={(k) => toggle(setEasy, k)} legend="Neler kolay geldi?" />
      <Chips list={HARD_CHIPS} value={hard} onToggle={(k) => toggle(setHard, k)} legend="Neler zor geldi?" />

      <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }} htmlFor="veli-not">Eklemek istediğiniz bir şey?</label>
      <textarea id="veli-not" value={note} maxLength={PARENT_NOTE_MAX} rows={3} onChange={(e) => setNote(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 12, border: "2px solid var(--poster-ink)", fontFamily: "inherit", fontSize: 16 }} />
      <div style={{ fontSize: 12, color: "var(--poster-ink-3)", textAlign: "right" }}>{note.length}/{PARENT_NOTE_MAX}</div>

      <p style={{ fontSize: 12, color: "var(--poster-ink-2)", margin: "14px 0" }}>
        Yanıtınız çocuğunuzun uzmanına iletilir ve eğitim planlamasında kullanılır. Yapay zekâ desteğine çocuğun adı gitmez, takma ad kullanılır. Uzman yanıtı silebilir. Ayrıntı: <a href="/gizlilik" target="_blank" rel="noreferrer noopener" style={{ color: "inherit" }}>Gizlilik Politikası</a>.
      </p>
      {hata && <p role="alert" style={{ color: "var(--poster-danger)", fontWeight: 700 }}>{hata}</p>}
      <button type="submit" disabled={durum === "gonderiliyor"} style={{ ...DUGME, ...SECILI, width: "100%", fontSize: 17 }}>{durum === "gonderiliyor" ? "Gönderiliyor…" : "Gönder"}</button>
    </form>
  );
}
