"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CardPreview } from "@/components/cards/CardPreview";
import { AssignStudentsModal } from "@/components/cards/AssignStudentsModal";
import { SocialStoryView, type SocialStoryContent } from "@/components/cards/SocialStoryView";
import { ArticulationView, type ArticulationContent } from "@/components/cards/ArticulationView";
import { HomeworkView, type HomeworkContent } from "@/components/cards/HomeworkView";
import { SessionSummaryView, type SessionSummaryContent } from "@/components/cards/SessionSummaryView";
import { MatchingGameView, type MatchingGameContent } from "@/components/cards/MatchingGameView";
import { PhonationView, type PhonationActivityContent } from "@/components/cards/PhonationView";
import { CommBoardView, type CommBoardContent } from "@/components/cards/CommBoardView";
import { WeeklyPlanView, type WeeklyPlanContent } from "@/components/cards/WeeklyPlanView";
import type { GeneratedCard } from "@/lib/prompts";
import { formatDate } from "@/lib/utils";
import { PBtn, PCard, PBadge, PSpinner } from "@/components/poster";

interface CurriculumGoal {
  id: string;
  code: string;
  title: string;
  isMainGoal: boolean;
  curriculum: { code: string; title: string };
}

interface CardRecord {
  id: string;
  title: string;
  category: string | null;
  toolType: string | null;
  difficulty: string;
  ageGroup: string;
  content: Record<string, unknown>;
  createdAt: string;
  student: { id: string; name: string } | null;
  _count: { assignments: number };
  curriculumGoals: CurriculumGoal[];
}

type ToolBadgeColor = "accent" | "green" | "blue" | "yellow" | "pink" | "soft" | "ink";
const TOOL_TYPE_BADGE: Record<string, { label: string; color: ToolBadgeColor }> = {
  LEARNING_CARD:       { label: "Öğrenme Kartı",       color: "blue" },
  SOCIAL_STORY:        { label: "Sosyal Hikaye",       color: "ink" },
  ARTICULATION_DRILL:  { label: "Artikülasyon",        color: "accent" },
  HOMEWORK_MATERIAL:   { label: "Ev Ödevi Materyali",  color: "yellow" },
  SESSION_SUMMARY:     { label: "Oturum Özeti",        color: "pink" },
  MATCHING_GAME:       { label: "Kelime Eşleştirme",   color: "blue" },
  PHONATION_ACTIVITY:  { label: "Sesletim Aktivitesi", color: "green" },
  COMMUNICATION_BOARD: { label: "İletişim Panosu",     color: "ink" },
  WEEKLY_PLAN:         { label: "Haftalık Plan",       color: "yellow" },
};

