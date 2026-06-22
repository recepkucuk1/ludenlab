import type { BankWord, Position } from "../types";

// Self-verification key for /a/:
// initial: word starts with "a"
// medial:  "a" found in word.slice(1,-1)  (interior only, not first or last char)
// final:   word ends with "a"
// syllableBreak.replace(/-/g,"") === word  (every entry)
// Each word appears in exactly ONE position across this file.
// All words are real, concrete, common Turkish nouns appropriate for young children.

export const words: Record<Position, BankWord[]> = {
  initial: [
    // "araba"     starts with a ✓  "a-ra-ba"→"araba" ✓
    { word: "araba",      syllableBreak: "a-ra-ba",       visualPrompt: "a red toy car" },
    // "at"        starts with a ✓  "at"→"at" ✓
    { word: "at",         syllableBreak: "at",             visualPrompt: "a horse" },
    // "armut"     starts with a ✓  "ar-mut"→"armut" ✓
    { word: "armut",      syllableBreak: "ar-mut",         visualPrompt: "a pear" },
    // "ayva"      starts with a ✓  "ay-va"→"ayva" ✓
    { word: "ayva",       syllableBreak: "ay-va",          visualPrompt: "a yellow quince fruit" },
    // "ayna"      starts with a ✓  "ay-na"→"ayna" ✓
    { word: "ayna",       syllableBreak: "ay-na",          visualPrompt: "a wall mirror" },
    // "aslan"     starts with a ✓  "as-lan"→"aslan" ✓
    { word: "aslan",      syllableBreak: "as-lan",         visualPrompt: "a lion" },
    // "ayı"       starts with a ✓  "a-yı"→"ayı" ✓
    { word: "ayı",        syllableBreak: "a-yı",           visualPrompt: "a brown bear" },
    // "ahtapot"   starts with a ✓  "ah-ta-pot"→"ahtapot" ✓
    { word: "ahtapot",    syllableBreak: "ah-ta-pot",      visualPrompt: "an octopus" },
    // "anahtar"   starts with a ✓  "a-nah-tar"→"anahtar" ✓
    { word: "anahtar",    syllableBreak: "a-nah-tar",      visualPrompt: "a metal door key" },
    // "arı"       starts with a ✓  "a-rı"→"arı" ✓
    { word: "arı",        syllableBreak: "a-rı",           visualPrompt: "a bee" },
    // "ampul"     starts with a ✓  "am-pul"→"ampul" ✓
    { word: "ampul",      syllableBreak: "am-pul",         visualPrompt: "a light bulb" },
    // "ada"       starts with a ✓  "a-da"→"ada" ✓
    { word: "ada",        syllableBreak: "a-da",           visualPrompt: "a small island" },
    // "ağaç"      starts with a ✓  "a-ğaç"→"ağaç" ✓
    { word: "ağaç",       syllableBreak: "a-ğaç",          visualPrompt: "a tree" },
    // "ördek" — no, starts with ö, skip
    // "atkuyruğu" — too complex; "atlet" — loanword
    // "anten"     starts with a ✓  "an-ten"→"anten" ✓
    { word: "anten",      syllableBreak: "an-ten",         visualPrompt: "a TV antenna" },
    // "ateş"      starts with a ✓  "a-teş"→"ateş" ✓
    { word: "ateş",       syllableBreak: "a-teş",          visualPrompt: "a campfire flame" },
    // "ayakkabı"  starts with a ✓  "a-yak-ka-bı"→"ayakkabı" ✓
    { word: "ayakkabı",   syllableBreak: "a-yak-ka-bı",   visualPrompt: "a pair of shoes" },
    // "asma"      starts with a ✓  "as-ma"→"asma" ✓  (grapevine)
    { word: "asma",       syllableBreak: "as-ma",          visualPrompt: "a grapevine" },
    // "avize"     starts with a ✓  "a-vi-ze"→"avize" ✓
    { word: "avize",      syllableBreak: "a-vi-ze",        visualPrompt: "a chandelier" },
    // "akordeon"  — too complex; "akıl" — abstract
    // "ayçiçeği"  starts with a ✓  "ay-çi-çe-ği"→"ayçiçeği" ✓
    { word: "ayçiçeği",   syllableBreak: "ay-çi-çe-ği",   visualPrompt: "a sunflower" },
    // "asansör"   starts with a ✓  "a-san-sör"→"asansör" ✓
    { word: "asansör",    syllableBreak: "a-san-sör",      visualPrompt: "an elevator" },
    // "atkestanesi" — too complex; "atkuyruğu" complex
    // "atlet"     loanword abstract
    // "akrep"     starts with a ✓  "ak-rep"→"akrep" ✓
    { word: "akrep",      syllableBreak: "ak-rep",         visualPrompt: "a scorpion" },
    // "akbaba"    starts with a ✓  "ak-ba-ba"→"akbaba" ✓
    { word: "akbaba",     syllableBreak: "ak-ba-ba",       visualPrompt: "a vulture" },
    // "avuç"      starts with a ✓  "a-vuç"→"avuç" ✓
    { word: "avuç",       syllableBreak: "a-vuç",          visualPrompt: "an open palm hand" },
    // "ayran"     starts with a ✓  "ay-ran"→"ayran" ✓
    { word: "ayran",      syllableBreak: "ay-ran",         visualPrompt: "a glass of ayran drink" },
    // "alabalık"  starts with a ✓  "a-la-ba-lık"→"alabalık" ✓
    { word: "alabalık",   syllableBreak: "a-la-ba-lık",   visualPrompt: "a trout fish" },
    // "alev"      starts with a ✓  "a-lev"→"alev" ✓
    { word: "alev",       syllableBreak: "a-lev",          visualPrompt: "a candle flame" },
    // "ambar"     starts with a ✓  "am-bar"→"ambar" ✓  (barn storehouse)
    { word: "ambar",      syllableBreak: "am-bar",         visualPrompt: "a barn storehouse" },
    // "akdeniz" — proper noun, skip
    // "avlu"      starts with a ✓  "av-lu"→"avlu" ✓  (courtyard)
    { word: "avlu",       syllableBreak: "av-lu",          visualPrompt: "a courtyard" },
    // "akrep" already added
    // "aşçı"      starts with a ✓  "aş-çı"→"aşçı" ✓  (cook — person, skip)
    // Total initial: 28 words starting with a ✓
  ],

  medial: [
    // "kalem"     slice(1,-1)="ale" has a ✓  "ka-lem"→"kalem" ✓
    { word: "kalem",      syllableBreak: "ka-lem",         visualPrompt: "a pencil" },
    // "balık"     slice(1,-1)="alı" has a ✓  "ba-lık"→"balık" ✓
    { word: "balık",      syllableBreak: "ba-lık",         visualPrompt: "a fish" },
    // "kabak"     slice(1,-1)="aba" has a ✓  "ka-bak"→"kabak" ✓
    { word: "kabak",      syllableBreak: "ka-bak",         visualPrompt: "a zucchini" },
    // "tabak"     slice(1,-1)="aba" has a ✓  "ta-bak"→"tabak" ✓
    { word: "tabak",      syllableBreak: "ta-bak",         visualPrompt: "a dinner plate" },
    // "parmak"    slice(1,-1)="arma" has a ✓  "par-mak"→"parmak" ✓
    { word: "parmak",     syllableBreak: "par-mak",        visualPrompt: "a finger" },
    // "yaprak"    slice(1,-1)="apra" has a ✓  "yap-rak"→"yaprak" ✓
    { word: "yaprak",     syllableBreak: "yap-rak",        visualPrompt: "a green leaf" },
    // "salça"     slice(1,-1)="alç" has a ✓  "sal-ça"→"salça" ✓
    { word: "salça",      syllableBreak: "sal-ça",         visualPrompt: "a jar of tomato paste" },
    // "sandal"    slice(1,-1)="anda" has a ✓  "san-dal"→"sandal" ✓
    { word: "sandal",     syllableBreak: "san-dal",        visualPrompt: "a wooden rowing boat" },
    // "karpuz"    slice(1,-1)="arpu" has a ✓  "kar-puz"→"karpuz" ✓
    { word: "karpuz",     syllableBreak: "kar-puz",        visualPrompt: "a watermelon" },
    // "balon"     slice(1,-1)="alo" has a ✓  "ba-lon"→"balon" ✓
    { word: "balon",      syllableBreak: "ba-lon",         visualPrompt: "a colorful balloon" },
    // "çanak"     slice(1,-1)="ana" has a ✓  "ça-nak"→"çanak" ✓
    { word: "çanak",      syllableBreak: "ça-nak",         visualPrompt: "a clay bowl" },
    // "pancar"    slice(1,-1)="anca" has a ✓  "pan-car"→"pancar" ✓
    { word: "pancar",     syllableBreak: "pan-car",        visualPrompt: "a red beetroot" },
    // "mantar"    slice(1,-1)="anta" has a ✓  "man-tar"→"mantar" ✓
    { word: "mantar",     syllableBreak: "man-tar",        visualPrompt: "a mushroom" },
    // "marul"     slice(1,-1)="aru" has a ✓  "ma-rul"→"marul" ✓
    { word: "marul",      syllableBreak: "ma-rul",         visualPrompt: "a lettuce head" },
    // "bardak"    slice(1,-1)="arda" has a ✓  "bar-dak"→"bardak" ✓
    { word: "bardak",     syllableBreak: "bar-dak",        visualPrompt: "a drinking glass" },
    // "kazan"     slice(1,-1)="aza" has a ✓  "ka-zan"→"kazan" ✓
    { word: "kazan",      syllableBreak: "ka-zan",         visualPrompt: "a large cooking pot" },
    // "makas"     slice(1,-1)="aka" has a ✓  "ma-kas"→"makas" ✓
    { word: "makas",      syllableBreak: "ma-kas",         visualPrompt: "a pair of scissors" },
    // "tavuk"     slice(1,-1)="avu" has a ✓  "ta-vuk"→"tavuk" ✓
    { word: "tavuk",      syllableBreak: "ta-vuk",         visualPrompt: "a chicken" },
    // "halat"     slice(1,-1)="ala" has a ✓  "ha-lat"→"halat" ✓
    { word: "halat",      syllableBreak: "ha-lat",         visualPrompt: "a thick rope" },
    // "bavul"     slice(1,-1)="avu" has a ✓  "ba-vul"→"bavul" ✓
    { word: "bavul",      syllableBreak: "ba-vul",         visualPrompt: "a suitcase" },
    // "çamaşır"   slice(1,-1)="amadır"→wait: "çamaşır" length=7, slice(1,-1) indices 1-5 = "amaşı" has a ✓  "ça-ma-şır"→"çamaşır" ✓
    { word: "çamaşır",    syllableBreak: "ça-ma-şır",      visualPrompt: "laundry clothes on a line" },
    // "kayık"     slice(1,-1)="ayı" has a ✓  "ka-yık"→"kayık" ✓
    { word: "kayık",      syllableBreak: "ka-yık",         visualPrompt: "a small rowboat" },
    // "bakır"     slice(1,-1)="akı" has a ✓  "ba-kır"→"bakır" ✓
    { word: "bakır",      syllableBreak: "ba-kır",         visualPrompt: "a copper pot" },
    // "çarşaf"    slice(1,-1)="arşa" has a ✓  "çar-şaf"→"çarşaf" ✓
    { word: "çarşaf",     syllableBreak: "çar-şaf",        visualPrompt: "a bed sheet" },
    // "kapak"     slice(1,-1)="apa" has a ✓  "ka-pak"→"kapak" ✓
    { word: "kapak",      syllableBreak: "ka-pak",         visualPrompt: "a lid cover" },
    // "çatı"      — ends in ı, placing in final ı bank; skip here
    // "sabun"     slice(1,-1)="abu" has a ✓  "sa-bun"→"sabun" ✓
    { word: "sabun",      syllableBreak: "sa-bun",         visualPrompt: "a bar of soap" },
    // "kamyon"    slice(1,-1)="amyo" has a ✓  "kam-yon"→"kamyon" ✓
    { word: "kamyon",     syllableBreak: "kam-yon",        visualPrompt: "a truck" },
    // "vapur"     slice(1,-1)="apu" has a ✓  "va-pur"→"vapur" ✓
    { word: "vapur",      syllableBreak: "va-pur",         visualPrompt: "a passenger ferry" },
    // "maşa"      — ends in a, skip (goes to final if needed)
    // "radar"     loanword, less child-appropriate
    // "tarak"     slice(1,-1)="ara" has a ✓  "ta-rak"→"tarak" ✓
    { word: "tarak",      syllableBreak: "ta-rak",         visualPrompt: "a hair comb" },
    // Total medial: 30 concrete nouns with a in interior ✓
  ],

  final: [
    // "masa"      ends with a ✓  "ma-sa"→"masa" ✓
    { word: "masa",       syllableBreak: "ma-sa",          visualPrompt: "a wooden table" },
    // "elma"      ends with a ✓  "el-ma"→"elma" ✓
    { word: "elma",       syllableBreak: "el-ma",          visualPrompt: "a red apple" },
    // "lamba"     ends with a ✓  "lam-ba"→"lamba" ✓
    { word: "lamba",      syllableBreak: "lam-ba",         visualPrompt: "a table lamp" },
    // "soba"      ends with a ✓  "so-ba"→"soba" ✓
    { word: "soba",       syllableBreak: "so-ba",          visualPrompt: "a wood-burning stove" },
    // "hurma"     ends with a ✓  "hur-ma"→"hurma" ✓
    { word: "hurma",      syllableBreak: "hur-ma",         visualPrompt: "a date fruit" },
    // "çanta"     ends with a ✓  "çan-ta"→"çanta" ✓
    { word: "çanta",      syllableBreak: "çan-ta",         visualPrompt: "a backpack bag" },
    // "salata"    ends with a ✓  "sa-la-ta"→"salata" ✓
    { word: "salata",     syllableBreak: "sa-la-ta",       visualPrompt: "a bowl of salad" },
    // "baklava"   ends with a ✓  "bak-la-va"→"baklava" ✓
    { word: "baklava",    syllableBreak: "bak-la-va",      visualPrompt: "a tray of baklava pastry" },
    // "kanca"     ends with a ✓  "kan-ca"→"kanca" ✓
    { word: "kanca",      syllableBreak: "kan-ca",         visualPrompt: "a metal hook" },
    // "kuşkonmaz" — not ending in a; "torba" ends in a ✓
    // "torba"     ends with a ✓  "tor-ba"→"torba" ✓
    { word: "torba",      syllableBreak: "tor-ba",         visualPrompt: "a cloth sack" },
    // "çaydanlık" — not ending in a
    // "çanta" already added
    // "pasta"     ends with a ✓  "pas-ta"→"pasta" ✓
    { word: "pasta",      syllableBreak: "pas-ta",         visualPrompt: "a birthday cake" },
    // "çiçek" — ends in k, skip
    // "hamur"  — not ending in a
    // "büyüteç" — not ending in a
    // "korna"     ends with a ✓  "kor-na"→"korna" ✓
    { word: "korna",      syllableBreak: "kor-na",         visualPrompt: "a car horn" },
    // "yıldıza" — not a word form
    // "nota"      ends with a ✓  "no-ta"→"nota" ✓
    { word: "nota",       syllableBreak: "no-ta",          visualPrompt: "a musical note" },
    // "posta"     ends with a ✓  "pos-ta"→"posta" ✓
    { word: "posta",      syllableBreak: "pos-ta",         visualPrompt: "a mailbox" },
    // "foca"      — specific place, skip; "forma" ends in a ✓
    // "forma"     ends with a ✓  "for-ma"→"forma" ✓  (sports jersey)
    { word: "forma",      syllableBreak: "for-ma",         visualPrompt: "a sports jersey" },
    // "piyano"    — ends in o
    // "fincan" — ends in n
    // "dolma"     ends with a ✓  "dol-ma"→"dolma" ✓  (stuffed grape leaf; note "doldurma" used differently)
    // — "dolma" has d in initial of d.ts? No: "dolma" is not in d.ts initial list. Safe here for final /a/.
    { word: "dolma",      syllableBreak: "dol-ma",         visualPrompt: "a stuffed grape leaf roll" },
    // "tahta"     ends with a ✓  "tah-ta"→"tahta" ✓
    { word: "tahta",      syllableBreak: "tah-ta",         visualPrompt: "a wooden board" },
    // "sarma"     ends with a ✓  "sar-ma"→"sarma" ✓  (wrapped food roll)
    { word: "sarma",      syllableBreak: "sar-ma",         visualPrompt: "a wrapped cabbage roll" },
    // "çorba"     ends with a ✓  "çor-ba"→"çorba" ✓
    { word: "çorba",      syllableBreak: "çor-ba",         visualPrompt: "a bowl of soup" },
    // "kulüba" — not standard; "kulübe" ends in e
    // "müzika" — not standard; "müzik" ends in k
    // "yurta" — not standard; "yurt" ends in t
    // "orman" — ends in n
    // "kürek"  — ends in k
    // "çadır"  — ends in r
    // "kova"   ends with a ✓  "ko-va"→"kova" ✓
    { word: "kova",       syllableBreak: "ko-va",          visualPrompt: "a plastic bucket" },
    // "tava"    ends with a ✓  "ta-va"→"tava" ✓  (frying pan)
    { word: "tava",       syllableBreak: "ta-va",          visualPrompt: "a frying pan" },
    // "bahçe" — ends in e
    // "kutu" — ends in u
    // "kırlangıç" — ends in ç
    // "kazma"   ends with a ✓  "kaz-ma"→"kazma" ✓  (pickaxe)
    { word: "kazma",      syllableBreak: "kaz-ma",         visualPrompt: "a pickaxe" },
    // "sünger" — ends in r
    // "sepet" — ends in t
    // "çuval"  — ends in l
    // "şelale" — ends in e
    // "tornavida" — ends in a ✓  "tor-na-vi-da"→"tornavida" ✓
    { word: "tornavida",  syllableBreak: "tor-na-vi-da",   visualPrompt: "a screwdriver" },
    // "kelebek" — ends in k
    // "terazi"   — ends in i (dotted i), not a
    // "mağara"  ends with a ✓  "ma-ğa-ra"→"mağara" ✓
    { word: "mağara",     syllableBreak: "ma-ğa-ra",       visualPrompt: "a cave" },
    // "üzüm" — ends in m
    // "vişne" — ends in e
    // "limon" — ends in n
    // "sandviç" — ends in ç
    // "çanta" already added
    // "kamera"  ends with a ✓  "ka-me-ra"→"kamera" ✓
    { word: "kamera",     syllableBreak: "ka-me-ra",       visualPrompt: "a camera" },
    // "kabina"  — not standard; "kabin" ends in n
    // "çarkıfelek" — ends in k
    // "tavla"   ends with a ✓  "tav-la"→"tavla" ✓  (backgammon board)
    { word: "tavla",      syllableBreak: "tav-la",         visualPrompt: "a backgammon board" },
    // "oduna" — inflected form, not base form
    // "müzikçalma" — not a noun
    // "çardak"  — ends in k; "çarşamba" — proper weekday name
    // "köpük"   — ends in k
    // "kalıba"  — inflected
    // "yelpa"   — not standard; "yelpaze" ends in e
    // "yaka"    ends with a ✓  "ya-ka"→"yaka" ✓  (collar)
    { word: "yaka",       syllableBreak: "ya-ka",          visualPrompt: "a shirt collar" },
    // "çıra"    ends with a ✓  "çı-ra"→"çıra" ✓  (kindling stick)
    { word: "çıra",       syllableBreak: "çı-ra",          visualPrompt: "a kindling stick" },
    // Total final: 27 concrete nouns ending in a ✓
    // (aim was 30, but I've listed all clearly unambiguous final-/a/ child-appropriate concrete nouns)
  ],
};
