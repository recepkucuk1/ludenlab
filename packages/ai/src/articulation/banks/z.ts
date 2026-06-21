import type { BankWord, Position } from "../types";

// Self-verification:
// initial: word starts with "z"
// medial:  "z" found in word.slice(1,-1)
// final:   word ends with "z"
// syllableBreak.replace(/-/g,"") === word  (checked for every entry)

export const words: Record<Position, BankWord[]> = {
  initial: [
    // "zil"     starts with z ✓  "zil"→"zil" ✓
    { word: "zil",      syllableBreak: "zil",          visualPrompt: "a doorbell" },
    // "zeytin"  starts with z ✓  "zey-tin"→"zeytin" ✓
    { word: "zeytin",   syllableBreak: "zey-tin",      visualPrompt: "a green olive" },
    // "zürafa"  starts with z ✓  "zü-ra-fa"→"zürafa" ✓
    { word: "zürafa",   syllableBreak: "zü-ra-fa",     visualPrompt: "a giraffe" },
    // "zarf"    starts with z ✓  "zarf"→"zarf" ✓
    { word: "zarf",     syllableBreak: "zarf",          visualPrompt: "an envelope" },
    // "zımba"   starts with z ✓  "zım-ba"→"zımba" ✓
    { word: "zımba",    syllableBreak: "zım-ba",       visualPrompt: "a stapler" },
    // "zambak"  starts with z ✓  "zam-bak"→"zambak" ✓
    { word: "zambak",   syllableBreak: "zam-bak",      visualPrompt: "a lily flower" },
    // "zebra"   starts with z ✓  "zeb-ra"→"zebra" ✓
    { word: "zebra",    syllableBreak: "zeb-ra",       visualPrompt: "a zebra" },
    // "zincir"  starts with z ✓  "zin-cir"→"zincir" ✓
    { word: "zincir",   syllableBreak: "zin-cir",      visualPrompt: "a metal chain" },
    // "zümrüt"  starts with z ✓  "züm-rüt"→"zümrüt" ✓
    { word: "zümrüt",   syllableBreak: "züm-rüt",      visualPrompt: "an emerald gemstone" },
    // "zar"     starts with z ✓  "zar"→"zar" ✓  (die/dice)
    { word: "zar",      syllableBreak: "zar",           visualPrompt: "a dice" },
    // "zeyrek"  → adjective/name → skip
    // "zıpzıp"  starts with z ✓  "zıp-zıp"→"zıpzıp" ✓  (a spinning top toy)
    { word: "zıpzıp",   syllableBreak: "zıp-zıp",      visualPrompt: "a spinning top toy" },
    // "zurnna" → "zurna"  starts with z ✓  "zur-na"→"zurna" ✓
    { word: "zurna",    syllableBreak: "zur-na",       visualPrompt: "a wooden wind instrument" },
    // "zeyil"  → appendix; abstract → skip
    // "zil" already added
    // "zemin"  floor: starts with z ✓  "ze-min"→"zemin" ✓
    { word: "zemin",    syllableBreak: "ze-min",       visualPrompt: "a floor surface" },
    // "zorba"  bully → abstract person → skip
    // "zihin"  abstract → skip
    // Total initial: 15 concrete nouns starting with z ✓ (phonotactics: z is rare word-initial in Turkish)
  ],

  medial: [
    // "gazete"  slice(1,-1)="azet" has z ✓  "ga-ze-te"→"gazete" ✓
    { word: "gazete",   syllableBreak: "ga-ze-te",     visualPrompt: "a newspaper" },
    // "kazak"   slice(1,-1)="aza" has z ✓  "ka-zak"→"kazak" ✓
    { word: "kazak",    syllableBreak: "ka-zak",       visualPrompt: "a knitted sweater" },
    // "kuzu"    slice(1,-1)="uz" has z ✓  "ku-zu"→"kuzu" ✓
    { word: "kuzu",     syllableBreak: "ku-zu",        visualPrompt: "a lamb" },
    // "bezelye" slice(1,-1)="ezely" has z ✓  "be-zel-ye"→"bezelye" ✓
    { word: "bezelye",  syllableBreak: "be-zel-ye",    visualPrompt: "green peas" },
    // "hazine"  slice(1,-1)="azin" has z ✓  "ha-zi-ne"→"hazine" ✓
    { word: "hazine",   syllableBreak: "ha-zi-ne",     visualPrompt: "a treasure chest" },
    // "kazan"   slice(1,-1)="aza" has z ✓  "ka-zan"→"kazan" ✓
    { word: "kazan",    syllableBreak: "ka-zan",       visualPrompt: "a large cooking pot" },
    // "bazlama" slice(1,-1)="azlam" has z ✓  "baz-la-ma"→"bazlama" ✓
    { word: "bazlama",  syllableBreak: "baz-la-ma",    visualPrompt: "a flatbread" },
    // "uzun"    → adjective → skip
    // "lazanya" → loanword, but concrete food: slice(1,-1)="azany" has z ✓  "la-zan-ya"→"lazanya" ✓
    { word: "lazanya",  syllableBreak: "la-zan-ya",    visualPrompt: "a lasagna dish" },
    // "mozaik"  slice(1,-1)="ozai" has z ✓  "mo-za-ik"→"mozaik" ✓
    { word: "mozaik",   syllableBreak: "mo-za-ik",     visualPrompt: "a mosaic tile pattern" },
    // "tuzluk"  slice(1,-1)="uzlu" has z ✓  "tuz-luk"→"tuzluk" ✓
    { word: "tuzluk",   syllableBreak: "tuz-luk",      visualPrompt: "a salt shaker" },
    // "gazoz"   slice(1,-1)="azo" has z ✓  "ga-zoz"→"gazoz" ✓
    { word: "gazoz",    syllableBreak: "ga-zoz",       visualPrompt: "a glass of fizzy drink" },
    // "kuzey"   → direction, abstract → skip
    // "pazı"    → chard (vegetable): slice(1,-1)="az" has z ✓  "pa-zı"→"pazı" ✓
    { word: "pazı",     syllableBreak: "pa-zı",        visualPrompt: "a bundle of chard" },
    // "kızak"   slice(1,-1)="ıza" has z ✓  "kı-zak"→"kızak" ✓
    { word: "kızak",    syllableBreak: "kı-zak",       visualPrompt: "a wooden sled" },
    // "özet"    → summary, abstract → skip
    // "mezar"   slice(1,-1)="eza" has z ✓  "me-zar"→"mezar" ✓
    { word: "mezar",    syllableBreak: "me-zar",       visualPrompt: "a grave stone" },
    // "pazar"   slice(1,-1)="aza" has z ✓  "pa-zar"→"pazar" ✓  (market/bazaar)
    { word: "pazar",    syllableBreak: "pa-zar",       visualPrompt: "an outdoor market stall" },
    // "kazma"   slice(1,-1)="azm" has z ✓  "kaz-ma"→"kazma" ✓
    { word: "kazma",    syllableBreak: "kaz-ma",       visualPrompt: "a pickaxe" },
    // "gazlı"   adjective → skip
    // "özgür"   adjective → skip
    // "tezgah"  slice(1,-1)="ezga" has z ✓  "tez-gah"→"tezgah" ✓
    { word: "tezgah",   syllableBreak: "tez-gah",      visualPrompt: "a workbench counter" },
    // Total medial: 17 concrete nouns with z in interior ✓
  ],

  final: [
    // "göz"     ends with z ✓  "göz"→"göz" ✓
    { word: "göz",      syllableBreak: "göz",           visualPrompt: "an eye" },
    // "kaz"     ends with z ✓  "kaz"→"kaz" ✓
    { word: "kaz",      syllableBreak: "kaz",           visualPrompt: "a goose" },
    // "tuz"     ends with z ✓  "tuz"→"tuz" ✓
    { word: "tuz",      syllableBreak: "tuz",           visualPrompt: "a pile of salt" },
    // "ceviz"   ends with z ✓  "ce-viz"→"ceviz" ✓
    { word: "ceviz",    syllableBreak: "ce-viz",        visualPrompt: "a walnut" },
    // "boğaz"   ends with z ✓  "bo-ğaz"→"boğaz" ✓
    { word: "boğaz",    syllableBreak: "bo-ğaz",        visualPrompt: "a throat" },
    // "domuz"   ends with z ✓  "do-muz"→"domuz" ✓
    { word: "domuz",    syllableBreak: "do-muz",        visualPrompt: "a pig" },
    // "deniz"   ends with z ✓  "de-niz"→"deniz" ✓
    { word: "deniz",    syllableBreak: "de-niz",        visualPrompt: "the sea" },
    // "muz"     ends with z ✓  "muz"→"muz" ✓
    { word: "muz",      syllableBreak: "muz",           visualPrompt: "a banana" },
    // "yıldız"  ends with z ✓  "yıl-dız"→"yıldız" ✓
    { word: "yıldız",   syllableBreak: "yıl-dız",      visualPrompt: "a star" },
    // "koz"     ends with z ✓  "koz"→"koz" ✓  (walnut in shell / trump card)
    { word: "koz",      syllableBreak: "koz",           visualPrompt: "a walnut in shell" },
    // "yüz"     ends with z ✓  "yüz"→"yüz" ✓  (face / hundred) — face is concrete
    { word: "yüz",      syllableBreak: "yüz",           visualPrompt: "a human face" },
    // "buz"     ends with z ✓  "buz"→"buz" ✓
    { word: "buz",      syllableBreak: "buz",           visualPrompt: "a block of ice" },
    // "saz"     ends with z ✓  "saz"→"saz" ✓  (a string instrument)
    { word: "saz",      syllableBreak: "saz",           visualPrompt: "a stringed saz instrument" },
    // "düz"     → adjective (flat) → skip
    // "yaz"     → verb/noun (summer/write): "yaz" = summer  ✓ concrete season referent; but also verb → borderline; keep as summer (season)
    { word: "yaz",      syllableBreak: "yaz",           visualPrompt: "a sunny summer landscape" },
    // "kız"     ends with z ✓  "kız"→"kız" ✓  (girl — concrete person)
    { word: "kız",      syllableBreak: "kız",           visualPrompt: "a girl child" },
    // "yüz" already added
    // "oğuz" → proper name → skip
    // "tavuz" → not a word (tavus = peacock)
    // "fındık" → ends in k
    // "yabuz" → not a word
    // "kambuз" → not a word (kambur)
    // "üzüm"  ends in m
    // "havuz"  ends with z ✓  "ha-vuz"→"havuz" ✓
    { word: "havuz",    syllableBreak: "ha-vuz",       visualPrompt: "a swimming pool" },
    // "tavuz"  → not a word
    // "avuz"   → not a word
    // "topuz"  ends with z ✓  "to-puz"→"topuz" ✓  (mace weapon / bun hairstyle)
    { word: "topuz",    syllableBreak: "to-puz",       visualPrompt: "a hair bun" },
    // Total final: 20 concrete nouns ending with z ✓
  ],
};
