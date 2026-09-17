import React from "react";
import { Img, staticFile } from "remotion";
import {
  BookOpen,
  CalendarRange,
  ClipboardCheck,
  FileText,
  Home,
  LayoutGrid,
  Mail,
  MessageSquareText,
  Puzzle,
  Shapes,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  Volume2,
  Wand2,
  Calculator,
  CalendarDays,
  HeartHandshake,
  ListChecks,
  BookOpenText,
} from "lucide-react";
import { colors, fonts } from "../brand";
import { Deco, Headline, Hi, PAD, PostFrame, type Product, accentOf } from "./kit";
import { Label, Sub, UiCard } from "./Posts";

/* ——— ortak parçalar ——— */

const img = (w: string) => staticFile(`real/p45/${w}.png`);

/** HTML ile çizilmiş belge maketi: ürünün PDF başlığına benzer üst şerit + bölümler. */
const Doc: React.FC<{
  product: Product;
  kind: string;
  title: string;
  style?: React.CSSProperties;
  rotate?: number;
  children: React.ReactNode;
}> = ({ product, kind, title, style, rotate = 0, children }) => (
  <div
    style={{
      position: "absolute",
      background: colors.white,
      border: `3px solid ${colors.ink}`,
      borderRadius: 16,
      boxShadow: `14px 14px 0 ${colors.ink}`,
      padding: "30px 36px",
      transform: `rotate(${rotate}deg)`,
      overflow: "hidden",
      ...style,
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 14, borderBottom: `4px solid ${accentOf(product)}` }}>
      <span style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 26 }}>
        Luden<span style={{ color: colors.orange }}>Lab</span>
        <span style={{ color: accentOf(product), marginLeft: 8 }}>{product === "ATÖLYE" ? "Atölye" : "Studio"}</span>
      </span>
      <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 18, color: colors.gray }}>{kind}</span>
    </div>
    <div style={{ fontFamily: fonts.body, fontWeight: 900, fontSize: 34, color: colors.ink, margin: "18px 0 6px", lineHeight: 1.15 }}>{title}</div>
    {children}
  </div>
);

const H: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = colors.gray }) => (
  <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 17, letterSpacing: 2.5, color, margin: "18px 0 8px" }}>{children}</div>
);

const P: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 21, style }) => (
  <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: size, lineHeight: 1.4, color: colors.ink, ...style }}>{children}</div>
);

