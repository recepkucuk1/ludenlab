"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CardGeneratorForm } from "@/components/cards/CardGeneratorForm";
import { CardPreview } from "@/components/cards/CardPreview";
import { AssignStudentsModal } from "@/components/cards/AssignStudentsModal";
import { PBtn, PCard, PSpinner } from "@/components/poster";
import type { GeneratedCard } from "@/lib/prompts";

const LOADING_MSGS = [
  "Kelimeler uçuşuyor, kartınız şekilleniyor... 🦋",
  "Nöronlar ateşleniyor, hedefler hizalanıyor... 🧠",
  "Dil büyüsü yapılıyor, biraz sabır... ✨",
  "Öğrenme kartı pişiyor, fırından çıkmak üzere... 🍞",
  "Sesler, heceler, kelimeler bir araya geliyor... 🎵",
  "Uzman terapist moduna geçildi... 🎯",
  "Müfredat hedefleri karta işleniyor... 📚",
  "Beyin fırtınası devam ediyor... ⚡",
  "Kartınız özenle hazırlanıyor... 🌱",
  "Dil yolculuğunuz başlamak üzere... 🚀",
  "Kelime hazinesi kontrol ediliyor... 🔍",
  "Artikülasyon egzersizleri tasarlanıyor... 👄",
  "İşitsel bellekle dans ediliyor... 👂",
  "Terapi sihri devreye giriyor... 🪄",
  "Her hece bir adım, her adım bir zafer... 🏆",
  "Öğrenme maceranız kurgulanıyor... 🗺️",
];

function LoadingMessages() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * LOADING_MSGS.length));
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      timerRef.current = setTimeout(() => {
        setIndex((i) => (i + 1) % LOADING_MSGS.length);
        setVisible(true);
      }, 300);
    }, 2600);
    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p
        style={{
          fontSize: 13,
          color: "var(--poster-ink-2)",
          fontWeight: 600,
          maxWidth: 320,
          textAlign: "center",
          opacity: visible ? 1 : 0,
          transition: "opacity .3s",
          fontFamily: "var(--font-display)",
          margin: 0,
        }}
      >
        {LOADING_MSGS[index]}
      </p>
    </div>
  );
}

function PanelHeader({ title, subtitle, right }: { title: string; subtitle: string; right?: React.ReactNode }) {
  return (
    <div
      style={{
        marginBottom: 14,
        padding: "12px 16px",
        background: "var(--poster-panel)",
        border: "2px solid var(--poster-ink)",
        borderRadius: 14,
        boxShadow: "var(--poster-shadow-sm)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h2
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: "var(--poster-ink)",
            letterSpacing: "-.02em",
            margin: 0,
            fontFamily: "var(--font-display)",
          }}
        >
          {title}
        </h2>
        {right}
      </div>
      <p style={{ fontSize: 13, color: "var(--poster-ink-2)", margin: "2px 0 0", fontFamily: "var(--font-display)" }}>
        {subtitle}
      </p>
    </div>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [card, setCard] = useState<GeneratedCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedCardId, setGeneratedCardId] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const studentId = searchParams.get("studentId") ?? undefined;
  const studentName = searchParams.get("studentName") ?? undefined;
  const studentBirthDate = searchParams.get("birthDate") ?? undefined;

  useEffect(() => {
    setCard(null);
    setGeneratedCardId(null);
  }, [studentId]);

  function handleCardGenerated(c: GeneratedCard) {
    setCard(c);
  }

  function handleNewCard() {
    setCard(null);
    setGeneratedCardId(null);
    setFormKey((k) => k + 1);
  }

  return (
    <div
      className="poster-scope"
      style={{
        width: "100%",
        minHeight: "100%",
        background: "var(--poster-bg)",
        padding: "clamp(14px, 3.5vw, 20px) clamp(14px, 3.5vw, 20px) clamp(24px, 5vw, 32px)",
        fontFamily: "var(--font-display)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          className="poster-tool-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 380px) minmax(0, 1fr)",
            gap: 24,
          }}
        >
          {/* Sol: Form */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <PanelHeader
              title="Öğrenme Kartı Oluştur"
              subtitle="Parametreleri seç, AI öğrenme kartını üretsin."
              right={
                studentName ? (
                  <a
                    href="/students"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--poster-accent)",
                      textDecoration: "underline",
                    }}
                  >
                    öğrencilere dön
                  </a>
                ) : undefined
              }
            />
            <PCard rounded={18} style={{ padding: 20, background: "var(--poster-panel)" }}>
              <CardGeneratorForm
                key={formKey}
                onCardGenerated={handleCardGenerated}
                onLoading={setLoading}
                onCardIdGenerated={setGeneratedCardId}
                studentId={studentId}
                studentName={studentName}
                studentBirthDate={studentBirthDate}
              />
            </PCard>
          </div>

          {/* Sağ: Önizleme */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <PanelHeader
              title="Kart Önizleme"
              subtitle={card ? "Üretilen öğrenme kartı aşağıda görüntüleniyor." : "Kart üretildiğinde burada görünecek."}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {loading ? (
                <PCard
                  rounded={18}
                  style={{
                    minHeight: 400,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--poster-panel)",
                  }}
                >
                  <div style={{ textAlign: "center", padding: "0 32px" }}>
                    <PSpinner size={40} style={{ marginBottom: 16 }} />
                    <LoadingMessages />
                  </div>
                </PCard>
              ) : card ? (
                <>
                  <PCard rounded={18} style={{ padding: 20, background: "var(--poster-panel)", minHeight: 500 }}>
                    <CardPreview card={card} />
                  </PCard>
                  <PCard rounded={18} style={{ padding: 16, background: "var(--poster-panel)" }}>
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: "var(--poster-ink-3)",
                        textTransform: "uppercase",
                        letterSpacing: ".12em",
                        margin: "0 0 10px",
                      }}
                    >
                      Sonraki adım
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <PBtn as="a" href="/cards" variant="white" size="md" style={{ flex: "1 1 140px", justifyContent: "center" }}>
                        Kart Kütüphanesi
                      </PBtn>
                      {generatedCardId && (
                        <PBtn
                          type="button"
                          variant="accent"
                          size="md"
                          onClick={() => setShowAssign(true)}
                          style={{ flex: "1 1 140px", justifyContent: "center" }}
                        >
                          Öğrenciye Ata
                        </PBtn>
                      )}
                      <PBtn
                        type="button"
                        variant="white"
                        size="md"
                        onClick={handleNewCard}
                        style={{ flex: "1 1 140px", justifyContent: "center" }}
                      >
                        Yeni Kart Üret
                      </PBtn>
                    </div>
                  </PCard>
                </>
              ) : (
                <div
                  style={{
                    minHeight: 400,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--poster-bg-2)",
                    border: "2px dashed var(--poster-ink-3)",
                    borderRadius: 18,
                  }}
                >
                  <div style={{ textAlign: "center", padding: "0 32px" }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🗂️</div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--poster-ink-2)", margin: 0 }}>
                      Henüz kart üretilmedi
                    </p>
                    <p style={{ fontSize: 12, color: "var(--poster-ink-3)", margin: "4px 0 0" }}>
                      Sol taraftan parametreleri seçip &quot;Kart Üret&quot; butonuna bas.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showAssign && generatedCardId && card && (
          <AssignStudentsModal
            cardId={generatedCardId}
            cardTitle={card.title as string}
            onClose={() => setShowAssign(false)}
          />
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
