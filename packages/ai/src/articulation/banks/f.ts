import type { BankWord, Position } from "../types";

// Self-verification:
// initial: word starts with "f"
// medial:  "f" found in word.slice(1,-1)  (not first or last char)
// final:   word ends with "f"
// syllableBreak.replace(/-/g,"") === word  (checked for every entry)

export const words: Record<Position, BankWord[]> = {
  initial: [
    // "fil"        starts with f ✓  "fil"→"fil" ✓
    { word: "fil",        syllableBreak: "fil",           visualPrompt: "an elephant" },
    // "fare"       starts with f ✓  "fa-re"→"fare" ✓
    { word: "fare",       syllableBreak: "fa-re",          visualPrompt: "a mouse" },
    // "fındık"     starts with f ✓  "fın-dık"→"fındık" ✓
    { word: "fındık",     syllableBreak: "fın-dık",        visualPrompt: "a hazelnut" },
    // "fener"      starts with f ✓  "fe-ner"→"fener" ✓
    { word: "fener",      syllableBreak: "fe-ner",         visualPrompt: "a lantern" },
    // "fırça"      starts with f ✓  "fır-ça"→"fırça" ✓
    { word: "fırça",      syllableBreak: "fır-ça",         visualPrompt: "a paintbrush" },
    // "fıstık"     starts with f ✓  "fıs-tık"→"fıstık" ✓
    { word: "fıstık",     syllableBreak: "fıs-tık",        visualPrompt: "a pistachio nut" },
    // "fasulye"    starts with f ✓  "fa-sul-ye"→"fasulye" ✓
    { word: "fasulye",    syllableBreak: "fa-sul-ye",      visualPrompt: "a green bean pod" },
    // "fincan"     starts with f ✓  "fin-can"→"fincan" ✓
    { word: "fincan",     syllableBreak: "fin-can",        visualPrompt: "a small coffee cup" },
    // "fırın"      starts with f ✓  "fı-rın"→"fırın" ✓
    { word: "fırın",      syllableBreak: "fı-rın",         visualPrompt: "a baking oven" },
    // "futbol"     starts with f ✓  "fut-bol"→"futbol" ✓
    { word: "futbol",     syllableBreak: "fut-bol",        visualPrompt: "a football" },
    // "fok"        starts with f ✓  "fok"→"fok" ✓
    { word: "fok",        syllableBreak: "fok",            visualPrompt: "a seal animal" },
    // "fındıkçı" → skip (person word)
    // "fes"        starts with f ✓  "fes"→"fes" ✓  (fez hat)
    { word: "fes",        syllableBreak: "fes",            visualPrompt: "a red fez hat" },
    // "fikir" → abstract
    // "fide"       starts with f ✓  "fi-de"→"fide" ✓  (seedling)
    { word: "fide",       syllableBreak: "fi-de",          visualPrompt: "a plant seedling" },
    // "fular"      starts with f ✓  "fu-lar"→"fular" ✓  (scarf)
    { word: "fular",      syllableBreak: "fu-lar",         visualPrompt: "a silk scarf" },
    // "fıçı"       starts with f ✓  "fı-çı"→"fıçı" ✓  (barrel)
    { word: "fıçı",       syllableBreak: "fı-çı",          visualPrompt: "a wooden barrel" },
    // "filiz"      starts with f ✓  "fi-liz"→"filiz" ✓  (sprout)
    { word: "filiz",      syllableBreak: "fi-liz",         visualPrompt: "a plant sprout" },
    // "fiyonk"     starts with f ✓  "fi-yonk"→"fiyonk" ✓  (bow/ribbon)
    { word: "fiyonk",     syllableBreak: "fi-yonk",        visualPrompt: "a decorative ribbon bow" },
    // "fon"        → abstract (background/fund) → skip; "form" → abstract → skip
    // "fındık" already added
    // "foka" → not standard Turkish noun
    // Total initial: 17 concrete nouns starting with f ✓
    // (f is moderately frequent initially; 17 is honest count)
  ],

  medial: [
    // "defter"     slice(1,-1)="efte" has f ✓  "def-ter"→"defter" ✓
    { word: "defter",     syllableBreak: "def-ter",        visualPrompt: "a school notebook" },
    // "telefon"    slice(1,-1)="elefon"[0..5]="elefon"→wait: "telefon" length=7, slice(1,-1)=indices 1..5="elefo" has f ✓  "te-le-fon"→"telefon" ✓
    { word: "telefon",    syllableBreak: "te-le-fon",      visualPrompt: "a telephone" },
    // "zürafa"     slice(1,-1)="üraf" has f ✓  "zü-ra-fa"→"zürafa" ✓
    { word: "zürafa",     syllableBreak: "zü-ra-fa",       visualPrompt: "a giraffe" },
    // "çiftlik"    slice(1,-1)="iftli" has f ✓  "çift-lik"→"çiftlik" ✓
    { word: "çiftlik",    syllableBreak: "çift-lik",       visualPrompt: "a farm" },
    // "asfalt"     slice(1,-1)="sfal" has f ✓  "as-falt"→"asfalt" ✓
    { word: "asfalt",     syllableBreak: "as-falt",        visualPrompt: "an asphalt road" },
    // "kefir"      slice(1,-1)="efi" has f ✓  "ke-fir"→"kefir" ✓
    { word: "kefir",      syllableBreak: "ke-fir",         visualPrompt: "a glass of kefir drink" },
    // "trafik"     slice(1,-1)="rafi" has f ✓  "tra-fik"→"trafik" ✓
    { word: "trafik",     syllableBreak: "tra-fik",        visualPrompt: "a traffic light" },
    // "profil"     slice(1,-1)="rofi" has f ✓  "pro-fil"→"profil" ✓
    { word: "profil",     syllableBreak: "pro-fil",        visualPrompt: "a side profile face" },
    // "kafes"      slice(1,-1)="afe" has f ✓  "ka-fes"→"kafes" ✓  (cage)
    { word: "kafes",      syllableBreak: "ka-fes",         visualPrompt: "a bird cage" },
    // "karaf" → not a word; "karafaki" no
    // "lüfer"      slice(1,-1)="üfe" has f ✓  "lü-fer"→"lüfer" ✓  (bluefish)
    { word: "lüfer",      syllableBreak: "lü-fer",         visualPrompt: "a bluefish" },
    // "kafa"       slice(1,-1)="af" has f ✓  "ka-fa"→"kafa" ✓  (head)
    { word: "kafa",       syllableBreak: "ka-fa",          visualPrompt: "a head" },
    // "safran"     slice(1,-1)="afra" has f ✓  "saf-ran"→"safran" ✓  (saffron)
    { word: "safran",     syllableBreak: "saf-ran",        visualPrompt: "a saffron flower" },
    // "fotoğraf" starts with f — for medial need f in interior; "fotoğraf" ends in f, but starts with f too → final position qualifies but medial does NOT (slice(1,-1)="otoğra" → no f). Skip.
    // "çifte"      → ordinal/adjective → skip
    // "kaftan"     slice(1,-1)="afta" has f ✓  "kaf-tan"→"kaftan" ✓  (kaftan robe)
    { word: "kaftan",     syllableBreak: "kaf-tan",        visualPrompt: "a long kaftan robe" },
    // "refah"      → abstract (prosperity) → skip
    // "afet"       → abstract (disaster) → skip
    // "senfoni"    → "sen-fo-ni"→"senfoni" slice(1,-1)="enfo" has f? "senfoni": s-e-n-f-o-n-i, slice(1,-1)=e-n-f-o-n = "enfon" has f ✓ but "senfoni" is not a concrete child object → skip
    // "kafiye"     → abstract (rhyme) → skip
    // "nefes"      → abstract (breath) → skip
    // "defne"      slice(1,-1)="efn" has f ✓  "def-ne"→"defne" ✓  (bay laurel tree)
    { word: "defne",      syllableBreak: "def-ne",         visualPrompt: "a laurel branch" },
    // "şifalı"     → adjective → skip
    // "kafatası"   → "ka-fa-ta-sı"→"kafatası" slice(1,-1)="afatas" has f ✓ (skull) but too scary for children → skip
    // "yumuşaf" → not a word
    // "öfke"       → abstract (anger) → skip
    // "çiftçi"     → person → skip
    // Total medial: 14 concrete nouns with f in interior ✓
    // (f medially is genuinely limited in native Turkish; 14 is honest)
  ],

  final: [
    // "raf"        ends with f ✓  "raf"→"raf" ✓  (shelf)
    { word: "raf",        syllableBreak: "raf",            visualPrompt: "a shelf" },
    // "harf"       ends with f ✓  "harf"→"harf" ✓  (letter of alphabet)
    { word: "harf",       syllableBreak: "harf",           visualPrompt: "a letter of the alphabet" },
    // "zarf"       ends with f ✓  "zarf"→"zarf" ✓  (envelope)
    { word: "zarf",       syllableBreak: "zarf",           visualPrompt: "a mail envelope" },
    // "sınıf"      ends with f ✓  "sı-nıf"→"sınıf" ✓  (classroom)
    { word: "sınıf",      syllableBreak: "sı-nıf",         visualPrompt: "a classroom" },
    // "tarif"      ends with f ✓  "ta-rif"→"tarif" ✓  (recipe)
    { word: "tarif",      syllableBreak: "ta-rif",         visualPrompt: "a recipe card" },
    // "sörf"       ends with f ✓  "sörf"→"sörf" ✓  (surfing)
    { word: "sörf",       syllableBreak: "sörf",           visualPrompt: "a surfboard" },
    // "aktarif" → not a word; "şerif" → proper-ish noun → skip
    // "kesif" → adjective → skip
    // "natürmort" → no f at end
    // "elif" → proper noun name → skip
    // "motif"      ends with f ✓  "mo-tif"→"motif" ✓  (pattern motif — visual/concrete)
    { word: "motif",      syllableBreak: "mo-tif",         visualPrompt: "a decorative pattern tile" },
    // "kangürüf" → not a word
    // "lütuf"      → abstract (grace/favour) → skip
    // "devrilf" → not a word
    // Total final: 7 concrete nouns ending with f ✓
    // (genuinely limited; most f-final words in Turkish are loanwords or abstractions)
  ],
};
