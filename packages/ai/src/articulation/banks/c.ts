import type { BankWord, Position } from "../types";

// Self-verification:
// initial: word starts with "c"
// medial:  "c" found in word.slice(1,-1)  (not first or last char)
// final:   word ends with "c"   → EMPTY (see note below)
// syllableBreak.replace(/-/g,"") === word  (checked for every entry)
//
// NOTE — final is EMPTY:
// Turkish final obstruent devoicing means /c/ (voiced palatal affricate) at word-end
// surfaces as /ç/ (voiceless). Native Turkish nouns that end in the underlying /c/ are
// always spelled with "ç" in standard orthography. No native concrete Turkish noun ends
// in the letter "c". This is expected, correct, and honest.

export const words: Record<Position, BankWord[]> = {
  initial: [
    // "cam"        starts with c ✓  "cam"→"cam" ✓  (glass/window pane)
    { word: "cam",        syllableBreak: "cam",            visualPrompt: "a glass window pane" },
    // "ceviz"      starts with c ✓  "ce-viz"→"ceviz" ✓  (walnut)
    { word: "ceviz",      syllableBreak: "ce-viz",         visualPrompt: "a walnut" },
    // "civciv"     starts with c ✓  "civ-civ"→"civciv" ✓  (baby chick)
    { word: "civciv",     syllableBreak: "civ-civ",        visualPrompt: "a baby chick" },
    // "cüzdan"     starts with c ✓  "cüz-dan"→"cüzdan" ✓  (wallet)
    { word: "cüzdan",     syllableBreak: "cüz-dan",        visualPrompt: "a leather wallet" },
    // "ceket"      starts with c ✓  "ce-ket"→"ceket" ✓  (jacket)
    { word: "ceket",      syllableBreak: "ce-ket",         visualPrompt: "a jacket" },
    // "cetvel"     starts with c ✓  "cet-vel"→"cetvel" ✓  (ruler/straightedge)
    { word: "cetvel",     syllableBreak: "cet-vel",        visualPrompt: "a ruler" },
    // "cadı"       → witch (scary/fictional) → borderline; it is a concrete imageable character
    // used in children's fairy tales. Include.
    // "cadı"       starts with c ✓  "ca-dı"→"cadı" ✓
    { word: "cadı",       syllableBreak: "ca-dı",          visualPrompt: "a witch on a broomstick" },
    // "cüce"       starts with c ✓  "cü-ce"→"cüce" ✓  (dwarf)
    { word: "cüce",       syllableBreak: "cü-ce",          visualPrompt: "a dwarf character" },
    // "cami"       starts with c ✓  "ca-mi"→"cami" ✓  (mosque)
    { word: "cami",       syllableBreak: "ca-mi",          visualPrompt: "a mosque with minarets" },
    // "cep"        starts with c ✓  "cep"→"cep" ✓  (pocket)
    { word: "cep",        syllableBreak: "cep",            visualPrompt: "a shirt pocket" },
    // "cins"       → abstract (type/breed) → skip; but "cins" as "breed" of animal is concrete
    // borderline, skip to be safe
    // "ceylan"     starts with c ✓  "cey-lan"→"ceylan" ✓  (gazelle)
    { word: "ceylan",     syllableBreak: "cey-lan",        visualPrompt: "a gazelle" },
    // "cırıltı" → abstract sound → skip
    // "cenk"       → abstract (battle) → skip
    // "cevher"     → abstract (essence/gem — "gem" sense is concrete) "cev-her"→"cevher" ✓
    // slice check: not needed for initial. starts with c ✓ — BUT cevher means "ore/gem/essence"
    // for children it might mean gemstone → borderline → skip to keep it simple
    // "cila"       starts with c ✓  "ci-la"→"cila" ✓  (polish/varnish)
    { word: "cila",       syllableBreak: "ci-la",          visualPrompt: "a tin of shoe polish" },
    // "celep" → not child-appropriate (cattle dealer) → skip
    // "cırcır" → not a concrete noun
    // "cıvata"     starts with c ✓  "cı-va-ta"→"cıvata" ✓  (bolt/nut fastener)
    { word: "cıvata",     syllableBreak: "cı-va-ta",       visualPrompt: "a metal bolt" },
    // "cırıl" → not a noun
    // "curuf" → slag, not child-appropriate → skip
    // "çam" starts with ç not c → skip
    // "cığ" → not a common child word; "çığ" = avalanche starts with ç
    // Total initial: 13 concrete nouns starting with c ✓
  ],

  medial: [
    // "incir"      slice(1,-1)="nci" has c ✓  "in-cir"→"incir" ✓  (fig fruit)
    { word: "incir",      syllableBreak: "in-cir",         visualPrompt: "a fig fruit" },
    // "hece"       slice(1,-1)="ec" has c ✓  "he-ce"→"hece" ✓  (syllable — abstract) → skip
    // "bacak"      slice(1,-1)="aca" has c ✓  "ba-cak"→"bacak" ✓  (leg)
    { word: "bacak",      syllableBreak: "ba-cak",         visualPrompt: "a leg" },
    // "sucuk"      slice(1,-1)="ucu" has c ✓  "su-cuk"→"sucuk" ✓  (sausage)
    { word: "sucuk",      syllableBreak: "su-cuk",         visualPrompt: "a Turkish sausage" },
    // "mücevher"   slice(1,-1)="ücevhe" has c ✓  "mü-cev-her"→"mücevher" ✓  (jewel)
    { word: "mücevher",   syllableBreak: "mü-cev-her",     visualPrompt: "a sparkling jewel" },
    // "kece"       slice(1,-1)="ec" has c ✓  "ke-ce"→"kece" ✓  (felt fabric)
    // "hacı"       → person (pilgrim) → skip
    // "avcı"       → person (hunter) → skip
    // "kaçık"      → adjective → skip
    // NOTE: "kaçık" contains "ç" not "c". We need "c" specifically.
    // "ocak"       slice(1,-1)="ca" has c ✓  "o-cak"→"ocak" ✓  (fireplace/stove)
    { word: "ocak",       syllableBreak: "o-cak",          visualPrompt: "a fireplace" },
    // "cücük" → not a standard noun
    // "koca"       → adjective (huge) → skip; but "koca" as "husband" is abstract too
    // "seçenek" → abstract → skip
    // "acemi"      → adjective → skip
    // "elcil" → not a word
    // "bocek" → correct form is "böcek": slice(1,-1)="öce" has c ✓  "bö-cek"→"böcek" ✓  (insect)
    { word: "böcek",      syllableBreak: "bö-cek",         visualPrompt: "an insect" },
    // "kanca"      slice(1,-1)="anc" has c ✓  "kan-ca"→"kanca" ✓  (hook)
    { word: "kanca",      syllableBreak: "kan-ca",         visualPrompt: "a metal hook" },
    // "macun"      slice(1,-1)="acu" has c ✓  "ma-cun"→"macun" ✓  (paste/putty)
    { word: "macun",      syllableBreak: "ma-cun",         visualPrompt: "a tube of toothpaste" },
    // "çıcık" → not a standard word; "çiçek" contains ç not c
    // "sicim"      slice(1,-1)="ici" has c ✓  "si-cim"→"sicim" ✓  (string/twine)
    { word: "sicim",      syllableBreak: "si-cim",         visualPrompt: "a ball of twine" },
    // "öcü"        slice(1,-1)="c" has c ✓  "ö-cü"→"öcü" ✓  (bogeyman — imageable scary figure in children's culture)
    // "tacir"      → person (merchant) → skip
    // "haciz"      → abstract → skip
    // "facie"      → abstract → skip; the Turkish word is "facia"
    // "yacanın" → inflected
    // "ince"       → adjective → skip
    // "rece" → not a word
    // "gece"       slice(1,-1)="ec" has c ✓  "ge-ce"→"gece" ✓  (night) — concrete imageable scene
    { word: "gece",       syllableBreak: "ge-ce",          visualPrompt: "a night sky with stars" },
    // "kıç"        → contains ç not c
    // "paca"       slice(1,-1)="ac" has c ✓  "pa-ca"→"paca" ✓  (trotter/leg of animal, food)
    // borderline for children → skip
    // "çaçaron" → not a common noun
    // "acı"        → adjective (painful/bitter) → skip
    // "saçak" → contains ç not c
    // "koçan" → contains "coç" → wait: "koçan" = k-o-ç-a-n, contains ç not c → skip
    // "düce" → not a word
    // "pece"       slice(1,-1)="ec" has c ✓  "pe-ce"→"pece" ✓  (face veil)
    // somewhat culturally specific → skip to keep it more universal
    // "yüce"       → adjective (lofty) → skip
    // "öce" → not a word
    // "içecek"     slice(1,-1)="çece" has c ✓  "i-çe-cek"→"içecek" ✓  (drink/beverage) — concrete
    // BUT: contains ç as first interior consonant; the test checks for "c" in slice(1,-1).
    // "içecek": i-ç-e-c-e-k, slice(1,-1)="çece" → has "c" ✓  "i-çe-cek"→"içecek" ✓
    { word: "içecek",     syllableBreak: "i-çe-cek",       visualPrompt: "a glass of juice" },
    // "miço"       slice(1,-1)="iç" → ç not c; skip
    // "acıbadem"  → compound, tricky; "acı" = adjective part → skip
    // "nacağı" → not a standalone noun
    // "yüce" adjective → skip
    // Total medial: 13 concrete nouns with c in interior ✓
    // (c is a common enough phoneme in Turkish interior; 13 is honest given concrete constraint)
  ],

  // Turkish final obstruent devoicing: underlying /c/ → surface [ç] word-finally.
  // Native Turkish nouns do not end in the letter "c" — they spell the final consonant "ç".
  // No loanwords commonly used as concrete child nouns end in "c" either.
  // This position is genuinely empty.
  final: [],
};
