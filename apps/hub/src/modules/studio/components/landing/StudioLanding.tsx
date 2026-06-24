"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { cn } from "@studio/lib/utils";
import { PosterHero } from "@studio/components/landing/poster-hero";
import { PosterHeader } from "@studio/components/landing/poster-header";
import { ForceLightTheme } from "@studio/components/ForceLightTheme";
import { PosterFooter } from "@studio/components/landing/poster-footer";
import { Pricing, type PricingPlan } from "@studio/components/poster/pricing";
import { PaymentBadge } from "@/components/PaymentBadge";
import { PBadge } from "@studio/components/poster";
import {
  Sparkles,
  Users,
  FileDown,
  Target,
  Lock,
  Layers,
  Mic,
  PenLine,
  Music,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Mail,
} from "lucide-react";
import { motion, AnimatePresence, useInView } from "framer-motion";

// ─── FAQ Accordion ────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "Ücretsiz plan ne kadar süre geçerli?",
    a: "Ücretsiz plan süre sınırı olmaksızın kullanılabilir. 2 öğrenci ve 40 başlangıç kredisiyle başlamak için idealdir.",
  },
  {
    q: "Kredi sistemi nasıl çalışıyor?",
    a: "Her öğrenme kartı üretimi veya AI eğitim profili oluşturma 20 kredi harcar. Pro planda dönem başında 2.000, Advanced planda 10.000 kredi yüklenir.",
  },
  {
    q: "Verilerim güvende mi?",
    a: "Tüm veriler şifrelenmiş bağlantılar üzerinden aktarılır ve güvenli sunucularda saklanır. Öğrenci bilgileri yalnızca size aittir, üçüncü taraflarla paylaşılmaz.",
  },
  {
    q: "Kaç öğrenci ekleyebilirim?",
    a: "Ücretsiz planda 2 öğrenci, Pro planda 200 öğrenci ekleyebilirsiniz. Advanced ve Enterprise planlarda sınır yoktur.",
  },
  {
    q: "Fatura ve ödeme nasıl işliyor?",
    a: "Kredi kartı ve havale seçenekleriyle aylık veya yıllık abonelik alabilirsiniz. Yıllık abonelikte %15 indirim uygulanır.",
  },
];

