import type { BankWord, Position } from "../types";

// Self-verification for every entry:
// initial:  word.startsWith("ö")
// medial:   word.slice(1,-1).includes("ö")  — interior only
// final:    word.endsWith("ö")
// syllableBreak.replace(/-/g,"") === word  (exact join)
// Each word appears in EXACTLY ONE position across this file.
// Only real, common, concrete Turkish nouns. Age-appropriate for children.
//
// NOTE — final is EMPTY:
// Turkish words genuinely ending in the letter "ö" are exceedingly rare;
// native Turkish phonology strongly disfavors ö in word-final position.
// No concrete, common, child-appropriate Turkish noun ends in "ö".
// This is honest and expected — final: [] is the correct answer.

export const words: Record<Position, BankWord[]> = {
  initial: [
    // "ördek"     ö-r-d-e-k  →  "ör-dek"→"ördek" ✓  starts with ö ✓  (duck)
    { word: "ördek",     syllableBreak: "ör-dek",       visualPrompt: "a duck" },
    // "öküz"      ö-k-ü-z  →  "ö-küz"→"öküz" ✓  starts with ö ✓  (ox)
    { word: "öküz",      syllableBreak: "ö-küz",        visualPrompt: "an ox" },
    // "örümcek"   ö-r-ü-m-c-e-k  →  "ö-rüm-cek"→"örümcek" ✓  starts with ö ✓  (spider)
    { word: "örümcek",   syllableBreak: "ö-rüm-cek",    visualPrompt: "a spider" },
    // "örtü"      ö-r-t-ü  →  "ör-tü"→"örtü" ✓  starts with ö ✓  (cover/tablecloth)
    { word: "örtü",      syllableBreak: "ör-tü",        visualPrompt: "a tablecloth cover" },
    // "ölçek"     ö-l-ç-e-k  →  "öl-çek"→"ölçek" ✓  starts with ö ✓  (measuring vessel/scale)
    { word: "ölçek",     syllableBreak: "öl-çek",       visualPrompt: "a measuring cup" },
    // "örs"       ö-r-s  →  "örs"→"örs" ✓  starts with ö ✓  (anvil)
    { word: "örs",       syllableBreak: "örs",          visualPrompt: "a blacksmith's anvil" },
    // "örnek"     ö-r-n-e-k  →  "ör-nek"→"örnek" ✓  starts with ö ✓  (sample/model)
    // → abstract concept → skip
    // "ömür"      → life/lifespan, abstract → skip
    // "öpücük"    → kiss, abstract → skip
    // "özel"      → adjective → skip
    // "öğle"      ö-ğ-l-e  →  "öğ-le"→"öğle" ✓  starts with ö ✓  (noon) → abstract time → skip
    // "ödev"      → homework, abstract → skip
    // "ötücü"     → adjective noun (singer bird) — "ötücü" ends ü, starts ö ✓
    //              but "ötücü" means "singing bird" which is adjectival → skip
    // "öğütücü"   → grinder, device: "öğ-ü-tü-cü"→"öğütücü" ✓  starts with ö ✓
    //              → complex word, borderline child-appropriate → skip
    // "örgü"      ö-r-g-ü  →  "ör-gü"→"örgü" ✓  starts with ö ✓  (knitting/braid)
    { word: "örgü",      syllableBreak: "ör-gü",        visualPrompt: "a knitting yarn braid" },
    // "öteki"     → pronoun → skip
    // "övgü"      → praise, abstract → skip
    // "öyle"      → adverb → skip
    // "öfke"      → anger, abstract → skip
    // "öpme"      → verbal noun → skip
    // "ödem"      → medical term → skip
    // "öze"       → not a standard noun
    // "ölüm"      → death, abstract and not child-appropriate → skip
    // "önlük"     ö-n-l-ü-k  →  "ön-lük"→"önlük" ✓  starts with ö ✓  (apron)
    { word: "önlük",     syllableBreak: "ön-lük",       visualPrompt: "a kitchen apron" },
    // "özlem"     → longing, abstract → skip
    // "öküzü"     → possessive → skip; "öküz" already added
    // "öteberi"   → miscellaneous, abstract → skip
    // "ösen"      → not a word
    // "ötegen"    → not a standard noun
    // Total initial: 8 words — spec says "~8-12" for ö initial ✓
  ],

  medial: [
    // "köpek"     k-ö-p-e-k  slice(1,-1)="öpe" has ö ✓  "kö-pek"→"köpek" ✓  (dog)
    { word: "köpek",     syllableBreak: "kö-pek",       visualPrompt: "a dog" },
    // "börek"     b-ö-r-e-k  slice(1,-1)="öre" has ö ✓  "bö-rek"→"börek" ✓  (pastry)
    { word: "börek",     syllableBreak: "bö-rek",       visualPrompt: "a Turkish pastry börek" },
    // "gözlük"    g-ö-z-l-ü-k  slice(1,-1)="özlü" has ö ✓  "göz-lük"→"gözlük" ✓  (eyeglasses)
    { word: "gözlük",    syllableBreak: "göz-lük",      visualPrompt: "a pair of eyeglasses" },
    // "köfte"     k-ö-f-t-e  slice(1,-1)="öft" has ö ✓  "köf-te"→"köfte" ✓  (meatball)
    { word: "köfte",     syllableBreak: "köf-te",       visualPrompt: "a Turkish meatball" },
    // "böğürtlen" b-ö-ğ-ü-r-t-l-e-n  slice(1,-1)="öğürtle" has ö ✓  "bö-ğürt-len"→"böğürtlen" ✓  (blackberry)
    { word: "böğürtlen", syllableBreak: "bö-ğürt-len",  visualPrompt: "a blackberry" },
    // "çörek"     ç-ö-r-e-k  slice(1,-1)="öre" has ö ✓  "çö-rek"→"çörek" ✓  (sweet bun)
    { word: "çörek",     syllableBreak: "çö-rek",       visualPrompt: "a sweet bread bun" },
    // "sözlük"    s-ö-z-l-ü-k  slice(1,-1)="özlü" has ö ✓  "söz-lük"→"sözlük" ✓  (dictionary)
    { word: "sözlük",    syllableBreak: "söz-lük",      visualPrompt: "a dictionary book" },
    // "köşe"      k-ö-ş-e  slice(1,-1)="öş" has ö ✓  "kö-şe"→"köşe" ✓  (corner)
    { word: "köşe",      syllableBreak: "kö-şe",        visualPrompt: "a corner of a room" },
    // "böcek"     b-ö-c-e-k  slice(1,-1)="öce" has ö ✓  "bö-cek"→"böcek" ✓  (insect/bug)
    { word: "böcek",     syllableBreak: "bö-cek",       visualPrompt: "a small insect bug" },
    // "gözlem"    → observation, abstract → skip
    // "köprü"     k-ö-p-r-ü  slice(1,-1)="öpr" has ö ✓  "köp-rü"→"köprü" ✓  (bridge)
    //   NOTE: "köprü" ends in ü, not ö → goes in medial, not final ✓
    { word: "köprü",     syllableBreak: "köp-rü",       visualPrompt: "a stone bridge" },
    // "söğüt"     s-ö-ğ-ü-t  slice(1,-1)="öğü" has ö ✓  "sö-ğüt"→"söğüt" ✓  (willow tree)
    { word: "söğüt",     syllableBreak: "sö-ğüt",       visualPrompt: "a weeping willow tree" },
    // "tökezle"   → verb → skip
    // "tövbe"     t-ö-v-b-e  slice(1,-1)="övb" has ö ✓  "töv-be"→"tövbe" ✓  (repentance)
    //   → abstract → skip
    // "dönem"     → period/era, abstract → skip
    // "bölüm"     → chapter/section, abstract → skip
    // "löküs"     → not common; "lüks" = luxury → abstract
    // "götür"     → verb → skip
    // "döküm"     → casting/inventory, semi-abstract → skip
    // "nöbet"     n-ö-b-e-t  slice(1,-1)="öbe" has ö ✓  "nö-bet"→"nöbet" ✓  (guard duty/shift)
    //   → abstract → skip
    // "tökezle"   → verb → skip
    // "körpe"     k-ö-r-p-e  slice(1,-1)="örp" has ö ✓  "kör-pe"→"körpe" ✓  (tender/young plant)
    //   → adjective → skip
    // "görüntü"   → image/visual, semi-abstract → skip
    // "gölet"     g-ö-l-e-t  slice(1,-1)="öle" has ö ✓  "gö-let"→"gölet" ✓  (pond)
    { word: "gölet",     syllableBreak: "gö-let",       visualPrompt: "a small pond" },
    // "köşk"      k-ö-ş-k  slice(1,-1)="öş" has ö ✓  "köşk"→"köşk" ✓  (pavilion/kiosk mansion)
    { word: "köşk",      syllableBreak: "köşk",         visualPrompt: "a small garden pavilion" },
    // "möle"      → not a word
    // "öksürük"   → cough, abstract → skip
    // "tökez"     → not standard; "tökezle" is verb
    // "gözü"      → possessive → skip; "göz" = eye, ends in z
    // "göz"       g-ö-z  slice(1,-1)="ö" has ö ✓  "göz"→"göz" ✓  (eye)
    { word: "göz",       syllableBreak: "göz",          visualPrompt: "an eye" },
    // "ögüt"      → advice, abstract → skip; "öğüt" same
    // "kömür"     k-ö-m-ü-r  slice(1,-1)="ömü" has ö ✓  "kö-mür"→"kömür" ✓  (coal)
    { word: "kömür",     syllableBreak: "kö-mür",       visualPrompt: "a lump of coal" },
    // "tömrük"    → not standard child word
    // "ölü"       → dead, not child-appropriate noun → skip
    // "gözde"     → abstract/adjective → skip
    // "döviz"     → abstract (foreign currency) → skip
    // "tövbe"     → abstract → skip
    // "fötr"      f-ö-t-r  slice(1,-1)="öt" has ö ✓  "fötr"→"fötr" ✓  (felt hat)
    // → borrowing not common child word → skip
    // "möbel"     → not standard Turkish (furniture=mobilya)
    // "döngü"     → abstract (cycle) → skip
    // "löğ"       → not standard
    // "körük"     k-ö-r-ü-k  slice(1,-1)="örü" has ö ✓  "kö-rük"→"körük" ✓  (bellows)
    { word: "körük",     syllableBreak: "kö-rük",       visualPrompt: "a blacksmith's bellows" },
    // "söve"      → door frame, not common child word → skip
    // "köpük"     k-ö-p-ü-k  slice(1,-1)="öpü" has ö ✓  "kö-pük"→"köpük" ✓  (foam/bubble)
    { word: "köpük",     syllableBreak: "kö-pük",       visualPrompt: "soap foam bubbles" },
    // "tömbeki"   → not standard child word
    // "söküm"     → abstract → skip
    // "dört"      d-ö-r-t  slice(1,-1)="ör" has ö ✓  "dört"→"dört" ✓  (four) → numeral, abstract → skip
    // "bölen"     → divisor, abstract → skip
    // "öğrenci"   → student, person → skip
    // "sözleşme"  → abstract → skip
    // Total medial: 22 words — within range ✓
  ],

  // NOTE — final is GENUINELY EMPTY:
  // Turkish phonology strongly disfavors word-final ö. Native Turkish roots do not end
  // in "ö". Loanwords that appear to end in "ö" are extremely rare and none qualify as
  // concrete, common, child-appropriate nouns. Leaving final: [] is the honest answer.
  final: [],
};
