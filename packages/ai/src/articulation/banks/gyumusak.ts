import type { BankWord, Position } from "../types";

// Self-verification for /ğ/ ("ğ") — yumuşak g / soft g:
// initial: EMPTY — No Turkish word begins with ğ. This is an absolute phonotactic rule.
// medial:  word.toLocaleLowerCase("tr-TR").slice(1,-1).includes("ğ")
// final:   word.toLocaleLowerCase("tr-TR").endsWith("ğ")
// syllableBreak.replace(/-/g,"") === word  (checked for every entry)
//
// NOTE — ğ-initial is empty by Turkish phonotactics (not a gap in the list).
// ğ-final is sparse; only concrete nouns are listed.
// ğ-medial is the rich position for this sound.

export const words: Record<Position, BankWord[]> = {
  // Absolute rule: NO Turkish word begins with ğ.
  initial: [],

  medial: [
    // ğ inside word.slice(1,-1) — NOT first, NOT last character
    // "ağaç"     slice(1,-1)="ğa" has ğ ✓  "a-ğaç" → "ağaç" ✓  (tree)
    { word: "ağaç",     syllableBreak: "a-ğaç",      visualPrompt: "a tree" },
    // "kağıt"    slice(1,-1)="ağı" has ğ ✓  "ka-ğıt" → "kağıt" ✓  (paper)
    { word: "kağıt",    syllableBreak: "ka-ğıt",      visualPrompt: "a sheet of paper" },
    // "iğne"     slice(1,-1)="ğn" has ğ ✓  "iğ-ne" → "iğne" ✓  (needle/injection)
    { word: "iğne",     syllableBreak: "iğ-ne",       visualPrompt: "a sewing needle" },
    // "düğme"    slice(1,-1)="üğm" has ğ ✓  "düğ-me" → "düğme" ✓  (button)
    { word: "düğme",    syllableBreak: "düğ-me",      visualPrompt: "a round clothing button" },
    // "soğan"    slice(1,-1)="oğa" has ğ ✓  "so-ğan" → "soğan" ✓  (onion)
    { word: "soğan",    syllableBreak: "so-ğan",      visualPrompt: "a brown onion" },
    // "boğa"     slice(1,-1)="oğ" has ğ ✓  "bo-ğa" → "boğa" ✓  (bull)
    { word: "boğa",     syllableBreak: "bo-ğa",       visualPrompt: "a bull animal" },
    // "sığır"    slice(1,-1)="ığı" has ğ ✓  "sı-ğır" → "sığır" ✓  (cattle/cow)
    { word: "sığır",    syllableBreak: "sı-ğır",      visualPrompt: "a cattle cow" },
    // "yoğurt"   slice(1,-1)="oğur" has ğ ✓  "yo-ğurt" → "yoğurt" ✓  (yogurt)
    { word: "yoğurt",   syllableBreak: "yo-ğurt",     visualPrompt: "a bowl of yogurt" },
    // "oğlak"    slice(1,-1)="ğla" has ğ ✓  "oğ-lak" → "oğlak" ✓  (baby goat/kid)
    { word: "oğlak",    syllableBreak: "oğ-lak",      visualPrompt: "a baby goat" },
    // "ciğer"    slice(1,-1)="iğe" has ğ ✓  "ci-ğer" → "ciğer" ✓  (liver)
    { word: "ciğer",    syllableBreak: "ci-ğer",      visualPrompt: "a piece of liver meat" },
    // "eğe"      slice(1,-1)="ğ" has ğ ✓  "e-ğe" → "eğe" ✓  (file/rasp tool)
    { word: "eğe",      syllableBreak: "e-ğe",        visualPrompt: "a metal file rasp tool" },
    // "tuğla"    slice(1,-1)="uğl" has ğ ✓  "tuğ-la" → "tuğla" ✓  (brick)
    { word: "tuğla",    syllableBreak: "tuğ-la",      visualPrompt: "a red clay brick" },
    // "mağara"   slice(1,-1)="ağar" has ğ ✓  "ma-ğa-ra" → "mağara" ✓  (cave)
    { word: "mağara",   syllableBreak: "ma-ğa-ra",    visualPrompt: "a stone cave entrance" },
    // "buğday"   slice(1,-1)="uğda" has ğ ✓  "buğ-day" → "buğday" ✓  (wheat)
    { word: "buğday",   syllableBreak: "buğ-day",     visualPrompt: "a bunch of wheat stalks" },
    // "çiğdem"   slice(1,-1)="iğde" has ğ ✓  "çiğ-dem" → "çiğdem" ✓  (crocus flower)
    { word: "çiğdem",   syllableBreak: "çiğ-dem",     visualPrompt: "a purple crocus flower" },
    // "ağıl"     slice(1,-1)="ğı" has ğ ✓  "a-ğıl" → "ağıl" ✓  (sheep pen/fold)
    { word: "ağıl",     syllableBreak: "a-ğıl",       visualPrompt: "a sheep pen enclosure" },
    // "değnek"   slice(1,-1)="eğne" has ğ ✓  "değ-nek" → "değnek" ✓  (stick/rod)
    { word: "değnek",   syllableBreak: "değ-nek",     visualPrompt: "a wooden stick rod" },
    // "bağcık"   slice(1,-1)="ağcı" has ğ ✓  "bağ-cık" → "bağcık" ✓  (small cord/shoelace)
    { word: "bağcık",   syllableBreak: "bağ-cık",     visualPrompt: "a shoelace cord" },
    // "çağla"    slice(1,-1)="ağl" has ğ ✓  "çağ-la" → "çağla" ✓  (unripe almond/plum)
    { word: "çağla",    syllableBreak: "çağ-la",      visualPrompt: "an unripe green almond" },
    // "uğur"     slice(1,-1)="ğu" has ğ ✓  "u-ğur" → "uğur" ✓  (good luck — as a ladybug uğurböceği, but "uğur" alone is abstract)
    // SKIP — abstract
    // "yağmur"   slice(1,-1)="ağmu" has ğ ✓  "yağ-mur" → "yağmur" ✓  (rain)
    { word: "yağmur",   syllableBreak: "yağ-mur",     visualPrompt: "rain falling from clouds" },
    // "eğri"     slice(1,-1)="ğr" has ğ ✓  "eğ-ri" → "eğri" ✓  (curve/bent) — adjective → SKIP
    // "ağrı"     slice(1,-1)="ğr" has ğ ✓  "ağ-rı" → "ağrı" ✓  — pain (abstract) → SKIP
    // "öğretmen" slice(1,-1)="ğretme" has ğ ✓  "öğ-ret-men" → "öğretmen" ✓  (teacher) — person noun ✓
    { word: "öğretmen", syllableBreak: "öğ-ret-men",  visualPrompt: "a schoolteacher at a blackboard" },
    // "dağlık" → abstract/adjective; "sağlık" → health (abstract)
    // "boğaz"    slice(1,-1)="oğa" has ğ ✓  "bo-ğaz" → "boğaz" ✓  (throat/strait)
    { word: "boğaz",    syllableBreak: "bo-ğaz",      visualPrompt: "a human throat" },
    // "eğlence"  slice(1,-1)="ğlenc" has ğ ✓  "eğ-len-ce" → "eğlence" ✓  (fun/entertainment — fairly concrete as amusement park)
    // → too abstract; SKIP
    // "sığınak"  slice(1,-1)="ığına" has ğ ✓  "sı-ğı-nak" → "sığınak" ✓  (shelter/bunker)
    { word: "sığınak",  syllableBreak: "sı-ğı-nak",   visualPrompt: "an underground shelter bunker" },
    // "çığ"      → avalanche, ends with ğ → final; also "çığ" slice(1,-1)="ı" no ğ
    // "yoğun" → dense (adjective) → SKIP
    // "ağustos"  slice(1,-1)="ğusto" has ğ ✓  "a-ğus-tos" → "ağustos" ✓  (August)
    // → month name (not concrete noun) → SKIP
    // "öğle"     slice(1,-1)="ğl" has ğ ✓  "öğ-le" → "öğle" ✓  (noon) — time (abstract) → SKIP
    // "muğla" → proper noun; "ağız":
    // "ağız"     slice(1,-1)="ğı" has ğ ✓  "a-ğız" → "ağız" ✓  (mouth)
    { word: "ağız",     syllableBreak: "a-ğız",       visualPrompt: "an open human mouth" },
    // "iğneada" → proper noun; "tuğba" → proper name
    // "değirmen" slice(1,-1)="eğirme" has ğ ✓  "de-ğir-men" → "değirmen" ✓  (mill/windmill)
    { word: "değirmen", syllableBreak: "de-ğir-men",  visualPrompt: "a stone windmill" },
    // Total medial: 20 words ✓  (rich position as expected)
  ],

  final: [
    // ğ at last character ✓ — very sparse in concrete Turkish nouns
    // "dağ"      ends with ğ ✓  "dağ" → "dağ" ✓  (mountain)
    { word: "dağ",      syllableBreak: "dağ",         visualPrompt: "a mountain" },
    // "bağ"      ends with ğ ✓  "bağ" → "bağ" ✓  (vineyard/garden/knot)
    { word: "bağ",      syllableBreak: "bağ",         visualPrompt: "a vineyard with grapevines" },
    // "yağ"      ends with ğ ✓  "yağ" → "yağ" ✓  (oil/fat)
    { word: "yağ",      syllableBreak: "yağ",         visualPrompt: "a bottle of cooking oil" },
    // "ağ"       ends with ğ ✓  "ağ" → "ağ" ✓  (net/web)
    { word: "ağ",       syllableBreak: "ağ",          visualPrompt: "a fishing net" },
    // "çığ"      ends with ğ ✓  "çığ" → "çığ" ✓  (avalanche)
    { word: "çığ",      syllableBreak: "çığ",         visualPrompt: "a snow avalanche on a mountain" },
    // NOTE: genuine ğ-final concrete nouns are very few in modern Turkish.
    // "sağ" → right-side (adjective); "soğ" not a word; "tuğ" → archaic banner (not child word)
    // "boğ" not a standalone noun; "kağ" not a word
    // This position is honestly sparse — 5 words is complete.
  ],
};
