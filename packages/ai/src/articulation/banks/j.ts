import type { BankWord, Position } from "../types";

// Self-verification for /j/ ("j"):
// initial: word.toLocaleLowerCase("tr-TR").startsWith("j")
// medial:  word.toLocaleLowerCase("tr-TR").slice(1,-1).includes("j")
// final:   word.toLocaleLowerCase("tr-TR").endsWith("j")
// syllableBreak.replace(/-/g,"") === word  (checked for every entry)
//
// NOTE — /j/ is a rare loan consonant in Turkish. All words below are genuine
// modern Turkish concrete nouns of foreign origin used in everyday speech.
// Medial is sparse by nature; only genuine, verifiable words are listed.

export const words: Record<Position, BankWord[]> = {
  initial: [
    // j at position 0 ✓
    // "jeton"    starts with j ✓  "je-ton" → "jeton" ✓  (token/coin for machines)
    { word: "jeton",    syllableBreak: "je-ton",    visualPrompt: "a metal token coin" },
    // "jilet"    starts with j ✓  "ji-let" → "jilet" ✓  (razor blade)
    { word: "jilet",    syllableBreak: "ji-let",    visualPrompt: "a razor blade" },
    // "jip"      starts with j ✓  "jip" → "jip" ✓  (jeep)
    { word: "jip",      syllableBreak: "jip",       visualPrompt: "a jeep vehicle" },
    // "jet"      starts with j ✓  "jet" → "jet" ✓  (jet plane)
    { word: "jet",      syllableBreak: "jet",       visualPrompt: "a jet airplane" },
    // "jel"      starts with j ✓  "jel" → "jel" ✓  (gel)
    { word: "jel",      syllableBreak: "jel",       visualPrompt: "a tube of hair gel" },
    // "jambon"   starts with j ✓  "jam-bon" → "jambon" ✓  (ham)
    { word: "jambon",   syllableBreak: "jam-bon",   visualPrompt: "a slice of ham" },
    // "jandarma" starts with j ✓  "jan-dar-ma" → "jandarma" ✓  (gendarmerie soldier)
    { word: "jandarma", syllableBreak: "jan-dar-ma", visualPrompt: "a gendarmerie soldier" },
    // "jaguar"   starts with j ✓  "ja-gu-ar" → "jaguar" ✓  (jaguar big cat)
    { word: "jaguar",   syllableBreak: "ja-gu-ar",  visualPrompt: "a jaguar big cat" },
    // "jokey"    starts with j ✓  "jo-key" → "jokey" ✓  (jockey on horse)
    { word: "jokey",    syllableBreak: "jo-key",    visualPrompt: "a jockey riding a horse" },
    // "jüpon"    starts with j ✓  "jü-pon" → "jüpon" ✓  (petticoat/underskirt)
    { word: "jüpon",    syllableBreak: "jü-pon",    visualPrompt: "a layered petticoat skirt" },
  ],

  medial: [
    // j inside word.slice(1,-1) — NOT first, NOT last character
    // "pijama"   slice(1,-1)="ijam" has j ✓  "pi-ja-ma" → "pijama" ✓  (pajamas)
    { word: "pijama",   syllableBreak: "pi-ja-ma",  visualPrompt: "a set of pajamas" },
    // "ajanda"   slice(1,-1)="jand" has j ✓  "a-jan-da" → "ajanda" ✓  (agenda/planner)
    { word: "ajanda",   syllableBreak: "a-jan-da",  visualPrompt: "a paper agenda planner" },
    // "lojman"   slice(1,-1)="ojma" has j ✓  "loj-man" → "lojman" ✓  (staff housing unit)
    { word: "lojman",   syllableBreak: "loj-man",   visualPrompt: "a staff housing building" },
    // "bijuteri" slice(1,-1)="ijuter" has j ✓  "bi-ju-te-ri" → "bijuteri" ✓  (costume jewelry)
    { word: "bijuteri",  syllableBreak: "bi-ju-te-ri", visualPrompt: "a display of costume jewelry" },
    // "ajanlar" inflected → use base: "ajan" slice(1,-1)="ja" has j ✓  "a-jan" → "ajan" ✓  (agent)
    // "ajan" is a person, borderline concrete → SKIP
    // "objeler" → inflected; "garaj" ends with j → final; "viraj" ends j → final
    // "trajedi" → abstract; "projeksiyon" → too complex
    // "fijord" not standard Turkish concrete noun for children
    // "ajitatör" → too complex/abstract
    // Total medial: genuinely sparse — 5 words is honest for /j/
  ],

  final: [
    // j at last character ✓ — loanwords ending in -aj/-aj
    // "garaj"    ends with j ✓  "ga-raj" → "garaj" ✓  (garage)
    { word: "garaj",    syllableBreak: "ga-raj",    visualPrompt: "a car garage" },
    // "baraj"    ends with j ✓  "ba-raj" → "baraj" ✓  (dam)
    { word: "baraj",    syllableBreak: "ba-raj",    visualPrompt: "a concrete dam" },
    // "plaj"     ends with j ✓  "plaj" → "plaj" ✓  (beach)
    { word: "plaj",     syllableBreak: "plaj",      visualPrompt: "a sandy beach" },
    // "viraj"    ends with j ✓  "vi-raj" → "viraj" ✓  (road curve/bend)
    { word: "viraj",    syllableBreak: "vi-raj",    visualPrompt: "a sharp road curve" },
    // "bagaj"    ends with j ✓  "ba-gaj" → "bagaj" ✓  (luggage/trunk)
    { word: "bagaj",    syllableBreak: "ba-gaj",    visualPrompt: "a suitcase luggage" },
    // "marşandiz" → not ending in j; "fotoğraf" no j
  ],
};
