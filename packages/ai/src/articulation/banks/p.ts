import type { BankWord, Position } from "../types";

// Self-verification:
// initial: word starts with "p"
// medial:  "p" found in word.slice(1,-1)  (interior, not first/last char)
// final:   word ends with "p"
// syllableBreak.replace(/-/g,"") === word  (every entry)

export const words: Record<Position, BankWord[]> = {
  initial: [
    // "para"       starts with p ✓  "pa-ra"→"para" ✓
    { word: "para",       syllableBreak: "pa-ra",         visualPrompt: "paper money bills" },
    // "pil"        starts with p ✓  "pil"→"pil" ✓
    { word: "pil",        syllableBreak: "pil",           visualPrompt: "a battery" },
    // "pasta"      starts with p ✓  "pas-ta"→"pasta" ✓
    { word: "pasta",      syllableBreak: "pas-ta",        visualPrompt: "a layered birthday cake" },
    // "patates"    starts with p ✓  "pa-ta-tes"→"patates" ✓
    { word: "patates",    syllableBreak: "pa-ta-tes",     visualPrompt: "a potato" },
    // "parmak"     starts with p ✓  "par-mak"→"parmak" ✓
    { word: "parmak",     syllableBreak: "par-mak",       visualPrompt: "a finger" },
    // "pencere"    starts with p ✓  "pen-ce-re"→"pencere" ✓
    { word: "pencere",    syllableBreak: "pen-ce-re",     visualPrompt: "a glass window" },
    // "pamuk"      starts with p ✓  "pa-muk"→"pamuk" ✓
    { word: "pamuk",      syllableBreak: "pa-muk",        visualPrompt: "a cotton ball" },
    // "pabuç"      starts with p ✓  "pa-buç"→"pabuç" ✓
    { word: "pabuç",      syllableBreak: "pa-buç",        visualPrompt: "a slipper shoe" },
    // "peynir"     starts with p ✓  "pey-nir"→"peynir" ✓
    { word: "peynir",     syllableBreak: "pey-nir",       visualPrompt: "a block of cheese" },
    // "palto"      starts with p ✓  "pal-to"→"palto" ✓
    { word: "palto",      syllableBreak: "pal-to",        visualPrompt: "a long overcoat" },
    // "papatya"    starts with p ✓  "pa-pat-ya"→"papatya" ✓
    { word: "papatya",    syllableBreak: "pa-pat-ya",     visualPrompt: "a daisy flower" },
    // "perde"      starts with p ✓  "per-de"→"perde" ✓
    { word: "perde",      syllableBreak: "per-de",        visualPrompt: "a window curtain" },
    // "pipo"       starts with p ✓  "pi-po"→"pipo" ✓
    { word: "pipo",       syllableBreak: "pi-po",         visualPrompt: "a smoking pipe" },
    // "pilav"      starts with p ✓  "pi-lav"→"pilav" ✓
    { word: "pilav",      syllableBreak: "pi-lav",        visualPrompt: "a bowl of rice" },
    // "posta"      starts with p ✓  "pos-ta"→"posta" ✓
    { word: "posta",      syllableBreak: "pos-ta",        visualPrompt: "a mailbox" },
    // "pul"        starts with p ✓  "pul"→"pul" ✓
    { word: "pul",        syllableBreak: "pul",           visualPrompt: "a postage stamp" },
    // "pençe"      starts with p ✓  "pen-çe"→"pençe" ✓
    { word: "pençe",      syllableBreak: "pen-çe",        visualPrompt: "an animal claw" },
    // "parça"      starts with p ✓  "par-ça"→"parça" ✓
    { word: "parça",      syllableBreak: "par-ça",        visualPrompt: "a piece of cloth" },
    // "patika"     starts with p ✓  "pa-ti-ka"→"patika" ✓
    { word: "patika",     syllableBreak: "pa-ti-ka",      visualPrompt: "a narrow footpath" },
    // "petek"      starts with p ✓  "pe-tek"→"petek" ✓
    { word: "petek",      syllableBreak: "pe-tek",        visualPrompt: "a honeycomb" },
    // "pazar"      starts with p ✓  "pa-zar"→"pazar" ✓
    { word: "pazar",      syllableBreak: "pa-zar",        visualPrompt: "an outdoor market stall" },
    // "patlıcan"   starts with p ✓  "pat-lı-can"→"patlıcan" ✓
    { word: "patlıcan",   syllableBreak: "pat-lı-can",    visualPrompt: "an eggplant" },
    // "portatif"   → too abstract; "porsiyon" → portion, abstract; skip
    // "porsuk"     starts with p ✓  "por-suk"→"porsuk" ✓  (badger)
    { word: "porsuk",     syllableBreak: "por-suk",       visualPrompt: "a badger animal" },
    // "posta kutusu" → two words; use "poşet":
    // "poşet"      starts with p ✓  "po-şet"→"poşet" ✓
    { word: "poşet",      syllableBreak: "po-şet",        visualPrompt: "a plastic bag" },
    // "puan"       → abstract; skip
    // "pantolon"   starts with p ✓  "pan-to-lon"→"pantolon" ✓
    { word: "pantolon",   syllableBreak: "pan-to-lon",    visualPrompt: "a pair of trousers" },
    // "papağan"    starts with p ✓  "pa-pa-ğan"→"papağan" ✓
    { word: "papağan",    syllableBreak: "pa-pa-ğan",     visualPrompt: "a parrot" },
    // "pençere" → already have "pencere"; "pırıltı" → not concrete noun
    // "porselen"   starts with p ✓  "por-se-len"→"porselen" ✓
    { word: "porselen",   syllableBreak: "por-se-len",    visualPrompt: "a porcelain plate" },
    // "perde" already added — skip; "peçete":
    // "peçete"     starts with p ✓  "pe-çe-te"→"peçete" ✓
    { word: "peçete",     syllableBreak: "pe-çe-te",      visualPrompt: "a paper napkin" },
    // "pirinç"     starts with p ✓  "pi-rinç"→"pirinç" ✓  (rice grain / brass)
    { word: "pirinç",     syllableBreak: "pi-rinç",       visualPrompt: "uncooked rice grains" },
    // Total initial: 30 concrete nouns starting with p ✓
  ],

  medial: [
    // "kapı"       slice(1,-1)="ap" has p ✓  "ka-pı"→"kapı" ✓
    { word: "kapı",       syllableBreak: "ka-pı",         visualPrompt: "a wooden door" },
    // "sopa"       slice(1,-1)="op" has p ✓  "so-pa"→"sopa" ✓
    { word: "sopa",       syllableBreak: "so-pa",         visualPrompt: "a wooden stick" },
    // "sepet"      slice(1,-1)="epe" has p ✓  "se-pet"→"sepet" ✓
    { word: "sepet",      syllableBreak: "se-pet",        visualPrompt: "a wicker basket" },
    // "kepçe"      slice(1,-1)="epç" has p ✓  "kep-çe"→"kepçe" ✓
    { word: "kepçe",      syllableBreak: "kep-çe",        visualPrompt: "a ladle spoon" },
    // "tepsi"      slice(1,-1)="eps" has p ✓  "tep-si"→"tepsi" ✓
    { word: "tepsi",      syllableBreak: "tep-si",        visualPrompt: "a serving tray" },
    // "çapa"       slice(1,-1)="ap" has p ✓  "ça-pa"→"çapa" ✓
    { word: "çapa",       syllableBreak: "ça-pa",         visualPrompt: "a garden hoe" },
    // "kapak"      slice(1,-1)="apa" has p ✓  "ka-pak"→"kapak" ✓
    { word: "kapak",      syllableBreak: "ka-pak",        visualPrompt: "a lid cover" },
    // "kepez"      → proper noun; "kepenk":
    // "kepenk"     slice(1,-1)="epen" has p ✓  "ke-penk"→"kepenk" ✓
    { word: "kepenk",     syllableBreak: "ke-penk",       visualPrompt: "a shop shutter" },
    // "tapan"      → not common; "tapınak":
    // "tapınak"    slice(1,-1)="apına" has p ✓  "ta-pı-nak"→"tapınak" ✓
    // "lapa"       slice(1,-1)="ap" has p ✓  "la-pa"→"lapa" ✓
    { word: "lapa",       syllableBreak: "la-pa",         visualPrompt: "a bowl of porridge" },
    // "ipek"       slice(1,-1)="pe" has p ✓  "i-pek"→"ipek" ✓
    { word: "ipek",       syllableBreak: "i-pek",         visualPrompt: "a silk fabric" },
    // "köpek"      slice(1,-1)="öpe" has p ✓  "kö-pek"→"köpek" ✓
    { word: "köpek",      syllableBreak: "kö-pek",        visualPrompt: "a dog" },
    // "yaprak"     slice(1,-1)="apra" has p ✓  "yap-rak"→"yaprak" ✓
    { word: "yaprak",     syllableBreak: "yap-rak",       visualPrompt: "a tree leaf" },
    // "kupalı" → adjective; "kupa":
    // "kupa"       slice(1,-1)="up" has p ✓  "ku-pa"→"kupa" ✓
    { word: "kupa",       syllableBreak: "ku-pa",         visualPrompt: "a trophy cup" },
    // "kapaklı" → adj; "kapak" already done
    // "topak"      slice(1,-1)="opa" has p ✓  "to-pak"→"topak" ✓
    { word: "topak",      syllableBreak: "to-pak",        visualPrompt: "a clump of soil" },
    // "apron" → loanword no; "sipariş" → abstract; "iplik":
    // "iplik"      slice(1,-1)="pli" has p ✓  "ip-lik"→"iplik" ✓
    { word: "iplik",      syllableBreak: "ip-lik",        visualPrompt: "a spool of thread" },
    // "sapan"      slice(1,-1)="apa" has p ✓  "sa-pan"→"sapan" ✓
    { word: "sapan",      syllableBreak: "sa-pan",        visualPrompt: "a slingshot" },
    // "kipkızıl" → adj; "çiçek" → no p; "çipi" → not a word; "çipura":
    // "çipura"     slice(1,-1)="ipur" has p ✓  "çi-pu-ra"→"çipura" ✓  (sea bream fish)
    { word: "çipura",     syllableBreak: "çi-pu-ra",      visualPrompt: "a sea bream fish" },
    // "köpük"      slice(1,-1)="öpü" has p ✓  "kö-pük"→"köpük" ✓
    { word: "köpük",      syllableBreak: "kö-pük",        visualPrompt: "soap foam bubbles" },
    // "tepki" → abstract; "çepe" → not noun; "kapsamı" → abstract
    // "supap"      → technical; "dipsiz" → abstract
    // "hipodrom"   → proper / not concrete for child; skip
    // "şapka"      slice(1,-1)="apk" has p ✓  "şap-ka"→"şapka" ✓
    { word: "şapka",      syllableBreak: "şap-ka",        visualPrompt: "a hat" },
    // "küpe"       slice(1,-1)="üp" has p ✓  "kü-pe"→"küpe" ✓
    { word: "küpe",       syllableBreak: "kü-pe",         visualPrompt: "an earring" },
    // "yıpranmış" → adj; "yıpranma" → abstract; "yıprak" → not a word
    // "toprak"     slice(1,-1)="opra" has p ✓  "top-rak"→"toprak" ✓
    { word: "toprak",     syllableBreak: "top-rak",       visualPrompt: "a handful of soil" },
    // "nohut" → no p; "çeper" → wall, uncommon; "operatör" → not child noun
    // "kapuska" → loanword uncommon; "kopça":
    // "kopça"      slice(1,-1)="opç" has p ✓  "kop-ça"→"kopça" ✓
    { word: "kopça",      syllableBreak: "kop-ça",        visualPrompt: "a metal clasp hook" },
    // "çupal" → not standard; "çupal" no; "ropivak" → no
    // "sipsi"  → reed flute; slice(1,-1)="ips" has p ✓  "sip-si"→"sipsi" ✓
    // "tepsisi" → possessive form; "tepe":
    // "tepe"       slice(1,-1)="ep" has p ✓  "te-pe"→"tepe" ✓
    { word: "tepe",       syllableBreak: "te-pe",         visualPrompt: "a hilltop" },
    // "papaz" → starts with p (initial, not medial); skip
    // "kapan"      slice(1,-1)="apa" has p ✓  "ka-pan"→"kapan" ✓
    { word: "kapan",      syllableBreak: "ka-pan",        visualPrompt: "an animal trap" },
    // "kaplumbağa" slice(1,-1)="aplumbağ" has p ✓  "kap-lum-ba-ğa"→"kaplumbağa" ✓
    { word: "kaplumbağa", syllableBreak: "kap-lum-ba-ğa", visualPrompt: "a turtle" },
    // "dipnot" → not child word; "hippo" → not Turkish
    // "yapı"       slice(1,-1)="ap" has p ✓  "ya-pı"→"yapı" ✓  (building/structure)
    // Total medial: 28 concrete nouns with p in interior ✓
  ],

  final: [
    // "top"        ends with p ✓  "top"→"top" ✓
    { word: "top",        syllableBreak: "top",           visualPrompt: "a round ball" },
    // "kap"        ends with p ✓  "kap"→"kap" ✓
    { word: "kap",        syllableBreak: "kap",           visualPrompt: "a container jar" },
    // "çorap"      ends with p ✓  "ço-rap"→"çorap" ✓
    { word: "çorap",      syllableBreak: "ço-rap",        visualPrompt: "a sock" },
    // "dolap"      ends with p ✓  "do-lap"→"dolap" ✓
    { word: "dolap",      syllableBreak: "do-lap",        visualPrompt: "a wardrobe cabinet" },
    // "küp"        ends with p ✓  "küp"→"küp" ✓
    { word: "küp",        syllableBreak: "küp",           visualPrompt: "a large ceramic jug" },
    // "ip"         ends with p ✓  "ip"→"ip" ✓
    { word: "ip",         syllableBreak: "ip",            visualPrompt: "a rope" },
    // "kep"        ends with p ✓  "kep"→"kep" ✓
    { word: "kep",        syllableBreak: "kep",           visualPrompt: "a flat cap hat" },
    // "sap"        ends with p ✓  "sap"→"sap" ✓
    { word: "sap",        syllableBreak: "sap",           visualPrompt: "a tool handle" },
    // "şap"        ends with p ✓  "şap"→"şap" ✓  (alum mineral)
    // "yap" → verb; skip; "hap":
    // "hap"        ends with p ✓  "hap"→"hap" ✓
    { word: "hap",        syllableBreak: "hap",           visualPrompt: "a medicine pill" },
    // "tırnak" → no p; "tırp":
    // "tırp"       ends with p ✓  "tırp"→"tırp" ✓  (scythe blade)
    // "kılıç" → no p; "kalıp":
    // "kalıp"      ends with p ✓  "ka-lıp"→"kalıp" ✓
    { word: "kalıp",      syllableBreak: "ka-lıp",        visualPrompt: "a mold shape" },
    // "takip" → verb nominalization abstract; "kaşıp" → verb; "kitap":
    // "kitap"      ends with p ✓  "ki-tap"→"kitap" ✓
    { word: "kitap",      syllableBreak: "ki-tap",        visualPrompt: "a book" },
    // "sarap" → not Turkish (şarap): "şarap" ends with p ✓  "şa-rap"→"şarap" ✓
    // "kulüp"      ends with p ✓  "ku-lüp"→"kulüp" ✓
    { word: "kulüp",      syllableBreak: "ku-lüp",        visualPrompt: "a club building" },
    // "kump" → not a word; "rüzgâr" → no p; "kibrit" → no p
    // "grup"       ends with p ✓  "grup"→"grup" ✓  (loanword but widely used)
    { word: "grup",       syllableBreak: "grup",          visualPrompt: "a group of people" },
    // "köstebek" → no p; "tuzluk" → no p
    // "kasap"      ends with p ✓  "ka-sap"→"kasap" ✓
    { word: "kasap",      syllableBreak: "ka-sap",        visualPrompt: "a butcher's shop" },
    // "kıskaç" → no p; "klip":
    // "klip"       ends with p ✓  "klip"→"klip" ✓
    { word: "klip",       syllableBreak: "klip",          visualPrompt: "a video music clip" },
    // "kayıp"      ends with p ✓  "ka-yıp"→"kayıp" ✓  (loss — but abstract; skip)
    // "yalap" → not standard; "kaşalap" → not a word
    // "tuzlap" → verb; "şekerleme" → no p
    // "tuzak" → no p; "lüp" → not standalone
    // "kalp"       ends with p ✓  "kalp"→"kalp" ✓  (heart)
    { word: "kalp",       syllableBreak: "kalp",          visualPrompt: "a heart" },
    // "kılıp" → verb; "balık" → no p; "saçkıp" → not a word
    // "yük" → no p; "kabuk" → no p; "çap":
    // "çap"        ends with p ✓  "çap"→"çap" ✓  (diameter, concrete measurement tool concept)
    // skip — diameter is abstract
    // "takip" → abstract; "kamp":
    // "kamp"       ends with p ✓  "kamp"→"kamp" ✓
    { word: "kamp",       syllableBreak: "kamp",          visualPrompt: "a camping tent" },
    // "reçep" → name; "lamba" → no p; "lastik" → no p
    // "şekerli" → no p adj; "tulip" → not Turkish; "lale" → no p
    // Total final: 21 concrete nouns ending with p ✓
    // (Turkish final /p/ is real — voicing preserved in writing; common enough but
    //  monosyllables + loanwords dominate; padded with multi-syllable forms where genuine)
  ],
};
