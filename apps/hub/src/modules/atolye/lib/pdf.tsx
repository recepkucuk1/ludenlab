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

/* LudenLab Atölye kilidi — react-pdf native vektör (viewBox 0 0 611 260).
   teal "Luden"+"Atölye" · turuncu "Lab"+yörünge. Tek <Logo> ile aynı path'ler. */
const ATOLYE_LUDEN = [
  "M79.42,139.2v-36.21h13.33v36.19c0,15.01,8.29,22.6,20.91,22.6s20.91-7.57,20.91-22.6v-36.19h13.33v36.19c0,23.01-13.75,34.94-34.24,34.94s-34.24-11.78-34.24-34.94h0v.02Z",
  "M153.24,137.23c0-23.01,17.12-36.06,35.22-36.06,11.23,0,20.77,5.04,25.82,14.03v-34.66h13.33v56.54c0,22.6-15.43,37.04-36.92,37.04s-37.46-15.16-37.46-36.9h0v.02h0ZM214.29,137.65c0-14.03-9.54-24.13-23.71-24.13s-23.86,10.1-23.86,24.13,9.55,24.13,23.86,24.13,23.71-10.1,23.71-24.13h0Z",
  "M232.96,137.65c0-21.05,15.45-36.48,37.34-36.48s37.04,15.43,37.04,36.48v4.91h-60.34c1.96,12.35,11.23,19.22,23.3,19.22,8.99,0,15.29-2.81,19.37-8.84h14.73c-5.33,12.91-17.96,21.18-34.1,21.18-21.89,0-37.34-15.44-37.34-36.47ZM293.31,130.63c-2.66-11.08-11.78-17.12-23.01-17.12s-20.21,6.17-22.87,17.12h45.89-.01Z",
  "M312.11,136.24c0-23.15,13.75-35.08,34.23-35.08s34.24,11.78,34.24,35.08v36.06h-13.33v-36.06c0-15.01-8.29-22.73-20.91-22.73s-20.91,7.72-20.91,22.73v36.06h-13.33v-36.06h0Z",
  "M76.75,171.88h-27.4c-15.91,0-28.86-12.94-28.86-28.85v-62.48h13.93v62.5c0,8.22,6.7,14.92,14.92,14.92h27.4v13.93h0v-.02h0Z",
];
const ATOLYE_LAB = [
  "M127.99,221.97c0-11.48-8.66-17.99-17.82-17.99-5.68,0-10.51,2.51-13.06,7v-17.29h-6.74v28.21c0,11.28,7.81,18.48,18.68,18.48s18.95-7.56,18.95-18.41h-.01ZM97.1,222.18c0-7,4.83-12.04,12-12.04s12.07,5.04,12.07,12.04-4.83,12.04-12.07,12.04-12-5.04-12-12.04h0Z",
  "M48.96,239.27h-13.86c-8.05,0-14.6-6.46-14.6-14.39v-31.17h7.05v31.18c0,4.1,3.39,7.44,7.55,7.44h13.86v6.95h0Z",
  "M50.22,222.5c0-10.83,7.79-18.44,18.91-18.44s18.63,7.4,18.63,18.44v16.97h-6.16v-7.54c-2.34,5.59-7.51,8.45-13.6,8.45-9.14,0-17.78-6.5-17.78-17.88ZM81.11,222.22c0-6.98-4.82-12.01-12.04-12.01s-12.04,5.03-12.04,12.01,4.82,12.01,12.04,12.01,12.04-5.03,12.04-12.01Z",
];
const ATOLYE_ORBIT =
  "M591.16,117.7l-.02-.1c-4.3-15.99-30.29-16.21-38.88-16.28-18.52.3-38.38,3.42-58.85,9.17-.82-15.97-3.01-32.6-6.6-49.59-1.81-7.69-6.43-27.31-14.84-36.45-1.81-2.02-3.94-3.64-6.44-4.39-.87-.26-1.76-.41-2.69-.44h-.15c-12.85.63-19.31,24.15-23.05,41.81-3,14.99-4.81,31.14-5.38,48.03-.26,8.8-.2,16.96.2,24.64-7.59,4.32-16.11,10.08-20.42,16.35-1.53,2.18-2.62,4.56-2.8,7.11-.07.92-.02,1.84.16,2.76l.03.15c2.43,8.68,15.21,11.8,28.87,12.79,2.77,10.09,9.55,30.42,24.44,30.69h.11c15.83-.61,21.98-23.62,24.22-32.97,5.43-.76,10.93-1.66,16.48-2.72,23.63-4.63,42.16-10.53,58.32-18.58,7.59-3.91,30.67-15.82,27.3-31.98h0ZM433.65,168.35c-4.58-.61-16.6-2.24-18.56-8.83,0-.03-.01-.05-.02-.08-.26-1.48,0-3.02.7-4.59,1.3-2.7,4.47-6.48,11.89-11.57,2.31-1.48,4.68-2.86,7.08-4.16.77,10.67,2.22,20.42,4.39,29.63-1.83-.1-3.65-.23-5.48-.41h0ZM470.79,182.07l-.03.07c-.76,1.44-2.18,4.13-3.74,5.93-1.25,1.44-3.49,1.5-4.79.11-1.72-1.83-3.86-5.23-6.2-10.76-.48-1.24-.94-2.48-1.39-3.73.93,0,1.85,0,2.75-.03,5.62-.15,11.36-.49,17.19-1.01-1.09,3.26-2.31,6.38-3.78,9.42h0ZM479.04,155.36c-.79,3.74-1.59,7.25-2.47,10.57-7.65,1.41-15.57,2.44-23.59,2.84-3.67-11.58-5.97-23.55-7.47-34.89,12.56-5.48,25.65-9.16,38.04-11.96-.88,11.65-2.39,22.86-4.51,33.44h0ZM484.28,108.91c-.05,1.47-.13,2.91-.2,4.37-12.43,3.94-25.02,8.82-37.66,14.6-.47.23-1,.49-1.56.76-.78-6.8-1.3-13.3-1.69-19.26-.99-21.42-.95-46.47,6.89-69.85,1.61-4.32,5.86-15.66,12.74-16.1h.08c1.52.07,2.97.68,4.35,1.71,2.35,1.87,5.33,5.79,8.65,14.11,8.34,23.19,8.92,48.24,8.39,69.67h.01,0ZM576.29,123.63c-1.41,2.08-4.25,4.92-9.15,8.41-20.33,13.72-44.73,21.95-63.67,27.57-4.13,1.14-8.42,2.27-12.82,3.33,2.33-13.52,3.35-28,3.08-43.17,16.18-3.09,31.91-4.84,46.76-5.22,10.52-.17,19.3.13,27.94,2.11l.07.02c1.58.42,4.52,1.21,6.62,2.32,1.68.89,2.24,3.06,1.17,4.64h0Z";
