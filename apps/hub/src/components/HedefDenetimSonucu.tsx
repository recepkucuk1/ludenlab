"use client";

import { PBadge, type PBadgeTone } from "@ludenlab/ui";
import {
  BILESENLER, BILESEN_ETIKETI, MEB_UYUM_ETIKETI, varSayisi, varSayisiMetni,
  type DenetimSonucu, type Durum,
} from "@/lib/hedefDenetimi";

/* İki modülün paylaştığı denetim sonucu kartı (spec §8). Puan yok; durum rozetleri PBadge tonlarından (koyu temada
   okunur; sabit beyaz YOK — koyuTemaKontrast bekçisi). `.poster-scope` içinde çizilir. */

const TON: Record<Durum, PBadgeTone> = { var: "green", belirsiz: "accent", eksik: "default" };
const SIMGE: Record<Durum, string> = { var: "✓", belirsiz: "~", eksik: "○" };

export function HedefDenetimSonucu({ sonuc, mebVar }: { sonuc: DenetimSonucu; mebVar: boolean }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }} aria-label="Hedef bileşenleri">
        {BILESENLER.map((k) => {
          const b = sonuc.bilesenler[k];
          return (
            <li
              key={k}
              style={{
                display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "start",
                padding: "8px 10px", borderRadius: 8, border: "var(--poster-border)", background: "var(--poster-panel)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--poster-ink)" }}>{BILESEN_ETIKETI[k]}</div>
                {b.alinti && (
                  <q style={{ display: "block", fontSize: 13, color: "var(--poster-ink-2)", marginTop: 2 }}>{b.alinti}</q>
                )}
                {b.not && <div style={{ fontSize: 12.5, color: "var(--poster-ink-3)", marginTop: 2 }}>{b.not}</div>}
              </div>
              <PBadge tone={TON[b.durum]} style={{ whiteSpace: "nowrap" }}>
                {SIMGE[b.durum]} {b.durum}
              </PBadge>
            </li>
          );
        })}
      </ul>

      {mebVar && sonuc.mebUyum && (
        <div style={{ fontSize: 13, color: "var(--poster-ink)" }}>
          <strong>MEB uyumu:</strong> {MEB_UYUM_ETIKETI[sonuc.mebUyum.durum]}
          {sonuc.mebUyum.not && <span style={{ color: "var(--poster-ink-2)" }}> — {sonuc.mebUyum.not}</span>}
        </div>
      )}

      {sonuc.sorular.length > 0 && (
        <section>
          <h4 style={{ margin: "0 0 6px", fontSize: 13.5 }}>Uzmana sorular</h4>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 13 }}>
            {sonuc.sorular.map((q) => (
              <li key={q.bilesen}>
                <strong>{BILESEN_ETIKETI[q.bilesen]}:</strong> {q.soru}
                {q.ornek && <em style={{ color: "var(--poster-ink-3)" }}> örn. {q.ornek}</em>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p style={{ margin: 0, fontSize: 13.5, color: "var(--poster-ink)" }}>{sonuc.ozet}</p>
      <p className="p-small" style={{ margin: 0, color: "var(--poster-ink-3)" }}>
        {varSayisiMetni(varSayisi(sonuc))} · Hedef uzmanın kararıdır; denetim yeniden yazmaz.
      </p>
    </div>
  );
}
