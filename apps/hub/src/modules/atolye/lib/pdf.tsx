"use client";

import type { ReactNode } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { TASLAK_NOTU } from "./bep";

/* Atölye taslakları için GERÇEK PDF (tek tıkla indirme) — @react-pdf/renderer.
   Markdown → mdast (remark-gfm; tablolar dahil) → react-pdf ilkelleri (vektörel,
   indirilebilir; tarayıcı yazdırma diyaloğu YOK). Üretim paneli (ToolResult) ve
   kayıtlı taslak görüntüleyici (TaslakViewerModal) ortak kullanır. Ağır
   bağımlılıklar yalnız kullanıcı "PDF indir" deyince lazy-import edilir. */

interface MdNode {
  type: string;
  value?: string;
  depth?: number;
  ordered?: boolean;
  start?: number | null;
  url?: string;
  align?: (string | null)[];
  children?: MdNode[];
}

const safeFileName = (s: string) =>
  s
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "taslak";

export async function downloadDraftPdf(title: string, markdown: string): Promise<void> {
  // Sadece react-pdf lazy-import (büyük); remark yığını statik (react-markdown
  // ile aynı bundle, dinamik-chunk interop riskini kaldırır).
  const { pdf, Document, Page, Text, View, StyleSheet, Font, Link } = await import(
    "@react-pdf/renderer"
  );

  // Türkçe karakterler için NotoSans (built-in fontlar TR'yi tam karşılamaz).
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`, fontWeight: "bold" },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]); // kelimeyi ortadan bölme

  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .parse(markdown) as unknown as { children: MdNode[] };

  const INK = "#18272D";
  const ACCENT = "#1f6feb";
  const FAINT = "#e6e9ea";
  const PANEL = "#f4f2ec";

  const styles = StyleSheet.create({
    page: {
      fontFamily: "NotoSans",
      fontSize: 10.5,
      lineHeight: 1.5,
      color: INK,
      paddingTop: 86,
      paddingBottom: 52,
      paddingHorizontal: 44,
    },
    brand: {
      position: "absolute",
      top: 30,
      left: 44,
      right: 44,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 2,
      borderBottomColor: INK,
      paddingBottom: 10,
    },
    brandName: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 12 },
    docTitle: { fontSize: 9, color: "#6b7378" },
    h1: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 17, marginTop: 10, marginBottom: 6 },
    h2: {
      fontFamily: "NotoSans",
      fontWeight: "bold",
      fontSize: 13.5,
      marginTop: 13,
      marginBottom: 5,
      borderBottomWidth: 1.5,
      borderBottomColor: INK,
      paddingBottom: 3,
    },
    h3: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 11.5, marginTop: 9, marginBottom: 4 },
    p: { marginVertical: 3.5 },
    bold: { fontFamily: "NotoSans", fontWeight: "bold" },
    italic: { fontStyle: "italic" },
    strike: { textDecoration: "line-through" },
    link: { color: ACCENT, textDecoration: "underline" },
    inlineCode: { fontFamily: "Courier", fontSize: 9.5 },
    list: { marginVertical: 4, paddingLeft: 2 },
    li: { flexDirection: "row", marginVertical: 1.5, alignItems: "flex-start" },
    liMarker: { width: 15, fontFamily: "NotoSans", color: ACCENT, fontWeight: "bold" },
    liBody: { flex: 1 },
    hr: { borderBottomWidth: 1, borderBottomColor: FAINT, marginVertical: 8 },
    quote: { borderLeftWidth: 3, borderLeftColor: ACCENT, paddingLeft: 8, marginVertical: 5, color: "#52585c" },
    pre: { backgroundColor: PANEL, borderWidth: 1, borderColor: FAINT, borderRadius: 4, padding: 7, marginVertical: 5 },
    preText: { fontFamily: "Courier", fontSize: 9 },
    table: { marginVertical: 7, borderTopWidth: 1, borderLeftWidth: 1, borderColor: INK },
    tr: { flexDirection: "row" },
    trHead: { backgroundColor: PANEL },
    trEven: { backgroundColor: "#faf9f6" },
    td: { flex: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: INK, padding: 4 },
    tdText: { fontSize: 9.5 },
    thText: { fontFamily: "NotoSans", fontWeight: "bold" },
    alignCenter: { textAlign: "center" },
    alignRight: { textAlign: "right" },
    notu: {
      marginTop: 18,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: INK,
      borderStyle: "dashed",
      fontSize: 8.5,
      color: "#52585c",
    },
  });

  function inline(nodes: MdNode[] | undefined, kp: string): ReactNode[] {
    if (!nodes) return [];
    return nodes.map((n, i) => {
      const key = `${kp}-${i}`;
      switch (n.type) {
        case "text":
          return n.value ?? "";
        case "strong":
          return (
            <Text key={key} style={styles.bold}>
              {inline(n.children, key)}
            </Text>
          );
        case "emphasis":
          return (
            <Text key={key} style={styles.italic}>
              {inline(n.children, key)}
            </Text>
          );
        case "delete":
          return (
            <Text key={key} style={styles.strike}>
              {inline(n.children, key)}
            </Text>
          );
        case "inlineCode":
          return (
            <Text key={key} style={styles.inlineCode}>
              {n.value ?? ""}
            </Text>
          );
        case "break":
          return "\n";
        case "link":
          return (
            <Link key={key} src={n.url ?? "#"} style={styles.link}>
              {inline(n.children, key)}
            </Link>
          );
        default:
          return <Text key={key}>{inline(n.children, key)}</Text>;
      }
    });
  }

  function listItems(list: MdNode, kp: string): ReactNode[] {
    const ordered = !!list.ordered;
    const start = list.start ?? 1;
    return (list.children ?? []).map((li, i) => (
      <View key={`${kp}-li-${i}`} style={styles.li} wrap={false}>
        <Text style={styles.liMarker}>{ordered ? `${start + i}.` : "•"}</Text>
        <View style={styles.liBody}>{blocks(li.children ?? [], `${kp}-li-${i}`)}</View>
      </View>
    ));
  }

  function renderTable(node: MdNode, key: string): ReactNode {
    const align = node.align ?? [];
    const rows = node.children ?? [];
    return (
      <View key={key} style={styles.table}>
        {rows.map((row, r) => {
          const head = r === 0;
          const rowStyle = head
            ? { ...styles.tr, ...styles.trHead }
            : r % 2 === 1
              ? { ...styles.tr, ...styles.trEven }
              : styles.tr;
          return (
            <View key={`${key}-r${r}`} style={rowStyle} wrap={false}>
              {(row.children ?? []).map((cell, c) => {
                const a = align[c];
                const base =
                  a === "center"
                    ? { ...styles.tdText, ...styles.alignCenter }
                    : a === "right"
                      ? { ...styles.tdText, ...styles.alignRight }
                      : styles.tdText;
                const cellText = head ? { ...base, ...styles.thText } : base;
                return (
                  <View key={`${key}-r${r}-c${c}`} style={styles.td}>
                    <Text style={cellText}>{inline(cell.children, `${key}-r${r}-c${c}`)}</Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  }

  function blocks(nodes: MdNode[], kp: string): ReactNode[] {
    const out: ReactNode[] = [];
    nodes.forEach((n, i) => {
      const key = `${kp}-${i}`;
      switch (n.type) {
        case "heading": {
          const d = n.depth ?? 1;
          const hs = d === 1 ? styles.h1 : d === 2 ? styles.h2 : styles.h3;
          out.push(
            <Text key={key} style={hs} wrap={false}>
              {inline(n.children, key)}
            </Text>,
          );
          break;
        }
        case "paragraph":
          out.push(
            <Text key={key} style={styles.p}>
              {inline(n.children, key)}
            </Text>,
          );
          break;
        case "list":
          out.push(
            <View key={key} style={styles.list}>
              {listItems(n, key)}
            </View>,
          );
          break;
        case "table":
          out.push(renderTable(n, key));
          break;
        case "thematicBreak":
          out.push(<View key={key} style={styles.hr} />);
          break;
        case "blockquote":
          out.push(
            <View key={key} style={styles.quote}>
              {blocks(n.children ?? [], key)}
            </View>,
          );
          break;
        case "code":
          out.push(
            <View key={key} style={styles.pre}>
              <Text style={styles.preText}>{n.value ?? ""}</Text>
            </View>,
          );
          break;
        default:
          if (n.children) out.push(...blocks(n.children, key));
      }
    });
    return out;
  }

  const Doc = () => (
    <Document title={title} author="LudenLab Atölye">
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.brand} fixed>
          <Text style={styles.brandName}>LudenLab Atölye</Text>
          <Text style={styles.docTitle}>{title}</Text>
        </View>
        {blocks(tree.children, "b")}
        <Text style={styles.notu}>⚠️ {TASLAK_NOTU}</Text>
      </Page>
    </Document>
  );

  const blob = await pdf(<Doc />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFileName(title)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
