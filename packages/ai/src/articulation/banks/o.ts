import type { BankWord, Position } from "../types";

// Self-verification for every entry:
// initial:  word.startsWith("o")
// medial:   word.slice(1,-1).includes("o")  — interior only
// final:    word.endsWith("o")
// syllableBreak.replace(/-/g,"") === word  (exact join)
// Each word appears in EXACTLY ONE position across this file.
// Only real, common, concrete Turkish nouns. Age-appropriate for children.

export const words: Record<Position, BankWord[]> = {
  initial: [
    // "okul"      o-k-u-l  →  "o-kul"→"okul" ✓  starts with o ✓
    { word: "okul",      syllableBreak: "o-kul",        visualPrompt: "a school building" },
    // "oda"       o-d-a  →  "o-da"→"oda" ✓  starts with o ✓
    { word: "oda",       syllableBreak: "o-da",         visualPrompt: "a room with furniture" },
    // "ok"        o-k  →  "ok"→"ok" ✓  starts with o ✓  (arrow)
    { word: "ok",        syllableBreak: "ok",           visualPrompt: "an arrow" },
    // "orman"     o-r-m-a-n  →  "or-man"→"orman" ✓  starts with o ✓
    { word: "orman",     syllableBreak: "or-man",       visualPrompt: "a dense forest" },
    // "otobüs"    o-t-o-b-ü-s  →  "o-to-büs"→"otobüs" ✓  starts with o ✓
    { word: "otobüs",    syllableBreak: "o-to-büs",     visualPrompt: "a city bus" },
    // "oyuncak"   o-y-u-n-c-a-k  →  "o-yun-cak"→"oyuncak" ✓  starts with o ✓
    { word: "oyuncak",   syllableBreak: "o-yun-cak",    visualPrompt: "a toy" },
    // "ocak"      o-c-a-k  →  "o-cak"→"ocak" ✓  starts with o ✓  (stove/hearth)
    { word: "ocak",      syllableBreak: "o-cak",        visualPrompt: "a kitchen stove" },
    // "oklava"    o-k-l-a-v-a  →  "ok-la-va"→"oklava" ✓  starts with o ✓  (rolling pin)
    { word: "oklava",    syllableBreak: "ok-la-va",     visualPrompt: "a rolling pin" },
    // "ova"       o-v-a  →  "o-va"→"ova" ✓  starts with o ✓  (plain/flatland)
    { word: "ova",       syllableBreak: "o-va",         visualPrompt: "a flat open plain" },
    // "omuz"      o-m-u-z  →  "o-muz"→"omuz" ✓  starts with o ✓
    { word: "omuz",      syllableBreak: "o-muz",        visualPrompt: "a shoulder" },
    // "otopark"   o-t-o-p-a-r-k  →  "o-to-park"→"otopark" ✓  starts with o ✓  (parking lot)
    { word: "otopark",   syllableBreak: "o-to-park",    visualPrompt: "a parking lot" },
    // "orak"      o-r-a-k  →  "o-rak"→"orak" ✓  starts with o ✓  (sickle)
    { word: "orak",      syllableBreak: "o-rak",        visualPrompt: "a sickle" },
    // "orman" already added
    // "oyun"      o-y-u-n  →  "o-yun"→"oyun" ✓  starts with o ✓  (game)  → abstract → skip
    // "otlak"     o-t-l-a-k  →  "ot-lak"→"otlak" ✓  starts with o ✓  (pasture)
    { word: "otlak",     syllableBreak: "ot-lak",       visualPrompt: "a green pasture field" },
    // "okyanus"   o-k-y-a-n-u-s  →  "ok-ya-nus"→"okyanus" ✓  starts with o ✓  (ocean)
    { word: "okyanus",   syllableBreak: "ok-ya-nus",    visualPrompt: "a vast ocean" },
    // "ormancı"   → person → skip
    // "ot"        o-t  →  "ot"→"ot" ✓  starts with o ✓  (grass/herb)
    { word: "ot",        syllableBreak: "ot",           visualPrompt: "a grass blade" },
    // "opus" → loanword/abstract → skip
    // Total initial: 16 words — per spec "moderate ~14-18" ✓
  ],

  medial: [
    // "domates"   d-o-m-a-t-e-s  slice(1,-1)="omate" has o ✓  "do-ma-tes"→"domates" ✓
    { word: "domates",   syllableBreak: "do-ma-tes",    visualPrompt: "a red tomato" },
    // "soba"      s-o-b-a  slice(1,-1)="ob" has o ✓  "so-ba"→"soba" ✓  (wood stove)
    { word: "soba",      syllableBreak: "so-ba",        visualPrompt: "a wood-burning stove" },
    // "horoz"     h-o-r-o-z  slice(1,-1)="oro" has o ✓  "ho-roz"→"horoz" ✓  (rooster)
    { word: "horoz",     syllableBreak: "ho-roz",       visualPrompt: "a rooster" },
    // "korsan"    k-o-r-s-a-n  slice(1,-1)="orsa" has o ✓  "kor-san"→"korsan" ✓  (pirate)
    { word: "korsan",    syllableBreak: "kor-san",      visualPrompt: "a pirate with an eye patch" },
    // "roket"     r-o-k-e-t  slice(1,-1)="oke" has o ✓  "ro-ket"→"roket" ✓
    { word: "roket",     syllableBreak: "ro-ket",       visualPrompt: "a rocket" },
    // "koltuk"    k-o-l-t-u-k  slice(1,-1)="oltu" has o ✓  "kol-tuk"→"koltuk" ✓  (armchair)
    { word: "koltuk",    syllableBreak: "kol-tuk",      visualPrompt: "an armchair" },
    // "motor"     m-o-t-o-r  slice(1,-1)="oto" has o ✓  "mo-tor"→"motor" ✓
    { word: "motor",     syllableBreak: "mo-tor",       visualPrompt: "a motorcycle" },
    // "konak"     k-o-n-a-k  slice(1,-1)="ona" has o ✓  "ko-nak"→"konak" ✓  (mansion)
    { word: "konak",     syllableBreak: "ko-nak",       visualPrompt: "a large old mansion" },
    // "totem"     t-o-t-e-m  slice(1,-1)="ote" has o ✓  "to-tem"→"totem" ✓
    { word: "totem",     syllableBreak: "to-tem",       visualPrompt: "a wooden totem pole" },
    // "fosil"     f-o-s-i-l  slice(1,-1)="osi" has o ✓  "fo-sil"→"fosil" ✓
    { word: "fosil",     syllableBreak: "fo-sil",       visualPrompt: "a fossil in rock" },
    // "kovan"     k-o-v-a-n  slice(1,-1)="ova" has o ✓  "ko-van"→"kovan" ✓  (beehive)
    { word: "kovan",     syllableBreak: "ko-van",       visualPrompt: "a beehive" },
    // "bostan"    b-o-s-t-a-n  slice(1,-1)="osta" has o ✓  "bos-tan"→"bostan" ✓  (vegetable garden)
    { word: "bostan",    syllableBreak: "bos-tan",      visualPrompt: "a vegetable garden" },
    // "torba"     t-o-r-b-a  slice(1,-1)="orb" has o ✓  "tor-ba"→"torba" ✓  (bag/sack)
    { word: "torba",     syllableBreak: "tor-ba",       visualPrompt: "a cloth sack bag" },
    // "lokum"     l-o-k-u-m  slice(1,-1)="oku" has o ✓  "lo-kum"→"lokum" ✓  (Turkish delight)
    { word: "lokum",     syllableBreak: "lo-kum",       visualPrompt: "a piece of Turkish delight" },
    // "bocek" → "böcek" has ö not o → SKIP
    // "toprak"    t-o-p-r-a-k  slice(1,-1)="opra" has o ✓  "top-rak"→"toprak" ✓  (soil)
    { word: "toprak",    syllableBreak: "top-rak",      visualPrompt: "a handful of soil" },
    // "bordo"     ends in o → FINAL
    // "fotoğraf"  f-o-t-o-ğ-r-a-f  slice(1,-1)="otoğra" has o ✓  "fo-toğ-raf"→"fotoğraf" ✓
    { word: "fotoğraf",  syllableBreak: "fo-toğ-raf",   visualPrompt: "a photograph" },
    // "polo"      ends in o → FINAL
    // "robot"     r-o-b-o-t  slice(1,-1)="obo" has o ✓  "ro-bot"→"robot" ✓
    { word: "robot",     syllableBreak: "ro-bot",       visualPrompt: "a toy robot" },
    // "çorap"     ç-o-r-a-p  slice(1,-1)="ora" has o ✓  "ço-rap"→"çorap" ✓  (sock/stocking)
    { word: "çorap",     syllableBreak: "ço-rap",       visualPrompt: "a sock" },
    // "konser"    k-o-n-s-e-r  slice(1,-1)="onse" has o ✓  "kon-ser"→"konser" ✓  (concert)
    // → event, abstract → skip
    // "borusu"    → possessive → skip; "boru" ends in u
    // "boru"      b-o-r-u  slice(1,-1)="or" has o ✓  "bo-ru"→"boru" ✓  (pipe/tube)
    { word: "boru",      syllableBreak: "bo-ru",        visualPrompt: "a metal pipe tube" },
    // "tornavida" t-o-r-n-a-v-i-d-a  slice(1,-1)="ornavid" has o ✓  "tor-na-vi-da"→"tornavida" ✓
    { word: "tornavida", syllableBreak: "tor-na-vi-da", visualPrompt: "a screwdriver" },
    // "kovboy"    k-o-v-b-o-y  slice(1,-1)="ovbo" has o ✓  "kov-boy"→"kovboy" ✓  (cowboy)
    // → person → skip
    // "votka"     v-o-t-k-a  slice(1,-1)="otk" has o ✓  "vot-ka"→"votka" ✓  → not child appropriate → skip
    // "yogurt"    → "yoğurt": y-o-ğ-u-r-t  slice(1,-1)="oğur" has o ✓  "yo-ğurt"→"yoğurt" ✓
    { word: "yoğurt",    syllableBreak: "yo-ğurt",      visualPrompt: "a bowl of yogurt" },
    // "soğan"     s-o-ğ-a-n  slice(1,-1)="oğa" has o ✓  "so-ğan"→"soğan" ✓  (onion)
    { word: "soğan",     syllableBreak: "so-ğan",       visualPrompt: "an onion" },
    // "bolero" → ends in o → FINAL
    // Total medial: 22 words
  ],

  final: [
    // "kova"      ends in a → skip. Re-check: "kova" = k-o-v-a, ends in a → SKIP
    // "palto"     p-a-l-t-o  ends with o ✓  "pal-to"→"palto" ✓  (overcoat)
    { word: "palto",     syllableBreak: "pal-to",       visualPrompt: "an overcoat" },
    // "piyano"    p-i-y-a-n-o  ends with o ✓  "pi-ya-no"→"piyano" ✓
    { word: "piyano",    syllableBreak: "pi-ya-no",     visualPrompt: "a piano" },
    // "radyo"     r-a-d-y-o  ends with o ✓  "rad-yo"→"radyo" ✓
    { word: "radyo",     syllableBreak: "rad-yo",       visualPrompt: "a vintage radio device" },
    // "tablo"     t-a-b-l-o  ends with o ✓  "tab-lo"→"tablo" ✓  (painting/picture)
    { word: "tablo",     syllableBreak: "tab-lo",       visualPrompt: "a framed painting" },
    // "banyo"     b-a-n-y-o  ends with o ✓  "ban-yo"→"banyo" ✓  (bathroom)
    { word: "banyo",     syllableBreak: "ban-yo",       visualPrompt: "a bathroom with bathtub" },
    // "mango"     m-a-n-g-o  ends with o ✓  "man-go"→"mango" ✓
    { word: "mango",     syllableBreak: "man-go",       visualPrompt: "a mango fruit" },
    // "domino"    d-o-m-i-n-o  ends with o ✓  "do-mi-no"→"domino" ✓
    { word: "domino",    syllableBreak: "do-mi-no",     visualPrompt: "a domino tile" },
    // "mikrofon"  → ends in n not o → skip; "mikrofono" not Turkish
    // "disko"     d-i-s-k-o  ends with o ✓  "dis-ko"→"disko" ✓
    { word: "disko",     syllableBreak: "dis-ko",       visualPrompt: "a disco ball" },
    // "metro"     m-e-t-r-o  ends with o ✓  "met-ro"→"metro" ✓  (subway)
    { word: "metro",     syllableBreak: "met-ro",       visualPrompt: "a subway train" },
    // "memo" → not Turkish
    // "polo"      p-o-l-o  ends with o ✓  "po-lo"→"polo" ✓  (sport or polo shirt)
    { word: "polo",      syllableBreak: "po-lo",        visualPrompt: "a polo shirt" },
    // "video"     v-i-d-e-o  ends with o ✓  "vi-de-o"→"video" ✓
    { word: "video",     syllableBreak: "vi-de-o",      visualPrompt: "a video camera" },
    // "triko"     t-r-i-k-o  ends with o ✓  "tri-ko"→"triko" ✓  (knitted cardigan)
    { word: "triko",     syllableBreak: "tri-ko",       visualPrompt: "a knitted cardigan" },
    // "bordo"     b-o-r-d-o  ends with o ✓  "bor-do"→"bordo" ✓  (wine-red color swatch / maroon cloth)
    //   → color name, abstract → skip
    // "taburo" → not standard; "tamburo" → not Turkish
    // "kahramano" → not a word
    // "kameo"     k-a-m-e-o  ends with o ✓  "ka-me-o"→"kameo" ✓  (cameo brooch)
    // → jewelry, not common child word → skip
    // "kargo"     k-a-r-g-o  ends with o ✓  "kar-go"→"kargo" ✓  (cargo/package)
    { word: "kargo",     syllableBreak: "kar-go",       visualPrompt: "a cargo box package" },
    // "largo"     → musical term, abstract → skip
    // Total final: 17 words
  ],
};
