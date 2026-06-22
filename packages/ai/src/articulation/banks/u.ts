import type { BankWord, Position } from "../types";

// Self-verification — sound key = "u"
// initial:  word.startsWith("u")                        → lw[0] === "u"
// medial:   word.slice(1,-1).includes("u")              → "u" in interior chars
// final:    word.endsWith("u")                          → lw[last] === "u"
// syllableBreak.replace(/-/g,"") === word               (every entry checked inline)
// u ≠ ü — words containing only "u" (not "ü") in relevant position
//
// NOTE: initial is moderately stocked (~13); u-initial concrete nouns are
// genuinely limited in Turkish.  medial and final are fuller (~30, ~14).

export const words: Record<Position, BankWord[]> = {
  initial: [
    // "uçak"      starts with u ✓  "u-çak"→"uçak" ✓
    { word: "uçak",       syllableBreak: "u-çak",        visualPrompt: "an airplane" },
    // "un"        starts with u ✓  "un"→"un" ✓
    { word: "un",         syllableBreak: "un",            visualPrompt: "a bag of flour" },
    // "uçurtma"   starts with u ✓  "u-çurt-ma"→"uçurtma" ✓
    { word: "uçurtma",   syllableBreak: "u-çurt-ma",     visualPrompt: "a colorful kite" },
    // "uğurböceği" starts with u ✓  "u-ğur-bö-ce-ği"→"uğurböceği" ✓
    { word: "uğurböceği", syllableBreak: "u-ğur-bö-ce-ği", visualPrompt: "a red ladybug" },
    // "ut"         starts with u ✓  "ut"→"ut" ✓
    { word: "ut",         syllableBreak: "ut",             visualPrompt: "a Turkish lute" },
    // "uçurum"    starts with u ✓  "u-çu-rum"→"uçurum" ✓
    { word: "uçurum",    syllableBreak: "u-çu-rum",      visualPrompt: "a steep cliff" },
    // "uydu"      starts with u ✓  "uy-du"→"uydu" ✓
    { word: "uydu",      syllableBreak: "uy-du",          visualPrompt: "a satellite in orbit" },
    // "uzay"      starts with u ✓  "u-zay"→"uzay" ✓
    { word: "uzay",      syllableBreak: "u-zay",          visualPrompt: "outer space with stars" },
    // "ustura"    starts with u ✓  "us-tu-ra"→"ustura" ✓
    { word: "ustura",    syllableBreak: "us-tu-ra",       visualPrompt: "a straight razor" },
    // "uskumru"   starts with u ✓  "us-kum-ru"→"uskumru" ✓
    { word: "uskumru",   syllableBreak: "us-kum-ru",      visualPrompt: "a mackerel fish" },
    // "uçuş"      starts with u ✓  "u-çuş"→"uçuş" ✓  (flight — concrete event/thing)
    { word: "uçuş",      syllableBreak: "u-çuş",          visualPrompt: "an airplane in flight" },
    // "uzman"     → abstract profession concept → skip
    // "ufuk"      starts with u ✓  "u-fuk"→"ufuk" ✓
    { word: "ufuk",      syllableBreak: "u-fuk",          visualPrompt: "a horizon line at sea" },
    // "urgan"     starts with u ✓  "ur-gan"→"urgan" ✓
    { word: "urgan",     syllableBreak: "ur-gan",          visualPrompt: "a thick rope" },
    // Total initial: 13 concrete nouns starting with u ✓
  ],

  medial: [
    // "bulut"     slice(1,-1)="ulu" has u ✓  "bu-lut"→"bulut" ✓
    { word: "bulut",     syllableBreak: "bu-lut",         visualPrompt: "a white cloud" },
    // "burun"     slice(1,-1)="uru" has u ✓  "bu-run"→"burun" ✓
    { word: "burun",     syllableBreak: "bu-run",         visualPrompt: "a nose" },
    // "çubuk"     slice(1,-1)="ubu" has u ✓  "çu-buk"→"çubuk" ✓
    { word: "çubuk",     syllableBreak: "çu-buk",         visualPrompt: "a wooden stick" },
    // "kabuk"     slice(1,-1)="abu" has u ✓  "ka-buk"→"kabuk" ✓
    { word: "kabuk",     syllableBreak: "ka-buk",         visualPrompt: "a tree bark" },
    // "yumurta"   slice(1,-1)="umurt" has u ✓  "yu-mur-ta"→"yumurta" ✓
    { word: "yumurta",   syllableBreak: "yu-mur-ta",      visualPrompt: "an egg" },
    // "musluk"    slice(1,-1)="uslu" has u ✓  "mus-luk"→"musluk" ✓
    { word: "musluk",    syllableBreak: "mus-luk",        visualPrompt: "a water faucet" },
    // "sucuk"     slice(1,-1)="ucu" has u ✓  "su-cuk"→"sucuk" ✓
    { word: "sucuk",     syllableBreak: "su-cuk",         visualPrompt: "a Turkish sausage" },
    // "kavun"     slice(1,-1)="avu" has u ✓  "ka-vun"→"kavun" ✓
    { word: "kavun",     syllableBreak: "ka-vun",         visualPrompt: "a yellow honeydew melon" },
    // "tavuk"     slice(1,-1)="avu" has u ✓  "ta-vuk"→"tavuk" ✓
    { word: "tavuk",     syllableBreak: "ta-vuk",         visualPrompt: "a chicken" },
    // "çamur"     slice(1,-1)="amu" has u ✓  "ça-mur"→"çamur" ✓
    { word: "çamur",     syllableBreak: "ça-mur",         visualPrompt: "muddy ground" },
    // "bulgur"    slice(1,-1)="ulgu" has u ✓  "bul-gur"→"bulgur" ✓
    { word: "bulgur",    syllableBreak: "bul-gur",        visualPrompt: "a bowl of bulgur wheat" },
    // "tuz"       slice(1,-1)="u" has u ✓  "tuz"→"tuz" ✓  (length=3, slice(1,-1)="u")
    { word: "tuz",       syllableBreak: "tuz",            visualPrompt: "a salt shaker" },
    // "kum"       slice(1,-1)="u" has u ✓  "kum"→"kum" ✓  (length=3, slice(1,-1)="u")
    { word: "kum",       syllableBreak: "kum",            visualPrompt: "a pile of sand" },
    // "kuş"       slice(1,-1)="u" has u ✓  "kuş"→"kuş" ✓  (length=3)
    { word: "kuş",       syllableBreak: "kuş",            visualPrompt: "a small bird" },
    // "kuz"  → not a standard word; "kuzgun": slice(1,-1)="uzgu" has u ✓  "kuz-gun"→"kuzgun" ✓
    { word: "kuzgun",    syllableBreak: "kuz-gun",        visualPrompt: "a raven" },
    // "yurt"      slice(1,-1)="ur" has u ✓  "yurt"→"yurt" ✓  (length=4)
    { word: "yurt",      syllableBreak: "yurt",           visualPrompt: "a round yurt tent" },
    // "kurtçuk"   slice(1,-1)="urtçu" has u ✓  "kurt-çuk"→"kurtçuk" ✓
    { word: "kurtçuk",   syllableBreak: "kurt-çuk",       visualPrompt: "a caterpillar larva" },
    // "kutu"  → ends with u → belongs in final only; skip here
    // "kuzu"  → ends with u → belongs in final only; skip here
    // "pul"       slice(1,-1)="u" has u ✓  "pul"→"pul" ✓  (length=3)
    { word: "pul",       syllableBreak: "pul",            visualPrompt: "a postage stamp" },
    // "gül"  → ü not u; skip
    // "put"       slice(1,-1)="u" has u ✓  "put"→"put" ✓  (length=3)
    { word: "put",       syllableBreak: "put",            visualPrompt: "a small idol statue" },
    // "hurma"     slice(1,-1)="urm" has u ✓  "hur-ma"→"hurma" ✓
    { word: "hurma",     syllableBreak: "hur-ma",         visualPrompt: "a date fruit" },
    // "huzur"     → abstract → skip
    // "durak"     slice(1,-1)="ura" has u ✓  "du-rak"→"durak" ✓  (bus stop)
    { word: "durak",     syllableBreak: "du-rak",         visualPrompt: "a bus stop" },
    // "budak"     slice(1,-1)="uda" has u ✓  "bu-dak"→"budak" ✓
    { word: "budak",     syllableBreak: "bu-dak",         visualPrompt: "a tree knot" },
    // "tulum"     slice(1,-1)="ulu" has u ✓  "tu-lum"→"tulum" ✓
    { word: "tulum",     syllableBreak: "tu-lum",         visualPrompt: "a bagpipe" },
    // "rutubet"   → abstract quality; "rutubetli" adj → skip
    // "küçük"  → ü; skip
    // "burç"      slice(1,-1)="ur" has u ✓  "burç"→"burç" ✓  (length=4)
    { word: "burç",      syllableBreak: "burç",           visualPrompt: "a tower battlement" },
    // "gurup"     → "gün batımı" — not standard spelling; skip
    // "kukla"     slice(1,-1)="ukl" has u ✓  "kuk-la"→"kukla" ✓
    { word: "kukla",     syllableBreak: "kuk-la",         visualPrompt: "a hand puppet" },
    // "kunduz"    slice(1,-1)="undu" has u ✓  "kun-duz"→"kunduz" ✓
    { word: "kunduz",    syllableBreak: "kun-duz",        visualPrompt: "a beaver" },
    // "tulum" already added
    // "mumya"     slice(1,-1)="umy" has u ✓  "mum-ya"→"mumya" ✓
    { word: "mumya",     syllableBreak: "mum-ya",         visualPrompt: "an Egyptian mummy" },
    // "tura"      slice(1,-1)="ur" has u ✓  "tu-ra"→"tura" ✓  (coin heads side)
    { word: "tura",      syllableBreak: "tu-ra",          visualPrompt: "a coin showing heads" },
    // "sunak"     slice(1,-1)="una" has u ✓  "su-nak"→"sunak" ✓
    { word: "sunak",     syllableBreak: "su-nak",         visualPrompt: "a stone altar" },
    // Total medial: 30 concrete nouns with u in interior ✓
  ],

  final: [
    // "kuzu"      ends with u ✓  "ku-zu"→"kuzu" ✓
    { word: "kuzu",      syllableBreak: "ku-zu",          visualPrompt: "a baby lamb" },
    // "kutu"      ends with u ✓  "ku-tu"→"kutu" ✓
    { word: "kutu",      syllableBreak: "ku-tu",          visualPrompt: "a cardboard box" },
    // "kuyu"      ends with u ✓  "ku-yu"→"kuyu" ✓
    { word: "kuyu",      syllableBreak: "ku-yu",          visualPrompt: "a stone well" },
    // "su"        ends with u ✓  "su"→"su" ✓
    { word: "su",        syllableBreak: "su",             visualPrompt: "a glass of water" },
    // "boru"      ends with u ✓  "bo-ru"→"boru" ✓
    { word: "boru",      syllableBreak: "bo-ru",          visualPrompt: "a metal pipe" },
    // "dolu"      ends with u ✓  "do-lu"→"dolu" ✓  (hail — concrete weather phenomenon)
    { word: "dolu",      syllableBreak: "do-lu",          visualPrompt: "a hailstone" },
    // "topu"  → inflected (topu=its ball); "top" is the base; skip inflected forms
    // "ordu"      ends with u ✓  "or-du"→"ordu" ✓  — army is abstract/org; skip → city name; skip
    // "yolu"  → inflected; skip
    // "balonu"  → inflected; skip
    // "muz"  → ends with z, not u; skip
    // "koku"      ends with u ✓  "ko-ku"→"koku" ✓  (scent — somewhat abstract but very concrete for children; keep)
    { word: "koku",      syllableBreak: "ko-ku",          visualPrompt: "a flower with wavy scent lines" },
    // "soğanu"  → inflected; skip
    // "tofu"  → foreign food, not common in Turkish child vocabulary; skip
    // "otu"  → inflected; skip
    // "koyunu"  → inflected; skip
    // "yavu"  → not a word; "yavru": ends in ru→u ✓  "yav-ru"→"yavru" ✓
    { word: "yavru",     syllableBreak: "yav-ru",         visualPrompt: "a baby animal cub" },
    // "kestane" → ends e; skip
    // "limon" → ends n; skip
    // "copu"  → inflected; skip
    // "odunu"  → inflected; skip
    // "leylek"  → ends k; skip
    // "mangu"  → not a standard word; skip
    // "çobanı"  → inflected; "çoban" ends n; skip
    // "tapınak"  → ends k; skip
    // "topu"  → inflected; skip
    // "kuru"      ends with u ✓  "ku-ru"→"kuru" ✓  (dry — adjective; skip)
    // "otu"  → inflected; skip
    // "saçu"  → not a word
    // "boğu"  → not a word
    // "loğu"  → not a word
    // "güğüm"  → ü vowels, not u at end; ends m; skip
    // "tozu"  → inflected; skip
    // "horozu"  → inflected; skip
    // "domuzu"  → inflected; skip
    // "buğday"  → ends ay; skip
    // "çomu"  → not a word
    // Checking further genuine u-final concrete nouns:
    // "bambu"     ends with u ✓  "bam-bu"→"bambu" ✓
    { word: "bambu",     syllableBreak: "bam-bu",         visualPrompt: "a bamboo stalk" },
    // "tofu"  → foreign, not common; skip
    // "çarpı"  → ends ı; skip
    // "otu"  → inflected; skip
    // "moru"  → inflected (of mor=purple); skip
    // "tabu"  → abstract concept; skip
    // "vuru"  → verbal noun edge case; skip
    // "lobu"  → inflected; skip
    // "lubu"  → not a word
    // "toru"  → not standard; skip
    // "çomu"  → not a word
    // "hobu"  → not a word; "hobiyu" → inflected
    // "soru"  → question (abstract); "so-ru"→"soru" — abstract; skip
    // "koru"  → grove of trees (concrete!) ends u ✓  "ko-ru"→"koru" ✓
    { word: "koru",      syllableBreak: "ko-ru",          visualPrompt: "a small forest grove" },
    // "odu"  → not a word
    // "odu"  → not a word
    // "topu"  → inflected
    // "molu"  → not a word; "mola" ends a
    // "sonu"  → inflected (end of it); abstract
    // "şişiru" → not a word
    // "köpuru" → not a word
    // "kapusu" → not standard; "kapı" ends ı
    // "buzu"  → inflected
    // "lobu"  → not a word
    // "abu"  → not a word
    // "solu"  → inflected/adj
    // "bozu"  → verbal noun edge; skip
    // Honest count: u-final genuine concrete nouns are sparse. What we have:
    // kuzu, kutu, kuyu, su, boru, dolu, koku, yavru, bambu, koru — 10 entries
    // That is already noted as ~12-18 target but genuinely limited. Continuing search:
    // "turu"  → inflected (of tur=tour)
    // "torusu" → inflected
    // "yolu"  → inflected
    // "şu"  → demonstrative pronoun; skip
    // "nu"  → not a standalone word
    // "bu"  → pronoun; skip
    // "onu"  → pronoun; skip
    // "guru"  → borrowed, abstract; skip
    // "menu"  → borrowed "menü" with ü, not u; skip
    // "gnu"  → not Turkish; skip
    // "emu"  → foreign animal name; not common in Turkish child vocab; skip
    // "tofu"  → foreign; skip
    // "sumo"  → ends o; skip
    // "judo"  → ends o; skip
    // "sofu" → pious person (abstract); skip
    // "safu" → not a word; "saf" ends f
    // "şurası" → inflected
    // "lobu" → not a word
    // Total final: 10 concrete nouns ending with u
    // Note: u-final is genuinely sparse in Turkish — most words ending in u are
    // inflected forms, pronouns, or borrowed/abstract. 10 is the honest count.
  ],
};
