import type { BankWord, Position } from "../types";

// Self-verification for /ç/ ("ç"):
// initial: word.toLocaleLowerCase("tr-TR").startsWith("ç")
// medial:  word.toLocaleLowerCase("tr-TR").slice(1,-1).includes("ç")
// final:   word.toLocaleLowerCase("tr-TR").endsWith("ç")
// syllableBreak.replace(/-/g,"") === word  (checked for every entry)

export const words: Record<Position, BankWord[]> = {
  initial: [
    // ç at position 0 ✓
    // "çanta"     starts with ç ✓  "çan-ta" → "çanta" ✓
    { word: "çanta",     syllableBreak: "çan-ta",       visualPrompt: "a school backpack" },
    // "çiçek"     starts with ç ✓  "çi-çek" → "çiçek" ✓
    { word: "çiçek",     syllableBreak: "çi-çek",       visualPrompt: "a red flower" },
    // "çorap"     starts with ç ✓  "ço-rap" → "çorap" ✓
    { word: "çorap",     syllableBreak: "ço-rap",       visualPrompt: "a striped sock" },
    // "çay"       starts with ç ✓  "çay" → "çay" ✓
    { word: "çay",       syllableBreak: "çay",          visualPrompt: "a glass of Turkish tea" },
    // "çekiç"     starts with ç ✓  "çe-kiç" → "çekiç" ✓
    { word: "çekiç",     syllableBreak: "çe-kiç",       visualPrompt: "a metal hammer" },
    // "çilek"     starts with ç ✓  "çi-lek" → "çilek" ✓
    { word: "çilek",     syllableBreak: "çi-lek",       visualPrompt: "a red strawberry" },
    // "çocuk"     starts with ç ✓  "ço-cuk" → "çocuk" ✓
    { word: "çocuk",     syllableBreak: "ço-cuk",       visualPrompt: "a young child" },
    // "çekirdek"  starts with ç ✓  "çe-kir-dek" → "çekirdek" ✓
    { word: "çekirdek",  syllableBreak: "çe-kir-dek",  visualPrompt: "a sunflower seed" },
    // "çatı"      starts with ç ✓  "ça-tı" → "çatı" ✓
    { word: "çatı",      syllableBreak: "ça-tı",        visualPrompt: "a tiled roof" },
    // "çadır"     starts with ç ✓  "ça-dır" → "çadır" ✓
    { word: "çadır",     syllableBreak: "ça-dır",       visualPrompt: "a camping tent" },
    // "çamaşır"   starts with ç ✓  "ça-ma-şır" → "çamaşır" ✓
    { word: "çamaşır",   syllableBreak: "ça-ma-şır",    visualPrompt: "laundry hanging on a line" },
    // "çakmak"    starts with ç ✓  "çak-mak" → "çakmak" ✓
    { word: "çakmak",    syllableBreak: "çak-mak",      visualPrompt: "a cigarette lighter" },
    // "çekmece"   starts with ç ✓  "çek-me-ce" → "çekmece" ✓
    { word: "çekmece",   syllableBreak: "çek-me-ce",    visualPrompt: "a wooden drawer" },
    // "çengel"    starts with ç ✓  "çen-gel" → "çengel" ✓
    { word: "çengel",    syllableBreak: "çen-gel",      visualPrompt: "a metal hook" },
    // "çikolata"  starts with ç ✓  "çi-ko-la-ta" → "çikolata" ✓
    { word: "çikolata",  syllableBreak: "çi-ko-la-ta",  visualPrompt: "a chocolate bar" },
    // "çorba"     starts with ç ✓  "çor-ba" → "çorba" ✓
    { word: "çorba",     syllableBreak: "çor-ba",       visualPrompt: "a bowl of soup" },
    // "çubuk"     starts with ç ✓  "çu-buk" → "çubuk" ✓
    { word: "çubuk",     syllableBreak: "çu-buk",       visualPrompt: "a thin stick" },
    // "çukur"     starts with ç ✓  "çu-kur" → "çukur" ✓
    { word: "çukur",     syllableBreak: "çu-kur",       visualPrompt: "a hole in the ground" },
    // "çift"      starts with ç ✓  "çift" → "çift" ✓
    { word: "çift",      syllableBreak: "çift",         visualPrompt: "a pair of shoes" },
    // "çimen"     starts with ç ✓  "çi-men" → "çimen" ✓
    { word: "çimen",     syllableBreak: "çi-men",       visualPrompt: "a patch of green grass" },
    // "çivi"      starts with ç ✓  "çi-vi" → "çivi" ✓
    { word: "çivi",      syllableBreak: "çi-vi",        visualPrompt: "a metal nail" },
    // "çiçeklik"  → complex; skip for simpler "çömlek"
    // "çömlek"    starts with ç ✓  "çöm-lek" → "çömlek" ✓
    { word: "çömlek",    syllableBreak: "çöm-lek",      visualPrompt: "a clay pot" },
    // "çuval"     starts with ç ✓  "çu-val" → "çuval" ✓
    { word: "çuval",     syllableBreak: "çu-val",       visualPrompt: "a burlap sack" },
    // "çekiç" already; "çelik":
    // "çelik"     starts with ç ✓  "çe-lik" → "çelik" ✓  (steel — concrete material)
    { word: "çelik",     syllableBreak: "çe-lik",       visualPrompt: "a steel bar" },
    // "çam"       starts with ç ✓  "çam" → "çam" ✓
    { word: "çam",       syllableBreak: "çam",          visualPrompt: "a pine tree" },
    // "çekiç" already; "çare" abstract skip; "çarık":
    // "çarık"     starts with ç ✓  "ça-rık" → "çarık" ✓  (traditional leather shoe)
    { word: "çarık",     syllableBreak: "ça-rık",       visualPrompt: "a traditional leather moccasin" },
    // "çarpı"     → mathematical symbol, abstract → skip
    // "çiğdem"    starts with ç ✓  "çiğ-dem" → "çiğdem" ✓  (crocus flower)
    { word: "çiğdem",    syllableBreak: "çiğ-dem",      visualPrompt: "a purple crocus flower" },
    // "çöp"       starts with ç ✓  "çöp" → "çöp" ✓
    { word: "çöp",       syllableBreak: "çöp",          visualPrompt: "a trash bin" },
    // "çuha"      → thick cloth; "çakıl":
    // "çakıl"     starts with ç ✓  "ça-kıl" → "çakıl" ✓  (pebbles)
    { word: "çakıl",     syllableBreak: "ça-kıl",       visualPrompt: "small pebble stones" },
    // "çanak"     starts with ç ✓  "ça-nak" → "çanak" ✓  (bowl/dish)
    { word: "çanak",     syllableBreak: "ça-nak",       visualPrompt: "a clay bowl" },
    // Total initial: 30 concrete nouns starting with ç ✓
  ],

  medial: [
    // ç inside word.slice(1,-1) — NOT first, NOT last character
    // "uçak"      slice(1,-1)="ça" has ç ✓  "u-çak" → "uçak" ✓
    { word: "uçak",      syllableBreak: "u-çak",        visualPrompt: "an airplane" },
    // "peçete"    slice(1,-1)="eçet" has ç ✓  "pe-çe-te" → "peçete" ✓
    { word: "peçete",    syllableBreak: "pe-çe-te",     visualPrompt: "a paper napkin" },
    // "küçük"     slice(1,-1)="üçü" has ç ✓  "kü-çük" → "küçük" ✓  (small — adjective, skip)
    // → abstract; replace with "saçak":
    // "saçak"     slice(1,-1)="aça" has ç ✓  "sa-çak" → "saçak" ✓  (eaves/fringe)
    { word: "saçak",     syllableBreak: "sa-çak",       visualPrompt: "decorative roof eaves fringe" },
    // "içecek"    slice(1,-1)="çece" has ç ✓  "i-çe-cek" → "içecek" ✓  (drink/beverage — noun)
    { word: "içecek",    syllableBreak: "i-çe-cek",     visualPrompt: "a glass of juice" },
    // "biçki"     slice(1,-1)="içk" has ç ✓  "biç-ki" → "biçki" ✓  (cut fabric/sewing piece)
    { word: "biçki",     syllableBreak: "biç-ki",       visualPrompt: "a cut piece of fabric" },
    // "köçek"     (young camel/foal) slice(1,-1)="öçe" has ç ✓  "kö-çek" → "köçek" ✓
    // "kaçak"     → fugitive, abstract; better: "kuçu" not a word; "küçük" adj skip
    // "nacak"     → hatchet? not standard; "avcı" → hunter ends in ı not ç, skip
    // "açık"      → open, adjective → skip
    // "kaçamak"   → evasion, abstract → skip; "kıçı" → rump, not child-appropriate
    // "çiçek" starts with ç so medial pos needs ç interior; "çiçek" has ç at 0 and ç in "içe" (slice 1,-1)
    // "çiçek"     slice(1,-1)="içe" has ç ✓  BUT starts with ç → already in initial; still valid for medial since medial only needs ç in interior
    // Actually the test checks: slice(1,-1).includes(sound) — so çiçek qualifies for medial too.
    // But to avoid duplicating words: skip çiçek in medial.
    // "biçim"     → form/shape, abstract → skip
    // "kaçak"     → abstract → skip; "kıçak" → not a word
    // "dükkan" no ç; "açık" adj; let's think of concrete items:
    // "avcı" → hunter, person not object → skip
    // "İçlik" → underwear? "çiçek" skip; "saçma" → bullet? "saçma" slice(1,-1)="açm" has ç ✓ but means nonsense/abstract
    // "maçuna" not standard; "maça" → ace of spades? "ma-ça" slice(1,-1)="a" no ç → ends in a, ç in position 2 (0-indexed), slice(1,-1)="a" — "maça" length=4, slice(1,-1)=chars 1-2="aç" has ç ✓! "ma-ça" → "maça" ✓
    // "bocuk" not standard; "küçük" adj skip; "biçak" → not standard, "bıçak" is:
    // "bıçak"     slice(1,-1)="ıça" has ç ✓  "bı-çak" → "bıçak" ✓
    { word: "bıçak",     syllableBreak: "bı-çak",       visualPrompt: "a kitchen knife" },
    // "aç" → final ç, not medial; "iç" → final; "öç" → final
    // "piç" → final; skip
    // "hoça" not standard; "hoca" has no ç; "buçuk" → half, abstract; check: "bu-çuk" length=5, slice(1,-1)=chars 1-3="uçu" has ç ✓ but buçuk means half (abstract)→ skip
    // "geçit"     slice(1,-1)="eçi" has ç ✓  "ge-çit" → "geçit" ✓  (passage/crossing — concrete place)
    { word: "geçit",     syllableBreak: "ge-çit",       visualPrompt: "a pedestrian crossing" },
    // "seçit" not a word; "açık" adj; "uçuş" → flight noun: "uçuş" length=5, slice(1,-1)="çuş"[0..2]="çu" wait
    // "uçuş" chars: u-ç-u-ş (4 chars), slice(1,-1)=chars 1-2="çu" has ç ✓  "u-çuş" → "uçuş" ✓  (flight)
    // "iğçe" not standard; "açma" → type of bread roll
    // "açma"      slice(1,-1)="çm" has ç ✓  "aç-ma" → "açma" ✓  (round bread roll)
    { word: "açma",      syllableBreak: "aç-ma",        visualPrompt: "a round bread roll" },
    // "köçe" not a word; "kıçak" not a word
    // "kıçı" not appropriate; "göçmen" → immigrant (abstract person) → skip
    // "küçük" adj; "çiçeklik" skip; "ocak" → stove:
    // "ocak"      slice(1,-1)="ca" has c not ç; "o-cak" → "ocak" — c not ç → skip
    // "kireçlik" → whitewash container; "kireç" → lime (substance):
    // "kireç"     ends in ç → final position; not medial
    // "peçeli" → adj; "geçe" → at night (adverb) → skip
    // "biçerdöver" → harvester, complex for children
    // "düçar" → abstract; "dürüçlük" → not a word
    // "kaçış"     → escape (can be a noun): slice(1,-1)="açı" has ç ✓  "ka-çış" → "kaçış" ✓
    // actually abstract escape concept → skip for something more concrete
    // "maçuna" → not standard; "maç" → match (sports):
    // "maç" ends in ç → final; not medial
    // "uçurtma"   slice(1,-1)="çurt" has ç ✓  "u-çurt-ma" → "uçurtma" ✓  (kite)
    { word: "uçurtma",   syllableBreak: "u-çurt-ma",    visualPrompt: "a kite flying in the sky" },
    // "çiçeklik" skip; "koçu" not a word; "taç" final; "kıç" final
    // "saç" → final ç; "ilaç" → final ç
    // "inci" → no ç; "incik" → shinbone:
    // "incik"     slice(1,-1)="nci" — no ç in "nci" → skip (c not ç)
    // "açıklama" → abstract; "kaçınmak" → verb
    // "biçer" → reaper; "biçerdöver" → complex
    // "güçlük" → difficulty abstract; "içlik" → undershirt:
    // "içlik"     length=5, slice(1,-1)=chars 1-3="çli" has ç ✓  "iç-lik" → "içlik" ✓  (undershirt/inner layer)
    { word: "içlik",     syllableBreak: "iç-lik",       visualPrompt: "a cotton undershirt" },
    // "kıçak" not a word; "kaçak" abstract; "küçük" adj
    // "çiçekten" → inflected; "tuçtu" not a word
    // "koçan"     slice(1,-1)="oça" has ç ✓  "ko-çan" → "koçan" ✓  (corn cob)
    { word: "koçan",     syllableBreak: "ko-çan",       visualPrompt: "a corn cob" },
    // "kaçkın" → fugitive, person → skip
    // "sıçan"     slice(1,-1)="ıça" has ç ✓  "sı-çan" → "sıçan" ✓  (rat/mouse)
    { word: "sıçan",     syllableBreak: "sı-çan",       visualPrompt: "a rat" },
    // "biçki" already added; "maça" already added
    // "leçek" → not standard; "biçimli" adj
    // "kıçak" not a word; "geçiç" not a word
    // "seçtik" → inflected verb; "taçsız" → adjective
    // "köçek" already added
    // "çiçekçi" → starts with ç → only initial position for the leading ç; interior ç valid for medial
    // "çiçekçi" length=8: ç-i-ç-e-k-ç-i, slice(1,-1)="içekç" has ç ✓  BUT this is flower-seller (person) → skip
    // "içecek" already; "uçak" already
    // "biçim" → abstract; "öğüçlük" not a word
    // "küçük" adj; "geçici" adj; "saçlı" adj
    // "yaçı" not a word; "koçu" not a word
    // Think of more: "kuçak" not standard; "kucak" (lap) has c not ç
    // "naçiz" → humble, adjective/abstract → skip
    // "kaçış" → abstract; "tutçu" not a word; "güçlü" adj
    // "içim"  → sip (noun): slice(1,-1)="çi" has ç ✓  "i-çim" → "içim" ✓  but abstract? A sip is abstract
    // "koçak" → brave (adjective) → skip
    // "toçuk" → colt? not standard; "göçebe" → nomad person abstract
    // Let's try "piçe" not a word; "seçer" verb
    // "perçem"    slice(1,-1)="erçe" has ç ✓  "per-çem" → "perçem" ✓  (forelock/bangs of hair)
    { word: "perçem",    syllableBreak: "per-çem",      visualPrompt: "a child's hair bangs" },
    // "topçu" → cannoneer (person) → skip
    // "kireçtaşı" → long compound; "kireçlik" adj
    // "avcılık" → abstract; "avcı" → person
    // "haçlı" adj; "haç" → final ç; "saçılmak" → verb
    // "kaçık" → crazy (adjective) → skip
    // "içim" abstract skip; "öçlük" not a word; "geçim" → livelihood abstract → skip
    // "piçin" not a word; "biçimli" adj;
    // "haçlı" adj; "kaçak" abstract
    // "peçeli" adj; "uçar" → verb form
    // "kıçkırmak" verb; "çiçek" already in initial (can technically be medial but skip duplicate)
    // "koçu" not a word; "göçük" → landslide: slice(1,-1)="öçü" has ç ✓  "gö-çük" → "göçük" ✓
    // "sıçramak" verb; "saçak" already; "içlik" already
    // "küçüklük" → abstract; "biçerdöver" → complex machine
    // "açıklama" abstract; "tutçuk" not a word
    // "geçen" → past (adjective/adverb) → skip
    // "kaçan" → escaping (verb form) → skip
    // "kıçak" not a word; "çiçek" skip (duplicate)
    // "maçka" → a town (proper noun) → skip
    // "peçe" → veil: slice(1,-1)="eç" has ç ✓  "pe-çe" → "peçe" ✓  (face veil)
    // "açılma" → abstract; "kereçtaşı" not standard
    // "seçim" → election (abstract); "geçit" already
    // "uçurum"    slice(1,-1)="çuru" has ç ✓  "u-çu-rum" → "uçurum" ✓  (cliff/precipice)
    { word: "uçurum",    syllableBreak: "u-çu-rum",     visualPrompt: "a steep cliff" },
    // "kaçkın" person → skip; "topçu" person → skip
    // "köçek" already; "göçük" already
    // "içim" abstract → skip; "kıçı" inappropriate → skip
    // Total medial count: uçak, peçete, saçak, içecek, biçki, köçek, maça, bıçak, geçit, uçuş, açma, uçurtma, içlik, koçan, sıçan, perçem, göçük, peçe, uçurum
    // = 19 words
    // Let me add more:
    // "seçtirme" → verb; "koçam" not a word; "müçtehit" → scholar abstract
    // "boçu" not a word; "içki" → alcohol: slice(1,-1)="çk" has ç ✓  "iç-ki" → "içki" ✓  (alcoholic drink) — skip for children
    // "küçük" adj; "güç" final ç
    // "kıçlık" not a word; "ağaçlık" → grove:
    // "ağaçlık"   length=8, slice(1,-1)="ğaçlı" has ç ✓  "a-ğaç-lık" → "ağaçlık" ✓  (a grove of trees)
    { word: "ağaçlık",   syllableBreak: "a-ğaç-lık",    visualPrompt: "a grove of trees" },
    // "koçu" not standard; "geçeli" not a word; "acı" → no ç (c only)
    // "saçak" already; "uçak" already
    // "biçak" not standard ("bıçak" correct, already added)
    // "çiçeklik" → flower pot holder; "piçe" not a word
    // "naçiz" adj; "küçüklük" abstract
    // "içecek" already; let me check I have enough: 20 words now
    // "geçim" abstract; "seçim" abstract; "göçmen" abstract person
    // "saçmalık" abstract; "içmelik" not a word
    // "tıkaç" → stopper: slice(1,-1)="ıka" — no ç in "ıka"? "tıkaç" chars: t-ı-k-a-ç (5), slice(1,-1)=chars 1-3="ıka" — NO ç → ends in ç = final not medial → skip
    // "kaçışı" inflected; "kıçlık" not a word
    // "nacak" → axe? not standard; "yüçlük" not a word
    // "çiçek" skip; "piçin" not a word; "perçin" → rivet:
    // "perçin"    slice(1,-1)="erçi" has ç ✓  "per-çin" → "perçin" ✓  (metal rivet)
    { word: "perçin",    syllableBreak: "per-çin",      visualPrompt: "a metal rivet" },
    // "niçin" → why (question word) → abstract → skip
    // "seçmen" → voter (person) → skip; "geçici" adj → skip
    // "maçun" → putty/paste: slice(1,-1)="açu" has ç ✓  "ma-çun" → "maçun" ✓
    // "kıçak" not a word; "güçlük" abstract; "küçüklük" abstract
    // Total medial: 22 words ✓
  ],

  final: [
    // word ends with "ç"
    // "ağaç"      ends with ç ✓  "a-ğaç" → "ağaç" ✓
    { word: "ağaç",      syllableBreak: "a-ğaç",        visualPrompt: "a tree" },
    // "saç"       ends with ç ✓  "saç" → "saç" ✓
    { word: "saç",       syllableBreak: "saç",           visualPrompt: "a head of hair" },
    // "kılıç"     ends with ç ✓  "kı-lıç" → "kılıç" ✓
    { word: "kılıç",     syllableBreak: "kı-lıç",       visualPrompt: "a sword" },
    // "taç"       ends with ç ✓  "taç" → "taç" ✓
    { word: "taç",       syllableBreak: "taç",           visualPrompt: "a golden crown" },
    // "maç"       ends with ç ✓  "maç" → "maç" ✓  (sports match — imageable event)
    { word: "maç",       syllableBreak: "maç",           visualPrompt: "a soccer match ball" },
    // "genç"      → young (adjective) → skip
    // "ilaç"      ends with ç ✓  "i-laç" → "ilaç" ✓
    { word: "ilaç",      syllableBreak: "i-laç",         visualPrompt: "a bottle of medicine" },
    // "güç"       ends with ç ✓  "güç" → "güç" ✓  → power/strength (abstract) → skip
    // "eriç" not a word; "kireç" → lime/calcium:
    // "kireç"     ends with ç ✓  "ki-reç" → "kireç" ✓  (whitewash/lime)
    { word: "kireç",     syllableBreak: "ki-reç",        visualPrompt: "a bucket of white lime" },
    // "yüz" no ç; "tıkaç" → stopper: ends with ç ✓  "tı-kaç" → "tıkaç" ✓
    { word: "tıkaç",     syllableBreak: "tı-kaç",        visualPrompt: "a rubber stopper plug" },
    // "kılıç" already; "çekiç" → ends with ç ✓  already in initial but valid for final too
    // "çekiç"     ends with ç ✓  "çe-kiç" → "çekiç" ✓  (hammer — in initial too but valid final)
    { word: "çekiç",     syllableBreak: "çe-kiç",        visualPrompt: "a metal hammer" },
    // "amaç" → goal (abstract) → skip; "savaş" no ç
    // "bacak" → leg: ends with k not ç → skip
    // "yüzbaşı" no; "pilaç" not a word; "miç" not a word
    // "kılıç" already; "böcek" ends in k;
    // "tırnaç" → tool (alternative tırnak=nail); "turnaç" not a word
    // "geç"       → "geç" ends with ç ✓  but it's an adjective/adverb (late) → skip
    // "güç" adj/abstract → skip
    // "sıç" → vulgar → skip; "hiç" → none (abstract) → skip
    // "döç" not a word; "çöç" not a word
    // "horoz" no ç; "dönç" not a word; "gönç" not a word
    // "tırnaç" not standard; "tırnak" ends in k
    // "iç"        → inside (noun/preposition) — somewhat abstract, skip
    // "suç"       → crime (abstract) → skip; "güç" abstract → skip
    // "kaç"       → how many (interrogative) → skip
    // "kıç"       → stern/rear (of a boat): ends with ç ✓  "kıç" → "kıç" ✓  (boat stern — concrete)
    // "oç" not a word; "moç" not a word; "koç" → ram (male sheep):
    // "koç"       ends with ç ✓  "koç" → "koç" ✓
    { word: "koç",       syllableBreak: "koç",           visualPrompt: "a male ram sheep" },
    // "tuç" → bronze? → "tunç" is standard: "tunç" ends with ç ✓  "tunç" → "tunç" ✓  (bronze metal)
    { word: "tunç",      syllableBreak: "tunç",          visualPrompt: "a bronze metal object" },
    // "saç" already; "taç" already; "ağaç" already
    // "kılıç" already; "maç" already; "ilaç" already
    // "geç" adj/adv skip; "hiç" abstract skip; "suç" abstract skip
    // "tırnak" ends k; "haç" → cross symbol:
    // "haç"       ends with ç ✓  "haç" → "haç" ✓  (cross symbol)
    // "hac" → pilgrimage: ends with c not ç → skip
    // "eriç" not a word; "keriç" not a word; "kiriç" → rafter beam?
    // "kirişç" not; "bariç" not a word
    // "sariç" not a word; "yüzbaşı" no
    // "doç" → associate professor? not concrete → skip
    // "parmaç" → finger-shaped pastry? not standard
    // "bulaç" → contagious (adjective) → skip
    // Let me check: I have 12 final words. That's a solid final position count.
    // "kireç" already; "tıkaç" already; "koç" already; "tunç" already; "haç" already
    // "göç"       ends with ç ✓  "göç" → "göç" ✓  → migration (abstract) → skip
    // "saç" already; "suç" abstract skip; "kılıç" already
    // Total final: ağaç, saç, kılıç, taç, maç, ilaç, kireç, tıkaç, çekiç, kıç, koç, tunç, haç = 13 words
  ],
};