async function downloadSocialStoryPDF(card: CardRecord) {
  const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");

  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`,    fontWeight: "bold" },
    ],
  });

  const content = card.content as unknown as SocialStoryContent;
  const TYPE_COLORS: Record<string, string> = {
    descriptive: "#107996",
    perspective: "#023435",
    directive:   "#FE703A",
    affirmative: "#b45309",
  };
  const TYPE_LABELS: Record<string, string> = {
    descriptive: "Tanımlayıcı",
    perspective: "Perspektif",
    directive:   "Yönlendirici",
    affirmative: "Olumlu",
  };

  const styles = StyleSheet.create({
    page:    { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 44, backgroundColor: "#fff" },
    title:   { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 18, color: "#023435", marginBottom: 16 },
    row:     { flexDirection: "row", gap: 8, marginBottom: 6, alignItems: "flex-start" },
    badge:   { fontWeight: "bold", fontSize: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
    text:    { fontSize: 10, lineHeight: 1.6, flex: 1, color: "#3f3f46" },
    visual:  { fontSize: 8, color: "#a1a1aa", fontStyle: "italic", marginTop: 2 },
    section: { marginTop: 14, padding: 10, borderRadius: 6 },
    secTitle:{ fontWeight: "bold", fontSize: 9, marginBottom: 4 },
    secText: { fontSize: 9, lineHeight: 1.6 },
  });

  const Doc = () => (
    <Document title={content.title} author="LudenLab">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{content.title}</Text>
        {(content.sentences ?? []).map((s, i) => (
          <View key={i} style={styles.row}>
            <Text style={[styles.badge, { backgroundColor: `${TYPE_COLORS[s.type] ?? "#107996"}20`, color: TYPE_COLORS[s.type] ?? "#107996" }]}>
              {TYPE_LABELS[s.type] ?? s.type}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.text}>{s.text}</Text>
              {s.visualPrompt && <Text style={styles.visual}>{s.visualPrompt}</Text>}
            </View>
          </View>
        ))}
        {content.expertNotes && (
          <View style={[styles.section, { backgroundColor: "#fffbeb" }]}>
            <Text style={[styles.secTitle, { color: "#92400e" }]}>Uzman Notları</Text>
            <Text style={[styles.secText, { color: "#78350f" }]}>{content.expertNotes}</Text>
          </View>
        )}
        {content.homeGuidance && (
          <View style={[styles.section, { backgroundColor: "#eff6ff" }]}>
            <Text style={[styles.secTitle, { color: "#1e40af" }]}>Veli Rehberi</Text>
            <Text style={[styles.secText, { color: "#1e3a8a" }]}>{content.homeGuidance}</Text>
          </View>
        )}
      </Page>
    </Document>
  );

  const blob = await pdf(<Doc />).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${card.title.replace(/\s+/g, "_")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadArticulationPDF(card: CardRecord) {
  const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");

  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`,    fontWeight: "bold" },
    ],
  });

  const content = card.content as unknown as ArticulationContent;
  const POSITION_LABEL: Record<string, string> = { initial: "Başta", medial: "Ortada", final: "Sonda" };

  const styles = StyleSheet.create({
    page:   { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 44, backgroundColor: "#fff" },
    title:  { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 18, color: "#023435", marginBottom: 8 },
    badges: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 16 },
    badge:  { fontWeight: "bold", fontSize: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
    row:    { flexDirection: "row", gap: 4, borderBottomWidth: 1, borderBottomColor: "#e4e4e7", paddingVertical: 4 },
    cell:   { fontSize: 9, color: "#3f3f46" },
    hdr:    { fontWeight: "bold", fontSize: 8, color: "#71717a" },
    section:{ marginTop: 14, padding: 10, borderRadius: 6 },
    secTitle:{ fontWeight: "bold", fontSize: 9, marginBottom: 4 },
    secText: { fontSize: 9, lineHeight: 1.6 },
  });

  const Doc = () => (
    <Document title={content.title} author="LudenLab">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{content.title}</Text>
        <View style={styles.badges}>
          {(content.targetSounds ?? []).map((s, i) => (
            <Text key={i} style={[styles.badge, { backgroundColor: "#10799620", color: "#107996" }]}>{s}</Text>
          ))}
          {(content.positions ?? []).map((p, i) => (
            <Text key={i} style={[styles.badge, { backgroundColor: "#f4f4f5", color: "#52525b" }]}>{POSITION_LABEL[p] ?? p}</Text>
          ))}
        </View>
        {/* Header row */}
        <View style={[styles.row, { backgroundColor: "#f4f4f5" }]}>
          <Text style={[styles.hdr, { width: 20 }]}>#</Text>
          <Text style={[styles.hdr, { flex: 2 }]}>Kelime</Text>
          <Text style={[styles.hdr, { flex: 2 }]}>Heceler</Text>
          <Text style={[styles.hdr, { flex: 1 }]}>Pozisyon</Text>
        </View>
        {(content.items ?? []).map((item, i) => (
          <View key={i} style={[styles.row, { backgroundColor: i % 2 === 0 ? "#fff" : "#f9f9f9" }]}>
            <Text style={[styles.cell, { width: 20 }]}>{i + 1}</Text>
            <Text style={[styles.cell, { flex: 2, fontWeight: "bold" }]}>{item.word}</Text>
            <Text style={[styles.cell, { flex: 2 }]}>{item.syllableBreak ?? "—"}</Text>
            <Text style={[styles.cell, { flex: 1 }]}>{POSITION_LABEL[item.position ?? ""] ?? item.position ?? "—"}</Text>
          </View>
        ))}
        {content.expertNotes && (
          <View style={[styles.section, { backgroundColor: "#fffbeb" }]}>
            <Text style={[styles.secTitle, { color: "#92400e" }]}>Uzman Notları</Text>
            <Text style={[styles.secText, { color: "#78350f" }]}>{content.expertNotes}</Text>
          </View>
        )}
        {content.homeGuidance && (
          <View style={[styles.section, { backgroundColor: "#eff6ff" }]}>
            <Text style={[styles.secTitle, { color: "#1e40af" }]}>Veli Rehberi</Text>
            <Text style={[styles.secText, { color: "#1e3a8a" }]}>{content.homeGuidance}</Text>
          </View>
        )}
      </Page>
    </Document>
  );

  const blob = await pdf(<Doc />).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${card.title.replace(/\s+/g, "_")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadSessionSummaryFullPDF(card: CardRecord) {
  const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`,    fontWeight: "bold" },
    ],
  });

  const summary = card.content as unknown as SessionSummaryContent;
  const goals   = Array.isArray(summary.goalPerformance) ? summary.goalPerformance : [];
  const today   = formatDate(new Date(), "medium");

  function parseP(acc: string | number): number {
    if (typeof acc === "number") return Math.min(100, Math.max(0, acc));
    const m = String(acc).match(/\d+/);
    return m ? Math.min(100, Math.max(0, parseInt(m[0]))) : 0;
  }
  function barClr(pct: number): string {
    if (pct >= 81) return "#16a34a";
    if (pct >= 61) return "#ca8a04";
    if (pct >= 31) return "#FE703A";
    return "#ef4444";
  }

  const S = StyleSheet.create({
    page:      { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 44, paddingBottom: 70 },
    title:     { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 18, color: "#023435", marginBottom: 6 },
    infoRow:   { flexDirection: "row", flexWrap: "wrap", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#e4e4e7", paddingBottom: 10 },
    infoBadge: { fontSize: 8, color: "#52525b", backgroundColor: "#f4f4f5", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginBottom: 4 },
    secHdr:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, color: "#71717a", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
    goalCard:  { borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 4, padding: 10, marginBottom: 8 },
    goalTitle: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 10, color: "#18181b", marginBottom: 6 },
    barBg:     { height: 5, backgroundColor: "#f4f4f5", borderRadius: 3, marginBottom: 6 },
    cueBadge:  { fontSize: 8, color: "#52525b", backgroundColor: "#f4f4f5", borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start", marginBottom: 6 },
    bodyText:  { fontSize: 9, lineHeight: 1.6, color: "#3f3f46" },
    recRow:    { flexDirection: "row", marginTop: 4 },
    recBullet: { fontSize: 8, color: "#a1a1aa", marginRight: 4, marginTop: 1 },
    recText:   { flex: 1, fontSize: 8, color: "#71717a", lineHeight: 1.5 },
    box:       { borderRadius: 4, padding: 10, marginBottom: 10 },
    boxTitle:  { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, marginBottom: 4 },
    boxText:   { fontSize: 9, lineHeight: 1.6 },
    footer:    { position: "absolute", bottom: 28, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e4e4e7", paddingTop: 6 },
    footerTxt: { fontSize: 8, color: "#a1a1aa" },
  });

  const Doc = () => (
    <Document title={summary.title ?? card.title} author="LudenLab">
      <Page size="A4" style={S.page}>
        <Text style={S.title}>{summary.title ?? card.title}</Text>
        <View style={S.infoRow}>
          {card.student?.name ? <Text style={S.infoBadge}>Öğrenci: {card.student.name}</Text> : null}
          {summary.sessionInfo?.date     ? <Text style={S.infoBadge}>{summary.sessionInfo.date}</Text> : null}
          {summary.sessionInfo?.duration ? <Text style={S.infoBadge}>{summary.sessionInfo.duration}</Text> : null}
          {summary.sessionInfo?.type     ? <Text style={S.infoBadge}>{summary.sessionInfo.type}</Text> : null}
        </View>
        {goals.length > 0 ? (
          <View style={{ marginBottom: 14 }}>
            <Text style={S.secHdr}>Çalışılan Hedefler</Text>
            {goals.map((g, i) => {
              const pct = parseP(g.accuracy);
              return (
                <View key={i} style={S.goalCard}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Text style={[S.goalTitle, { flex: 1, marginRight: 8 }]}>{g.goal}</Text>
                    <Text style={{ fontSize: 9, fontFamily: "NotoSans", fontWeight: "bold", color: barClr(pct) }}>{g.accuracy}</Text>
                  </View>
                  <View style={S.barBg}>
                    <View style={{ height: 5, borderRadius: 3, width: `${pct}%`, backgroundColor: barClr(pct) }} />
                  </View>
                  {g.cueLevel ? <Text style={S.cueBadge}>{g.cueLevel}</Text> : null}
                  {g.analysis ? <Text style={S.bodyText}>{g.analysis}</Text> : null}
                  {g.recommendation ? (
                    <View style={S.recRow}>
                      <Text style={S.recBullet}>›</Text>
                      <Text style={S.recText}>{g.recommendation}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
        {summary.overallAssessment ? (
          <View style={[S.box, { backgroundColor: "#f0f9ff", borderWidth: 1, borderColor: "#bae6fd" }]}>
            <Text style={[S.boxTitle, { color: "#0369a1" }]}>Genel Değerlendirme</Text>
            <Text style={[S.boxText, { color: "#0c4a6e" }]}>{summary.overallAssessment}</Text>
          </View>
        ) : null}
        {summary.behaviorNotes ? (
          <View style={[S.box, { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e4e4e7" }]}>
            <Text style={[S.boxTitle, { color: "#374151" }]}>Davranış ve Katılım</Text>
            <Text style={[S.boxText, { color: "#4b5563" }]}>{summary.behaviorNotes}</Text>
          </View>
        ) : null}
        {summary.nextSessionPlan ? (
          <View style={[S.box, { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderLeftWidth: 3, borderLeftColor: "#16a34a" }]}>
            <Text style={[S.boxTitle, { color: "#15803d" }]}>Sonraki Oturum Planı</Text>
            <Text style={[S.boxText, { color: "#166534" }]}>{summary.nextSessionPlan}</Text>
          </View>
        ) : null}
        {summary.parentNote ? (
          <View style={[S.box, { backgroundColor: "#f0fdf4", borderWidth: 2, borderColor: "#86efac" }]}>
            <Text style={[S.boxTitle, { color: "#15803d" }]}>Veliye İletilecek Not</Text>
            <Text style={[S.boxText, { color: "#166534" }]}>{summary.parentNote}</Text>
          </View>
        ) : null}
        {summary.expertNotes ? (
          <View style={[S.box, { backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a" }]}>
            <Text style={[S.boxTitle, { color: "#92400e" }]}>Uzman Notları (Gizli)</Text>
            <Text style={[S.boxText, { color: "#78350f" }]}>{summary.expertNotes}</Text>
          </View>
        ) : null}
        <View style={S.footer} fixed>
          <Text style={S.footerTxt}>LudenLab — ludenlab.com</Text>
          <Text style={S.footerTxt}>{today}</Text>
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(<Doc />).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${card.title.replace(/\s+/g, "_")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadSessionSummaryParentPDF(card: CardRecord) {
  const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`,    fontWeight: "bold" },
    ],
  });

  const summary = card.content as unknown as SessionSummaryContent;
  const today   = formatDate(new Date(), "medium");

  const S = StyleSheet.create({
    page:    { fontFamily: "NotoSans", fontSize: 11, color: "#18181b", padding: 56, paddingBottom: 70 },
    header:  { marginBottom: 24, borderBottomWidth: 2, borderBottomColor: "#023435", paddingBottom: 16 },
    brand:   { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 10, color: "#023435", marginBottom: 4 },
    h1:      { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 18, color: "#023435", marginBottom: 4 },
    sub:     { fontSize: 10, color: "#52525b" },
    body:    { fontSize: 11, lineHeight: 1.8, color: "#27272a" },
    footer:  { position: "absolute", bottom: 28, left: 56, right: 56, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e4e4e7", paddingTop: 6 },
    footTxt: { fontSize: 8, color: "#a1a1aa" },
  });

  const Doc = () => (
    <Document title="Veli Notu" author="LudenLab">
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <Text style={S.brand}>LudenLab</Text>
          <Text style={S.h1}>Veli Bilgilendirme Notu</Text>
          <Text style={S.sub}>
            {card.student?.name ? `Öğrenci: ${card.student.name}  ·  ` : ""}
            {summary.sessionInfo?.date ?? today}
          </Text>
        </View>
        <Text style={S.body}>{summary.parentNote ?? ""}</Text>
        <View style={S.footer} fixed>
          <Text style={S.footTxt}>LudenLab — ludenlab.com</Text>
          <Text style={S.footTxt}>{today}</Text>
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(<Doc />).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `Veli_Notu_${(card.student?.name ?? "ogrenci").replace(/\s+/g, "_")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadPhonationPDF(card: CardRecord) {
  const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`,    fontWeight: "bold" },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);

  const activity = card.content as Record<string, unknown>;
  const sounds   = Array.isArray(activity.targetSounds) ? (activity.targetSounds as string[]) : [];
  const today    = formatDate(new Date(), "medium");
  const aType    = activity.activityType as string;

  const ACTIVITY_TYPE_LABEL: Record<string, string> = {
    sound_hunt: "Ses Avı", bingo: "Tombala", snakes_ladders: "Yılan Merdiven",
    word_chain: "Kelime Zinciri", sound_maze: "Ses Labirenti",
  };

  // A4 content width = 595 - 44*2 = 507pt. Row inner padding 8*2 = 16pt → cell area = 491pt.
  const COL_NUM  = 40;
  const COL_TYPE = 145;

  const S = StyleSheet.create({
    page:      { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 44, paddingBottom: 70 },
    title:     { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 18, color: "#023435", marginBottom: 6 },
    infoRow:   { flexDirection: "row", flexWrap: "wrap", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#e4e4e7", paddingBottom: 10 },
    badge:     { fontSize: 8, color: "#52525b", backgroundColor: "#f4f4f5", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginBottom: 4 },
    secHdr:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, color: "#71717a", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
    tblWrap:   { borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 4, marginBottom: 12, overflow: "hidden" },
    tHdr:      { flexDirection: "row", backgroundColor: "#f4f4f5", paddingVertical: 6, paddingHorizontal: 8 },
    thNum:     { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, color: "#a1a1aa", width: COL_NUM },
    thCell:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, color: "#71717a", flex: 1 },
    thType:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, color: "#71717a", width: COL_TYPE },
    tRow:      { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: "#f4f4f5", alignItems: "flex-start" },
    tdNum:     { fontSize: 9, color: "#a1a1aa", width: COL_NUM, paddingTop: 1 },
    tdCell:    { fontSize: 9, color: "#18181b", flex: 1 },
    tdType:    { width: COL_TYPE },
    typeBadge: { borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, alignSelf: "flex-start" },
    typeTxt:   { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8 },
    box:       { borderRadius: 4, padding: 10, marginBottom: 10, borderWidth: 1 },
    boxTitle:  { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, marginBottom: 3 },
    boxText:   { fontSize: 9, lineHeight: 1.6 },
    footer:    { position: "absolute", bottom: 28, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e4e4e7", paddingTop: 6 },
    footTxt:   { fontSize: 8, color: "#a1a1aa" },
  });

  // Shared table helper
  const Table = ({
    hdrLeft, hdrRight, rows,
  }: {
    hdrLeft: string;
    hdrRight: string;
    rows: { num: number | string; left: string; rightLabel: string; rightBg: string; rightColor: string }[];
  }) => (
    <View style={S.tblWrap}>
      <View style={S.tHdr}>
        <Text style={S.thNum}>#</Text>
        <Text style={S.thCell}>{hdrLeft}</Text>
        <Text style={S.thType}>{hdrRight}</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={[S.tRow, { backgroundColor: i % 2 === 1 ? "#fafafa" : "#fff" }]}>
          <Text style={S.tdNum}>{r.num}</Text>
          <Text style={S.tdCell}>{r.left}</Text>
          <View style={S.tdType}>
            <View style={[S.typeBadge, { backgroundColor: r.rightBg }]}>
              <Text style={[S.typeTxt, { color: r.rightColor }]}>{r.rightLabel}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderContent = () => {
    // ── SES AVI ──────────────────────────────────────────────────────────────
    if (aType === "sound_hunt") {
      const objects = Array.isArray(activity.objects) ? (activity.objects as { name: string; hasTargetSound: boolean }[]) : [];
      const tableRows = objects.map((obj, i) => ({
        num: i + 1,
        left: obj.name,
        rightLabel: obj.hasTargetSound ? "Evet ✓" : "Hayır",
        rightBg:    obj.hasTargetSound ? "#dcfce7" : "#f4f4f5",
        rightColor: obj.hasTargetSound ? "#166534" : "#6b7280",
      }));
      return (
        <View>
          {activity.scene ? (
            <View style={[S.box, { backgroundColor: "#f0f9ff", borderColor: "#bae6fd" }]}>
              <Text style={[S.boxTitle, { color: "#0369a1" }]}>Sahne</Text>
              <Text style={[S.boxText, { color: "#0c4a6e" }]}>{activity.scene as string}</Text>
            </View>
          ) : null}
          <Text style={S.secHdr}>Nesneler ({objects.length})</Text>
          <Table hdrLeft="Nesne" hdrRight="Hedef Ses?" rows={tableRows} />
        </View>
      );
    }

    // ── TOMBALA ──────────────────────────────────────────────────────────────
    if (aType === "bingo") {
      const grid = activity.grid as { rows: number; cols: number; cells: { word: string }[] } | undefined;
      if (!grid) return null;
      const cells = Array.isArray(grid.cells) ? grid.cells : [];
      const bingoRows: (typeof cells)[] = [];
      for (let r = 0; r < grid.rows; r++) {
        bingoRows.push(cells.slice(r * grid.cols, (r + 1) * grid.cols));
      }
      const cellW = Math.floor(507 / grid.cols) - 2;
      return (
        <View>
          <Text style={S.secHdr}>Tombala Kartı — {grid.rows}×{grid.cols}</Text>
          {bingoRows.map((rowCells, ri) => (
            <View key={ri} style={{ flexDirection: "row", marginBottom: 2 }}>
              {rowCells.map((cell, ci) => (
                <View
                  key={ci}
                  style={{
                    width: cellW,
                    marginRight: ci < rowCells.length - 1 ? 2 : 0,
                    borderWidth: 2,
                    borderColor: "#f59e0b",
                    borderRadius: 3,
                    paddingVertical: 8,
                    paddingHorizontal: 4,
                    backgroundColor: "#fffbeb",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, textAlign: "center", color: "#92400e" }}>
                    {cell.word}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    }

    // ── YILAN MERDİVEN ───────────────────────────────────────────────────────
    if (aType === "snakes_ladders") {
      const grid = activity.grid as { cells: { position: number; word: string; isLadder?: boolean; isSnake?: boolean }[] } | undefined;
      if (!grid) return null;
      const cells = Array.isArray(grid.cells) ? grid.cells : [];
      const total = cells.length;
      const tableRows = cells.map((cell) => {
        const isFinish = cell.position === total;
        if (cell.isLadder) return { num: cell.position, left: cell.word, rightLabel: "↑ Merdiven", rightBg: "#16a34a", rightColor: "#fff" };
        if (cell.isSnake)  return { num: cell.position, left: cell.word, rightLabel: "↓ Yılan",    rightBg: "#dc2626", rightColor: "#fff" };
        if (isFinish)      return { num: cell.position, left: cell.word, rightLabel: "Bitiş",       rightBg: "#f59e0b", rightColor: "#fff" };
        return                    { num: cell.position, left: cell.word, rightLabel: "Normal",      rightBg: "transparent", rightColor: "#a1a1aa" };
      });
      return (
        <View>
          <Text style={S.secHdr}>Oyun Tahtası ({total} kare)</Text>
          <Table hdrLeft="Kelime" hdrRight="Kare Türü" rows={tableRows} />
        </View>
      );
    }

    // ── KELİME ZİNCİRİ ───────────────────────────────────────────────────────
    if (aType === "word_chain") {
      const chain = Array.isArray(activity.wordChain) ? (activity.wordChain as { order: number; word: string; connection?: string }[]) : [];
      const tableRows = chain.map((item) => ({
        num: item.order,
        left: item.word,
        rightLabel: item.connection ?? "",
        rightBg: "transparent",
        rightColor: "#6b7280",
      }));
      return (
        <View>
          <Text style={S.secHdr}>Kelime Zinciri ({chain.length} kelime)</Text>
          <Table hdrLeft="Kelime" hdrRight="Bağlantı" rows={tableRows} />
        </View>
      );
    }

    // ── SES LABİRENTİ ────────────────────────────────────────────────────────
    if (aType === "sound_maze") {
      const grid = activity.grid as { cells: { word: string; hasTargetSound: boolean; position?: number }[] } | undefined;
      if (!grid) return null;
      const cells = Array.isArray(grid.cells) ? grid.cells : [];
      const tableRows = cells.map((cell, i) => ({
        num: i === 0 ? "GİRİŞ" : i === cells.length - 1 ? "ÇIKIŞ" : cell.position ?? i + 1,
        left: cell.word,
        rightLabel: cell.hasTargetSound ? "✓ Doğru Yol" : "✗ Yanlış",
        rightBg:    cell.hasTargetSound ? "#dcfce7" : "#fee2e2",
        rightColor: cell.hasTargetSound ? "#166534" : "#991b1b",
      }));
      return (
        <View>
          <Text style={S.secHdr}>Ses Labirenti ({cells.length} kelime)</Text>
          <Table hdrLeft="Kelime" hdrRight="Doğru Yol?" rows={tableRows} />
        </View>
      );
    }

    return null;
  };

  const Doc = () => (
    <Document title={card.title} author="LudenLab">
      <Page size="A4" style={S.page}>
        <Text style={S.title}>{card.title}</Text>
        <View style={S.infoRow}>
          {card.student?.name ? <Text style={S.badge}>Öğrenci: {card.student.name}</Text> : null}
          <Text style={S.badge}>{ACTIVITY_TYPE_LABEL[aType] ?? aType}</Text>
          <Text style={S.badge}>{activity.difficulty === "easy" ? "Kolay" : activity.difficulty === "medium" ? "Orta" : "Zor"}</Text>
          {sounds.map((s, i) => <Text key={i} style={S.badge}>{s}</Text>)}
          {activity.theme ? <Text style={S.badge}>{activity.theme as string}</Text> : null}
        </View>
        {renderContent()}
        {activity.instructions ? (
          <View style={[S.box, { backgroundColor: "#f9fafb", borderColor: "#e4e4e7" }]}>
            <Text style={[S.boxTitle, { color: "#374151" }]}>Nasıl Oynanır</Text>
            <Text style={[S.boxText, { color: "#4b5563" }]}>{activity.instructions as string}</Text>
          </View>
        ) : null}
        {activity.adaptations ? (
          <View style={[S.box, { backgroundColor: "#f9fafb", borderColor: "#e4e4e7" }]}>
            <Text style={[S.boxTitle, { color: "#374151" }]}>Uyarlama Önerileri</Text>
            <Text style={[S.boxText, { color: "#4b5563" }]}>{activity.adaptations as string}</Text>
          </View>
        ) : null}
        {activity.expertNotes ? (
          <View style={[S.box, { backgroundColor: "#fffbeb", borderColor: "#fde68a" }]}>
            <Text style={[S.boxTitle, { color: "#92400e" }]}>Uzman Notları</Text>
            <Text style={[S.boxText, { color: "#78350f" }]}>{activity.expertNotes as string}</Text>
          </View>
        ) : null}
        <View style={S.footer} fixed>
          <Text style={S.footTxt}>LudenLab — ludenlab.com</Text>
          <Text style={S.footTxt}>{today}</Text>
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(<Doc />).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${card.title.replace(/\s+/g, "_")}_sesletim.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadCommBoardPDF(card: CardRecord, variant: "board" | "report") {
  const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`,    fontWeight: "bold" },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);

  const board       = card.content as Record<string, unknown>;
  const colorCoding = board.colorCoding !== false;
  const cells       = Array.isArray(board.cells) ? (board.cells as CommBoardContent["cells"]) : [];
  const cols        = (board.cols as number) ?? 3;
  const rows        = (board.rows as number) ?? Math.ceil(cells.length / cols);
  const today       = formatDate(new Date(), "medium");
  const studentName = card.student?.name;

  const FG_BG: Record<string, string> = {
    yellow: "#FEF3C7", green: "#D1FAE5", blue: "#DBEAFE",
    pink: "#FCE7F3",   orange: "#FFEDD5", white: "#F9FAFB",
  };
  const FG_BORDER: Record<string, string> = {
    yellow: "#F59E0B", green: "#10B981", blue: "#3B82F6",
    pink: "#EC4899",   orange: "#F97316", white: "#D4D4D8",
  };
  const FG_TEXT: Record<string, string> = {
    yellow: "#92400E", green: "#065F46", blue: "#1E3A8A",
    pink: "#831843",   orange: "#7C2D12", white: "#3F3F46",
  };

  const BOARD_TYPE_LABEL: Record<string, string> = {
    basic_needs: "Temel İhtiyaçlar", emotions: "Duygular",
    daily_routines: "Günlük Rutinler", school: "Okul Aktiviteleri",
    social: "Sosyal İfadeler", requests: "İstek ve Seçim", custom: "Özel",
  };

  if (variant === "board") {
    // ── Pano PDF — büyük hücre grid, sembol alanı boş ──────────────────────
    const CONTENT_W = 515;
    const GAP = 4;
    const cellW = Math.floor((CONTENT_W - GAP * (cols - 1)) / cols);
    const CONTENT_H = 842 - 80 - 50 - rows * GAP;
    const cellH = Math.floor(CONTENT_H / rows);

    const S = StyleSheet.create({
      page:     { fontFamily: "NotoSans", padding: 40, paddingBottom: 50 },
      title:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 16, color: "#023435", marginBottom: 2 },
      subtitle: { fontSize: 9, color: "#71717a", marginBottom: 12 },
      row:      { flexDirection: "row" },
      cell:     { borderWidth: 2, borderRadius: 6, padding: 6, flexDirection: "column", alignItems: "center" },
      cellWord: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 12, textAlign: "center", marginBottom: 4 },
      cellBox:  { flex: 1, width: "100%", borderWidth: 1, borderRadius: 4, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
      footer:   { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e4e4e7", paddingTop: 5 },
      footTxt:  { fontSize: 7, color: "#a1a1aa" },
    });

    const gridRows: (typeof cells)[] = [];
    for (let r = 0; r < rows; r++) gridRows.push(cells.slice(r * cols, (r + 1) * cols));

    const Doc = () => (
      <Document title={card.title} author="LudenLab">
        <Page size="A4" style={S.page}>
          <Text style={S.title}>{card.title}</Text>
          <Text style={S.subtitle}>
            {studentName ? `Öğrenci: ${studentName} · ` : ""}
            {rows}×{cols} İletişim Panosu · {today}
          </Text>
          {gridRows.map((rowCells, ri) => (
            <View key={ri} style={[S.row, { marginBottom: ri < rows - 1 ? GAP : 0 }]}>
              {rowCells.map((cell, ci) => {
                const color = colorCoding ? (cell.fitzgeraldColor ?? "white") : "white";
                return (
                  <View
                    key={ci}
                    style={[
                      S.cell,
                      {
                        width: cellW, height: cellH,
                        marginRight: ci < rowCells.length - 1 ? GAP : 0,
                        backgroundColor: FG_BG[color] ?? "#F9FAFB",
                        borderColor: FG_BORDER[color] ?? "#D4D4D8",
                        borderStyle: "dashed",
                      },
                    ]}
                  >
                    <Text style={[S.cellWord, { color: FG_TEXT[color] ?? "#3F3F46" }]}>{cell.word}</Text>
                    <View style={[S.cellBox, { borderColor: FG_BORDER[color] ?? "#D4D4D8", borderStyle: "dashed" }]} />
                  </View>
                );
              })}
            </View>
          ))}
          <View style={S.footer} fixed>
            <Text style={S.footTxt}>LudenLab — ludenlab.com</Text>
            <Text style={S.footTxt}>Görsel iletişim panosu — sembol yapıştırın</Text>
          </View>
        </Page>
      </Document>
    );

    const blob = await pdf(<Doc />).toBlob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${card.title.replace(/\s+/g, "_")}_pano.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  // ── Tam Rapor PDF ─────────────────────────────────────────────────────────
  const COLOR_LABEL: Record<string, string> = {
    yellow: "Sarı — İsim", green: "Yeşil — Fiil", blue: "Mavi — Sıfat",
    pink: "Pembe — Sosyal", orange: "Turuncu — Soru", white: "Beyaz — Diğer",
  };

  const S = StyleSheet.create({
    page:      { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 44, paddingBottom: 70 },
    title:     { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 18, color: "#023435", marginBottom: 6 },
    infoRow:   { flexDirection: "row", flexWrap: "wrap", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#e4e4e7", paddingBottom: 10 },
    badge:     { fontSize: 8, color: "#52525b", backgroundColor: "#f4f4f5", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginBottom: 4 },
    secHdr:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, color: "#71717a", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
    tblWrap:   { borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 4, marginBottom: 12, overflow: "hidden" },
    tHdr:      { flexDirection: "row", backgroundColor: "#f4f4f5", paddingVertical: 5, paddingHorizontal: 8 },
    thPos:     { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, color: "#a1a1aa", width: 28 },
    thWord:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, color: "#71717a", width: 80 },
    thDesc:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, color: "#71717a", flex: 1 },
    thColor:   { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, color: "#71717a", width: 70 },
    tRow:      { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: "#f4f4f5", alignItems: "flex-start" },
    tdPos:     { fontSize: 9, color: "#a1a1aa", width: 28, paddingTop: 1 },
    tdWord:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, color: "#18181b", width: 80 },
    tdDesc:    { fontSize: 9, color: "#52525b", flex: 1, lineHeight: 1.5 },
    tdColor:   { width: 70 },
    colorBadge:{ borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, alignSelf: "flex-start" },
    colorTxt:  { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 7 },
    box:       { borderRadius: 4, padding: 10, marginBottom: 10, borderWidth: 1 },
    boxTitle:  { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, marginBottom: 3 },
    boxText:   { fontSize: 9, lineHeight: 1.6 },
    footer:    { position: "absolute", bottom: 28, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e4e4e7", paddingTop: 6 },
    footTxt:   { fontSize: 8, color: "#a1a1aa" },
  });

  const Doc = () => (
    <Document title={card.title} author="LudenLab">
      <Page size="A4" style={S.page}>
        <Text style={S.title}>{card.title}</Text>
        <View style={S.infoRow}>
          {studentName ? <Text style={S.badge}>Öğrenci: {studentName}</Text> : null}
          <Text style={S.badge}>{BOARD_TYPE_LABEL[board.boardType as string] ?? (board.boardType as string)}</Text>
          <Text style={S.badge}>{`${rows}×${cols} — ${(board.symbolCount as number | undefined) ?? cells.length} sembol`}</Text>
          <Text style={S.badge}>{board.layout === "grid" ? "Grid" : "Satır"}</Text>
          {colorCoding ? <Text style={S.badge}>Fitzgerald renk kodu</Text> : null}
          <Text style={S.badge}>{formatDate(new Date(), "medium")}</Text>
        </View>

        <Text style={S.secHdr}>Semboller ({cells.length} hücre)</Text>
        <View style={S.tblWrap}>
          <View style={S.tHdr}>
            <Text style={S.thPos}>#</Text>
            <Text style={S.thWord}>Kelime</Text>
            <Text style={S.thDesc}>Görsel Açıklama</Text>
            {colorCoding ? <Text style={S.thColor}>Renk</Text> : null}
          </View>
          {cells.map((cell, i) => {
            const color = colorCoding ? (cell.fitzgeraldColor ?? "white") : "white";
            return (
              <View key={i} style={[S.tRow, { backgroundColor: i % 2 === 1 ? "#fafafa" : "#fff" }]}>
                <Text style={S.tdPos}>{cell.position ?? i + 1}</Text>
                <Text style={S.tdWord}>{cell.word}{cell.sentence ? `\n"${cell.sentence}"` : ""}</Text>
                <Text style={S.tdDesc}>{cell.visualDescription}{cell.usage ? `\n↳ ${cell.usage}` : ""}</Text>
                {colorCoding ? (
                  <View style={S.tdColor}>
                    <View style={[S.colorBadge, { backgroundColor: FG_BG[color] ?? "#F9FAFB" }]}>
                      <Text style={[S.colorTxt, { color: FG_TEXT[color] ?? "#3F3F46" }]}>{COLOR_LABEL[color] ?? color}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {board.instructions ? (
          <View style={[S.box, { backgroundColor: "#f9fafb", borderColor: "#e4e4e7" }]}>
            <Text style={[S.boxTitle, { color: "#374151" }]}>Kullanım Talimatları</Text>
            <Text style={[S.boxText, { color: "#4b5563" }]}>{board.instructions as string}</Text>
          </View>
        ) : null}
        {board.expertNotes ? (
          <View style={[S.box, { backgroundColor: "#fffbeb", borderColor: "#fde68a" }]}>
            <Text style={[S.boxTitle, { color: "#92400e" }]}>Uzman Notları</Text>
            <Text style={[S.boxText, { color: "#78350f" }]}>{board.expertNotes as string}</Text>
          </View>
        ) : null}
        {board.homeGuidance ? (
          <View style={[S.box, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}>
            <Text style={[S.boxTitle, { color: "#1e40af" }]}>Veli Rehberi</Text>
            <Text style={[S.boxText, { color: "#1e3a8a" }]}>{board.homeGuidance as string}</Text>
          </View>
        ) : null}
        {board.adaptations ? (
          <View style={[S.box, { backgroundColor: "#f9fafb", borderColor: "#e4e4e7" }]}>
            <Text style={[S.boxTitle, { color: "#374151" }]}>Uyarlama Önerileri</Text>
            <Text style={[S.boxText, { color: "#4b5563" }]}>{board.adaptations as string}</Text>
          </View>
        ) : null}

        <View style={S.footer} fixed>
          <Text style={S.footTxt}>LudenLab — ludenlab.com</Text>
          <Text style={S.footTxt}>{today}</Text>
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(<Doc />).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${card.title.replace(/\s+/g, "_")}_tam_rapor.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadWeeklyPlanPDF(card: CardRecord) {
  const jsPDF     = (await import("jspdf")).default;
  const autoTable = (await import("jspdf-autotable")).default;

  const doc   = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W     = 210;
  const L     = 14;
  const R     = W - 14;
  const today = formatDate(new Date(), "medium");

  // Load NotoSans for Turkish characters
  const [regResp, boldResp] = await Promise.all([
    fetch(`${window.location.origin}/fonts/NotoSans-Regular.ttf`),
    fetch(`${window.location.origin}/fonts/NotoSans-Bold.ttf`),
  ]);
  const regBuf  = await regResp.arrayBuffer();
  const boldBuf = await boldResp.arrayBuffer();
  const toB64   = (buf: ArrayBuffer) => {
    let bin = "";
    new Uint8Array(buf).forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin);
  };
  doc.addFileToVFS("NotoSans-Regular.ttf", toB64(regBuf));
  doc.addFileToVFS("NotoSans-Bold.ttf",    toB64(boldBuf));
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFont("NotoSans-Bold.ttf",    "NotoSans", "bold");

  const plan = card.content as Record<string, unknown>;
  const days = Array.isArray(plan.days) ? (plan.days as WeeklyPlanContent["days"]) : [];

  // ── Title + header info ──────────────────────────────────────────────────
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(16);
  doc.setTextColor("#023435");
  doc.text(card.title, L, 20);

  doc.setFont("NotoSans", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#71717a");
  const meta = [
    (plan.weekRange as string) ?? "",
    card.student?.name ?? "",
    plan.sessionsPerWeek ? `${plan.sessionsPerWeek as number} ders/hafta` : "",
    plan.sessionDuration ? `${plan.sessionDuration as string} dk/ders` : "",
  ].filter(Boolean).join("  |  ");
  doc.text(meta, L, 26);

  let y = 32;

  // ── Day sections ─────────────────────────────────────────────────────────
  for (let di = 0; di < days.length; di++) {
    const day = days[di];

    if (y > 240) { doc.addPage(); y = 16; }

    // Day heading bar
    doc.setFillColor("#023435");
    doc.roundedRect(L, y, R - L, 8, 1.5, 1.5, "F");
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(10);
    doc.setTextColor("#ffffff");
    doc.text(`${day.dayNumber}. GUN -- ${day.dayName}, ${day.date}`, L + 3, y + 5.5);
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(8);
    doc.text(day.duration, R - 3, y + 5.5, { align: "right" });
    y += 10;

    // Focus + objective
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#52525b");
    doc.text(`Odak: ${day.focusArea}`, L, y + 4);
    y += 5;
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(9);
    doc.setTextColor("#18181b");
    const objLines = doc.splitTextToSize(day.objective, R - L - 2);
    doc.text(objLines, L, y + 4);
    y += (objLines as string[]).length * 4.5 + 2;

    // Activity table
    const mainSteps = day.mainWork.steps?.join("; ") ?? "";
    const mainText  = mainSteps ? `${day.mainWork.activity}
${mainSteps}` : day.mainWork.activity;

    autoTable(doc, {
      head: [["Bolum", "Aktivite", "Sure"]],
      body: [
        ["Isinma",      day.warmup.activity,  day.warmup.duration],
        ["Ana Calisma", mainText,              day.mainWork.duration],
        ["Kapanis",     day.closing.activity,  day.closing.duration],
      ],
      startY: y,
      margin:  { left: L, right: 14 },
      styles:  { font: "NotoSans", fontSize: 8.5, cellPadding: 2.5, textColor: [24, 24, 27], overflow: "linebreak" },
      headStyles: { fillColor: [2, 52, 53], textColor: 255, fontStyle: "bold", fontSize: 8 },
      columnStyles: { 0: { cellWidth: 28, fontStyle: "bold" }, 2: { cellWidth: 20, halign: "center" } },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;

    // Materials
    const mats = [...(day.warmup.materials ?? []), ...(day.mainWork.materials ?? [])];
    if (mats.length > 0) {
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor("#52525b");
      const matLines = doc.splitTextToSize(`Materyaller: ${mats.join(", ")}`, R - L - 2);
      doc.text(matLines, L, y + 3.5);
      y += (matLines as string[]).length * 3.8 + 1;
    }

    // Day note
    if (day.notes) {
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor("#a1a1aa");
      const noteLines = doc.splitTextToSize(`Not: ${day.notes}`, R - L - 2);
      doc.text(noteLines, L, y + 3.5);
      y += (noteLines as string[]).length * 3.8 + 1;
    }

    if (di < days.length - 1) {
      doc.setDrawColor("#e4e4e7");
      doc.line(L, y + 2, R, y + 2);
      y += 6;
    } else {
      y += 4;
    }
  }

  // ── Footer sections ───────────────────────────────────────────────────────
  const addSection = (title: string, text: string, fillRgb: [number,number,number], titleColor: string) => {
    if (y > 255) { doc.addPage(); y = 16; }
    doc.setFillColor(...fillRgb);
    doc.roundedRect(L, y, R - L, 5, 1, 1, "F");
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(titleColor);
    doc.text(title, L + 3, y + 3.5);
    y += 7;
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor("#18181b");
    const lines = doc.splitTextToSize(text, R - L - 2);
    doc.text(lines, L, y);
    y += (lines as string[]).length * 4.2 + 5;
  };

  if (plan.weeklyGoal)
    addSection("Haftalik Hedef", plan.weeklyGoal as string, [255, 247, 237], "#c2410c");
  if ((plan.materialsNeeded as string[] | undefined)?.length)
    addSection("Gerekli Materyaller", (plan.materialsNeeded as string[]).join(", "), [249, 250, 251], "#374151");
  if (plan.parentCommunication)
    addSection("Veli Bilgilendirme", plan.parentCommunication as string, [239, 246, 255], "#1e40af");

  // ── PDF footer ────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor("#e4e4e7");
    doc.line(L, 285, R, 285);
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(7);
    doc.setTextColor("#a1a1aa");
    doc.text("LudenLab -- ludenlab.com", L, 290);
    doc.text(today, R, 290, { align: "right" });
  }

  doc.save(`${card.title.replace(/\s+/g, "_")}.pdf`);
}


async function downloadMatchingGameTablePDF(card: CardRecord) {
  const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`,    fontWeight: "bold" },
    ],
  });

  const game = card.content as Record<string, unknown>;
  const pairs = Array.isArray(game.pairs) ? (game.pairs as { id: number; cardA: string; cardB: string; hint?: string }[]) : [];
  const MATCH_TYPE_LABEL: Record<string, string> = {
    definition: "Kelime — Tanım", image_desc: "Kelime — Resim Açıklaması",
    synonym: "Eş Anlamlı", antonym: "Zıt Anlamlı", category: "Kategori Eşleştirme", sentence: "Cümle Tamamlama",
  };

  const S = StyleSheet.create({
    page:     { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 44 },
    title:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 18, color: "#023435", marginBottom: 6 },
    badges:   { flexDirection: "row", gap: 8, marginBottom: 16 },
    badge:    { fontSize: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
    tableHdr: { flexDirection: "row", backgroundColor: "#f4f4f5", borderRadius: 4, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 4 },
    thNum:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, color: "#a1a1aa", width: 24 },
    thA:      { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, color: "#52525b", flex: 1 },
    thB:      { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, color: "#52525b", flex: 1 },
    row:      { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "#f4f4f5" },
    cellNum:  { fontSize: 9, color: "#a1a1aa", width: 24 },
    cellA:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, flex: 1, color: "#18181b" },
    cellB:    { fontSize: 9, flex: 1, color: "#3f3f46" },
    box:      { borderRadius: 4, padding: 10, marginTop: 12 },
    boxTitle: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 8, marginBottom: 4 },
    boxText:  { fontSize: 9, lineHeight: 1.6 },
  });

  const Doc = () => (
    <Document title={card.title} author="LudenLab">
      <Page size="A4" style={S.page}>
        <Text style={S.title}>{card.title}</Text>
        <View style={S.badges}>
          <Text style={[S.badge, { backgroundColor: "#107996" + "20", color: "#107996" }]}>
            {MATCH_TYPE_LABEL[game.matchType as string] ?? (game.matchType as string)}
          </Text>
          <Text style={[S.badge, { backgroundColor: "#f4f4f5", color: "#52525b" }]}>
            {game.difficulty === "easy" ? "Kolay" : game.difficulty === "medium" ? "Orta" : "Zor"}
          </Text>
          <Text style={[S.badge, { backgroundColor: "#f4f4f5", color: "#52525b" }]}>{pairs.length} çift</Text>
        </View>
        <View style={S.tableHdr}>
          <Text style={S.thNum}>#</Text>
          <Text style={S.thA}>Kart A</Text>
          <Text style={S.thB}>Kart B</Text>
        </View>
        {pairs.map((pair, i) => (
          <View key={i} style={[S.row, i % 2 === 1 ? { backgroundColor: "#fafafa" } : {}]}>
            <Text style={S.cellNum}>{pair.id ?? i + 1}</Text>
            <Text style={S.cellA}>{pair.cardA}</Text>
            <Text style={S.cellB}>{pair.cardB}{pair.hint ? ` (${pair.hint})` : ""}</Text>
          </View>
        ))}
        {game.instructions ? (
          <View style={[S.box, { backgroundColor: "#f4f4f5" }]}>
            <Text style={S.boxTitle}>Nasıl Oynanır</Text>
            <Text style={S.boxText}>{game.instructions as string}</Text>
          </View>
        ) : null}
        {game.adaptations ? (
          <View style={[S.box, { backgroundColor: "#f4f4f5" }]}>
            <Text style={S.boxTitle}>Uyarlama Önerileri</Text>
            <Text style={S.boxText}>{game.adaptations as string}</Text>
          </View>
        ) : null}
        {game.expertNotes ? (
          <View style={[S.box, { backgroundColor: "#fffbeb" }]}>
            <Text style={[S.boxTitle, { color: "#92400e" }]}>Uzman Notları</Text>
            <Text style={[S.boxText, { color: "#78350f" }]}>{game.expertNotes as string}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );

  const blob = await pdf(<Doc />).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${card.title.replace(/\s+/g, "_")}_Tablo.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadMatchingGameCardsPDF(card: CardRecord) {
  const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`,    fontWeight: "bold" },
    ],
  });

  const game  = card.content as Record<string, unknown>;
  const pairs = Array.isArray(game.pairs) ? (game.pairs as { id: number; cardA: string; cardB: string }[]) : [];

  // Interleave: B cards first then A cards, alternating
  const shuffled: { text: string; isA: boolean; pairId: number }[] = [];
  pairs.forEach((p, i) => {
    shuffled.push({ text: p.cardA, isA: true,  pairId: p.id ?? i + 1 });
    shuffled.push({ text: p.cardB, isA: false, pairId: p.id ?? i + 1 });
  });
  // Simple deterministic shuffle: reverse interleave
  const cards2: typeof shuffled = [];
  for (let i = 0; i < shuffled.length; i += 2) cards2.push(shuffled[i + 1]!);
  for (let i = 0; i < shuffled.length; i += 2) cards2.push(shuffled[i]!);

  const S = StyleSheet.create({
    page:     { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 36 },
    title:    { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 14, color: "#023435", marginBottom: 4 },
    sub:      { fontSize: 9, color: "#71717a", marginBottom: 16 },
    grid:     { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    cardA:    { width: "30%", minHeight: 80, borderWidth: 2, borderStyle: "dashed", borderColor: "#107996", borderRadius: 6, padding: 10, backgroundColor: "#f0f9ff", justifyContent: "center" },
    cardB:    { width: "30%", minHeight: 80, borderWidth: 2, borderStyle: "dashed", borderColor: "#FE703A", borderRadius: 6, padding: 10, backgroundColor: "#fff7ed", justifyContent: "center" },
    cardTxt:  { fontSize: 10, lineHeight: 1.5, color: "#18181b", textAlign: "center" },
    p2title:  { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 14, color: "#023435", marginBottom: 12 },
    ansRow:   { flexDirection: "row", gap: 6, marginBottom: 4, alignItems: "center" },
    ansNum:   { fontSize: 9, color: "#a1a1aa", width: 20 },
    ansA:     { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, flex: 1, color: "#18181b" },
    ansArr:   { fontSize: 9, color: "#a1a1aa", width: 14, textAlign: "center" },
    ansB:     { fontSize: 9, flex: 1, color: "#3f3f46" },
  });

  const Doc = () => (
    <Document title={card.title} author="LudenLab">
      {/* Page 1 — shuffled cut cards */}
      <Page size="A4" style={S.page}>
        <Text style={S.title}>{card.title}</Text>
        <Text style={S.sub}>Kartları kesin ve karıştırın. Mavi kenarlı = Kart A · Turuncu kenarlı = Kart B</Text>
        <View style={S.grid}>
          {cards2.map((c, i) => (
            <View key={i} style={c.isA ? S.cardA : S.cardB}>
              <Text style={S.cardTxt}>{c.text}</Text>
            </View>
          ))}
        </View>
      </Page>
      {/* Page 2 — answer key */}
      <Page size="A4" style={S.page}>
        <Text style={S.p2title}>Cevap Anahtarı</Text>
        {pairs.map((pair, i) => (
          <View key={i} style={S.ansRow}>
            <Text style={S.ansNum}>{pair.id ?? i + 1}.</Text>
            <Text style={S.ansA}>{pair.cardA}</Text>
            <Text style={S.ansArr}>→</Text>
            <Text style={S.ansB}>{pair.cardB}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );

  const blob = await pdf(<Doc />).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${card.title.replace(/\s+/g, "_")}_Kartlar.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadHomeworkPDFFromCard(card: CardRecord) {
  const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");

  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`,    fontWeight: "bold" },
    ],
  });

  const hw = card.content as unknown as HomeworkContent;
  const MTLABEL: Record<string, string> = {
    exercise: "Ev Egzersizi", observation: "Gözlem Formu", daily_activity: "Günlük Aktivite",
  };

  const today = formatDate(new Date(), "medium");
  const studentName = card.student?.name;

  const S = StyleSheet.create({
    page:      { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 44 },
    title:     { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 20, color: "#023435", marginBottom: 6 },
    infoRow:   { flexDirection: "row", marginBottom: 18, borderBottomWidth: 1, borderBottomColor: "#e4e4e7", paddingBottom: 10 },
    infoText:  { fontSize: 9, color: "#52525b", marginRight: 16 },
    sectionHdr:{ fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, color: "#71717a", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
    intro:     { backgroundColor: "#f4f4f5", borderRadius: 4, padding: 10, marginBottom: 14 },
    introText: { fontSize: 10, lineHeight: 1.6, color: "#3f3f46" },
    matItem:   { fontSize: 9, color: "#3f3f46", marginBottom: 3 },
    stepWrap:  { marginBottom: 12 },
    stepRow:   { flexDirection: "row" },
    stepNum:   { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 10, color: "#107996", width: 22 },
    stepText:  { flex: 1, fontSize: 10, lineHeight: 1.6, color: "#3f3f46" },
    stepTip:   { fontSize: 8, color: "#a1a1aa", marginTop: 4, marginLeft: 22, paddingLeft: 6, borderLeftWidth: 2, borderLeftColor: "#d4d4d8" },
    box:       { borderRadius: 4, padding: 10, marginBottom: 10 },
    boxTitle:  { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 9, marginBottom: 4 },
    boxText:   { fontSize: 9, lineHeight: 1.6 },
    freq:      { fontSize: 9, color: "#52525b", marginBottom: 10 },
    footer:    { position: "absolute", bottom: 28, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e4e4e7", paddingTop: 6 },
    footerTxt: { fontSize: 8, color: "#a1a1aa" },
  });

  const steps = Array.isArray(hw.steps)    ? hw.steps    : [];
  const mats  = Array.isArray(hw.materials) ? hw.materials : [];

  const Doc = () => (
    <Document title={hw.title ?? card.title} author="LudenLab">
      <Page size="A4" style={S.page}>

        <Text style={S.title}>{hw.title ?? card.title}</Text>

        <View style={S.infoRow}>
          {studentName ? <Text style={S.infoText}>Öğrenci: {studentName}</Text> : null}
          {hw.duration   ? <Text style={S.infoText}>Süre: {hw.duration}</Text>   : null}
          {hw.targetArea ? <Text style={S.infoText}>{hw.targetArea}</Text>       : null}
          <Text style={[S.infoText, { marginRight: 0 }]}>
            {MTLABEL[hw.materialType] ?? hw.materialType ?? ""}
          </Text>
          <Text style={[S.infoText, { marginLeft: "auto", marginRight: 0 }]}>{today}</Text>
        </View>

        {hw.introduction ? (
          <View style={S.intro}>
            <Text style={S.introText}>{hw.introduction}</Text>
          </View>
        ) : null}

        {mats.length > 0 ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={S.sectionHdr}>Gerekli Malzemeler</Text>
            {mats.map((m, i) => (
              <Text key={i} style={S.matItem}>• {m}</Text>
            ))}
          </View>
        ) : null}

        {steps.length > 0 ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={S.sectionHdr}>Adımlar</Text>
            {steps.map((step, i) => (
              <View key={i} style={S.stepWrap}>
                <View style={S.stepRow}>
                  <Text style={S.stepNum}>{step.stepNumber ?? i + 1}.</Text>
                  <Text style={S.stepText}>{step.instruction ?? ""}</Text>
                </View>
                {step.tip ? <Text style={S.stepTip}>İpucu: {step.tip}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {hw.watchFor ? (
          <View style={[S.box, { backgroundColor: "#fefce8", borderWidth: 1, borderColor: "#fde68a" }]}>
            <Text style={[S.boxTitle, { color: "#92400e" }]}>⚠ Dikkat Edin</Text>
            <Text style={[S.boxText,  { color: "#78350f" }]}>{hw.watchFor}</Text>
          </View>
        ) : null}

        {hw.celebration ? (
          <View style={[S.box, { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" }]}>
            <Text style={[S.boxTitle, { color: "#14532d" }]}>★ Kutlama Anı</Text>
            <Text style={[S.boxText,  { color: "#166534" }]}>{hw.celebration}</Text>
          </View>
        ) : null}

        {hw.frequency ? <Text style={S.freq}>Önerilen Sıklık: {hw.frequency}</Text> : null}

        {hw.adaptations ? (
          <View style={[S.box, { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e4e4e7" }]}>
            <Text style={[S.boxTitle, { color: "#374151" }]}>Uyarlama Önerileri</Text>
            <Text style={[S.boxText,  { color: "#4b5563" }]}>{hw.adaptations}</Text>
          </View>
        ) : null}

        {/* expertNotes — PDF'e dahil edilmez */}

        <View style={S.footer} fixed>
          <Text style={S.footerTxt}>LudenLab — ludenlab.com</Text>
          <Text style={S.footerTxt}>{today}</Text>
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(<Doc />).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${card.title.replace(/\s+/g, "_")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }    = use(params);
  const router    = useRouter();
  const [card, setCard]               = useState<CardRecord | null>(null);
  const [loading, setLoading]         = useState(true);
  const [notFound, setNotFound]       = useState(false);
  const [assignedCount, setAssignedCount] = useState(0);
  const [showAssign, setShowAssign]   = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingParent, setDownloadingParent] = useState(false);
  const [downloadingCards, setDownloadingCards] = useState(false);
  const [downloadingBoardPDF, setDownloadingBoardPDF]   = useState(false);
  const [downloadingReportPDF, setDownloadingReportPDF] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`/api/cards/${id}`);
        if (res.status === 404) { setNotFound(true); return; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setCard(data.card);
        setAssignedCount(data.card._count?.assignments ?? 0);
      } catch (err) {
        console.error("Kart yüklenemedi:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleDownloadPDF() {
    if (!card) return;
    setDownloading(true);
    const loadingToast = toast.loading("PDF hazırlanıyor…");
    try {
      const tt = card.toolType ?? "LEARNING_CARD";
      if (tt === "SOCIAL_STORY") {
        await downloadSocialStoryPDF(card);
      } else if (tt === "ARTICULATION_DRILL") {
        await downloadArticulationPDF(card);
      } else if (tt === "HOMEWORK_MATERIAL") {
        await downloadHomeworkPDFFromCard(card);
      } else if (tt === "SESSION_SUMMARY") {
        await downloadSessionSummaryFullPDF(card);
      } else if (tt === "MATCHING_GAME") {
        await downloadMatchingGameTablePDF(card);
      } else if (tt === "PHONATION_ACTIVITY") {
        await downloadPhonationPDF(card);
      } else if (tt === "WEEKLY_PLAN") {
        await downloadWeeklyPlanPDF(card);
      } else {
        // LEARNING_CARD — mevcut CardPreview PDF'i kullanılır (aşağıda buton var)
        return;
      }
      toast.success("PDF indirildi", { id: loadingToast });
    } catch (err) {
      console.error("[PDF] hata:", err);
      toast.error("PDF oluşturulamadı", { id: loadingToast });
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadParentPDF() {
    if (!card) return;
    setDownloadingParent(true);
    const loadingToast = toast.loading("Veli notu hazırlanıyor…");
    try {
      await downloadSessionSummaryParentPDF(card);
      toast.success("Veli notu indirildi", { id: loadingToast });
    } catch (err) {
      console.error("[PDF] hata:", err);
      toast.error("PDF oluşturulamadı", { id: loadingToast });
    } finally {
      setDownloadingParent(false);
    }
  }

  async function handleDownloadCardsPDF() {
    if (!card) return;
    setDownloadingCards(true);
    const loadingToast = toast.loading("Kesme kartları hazırlanıyor…");
    try {
      await downloadMatchingGameCardsPDF(card);
      toast.success("PDF indirildi", { id: loadingToast });
    } catch (err) {
      console.error("[PDF] hata:", err);
      toast.error("PDF oluşturulamadı", { id: loadingToast });
    } finally {
      setDownloadingCards(false);
    }
  }

  async function handleDownloadBoardPDF() {
    if (!card) return;
    setDownloadingBoardPDF(true);
    const loadingToast = toast.loading("Pano PDF hazırlanıyor…");
    try {
      await downloadCommBoardPDF(card, "board");
      toast.success("Pano PDF indirildi", { id: loadingToast });
    } catch (err) {
      console.error("[PDF] hata:", err);
      toast.error("PDF oluşturulamadı", { id: loadingToast });
    } finally {
      setDownloadingBoardPDF(false);
    }
  }

  async function handleDownloadReportPDF() {
    if (!card) return;
    setDownloadingReportPDF(true);
    const loadingToast = toast.loading("Tam rapor PDF hazırlanıyor…");
    try {
      await downloadCommBoardPDF(card, "report");
      toast.success("Tam rapor PDF indirildi", { id: loadingToast });
    } catch (err) {
      console.error("[PDF] hata:", err);
      toast.error("PDF oluşturulamadı", { id: loadingToast });
    } finally {
      setDownloadingReportPDF(false);
    }
  }

  if (loading) {
    return (
      <div className="poster-scope">
        <PSpinner fullPanel size={40} style={{ minHeight: "100%", padding: "80px 20px" }} />
      </div>
    );
  }

  if (notFound || !card) {
    return (
      <div
        className="poster-scope"
        style={{
          minHeight: "100%",
          background: "var(--poster-bg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          padding: "80px 20px",
          fontFamily: "var(--font-display)",
        }}
      >
        <p style={{ color: "var(--poster-ink-2)", fontWeight: 700 }}>Kart bulunamadı.</p>
        <PBtn as="button" variant="white" size="md" onClick={() => router.back()}>
          Geri dön
        </PBtn>
      </div>
    );
  }

  const toolType = card.toolType ?? "LEARNING_CARD";
  const ttBadge  = TOOL_TYPE_BADGE[toolType];

  return (
    <div
      className="poster-scope"
      style={{
        minHeight: "100%",
        background: "var(--poster-bg)",
        fontFamily: "var(--font-display)",
      }}
    >
      {/* Breadcrumb */}
      <div
        style={{
          borderBottom: "2px solid var(--poster-ink)",
          background: "var(--poster-panel)",
          padding: "12px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 880,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {card.student ? (
            <>
              <Link href="/students" style={{ color: "var(--poster-ink-2)", textDecoration: "none" }}>
                Öğrenciler
              </Link>
              <span style={{ color: "var(--poster-ink-3)" }}>/</span>
              <Link
                href={`/students/${card.student.id}`}
                style={{ color: "var(--poster-ink-2)", textDecoration: "none" }}
              >
                {card.student.name}
              </Link>
            </>
          ) : (
            <Link href="/cards" style={{ color: "var(--poster-ink-2)", textDecoration: "none" }}>
              Kütüphane
            </Link>
          )}
          <span style={{ color: "var(--poster-ink-3)" }}>/</span>
          <span
            style={{
              color: "var(--poster-ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 240,
            }}
          >
            {card.title}
          </span>
        </div>
      </div>

      <main style={{ maxWidth: 880, margin: "0 auto", padding: "24px 20px 40px" }}>
        {/* Tool type + curriculum */}
        {ttBadge && (
          <div style={{ marginBottom: 14 }}>
            <PBadge color={ttBadge.color}>{ttBadge.label}</PBadge>
          </div>
        )}

        {card.curriculumGoals.length > 0 && (
          <PCard
            rounded={14}
            style={{
              padding: "12px 14px",
              marginBottom: 14,
              background: "var(--poster-bg-2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span>🎯</span>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--poster-ink)",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  margin: 0,
                }}
              >
                Müfredat Hedefleri ({card.curriculumGoals.length})
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {card.curriculumGoals.map((goal) => (
                <div key={goal.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <PBadge color="pink">{goal.code}</PBadge>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 10, color: "var(--poster-ink-3)", margin: "0 0 2px", lineHeight: 1 }}>
                      {goal.curriculum.code} {goal.curriculum.title}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--poster-ink-2)", margin: 0, lineHeight: 1.4 }}>
                      {goal.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </PCard>
        )}

        {/* Content */}
        <PCard rounded={18} style={{ padding: 20, background: "var(--poster-panel)" }}>
          {toolType === "SOCIAL_STORY" ? (
            <SocialStoryView story={card.content as unknown as SocialStoryContent} />
          ) : toolType === "ARTICULATION_DRILL" ? (
            <ArticulationView drill={card.content as unknown as ArticulationContent} />
          ) : toolType === "HOMEWORK_MATERIAL" ? (
            <HomeworkView hw={card.content as unknown as HomeworkContent} />
          ) : toolType === "SESSION_SUMMARY" ? (
            <SessionSummaryView summary={card.content as unknown as SessionSummaryContent} />
          ) : toolType === "MATCHING_GAME" ? (
            <MatchingGameView game={card.content as unknown as MatchingGameContent} />
          ) : toolType === "PHONATION_ACTIVITY" ? (
            <PhonationView activity={card.content as unknown as PhonationActivityContent} />
          ) : toolType === "COMMUNICATION_BOARD" ? (
            <CommBoardView board={card.content as unknown as CommBoardContent} />
          ) : toolType === "WEEKLY_PLAN" ? (
            <WeeklyPlanView plan={card.content as unknown as WeeklyPlanContent} />
          ) : (
            (() => {
              const raw = card.content;
              const generatedCard: GeneratedCard = {
                title:              typeof raw.title === "string" ? raw.title : card.title,
                objective:          typeof raw.objective === "string" ? raw.objective : "",
                materials:          Array.isArray(raw.materials) ? (raw.materials as string[]) : [],
                instructions:       Array.isArray(raw.instructions) ? (raw.instructions as string[]) : [],
                exercises:          Array.isArray(raw.exercises) ? (raw.exercises as GeneratedCard["exercises"]) : [],
                therapistNotes:     typeof raw.therapistNotes === "string" ? raw.therapistNotes : "",
                progressIndicators: Array.isArray(raw.progressIndicators) ? (raw.progressIndicators as string[]) : [],
                homeExercise:       typeof raw.homeExercise === "string" ? raw.homeExercise : "",
                category:           card.category as GeneratedCard["category"],
                difficulty:         card.difficulty as GeneratedCard["difficulty"],
                ageGroup:           card.ageGroup as GeneratedCard["ageGroup"],
              };
              return <CardPreview card={generatedCard} />;
            })()
          )}
        </PCard>

        {/* Action bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 14,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <p style={{ fontSize: 12, color: "var(--poster-ink-3)", fontWeight: 700, margin: 0 }}>
            {formatDate(card.createdAt, "medium")}
            {card.student && ` · ${card.student.name}`}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {toolType === "MATCHING_GAME" && (
              <>
                <PBtn as="button" variant="accent" size="sm" onClick={handleDownloadPDF} disabled={downloading || downloadingCards}>
                  {downloading ? "Hazırlanıyor…" : "PDF — Tablo"}
                </PBtn>
                <PBtn as="button" variant="white" size="sm" onClick={handleDownloadCardsPDF} disabled={downloading || downloadingCards}>
                  {downloadingCards ? "Hazırlanıyor…" : "PDF — Kesme Kartları"}
                </PBtn>
              </>
            )}
            {(toolType === "SOCIAL_STORY" || toolType === "ARTICULATION_DRILL" || toolType === "HOMEWORK_MATERIAL" || toolType === "PHONATION_ACTIVITY" || toolType === "WEEKLY_PLAN") && (
              <PBtn as="button" variant="white" size="sm" onClick={handleDownloadPDF} disabled={downloading}>
                {downloading ? "Hazırlanıyor…" : "PDF İndir"}
              </PBtn>
            )}
            {toolType === "COMMUNICATION_BOARD" && (
              <>
                <PBtn as="button" variant="accent" size="sm" onClick={handleDownloadBoardPDF} disabled={downloadingBoardPDF || downloadingReportPDF}>
                  {downloadingBoardPDF ? "Hazırlanıyor…" : "PDF — Pano"}
                </PBtn>
                <PBtn as="button" variant="white" size="sm" onClick={handleDownloadReportPDF} disabled={downloadingBoardPDF || downloadingReportPDF}>
                  {downloadingReportPDF ? "Hazırlanıyor…" : "PDF — Tam Rapor"}
                </PBtn>
              </>
            )}
            {toolType === "SESSION_SUMMARY" && (
              <>
                <PBtn as="button" variant="accent" size="sm" onClick={handleDownloadPDF} disabled={downloading || downloadingParent}>
                  {downloading ? "Hazırlanıyor…" : "Tam Rapor PDF"}
                </PBtn>
                <PBtn as="button" variant="white" size="sm" onClick={handleDownloadParentPDF} disabled={downloading || downloadingParent}>
                  {downloadingParent ? "Hazırlanıyor…" : "Veli Notu PDF"}
                </PBtn>
              </>
            )}
            <PBtn as="button" variant="white" size="sm" onClick={() => setShowAssign(true)}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                Öğrenciye Ata
                {assignedCount > 0 && <PBadge color="ink">{assignedCount}</PBadge>}
              </span>
            </PBtn>
          </div>
        </div>
      </main>

      {showAssign && (
        <AssignStudentsModal
          cardId={card.id}
          cardTitle={card.title}
          onClose={() => setShowAssign(false)}
          onSaved={(count) => setAssignedCount(count)}
        />
      )}
    </div>
  );
}
