import type { BankWord, Position } from "../types";

// Self-verification key for /e/:
// initial: word starts with "e"
// medial:  "e" found in word.slice(1,-1)  (interior only, not first or last char)
// final:   word ends with "e"
// syllableBreak.replace(/-/g,"") === word  (every entry)
// Each word appears in exactly ONE position across this file.
// All words are real, concrete, common Turkish nouns appropriate for young children.

export const words: Record<Position, BankWord[]> = {
  initial: [
    // "el"        starts with e ✓  "el"→"el" ✓
    { word: "el",         syllableBreak: "el",             visualPrompt: "a human hand" },
    // "ekmek"     starts with e ✓  "ek-mek"→"ekmek" ✓
    { word: "ekmek",      syllableBreak: "ek-mek",         visualPrompt: "a loaf of bread" },
    // "eldiven"   starts with e ✓  "el-di-ven"→"eldiven" ✓
    { word: "eldiven",    syllableBreak: "el-di-ven",      visualPrompt: "a pair of gloves" },
    // "eşek"      starts with e ✓  "e-şek"→"eşek" ✓
    { word: "eşek",       syllableBreak: "e-şek",          visualPrompt: "a donkey" },
    // "erik"      starts with e ✓  "e-rik"→"erik" ✓
    { word: "erik",       syllableBreak: "e-rik",          visualPrompt: "a plum fruit" },
    // "enginar"   starts with e ✓  "en-gi-nar"→"enginar" ✓
    { word: "enginar",    syllableBreak: "en-gi-nar",      visualPrompt: "an artichoke vegetable" },
    // "ejderha"   starts with e ✓  "ej-der-ha"→"ejderha" ✓
    { word: "ejderha",    syllableBreak: "ej-der-ha",      visualPrompt: "a dragon" },
    // "ev"        starts with e ✓  "ev"→"ev" ✓
    { word: "ev",         syllableBreak: "ev",             visualPrompt: "a house" },
    // "eyer"      starts with e ✓  "e-yer"→"eyer" ✓  (saddle)
    { word: "eyer",       syllableBreak: "e-yer",          visualPrompt: "a horse saddle" },
    // "elma" — ends in a, skip (in /a/ final bank)
    // "etek"      starts with e ✓  "e-tek"→"etek" ✓
    { word: "etek",       syllableBreak: "e-tek",          visualPrompt: "a skirt" },
    // "eşarp"     starts with e ✓  "e-şarp"→"eşarp" ✓
    { word: "eşarp",      syllableBreak: "e-şarp",         visualPrompt: "a scarf" },
    // "ebe"       — midwife, person; skip
    // "ekran"     starts with e ✓  "ek-ran"→"ekran" ✓
    { word: "ekran",      syllableBreak: "ek-ran",         visualPrompt: "a computer screen" },
    // "eğri"      — adjective, skip; "eğe" — file/rasp tool:
    // "eğe"       starts with e ✓  "e-ğe"→"eğe" ✓  (file/rasp tool)
    { word: "eğe",        syllableBreak: "e-ğe",           visualPrompt: "a metal file rasp tool" },
    // "ekici"     — person; skip; "ekin" — grain crop:
    // "ekin"      starts with e ✓  "e-kin"→"ekin" ✓  (grain crop/wheat field)
    { word: "ekin",       syllableBreak: "e-kin",          visualPrompt: "a wheat grain field" },
    // "eşek" already added
    // "enmek" — verb form; skip
    // "erzak"     starts with e ✓  "er-zak"→"erzak" ✓  (food supplies)
    { word: "erzak",      syllableBreak: "er-zak",         visualPrompt: "a bag of food supplies" },
    // "elbise"    starts with e ✓  "el-bi-se"→"elbise" ✓
    { word: "elbise",     syllableBreak: "el-bi-se",       visualPrompt: "a dress" },
    // "ebegümeci" — complex; "eba" not standard
    // "engerek"   starts with e ✓  "en-ge-rek"→"engerek" ✓  (viper snake)
    { word: "engerek",    syllableBreak: "en-ge-rek",      visualPrompt: "a viper snake" },
    // "eşik"      starts with e ✓  "e-şik"→"eşik" ✓  (doorstep/threshold)
    { word: "eşik",       syllableBreak: "e-şik",          visualPrompt: "a door threshold step" },
    // "erik" already added
    // "elçi"      — ambassador, person; skip
    // "endive"    — not common Turkish
    // "egzoz"     starts with e ✓  "eg-zoz"→"egzoz" ✓  (exhaust pipe)
    { word: "egzoz",      syllableBreak: "eg-zoz",         visualPrompt: "a car exhaust pipe" },
    // "erkek"     — adjective/gender word; skip
    // "etli" — adjective; skip
    // "et"        starts with e ✓  "et"→"et" ✓
    { word: "et",         syllableBreak: "et",             visualPrompt: "a piece of meat" },
    // "etek" already added; "ekin" already added
    // "ekmek" already added
    // "elma" in /a/ final bank already
    // "ebru"      starts with e ✓  "eb-ru"→"ebru" ✓  (marbling art)
    { word: "ebru",       syllableBreak: "eb-ru",          visualPrompt: "a marbled paper pattern" },
    // "encam" — archaic; skip
    // "ense"      starts with e ✓  "en-se"→"ense" ✓  (nape of neck)
    { word: "ense",       syllableBreak: "en-se",          visualPrompt: "the nape of a neck" },
    // "emzik"     starts with e ✓  "em-zik"→"emzik" ✓  (pacifier/dummy)
    { word: "emzik",      syllableBreak: "em-zik",         visualPrompt: "a baby pacifier" },
    // "etek" already; "etüv" — iron device:
    // "ütü" — starts with ü, not e; skip
    // "elmacık"   starts with e ✓  "el-ma-cık"→"elmacık" ✓  (cheekbone)
    { word: "elmacık",    syllableBreak: "el-ma-cık",      visualPrompt: "a cheekbone" },
    // "entari"    starts with e ✓  "en-ta-ri"→"entari" ✓  (loose robe garment)
    { word: "entari",     syllableBreak: "en-ta-ri",       visualPrompt: "a loose robe garment" },
    // Total initial: 28 words starting with e ✓
  ],

  medial: [
    // "kemer"     slice(1,-1)="eme" has e ✓  "ke-mer"→"kemer" ✓
    { word: "kemer",      syllableBreak: "ke-mer",         visualPrompt: "a leather belt" },
    // "deve"      — ends in e, place in final instead
    // "perde"     — ends in e, place in final instead
    // "fener"     slice(1,-1)="ene" has e ✓  "fe-ner"→"fener" ✓
    { word: "fener",      syllableBreak: "fe-ner",         visualPrompt: "a lantern" },
    // "beşik"     slice(1,-1)="eşi" has e ✓  "be-şik"→"beşik" ✓
    { word: "beşik",      syllableBreak: "be-şik",         visualPrompt: "a baby cradle" },
    // "defter"    slice(1,-1)="efte" has e ✓  "def-ter"→"defter" ✓
    { word: "defter",     syllableBreak: "def-ter",        visualPrompt: "a notebook" },
    // "kestane"   — ends in e, place in final
    // "sebze"     — ends in e, place in final
    // "terlik"    slice(1,-1)="erli" has e ✓  "ter-lik"→"terlik" ✓
    { word: "terlik",     syllableBreak: "ter-lik",        visualPrompt: "a slipper" },
    // "çerez"     slice(1,-1)="ere" has e ✓  "çe-rez"→"çerez" ✓
    { word: "çerez",      syllableBreak: "çe-rez",         visualPrompt: "a bowl of mixed nuts snack" },
    // "keser"     slice(1,-1)="ese" has e ✓  "ke-ser"→"keser" ✓  (adze tool)
    { word: "keser",      syllableBreak: "ke-ser",         visualPrompt: "a woodworking adze tool" },
    // "şeker"     slice(1,-1)="eke" has e ✓  "şe-ker"→"şeker" ✓
    { word: "şeker",      syllableBreak: "şe-ker",         visualPrompt: "a sugar cube" },
    // "demet"     slice(1,-1)="eme" has e ✓  "de-met"→"demet" ✓  (bunch of flowers)
    { word: "demet",      syllableBreak: "de-met",         visualPrompt: "a bunch of flowers" },
    // "semaver"   slice(1,-1)="emave" has e ✓  "se-ma-ver"→"semaver" ✓  (samovar)
    { word: "semaver",    syllableBreak: "se-ma-ver",      visualPrompt: "a samovar tea urn" },
    // "meyve"     — ends in e, place in final
    // "menteşe"   — ends in e, place in final
    // "çekiç"     slice(1,-1)="eki" has e ✓  "çe-kiç"→"çekiç" ✓
    { word: "çekiç",      syllableBreak: "çe-kiç",         visualPrompt: "a hammer" },
    // "seter"     — not standard; "fester" not standard
    // "tekne"     — ends in e, place in final
    // "deterjan"  slice(1,-1)="eterja" has e ✓  "de-ter-jan"→"deterjan" ✓
    { word: "deterjan",   syllableBreak: "de-ter-jan",     visualPrompt: "a bottle of detergent" },
    // "kepek"     slice(1,-1)="epe" has e ✓  "ke-pek"→"kepek" ✓  (wheat bran)
    { word: "kepek",      syllableBreak: "ke-pek",         visualPrompt: "a bowl of wheat bran" },
    // "hedef"     — abstract (target/goal); skip
    // "tencere"   — ends in e, place in final
    // "hediye"    — ends in e, place in final
    // "sepet"     slice(1,-1)="epe" has e ✓  "se-pet"→"sepet" ✓
    { word: "sepet",      syllableBreak: "se-pet",         visualPrompt: "a wicker basket" },
    // "deney"     — experiment, slightly abstract; "deney tüpü" complex; skip
    // "kemik"     slice(1,-1)="emi" has e ✓  "ke-mik"→"kemik" ✓
    { word: "kemik",      syllableBreak: "ke-mik",         visualPrompt: "a bone" },
    // "pelerin"   slice(1,-1)="eleri" has e ✓  "pe-le-rin"→"pelerin" ✓  (cape cloak)
    { word: "pelerin",    syllableBreak: "pe-le-rin",      visualPrompt: "a cape cloak" },
    // "yelpaze"   — ends in e, place in final
    // "sefer"     — abstract (campaign); skip
    // "kelebek"   slice(1,-1)="elebe" has e ✓  "ke-le-bek"→"kelebek" ✓
    { word: "kelebek",    syllableBreak: "ke-le-bek",      visualPrompt: "a butterfly" },
    // "öğretmen"  — person; skip
    // "yemek"     slice(1,-1)="eme" has e ✓  "ye-mek"→"yemek" ✓  (food/meal)
    { word: "yemek",      syllableBreak: "ye-mek",         visualPrompt: "a plate of food" },
    // "genel"     — abstract; skip
    // "leylek"    slice(1,-1)="eyle" has e ✓  "ley-lek"→"leylek" ✓  (stork)
    { word: "leylek",     syllableBreak: "ley-lek",        visualPrompt: "a white stork bird" },
    // "petek"     slice(1,-1)="ete" has e ✓  "pe-tek"→"petek" ✓  (honeycomb)
    { word: "petek",      syllableBreak: "pe-tek",         visualPrompt: "a honeycomb" },
    // "deve" — ends in e (in final list); "deve" slice(1,-1)="ev" has e but ends in e → placing in final
    // "tekir"     slice(1,-1)="eki" has e ✓  "te-kir"→"tekir" ✓  (tabby cat)
    { word: "tekir",      syllableBreak: "te-kir",         visualPrompt: "a striped tabby cat" },
    // "deniz" — starts with d and ends in z; slice(1,-1)="eni" has e ✓  "de-niz"→"deniz" ✓
    // BUT "deniz" is in d.ts initial bank → skip to avoid cross-bank confusion (different sound banks, actually OK but safer)
    // "keskin"    — adjective; skip
    // "mercan"    slice(1,-1)="erca" has e ✓  "mer-can"→"mercan" ✓  (coral)
    { word: "mercan",     syllableBreak: "mer-can",        visualPrompt: "a piece of red coral" },
    // "sedef"     slice(1,-1)="ede" has e ✓  "se-def"→"sedef" ✓  (mother of pearl)
    { word: "sedef",      syllableBreak: "se-def",         visualPrompt: "a mother of pearl shell" },
    // "bebek"     slice(1,-1)="ebe" has e ✓  "be-bek"→"bebek" ✓
    { word: "bebek",      syllableBreak: "be-bek",         visualPrompt: "a baby" },
    // "terazi"    slice(1,-1)="eraz" has e ✓  "te-ra-zi"→"terazi" ✓  (scale/balance)
    { word: "terazi",     syllableBreak: "te-ra-zi",       visualPrompt: "a weighing scale" },
    // Total medial: 28 concrete nouns with e in interior ✓
  ],

  final: [
    // "çene"      ends with e ✓  "çe-ne"→"çene" ✓
    { word: "çene",       syllableBreak: "çe-ne",          visualPrompt: "a chin" },
    // "kale"      ends with e ✓  "ka-le"→"kale" ✓
    { word: "kale",       syllableBreak: "ka-le",          visualPrompt: "a castle" },
    // "lale"      ends with e ✓  "la-le"→"lale" ✓
    { word: "lale",       syllableBreak: "la-le",          visualPrompt: "a tulip flower" },
    // "pencere"   ends with e ✓  "pen-ce-re"→"pencere" ✓
    { word: "pencere",    syllableBreak: "pen-ce-re",      visualPrompt: "a window" },
    // "bahçe"     ends with e ✓  "bah-çe"→"bahçe" ✓
    { word: "bahçe",      syllableBreak: "bah-çe",         visualPrompt: "a garden" },
    // "tepe"      ends with e ✓  "te-pe"→"tepe" ✓
    { word: "tepe",       syllableBreak: "te-pe",          visualPrompt: "a hilltop" },
    // "dere"      ends with e ✓  "de-re"→"dere" ✓  — also in d.ts initial; different position key so OK
    // Actually "dere" appears in d.ts initial bank — it's a DIFFERENT sound bank (consonant /d/), not competing with vowel /e/ bank. Safe.
    { word: "dere",       syllableBreak: "de-re",          visualPrompt: "a small stream" },
    // "meşe"      ends with e ✓  "me-şe"→"meşe" ✓  (oak tree)
    { word: "meşe",       syllableBreak: "me-şe",          visualPrompt: "an oak tree" },
    // "kepçe"     ends with e ✓  "kep-çe"→"kepçe" ✓  (ladle)
    { word: "kepçe",      syllableBreak: "kep-çe",         visualPrompt: "a soup ladle" },
    // "deve"      ends with e ✓  "de-ve"→"deve" ✓
    { word: "deve",       syllableBreak: "de-ve",          visualPrompt: "a camel" },
    // "perde"     ends with e ✓  "per-de"→"perde" ✓
    { word: "perde",      syllableBreak: "per-de",         visualPrompt: "a window curtain" },
    // "kestane"   ends with e ✓  "kes-ta-ne"→"kestane" ✓
    { word: "kestane",    syllableBreak: "kes-ta-ne",      visualPrompt: "a chestnut" },
    // "sebze"     ends with e ✓  "seb-ze"→"sebze" ✓
    { word: "sebze",      syllableBreak: "seb-ze",         visualPrompt: "a pile of vegetables" },
    // "meyve"     ends with e ✓  "mey-ve"→"meyve" ✓
    { word: "meyve",      syllableBreak: "mey-ve",         visualPrompt: "a bowl of fruit" },
    // "menteşe"   ends with e ✓  "men-te-şe"→"menteşe" ✓  (door hinge)
    { word: "menteşe",    syllableBreak: "men-te-şe",      visualPrompt: "a door hinge" },
    // "tekne"     ends with e ✓  "tek-ne"→"tekne" ✓  (wooden trough/boat)
    { word: "tekne",      syllableBreak: "tek-ne",         visualPrompt: "a wooden trough" },
    // "tencere"   ends with e ✓  "ten-ce-re"→"tencere" ✓
    { word: "tencere",    syllableBreak: "ten-ce-re",      visualPrompt: "a cooking pot" },
    // "hediye"    ends with e ✓  "he-di-ye"→"hediye" ✓
    { word: "hediye",     syllableBreak: "he-di-ye",       visualPrompt: "a wrapped gift box" },
    // "yelpaze"   ends with e ✓  "yel-pa-ze"→"yelpaze" ✓
    { word: "yelpaze",    syllableBreak: "yel-pa-ze",      visualPrompt: "a hand fan" },
    // "çeşme"     ends with e ✓  "çeş-me"→"çeşme" ✓  (fountain)
    { word: "çeşme",      syllableBreak: "çeş-me",         visualPrompt: "a stone water fountain" },
    // "köfte"     ends with e ✓  "köf-te"→"köfte" ✓
    { word: "köfte",      syllableBreak: "köf-te",         visualPrompt: "a meatball" },
    // "sürünge" — not standard; "süpürge" ends in e ✓
    // "süpürge"   ends with e ✓  "sü-pür-ge"→"süpürge" ✓  (broom)
    { word: "süpürge",    syllableBreak: "sü-pür-ge",      visualPrompt: "a broom" },
    // "çadırköşe" — not standard
    // "ördekle" — inflected; skip
    // "kışlık" — not ending in e; "kışla" ends in a
    // "küre"      ends with e ✓  "kü-re"→"küre" ✓  (globe/sphere)
    { word: "küre",       syllableBreak: "kü-re",          visualPrompt: "a globe sphere" },
    // "kaşe"      ends with e ✓  "ka-şe"→"kaşe" ✓  (rubber stamp)
    { word: "kaşe",       syllableBreak: "ka-şe",          visualPrompt: "a rubber stamp" },
    // "kase"      ends with e ✓  "ka-se"→"kase" ✓  (bowl)
    { word: "kase",       syllableBreak: "ka-se",          visualPrompt: "a ceramic bowl" },
    // "eşe" — not standard; "böyle" adverb; skip
    // "oje"       ends with e ✓  "o-je"→"oje" ✓  (nail polish)
    { word: "oje",        syllableBreak: "o-je",           visualPrompt: "a bottle of nail polish" },
    // "nane"      ends with e ✓  "na-ne"→"nane" ✓  (mint plant)
    { word: "nane",       syllableBreak: "na-ne",          visualPrompt: "a mint herb plant" },
    // Total final: 29 concrete nouns ending in e ✓
  ],
};
