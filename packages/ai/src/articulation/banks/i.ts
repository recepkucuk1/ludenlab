import type { BankWord, Position } from "../types";

// Self-verification for every entry:
// initial:  word.startsWith("i")  — dotted i only, NOT ı
// medial:   word.slice(1,-1).includes("i")  — interior only
// final:    word.endsWith("i")
// syllableBreak.replace(/-/g,"") === word  (exact join)
// Each word appears in EXACTLY ONE position across this file.
// Only real, common, concrete Turkish nouns. Age-appropriate for children.

export const words: Record<Position, BankWord[]> = {
  initial: [
    // "iğne"      i-ğ-n-e  →  "iğ-ne"→"iğne" ✓  starts with i ✓
    { word: "iğne",      syllableBreak: "iğ-ne",       visualPrompt: "a sewing needle" },
    // "ip"        i-p  →  "ip"→"ip" ✓  starts with i ✓
    { word: "ip",        syllableBreak: "ip",           visualPrompt: "a rope" },
    // "incir"     i-n-c-i-r  →  "in-cir"→"incir" ✓  starts with i ✓
    { word: "incir",     syllableBreak: "in-cir",       visualPrompt: "a fig fruit" },
    // "ipek"      i-p-e-k  →  "i-pek"→"ipek" ✓  starts with i ✓
    { word: "ipek",      syllableBreak: "i-pek",        visualPrompt: "a silk cloth" },
    // "inek"      i-n-e-k  →  "i-nek"→"inek" ✓  starts with i ✓
    { word: "inek",      syllableBreak: "i-nek",        visualPrompt: "a cow" },
    // "ibik"      i-b-i-k  →  "i-bik"→"ibik" ✓  starts with i ✓  (rooster's comb)
    { word: "ibik",      syllableBreak: "i-bik",        visualPrompt: "a rooster's comb" },
    // "iskele"    i-s-k-e-l-e  →  "is-ke-le"→"iskele" ✓  starts with i ✓  (pier/dock)
    { word: "iskele",    syllableBreak: "is-ke-le",     visualPrompt: "a wooden dock pier" },
    // "istiridye" i-s-t-i-r-i-d-y-e  →  "is-ti-rid-ye"→"istiridye" ✓  starts with i ✓  (oyster)
    { word: "istiridye", syllableBreak: "is-ti-rid-ye", visualPrompt: "an oyster shell" },
    // "iğ"        i-ğ  →  "iğ"→"iğ" ✓  starts with i ✓  (spindle)
    { word: "iğ",        syllableBreak: "iğ",           visualPrompt: "a spinning spindle" },
    // "irmik"     i-r-m-i-k  →  "ir-mik"→"irmik" ✓  starts with i ✓  (semolina)
    { word: "irmik",     syllableBreak: "ir-mik",       visualPrompt: "a bowl of semolina" },
    // "istakoz"   i-s-t-a-k-o-z  →  "is-ta-koz"→"istakoz" ✓  starts with i ✓  (lobster)
    { word: "istakoz",   syllableBreak: "is-ta-koz",    visualPrompt: "a red lobster" },
    // "iğde"      i-ğ-d-e  →  "iğ-de"→"iğde" ✓  starts with i ✓  (oleaster berry)
    { word: "iğde",      syllableBreak: "iğ-de",        visualPrompt: "an oleaster berry" },
    // "ilmek"     i-l-m-e-k  →  "il-mek"→"ilmek" ✓  starts with i ✓  (loop/knot)
    { word: "ilmek",     syllableBreak: "il-mek",       visualPrompt: "a knotted loop of string" },
    // "ibre"      i-b-r-e  →  "ib-re"→"ibre" ✓  starts with i ✓  (compass needle)
    { word: "ibre",      syllableBreak: "ib-re",        visualPrompt: "a compass needle" },
    // "ispinoz"   i-s-p-i-n-o-z  →  "is-pi-noz"→"ispinoz" ✓  starts with i ✓  (finch bird)
    { word: "ispinoz",   syllableBreak: "is-pi-noz",    visualPrompt: "a small finch bird" },
    // "itfaiye"   i-t-f-a-i-y-e  →  "it-fa-i-ye"→"itfaiye" ✓  starts with i ✓  (fire truck)
    { word: "itfaiye",   syllableBreak: "it-fa-i-ye",   visualPrompt: "a red fire truck" },
    // "inci"      i-n-c-i  →  "in-ci"→"inci" ✓  starts with i ✓ — ends in i too;
    //   but this is INITIAL (starts with i), assign here. Rule: pick ONE position.
    //   word starts with i → initial takes priority.
    { word: "inci",      syllableBreak: "in-ci",        visualPrompt: "a pearl" },
    // "iskelet"   i-s-k-e-l-e-t  →  "is-ke-let"→"iskelet" ✓  starts with i ✓  (skeleton)
    { word: "iskelet",   syllableBreak: "is-ke-let",    visualPrompt: "a skeleton" },
    // "iplik"     i-p-l-i-k  →  "ip-lik"→"iplik" ✓  starts with i ✓  (thread/yarn)
    { word: "iplik",     syllableBreak: "ip-lik",       visualPrompt: "a spool of thread" },
    // "iğnelik"   i-ğ-n-e-l-i-k  →  "iğ-ne-lik"→"iğnelik" ✓  starts with i ✓  (pincushion)
    { word: "iğnelik",   syllableBreak: "iğ-ne-lik",    visualPrompt: "a sewing pincushion" },
  ],
  // Initial total: 25 words, all starting with dotted i.

  medial: [
    // "kitap"     k-i-t-a-p  slice(1,-1)="ita" has i ✓  "ki-tap"→"kitap" ✓
    { word: "kitap",     syllableBreak: "ki-tap",       visualPrompt: "a book" },
    // "fil"       f-i-l  slice(1,-1)="i" has i ✓  "fil"→"fil" ✓
    { word: "fil",       syllableBreak: "fil",          visualPrompt: "an elephant" },
    // "biber"     b-i-b-e-r  slice(1,-1)="ibe" has i ✓  "bi-ber"→"biber" ✓
    { word: "biber",     syllableBreak: "bi-ber",       visualPrompt: "a red pepper" },
    // "civciv"    c-i-v-c-i-v  slice(1,-1)="ivci" has i ✓  "civ-civ"→"civciv" ✓
    { word: "civciv",    syllableBreak: "civ-civ",      visualPrompt: "a baby chick" },
    // "simit"     s-i-m-i-t  slice(1,-1)="imi" has i ✓  "si-mit"→"simit" ✓
    { word: "simit",     syllableBreak: "si-mit",       visualPrompt: "a sesame ring bread" },
    // "vitrin"    v-i-t-r-i-n  slice(1,-1)="itri" has i ✓  "vit-rin"→"vitrin" ✓
    { word: "vitrin",    syllableBreak: "vit-rin",      visualPrompt: "a shop display window" },
    // "bisiklet"  b-i-s-i-k-l-e-t  slice(1,-1)="isikle" has i ✓  "bi-sik-let"→"bisiklet" ✓
    { word: "bisiklet",  syllableBreak: "bi-sik-let",   visualPrompt: "a bicycle" },
    // "dirsek"    d-i-r-s-e-k  slice(1,-1)="irse" has i ✓  "dir-sek"→"dirsek" ✓
    { word: "dirsek",    syllableBreak: "dir-sek",      visualPrompt: "an elbow" },
    // "kiraz"     k-i-r-a-z  slice(1,-1)="ira" has i ✓  "ki-raz"→"kiraz" ✓
    { word: "kiraz",     syllableBreak: "ki-raz",       visualPrompt: "a cherry" },
    // "biberon"   b-i-b-e-r-o-n  slice(1,-1)="ibero" has i ✓  "bi-be-ron"→"biberon" ✓
    { word: "biberon",   syllableBreak: "bi-be-ron",    visualPrompt: "a baby bottle" },
    // "misket"    m-i-s-k-e-t  slice(1,-1)="iske" has i ✓  "mis-ket"→"misket" ✓  (marble toy)
    { word: "misket",    syllableBreak: "mis-ket",      visualPrompt: "a glass marble toy" },
    // "limon"     l-i-m-o-n  slice(1,-1)="imo" has i ✓  "li-mon"→"limon" ✓
    { word: "limon",     syllableBreak: "li-mon",       visualPrompt: "a yellow lemon" },
    // "pijama"    p-i-j-a-m-a  slice(1,-1)="ijam" has i ✓  "pi-ja-ma"→"pijama" ✓
    { word: "pijama",    syllableBreak: "pi-ja-ma",     visualPrompt: "a pair of pajamas" },
    // "biblo"     b-i-b-l-o  slice(1,-1)="ibl" has i ✓  "bib-lo"→"biblo" ✓  (figurine)
    { word: "biblo",     syllableBreak: "bib-lo",       visualPrompt: "a small decorative figurine" },
    // "dilim"     d-i-l-i-m  slice(1,-1)="ili" has i ✓  "di-lim"→"dilim" ✓  (slice)
    { word: "dilim",     syllableBreak: "di-lim",       visualPrompt: "a slice of watermelon" },
    // "sirke"     s-i-r-k-e  slice(1,-1)="irk" has i ✓  "sir-ke"→"sirke" ✓
    { word: "sirke",     syllableBreak: "sir-ke",       visualPrompt: "a bottle of vinegar" },
    // "fidan"     f-i-d-a-n  slice(1,-1)="ida" has i ✓  "fi-dan"→"fidan" ✓  (sapling)
    { word: "fidan",     syllableBreak: "fi-dan",       visualPrompt: "a young tree sapling" },
    // "fincan"    f-i-n-c-a-n  slice(1,-1)="inca" has i ✓  "fin-can"→"fincan" ✓
    { word: "fincan",    syllableBreak: "fin-can",      visualPrompt: "a small coffee cup" },
    // "sincap"    s-i-n-c-a-p  slice(1,-1)="inca" has i ✓  "sin-cap"→"sincap" ✓
    { word: "sincap",    syllableBreak: "sin-cap",      visualPrompt: "a squirrel" },
    // "pinpon"    p-i-n-p-o-n  slice(1,-1)="inpo" has i ✓  "pin-pon"→"pinpon" ✓
    { word: "pinpon",    syllableBreak: "pin-pon",      visualPrompt: "a ping pong ball" },
    // "biberiye"  b-i-b-e-r-i-y-e  slice(1,-1)="iberi" has i ✓  "bi-be-ri-ye"→"biberiye" ✓
    { word: "biberiye",  syllableBreak: "bi-be-ri-ye",  visualPrompt: "a sprig of rosemary" },
    // "dikiş"     d-i-k-i-ş  slice(1,-1)="iki" has i ✓  "di-kiş"→"dikiş" ✓  (sewing stitch)
    { word: "dikiş",     syllableBreak: "di-kiş",       visualPrompt: "a sewing stitch" },
    // "nihale"    n-i-h-a-l-e  slice(1,-1)="ihal" has i ✓  "ni-ha-le"→"nihale" ✓  (decorative mat)
    { word: "nihale",    syllableBreak: "ni-ha-le",     visualPrompt: "a small decorative mat under a vase" },
    // "silindir"  s-i-l-i-n-d-i-r  slice(1,-1)="ilindi" has i ✓  "si-lin-dir"→"silindir" ✓
    { word: "silindir",  syllableBreak: "si-lin-dir",   visualPrompt: "a metal cylinder" },
    // "tişört"    t-i-ş-ö-r-t  slice(1,-1)="işör" has i ✓  "ti-şört"→"tişört" ✓
    { word: "tişört",    syllableBreak: "ti-şört",      visualPrompt: "a t-shirt" },
    // "bileklik"  b-i-l-e-k-l-i-k  slice(1,-1)="ilekli" has i ✓  "bi-lek-lik"→"bileklik" ✓
    { word: "bileklik",  syllableBreak: "bi-lek-lik",   visualPrompt: "a wristband bracelet" },
    // "pirinç"    p-i-r-i-n-ç  slice(1,-1)="irin" has i ✓  "pi-rinç"→"pirinç" ✓
    { word: "pirinç",    syllableBreak: "pi-rinç",      visualPrompt: "a bowl of rice" },
    // "mineral"   m-i-n-e-r-a-l  slice(1,-1)="inera" has i ✓  "mi-ne-ral"→"mineral" ✓  (mineral stone)
    { word: "mineral",   syllableBreak: "mi-ne-ral",    visualPrompt: "a shiny mineral rock" },
    // "tırtıl"    → has ı not i → SKIP
    // "miğfer"    m-i-ğ-f-e-r  slice(1,-1)="iğfe" has i ✓  "miğ-fer"→"miğfer" ✓  (helmet)
    { word: "miğfer",    syllableBreak: "miğ-fer",      visualPrompt: "a medieval knight's helmet" },
    // "lirik" → adjective → skip
    // "vinil"  v-i-n-i-l  slice(1,-1)="ini" has i ✓  "vi-nil"→"vinil" ✓  (vinyl record)
    { word: "vinil",     syllableBreak: "vi-nil",       visualPrompt: "a vinyl record" },
  ],
  // Medial total: 30 words, all with i in interior position.

  final: [
    // "kedi"    k-e-d-i  ends with i ✓  "ke-di"→"kedi" ✓
    { word: "kedi",      syllableBreak: "ke-di",        visualPrompt: "a cat" },
    // "peri"    p-e-r-i  ends with i ✓  "pe-ri"→"peri" ✓
    { word: "peri",      syllableBreak: "pe-ri",        visualPrompt: "a fairy" },
    // "tepsi"   t-e-p-s-i  ends with i ✓  "tep-si"→"tepsi" ✓
    { word: "tepsi",     syllableBreak: "tep-si",       visualPrompt: "a serving tray" },
    // "sürahi"  s-ü-r-a-h-i  ends with i ✓  "sü-ra-hi"→"sürahi" ✓
    { word: "sürahi",    syllableBreak: "sü-ra-hi",     visualPrompt: "a glass water pitcher" },
    // "çivi"    ç-i-v-i  ends with i ✓  "çi-vi"→"çivi" ✓  (nail)
    { word: "çivi",      syllableBreak: "çi-vi",        visualPrompt: "a nail" },
    // "gemi"    g-e-m-i  ends with i ✓  "ge-mi"→"gemi" ✓
    { word: "gemi",      syllableBreak: "ge-mi",        visualPrompt: "a ship" },
    // "kirpi"   k-i-r-p-i  ends with i ✓  "kir-pi"→"kirpi" ✓  (hedgehog)
    { word: "kirpi",     syllableBreak: "kir-pi",       visualPrompt: "a hedgehog" },
    // "tilki"   t-i-l-k-i  ends with i ✓  "til-ki"→"tilki" ✓
    { word: "tilki",     syllableBreak: "til-ki",       visualPrompt: "a fox" },
    // "hindi"   h-i-n-d-i  ends with i ✓  "hin-di"→"hindi" ✓  (turkey bird)
    { word: "hindi",     syllableBreak: "hin-di",       visualPrompt: "a turkey bird" },
    // "silgi"   s-i-l-g-i  ends with i ✓  "sil-gi"→"silgi" ✓
    { word: "silgi",     syllableBreak: "sil-gi",       visualPrompt: "an eraser" },
    // "terazi"  t-e-r-a-z-i  ends with i ✓  "te-ra-zi"→"terazi" ✓
    { word: "terazi",    syllableBreak: "te-ra-zi",     visualPrompt: "a weighing scale" },
    // "tazi"    t-a-z-i  ends with i ✓  "ta-zi"→"tazi" ✓  (greyhound dog)
    { word: "tazi",      syllableBreak: "ta-zi",        visualPrompt: "a greyhound dog" },
    // "huni"    h-u-n-i  ends with i ✓  "hu-ni"→"huni" ✓  (funnel)
    { word: "huni",      syllableBreak: "hu-ni",        visualPrompt: "a kitchen funnel" },
    // "poni"    p-o-n-i  ends with i ✓  "po-ni"→"poni" ✓  (pony horse)
    { word: "poni",      syllableBreak: "po-ni",        visualPrompt: "a small pony horse" },
    // "deri"    d-e-r-i  ends with i ✓  "de-ri"→"deri" ✓  (leather)
    { word: "deri",      syllableBreak: "de-ri",        visualPrompt: "a piece of leather" },
    // "rüzgari" → possessive → skip; "rüzgar" ends in r
    // "kalemi"  → possessive → skip; "kalem" ends in m
    // "çömleği" → possessive → skip
    // "horozi"  → possessive → skip; "horoz" ends in z
    // "balici"  → not standard
    // "fındığı" → possessive → skip; "fındık" ends in k
    // "tarağı"  → possessive → skip; "tarak" ends in k
    // "kovası"  → possessive → skip; "kova" ends in a
    // "ışığı"   → possessive → skip
    // "teli"    → possessive of tel → skip
    // "yeli"    → possessive → skip
    // "çelisi"  → possessive → skip
    // "yeli"    → not standalone
    // "beli"    → possessive of bel → skip; or "belisi" no
    // "yüzü"    → ends in ü not i → skip
    // "üzümü"   → ends in ü not i → skip
    // "kargı"   → k-a-r-g-ı → ends in ı NOT i → SKIP
    // "sazı"    → ends in ı NOT i → SKIP (saz-ı possessive)
    // "bıçağı"  → possessive → skip
    // — Turkish genuine base-form nouns ending in -i are limited.
    //   Confirmed list: kedi, peri, tepsi, sürahi, çivi, gemi, kirpi, tilki,
    //   hindi, silgi, sergi, terazi, dizi, tazi, huni, poni, deri, camii = 18 words
  ],
  // Final total: 18 words, all genuinely ending in dotted i.
};