function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div
      style={{
        background: "#fff",
        border: "2px solid var(--poster-ink)",
        boxShadow: "0 6px 0 var(--poster-ink)",
        borderRadius: 20,
        overflow: "hidden",
        fontFamily: "var(--font-display)",
      }}
    >
      {FAQ_ITEMS.map((item, i) => (
        <div
          key={i}
          style={{
            borderBottom:
              i < FAQ_ITEMS.length - 1 ? "2px solid var(--poster-ink)" : "none",
          }}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 22px",
              textAlign: "left",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--poster-ink)",
              background: open === i ? "#FFF8EC" : "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-display)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span
                style={{
                  display: "inline-flex",
                  height: 28,
                  width: 28,
                  flexShrink: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  border: "2px solid var(--poster-ink)",
                  background: open === i ? "var(--poster-accent)" : "#FFCE52",
                  color: open === i ? "#fff" : "var(--poster-ink)",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </span>
              {item.q}
            </span>
            <motion.div
              animate={{ rotate: open === i ? 180 : 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{
                display: "inline-flex",
                flexShrink: 0,
                marginLeft: 16,
                color: "var(--poster-ink)",
              }}
            >
              <ChevronDown size={18} strokeWidth={2.5} />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div
                key={`faq-${i}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <div
                  style={{
                    padding: "0 22px 20px 64px",
                    fontSize: 14,
                    color: "var(--poster-ink-2)",
                    lineHeight: 1.6,
                  }}
                >
                  {item.a}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ─── How It Works — helper components ────────────────────────────────────────

function CarouselTag({ children, color }: {
  children: React.ReactNode;
  color: "blue" | "orange" | "green" | "yellow";
}) {
  // Re-using PBadge so the carousel mock chips visually match the
  // badges users see inside the actual app once they log in.
  const map = { blue: "blue", orange: "accent", green: "soft", yellow: "yellow" } as const;
  return <PBadge color={map[color]}>{children}</PBadge>;
}

function MockDropdown({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  // Visually mimics the real PSelect (2px ink border, cream panel, accent
  // shadow when highlighted) so what's promised on the landing matches
  // what users see in the app.
  return (
    <div>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--poster-ink-3)",
          marginBottom: 6,
          fontFamily: "var(--font-display)",
        }}
      >
        {label}
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: highlight ? "var(--poster-accent-soft)" : "var(--poster-panel)",
          border: "2px solid var(--poster-ink)",
          borderRadius: 12,
          boxShadow: highlight ? "0 3px 0 var(--poster-accent)" : "var(--poster-shadow-sm)",
          fontSize: 14,
          fontWeight: highlight ? 700 : 600,
          color: "var(--poster-ink)",
          fontFamily: "var(--font-display)",
        }}
      >
        <span>{value}</span>
        <ChevronDown size={14} strokeWidth={2} color="var(--poster-ink)" />
      </div>
    </div>
  );
}

function MockPdfCard({ header, tags, rows, cta }: {
  header: string;
  tags: React.ReactNode;
  rows: { label: string; title?: string; body: string }[];
  cta: string;
}) {
  return (
    <div
      style={{
        maxWidth: 560,
        margin: "0 auto",
        background: "var(--poster-panel)",
        border: "2px solid var(--poster-ink)",
        borderRadius: 16,
        boxShadow: "0 6px 0 var(--poster-ink)",
        overflow: "hidden",
        fontFamily: "var(--font-display)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: "2px solid var(--poster-ink)",
          background: "var(--poster-bg-2)",
        }}
      >
        <span style={{ fontWeight: 800, color: "var(--poster-ink)", fontSize: 15 }}>
          Luden<span style={{ color: "var(--poster-accent)" }}>Lab</span>
        </span>
        <span style={{ fontSize: 11, color: "var(--poster-ink-3)" }}>{header}</span>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: "12px 20px",
          borderBottom: "1px dashed var(--poster-ink-faint)",
        }}
      >
        {tags}
      </div>
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {rows.map((s) => (
          <div key={s.label}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                color: "var(--poster-ink-3)",
                margin: "0 0 4px",
              }}
            >
              {s.label}
            </p>
            {s.title && (
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--poster-ink)", margin: "0 0 2px" }}>
                {s.title}
              </p>
            )}
            <p style={{ fontSize: 12, color: "var(--poster-ink-2)", lineHeight: 1.55, margin: 0 }}>
              {s.body}
            </p>
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderTop: "2px solid var(--poster-ink)",
          background: "var(--poster-bg-2)",
        }}
      >
        <span style={{ fontSize: 11, color: "var(--poster-ink-3)" }}>{cta}</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 800,
            color: "var(--poster-accent)",
          }}
        >
          <Download size={14} strokeWidth={2.5} />
          PDF İndir
        </span>
      </div>
    </div>
  );
}

// ── Shared slide bits ─────────────────────────────────────────────────────────

function SlideCtaButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        width: "100%",
        background: "var(--poster-accent)",
        color: "#fff",
        padding: "12px 18px",
        textAlign: "center",
        fontSize: 14,
        fontWeight: 800,
        border: "2px solid var(--poster-ink)",
        borderRadius: 12,
        boxShadow: "0 4px 0 var(--poster-ink)",
        textDecoration: "none",
        fontFamily: "var(--font-display)",
      }}
    >
      {children}
    </Link>
  );
}

function GoalChecklistCard({ items, title }: {
  items: { code: string; title: string; active: boolean }[];
  title: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: "var(--poster-bg-2)",
        border: "2px solid var(--poster-ink)",
        borderRadius: 14,
        boxShadow: "var(--poster-shadow-sm)",
        padding: 14,
        fontFamily: "var(--font-display)",
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: ".08em",
          color: "var(--poster-ink-3)",
          margin: "0 0 10px",
        }}
      >
        {title}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((g) => (
          <div key={g.title} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span
              style={{
                flexShrink: 0,
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: g.active ? "var(--poster-accent-soft)" : "var(--poster-ink-faint)",
                color: g.active ? "var(--poster-accent)" : "var(--poster-ink-3)",
                border: "1.5px solid var(--poster-ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 800,
                marginTop: 1,
              }}
            >
              ✓
            </span>
            <span style={{ fontSize: 12, color: "var(--poster-ink-2)", lineHeight: 1.4 }}>
              <span style={{ fontWeight: 800, color: "var(--poster-ink)" }}>{g.code}</span>
              <span style={{ marginLeft: 6 }}>{g.title}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span
            style={{
              flexShrink: 0,
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "var(--poster-ink)",
              color: "var(--poster-panel)",
              border: "2px solid var(--poster-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {i + 1}
          </span>
          <span
            style={{
              fontSize: 13,
              color: "var(--poster-ink-2)",
              paddingTop: 2,
              lineHeight: 1.5,
              fontFamily: "var(--font-display)",
            }}
          >
            {step}
          </span>
        </div>
      ))}
    </div>
  );
}

function NoteBlock({
  tone,
  label,
  children,
  meta,
}: {
  tone: "warning" | "info" | "success";
  label: string;
  children: React.ReactNode;
  meta?: string;
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: `var(--alert-${tone}-bg)`,
        border: `2px solid var(--alert-${tone}-border)`,
        borderLeftWidth: 4,
        borderRadius: 12,
        fontFamily: "var(--font-display)",
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: ".1em",
          color: `var(--alert-${tone}-text)`,
          margin: "0 0 6px",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 13,
          color: `var(--alert-${tone}-text)`,
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {children}
      </p>
      {meta && (
        <p style={{ fontSize: 10, color: `var(--alert-${tone}-text)`, opacity: 0.65, margin: "6px 0 0" }}>
          {meta}
        </p>
      )}
    </div>
  );
}

// ── ÖĞRENME KARTI slides ──────────────────────────────────────────────────────
function KartSlide1() {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-3">
        <MockDropdown label="Çalışma alanı" value="Dil — Söz Dönemi (2.2)" highlight />
        <MockDropdown label="Yaş grubu" value="3-6 yaş" highlight />
        <MockDropdown label="Zorluk" value="Kolay (başlangıç seviyesi)" />
        <MockDropdown label="Tanı türü" value="Dil Gelişim Gecikmesi" />
      </div>
      <div className="flex flex-col gap-4">
        <GoalChecklistCard
          title="Seçilen müfredat hedefi"
          items={[
            { code: "2.2.1", title: "Dili anlar (tek sözcük → cümle düzeyi)", active: true },
            { code: "2.2.3", title: "Sözcük dağarcığını genişletir", active: true },
          ]}
        />
        <SlideCtaButton href="/kayit?module=studio">✦ Öğrenme Kartı Üret</SlideCtaButton>
      </div>
    </div>
  );
}
function KartSlide2() {
  return (
    <div className="max-w-2xl" style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "var(--font-display)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <CarouselTag color="blue">Dil · Söz Dönemi</CarouselTag>
        <CarouselTag color="orange">3-6 yaş</CarouselTag>
        <CarouselTag color="green">Başlangıç</CarouselTag>
        <CarouselTag color="yellow">Dil Gelişim Gecikmesi</CarouselTag>
        <PBadge color="blue">Hedef 2.2.3</PBadge>
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--poster-ink)", letterSpacing: "-.01em", margin: 0 }}>
        Mutfak Keşfi — Sözcük Bulma Oyunu
      </h3>
      <p style={{ fontSize: 14, color: "var(--poster-ink-2)", lineHeight: 1.6, margin: 0 }}>
        Uzman, mutfak ortamındaki gerçek nesneleri kullanarak öğrencinin aktif sözcük dağarcığını genişletir.
        Öğrenci nesneleri keşfeder, adlandırır ve işlevlerini kendi cümleleriyle anlatır.
      </p>
      <StepList
        steps={[
          "Mutfaktan 6-8 tanıdık nesne seçin (bardak, kaşık, tabak, tencere, sünger, peçete)",
          "Her nesneyi sırayla göstererek \"Bu ne? Ne işe yarıyor?\" diye sorun",
          "Öğrenci bilmediğinde nesneyi tanımlayın, dokunmasını sağlayın ve adını 2 kez tekrarlayın",
          "Tüm nesneleri masaya dizin, \"Yemeği karıştıran nesneyi göster\" gibi işlev soruları sorun",
        ]}
      />
    </div>
  );
}
function KartSlide3() {
  return (
    <div className="max-w-2xl" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <NoteBlock tone="warning" label="UZMAN NOTU" meta="Hedef 2.2.3 — Sözcük dağarcığını genişletir">
        Tanıdık nesnelerle başlayın — ev ortamı en güçlü doğal bağlamdır. Öğrenci nesneye dokunabilmeli,
        koklayabilmeli; çoklu duyusal deneyim sözcük yerleşimini hızlandırır. &ldquo;Aferin&rdquo; yerine
        &ldquo;Bak, tencerenin ne işe yaradığını hatırladın!&rdquo; gibi süreci ön plana çıkaran geri bildirimler kullanın.
      </NoteBlock>
      <NoteBlock tone="info" label="GENELLEŞTİRME ÖNERİSİ">
        Veliden akşam yemeği hazırlığı sırasında 3-4 nesneyi öğrenciye isimlendirmesini istemesini isteyin.
        Günlük rutine gömülü tekrar, haftalık 2 seans kadar etkili olabilir.
      </NoteBlock>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <CarouselTag color="green">Çoklu duyusal</CarouselTag>
        <CarouselTag color="blue">Doğal bağlam</CarouselTag>
        <CarouselTag color="yellow">Günlük rutin</CarouselTag>
        <CarouselTag color="orange">Veli katılımı</CarouselTag>
      </div>
    </div>
  );
}
function KartSlide4() {
  return (
    <MockPdfCard
      header="Luden Özel Keşif · Nisan 2026"
      tags={<><CarouselTag color="blue">Dil · Söz Dönemi</CarouselTag><CarouselTag color="orange">3-6 yaş</CarouselTag><CarouselTag color="green">Başlangıç</CarouselTag><PBadge color="blue">Hedef 2.2.3</PBadge></>}
      rows={[
        { label: "ETKİNLİK", title: "Mutfak Keşfi — Sözcük Bulma Oyunu", body: "Mutfak ortamında 6-8 nesne ile sözcük dağarcığı genişletme — dokunsal keşif ve işlev adlandırma" },
        { label: "UYGULAMA", body: "Nesneleri sırayla göster → \"Bu ne? Ne işe yarıyor?\" sor → Bilmediğinde tanımla, dokundur, 2 kez tekrarlat → İşlev soruları sor" },
        { label: "UZMAN NOTU", body: "Çoklu duyusal deneyim sağlayın. Süreci ön plana çıkaran geri bildirimler kullanın. Veliden günlük rutinde tekrar isteyin." },
      ]}
      cta="MEB Talim Terbiye Kurulu müfredatına uygundur"
    />
  );
}

// ── ARTİKÜLASYON slides ───────────────────────────────────────────────────────
function ArtSlide1() {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-3">
        <MockDropdown label="Hedef fonem" value="/s/ — Sürtünmeli ünsüz" highlight />
        <MockDropdown label="Konum" value="Sözcük başı (initial)" highlight />
        <MockDropdown label="Yaş grubu" value="7-12 yaş" />
        <MockDropdown label="Zorluk seviyesi" value="Kelime Düzeyi" />
      </div>
      <div className="flex flex-col gap-4">
        <GoalChecklistCard
          title="Önerilen egzersiz türleri"
          items={[
            { code: "•", title: "Yalıtılmış ses tekrarı", active: true },
            { code: "•", title: "Hece düzeyi (sa, se, sı, so, su)", active: true },
            { code: "•", title: "Kelime düzeyi (10 sözcük)", active: true },
          ]}
        />
        <SlideCtaButton href="/kayit?module=studio">✦ Artikülasyon Kartı Üret</SlideCtaButton>
      </div>
    </div>
  );
}
function ArtSlide2() {
  return (
    <div className="max-w-2xl" style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "var(--font-display)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <CarouselTag color="blue">/s/ — Sürtünmeli ünsüz</CarouselTag>
        <CarouselTag color="orange">Sözcük başı</CarouselTag>
        <CarouselTag color="green">7-12 yaş · Kelime düzeyi</CarouselTag>
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--poster-ink)", letterSpacing: "-.01em", margin: 0 }}>
        /s/ Sesi Kelime Çalışması — Sözcük Başı
      </h3>
      <p style={{ fontSize: 14, color: "var(--poster-ink-2)", lineHeight: 1.6, margin: 0 }}>
        Hedef /s/ sesini sözcük başında doğru üretebilmek için 10 adet yaşa uygun Türkçe kelimeyle
        yapılandırılmış çalışma. Her kelime hece ayrımı ve örnek cümleyle birlikte sunulur.
      </p>
      <StepList
        steps={[
          "Ayna karşısında /s/ sesinin ağız pozisyonunu gösterin: dil ucu alt dişlerin arkasında, hava ortadan çıkar",
          "\"Sandal, sabun, süt, sepet, simit\" kelimelerini teker teker model olun, öğrenci tekrar etsin",
          "Her kelimeyi cümle içinde kullanın: \"Denizde mavi bir sandal var\" — öğrenci cümleyi tekrar etsin",
          "Zorlandığı kelimelerde heceye dönün: \"san-dal\" → tekrar birleştirin",
        ]}
      />
    </div>
  );
}
function ArtSlide3() {
  return (
    <div className="max-w-2xl" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <NoteBlock tone="warning" label="UZMAN NOTU" meta="/s/ · Sözcük başı pozisyon çalışması">
        /s/ sesinde dil ucu kontrolü kritiktir. Lateral kaçış (havanın yandan çıkması) varsa dil
        ortasından hava geçişini pekiştirin. Ayna kullanımı görsel geri bildirim sağlar. Her doğru
        üretimde &ldquo;Havanın ortadan çıkışını hissettin mi? Harika kontrol!&rdquo; gibi farkındalık
        temelli geri bildirimler verin.
      </NoteBlock>
      <NoteBlock tone="info" label="GENELLEŞTİRME ÖNERİSİ">
        Veliye 5 hedef kelime listesi verin (sabun, süt, simit, sandal, sepet). Öğrenci bu kelimeleri
        günlük konuşmada bilinçli kullanmaya çalışsın. Doğru üretimde velinin göz kontağı + gülümseme
        ile onaylaması yeterlidir.
      </NoteBlock>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <CarouselTag color="green">Dil ucu kontrolü</CarouselTag>
        <CarouselTag color="blue">Görsel geri bildirim</CarouselTag>
        <CarouselTag color="orange">Hece geçişi</CarouselTag>
        <CarouselTag color="yellow">5 kelime listesi</CarouselTag>
      </div>
    </div>
  );
}
function ArtSlide4() {
  return (
    <MockPdfCard
      header="Artikülasyon Kartı · Nisan 2026"
      tags={<><CarouselTag color="blue">/s/ Sürtünmeli</CarouselTag><CarouselTag color="orange">Sözcük başı</CarouselTag><CarouselTag color="green">7-12 yaş</CarouselTag><CarouselTag color="yellow">Kelime düzeyi</CarouselTag></>}
      rows={[
        { label: "HEDEF SES", title: "/s/ — Kelime Düzeyi Çalışması", body: "10 hedef kelime: sandal, sabun, süt, sepet, simit, sarı, soba, silgi, sosis, su" },
        { label: "UYGULAMA", body: "Ağız pozisyonu göster → kelime tekrarı → cümle içi kullanım → zorlanırsa heceye dön" },
        { label: "VELİ NOTU", body: "Günlük 5 dk, 5 hedef kelimeyi konuşmada kullandırın. Doğru üretimde göz kontağı + gülümseme yeterli." },
      ]}
      cta="MEB Talim Terbiye Kurulu müfredatına uygundur"
    />
  );
}

// ── EV ÖDEVİ slides ───────────────────────────────────────────────────────────
function ScheduleList({
  title,
  items,
  bulletColor = "var(--poster-accent)",
}: {
  title: string;
  items: string[];
  bulletColor?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: "var(--poster-bg-2)",
        border: "2px solid var(--poster-ink)",
        borderRadius: 14,
        boxShadow: "var(--poster-shadow-sm)",
        padding: 14,
        fontFamily: "var(--font-display)",
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: ".08em",
          color: "var(--poster-ink-3)",
          margin: "0 0 10px",
        }}
      >
        {title}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((d, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "var(--poster-ink-2)",
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: bulletColor,
              }}
            />
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}

function EvSlide1() {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-3">
        <MockDropdown label="Aktivite türü" value="Günlük Konuşma Aktivitesi" highlight />
        <MockDropdown label="Günlük süre" value="15 dakika" highlight />
        <MockDropdown label="Zorluk" value="Temel (teknik terim yok)" />
        <MockDropdown label="Hedef alan" value="Dil anlama ve üretme" />
      </div>
      <div className="flex flex-col gap-4">
        <ScheduleList
          title="Haftalık program"
          items={[
            "Pazartesi — Kahvaltı sırasında nesne adlandırma",
            "Çarşamba — Park yürüyüşünde renk + nesne tanımlama",
            "Cuma — Uyku öncesi resimli kitap anlatımı",
          ]}
        />
        <SlideCtaButton href="/kayit?module=studio">✦ Ev Ödevi Oluştur</SlideCtaButton>
      </div>
    </div>
  );
}
function EvSlide2() {
  return (
    <div className="max-w-2xl" style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "var(--font-display)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <CarouselTag color="blue">Günlük Konuşma Aktivitesi</CarouselTag>
        <CarouselTag color="orange">15 dk/gün</CarouselTag>
        <CarouselTag color="green">Temel seviye</CarouselTag>
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--poster-ink)", letterSpacing: "-.01em", margin: 0 }}>
        Kahvaltı Masasında Dil Oyunu
      </h3>
      <p style={{ fontSize: 14, color: "var(--poster-ink-2)", lineHeight: 1.6, margin: 0 }}>
        Günlük kahvaltı rutinini fırsat olarak kullanarak öğrencinin hem nesne adlandırma hem de cümle
        kurma becerilerini doğal ortamda güçlendiren bir aktivite. Öğrenci nesneleri adlandırır,
        tercihlerini ifade eder ve basit isteklerde bulunur.
      </p>
      <StepList
        steps={[
          "Kahvaltı masasındaki 5-6 nesneyi öğrencinin önüne koyun (çay bardağı, peynir, ekmek, bal, kaşık, tabak)",
          "Her nesneyi göstererek \"Bu ne?\" sorusunu sorun, ardından \"Ne yapmak için kullanıyoruz?\" diye genişletin",
          "\"Ne yemek istiyorsun?\" diyerek tercih cümlesi kurmayı teşvik edin: \"Ben peynir istiyorum\" gibi",
          "Sonuçları gözlem formuna not edin: hangi sözcükleri bildi, hangilerinde yardım gerekti",
        ]}
      />
    </div>
  );
}
function EvSlide3() {
  return (
    <div className="max-w-2xl" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <NoteBlock tone="warning" label="VELİ TALİMATI">
        Aktiviteyi her sabah kahvaltıda uygulayın — aynı saatte yapılan çalışma rutin oluşturur ve
        öğrenmeyi kolaylaştırır. Öğrenci sözcüğü hatırlayamazsa 3 saniye bekleyin, ardından sözcüğün
        ilk hecesini verin (&ldquo;pey...&rdquo; gibi). Tam cümle kurabildiğinde &ldquo;Bak, ne güzel
        söyledin, peynir istediğini anlattın!&rdquo; gibi süreç odaklı geri bildirim verin.
      </NoteBlock>
      <NoteBlock tone="info" label="UZMAN NOTU">
        Veli gözlem formunu bir sonraki seansta getirsin. Öğrencinin spontan kullandığı sözcükler ile
        modelleme sonrası tekrar ettiği sözcükleri ayrı not etmesi hedef güncellemesinde çok işe yarar.
      </NoteBlock>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <CarouselTag color="green">Doğal ortam</CarouselTag>
        <CarouselTag color="blue">Kahvaltı rutini</CarouselTag>
        <CarouselTag color="orange">Gözlem formu</CarouselTag>
        <CarouselTag color="yellow">Süreç geri bildirimi</CarouselTag>
      </div>
    </div>
  );
}
function EvSlide4() {
  return (
    <MockPdfCard
      header="Ev Ödevi · Nisan 2026"
      tags={<><CarouselTag color="blue">Günlük Konuşma</CarouselTag><CarouselTag color="orange">15 dk/gün</CarouselTag><CarouselTag color="green">Temel seviye</CarouselTag></>}
      rows={[
        { label: "ETKİNLİK", title: "Kahvaltı Masasında Dil Oyunu", body: "Günlük kahvaltı rutininde nesne adlandırma, tercih ifadesi ve basit istek cümlesi kurma çalışması" },
        { label: "VELİ TALİMATI", body: "Her sabah kahvaltıda 15 dk uygulayın. Hatırlayamazsa ilk heceyi verin. Süreç odaklı geri bildirim kullanın." },
        { label: "TAKİP", body: "Gözlem formuna hangi sözcükleri bildi/bilmedi yazın. Spontan ve model sonrası kullanımı ayrı not edin." },
      ]}
      cta="Veliye teslim edilmek üzere hazırlanmıştır"
    />
  );
}

// ── SESLETİM slides ───────────────────────────────────────────────────────────
function SesSlide1() {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-3">
        <MockDropdown label="Ses grubu" value="Ses Avı (sound_hunt)" highlight />
        <MockDropdown label="Egzersiz türü" value="/ş/ sesi — Çiftlik Teması" highlight />
        <MockDropdown label="Yaş grubu" value="5-8 yaş" />
        <MockDropdown label="Seviye" value="Kolay" />
      </div>
      <div className="flex flex-col gap-4">
        <GoalChecklistCard
          title="Seans hedefleri"
          items={[
            { code: "•", title: "Hedef sesi sahnede tanımlama", active: true },
            { code: "•", title: "Doğru/yanlış ses ayrımı yapma", active: true },
            { code: "•", title: "Sözcük düzeyinde üretim", active: false },
          ]}
        />
        <SlideCtaButton href="/kayit?module=studio">✦ Sesletim Kartı Üret</SlideCtaButton>
      </div>
    </div>
  );
}
function SesSlide2() {
  return (
    <div className="max-w-2xl" style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "var(--font-display)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <CarouselTag color="blue">Ses Avı</CarouselTag>
        <CarouselTag color="orange">/ş/ sesi</CarouselTag>
        <CarouselTag color="green">Çiftlik teması</CarouselTag>
        <CarouselTag color="yellow">5-8 yaş · Kolay</CarouselTag>
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--poster-ink)", letterSpacing: "-.01em", margin: 0 }}>
        Çiftlikte /ş/ Avı — Ses Bulma Oyunu
      </h3>
      <p style={{ fontSize: 14, color: "var(--poster-ink-2)", lineHeight: 1.6, margin: 0 }}>
        Çiftlik sahnesindeki nesneler arasında /ş/ sesi içerenleri bulma oyunu. Öğrenci resmi inceler,
        /ş/ sesli nesneleri işaretler ve her birini sesli olarak adlandırır.
      </p>
      <StepList
        steps={[
          "Çiftlik sahnesini öğrencinin önüne koyun: \"Bakalım bu çiftlikte /ş/ sesi saklanan nesneler var mı?\"",
          "Öğrenciden sahneyi incelemesini ve /ş/ sesi duyduğu nesneleri parmağıyla göstermesini isteyin",
          "Her bulunan nesneyi birlikte söyleyin: \"Şapka! Evet, /ş/ sesi var. Peki kuş? Kuş'ta da var mı?\"",
          "Bulunan nesneleri sayın: \"6 tanesini buldun! Bakalım kaçını cümle içinde söyleyebilirsin\"",
        ]}
      />
    </div>
  );
}
function SesSlide3() {
  return (
    <div className="max-w-2xl" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <NoteBlock tone="warning" label="UZMAN NOTU">
        Ses avı aktivitesinde öğrencinin kendi keşfetmesi kritiktir — cevabı söylemeyin, ipuçları
        verin. Yanlış cevaplarda &ldquo;Dinle: masa... /ş/ sesi var mı? Bir daha deneyelim&rdquo;
        gibi yönlendirin. Oyun bittiğinde bulunan nesnelerle kısa bir hikâye kurdurmak genellemeyi
        güçlendirir.
      </NoteBlock>
      <NoteBlock tone="info" label="GENELLEŞTİRME">
        Veliden evde &ldquo;ses dedektifi&rdquo; oyunu oynamasını isteyin: çocuk evdeki nesnelerde
        /ş/ sesini arar. Banyoda şampuan, şişe; mutfakta kaşık, şeker gibi. Günlük 5 dakika doğal
        ortamda ses farkındalığı çalışması seans verimliliğini artırır.
      </NoteBlock>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <CarouselTag color="green">Keşif odaklı</CarouselTag>
        <CarouselTag color="blue">Ses farkındalığı</CarouselTag>
        <CarouselTag color="orange">Oyun temelli</CarouselTag>
        <CarouselTag color="yellow">Ev dedektifi</CarouselTag>
      </div>
    </div>
  );
}
function SesSlide4() {
  return (
    <MockPdfCard
      header="Sesletim Kartı · Nisan 2026"
      tags={<><CarouselTag color="blue">Ses Avı</CarouselTag><CarouselTag color="orange">/ş/ sesi</CarouselTag><CarouselTag color="green">Çiftlik</CarouselTag><CarouselTag color="yellow">5-8 yaş</CarouselTag></>}
      rows={[
        { label: "EGZERSIZ", title: "Çiftlikte /ş/ Avı", body: "Çiftlik sahnesinde /ş/ sesi içeren nesneleri bulma: şapka, kuş, maşa, şişe, şeftali, çiş" },
        { label: "UYGULAMA", body: "Sahneyi incele → /ş/ sesli nesneleri göster → birlikte söyle → bulunanlarla cümle kur" },
        { label: "UZMAN NOTU", body: "Cevabı söylemeyin, keşfettirin. Yanlışta yönlendirin. Evde \"ses dedektifi\" oyunu önerin." },
      ]}
      cta="Konuşma ses bozukluğu çalışmalarında kullanılabilir"
    />
  );
}

// ── HEDEF TAKİP slides ────────────────────────────────────────────────────────
function HedefSlide1() {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-3">
        <MockDropdown label="Öğrenci" value="Ahmet Y. — 7 yaş" highlight />
        <MockDropdown label="Hedef kodu" value="2.2.3 Sözcük dağarcığı" highlight />
        <MockDropdown label="Dönem" value="2025-2026 / 2. Dönem" />
        <MockDropdown label="Ölçüm birimi" value="% doğru yanıt (10 deneme üzerinden)" />
      </div>
      <div className="flex flex-col gap-4">
        <ScheduleList
          title="Başlangıç kriterleri"
          bulletColor="var(--poster-blue)"
          items={[
            "Başlangıç: %30 doğru yanıt",
            "Kısa dönem hedef: %60",
            "Uzun dönem hedef: %80",
          ]}
        />
        <SlideCtaButton href="/kayit?module=studio">✦ Hedef Tablosu Oluştur</SlideCtaButton>
      </div>
    </div>
  );
}
function HedefSlide2() {
  const rows = [
    { tarih: "4 Mar", oran: 30, not: "Başlangıç ölçümü — 3/10 doğru" },
    { tarih: "11 Mar", oran: 40, not: "Nesne adlandırma başladı" },
    { tarih: "18 Mar", oran: 55, not: "Mutfak temalı çalışma etkili" },
    { tarih: "25 Mar", oran: 65, not: "Kısa dönem hedef aşıldı ✓" },
  ];
  return (
    <div className="max-w-2xl" style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "var(--font-display)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <CarouselTag color="blue">Ahmet Y.</CarouselTag>
        <CarouselTag color="orange">Hedef 2.2.3</CarouselTag>
        <CarouselTag color="green">2. Dönem</CarouselTag>
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--poster-ink)", letterSpacing: "-.01em", margin: 0 }}>
        İlerleme Tablosu — Sözcük Dağarcığı
      </h3>
      <div
        style={{
          background: "var(--poster-panel)",
          border: "2px solid var(--poster-ink)",
          borderRadius: 14,
          boxShadow: "var(--poster-shadow-sm)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "70px 1fr 1.2fr",
            background: "var(--poster-bg-2)",
            padding: "8px 14px",
            borderBottom: "2px solid var(--poster-ink)",
            fontSize: 10,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            color: "var(--poster-ink-3)",
            gap: 10,
          }}
        >
          <span>Tarih</span><span>Doğru %</span><span>Not</span>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.tarih}
            style={{
              display: "grid",
              gridTemplateColumns: "70px 1fr 1.2fr",
              padding: "10px 14px",
              borderTop: i === 0 ? "none" : "1px dashed var(--poster-ink-faint)",
              fontSize: 12,
              color: "var(--poster-ink-2)",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontWeight: 800, color: "var(--poster-ink)" }}>{r.tarih}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  height: 6,
                  background: "var(--poster-ink-faint)",
                  border: "1.5px solid var(--poster-ink)",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div style={{ height: "100%", width: `${r.oran}%`, background: "var(--poster-accent)" }} />
              </div>
              <span style={{ fontWeight: 800, color: "var(--poster-accent)", flexShrink: 0 }}>{r.oran}%</span>
            </div>
            <span>{r.not}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: "var(--poster-ink-3)", margin: 0 }}>
        Kısa dönem hedef (%60) 4. haftada aşıldı. Uzun dönem hedef: %80.
      </p>
    </div>
  );
}
function HedefSlide3() {
  return (
    <div className="max-w-2xl" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <NoteBlock tone="warning" label="DÖNEM ANALİZİ">
        Öğrenci 4 hafta içinde %30&rsquo;dan %65&rsquo;e ilerledi — haftalık ortalama %8.75 artış.
        Kısa dönem hedef olan %60 aşıldı. Mutfak temalı doğal ortam çalışmaları en yüksek ilerlemeyi
        sağladı (tek seansta %15 artış). Uzun dönem hedef %80 için tahmini 2 seans daha gerekli.
      </NoteBlock>
      <NoteBlock tone="info" label="SONRAKİ ADIM ÖNERİSİ">
        Sözcük dağarcığını cümle düzeyine taşımak için hedef 2.2.4&rsquo;e (basit cümleler kurar)
        geçiş planlanabilir. Ev ödevi frekansını haftada 3&rsquo;ten 5&rsquo;e çıkarmak ve doğal
        ortam çalışmalarını sürdürmek ilerleme hızını koruyacaktır.
      </NoteBlock>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <CarouselTag color="green">%35 ilerleme</CarouselTag>
        <CarouselTag color="blue">4 hafta</CarouselTag>
        <CarouselTag color="orange">Kısa hedef ✓</CarouselTag>
        <CarouselTag color="yellow">Doğal ortam etkisi</CarouselTag>
      </div>
    </div>
  );
}
function HedefSlide4() {
  return (
    <MockPdfCard
      header="Dönem Raporu · Nisan 2026"
      tags={<><CarouselTag color="blue">Ahmet Y. · 7 yaş</CarouselTag><CarouselTag color="orange">Hedef 2.2.3</CarouselTag><CarouselTag color="green">2. Dönem</CarouselTag></>}
      rows={[
        { label: "HEDEF", title: "Sözcük Dağarcığını Genişletir (2.2.3)", body: "Başlangıç: %30 (3/10) · Kısa dönem: %60 · Uzun dönem: %80 · Şu anki: %65" },
        { label: "SONUÇ", body: "4 hafta, %35 ilerleme. Kısa dönem hedef aşıldı. Doğal ortam çalışmaları en etkili yöntem. Uzun dönem hedefe tahmini 2 seans." },
        { label: "ÖNERİ", body: "Hedef 2.2.4'e (cümle kurma) geçiş planlanabilir. Ev ödevi sıklığı artırılmalı." },
      ]}
      cta="Veli ve okul dosyasına eklenebilir"
    />
  );
}

// ── TOOLS config ──────────────────────────────────────────────────────────────
const TOOLS_CONFIG = [
  {
    id: "kart",
    label: "Öğrenme Kartı",
    icon: Layers,
    headline: "Hedeflere özel öğrenme kartı",
    subtitle: "Alan, yaş grubu ve hedefi seçin — yapay zeka gerisini halleder",
    slides: [
      { title: "Parametreleri seç",   desc: "Alan, yaş grubu, tanı ve müfredat hedefini belirle", Panel: KartSlide1 },
      { title: "Kartı incele",        desc: "Yapay zeka MEB müfredatına uygun kart üretti",        Panel: KartSlide2 },
      { title: "Uzman notlarını gör", desc: "Uzman önerileri, genelleme ve veli notları eklendi",  Panel: KartSlide3 },
      { title: "PDF olarak indir",    desc: "Yazdırılabilir PDF — Pro plan ile indirilebilir",     Panel: KartSlide4 },
    ],
  },
  {
    id: "artikulasyon",
    label: "Artikülasyon",
    icon: Mic,
    headline: "Hedef foneme özel artikülasyon kartı",
    subtitle: "Sesi, konumu ve yaş grubunu seçin — egzersiz protokolü hazır",
    slides: [
      { title: "Fonem & konum seç",   desc: "Hedef ses, pozisyon ve yaş grubunu belirle",        Panel: ArtSlide1 },
      { title: "Egzersizi gör",       desc: "Adım adım artikülasyon protokolü oluşturuldu",       Panel: ArtSlide2 },
      { title: "Uzman ipuçları",      desc: "Motor planlama notları ve genelleme önerileri",       Panel: ArtSlide3 },
      { title: "PDF olarak indir",    desc: "Yazdırılabilir egzersiz kartı — Pro plan ile",        Panel: ArtSlide4 },
    ],
  },
  {
    id: "ev-odevi",
    label: "Ev Ödevi",
    icon: PenLine,
    headline: "Veliye teslim edilmeye hazır ev ödevi",
    subtitle: "Aktivite türü ve hedefi seçin — veli rehberi otomatik oluşturulsun",
    slides: [
      { title: "Aktivite & süre seç", desc: "Ödev türünü, günlük süreyi ve hedef alanı belirle", Panel: EvSlide1 },
      { title: "Ödevi incele",        desc: "Adım adım uygulama talimatları hazırlandı",          Panel: EvSlide2 },
      { title: "Veli talimatları",    desc: "Veli rehberi ve uzman notları eklendi",               Panel: EvSlide3 },
      { title: "PDF olarak indir",    desc: "Veliye teslim hazır ödev formu — Pro plan ile",      Panel: EvSlide4 },
    ],
  },
  {
    id: "sesletim",
    label: "Sesletim",
    icon: Music,
    headline: "Nefes ve rezonans egzersiz kartı",
    subtitle: "Sesi, konumu ve yaş grubunu seçin — egzersiz protokolü hazır",
    slides: [
      { title: "Ses & egzersiz seç",  desc: "Ses grubunu, egzersiz türünü ve seviyeyi belirle",  Panel: SesSlide1 },
      { title: "Protokolü gör",       desc: "Adım adım sesletim egzersiz protokolü oluşturuldu", Panel: SesSlide2 },
      { title: "Terapi ipuçları",     desc: "Uzman notları ve genelleme önerileri eklendi",       Panel: SesSlide3 },
      { title: "PDF olarak indir",    desc: "Yazdırılabilir sesletim kartı — Pro plan ile",       Panel: SesSlide4 },
    ],
  },
  {
    id: "hedef",
    label: "Hedef Takip",
    icon: BarChart3,
    headline: "Dönem boyunca hedef takip tablosu",
    subtitle: "Öğrenci ve hedef kodunu seçin — ilerleme tablosu ve rapor hazır",
    slides: [
      { title: "Öğrenci & hedef seç", desc: "Öğrenci, hedef kodu ve dönem bilgisini gir",        Panel: HedefSlide1 },
      { title: "Tabloyu gör",         desc: "İlerleme verileri tabloda görselleştirildi",         Panel: HedefSlide2 },
      { title: "Analiz & öneriler",   desc: "Dönem analizi ve sonraki adım önerileri oluşturuldu",Panel: HedefSlide3 },
      { title: "Rapor olarak indir",  desc: "Veli ve okul dosyasına eklenebilir rapor",           Panel: HedefSlide4 },
    ],
  },
];

function HowItWorksCarousel() {
  const [activeTool, setActiveTool] = useState(0);
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const currentTool = TOOLS_CONFIG[activeTool];
  const slides = currentTool.slides;
  const count = slides.length;

  const switchTool = (i: number) => {
    setActiveTool(i);
    setActive(0);
    setDirection(1);
  };

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setDirection(1);
      setActive((p) => (p + 1) % count);
    }, 4000);
    return () => clearInterval(id);
  }, [paused, count, activeTool]);

  const goTo = (i: number) => {
    setDirection(i > active ? 1 : -1);
    setActive(i);
  };

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  const { Panel } = slides[active];

  return (
    <section ref={sectionRef} id="features" className="px-4 md:px-6" style={{ background: "var(--poster-bg)", padding: "56px 16px 72px", fontFamily: "var(--font-display)" }}>
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".2em", color: "var(--poster-accent)", marginBottom: 12 }}>NASIL ÇALIŞIR</p>
          <AnimatePresence mode="wait">
            <motion.h2
              key={`h-${activeTool}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              style={{ fontSize: "clamp(24px, 6vw, 36px)", fontWeight: 700, color: "var(--poster-ink)", marginBottom: 8, letterSpacing: "-.02em", lineHeight: 1.1 }}
            >
              {currentTool.headline}
            </motion.h2>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.p
              key={`p-${activeTool}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ fontSize: 15, color: "var(--poster-ink-2)" }}
            >
              {currentTool.subtitle}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-2 mb-8"
        >
          {FEATURE_PILLS.map((pill) => (
            <span
              key={pill.label}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                border: "2px solid var(--poster-ink)",
                background: "var(--poster-panel)",
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--poster-ink)",
              }}
            >
              <span style={{ color: "var(--poster-accent)", display: "inline-flex" }}>{pill.icon}</span>
              {pill.label}
            </span>
          ))}
        </motion.div>

        {/* Tool tab bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
        >
          {TOOLS_CONFIG.map((tool, i) => {
            const isActive = i === activeTool;
            const ToolIcon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => switchTool(i)}
                style={{
                  display: "inline-flex",
                  flexShrink: 0,
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 999,
                  padding: "8px 16px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-display)",
                  border: "2px solid var(--poster-ink)",
                  background: isActive ? "var(--poster-accent)" : "var(--poster-panel)",
                  color: isActive ? "#fff" : "var(--poster-ink)",
                  boxShadow: isActive ? "0 3px 0 var(--poster-ink)" : "none",
                  transition: "transform .1s, box-shadow .1s",
                }}
              >
                <span style={{ display: "inline-flex" }}><ToolIcon size={16} aria-hidden /></span>
                <span>{tool.label}</span>
              </button>
            );
          })}
        </motion.div>

        <div className="flex gap-6">
          {/* Left — Step indicators */}
          <div className="hidden md:flex flex-col gap-2 pt-4 shrink-0 w-48">
            {slides.map((slide, i) => {
              const isActive = i === active;
              return (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    borderRadius: 14,
                    padding: 12,
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "var(--font-display)",
                    border: isActive ? "2px solid var(--poster-ink)" : "2px solid transparent",
                    background: isActive ? "var(--poster-panel)" : "transparent",
                    boxShadow: isActive ? "0 4px 0 var(--poster-ink)" : "none",
                    transition: "all .15s",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      height: 28,
                      width: 28,
                      flexShrink: 0,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 8,
                      border: "2px solid var(--poster-ink)",
                      fontSize: 12,
                      fontWeight: 700,
                      background: isActive ? "var(--poster-accent)" : "var(--poster-yellow)",
                      color: isActive ? "#fff" : "var(--poster-ink)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: isActive ? "var(--poster-ink)" : "var(--poster-ink-2)",
                        margin: 0,
                      }}
                    >
                      {slide.title}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: isActive ? "var(--poster-ink-2)" : "var(--poster-ink-3)",
                        marginTop: 2,
                        lineHeight: 1.4,
                      }}
                    >
                      {slide.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right — Slide panel */}
          <div
            className="relative flex-1 overflow-hidden"
            style={{
              background: "var(--poster-panel)",
              borderRadius: 20,
              border: "2px solid var(--poster-ink)",
              boxShadow: "0 6px 0 var(--poster-ink)",
            }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 z-10" style={{ height: 3, background: "var(--poster-ink-faint)" }}>
              <motion.div
                style={{ height: "100%", background: "var(--poster-accent)" }}
                animate={{ width: `${((active + 1) / count) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>

            {/* Animated slide */}
            <div className="px-7 pt-8 pb-4 md:px-10 md:pt-10 min-h-[420px] md:min-h-[480px] flex flex-col justify-start overflow-y-auto relative">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={`${activeTool}-${active}`}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                >
                  <Panel />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom bar — mobile nav */}
            <div className="flex items-end justify-between gap-4 px-7 pb-6 md:px-10 md:pb-8">
              <div className="md:hidden">
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--poster-ink)", margin: 0 }}>{slides[active].title}</p>
                <p style={{ fontSize: 12, color: "var(--poster-ink-3)", marginTop: 2 }}>{slides[active].desc}</p>
              </div>
              <div className="hidden md:block" />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setDirection(-1); setActive((a) => (a - 1 + count) % count); }}
                  aria-label="Önceki"
                  style={{
                    height: 36,
                    width: 36,
                    flexShrink: 0,
                    borderRadius: 10,
                    background: "var(--poster-panel)",
                    border: "2px solid var(--poster-ink)",
                    boxShadow: "0 3px 0 var(--poster-ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--poster-ink)",
                    cursor: "pointer",
                  }}
                >
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    aria-label={`Slayt ${i + 1}`}
                    style={{
                      height: 10,
                      width: i === active ? 28 : 10,
                      borderRadius: 999,
                      border: "2px solid var(--poster-ink)",
                      background: i === active ? "var(--poster-accent)" : "var(--poster-panel)",
                      transition: "all .25s",
                      cursor: "pointer",
                    }}
                  />
                ))}
                <button
                  onClick={() => { setDirection(1); setActive((a) => (a + 1) % count); }}
                  aria-label="Sonraki"
                  style={{
                    height: 36,
                    width: 36,
                    flexShrink: 0,
                    borderRadius: 10,
                    background: "var(--poster-panel)",
                    border: "2px solid var(--poster-ink)",
                    boxShadow: "0 3px 0 var(--poster-ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--poster-ink)",
                    cursor: "pointer",
                  }}
                >
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Feature pills (shown inside HowItWorks section) ─────────────────────────
const FEATURE_PILLS = [
  { icon: <Sparkles size={13} />, label: "AI destekli üretim" },
  { icon: <Users size={13} />, label: "Öğrenci yönetimi" },
  { icon: <FileDown size={13} />, label: "PDF indirme" },
  { icon: <Target size={13} />, label: "MEB müfredatı uyumlu" },
  { icon: <Lock size={13} />, label: "Güvenli & özel" },
];


// ─── FAQ Section ──────────────────────────────────────────────────────────────
function FaqSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      id="faq"
      style={{ background: "var(--poster-bg)", padding: "56px 16px 72px" }}
    >
      <div className="mx-auto max-w-2xl" style={{ padding: "0 8px" }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 40 }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".2em",
              color: "var(--poster-accent)",
              marginBottom: 12,
              fontFamily: "var(--font-display)",
            }}
          >
            SSS
          </p>
          <h2
            style={{
              fontSize: "clamp(26px, 7vw, 40px)",
              fontWeight: 700,
              color: "var(--poster-ink)",
              marginBottom: 12,
              fontFamily: "var(--font-display)",
              letterSpacing: "-.02em",
              lineHeight: 1.05,
            }}
          >
            Sık sorulan sorular
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "var(--poster-ink-2)",
              fontFamily: "var(--font-display)",
            }}
          >
            Aklınızdaki soruların cevabı burada.
          </p>
        </motion.div>
        <FaqAccordion />

        {/* CTA below FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{
            marginTop: 40,
            background: "#fff",
            border: "2px solid var(--poster-ink)",
            boxShadow: "0 6px 0 var(--poster-ink)",
            borderRadius: 20,
            padding: "28px 24px",
            textAlign: "center",
            fontFamily: "var(--font-display)",
          }}
        >
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--poster-ink)", marginBottom: 4 }}>
            Sorunuzu bulamadınız mı?
          </p>
          <p style={{ fontSize: 13, color: "var(--poster-ink-3)", marginBottom: 20 }}>
            Bize yazın, en kısa sürede yanıt verelim.
          </p>
          <a
            href="mailto:info@ludenlab.com"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--poster-ink)",
              color: "#fff",
              padding: "12px 22px",
              borderRadius: 14,
              border: "2px solid var(--poster-ink)",
              boxShadow: "0 4px 0 #000",
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
              fontFamily: "var(--font-display)",
            }}
          >
            <Mail size={16} strokeWidth={2} />
            Bize Yazın
          </a>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
const CREDIT_NOTE = "Her öğrenme kartı veya eğitim profili 20 kredi harcar. Krediler dönem başında yüklenir.";

const PLANS: PricingPlan[] = [
  {
    name: "Free",
    price: 0,
    yearlyPrice: 0,
    period: "ay",
    description: "Başlamak için ideal",
    features: [
      "2 öğrenci",
      "40 başlangıç kredisi",
      "Kart üretimi: 20 kredi",
      "PDF indirme yok",
    ],
    buttonText: "Hemen Başla",
    href: "/kayit?module=studio",
    isPopular: false,
  },
  {
    name: "Pro",
    price: 449,
    yearlyPrice: 4579.80,
    period: "ay",
    yearlyPeriod: "yıl",
    description: "Bireysel terapistler için",
    features: [
      "200 öğrenci",
      "2.000 kredi / dönem",
      "Kart üretimi: 20 kredi",
      "Eğitim profili: 20 kredi",
      "PDF indirme ✓",
    ],
    buttonText: "Satın Al",
    href: "/kayit?module=studio",
    isPopular: true,
  },
  {
    name: "Advanced",
    price: 1999,
    yearlyPrice: 20389.80,
    period: "ay",
    yearlyPeriod: "yıl",
    description: "Yoğun çalışan uzmanlar için",
    features: [
      "Sınırsız öğrenci",
      "10.000 kredi / dönem",
      "Kart üretimi: 20 kredi",
      "Eğitim profili: 20 kredi",
      "PDF indirme ✓",
    ],
    buttonText: "Satın Al",
    href: "/kayit?module=studio",
    isPopular: false,
  },
  {
    name: "Enterprise",
    price: null,
    yearlyPrice: null,
    period: "",
    description: "Klinikler ve kurumlar için",
    features: [
      "Sınırsız öğrenci",
      "Özel kredi paketi",
      "Tüm özellikler",
      "PDF indirme ✓",
      "Öncelikli destek",
    ],
    buttonText: "İletişime Geç",
    href: "mailto:info@ludenlab.com",
    isPopular: false,
    customPriceLabel: "İletişim",
  },
];

// ─── (Sosyal kanıt bandı kaldırıldı: gerçek veri olmadan istatistik yayınlamak
//      yanıltıcı reklam riski oluşturuyordu. Yerine müfredat/aydınlatma alanında
//      gerçek müşteri yorumu eklenecek.)

// ─── Landing Page ─────────────────────────────────────────────────────────────
export function StudioLanding() {
  return (
    <div className="poster-scope" style={{ minHeight: "100vh" }}>
      <ForceLightTheme />
      <PosterHeader />

      {/* ── Hero ── */}
      <PosterHero />

      {/* ── How It Works ── */}
      <HowItWorksCarousel />


      {/* ── Pricing ── */}
      <section id="pricing" style={{ background: "var(--poster-bg-2)", borderTop: "2px solid var(--poster-ink)", borderBottom: "2px solid var(--poster-ink)" }}>
        <Pricing plans={PLANS} creditNote={CREDIT_NOTE} />
        <PaymentBadge style={{ padding: "0 16px 48px" }} />
      </section>

      {/* ── FAQ ── */}
      <FaqSection />

      {/* ── Footer ── */}
      <PosterFooter />
    </div>
  );
}
