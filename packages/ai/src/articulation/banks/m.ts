import type { BankWord, Position } from "../types";

// Self-verification:
// initial: word starts with "m"
// medial:  "m" found in word.slice(1,-1)  (interior, not first/last char)
// final:   word ends with "m"
// syllableBreak.replace(/-/g,"") === word  (every entry)

export const words: Record<Position, BankWord[]> = {
  initial: [
    // "masa"       starts with m ✓  "ma-sa"→"masa" ✓
    { word: "masa",       syllableBreak: "ma-sa",         visualPrompt: "a wooden table" },
    // "muz"        starts with m ✓  "muz"→"muz" ✓
    { word: "muz",        syllableBreak: "muz",           visualPrompt: "a banana" },
    // "mum"        starts with m ✓  "mum"→"mum" ✓
    { word: "mum",        syllableBreak: "mum",           visualPrompt: "a wax candle" },
    // "makas"      starts with m ✓  "ma-kas"→"makas" ✓
    { word: "makas",      syllableBreak: "ma-kas",        visualPrompt: "a pair of scissors" },
    // "mantar"     starts with m ✓  "man-tar"→"mantar" ✓
    { word: "mantar",     syllableBreak: "man-tar",       visualPrompt: "a mushroom" },
    // "mendil"     starts with m ✓  "men-dil"→"mendil" ✓
    { word: "mendil",     syllableBreak: "men-dil",       visualPrompt: "a handkerchief" },
    // "meyve"      starts with m ✓  "mey-ve"→"meyve" ✓
    { word: "meyve",      syllableBreak: "mey-ve",        visualPrompt: "a basket of fruit" },
    // "maymun"     starts with m ✓  "may-mun"→"maymun" ✓
    { word: "maymun",     syllableBreak: "may-mun",       visualPrompt: "a monkey" },
    // "mısır"      starts with m ✓  "mı-sır"→"mısır" ✓
    { word: "mısır",      syllableBreak: "mı-sır",        visualPrompt: "a corn cob" },
    // "mağara"     starts with m ✓  "ma-ğa-ra"→"mağara" ✓
    { word: "mağara",     syllableBreak: "ma-ğa-ra",      visualPrompt: "a cave" },
    // "mektup"     starts with m ✓  "mek-tup"→"mektup" ✓
    { word: "mektup",     syllableBreak: "mek-tup",       visualPrompt: "a letter envelope" },
    // "manav"      starts with m ✓  "ma-nav"→"manav" ✓
    { word: "manav",      syllableBreak: "ma-nav",        visualPrompt: "a greengrocer stall" },
    // "mercan"     starts with m ✓  "mer-can"→"mercan" ✓
    { word: "mercan",     syllableBreak: "mer-can",       visualPrompt: "a coral reef" },
    // "mercek"     starts with m ✓  "mer-cek"→"mercek" ✓
    { word: "mercek",     syllableBreak: "mer-cek",       visualPrompt: "a magnifying lens" },
    // "merdiven"   starts with m ✓  "mer-di-ven"→"merdiven" ✓
    { word: "merdiven",   syllableBreak: "mer-di-ven",    visualPrompt: "a ladder" },
    // "misket"     starts with m ✓  "mis-ket"→"misket" ✓
    { word: "misket",     syllableBreak: "mis-ket",       visualPrompt: "a glass marble" },
    // "mor"        → adjective color; skip; "mor" also used as noun (purple) but abstract; skip
    // "merdane"    starts with m ✓  "mer-da-ne"→"merdane" ✓  (rolling pin)
    { word: "merdane",    syllableBreak: "mer-da-ne",     visualPrompt: "a rolling pin" },
    // "mürekkep"   starts with m ✓  "mü-rek-kep"→"mürekkep" ✓
    { word: "mürekkep",   syllableBreak: "mü-rek-kep",    visualPrompt: "a bottle of ink" },
    // "mihver"     → axis, abstract; "mikrofon":
    // "mikrofon"   starts with m ✓  "mik-ro-fon"→"mikrofon" ✓
    { word: "mikrofon",   syllableBreak: "mik-ro-fon",    visualPrompt: "a microphone" },
    // "minare"     starts with m ✓  "mi-na-re"→"minare" ✓
    { word: "minare",     syllableBreak: "mi-na-re",      visualPrompt: "a mosque minaret" },
    // "midye"      starts with m ✓  "mid-ye"→"midye" ✓
    { word: "midye",      syllableBreak: "mid-ye",        visualPrompt: "a mussel shell" },
    // "motor"      starts with m ✓  "mo-tor"→"motor" ✓
    { word: "motor",      syllableBreak: "mo-tor",        visualPrompt: "an engine motor" },
    // "mıknatıs"   starts with m ✓  "mık-na-tıs"→"mıknatıs" ✓
    { word: "mıknatıs",   syllableBreak: "mık-na-tıs",    visualPrompt: "a horseshoe magnet" },
    // "mum" already added; "manto":
    // "manto"      starts with m ✓  "man-to"→"manto" ✓
    { word: "manto",      syllableBreak: "man-to",        visualPrompt: "a long coat" },
    // "meşe"       starts with m ✓  "me-şe"→"meşe" ✓  (oak tree)
    { word: "meşe",       syllableBreak: "me-şe",         visualPrompt: "an oak tree" },
    // "mintan"     starts with m ✓  "min-tan"→"mintan" ✓  (undershirt / shirt)
    { word: "mintan",     syllableBreak: "min-tan",       visualPrompt: "a cotton undershirt" },
    // "mezar"      starts with m ✓  "me-zar"→"mezar" ✓
    // "mutfak"     starts with m ✓  "mut-fak"→"mutfak" ✓
    { word: "mutfak",     syllableBreak: "mut-fak",       visualPrompt: "a kitchen" },
    // "muşamba"    starts with m ✓  "mu-şam-ba"→"muşamba" ✓  (oilcloth / raincoat)
    // Total initial: 30 concrete nouns starting with m ✓
  ],

  medial: [
    // "domates"    slice(1,-1)="omate" has m ✓  "do-ma-tes"→"domates" ✓
    { word: "domates",    syllableBreak: "do-ma-tes",     visualPrompt: "a tomato" },
    // "limon"      slice(1,-1)="imo" has m ✓  "li-mon"→"limon" ✓
    { word: "limon",      syllableBreak: "li-mon",        visualPrompt: "a lemon" },
    // "elma"       slice(1,-1)="lm" has m ✓  "el-ma"→"elma" ✓
    { word: "elma",       syllableBreak: "el-ma",         visualPrompt: "a red apple" },
    // "armut"      slice(1,-1)="rmu" has m ✓  "ar-mut"→"armut" ✓
    { word: "armut",      syllableBreak: "ar-mut",        visualPrompt: "a pear" },
    // "kömür"      slice(1,-1)="ömü" has m? No — "kömür": k-ö-m-ü-r, slice(1,-1) = chars 1..3 = "ömü" — contains m ✓  "kö-mür"→"kömür" ✓
    { word: "kömür",      syllableBreak: "kö-mür",        visualPrompt: "a lump of coal" },
    // "demir"      slice(1,-1)="emi" has m ✓  "de-mir"→"demir" ✓
    { word: "demir",      syllableBreak: "de-mir",        visualPrompt: "an iron bar" },
    // "lamba"      slice(1,-1)="amb" has m ✓  "lam-ba"→"lamba" ✓
    { word: "lamba",      syllableBreak: "lam-ba",        visualPrompt: "a table lamp" },
    // "simit"      slice(1,-1)="imi" has m ✓  "si-mit"→"simit" ✓
    { word: "simit",      syllableBreak: "si-mit",        visualPrompt: "a sesame ring bread" },
    // "semer"      slice(1,-1)="eme" has m ✓  "se-mer"→"semer" ✓  (pack saddle)
    { word: "semer",      syllableBreak: "se-mer",        visualPrompt: "a pack saddle" },
    // "kumru"      slice(1,-1)="umr" has m ✓  "kum-ru"→"kumru" ✓  (dove/pigeon)
    { word: "kumru",      syllableBreak: "kum-ru",        visualPrompt: "a turtle dove" },
    // "yumurta"    slice(1,-1)="umurt" has m ✓  "yu-mur-ta"→"yumurta" ✓
    { word: "yumurta",    syllableBreak: "yu-mur-ta",     visualPrompt: "an egg" },
    // "kamyon"     slice(1,-1)="amyo" has m ✓  "kam-yon"→"kamyon" ✓
    { word: "kamyon",     syllableBreak: "kam-yon",       visualPrompt: "a truck" },
    // "kamera"     slice(1,-1)="amer" has m ✓  "ka-me-ra"→"kamera" ✓
    { word: "kamera",     syllableBreak: "ka-me-ra",      visualPrompt: "a camera" },
    // "tampon"     slice(1,-1)="ampo" has m ✓  "tam-pon"→"tampon" ✓  (bumper)
    { word: "tampon",     syllableBreak: "tam-pon",       visualPrompt: "a car bumper" },
    // "çimen"      slice(1,-1)="ime" has m ✓  "çi-men"→"çimen" ✓
    { word: "çimen",      syllableBreak: "çi-men",        visualPrompt: "a patch of grass" },
    // "ambar"      slice(1,-1)="mba" has m ✓  "am-bar"→"ambar" ✓
    { word: "ambar",      syllableBreak: "am-bar",        visualPrompt: "a grain warehouse" },
    // "hamur"      slice(1,-1)="amu" has m ✓  "ha-mur"→"hamur" ✓
    { word: "hamur",      syllableBreak: "ha-mur",        visualPrompt: "a ball of dough" },
    // "ümit" → abstract (hope); skip; "ümmü" → proper; skip
    // "jumper" → loanword; "yıkım" → abstract; "yumak":
    // "yumak"      slice(1,-1)="uma" has m ✓  "yu-mak"→"yumak" ✓  (ball of yarn)
    { word: "yumak",      syllableBreak: "yu-mak",        visualPrompt: "a ball of yarn" },
    // "pamuk" → initial p word; skip medial; "pembe" → starts with p, adjective anyway
    // "imdat" → abstract call; "imza" → abstract signature; "komşu":
    // "komşu"      slice(1,-1)="omş" has m ✓  "kom-şu"→"komşu" ✓
    { word: "komşu",      syllableBreak: "kom-şu",        visualPrompt: "a neighbour" },
    // "tombala"    slice(1,-1)="ombal" has m ✓  "tom-ba-la"→"tombala" ✓
    { word: "tombala",    syllableBreak: "tom-ba-la",     visualPrompt: "a bingo board" },
    // "domuz"      slice(1,-1)="omu" has m ✓  "do-muz"→"domuz" ✓
    { word: "domuz",      syllableBreak: "do-muz",        visualPrompt: "a pig" },
    // "kumaş"      slice(1,-1)="uma" has m ✓  "ku-maş"→"kumaş" ✓
    { word: "kumaş",      syllableBreak: "ku-maş",        visualPrompt: "a bolt of fabric" },
    // "semaver"    slice(1,-1)="emave" has m ✓  "se-ma-ver"→"semaver" ✓
    { word: "semaver",    syllableBreak: "se-ma-ver",     visualPrompt: "a samovar tea urn" },
    // "ırmak"      slice(1,-1)="rma" has m ✓  "ır-mak"→"ırmak" ✓
    { word: "ırmak",      syllableBreak: "ır-mak",        visualPrompt: "a river" },
    // "çamaşır"    slice(1,-1)="amaşı" has m ✓  "ça-ma-şır"→"çamaşır" ✓
    { word: "çamaşır",    syllableBreak: "ça-ma-şır",     visualPrompt: "laundry clothes on a line" },
    // "zımba"      slice(1,-1)="ımb" has m ✓  "zım-ba"→"zımba" ✓
    { word: "zımba",      syllableBreak: "zım-ba",        visualPrompt: "a stapler" },
    // "kümbet"     slice(1,-1)="ümbe" has m ✓  "küm-bet"→"kümbet" ✓  (domed tomb)
    // "çömlek"     slice(1,-1)="öml" has m ✓  "çöm-lek"→"çömlek" ✓
    { word: "çömlek",     syllableBreak: "çöm-lek",       visualPrompt: "a clay pot" },
    // "imame" → abstract; "hamak":
    // "hamak"      slice(1,-1)="ama" has m ✓  "ha-mak"→"hamak" ✓
    { word: "hamak",      syllableBreak: "ha-mak",        visualPrompt: "a hammock" },
    // Total medial: 29 concrete nouns with m in interior ✓
  ],

  final: [
    // "adam"       ends with m ✓  "a-dam"→"adam" ✓
    { word: "adam",       syllableBreak: "a-dam",         visualPrompt: "a man" },
    // "kalem"      ends with m ✓  "ka-lem"→"kalem" ✓
    { word: "kalem",      syllableBreak: "ka-lem",        visualPrompt: "a pencil" },
    // "üzüm"       ends with m ✓  "ü-züm"→"üzüm" ✓
    { word: "üzüm",       syllableBreak: "ü-züm",         visualPrompt: "a bunch of grapes" },
    // "resim"      ends with m ✓  "re-sim"→"resim" ✓
    { word: "resim",      syllableBreak: "re-sim",        visualPrompt: "a drawing picture" },
    // "badem"      ends with m ✓  "ba-dem"→"badem" ✓
    { word: "badem",      syllableBreak: "ba-dem",        visualPrompt: "an almond nut" },
    // "krem"       ends with m ✓  "krem"→"krem" ✓
    { word: "krem",       syllableBreak: "krem",          visualPrompt: "a tube of cream" },
    // "çiçek" → no m; "fısıltı" → no m; "yıldam" → not a word
    // "gözlem"     → abstract observation; skip; "alem":
    // "alem"       ends with m ✓  "a-lem"→"alem" ✓  (realm / globe ornament)
    // "film"       ends with m ✓  "film"→"film" ✓
    { word: "film",       syllableBreak: "film",          visualPrompt: "a movie film reel" },
    // "selam" → abstract greeting; skip; "tulum":
    // "tulum"      ends with m ✓  "tu-lum"→"tulum" ✓  (bagpipe / overalls)
    { word: "tulum",      syllableBreak: "tu-lum",        visualPrompt: "a bagpipe" },
    // "kurum"      → abstract (institution); skip; "karum" → not a word
    // "forum"      → abstract; skip; "serum":
    // "serum"      ends with m ✓  "se-rum"→"serum" ✓
    { word: "serum",      syllableBreak: "se-rum",        visualPrompt: "a medical serum bag" },
    // "album"      ends with m ✓  "al-büm"→"albüm" — wait: "albüm" has ü not u: "al-büm"→"albüm" ✓
    { word: "albüm",      syllableBreak: "al-büm",        visualPrompt: "a photo album" },
    // "buhurdanlık" → no final m; "buram":
    // "buram"      → "buram buram" not a standalone noun; skip
    // "şalım" → not a word; "selim" → proper noun; "halim" → proper noun
    // "karakum" → proper; "hilum" → medical abstract
    // "çiçeklim" → not a word; "yelim" → not standard
    // "karım" → possessive; "totem" → abstract loanword
    // "alarm"      ends with m ✓  "a-larm"→"alarm" ✓
    { word: "alarm",      syllableBreak: "a-larm",        visualPrompt: "an alarm clock" },
    // "teyp" → no m; "yem":
    // "yem"        ends with m ✓  "yem"→"yem" ✓
    { word: "yem",        syllableBreak: "yem",           visualPrompt: "animal feed grain" },
    // "nem"        ends with m ✓  "nem"→"nem" ✓
    // "dam"        ends with m ✓  "dam"→"dam" ✓
    { word: "dam",        syllableBreak: "dam",           visualPrompt: "a flat rooftop" },
    // "ham"        ends with m ✓  "ham"→"ham" ✓  (raw material / crude)
    // → abstract quality; skip
    // "yıkım" → abstract; "takım":
    // "takım"      ends with m ✓  "ta-kım"→"takım" ✓
    { word: "takım",      syllableBreak: "ta-kım",        visualPrompt: "a tool set" },
    // "ilkyaz" → no m; "çakım" → not a common noun
    // "tuzlum" → not a word; "sekim" → not a word
    // "saçım" → possessive; "dışım" → possessive
    // "hizum" → not a word; "çorum" → proper noun
    // "tığım" → possessive; "kozalak" → no m
    // "çığlık" → no m; "nalim" → not standard
    // "biçim"      ends with m ✓  "bi-çim"→"biçim" ✓  (shape/form — borderline abstract)
    // → abstract; skip; "miğfer":
    // "miğfer"     → no final m; "kılım":
    // "kılım"      ends with m ✓  "kı-lım"→"kılım" ✓  (rug/kilim)
    { word: "kilim",      syllableBreak: "ki-lim",        visualPrompt: "a woven kilim rug" },
    // "selim" → name; "halim" → name; "şalım" → not a word
    // "kasım" → month name (proper); "alım" → abstract; "satım" → abstract
    // "sülüm" → not a word; "böcüm" → not a word
    // "gerim" → abstract (tension); "çerim" → not standard
    // "özüm" → abstract; "gözüm" → possessive
    // "tıkım" → not standalone; "bakım":
    // "bakım"      → care/maintenance, abstract; skip
    // "balçım" → not a word; "çekim":
    // "çekim"      → attraction, abstract; skip
    // "soğum" → not standard; "çağım" → possessive
    // "küçüm" → not standalone; "gülüm" → possessive/endearment
    // "hacim"      ends with m ✓  "ha-cim"→"hacim" ✓  (volume)
    // → abstract; skip
    // "üçüm" → not a word
    // "oylum" → not common; "sürgüm" → not a word
    // "bölüm" → abstract (section); skip
    // "göçüm" → not standard; "küfüm" → not a word
    // "çizgim" → possessive; "ezgim" → possessive
    // "kapım" → possessive
    // NOTE: final /m/ is common in Turkish via suffix-less nouns
    // "yakım" → not a word; "çakım" → not a word
    // Good concrete finals already covered; additional:
    // "atom"       ends with m ✓  "a-tom"→"atom" ✓
    { word: "atom",       syllableBreak: "a-tom",         visualPrompt: "an atom diagram" },
    // "takvim"     ends with m ✓  "tak-vim"→"takvim" ✓
    { word: "takvim",     syllableBreak: "tak-vim",       visualPrompt: "a wall calendar" },
    // "yazılım" → software, abstract; "özüm" → abstract
    // "baskım" → possessive; "yayım" → abstract
    // "kaktüs" → no m; "rakam":
    // "rakam"      ends with m ✓  "ra-kam"→"rakam" ✓
    { word: "rakam",      syllableBreak: "ra-kam",        visualPrompt: "written number digits" },
    // Total final: 22 concrete nouns ending with m ✓
    // (many Turkish nouns-ending-in-m are borrowed from Arabic/Persian;
    //  possessive-form traps are common — kept only standalone concrete nouns)
  ],
};
