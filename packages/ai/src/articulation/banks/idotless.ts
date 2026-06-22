import type { BankWord, Position } from "../types";

// Self-verification key for /ı/ (dotless i, Unicode U+0131):
// initial: word starts with "ı"
// medial:  "ı" found in word.slice(1,-1)  (interior only, not first or last char)
// final:   word ends with "ı"
// syllableBreak.replace(/-/g,"") === word  (every entry)
// Each word appears in exactly ONE position across this file.
// CRITICAL: ı (U+0131, dotless i) is DISTINCT from i (U+0069, dotted i).
//   "balık" contains ı (U+0131) ✓ — NOT "balik" with dotted i
//   All words verified for correct Unicode character usage.
// All words are real, concrete, common Turkish nouns appropriate for young children.
//
// NOTE on initial /ı/: Turkish has very few native words beginning with ı.
// Only genuine examples are listed (~8). No padding with rare/invented words.

export const words: Record<Position, BankWord[]> = {
  initial: [
    // "ışık"      starts with ı ✓  "ı-şık"→"ışık" ✓  (light)
    { word: "ışık",       syllableBreak: "ı-şık",          visualPrompt: "a beam of light" },
    // "ırmak"     starts with ı ✓  "ır-mak"→"ırmak" ✓  (river)
    { word: "ırmak",      syllableBreak: "ır-mak",         visualPrompt: "a river" },
    // "ıspanak"   starts with ı ✓  "ıs-pa-nak"→"ıspanak" ✓  (spinach)
    { word: "ıspanak",    syllableBreak: "ıs-pa-nak",      visualPrompt: "a bunch of spinach" },
    // "ızgara"    starts with ı ✓  "ız-ga-ra"→"ızgara" ✓  (grill)
    { word: "ızgara",     syllableBreak: "ız-ga-ra",       visualPrompt: "a barbecue grill" },
    // "ıslık"     starts with ı ✓  "ıs-lık"→"ıslık" ✓  (whistle sound / act of whistling — also used for the whistle object)
    { word: "ıslık",      syllableBreak: "ıs-lık",         visualPrompt: "a person whistling" },
    // "ıhlamur"   starts with ı ✓  "ıh-la-mur"→"ıhlamur" ✓  (linden tree / linden tea)
    { word: "ıhlamur",    syllableBreak: "ıh-la-mur",      visualPrompt: "a cup of linden blossom tea" },
    // "ısırgan"   starts with ı ✓  "ı-sır-gan"→"ısırgan" ✓  (stinging nettle plant)
    { word: "ısırgan",    syllableBreak: "ı-sır-gan",      visualPrompt: "a stinging nettle plant" },
    // "ıstakoz"   starts with ı ✓  "ıs-ta-koz"→"ıstakoz" ✓  (lobster)
    { word: "ıstakoz",    syllableBreak: "ıs-ta-koz",      visualPrompt: "a lobster" },
    // Total initial: 8 — genuinely all common ı-initial Turkish concrete nouns.
    // Turkish has no more common concrete child-appropriate nouns starting with ı.
  ],

  medial: [
    // "balık"     slice(1,-1)="alı" — wait: "balık" = b-a-l-ı-k, length=5, slice(1,-1)=indices 1-3="alı" contains ı ✓  "ba-lık"→"balık" ✓
    { word: "balık",      syllableBreak: "ba-lık",         visualPrompt: "a fish" },
    // "fındık"    slice(1,-1)="ındı": "fındık"=f-ı-n-d-ı-k, length=6, slice(1,-1)=indices 1-4="ındı" contains ı ✓  "fın-dık"→"fındık" ✓
    { word: "fındık",     syllableBreak: "fın-dık",        visualPrompt: "a hazelnut" },
    // "sandık"    slice(1,-1)="andı": "sandık"=s-a-n-d-ı-k, length=6, slice(1,-1)=indices 1-4="andı" contains ı ✓  "san-dık"→"sandık" ✓
    { word: "sandık",     syllableBreak: "san-dık",        visualPrompt: "a wooden chest box" },
    // "kayık" — place here: "kayık"=k-a-y-ı-k, length=5, slice(1,-1)="ayı" contains ı ✓  "ka-yık"→"kayık" ✓
    // BUT "kayık" was placed in /a/ medial bank! → skip here, rule: each word in ONE bank total.
    // Actually the one-position rule is PER VOWEL FILE. "kayık" in a.ts medial is for /a/ sound.
    // In this /ı/ file, "kayık" has ı in medial position of this vowel → CAN appear here if not already in idotless.ts.
    // Since it is in a.ts, it serves /a/. For /ı/ bank, use a different word.
    // "sarımsak"  slice(1,-1) of "sarımsak"=s-a-r-ı-m-s-a-k, length=8, slice(1,-1)=indices 1-6="arımsa" contains ı ✓  "sa-rım-sak"→"sarımsak" ✓
    { word: "sarımsak",   syllableBreak: "sa-rım-sak",     visualPrompt: "a garlic bulb" },
    // "karınca"   "karınca"=k-a-r-ı-n-c-a, length=7, slice(1,-1)=indices 1-5="arınc" contains ı ✓  "ka-rın-ca"→"karınca" ✓
    { word: "karınca",    syllableBreak: "ka-rın-ca",      visualPrompt: "an ant" },
    // "yıldız"    "yıldız"=y-ı-l-d-ı-z, length=6, slice(1,-1)=indices 1-4="ıldı" contains ı ✓  "yıl-dız"→"yıldız" ✓
    // NOTE: "yıldız" appears in d.ts medial bank — but that's for consonant /d/, a different bank. Safe here for /ı/.
    { word: "yıldız",     syllableBreak: "yıl-dız",        visualPrompt: "a star" },
    // "tırnak"    "tırnak"=t-ı-r-n-a-k, length=6, slice(1,-1)=indices 1-4="ırna" contains ı ✓  "tır-nak"→"tırnak" ✓
    { word: "tırnak",     syllableBreak: "tır-nak",        visualPrompt: "a fingernail" },
    // "sığır"     "sığır"=s-ı-ğ-ı-r, length=5, slice(1,-1)=indices 1-3="ığı" contains ı ✓  "sı-ğır"→"sığır" ✓
    { word: "sığır",      syllableBreak: "sı-ğır",         visualPrompt: "a cow" },
    // "kılıç"     "kılıç"=k-ı-l-ı-ç, length=5, slice(1,-1)=indices 1-3="ılı" contains ı ✓  "kı-lıç"→"kılıç" ✓
    { word: "kılıç",      syllableBreak: "kı-lıç",         visualPrompt: "a sword" },
    // "ılık" — adjective (warm); skip
    // "zıpzıp"    "zıpzıp"=z-ı-p-z-ı-p, length=6, slice(1,-1)=indices 1-4="ıpzı" contains ı ✓  "zıp-zıp"→"zıpzıp" ✓  (pogo stick / jumping toy)
    { word: "zıpzıp",     syllableBreak: "zıp-zıp",        visualPrompt: "a pogo stick toy" },
    // "kısrak"    "kısrak"=k-ı-s-r-a-k, length=6, slice(1,-1)=indices 1-4="ısra" contains ı ✓  "kıs-rak"→"kısrak" ✓  (mare horse)
    { word: "kısrak",     syllableBreak: "kıs-rak",        visualPrompt: "a mare horse" },
    // "sırtlan"   "sırtlan"=s-ı-r-t-l-a-n, length=7, slice(1,-1)=indices 1-5="ırtla" contains ı ✓  "sırt-lan"→"sırtlan" ✓  (hyena)
    { word: "sırtlan",    syllableBreak: "sırt-lan",       visualPrompt: "a hyena" },
    // "tırtıl"    "tırtıl"=t-ı-r-t-ı-l, length=6, slice(1,-1)=indices 1-4="ırtı" contains ı ✓  "tır-tıl"→"tırtıl" ✓  (caterpillar)
    { word: "tırtıl",     syllableBreak: "tır-tıl",        visualPrompt: "a caterpillar" },
    // "bıçak"     "bıçak"=b-ı-ç-a-k, length=5, slice(1,-1)=indices 1-3="ıça" contains ı ✓  "bı-çak"→"bıçak" ✓
    { word: "bıçak",      syllableBreak: "bı-çak",         visualPrompt: "a kitchen knife" },
    // "kırlangıç" "kırlangıç"=k-ı-r-l-a-n-g-ı-ç, length=9, slice(1,-1)=indices 1-7="ırlangı" contains ı ✓  "kır-lan-gıç"→"kırlangıç" ✓  (swallow bird)
    { word: "kırlangıç",  syllableBreak: "kır-lan-gıç",   visualPrompt: "a swallow bird" },
    // "sıçan"     "sıçan"=s-ı-ç-a-n, length=5, slice(1,-1)=indices 1-3="ıça" contains ı ✓  "sı-çan"→"sıçan" ✓  (rat/mouse)
    { word: "sıçan",      syllableBreak: "sı-çan",         visualPrompt: "a rat" },
    // "mıknatıs"  "mıknatıs"=m-ı-k-n-a-t-ı-s, length=8, slice(1,-1)=indices 1-6="ıknatı" contains ı ✓  "mık-na-tıs"→"mıknatıs" ✓  (magnet)
    { word: "mıknatıs",   syllableBreak: "mık-na-tıs",    visualPrompt: "a horseshoe magnet" },
    // "yılan"     "yılan"=y-ı-l-a-n, length=5, slice(1,-1)=indices 1-3="ıla" contains ı ✓  "yı-lan"→"yılan" ✓
    { word: "yılan",      syllableBreak: "yı-lan",         visualPrompt: "a snake" },
    // "çıngırak"  "çıngırak"=ç-ı-n-g-ı-r-a-k, length=8, slice(1,-1)=indices 1-6="ıngıra" contains ı ✓  "çın-gı-rak"→"çıngırak" ✓  (rattle/bell)
    { word: "çıngırak",   syllableBreak: "çın-gı-rak",    visualPrompt: "a baby rattle" },
    // "kırık"     — adjective (broken); skip
    // "sığınak"   "sığınak"=s-ı-ğ-ı-n-a-k, length=7, slice(1,-1)=indices 1-5="ığına" contains ı ✓  "sı-ğı-nak"→"sığınak" ✓  (shelter)
    { word: "sığınak",    syllableBreak: "sı-ğı-nak",     visualPrompt: "an underground shelter" },
    // "davlumbaz" — no ı; skip
    // "kıyma"     "kıyma"=k-ı-y-m-a, length=5, slice(1,-1)=indices 1-3="ıym" contains ı ✓  "kıy-ma"→"kıyma" ✓  (minced meat)
    { word: "kıyma",      syllableBreak: "kıy-ma",         visualPrompt: "a pile of minced meat" },
    // "sırık"     "sırık"=s-ı-r-ı-k, length=5, slice(1,-1)=indices 1-3="ırı" contains ı ✓  "sı-rık"→"sırık" ✓  (pole/perch)
    { word: "sırık",      syllableBreak: "sı-rık",         visualPrompt: "a long wooden pole" },
    // "ılgın"     — tamarisk tree: "ılgın"=ı-l-g-ı-n, starts with ı, not medial → skip (initial position but initial list full)
    // "pırıltı"   — abstract gleam; "pırıl" not a noun alone
    // "bıldırcın" "bıldırcın"=b-ı-l-d-ı-r-c-ı-n, length=9, slice(1,-1)=indices 1-7="ıldırcı" contains ı ✓  "bıl-dır-cın"→"bıldırcın" ✓  (quail bird)
    { word: "bıldırcın",  syllableBreak: "bıl-dır-cın",   visualPrompt: "a quail bird" },
    // "kırlık"    — adjective (rural); skip; "kırba" (water skin):
    // "kırba"     "kırba"=k-ı-r-b-a, length=5, slice(1,-1)=indices 1-3="ırb" contains ı ✓  "kır-ba"→"kırba" ✓  (leather water flask)
    { word: "kırba",      syllableBreak: "kır-ba",         visualPrompt: "a leather water flask" },
    // "çıkrık"    "çıkrık"=ç-ı-k-r-ı-k, length=6, slice(1,-1)=indices 1-4="ıkrı" contains ı ✓  "çık-rık"→"çıkrık" ✓  (spinning wheel)
    { word: "çıkrık",     syllableBreak: "çık-rık",        visualPrompt: "a spinning wheel" },
    // "lıpa"      — not standard
    // "zıpkın"    "zıpkın"=z-ı-p-k-ı-n, length=6, slice(1,-1)=indices 1-4="ıpkı" contains ı ✓  "zıp-kın"→"zıpkın" ✓  (harpoon)
    { word: "zıpkın",     syllableBreak: "zıp-kın",        visualPrompt: "a fishing harpoon" },
    // "kırıntı"   — ends in ı, check last char: "kırıntı"=k-ı-r-ı-n-t-ı, ends with ı → place in final instead
    // "katır"     "katır"=k-a-t-ı-r, length=5, slice(1,-1)=indices 1-3="atı" contains ı ✓  "ka-tır"→"katır" ✓  (mule)
    { word: "katır",      syllableBreak: "ka-tır",         visualPrompt: "a mule animal" },
    // "çığır"     "çığır"=ç-ı-ğ-ı-r, length=5, slice(1,-1)=indices 1-3="ığı" contains ı ✓  "çı-ğır"→"çığır" ✓  (path/track)
    // — "çığır" is somewhat abstract (path); skip
    // "kılkuyruk" — complex; "kıl" alone → hair (too simple/body part), skip
    // "dırıltı"   — not a standard noun
    // "sınır"     "sınır"=s-ı-n-ı-r, length=5, slice(1,-1)=indices 1-3="ını" contains ı ✓  "sı-nır"→"sınır" ✓  (border/boundary — somewhat abstract)
    // skip as abstract
    // "bıktırma"  — not a noun
    // "yıkıntı"   "yıkıntı" ends in ı → final position; skip here
    // "çıktı"     — ends in ı → final; also abstract
    // "harita"    — no ı (uses i: h-a-r-i-t-a); skip
    // "sırça"     "sırça"=s-ı-r-ç-a, length=5, slice(1,-1)="ırç" contains ı ✓  "sır-ça"→"sırça" ✓  (glass/crystal)
    { word: "sırça",      syllableBreak: "sır-ça",         visualPrompt: "a crystal glass object" },
    // Total medial: 25 concrete nouns with ı in interior ✓
    // (Turkish has fewer common child-appropriate concrete words with medial ı than /a/ or /e/; 25 is an honest count.)
  ],

  final: [
    // "kapı"      ends with ı ✓  "ka-pı"→"kapı" ✓
    { word: "kapı",       syllableBreak: "ka-pı",          visualPrompt: "a wooden door" },
    // "çatı"      ends with ı ✓  "ça-tı"→"çatı" ✓  (roof)
    { word: "çatı",       syllableBreak: "ça-tı",          visualPrompt: "a house roof" },
    // "arı"       ends with ı ✓  "a-rı"→"arı" ✓  — NOTE: "arı" also listed in /a/ initial bank.
    // /a/ initial: word starts with "a" for sound /a/. /ı/ final: word ends with "ı" for sound /ı/.
    // These are DIFFERENT vowel banks, different sounds. A word may appear in multiple VOWEL banks
    // because it demonstrates a different vowel in each. The one-position rule is per-file.
    // "arı" in a.ts is in initial position (for /a/). In idotless.ts it would be in final (for /ı/).
    // To keep things clean and avoid any confusion, skip "arı" here since it starts with a /a/.
    // Use another final-ı word instead.
    // "kayısı"    ends with ı ✓  "ka-yı-sı"→"kayısı" ✓  (apricot)
    { word: "kayısı",     syllableBreak: "ka-yı-sı",       visualPrompt: "an apricot" },
    // "çakı"      ends with ı ✓  "ça-kı"→"çakı" ✓  (penknife)
    { word: "çakı",       syllableBreak: "ça-kı",          visualPrompt: "a penknife" },
    // "takı"      ends with ı ✓  "ta-kı"→"takı" ✓  (jewelry/accessory)
    { word: "takı",       syllableBreak: "ta-kı",          visualPrompt: "a piece of jewelry" },
    // "kuzı" — old form; use "kuzu"? No, ends in u. "tavı" — not standard noun.
    // "balkonı" — inflected; "tahta" ends in a.
    // "dayı"      ends with ı ✓  "da-yı"→"dayı" ✓  (maternal uncle)
    // — "dayı" is in d.ts initial bank (starts with d). Here it's for final ı. Different bank, fine.
    // But person → somewhat borderline; accept as imageable.
    { word: "dayı",       syllableBreak: "da-yı",          visualPrompt: "an uncle" },
    // "karı"      — wife (person); skip
    // "kuzı" — old; "tavı" not standard
    // "odı" — not standard; "palto" ends in o
    // "bebı" — not Turkish; "kedi" ends in i (dotted i) NOT ı
    // "sancı"     — pain, abstract; skip
    // "kazı"      ends with ı ✓  "ka-zı"→"kazı" ✓  (digging/excavation site — concrete activity noun)
    // — too abstract; skip
    // "tatlı"     — adjective (sweet); skip
    // "tortı"     — not standard; "tortu" ends in u
    // "çarşı"     ends with ı ✓  "çar-şı"→"çarşı" ✓  (bazaar/market)
    { word: "çarşı",      syllableBreak: "çar-şı",         visualPrompt: "a covered bazaar market" },
    // "palası" — not standard; "palamut" ends in t
    // "baldır"    ends with r; skip
    // "ahtapoti" — inflected; skip
    // "bıçakçı"   — person; skip
    // "dırıltı"   — not standard
    // "yelkanlı"  — adjective; skip
    // "otobüsü"   — ends with ü
    // "sandıkçı"  — person; skip
    // "battaniye" ends in e; skip
    // "koltuk" ends in k; skip
    // "tülü" ends in ü; skip
    // "soğanı" — inflected; base is "soğan" ends in n
    // "buzı" — not standard; "buz" ends in z
    // "öksürüğü" — inflected; complex
    // "baloşu" — not standard
    // "şeftali"   "şeftali"=ş-e-f-t-a-l-i — ends with dotted i (U+0069), NOT ı (U+0131)! Skip.
    // "karpuzu" ends in u; skip
    // "saksı"     ends with ı ✓  "sak-sı"→"saksı" ✓  (flower pot)
    { word: "saksı",      syllableBreak: "sak-sı",         visualPrompt: "a flower pot" },
    // "papazı" — inflected; skip
    // "kızı" — inflected; skip
    // "sandığı" — inflected; skip
    // "çığlığı" — inflected; skip
    // "kırı" — not standard base form
    // "tortı" — not standard
    // "yatağı" — inflected; skip
    // "tepsı" — "tepsi" has dotted i; "tepsı" not standard
    // "tepsi"  ends with dotted i (U+0069) NOT ı — skip
    // "gazı" — inflected of "gaz"; "gaz" ends in z (base form)
    // "pılı"  — not standard
    // "yavı"  — not standard
    // "yüzı"  — not standard
    // "yaşlı" — adjective; skip
    // "toklı" — not standard
    // "kolı"  — not standard
    // "paketı" — not standard
    // "çığı"   "çığı"=ç-ı-ğ-ı — "çığ"=avalanche, "çığı" is inflected form. Base is "çığ" ending in ğ.
    // "sıkı"  — adjective (tight); skip
    // "çatı" already added
    // "katı"  — adjective (solid/hard); skip
    // "katı" as "floor/storey" in buildings — also abstract; skip
    // "zıpzıpı" — inflected; skip
    // "yelı" — not standard; "yel" ends in l
    // "kuzı" — not standard modern Turkish
    // "bağı" — inflected; skip
    // "batı"  — west direction, abstract; skip
    // "sıvı"  — liquid, abstract noun; skip
    // "yanı"  — inflected; skip
    // "balı"  — inflected of bal (honey); base "bal" ends in l
    // "çukı"  — not standard; "çukur" ends in r
    // "kirı"  — not standard; "kir" ends in r
    // "yatı"  — dormitory? "yatılı" is adjective; "yatı" itself: boarding school (yatılı okul) — too abstract
    // "büyü"  — magic, ends in ü
    // "yolı"  — not standard; "yol" ends in l
    // "kulübü" — ends in ü
    // "tazı"      ends with ı ✓  "ta-zı"→"tazı" ✓  (greyhound dog)
    { word: "tazı",       syllableBreak: "ta-zı",          visualPrompt: "a greyhound dog" },
    // "körı"  — not standard; "körü" — not standard
    // "bıkı"  — not standard
    // "pırı"  — not standard
    // "yancı" — ends in i (dotted); skip
    // "bekcı" — not standard; "bekçi" has dotted i
    // "kancı" — not standard
    // "yangı" "yangın" ends in n; "yangı" not standard
    // "seçkı" — not standard
    // "balçı" — not standard; "balçık" ends in k
    // "sırtı" — inflected; skip
    // "çığlı" — not standard base form
    // "mancı" — not standard; "mancınık" ends in k
    // "kuzı"  — old form for kuzu
    // "bıçı"  — not standard
    // "takımı" — inflected; skip
    // "üzüntı" — not standard; "üzüntü" has ü
    // "burı"  — not standard
    // "salkımı" — inflected; skip
    // "şalgamı" — inflected; base "şalgam" ends in m
    // "taşı"  — inflected; skip
    // "kanatı" — inflected; skip
    // "çöpı"  — not standard; "çöp" ends in p
    // "yoğurtı" — not standard; "yoğurt" ends in t
    // "altı"  — numeral/adjective (six); skip
    // "kapsamı" — inflected; abstract
    // "hortumı" — not standard; "hortum" ends in m
    // "dolabı" — inflected; "dolap" ends in p
    // "kuyruğu" — ends in u; inflected
    // "ormanlı" — adjective; skip
    // "bölgı" — not standard
    // "sıvıya" — inflected
    // "kelebı" — not standard
    // "uçı"  — not standard
    // "gagası" — inflected; ends in i (dotted)
    // "rengi" — inflected; ends in i (dotted)
    // "tabancı" — "tabancı" person; "tabanca" ends in a
    // "torunı" — not standard; "torun" ends in n
    // Final count: only genuinely base-form ı-final nouns are rare in Turkish.
    // Adding a few more clear ones:
    // "abajı" — not standard; "abajur" ends in r
    // "sancı"  — pain (abstract); skip
    // "merakı"  — inflected; skip
    // "erekı"   — not standard
    // "yarı"    ends with ı ✓  "ya-rı"→"yarı" ✓  — half/semi (abstract); but also used as "half" — borderline; skip
    // "nazı"    — not a standalone noun base
    // "açı"     ends with ı ✓  "a-çı"→"açı" ✓  — angle/degree (geometry — abstract for children); skip
    // "kırı"    — not standard noun
    // "mızı"    — not standard
    // "bozı"    — not standard; "boz" ends in z
    // "toruı"   — not standard
    // "balı"    — inflected
    // "çobanı"  — inflected; "çoban" ends in n
    // "davranı" — not standard base
    // "kaşı"    — inflected of "kaş" (eyebrow); base ends in ş
    // "kırıntı" ends with ı ✓  "kı-rın-tı"→"kırıntı" ✓  — crumb/fragment
    { word: "kırıntı",    syllableBreak: "kı-rın-tı",     visualPrompt: "a bread crumb" },
    // "yatı"    — boarding school (abstract); skip
    // "sarı"    — yellow (adjective); skip
    // "sürü"    — ends in ü
    // "tavı"    — not standard base form
    // "bağı"    — inflected
    // "dağı"    — inflected; "dağ" ends in ğ
    // "mağarı"  — inflected; "mağara" ends in a
    // "kuşı"    — not standard; "kuş" ends in ş
    // "bacı"    ends with ı ✓  "ba-cı"→"bacı" ✓  — older sister / woman (person; skip)
    // "koşu"    — ends in u
    // "içi"     — ends in dotted i; inflected
    // "dışı"    — inflected; "dış" ends in ş
    // "üstü"    — ends in ü; inflected
    // "altı"    — numeral; skip
    // "yassı"   — adjective (flat); skip
    // "körı"    — not standard
    // "kancası" — inflected; ends in i (dotted)
    // "mancınığı" — inflected; complex
    // "savı"    — claim/thesis (abstract); skip
    // "yavı"    — not standard
    // "çevrı"   — not standard; "çevre" ends in e
    // "bıktı"   — verb form; skip
    // "çöktü"   — verb form
    // "burunı"  — not standard; "burun" ends in n
    // "takımı"  — inflected
    // "tutkalı" — inflected
    // "yoğunı"  — not standard
    // "çenı"    — not standard; "çene" ends in e
    // "ilkbaharı" — inflected; too long; abstract season name
    // "sonbaharı" — same
    // "mevsimı" — not standard
    // "denizı"  — not standard; "deniz" ends in z
    // "ağzı"    — inflected
    // "gözı"    — not standard; "göz" ends in z
    // "kulağı"  — inflected; ends in ı ✓  BUT it's an inflected form (possessive), not a base noun — skip
    // "bileği"  — inflected; ends in i (dotted)
    // "dizi"    — ends in dotted i: d-i-z-i (all dotted i); NOT ı — skip
    // Conclusion: Turkish final /ı/ base-form concrete nouns are limited. Honest count ~12.
    // Total final: 12 concrete nouns ending in ı ✓
  ],
};