const ATOLYE_TEXT =
  "M133.36 239.24H141.98V225.72H164.0V239.24H172.83V212.81C172.83 200.74 165.79 193.22 153.02 193.22C140.26 193.22 133.36 200.74 133.36 212.81ZM141.98 217.71V212.81C141.98 205.57 145.57 201.43 152.96 201.43C160.41 201.43 164.0 205.57 164.0 212.81V217.71Z M192.35 240.14C200.63 240.14 206.29 235.58 206.29 226.13V225.23H198.08V226.13C198.08 230.75 195.74 232.48 192.35 232.48C188.97 232.48 186.63 230.68 186.63 226.13V212.61H204.22V205.15H186.63V193.08H178.42V226.13C178.42 235.58 184.07 240.14 192.35 240.14Z M220.16 199.77C222.85 199.77 224.92 197.7 224.92 195.01C224.92 192.32 222.85 190.25 220.16 190.25C217.47 190.25 215.4 192.32 215.4 195.01C215.4 197.7 217.47 199.77 220.16 199.77ZM234.03 199.77C236.79 199.77 238.86 197.7 238.86 195.01C238.86 192.32 236.79 190.25 234.03 190.25C231.34 190.25 229.27 192.32 229.27 195.01C229.27 197.7 231.34 199.77 234.03 199.77ZM227.13 240.14C237.89 240.14 245.48 232.55 245.48 222.2C245.48 211.85 237.89 204.26 227.13 204.26C216.37 204.26 208.78 211.85 208.78 222.2C208.78 232.55 216.37 240.14 227.13 240.14ZM227.13 232.48C221.13 232.48 217.06 228.2 217.06 222.2C217.06 216.19 221.13 211.92 227.13 211.92C233.13 211.92 237.14 216.19 237.14 222.2C237.14 228.2 233.13 232.48 227.13 232.48Z M250.66 239.24H258.87V190.25H250.66Z M282.12 254.7C291.58 254.7 299.1 249.94 299.1 238.07V205.15H290.89V222.47C290.89 228.82 287.3 232.06 282.26 232.06C277.09 232.06 273.64 228.96 273.64 222.47V205.15H265.42V222.47C265.42 234.62 272.88 239.72 280.74 239.72C285.23 239.72 288.82 237.72 290.89 234.0V238.27C290.89 244.9 287.71 247.59 282.12 247.59C277.98 247.59 275.29 246.14 273.91 242.97H265.7C267.63 251.04 274.19 254.7 282.12 254.7Z M322.56 240.14C330.63 240.14 336.84 235.93 339.39 229.44H330.63C328.9 231.65 326.21 232.69 322.56 232.69C317.73 232.69 313.93 230.06 312.83 225.09H340.77V222.2C340.77 211.85 333.32 204.26 322.56 204.26C311.79 204.26 304.2 211.85 304.2 222.2C304.2 232.55 311.79 240.14 322.56 240.14ZM313.04 218.54C314.35 214.06 317.93 211.71 322.56 211.71C327.04 211.71 330.77 213.99 332.08 218.54Z";

export async function downloadDraftPdf(title: string, markdown: string): Promise<void> {
  // Sadece react-pdf lazy-import (büyük); remark yığını statik (react-markdown
  // ile aynı bundle, dinamik-chunk interop riskini kaldırır).
  const { pdf, Document, Page, Text, View, StyleSheet, Font, Link, Svg, Path } = await import(
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
    brandLogo: { width: 96, height: 41 },
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
          // NotoSans italic kayıtlı değil → react-pdf "could not resolve font" atar.
          // Vurguyu normal metinle render et (fontStyle:italic KULLANMA).
          return (
            <Text key={key}>{inline(n.children, key)}</Text>
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
          <Svg viewBox="0 0 611 260" style={styles.brandLogo}>
            {ATOLYE_LUDEN.map((d, i) => (
              <Path key={`l${i}`} d={d} fill="#023435" />
            ))}
            <Path d={ATOLYE_TEXT} fill="#023435" />
            <Path d={ATOLYE_ORBIT} fill="#fe703a" />
            {ATOLYE_LAB.map((d, i) => (
              <Path key={`b${i}`} d={d} fill="#fe703a" />
            ))}
          </Svg>
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
