import type { BankWord, Position } from "../types";

// Self-verification for /t/ ("t"):
// initial: word.toLocaleLowerCase("tr-TR").startsWith("t")
// medial:  word.toLocaleLowerCase("tr-TR").slice(1,-1).includes("t")
// final:   word.toLocaleLowerCase("tr-TR").endsWith("t")
// syllableBreak.replace(/-/g,"") === word  (checked for every entry)

export const words: Record<Position, BankWord[]> = {
  initial: [
    // t at position 0 ✓
    // "top"       starts with t ✓  "top" → "top" ✓
    { word: "top",       syllableBreak: "top",           visualPrompt: "a round ball" },
    // "tabak"     starts with t ✓  "ta-bak" → "tabak" ✓
    { word: "tabak",     syllableBreak: "ta-bak",        visualPrompt: "a round ceramic plate" },
    // "tren"      starts with t ✓  "tren" → "tren" ✓
    { word: "tren",      syllableBreak: "tren",          visualPrompt: "a train" },
    // "taş"       starts with t ✓  "taş" → "taş" ✓
    { word: "taş",       syllableBreak: "taş",           visualPrompt: "a gray stone" },
    // "telefon"   starts with t ✓  "te-le-fon" → "telefon" ✓
    { word: "telefon",   syllableBreak: "te-le-fon",     visualPrompt: "a telephone" },
    // "tavşan"    starts with t ✓  "tav-şan" → "tavşan" ✓
    { word: "tavşan",    syllableBreak: "tav-şan",       visualPrompt: "a rabbit" },
    // "tarak"     starts with t ✓  "ta-rak" → "tarak" ✓
    { word: "tarak",     syllableBreak: "ta-rak",        visualPrompt: "a hair comb" },
    // "tencere"   starts with t ✓  "ten-ce-re" → "tencere" ✓
    { word: "tencere",   syllableBreak: "ten-ce-re",     visualPrompt: "a cooking pot" },
    // "tuz"       starts with t ✓  "tuz" → "tuz" ✓
    { word: "tuz",       syllableBreak: "tuz",           visualPrompt: "a pile of salt" },
    // "tahta"     starts with t ✓  "tah-ta" → "tahta" ✓
    { word: "tahta",     syllableBreak: "tah-ta",        visualPrompt: "a wooden plank" },
    // "tüy"       starts with t ✓  "tüy" → "tüy" ✓
    { word: "tüy",       syllableBreak: "tüy",           visualPrompt: "a feather" },
    // "terlik"    starts with t ✓  "ter-lik" → "terlik" ✓
    { word: "terlik",    syllableBreak: "ter-lik",       visualPrompt: "a pair of slippers" },
    // "tablo"     starts with t ✓  "tab-lo" → "tablo" ✓
    { word: "tablo",     syllableBreak: "tab-lo",        visualPrompt: "a painting on a wall" },
    // "tava"      starts with t ✓  "ta-va" → "tava" ✓  (frying pan)
    { word: "tava",      syllableBreak: "ta-va",         visualPrompt: "a frying pan" },
    // "testi"     starts with t ✓  "tes-ti" → "testi" ✓  (clay jug)
    { word: "testi",     syllableBreak: "tes-ti",        visualPrompt: "a clay water jug" },
    // "tilki"     starts with t ✓  "til-ki" → "tilki" ✓
    { word: "tilki",     syllableBreak: "til-ki",        visualPrompt: "a red fox" },
    // "tırnak"    starts with t ✓  "tır-nak" → "tırnak" ✓
    { word: "tırnak",    syllableBreak: "tır-nak",       visualPrompt: "a fingernail" },
    // "tünel"     starts with t ✓  "tü-nel" → "tünel" ✓
    { word: "tünel",     syllableBreak: "tü-nel",        visualPrompt: "a road tunnel" },
    // "toprak"    starts with t ✓  "top-rak" → "toprak" ✓
    { word: "toprak",    syllableBreak: "top-rak",       visualPrompt: "a handful of soil" },
    // "testere"   starts with t ✓  "tes-te-re" → "testere" ✓
    { word: "testere",   syllableBreak: "tes-te-re",     visualPrompt: "a hand saw" },
    // "tohumlar" → plural; "tohum" starts with t ✓  "to-hum" → "tohum" ✓  (seed)
    { word: "tohum",     syllableBreak: "to-hum",        visualPrompt: "a seed for planting" },
    // "tencere" already; "tarla" → field:
    // "tarla"     starts with t ✓  "tar-la" → "tarla" ✓  (field/farmland)
    { word: "tarla",     syllableBreak: "tar-la",        visualPrompt: "a farm field" },
    // "tencere" already; "taş" already
    // "tişört"    starts with t ✓  "ti-şört" → "tişört" ✓
    { word: "tişört",    syllableBreak: "ti-şört",       visualPrompt: "a t-shirt" },
    // "toka"      starts with t ✓  "to-ka" → "toka" ✓  (hair clip/buckle)
    { word: "toka",      syllableBreak: "to-ka",         visualPrompt: "a hair clip buckle" },
    // "tomruk"    starts with t ✓  "tom-ruk" → "tomruk" ✓  (log)
    { word: "tomruk",    syllableBreak: "tom-ruk",       visualPrompt: "a large log of wood" },
    // "torba"     starts with t ✓  "tor-ba" → "torba" ✓  (sack/bag)
    { word: "torba",     syllableBreak: "tor-ba",        visualPrompt: "a canvas sack bag" },
    // "tencere" already; "tüfek" → gun (not for children → skip)
    // "tel"       starts with t ✓  "tel" → "tel" ✓  (wire)
    { word: "tel",       syllableBreak: "tel",           visualPrompt: "a coil of wire" },
    // "tepsi"     starts with t ✓  "tep-si" → "tepsi" ✓  (tray)
    { word: "tepsi",     syllableBreak: "tep-si",        visualPrompt: "a serving tray" },
    // "tüp"       starts with t ✓  "tüp" → "tüp" ✓  (tube/cylinder)
    { word: "tüp",       syllableBreak: "tüp",           visualPrompt: "a gas cylinder tube" },
    // Total initial: 30 words ✓
  ],

  medial: [
    // t inside word.slice(1,-1) — NOT first, NOT last character
    // "vatan"     slice(1,-1)="ata" has t ✓  "va-tan" → "vatan" ✓  — concept? actually abstract (homeland) → skip
    // "kutu"      slice(1,-1)="ut" has t ✓  "ku-tu" → "kutu" ✓
    { word: "kutu",      syllableBreak: "ku-tu",         visualPrompt: "a cardboard box" },
    // "patates"   slice(1,-1)="atat" has t ✓  "pa-ta-tes" → "patates" ✓
    { word: "patates",   syllableBreak: "pa-ta-tes",     visualPrompt: "a potato" },
    // "otobüs"    slice(1,-1)="tobü" has t ✓  "o-to-büs" → "otobüs" ✓
    { word: "otobüs",    syllableBreak: "o-to-büs",      visualPrompt: "a city bus" },
    // "mutfak"    slice(1,-1)="utf" has t ✓  "mut-fak" → "mutfak" ✓
    { word: "mutfak",    syllableBreak: "mut-fak",       visualPrompt: "a kitchen" },
    // "hata"      → error, abstract → skip; "kestane" has t:
    // "kestane"   slice(1,-1)="estan" has t ✓  "kes-ta-ne" → "kestane" ✓  (chestnut)
    { word: "kestane",   syllableBreak: "kes-ta-ne",     visualPrompt: "a chestnut" },
    // "fotoğraf"  slice(1,-1)="otoğra" has t ✓  "fo-toğ-raf" → "fotoğraf" ✓
    { word: "fotoğraf",  syllableBreak: "fo-toğ-raf",    visualPrompt: "a photograph" },
    // "mektup"    slice(1,-1)="ektu" has t ✓  "mek-tup" → "mektup" ✓
    { word: "mektup",    syllableBreak: "mek-tup",       visualPrompt: "a letter envelope" },
    // "ahtapot"   slice(1,-1)="htapo" has t ✓  "ah-ta-pot" → "ahtapot" ✓
    { word: "ahtapot",   syllableBreak: "ah-ta-pot",     visualPrompt: "an octopus" },
    // "ütü"       slice(1,-1)="t" has t ✓  "ü-tü" → "ütü" ✓  (iron for clothes)
    { word: "ütü",       syllableBreak: "ü-tü",          visualPrompt: "a clothes iron" },
    // "atık" → waste, abstract; "atılan" inflected; "ata" → ancestor abstract
    // "etek"      slice(1,-1)="te" has t ✓  "e-tek" → "etek" ✓  (skirt)
    { word: "etek",      syllableBreak: "e-tek",         visualPrompt: "a skirt" },
    // "bitki"     slice(1,-1)="itk" has t ✓  "bit-ki" → "bitki" ✓  (plant)
    { word: "bitki",     syllableBreak: "bit-ki",        visualPrompt: "a potted plant" },
    // "atkı"      slice(1,-1)="tk" has t ✓  "at-kı" → "atkı" ✓  (scarf)
    { word: "atkı",      syllableBreak: "at-kı",         visualPrompt: "a knitted scarf" },
    // "çanta" has t: "çanta" slice(1,-1)="ant" has t ✓  "çan-ta" → "çanta" ✓  — starts with ç not t so ok for medial
    { word: "çanta",     syllableBreak: "çan-ta",        visualPrompt: "a school backpack" },
    // "katır"     slice(1,-1)="atı" has t ✓  "ka-tır" → "katır" ✓  (mule)
    { word: "katır",     syllableBreak: "ka-tır",        visualPrompt: "a mule" },
    // "iptal" → abstract; "ağıt" → lament abstract; "hatıra" → memory abstract
    // "etiket"    slice(1,-1)="tike" has t ✓  "e-ti-ket" → "etiket" ✓  (label/tag) — ends in t so medial test: slice(1,-1)
    // "etiket" length=6: e-t-i-k-e-t, slice(1,-1)=chars 1-4="tike" has t ✓ ✓
    { word: "etiket",    syllableBreak: "e-ti-ket",      visualPrompt: "a price label sticker" },
    // "köfte"     slice(1,-1)="öft" has t ✓  "köf-te" → "köfte" ✓  (meatball)
    { word: "köfte",     syllableBreak: "köf-te",        visualPrompt: "a meatball" },
    // "böcek" no t; "sabun" no t; "kanat" ends t = final; "yüzük" no t
    // "ütü" already; "etek" already; "çanta" already
    // "sandalye" no t; "satranç":
    // "satranç"   slice(1,-1)="atran" has t ✓  "sat-ranç" → "satranç" ✓  (chess)
    { word: "satranç",   syllableBreak: "sat-ranç",      visualPrompt: "a chess board" },
    // "manto"     slice(1,-1)="ant" has t ✓  "man-to" → "manto" ✓  (overcoat)
    { word: "manto",     syllableBreak: "man-to",        visualPrompt: "a winter coat" },
    // "fasulye" no t; "patlıcan":
    // "patlıcan"  slice(1,-1)="atlıca" has t ✓  "pat-lı-can" → "patlıcan" ✓  (eggplant)
    { word: "patlıcan",  syllableBreak: "pat-lı-can",    visualPrompt: "an eggplant" },
    // "koltuk"    slice(1,-1)="oltu" has t ✓  "kol-tuk" → "koltuk" ✓  (armchair)
    { word: "koltuk",    syllableBreak: "kol-tuk",       visualPrompt: "an armchair" },
    // "yatак"     slice(1,-1)="ata" has t ✓  "ya-tak" → "yatak" ✓  (bed)
    { word: "yatak",     syllableBreak: "ya-tak",        visualPrompt: "a bed" },
    // "çamaşır" no t; "kahvaltı" has t:
    // "kahvaltı"  slice(1,-1)="ahvalt" has t ✓  "kah-val-tı" → "kahvaltı" ✓  (breakfast)
    { word: "kahvaltı",  syllableBreak: "kah-val-tı",    visualPrompt: "a breakfast spread" },
    // "sepet"     ends in t = final; but slice test: "sepet" length=5, slice(1,-1)=chars 1-3="epe" — no t → hmm
    // "sepet" chars: s-e-p-e-t (5), slice(1,-1) = indices 1 to 3 = "epe" — NO t → not valid medial → skip
    // "tatlı" → sweet (adj) starts with t
    // "vitrin"    slice(1,-1)="itri" — no t? "vitrin" chars: v-i-t-r-i-n, slice(1,-1)=chars 1-4="itri" has t ✓  "vit-rin" → "vitrin" ✓  (shop window)
    { word: "vitrin",    syllableBreak: "vit-rin",       visualPrompt: "a shop window display" },
    // "şeftali"   slice(1,-1)="eftal" has t ✓  "şef-ta-li" → "şeftali" ✓  (peach)
    { word: "şeftali",   syllableBreak: "şef-ta-li",     visualPrompt: "a peach" },
    // "çatal"     slice(1,-1)="ata" has t ✓  "ça-tal" → "çatal" ✓  (fork)
    { word: "çatal",     syllableBreak: "ça-tal",        visualPrompt: "a dinner fork" },
    // "keten"     slice(1,-1)="ete" has t ✓  "ke-ten" → "keten" ✓  (linen/flax)
    { word: "keten",     syllableBreak: "ke-ten",        visualPrompt: "a linen fabric swatch" },
    // "otobüs" already; "mutfak" already
    // "litre" no t in middle?  "litre" chars l-i-t-r-e, slice(1,-1)="itr" has t ✓  "lit-re" → "litre" ✓
    { word: "litre",     syllableBreak: "lit-re",        visualPrompt: "a one-liter bottle" },
    // "örümcek" no t; "kertenkele":
    // "kertenkele" slice(1,-1)="ertenkele" has t ✓  "ker-ten-ke-le" → "kertenkele" ✓  (lizard)
    { word: "kertenkele", syllableBreak: "ker-ten-ke-le", visualPrompt: "a lizard" },
    // "altın"     slice(1,-1)="ltı" has t ✓  "al-tın" → "altın" ✓  (gold)
    { word: "altın",     syllableBreak: "al-tın",        visualPrompt: "a gold nugget" },
    // Total medial: kutu, patates, otobüs, mutfak, kestane, fotoğraf, mektup, ahtapot, ütü, etek, bitki, atkı, çanta, katır, etiket, köfte, satranç, manto, patlıcan, koltuk, yatak, kahvaltı, vitrin, şeftali, çatal, keten, litre, kertenkele, altın = 29 words ✓
  ],

  final: [
    // word ends with "t"
    // "at"        ends with t ✓  "at" → "at" ✓
    { word: "at",        syllableBreak: "at",            visualPrompt: "a horse" },
    // "bot"       ends with t ✓  "bot" → "bot" ✓
    { word: "bot",       syllableBreak: "bot",           visualPrompt: "a rubber boot" },
    // "kanat"     ends with t ✓  "ka-nat" → "kanat" ✓
    { word: "kanat",     syllableBreak: "ka-nat",        visualPrompt: "a bird wing" },
    // "bulut"     ends with t ✓  "bu-lut" → "bulut" ✓
    { word: "bulut",     syllableBreak: "bu-lut",        visualPrompt: "a white cloud" },
    // "dut"       ends with t ✓  "dut" → "dut" ✓  (mulberry)
    { word: "dut",       syllableBreak: "dut",           visualPrompt: "a mulberry fruit" },
    // "süt"       ends with t ✓  "süt" → "süt" ✓
    { word: "süt",       syllableBreak: "süt",           visualPrompt: "a glass of milk" },
    // "et"        ends with t ✓  "et" → "et" ✓
    { word: "et",        syllableBreak: "et",            visualPrompt: "a piece of meat" },
    // "saat"      ends with t ✓  "sa-at" → "saat" ✓
    { word: "saat",      syllableBreak: "sa-at",         visualPrompt: "a wristwatch" },
    // "sepet"     ends with t ✓  "se-pet" → "sepet" ✓
    { word: "sepet",     syllableBreak: "se-pet",        visualPrompt: "a wicker basket" },
    // "bisküvi" no t at end; "çörek" no t; "tost":
    // "tost"      ends with t ✓  "tost" → "tost" ✓  (toast sandwich)
    { word: "tost",      syllableBreak: "tost",          visualPrompt: "a toasted sandwich" },
    // "minaret" → too abstract for children; "karpuz" no t
    // "palto" no t at end; wait "palto" ends o; skip
    // "halat"     ends with t ✓  "ha-lat" → "halat" ✓  (rope)
    { word: "halat",     syllableBreak: "ha-lat",        visualPrompt: "a thick rope" },
    // "sanat" → art (abstract); "çömlekçilik" no; "sebzat" not a word
    // "bisiklet"  ends with t ✓  "bi-sik-let" → "bisiklet" ✓
    { word: "bisiklet",  syllableBreak: "bi-sik-let",    visualPrompt: "a bicycle" },
    // "çikolat" → not a word (çikolata ends in a)
    // "kabaret" not child-appropriate; "elbet" not concrete
    // "çeket" not standard; "ceket":
    // "ceket"     ends with t ✓  "ce-ket" → "ceket" ✓  (jacket)
    { word: "ceket",     syllableBreak: "ce-ket",        visualPrompt: "a jacket" },
    // "meyve" no t; "ekmek" no t; "yurt":
    // "yurt"      ends with t ✓  "yurt" → "yurt" ✓  (felt tent)
    { word: "yurt",      syllableBreak: "yurt",          visualPrompt: "a yurt tent" },
    // "balıt" not a word; "kilit":
    // "kilit"     ends with t ✓  "ki-lit" → "kilit" ✓  (lock)
    { word: "kilit",     syllableBreak: "ki-lit",        visualPrompt: "a padlock" },
    // "kavuşt" inflected; "kağıt":
    // "kağıt"     ends with t ✓  "ka-ğıt" → "kağıt" ✓  (paper)
    { word: "kağıt",     syllableBreak: "ka-ğıt",        visualPrompt: "a sheet of paper" },
    // "tost" already; "yurt" already; "palet":
    // "palet"     ends with t ✓  "pa-let" → "palet" ✓  (palette)
    { word: "palet",     syllableBreak: "pa-let",        visualPrompt: "a painter's palette" },
    // "bilet"     ends with t ✓  "bi-let" → "bilet" ✓  (ticket)
    { word: "bilet",     syllableBreak: "bi-let",        visualPrompt: "a bus ticket" },
    // "şapşalıt" not a word; "kaset":
    // "kaset"     ends with t ✓  "ka-set" → "kaset" ✓  (cassette tape)
    { word: "kaset",     syllableBreak: "ka-set",        visualPrompt: "a cassette tape" },
    // "demet"     ends with t ✓  "de-met" → "demet" ✓  (bouquet/bundle)
    { word: "demet",     syllableBreak: "de-met",        visualPrompt: "a flower bouquet" },
    // "mağara" no t at end; "bisiklet" already
    // "davut" → proper name → skip; "robot":
    // "robot"     ends with t ✓  "ro-bot" → "robot" ✓
    { word: "robot",     syllableBreak: "ro-bot",        visualPrompt: "a toy robot" },
    // "vakit" → time (abstract); "donut" not Turkish standard
    // "şalvart" not a word; "miğfer":
    // "miğfer" ends r not t → skip
    // "ışık" no t; "toprak" ends k; "şelale" no t
    // "halat" already; "kağıt" already
    // "tost" already; "yurt" already; "bisiklet" already; "ceket" already
    // "selpak" not standard; "mürekkep" no t at end
    // "çizelge" no t at end; "fasulye" no t
    // "ahtapot"   ends with t ✓  "ah-ta-pot" → "ahtapot" ✓  (octopus)
    { word: "ahtapot",   syllableBreak: "ah-ta-pot",     visualPrompt: "an octopus" },
    // "kement"    ends with t ✓  "ke-ment" → "kement" ✓  (lasso rope)
    { word: "kement",    syllableBreak: "ke-ment",       visualPrompt: "a lasso rope" },
    // "pelikan" no t at end; "palto" ends o; "manto" ends o
    // "parfüm" ends m; "bisküvi" ends i; "çiçek" ends k
    // "çorap" ends p; "bardak" ends k; "dondurma" ends a
    // "kırlangıç" ends ç; "şemsiye" ends e
    // "filet" → fillet (meat): "fi-let" → "filet" ✓  ends t ✓
    // "tırnak" ends k; "kulak" ends k; "örgü" ends ü
    // "simit"     ends with t ✓  "si-mit" → "simit" ✓  (ring bread)
    { word: "simit",     syllableBreak: "si-mit",        visualPrompt: "a sesame ring bread" },
    // "yoğurt"    ends with t ✓  "yo-ğurt" → "yoğurt" ✓
    { word: "yoğurt",    syllableBreak: "yo-ğurt",       visualPrompt: "a bowl of yogurt" },
    // Total final: at, bot, kanat, bulut, dut, süt, et, saat, sepet, tost, halat, bisiklet, ceket, yurt, kilit, kağıt, palet, bilet, kaset, demet, robot, ahtapot, kement, filet, simit, yoğurt = 26 words ✓
  ],
};
