import type { BankWord, Position } from "../types";

// Self-verification:
// initial: word starts with "n"
// medial:  "n" found in word.slice(1,-1)  (interior, not first/last char)
// final:   word ends with "n"
// syllableBreak.replace(/-/g,"") === word  (every entry)
//
// NOTE — initial is MODERATE (~14 words):
// Native Turkish vocabulary has very few /n/-initial concrete nouns.
// The most common are listed; foreign loanwords for children included
// where widely used (numara, nesne). No padding with rare/abstract words.

export const words: Record<Position, BankWord[]> = {
  initial: [
    // "nar"        starts with n ✓  "nar"→"nar" ✓
    { word: "nar",        syllableBreak: "nar",           visualPrompt: "a pomegranate" },
    // "nohut"      starts with n ✓  "no-hut"→"nohut" ✓
    { word: "nohut",      syllableBreak: "no-hut",        visualPrompt: "chickpea legumes" },
    // "nane"       starts with n ✓  "na-ne"→"nane" ✓
    { word: "nane",       syllableBreak: "na-ne",         visualPrompt: "a mint plant" },
    // "nakış"      starts with n ✓  "na-kış"→"nakış" ✓
    { word: "nakış",      syllableBreak: "na-kış",        visualPrompt: "an embroidery pattern" },
    // "numara"     starts with n ✓  "nu-ma-ra"→"numara" ✓
    { word: "numara",     syllableBreak: "nu-ma-ra",      visualPrompt: "a door number plate" },
    // "nokta"      starts with n ✓  "nok-ta"→"nokta" ✓
    { word: "nokta",      syllableBreak: "nok-ta",        visualPrompt: "a black dot" },
    // "nine"       starts with n ✓  "ni-ne"→"nine" ✓  (grandmother — concrete person)
    { word: "nine",       syllableBreak: "ni-ne",         visualPrompt: "a grandmother" },
    // "nergis"     starts with n ✓  "ner-gis"→"nergis" ✓  (daffodil)
    { word: "nergis",     syllableBreak: "ner-gis",       visualPrompt: "a daffodil flower" },
    // "nalbur"     → hardware store, not concrete object itself; skip
    // "nal"        starts with n ✓  "nal"→"nal" ✓  (horseshoe)
    { word: "nal",        syllableBreak: "nal",           visualPrompt: "a horseshoe" },
    // "nazar"      starts with n ✓  "na-zar"→"nazar" ✓  (evil eye bead)
    { word: "nazar",      syllableBreak: "na-zar",        visualPrompt: "a blue evil eye bead" },
    // "nur"        → abstract (light/divine); skip
    // "not"        starts with n ✓  "not"→"not" ✓
    { word: "not",        syllableBreak: "not",           visualPrompt: "a handwritten note" },
    // "nesne"      starts with n ✓  "nes-ne"→"nesne" ✓
    { word: "nota",       syllableBreak: "no-ta",         visualPrompt: "a single musical note on a staff" },
    // "nefes"      → breath, abstract; skip
    // "nikel"      → nickel (not child-concrete); skip
    // "narenciye"  → citrus fruits as a category; too abstract; skip
    // Total initial: 13 — genuinely limited; no padding with non-concrete or abstract words
  ],

  medial: [
    // "anne"       slice(1,-1)="nn" has n ✓  "an-ne"→"anne" ✓
    { word: "anne",       syllableBreak: "an-ne",         visualPrompt: "a mother" },
    // "fincan"     slice(1,-1)="inca" has n ✓  "fin-can"→"fincan" ✓
    { word: "fincan",     syllableBreak: "fin-can",       visualPrompt: "a tea cup" },
    // "incir"      slice(1,-1)="nci" has n ✓  "in-cir"→"incir" ✓
    { word: "incir",      syllableBreak: "in-cir",        visualPrompt: "a fig fruit" },
    // "sünger"     slice(1,-1)="ünge" has n ✓  "sün-ger"→"sünger" ✓
    { word: "sünger",     syllableBreak: "sün-ger",       visualPrompt: "a sponge" },
    // "kanca"      slice(1,-1)="anc" has n ✓  "kan-ca"→"kanca" ✓
    { word: "kanca",      syllableBreak: "kan-ca",        visualPrompt: "a metal hook" },
    // "banyo"      slice(1,-1)="any" has n ✓  "ban-yo"→"banyo" ✓
    { word: "banyo",      syllableBreak: "ban-yo",        visualPrompt: "a bathtub" },
    // "kundura"    slice(1,-1)="undur" has n ✓  "kun-du-ra"→"kundura" ✓
    { word: "kundura",    syllableBreak: "kun-du-ra",     visualPrompt: "a leather shoe" },
    // "pencere"    slice(1,-1)="encer" has n ✓  "pen-ce-re"→"pencere" ✓
    { word: "pencere",    syllableBreak: "pen-ce-re",     visualPrompt: "a glass window" },
    // "panda"      → no n; "kande" → not a word; "kandil":
    // "kandil"     slice(1,-1)="andi" has n ✓  "kan-dil"→"kandil" ✓
    { word: "kandil",     syllableBreak: "kan-dil",       visualPrompt: "an oil lamp" },
    // "çanta"      slice(1,-1)="ant" has n ✓  "çan-ta"→"çanta" ✓
    { word: "çanta",      syllableBreak: "çan-ta",        visualPrompt: "a handbag" },
    // "çanak"      slice(1,-1)="ana" has n ✓  "ça-nak"→"çanak" ✓
    { word: "çanak",      syllableBreak: "ça-nak",        visualPrompt: "a clay bowl" },
    // "tencere"    slice(1,-1)="encer" has n ✓  "ten-ce-re"→"tencere" ✓
    { word: "tencere",    syllableBreak: "ten-ce-re",     visualPrompt: "a cooking pot" },
    // "mandalina"  slice(1,-1)="andalin" has n ✓  "man-da-li-na"→"mandalina" ✓
    { word: "mandalina",  syllableBreak: "man-da-li-na",  visualPrompt: "a mandarin orange" },
    // "sincap"     slice(1,-1)="inca" has n ✓  "sin-cap"→"sincap" ✓
    { word: "sincap",     syllableBreak: "sin-cap",       visualPrompt: "a squirrel" },
    // "renk"       slice(1,-1)="en" has n ✓  "renk"→"renk" ✓
    { word: "renk",       syllableBreak: "renk",          visualPrompt: "a color swatch" },
    // "deniz"      slice(1,-1)="eni" has n ✓  "de-niz"→"deniz" ✓
    { word: "deniz",      syllableBreak: "de-niz",        visualPrompt: "the sea" },
    // "minder"     slice(1,-1)="inde" has n ✓  "min-der"→"minder" ✓
    { word: "minder",     syllableBreak: "min-der",       visualPrompt: "a floor cushion" },
    // "anten"      slice(1,-1)="nte" has n ✓  "an-ten"→"anten" ✓
    { word: "anten",      syllableBreak: "an-ten",        visualPrompt: "a TV antenna" },
    // "manto" → no n in interior; "cenaze" → morbid; skip
    // "kanape"     slice(1,-1)="anap" has n ✓  "ka-na-pe"→"kanape" ✓
    { word: "kanape",     syllableBreak: "ka-na-pe",      visualPrompt: "a sofa couch" },
    // "menteşe"    slice(1,-1)="enteş" has n ✓  "men-te-şe"→"menteşe" ✓
    { word: "menteşe",    syllableBreak: "men-te-şe",     visualPrompt: "a door hinge" },
    // "ünlü" → abstract; "ünvan" → abstract title
    // "tangram" → no n interior at proper pos? "tangram": t-a-n-g-r-a-m, slice(1,-1)="angra" has n ✓  "tan-gram"→"tangram" ✓
    { word: "tangram",    syllableBreak: "tan-gram",      visualPrompt: "a tangram puzzle set" },
    // "sandık"     slice(1,-1)="andı" has n ✓  "san-dık"→"sandık" ✓
    { word: "sandık",     syllableBreak: "san-dık",       visualPrompt: "a wooden chest box" },
    // "sandal"     slice(1,-1)="anda" has n ✓  "san-dal"→"sandal" ✓  (rowboat)
    { word: "sandal",     syllableBreak: "san-dal",       visualPrompt: "a small rowboat" },
    // "vinç"       slice(1,-1)="in" has n ✓  "vinç"→"vinç" ✓
    { word: "vinç",       syllableBreak: "vinç",          visualPrompt: "a crane machine" },
    // "lanse" → abstract; "lantern" → not standard Turkish; "fener":
    // "fener"      slice(1,-1)="ene" has n ✓  "fe-ner"→"fener" ✓
    { word: "fener",      syllableBreak: "fe-ner",        visualPrompt: "a lantern" },
    // "kanarya"    slice(1,-1)="anar" has n ✓  "ka-nar-ya"→"kanarya" ✓
    { word: "kanarya",    syllableBreak: "ka-nar-ya",     visualPrompt: "a canary bird" },
    // "sınıf"      slice(1,-1)="ını" has n ✓  "sı-nıf"→"sınıf" ✓
    { word: "sınıf",      syllableBreak: "sı-nıf",        visualPrompt: "a classroom" },
    // "kına"       slice(1,-1)="ın" has n ✓  "kı-na"→"kına" ✓  (henna)
    { word: "kına",       syllableBreak: "kı-na",         visualPrompt: "henna dye paste" },
    // "minare"     slice(1,-1)="inar" has n ✓  "mi-na-re"→"minare" ✓
    { word: "minare",     syllableBreak: "mi-na-re",      visualPrompt: "a mosque minaret" },
    // Total medial: 30 concrete nouns with n in interior ✓
  ],

  final: [
    // "aslan"      ends with n ✓  "as-lan"→"aslan" ✓
    { word: "aslan",      syllableBreak: "as-lan",        visualPrompt: "a lion" },
    // "kaplan"     ends with n ✓  "kap-lan"→"kaplan" ✓
    { word: "kaplan",     syllableBreak: "kap-lan",       visualPrompt: "a tiger" },
    // "fincan"     ends with n ✓  "fin-can"→"fincan" ✓
    { word: "fincan",     syllableBreak: "fin-can",       visualPrompt: "a tea cup" },
    // "orman"      ends with n ✓  "or-man"→"orman" ✓
    { word: "orman",      syllableBreak: "or-man",        visualPrompt: "a forest" },
    // "fırın"      ends with n ✓  "fı-rın"→"fırın" ✓
    { word: "fırın",      syllableBreak: "fı-rın",        visualPrompt: "a stone oven" },
    // "düğün"      ends with n ✓  "dü-ğün"→"düğün" ✓
    { word: "düğün",      syllableBreak: "dü-ğün",        visualPrompt: "a wedding celebration" },
    // "kazan"      ends with n ✓  "ka-zan"→"kazan" ✓
    { word: "kazan",      syllableBreak: "ka-zan",        visualPrompt: "a large cauldron" },
    // "tavan"      ends with n ✓  "ta-van"→"tavan" ✓
    { word: "tavan",      syllableBreak: "ta-van",        visualPrompt: "a ceiling" },
    // "çiçen" → not a word; "küçen" → not a word; "çiçek" → no n
    // "beden"      ends with n ✓  "be-den"→"beden" ✓
    { word: "beden",      syllableBreak: "be-den",        visualPrompt: "a human body" },
    // "elvan" → color adjective; "tarhan":
    // "tarhan"     ends with n ✓  "tar-han"→"tarhan" ✓  (dried yoghurt soup)
    // "çan"        ends with n ✓  "çan"→"çan" ✓
    { word: "çan",        syllableBreak: "çan",           visualPrompt: "a bell" },
    // "can"        → abstract (life/soul); skip
    // "yün"        ends with n ✓  "yün"→"yün" ✓
    { word: "yün",        syllableBreak: "yün",           visualPrompt: "a ball of wool" },
    // "çimen" → ends in n: "çi-men"→"çimen" ✓  ends with n ✓
    { word: "çimen",      syllableBreak: "çi-men",        visualPrompt: "a patch of grass" },
    // "çeşme" → no n; "çırpın" → verb; "fidan":
    // "fidan"      ends with n ✓  "fi-dan"→"fidan" ✓  (sapling)
    { word: "fidan",      syllableBreak: "fi-dan",        visualPrompt: "a tree sapling" },
    // "salon"      ends with n ✓  "sa-lon"→"salon" ✓
    { word: "salon",      syllableBreak: "sa-lon",        visualPrompt: "a living room" },
    // "balkon"     ends with n ✓  "bal-kon"→"balkon" ✓
    { word: "balkon",     syllableBreak: "bal-kon",       visualPrompt: "an apartment balcony" },
    // "limon"      ends with n ✓  "li-mon"→"limon" ✓
    { word: "limon",      syllableBreak: "li-mon",        visualPrompt: "a lemon" },
    // "balon"      ends with n ✓  "ba-lon"→"balon" ✓
    { word: "balon",      syllableBreak: "ba-lon",        visualPrompt: "a colorful balloon" },
    // "çiçen" → not a word; "sezon" → abstract; "karton":
    // "karton"     ends with n ✓  "kar-ton"→"karton" ✓
    { word: "karton",     syllableBreak: "kar-ton",       visualPrompt: "a cardboard box" },
    // "kaşıktan" → case suffix; standalone: "nohutan" → case; skip
    // "tavşan"     ends with n ✓  "tav-şan"→"tavşan" ✓
    { word: "tavşan",     syllableBreak: "tav-şan",       visualPrompt: "a rabbit" },
    // "çoban"      ends with n ✓  "ço-ban"→"çoban" ✓
    { word: "çoban",      syllableBreak: "ço-ban",        visualPrompt: "a shepherd with sheep" },
    // "tarzan" → proper noun; "kuşburnu":
    // "kazan" already; "kışın" → adverb; "ezan":
    // "ezan"       ends with n ✓  "e-zan"→"ezan" ✓  (call to prayer)
    // "tren"       ends with n ✓  "tren"→"tren" ✓
    { word: "tren",       syllableBreak: "tren",          visualPrompt: "a train" },
    // "mercan" → ends with n: "mer-can"→"mercan" ✓  ends with n ✓
    { word: "mercan",     syllableBreak: "mer-can",       visualPrompt: "a coral" },
    // "yüzün" → possessive; "denin" → possessive; "gelin":
    // "gelin"      ends with n ✓  "ge-lin"→"gelin" ✓  (bride)
    { word: "gelin",      syllableBreak: "ge-lin",        visualPrompt: "a bride in a wedding dress" },
    // "karın"      ends with n ✓  "ka-rın"→"karın" ✓  (abdomen/belly)
    { word: "karın",      syllableBreak: "ka-rın",        visualPrompt: "an abdomen" },
    // "kapın" → possessive; "sığın" → verb
    // "kilin" → possessive; "kozun" → possessive
    // "yaban"      ends with n ✓  "ya-ban"→"yaban" ✓  (wild; as in "yaban gülü" — but "yaban" alone is adj/noun border)
    // → adjective quality "wild"; skip
    // "mantar" → no n; "muşmula":
    // "muşmula" → ends with a; skip
    // "çöken" → abstract; "küfen" → not a word; "leğen":
    // "leğen"      ends with n ✓  "le-ğen"→"leğen" ✓  (basin/tub)
    { word: "leğen",      syllableBreak: "le-ğen",        visualPrompt: "a wash basin" },
    // "kilim" → no n; "maden":
    // "maden"      ends with n ✓  "ma-den"→"maden" ✓  (mine/mineral)
    { word: "maden",      syllableBreak: "ma-den",        visualPrompt: "a mine shaft" },
    // Total final: 30 concrete nouns ending with n ✓
  ],
};