const Bullet: React.FC<{ children: React.ReactNode; color: string; n?: number }> = ({ children, color, n }) => (
  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 8 }}>
    <span
      style={{
        flexShrink: 0,
        width: n ? 30 : 12,
        height: n ? 30 : 12,
        marginTop: n ? 0 : 8,
        borderRadius: 99,
        background: n ? `${color}22` : color,
        color,
        fontFamily: fonts.body,
        fontWeight: 900,
        fontSize: 17,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {n ?? ""}
    </span>
    <P>{children}</P>
  </div>
);

const Callout: React.FC<{ title: string; bg: string; fg: string; children: React.ReactNode }> = ({ title, bg, fg, children }) => (
  <div style={{ background: bg, borderLeft: `6px solid ${fg}`, borderRadius: 10, padding: "12px 18px", marginTop: 14 }}>
    <div style={{ fontFamily: fonts.body, fontWeight: 900, fontSize: 19, color: fg, marginBottom: 4 }}>{title}</div>
    <P size={19} style={{ color: colors.ink }}>
      {children}
    </P>
  </div>
);

const Head2: React.FC<{ product: Product; l1: React.ReactNode; l2: React.ReactNode; sub: React.ReactNode; size?: number }> = ({ product, l1, l2, sub, size }) => (
  <>
    <Headline size={size} style={{ position: "absolute", top: 170, left: PAD }}>
      {l1}
      <br />
      <Hi color={accentOf(product)}>{l2}</Hi>
    </Headline>
    <Sub top={380}>{sub}</Sub>
  </>
);

/* ——— 7: Studio araç haritası ——— */

const STUDIO_TOOLS: { group: string; items: { name: string; Icon: React.FC<{ size?: number; strokeWidth?: number; color?: string }> }[] }[] = [
  {
    group: "Üretici",
    items: [
      { name: "Öğrenme Kartı", Icon: FileText },
      { name: "Sosyal Hikaye", Icon: BookOpen },
      { name: "Artikülasyon Alıştırması", Icon: Volume2 },
      { name: "Ev Ödevi Materyali", Icon: Home },
    ],
  },
  {
    group: "Organizatör",
    items: [
      { name: "Haftalık Çalışma Planı", Icon: CalendarRange },
      { name: "Hedef Takip Tablosu", Icon: Target },
      { name: "Oturum Özeti", Icon: ClipboardCheck },
    ],
  },
  {
    group: "Aktiviteler",
    items: [
      { name: "Kelime Eşleştirme", Icon: Puzzle },
      { name: "Sesletim", Icon: Sparkles },
      { name: "İletişim Panosu", Icon: LayoutGrid },
    ],
  },
];

const ToolMap: React.FC<{ product: Product; groups: typeof STUDIO_TOOLS; top: number; tile?: number }> = ({ product, groups, top, tile = 72 }) => {
  const accent = accentOf(product);
  return (
    <div style={{ position: "absolute", top, left: PAD, right: PAD, display: "flex", flexDirection: "column", gap: 22 }}>
      {groups.map((g, gi) => (
        <div key={g.group}>
          <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 22, letterSpacing: 3, color: colors.gray, marginBottom: 10 }}>
            {g.group.toLocaleUpperCase("tr")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {g.items.map(({ name, Icon }, i) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  background: (gi + i) % 3 === 0 ? accent : colors.white,
                  color: (gi + i) % 3 === 0 ? colors.white : colors.ink,
                  border: `3px solid ${colors.ink}`,
                  boxShadow: `6px 6px 0 ${colors.ink}`,
                  borderRadius: 18,
                  padding: "12px 20px 12px 12px",
                  height: tile,
                  boxSizing: "border-box",
                  fontFamily: fonts.body,
                  fontWeight: 700,
                  fontSize: 27,
                }}
              >
                <span
                  style={{
                    width: tile - 26,
                    height: tile - 26,
                    borderRadius: 12,
                    background: (gi + i) % 3 === 0 ? colors.white : `${accent}22`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={28} strokeWidth={2.4} color={accent} />
                </span>
                {name}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const P7StudioAraclar: React.FC = () => (
  <PostFrame product="STUDIO">
    <Headline size={96} style={{ position: "absolute", top: 170, left: PAD }}>
      <Hi color={colors.studioBlue}>10 araç,</Hi>
      <br />
      tek masada.
    </Headline>
    <Sub top={380}>Dil ve konuşma alanında çalışan uzmanlar için üretici, organizatör ve aktivite araçları.</Sub>
    <ToolMap product="STUDIO" groups={STUDIO_TOOLS} top={530} tile={78} />
    <Deco items={[{ x: 990, y: 240, size: 80, kind: "ring", color: colors.orange }]} />
  </PostFrame>
);

/* ——— 8: İletişim Panosu ——— */

const BOARD = [
  { w: "Yemek", f: "yemek", s: "Yemek istiyorum" },
  { w: "Tuvalet", f: "tuvalet", s: "Tuvalete gitmek istiyorum" },
  { w: "Uyku", f: "yatak", s: "Uyumak istiyorum" },
  { w: "Top", f: "top", s: "Top oynamak istiyorum" },
  { w: "Kitap", f: "kitap", s: "Kitap okuyalım" },
  { w: "Elma", f: "elma", s: "Elma istiyorum" },
  { w: "Muz", f: "muz", s: "Muz istiyorum" },
  { w: "Simit", f: "simit", s: "Simit istiyorum" },
  { w: "Araba", f: "araba", s: "Araba ile oynayalım" },
];

export const P8IletisimPanosu: React.FC = () => (
  <PostFrame product="STUDIO">
    <Head2 product="STUDIO" l1="Sözcükler yetmediğinde," l2="resimler konuşsun." size={84} sub="Temel ihtiyaçlar, duygular, rutinler: görselli iletişim panosu, uzman notları ve veli rehberiyle." />
    <div
      style={{
        position: "absolute",
        left: 150,
        top: 540,
        width: 780,
        background: colors.white,
        border: `3px solid ${colors.ink}`,
        borderRadius: 24,
        boxShadow: `14px 14px 0 ${colors.ink}`,
        padding: 22,
        transform: "rotate(-1.5deg)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontFamily: fonts.body, fontWeight: 900, fontSize: 30 }}>Temel İhtiyaçlarım</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {BOARD.map((c, i) => (
          <div
            key={c.w}
            style={{
              border: `4px solid ${i === 3 ? colors.studioBlue : "#e8c547"}`,
              background: i === 3 ? "#eef5fd" : "#fffbea",
              borderRadius: 16,
              padding: "8px 8px 6px",
              textAlign: "center",
            }}
          >
            <Img src={img(c.f)} style={{ width: 150, height: 112, objectFit: "contain", display: "block", margin: "0 auto" }} />
            <div style={{ fontFamily: fonts.body, fontWeight: 900, fontSize: 28, color: colors.ink }}>{c.w}</div>
          </div>
        ))}
      </div>
    </div>
    <UiCard rotate={3} style={{ left: 560, top: 495, padding: "12px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: fonts.body, fontWeight: 700, fontSize: 28 }}>
        <MessageSquareText size={32} color={colors.studioBlue} strokeWidth={2.5} />
        “Top oynamak istiyorum.”
      </div>
    </UiCard>
  </PostFrame>
);

/* ——— 9: Sesletim tombalası ——— */

const BINGO = [
  { w: "sandalye", s: true },
  { w: "kedi", s: false },
  { w: "saat", s: true },
  { w: "top", s: false },
  { w: "simit", s: true },
  { w: "elma", s: false },
  { w: "sepet", s: true },
  { w: "muz", s: false },
  { w: "masa", s: true },
];

export const P9Sesletim: React.FC = () => (
  <PostFrame product="STUDIO">
    <Head2 product="STUDIO" l1="Ses çalışması," l2="oyuna dönsün." sub="Hedef sesi seç; ses avı, tombala, yılan merdiven ya da labirent olarak hazırlansın." />
    <div
      style={{
        position: "absolute",
        left: PAD,
        top: 540,
        width: 690,
        background: colors.white,
        border: `3px solid ${colors.ink}`,
        borderRadius: 24,
        boxShadow: `14px 14px 0 ${colors.ink}`,
        padding: 22,
        transform: "rotate(-2deg)",
      }}
    >
      <div style={{ fontFamily: fonts.body, fontWeight: 900, fontSize: 30, marginBottom: 14 }}>
        /s/ Tombalası <span style={{ color: colors.gray, fontWeight: 500, fontSize: 22 }}>· içinde /s/ olanı işaretle</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {BINGO.map((c) => (
          <div key={c.w} style={{ position: "relative", border: `3px solid ${colors.ink}`, borderRadius: 14, padding: 6, textAlign: "center", background: colors.white }}>
            <Img src={img(c.w)} style={{ width: 150, height: 120, objectFit: "contain", display: "block", margin: "0 auto" }} />
            <div style={{ fontFamily: fonts.body, fontWeight: 900, fontSize: 26 }}>{c.w}</div>
            {c.s ? (
              <div
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 46,
                  height: 46,
                  borderRadius: 99,
                  background: colors.orange,
                  border: `3px solid ${colors.ink}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Star size={26} color={colors.white} fill={colors.white} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
    <UiCard rotate={4} style={{ left: 700, top: 700, width: 300 }}>
      <Label>HEDEF SES</Label>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 90, color: colors.studioBlue, lineHeight: 1 }}>/s/</div>
      <div style={{ height: 14 }} />
      <Label>OYUN</Label>
      {["Ses avı", "Tombala", "Yılan merdiven", "Ses labirenti"].map((o) => (
        <div
          key={o}
          style={{
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 24,
            padding: "7px 14px",
            marginBottom: 7,
            borderRadius: 12,
            border: `2.5px solid ${colors.ink}`,
            background: o === "Tombala" ? colors.studioBlue : colors.white,
            color: o === "Tombala" ? colors.white : colors.ink,
          }}
        >
          {o}
        </div>
      ))}
    </UiCard>
  </PostFrame>
);

/* ——— 10: Kelime Eşleştirme ——— */

const PAIRS = [
  { a: "kedi", b: "Miyavlayan ev hayvanı", to: 2 },
  { a: "saat", b: "Zamanı gösterir", to: 0 },
  { a: "araba", b: "Yolda giden taşıt", to: 3 },
  { a: "muz", b: "Sarı kabuklu meyve", to: 1 },
];

export const P10Eslestirme: React.FC = () => {
  const rowH = 158;
  const top = 560;
  const rights = [PAIRS[1], PAIRS[3], PAIRS[0], PAIRS[2]];
  return (
    <PostFrame product="STUDIO">
      <Head2 product="STUDIO" l1="Kelime dağarcığı," l2="eşleşe eşleşe." sub="Eş anlam, zıt anlam, tanım, kategori ya da görsel: seviyesine göre eşleştirme kartları." />
      <svg style={{ position: "absolute", left: 0, top: 0 }} width={1080} height={1350}>
        {PAIRS.map((p, i) => {
          const j = rights.indexOf(p);
          const y1 = top + i * rowH + 64;
          const y2 = top + j * rowH + 64;
          return (
            <path
              key={p.a}
              d={`M 370 ${y1} C 470 ${y1}, 520 ${y2}, 600 ${y2}`}
              stroke={i === 3 ? colors.lightBlueText : colors.orange}
              strokeWidth={8}
              strokeDasharray={i === 3 ? "4 16" : undefined}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
      </svg>
      {PAIRS.map((p, i) => (
        <div
          key={p.a}
          style={{
            position: "absolute",
            left: PAD,
            top: top + i * rowH,
            width: 290,
            height: 128,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: colors.white,
            border: `3px solid ${colors.ink}`,
            borderRadius: 18,
            boxShadow: `6px 6px 0 ${colors.ink}`,
            padding: "0 16px 0 8px",
            boxSizing: "border-box",
          }}
        >
          <Img src={img(p.a)} style={{ width: 110, height: 110, objectFit: "contain" }} />
          <span style={{ fontFamily: fonts.body, fontWeight: 900, fontSize: 32 }}>{p.a}</span>
        </div>
      ))}
      {rights.map((p, j) => {
        const done = p !== PAIRS[3];
        return (
          <div
            key={p.b}
            style={{
              position: "absolute",
              left: 600,
              top: top + j * rowH,
              width: 404,
              height: 128,
              display: "flex",
              alignItems: "center",
              background: done ? "#eef5fd" : colors.white,
              border: `3px solid ${colors.ink}`,
              borderRadius: 18,
              boxShadow: `6px 6px 0 ${colors.ink}`,
              padding: "0 22px",
              boxSizing: "border-box",
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: 28,
              lineHeight: 1.2,
            }}
          >
            {p.b}
          </div>
        );
      })}
    </PostFrame>
  );
};

/* ——— 11: Ev Ödevi Materyali ——— */

export const P11EvOdevi: React.FC = () => (
  <PostFrame product="STUDIO">
    <Head2 product="STUDIO" l1="Seans bitti," l2="çalışma evde sürsün." size={86} sub="Veliye adım adım yol gösteren ev egzersizi: süre, malzeme, dikkat edilecekler ve kutlama anı." />
    <Doc product="STUDIO" kind="Ev Ödevi Materyali" title="Banyo Vakti /s/ Avı" rotate={-2} style={{ left: 120, top: 560, width: 700, height: 640 }}>
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        {["10 dakika", "Günlük etkinlik", "Günde 1 kez"].map((t) => (
          <span key={t} style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 18, background: "#eef5fd", color: colors.studioBlue, padding: "5px 12px", borderRadius: 99 }}>
            {t}
          </span>
        ))}
      </div>
      <H>ADIMLAR</H>
      <Bullet n={1} color={colors.studioBlue}>Banyoda /s/ ile başlayan eşyaları birlikte bulun: sabun, sünger, su.</Bullet>
      <Bullet n={2} color={colors.studioBlue}>Her eşyanın adını önce siz uzatarak söyleyin: “sssabun”.</Bullet>
      <Bullet n={3} color={colors.studioBlue}>Çocuğunuz tekrar ettiğinde eşyayı sepete koysun.</Bullet>
      <Callout title="Dikkat edin" bg="#fff7e0" fg={colors.amber}>
        Dil ucu dişlerin arasından çıkıyorsa düzeltmeyin; sesi yeniden siz modelleyin.
      </Callout>
      <Callout title="Kutlama anı" bg="#e7f5ef" fg={colors.green}>
        Sepet dolunca birlikte sayın ve emeğini adıyla fark edin.
      </Callout>
    </Doc>
    <div style={{ position: "absolute", left: 790, top: 1000, transform: "rotate(8deg)" }}>
      <div style={{ background: colors.white, border: `3px solid ${colors.ink}`, borderRadius: 20, boxShadow: `8px 8px 0 ${colors.ink}`, padding: 10 }}>
        <Img src={img("sepet")} style={{ width: 170, height: 150, objectFit: "contain", display: "block" }} />
      </div>
    </div>
    <Deco items={[{ x: 960, y: 620, size: 90, kind: "circle", color: colors.orange }]} />
  </PostFrame>
);

/* ——— 12: Oturum Özeti ——— */

const GOALS = [
  { g: "/s/ sesini kelime başında üretir", acc: 75, cue: "Görsel ipucu" },
  { g: "İki sözcüklü istek cümlesi kurar", acc: 60, cue: "Sözel model" },
  { g: "Sırayla konuşma kuralına uyar", acc: 90, cue: "İpucusuz" },
];

export const P12OturumOzeti: React.FC = () => (
  <PostFrame product="STUDIO">
    <Head2 product="STUDIO" l1="Seans notların," l2="derli toplu." sub="Hedef bazında başarı ve ipucu düzeyi, sonraki seans planı ve veliye sade bir özet." />
    <Doc product="STUDIO" kind="Oturum Özeti" title="Oturum Özeti · Öğrenci A" rotate={1.5} style={{ left: 110, top: 550, width: 860, height: 660 }}>
      <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 19, color: colors.gray }}>45 dakika · Bireysel oturum</div>
      <H>HEDEF PERFORMANSI</H>
      {GOALS.map((g) => (
        <div key={g.g} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: fonts.body, fontSize: 21, fontWeight: 700 }}>
            <span>{g.g}</span>
            <span style={{ color: colors.studioBlue }}>%{g.acc}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
            <div style={{ flex: 1, height: 16, borderRadius: 99, background: "#e6eef8", overflow: "hidden" }}>
              <div style={{ width: `${g.acc}%`, height: "100%", background: colors.studioBlue, borderRadius: 99 }} />
            </div>
            <span style={{ fontFamily: fonts.body, fontSize: 17, fontWeight: 700, color: colors.gray, width: 150 }}>{g.cue}</span>
          </div>
        </div>
      ))}
      <H>SONRAKİ OTURUM</H>
      <P>/s/ sesinde ipucunu azaltıp kelime ortası pozisyona hazırlık yapılacak.</P>
      <Callout title="Veliye not" bg="#eef5fd" fg={colors.studioBlue}>
        Bugün yeni sesleri çok istekli çalıştı. Evde birlikte /s/ avı oyununu oynamanız çok destek olur.
      </Callout>
    </Doc>
    <Deco items={[{ x: 90, y: 1170, size: 60, kind: "plus", color: colors.orange, rot: 15 }]} />
  </PostFrame>
);

/* ——— 13: Atölye araç haritası ——— */

const ATOLYE_TOOLS: typeof STUDIO_TOOLS = [
  {
    group: "BEP & Değerlendirme",
    items: [
      { name: "BEP & Rapor Asistanı", Icon: Target },
      { name: "Bireysel Uyarlama", Icon: Wand2 },
      { name: "İlerleme Çizelgesi", Icon: TrendingUp },
    ],
  },
  {
    group: "Seans & Materyal",
    items: [
      { name: "Seans Planı", Icon: CalendarDays },
      { name: "Çok Duyulu Materyal", Icon: Shapes },
      { name: "Okuma-Akıcılık", Icon: BookOpenText },
      { name: "Matematik Destek", Icon: Calculator },
    ],
  },
  {
    group: "Sosyal & Davranışsal",
    items: [
      { name: "Davranış Destek Planı", Icon: ListChecks },
      { name: "Sosyal Öykü", Icon: Users },
    ],
  },
  {
    group: "Veli & Ev",
    items: [
      { name: "Veli Mektubu", Icon: Mail },
      { name: "Ev Ödevi Programı", Icon: HeartHandshake },
    ],
  },
];

export const P13AtolyeAraclar: React.FC = () => (
  <PostFrame product="ATÖLYE">
    <Headline size={96} style={{ position: "absolute", top: 170, left: PAD }}>
      <Hi>11 araç,</Hi>
      <br />
      tek atölyede.
    </Headline>
    <Sub top={380}>Özel eğitim öğretmenleri için BEP'ten veli mektubuna; MEB hedefleriyle uyumlu taslaklar.</Sub>
    <ToolMap product="ATÖLYE" groups={ATOLYE_TOOLS} top={520} tile={70} />
    <Deco items={[{ x: 990, y: 240, size: 80, kind: "ring", color: colors.studioBlue }]} />
  </PostFrame>
);

/* ——— 14: BEP & Rapor Asistanı ——— */

export const P14Bep: React.FC = () => (
  <PostFrame product="ATÖLYE">
    <Head2 product="ATÖLYE" l1="BEP hedefleri," l2="ölçülebilir başlasın." size={88} sub="Öğrenci profilinden alan bazında uzun dönem amaç, kısa dönem hedefler ve ölçme yöntemi." />
    <Doc product="ATÖLYE" kind="BEP Hedef Taslağı" title="Okuma ve Yazma" rotate={-1.5} style={{ left: 100, top: 550, width: 880, height: 660 }}>
      <H>UZUN DÖNEM AMAÇ</H>
      <P>Dönem sonunda sözcüklerin hece özelliklerini ayırt ederek okumaya hazırlık becerilerini kullanır.</P>
      <H>KISA DÖNEM HEDEFLER</H>
      {[
        ["Söylenen iki ve üç heceli sözcükleri, 10 denemenin 8'inde el çırparak hecelerine ayırır.", "3.1.2.1"],
        ["Resimli kartla sunulan sözcüğün ilk hecesini, 8 denemenin 6'sında ipucusuz söyler.", "3.1.2.2"],
      ].map(([t, k], i) => (
        <div key={k} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
          <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 99, background: "#ffe7dc", color: colors.orange, fontFamily: fonts.body, fontWeight: 900, fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {i + 1}
          </span>
          <P>
            {t}{" "}
            <span style={{ fontWeight: 700, color: colors.orange, background: "#fff1ea", borderRadius: 6, padding: "0 6px" }}>({k})</span>
          </P>
        </div>
      ))}
      <H>YÖNTEM</H>
      <P>Çok duyulu çalışma: alkış, hece pulları ve resimli kartlarla somuttan soyuta.</P>
      <H>ÖLÇME</H>
      <P>Haftalık 10 sözcüklük sonda; doğru yanıt yüzdesi çizelgeye işlenir.</P>
    </Doc>
    <div
      style={{
        position: "absolute",
        right: PAD,
        top: 520,
        fontFamily: fonts.body,
        fontWeight: 700,
        fontSize: 26,
        background: colors.orange,
        color: colors.white,
        border: `3px solid ${colors.ink}`,
        borderRadius: 999,
        padding: "8px 20px",
        transform: "rotate(4deg)",
      }}
    >
      MEB kodlarıyla ✓
    </div>
  </PostFrame>
);

/* ——— 15: Davranış Destek Planı ——— */

export const P15Davranis: React.FC = () => (
  <PostFrame product="ATÖLYE">
    <Head2 product="ATÖLYE" l1="Davranışı anla," l2="desteği planla." sub="ABC analizi, işlev hipotezi, yerine koyma davranışı ve olumlu pekiştirme planı taslağı." />
    <Doc product="ATÖLYE" kind="Davranış Destek Planı" title="Derste sık sık yerinden kalkma" rotate={1.5} style={{ left: 100, top: 550, width: 880, height: 660 }}>
      <H>ABC ANALİZİ</H>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", border: `2px solid ${colors.ink}`, borderRadius: 10, overflow: "hidden" }}>
        {["Öncül", "Davranış", "Sonuç"].map((h) => (
          <div key={h} style={{ background: "#fff1ea", fontFamily: fonts.body, fontWeight: 900, fontSize: 20, padding: "10px 14px", borderBottom: `2px solid ${colors.ink}` }}>
            {h}
          </div>
        ))}
        {[
          "Uzun yazma etkinliği başlar",
          "Kalkıp sınıfta dolaşır",
          "Görev ertelenir, öğretmen yanına gelir",
        ].map((c) => (
          <div key={c} style={{ fontFamily: fonts.body, fontSize: 19, lineHeight: 1.35, padding: "10px 14px" }}>
            {c}
          </div>
        ))}
      </div>
      <H>İŞLEV HİPOTEZİ</H>
      <P>Kaçınma-kaçış (uzun görevden) ve dikkat çekme.</P>
      <H>YERİNE KOYMA DAVRANIŞI</H>
      <P>“Mola kartı”nı kaldırarak 2 dakikalık hareket molası ister.</P>
      <Callout title="Pekiştirme" bg="#e7f5ef" fg={colors.green}>
        Görevi küçük parçalara bölün; her parça bitince sözel övgü ve seçtiği kısa bir etkinlik.
      </Callout>
    </Doc>
    <div
      style={{
        position: "absolute",
        right: PAD,
        bottom: 108,
        fontFamily: fonts.body,
        fontWeight: 700,
        fontSize: 24,
        color: colors.ink,
        background: colors.logoCream,
        border: `3px solid ${colors.ink}`,
        borderRadius: 999,
        padding: "8px 20px",
        transform: "rotate(-2deg)",
      }}
    >
      Eğitsel destek · tanı ve tedavi değil
    </div>
  </PostFrame>
);

/* ——— 16: Okuma-Akıcılık Seti ——— */

export const P16Okuma: React.FC = () => (
  <PostFrame product="ATÖLYE">
    <Head2 product="ATÖLYE" l1="Okuma akıcılığı," l2="hece hece." sub="Seviyeli okuma parçası, Türkçenin hece yapısına uygun çalışma ve akıcılık rubriği." />
    <Doc product="ATÖLYE" kind="Okuma-Akıcılık Seti" title="Parkta Bir Gün" rotate={-2} style={{ left: 90, top: 550, width: 600, height: 650 }}>
      <H>SEVİYELİ PARÇA</H>
      <P size={24} style={{ lineHeight: 1.55 }}>
        Ali parka gitti. Salıncakta sallandı. Topunu aldı, arkadaşına attı. Akşam olunca eve döndü.
      </P>
      <H>HECE ÇALIŞMASI</H>
      {[
        ["sa", "lın", "cak"],
        ["ar", "ka", "daş"],
        ["ak", "şam"],
      ].map((w) => (
        <div key={w.join("")} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {w.map((h, i) => (
            <span
              key={i}
              style={{
                fontFamily: fonts.body,
                fontWeight: 900,
                fontSize: 28,
                padding: "4px 16px",
                borderRadius: 10,
                background: i % 2 ? "#ffe7dc" : "#eef5fd",
                color: i % 2 ? colors.orange : colors.studioBlue,
              }}
            >
              {h}
            </span>
          ))}
        </div>
      ))}
      <H>AKICILIK EGZERSİZİ</H>
      <P>Tekrarlı okuma: parçayı 3 tur okur; her turda süre not edilir.</P>
    </Doc>
    <UiCard rotate={3} style={{ left: 640, top: 760, width: 360 }}>
      <div style={{ fontFamily: fonts.body, fontWeight: 900, fontSize: 26, marginBottom: 12 }}>Akıcılık rubriği</div>
      {[
        ["Kelime/dk", 58],
        ["Doğruluk", 82],
        ["Prozodi", 64],
      ].map(([k, v]) => (
        <div key={k as string} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: fonts.body, fontWeight: 700, fontSize: 20 }}>
            <span>{k}</span>
          </div>
          <div style={{ height: 14, borderRadius: 99, background: "#f3e7dc", marginTop: 6 }}>
            <div style={{ width: `${v}%`, height: "100%", borderRadius: 99, background: colors.orange }} />
          </div>
        </div>
      ))}
      <div style={{ fontFamily: fonts.body, fontSize: 17, color: colors.gray }}>Gözlem ölçütleriyle doldurulur</div>
    </UiCard>
  </PostFrame>
);

/* ——— 17: Matematik Destek Seti (CRA) ——— */

const Dot: React.FC<{ c: string }> = ({ c }) => <span style={{ width: 26, height: 26, borderRadius: 99, background: c, border: `2px solid ${colors.ink}`, display: "inline-block" }} />;

export const P17Matematik: React.FC = () => (
  <PostFrame product="ATÖLYE">
    <Head2 product="ATÖLYE" l1="Somuttan soyuta," l2="adım adım." sub="Somut → yarı somut → soyut dizisi, materyal yönergesi, yaygın hata desenleri ve alıştırma seti." />
    {[
      {
        t: "SOMUT",
        d: "Sayma pullarıyla 3 pul ve 2 pulu birleştirir.",
        v: (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {[0, 1, 2].map((i) => <Dot key={i} c={colors.orange} />)}
            <span style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 34, margin: "0 6px" }}>+</span>
            {[0, 1].map((i) => <Dot key={i} c={colors.studioBlue} />)}
          </div>
        ),
      },
      {
        t: "YARI SOMUT",
        d: "Aynı işlemi sayı doğrusunda sıçramalarla gösterir.",
        v: (
          <svg width={330} height={100} viewBox="0 0 330 100">
            <line x1="10" y1="52" x2="320" y2="52" stroke={colors.ink} strokeWidth="4" />
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <g key={n}>
                <line x1={20 + n * 58} y1="44" x2={20 + n * 58} y2="60" stroke={colors.ink} strokeWidth="4" />
                <text x={20 + n * 58} y="92" textAnchor="middle" fontFamily="Satoshi" fontWeight="700" fontSize="24" fill={colors.ink}>{n}</text>
              </g>
            ))}
            <path d="M194 42 Q 223 8 252 42" stroke={colors.orange} strokeWidth="5" fill="none" />
            <path d="M252 42 Q 281 8 310 42" stroke={colors.orange} strokeWidth="5" fill="none" />
          </svg>
        ),
      },
      {
        t: "SOYUT",
        d: "Sembolle yazar ve çözer.",
        v: <span style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 64 }}>3 + 2 = 5</span>,
      },
    ].map((s, i) => (
      <div
        key={s.t}
        style={{
          position: "absolute",
          left: PAD + i * 40,
          top: 550 + i * 215,
          width: 810,
          height: 185,
          background: i === 2 ? colors.orange : colors.white,
          color: i === 2 ? colors.white : colors.ink,
          border: `3px solid ${colors.ink}`,
          borderRadius: 22,
          boxShadow: `10px 10px 0 ${colors.ink}`,
          display: "flex",
          alignItems: "center",
          padding: "0 30px",
          gap: 26,
          boxSizing: "border-box",
        }}
      >
        <div style={{ width: 360 }}>
          <div style={{ fontFamily: fonts.body, fontWeight: 900, fontSize: 22, letterSpacing: 3, color: i === 2 ? colors.white : colors.orange }}>
            {i + 1} · {s.t}
          </div>
          <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 25, lineHeight: 1.3, marginTop: 6 }}>{s.d}</div>
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>{s.v}</div>
      </div>
    ))}
  </PostFrame>
);

/* ——— 18: Veli Mektubu ——— */

export const P18VeliMektubu: React.FC = () => (
  <PostFrame product="ATÖLYE">
    <Head2 product="ATÖLYE" l1="Veliyle sıcak," l2="umut veren bir dil." size={88} sub="Güçlü yönlerle başlayan, damgalamayan, evde uygulanabilir önerilerle dolu mektup taslağı." />
    <div
      style={{
        position: "absolute",
        left: 130,
        top: 560,
        width: 820,
        height: 640,
        background: "#fffdf8",
        border: `3px solid ${colors.ink}`,
        borderRadius: 16,
        boxShadow: `14px 14px 0 ${colors.ink}`,
        padding: "40px 48px",
        boxSizing: "border-box",
        transform: "rotate(-1.5deg)",
      }}
    >
      <P size={24} style={{ fontWeight: 700 }}>Sevgili Aile,</P>
      <P size={23} style={{ marginTop: 14, lineHeight: 1.5 }}>
        Çocuğunuzun merakı ve oyunlara katılma isteği, çalışmalarımızın en güçlü dayanağı oluyor. Bu dönem hece farkındalığı üzerinde birlikte çalışıyoruz.
      </P>
      <H color={colors.orange}>EVDE BİRLİKTE DENEYEBİLECEKLERİNİZ</H>
      <Bullet color={colors.orange}>Sofrada yemeklerin adını el çırparak heceleyin.</Bullet>
      <Bullet color={colors.orange}>Yolda gördüğünüz tabelalardan ilk heceyi birlikte bulun.</Bullet>
      <Bullet color={colors.orange}>Uyumadan önce kısa bir kitabı sırayla okuyun.</Bullet>
      <P size={23} style={{ marginTop: 14, lineHeight: 1.5 }}>
        Küçük adımlar zaman içinde büyük fark yaratır. Sorularınız için her zaman buradayız.
      </P>
      <P size={23} style={{ marginTop: 18, fontWeight: 700 }}>Sevgiyle,</P>
    </div>
    <div style={{ position: "absolute", right: 50, top: 1000, transform: "rotate(10deg)" }}>
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: 99,
          background: colors.orange,
          border: `3px solid ${colors.ink}`,
          boxShadow: `6px 6px 0 ${colors.ink}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Mail size={58} color={colors.white} strokeWidth={2.3} />
      </div>
    </div>
  </PostFrame>
);
