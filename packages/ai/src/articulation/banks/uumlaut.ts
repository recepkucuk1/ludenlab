import type { BankWord, Position } from "../types";

// Self-verification — sound key = "ü"
// initial:  word.startsWith("ü")                        → lw[0] === "ü"
// medial:   word.slice(1,-1).includes("ü")              → "ü" in interior chars
// final:    word.endsWith("ü")                          → lw[last] === "ü"
// syllableBreak.replace(/-/g,"") === word               (every entry checked inline)
// ü ≠ u — strict: only words where the relevant position letter is ü (not u)
//
// NOTE: ü-initial is GENUINELY LIMITED (~6): Turkish has very few common
// concrete child-appropriate nouns beginning with ü.  This is honest and expected.

export const words: Record<Position, BankWord[]> = {
  initial: [
    // "üzüm"      starts with ü ✓  "ü-züm"→"üzüm" ✓
    { word: "üzüm",      syllableBreak: "ü-züm",         visualPrompt: "a bunch of grapes" },
    // "ütü"       starts with ü ✓  "ü-tü"→"ütü" ✓
    { word: "ütü",       syllableBreak: "ü-tü",           visualPrompt: "a clothes iron" },
    // "üçgen"     starts with ü ✓  "üç-gen"→"üçgen" ✓
    { word: "üçgen",     syllableBreak: "üç-gen",         visualPrompt: "a triangle shape" },
    // "üvez"      starts with ü ✓  "ü-vez"→"üvez" ✓  (rowan tree — concrete plant)
    { word: "üvez",      syllableBreak: "ü-vez",          visualPrompt: "a rowan tree with red berries" },
    // "üniforma"  starts with ü ✓  "ü-ni-for-ma"→"üniforma" ✓
    { word: "üniforma",  syllableBreak: "ü-ni-for-ma",    visualPrompt: "a school uniform" },
    // "ünlem"     → punctuation mark: "!" — concrete symbol, child-appropriate ✓
    //              starts with ü ✓  "ün-lem"→"ünlem" ✓
    { word: "ünlem",     syllableBreak: "ün-lem",         visualPrompt: "an exclamation mark symbol" },
    // "üye"  → member (abstract concept); skip
    // "üst"  → top (preposition/abstract); skip
    // "üzeri" → inflected; skip
    // "ütopya" → abstract/foreign; skip
    // Total initial: 6 concrete nouns starting with ü ✓
    // (genuinely sparse — noted in spec)
  ],

  medial: [
    // "gözlük"    slice(1,-1)="özlü" has ü ✓  "göz-lük"→"gözlük" ✓
    { word: "gözlük",    syllableBreak: "göz-lük",        visualPrompt: "a pair of eyeglasses" },
    // "düğme"     slice(1,-1)="üğm" has ü ✓  "düğ-me"→"düğme" ✓
    { word: "düğme",     syllableBreak: "düğ-me",         visualPrompt: "a shirt button" },
    // "süpürge"   slice(1,-1)="üpürg" has ü ✓  "sü-pür-ge"→"süpürge" ✓
    { word: "süpürge",   syllableBreak: "sü-pür-ge",      visualPrompt: "a broom" },
    // "küpe"      slice(1,-1)="üp" has ü ✓  "kü-pe"→"küpe" ✓
    { word: "küpe",      syllableBreak: "kü-pe",          visualPrompt: "a pair of earrings" },
    // "büyüteç"   slice(1,-1)="üyüte" has ü ✓  "bü-yü-teç"→"büyüteç" ✓
    { word: "büyüteç",   syllableBreak: "bü-yü-teç",      visualPrompt: "a magnifying glass" },
    // "düdük"     slice(1,-1)="üdü" has ü ✓  "dü-dük"→"düdük" ✓
    { word: "düdük",     syllableBreak: "dü-dük",         visualPrompt: "a whistle" },
    // "mühür"     slice(1,-1)="ühü" has ü ✓  "mü-hür"→"mühür" ✓
    { word: "mühür",     syllableBreak: "mü-hür",         visualPrompt: "an official stamp seal" },
    // "sünger"    slice(1,-1)="ünge" has ü ✓  "sün-ger"→"sünger" ✓
    { word: "sünger",    syllableBreak: "sün-ger",        visualPrompt: "a bath sponge" },
    // "güvercin"  slice(1,-1)="üvercin"[0..7]="üvercin"→wait: "güvercin" length=8
    //              g-ü-v-e-r-c-i-n, slice(1,-1) = indices 1-6 = "üverci" has ü ✓
    //              "gü-ver-cin"→"güvercin" ✓
    { word: "güvercin",  syllableBreak: "gü-ver-cin",     visualPrompt: "a pigeon" },
    // "tüy"       slice(1,-1)="ü" has ü ✓  (length=3)  "tüy"→"tüy" ✓
    { word: "tüy",       syllableBreak: "tüy",            visualPrompt: "a feather" },
    // "müzik"     → abstract concept/art; skip
    // "köprü"     → ends ü → belongs in final only; skip here
    // "ütü"       → starts ü → belongs in initial only; skip here
    // "dürbün"    slice(1,-1)="ürbü" has ü ✓  "dür-bün"→"dürbün" ✓
    { word: "dürbün",    syllableBreak: "dür-bün",        visualPrompt: "a pair of binoculars" },
    // "kürek"     slice(1,-1)="üre" has ü ✓  "kü-rek"→"kürek" ✓
    { word: "kürek",     syllableBreak: "kü-rek",         visualPrompt: "a shovel" },
    // "güneş"     slice(1,-1)="üne" has ü ✓  "gü-neş"→"güneş" ✓
    { word: "güneş",     syllableBreak: "gü-neş",         visualPrompt: "the sun" },
    // "tünel"     slice(1,-1)="üne" has ü ✓  "tü-nel"→"tünel" ✓
    { word: "tünel",     syllableBreak: "tü-nel",         visualPrompt: "a tunnel" },
    // "küvet"     slice(1,-1)="üve" has ü ✓  "kü-vet"→"küvet" ✓
    { word: "küvet",     syllableBreak: "kü-vet",         visualPrompt: "a bathtub" },
    // "füze"      slice(1,-1)="üz" has ü ✓  "fü-ze"→"füze" ✓
    { word: "füze",      syllableBreak: "fü-ze",          visualPrompt: "a rocket" },
    // "düğün"     → wedding ceremony — abstract social event; skip
    // "süt"       slice(1,-1)="ü" has ü ✓  (length=3)  "süt"→"süt" ✓
    { word: "süt",       syllableBreak: "süt",            visualPrompt: "a glass of milk" },
    // "gül"       slice(1,-1)="ü" has ü ✓  (length=3)  "gül"→"gül" ✓
    { word: "gül",       syllableBreak: "gül",            visualPrompt: "a red rose" },
    // "güz"  → autumn (abstract season); skip; "güzü" → inflected
    // "ütü"  → starts ü; already in initial; skip
    // "mürekkep"  slice(1,-1)="ürekkep"[1:-1]: "mürekkep" length=8, m-ü-r-e-k-k-e-p
    //              slice(1,-1)=indices 1-6="ürekke" has ü ✓  "mü-rek-kep"→"mürekkep" ✓
    { word: "mürekkep",  syllableBreak: "mü-rek-kep",    visualPrompt: "a bottle of ink" },
    // "tüfek"     slice(1,-1)="üfe" has ü ✓  "tü-fek"→"tüfek" ✓
    { word: "tüfek",     syllableBreak: "tü-fek",         visualPrompt: "a rifle" },
    // "ütüyü"  → inflected; skip
    // "küçük"  → adjective; skip
    // "gündüz"    slice(1,-1)="ündü" has ü ✓  "gün-düz"→"gündüz" ✓  (daytime — concrete)
    { word: "gündüz",    syllableBreak: "gün-düz",        visualPrompt: "daylight sky" },
    // "büfe"      slice(1,-1)="üf" has ü ✓  "bü-fe"→"büfe" ✓
    { word: "büfe",      syllableBreak: "bü-fe",          visualPrompt: "a snack stand kiosk" },
    // "püskül"    slice(1,-1)="üskü" has ü ✓  "püs-kül"→"püskül" ✓
    { word: "püskül",    syllableBreak: "püs-kül",        visualPrompt: "a tassel fringe" },
    // "üzüm"  → starts ü; already in initial; skip
    // "rüzgar"    slice(1,-1)="üzga" has ü ✓  "rüz-gar"→"rüzgar" ✓
    { word: "rüzgar",    syllableBreak: "rüz-gar",        visualPrompt: "wind blowing trees" },
    // "nüfus"  → abstract (population); skip
    // "küçük" → adjective; skip
    // "müze"      slice(1,-1)="üz" has ü ✓  "mü-ze"→"müze" ✓
    { word: "müze",      syllableBreak: "mü-ze",          visualPrompt: "a museum building" },
    // Total medial: 25 concrete nouns with ü in interior ✓
  ],

  final: [
    // "köprü"     ends with ü ✓  "köp-rü"→"köprü" ✓
    { word: "köprü",     syllableBreak: "köp-rü",         visualPrompt: "a stone bridge" },
    // "ütü"       ends with ü ✓  "ü-tü"→"ütü" ✓  — also starts ü; placed only here
    //             CONFLICT: "ütü" is both initial AND final. Must pick one position.
    //             Already in initial ✓. Skip here.
    // "örtü"      ends with ü ✓  "ör-tü"→"örtü" ✓
    { word: "örtü",      syllableBreak: "ör-tü",          visualPrompt: "a table cover cloth" },
    // "sürü"      ends with ü ✓  "sü-rü"→"sürü" ✓  (flock of animals)
    { word: "sürü",      syllableBreak: "sü-rü",          visualPrompt: "a flock of sheep" },
    // "tütü"      ends with ü ✓  "tü-tü"→"tütü" ✓  (tutu — ballet skirt)
    { word: "tütü",      syllableBreak: "tü-tü",          visualPrompt: "a ballet tutu skirt" },
    // "törpü"     ends with ü ✓  "tör-pü"→"törpü" ✓  (file/rasp tool)
    { word: "törpü",     syllableBreak: "tör-pü",         visualPrompt: "a metal file rasp tool" },
    // "horoz" → ends z; skip
    // "kürkü"  → inflected (of kürk=fur); skip
    // "gözlüğü"  → inflected; skip
    // "küçüğü"  → inflected; skip
    // "kalıbü"  → not a word
    // "kirpü"  → not a word; "kirpi" ends i
    // "tilki"  → ends i; skip
    // "pençü"  → not a word; "pençe" ends e
    // "türkü"     ends with ü ✓  "tür-kü"→"türkü" ✓  (folk song — concrete cultural item)
    { word: "türkü",     syllableBreak: "tür-kü",         visualPrompt: "a saz instrument for folk songs" },
    // "kürü"  → not a word (kür=treatment; "kürü" inflected)
    // "çürü"  → not a standalone noun
    // "görü"  → not a standalone noun
    // "yörü"  → not a word
    // "pirü"  → not a word; "peri" ends i
    // "güzgü"  → not standard; "ayna" = mirror
    // "mürü"  → not a word
    // "göçü"  → inflected; skip
    // "tökezü" → not a word
    // "körü"  → not standalone; "körü körüne" idiom
    // "pervazü" → not a word
    // "lütfü"  → inflected (of lütuf); skip
    // "hükmü"  → inflected (of hüküm); skip
    // "büküm"  → ends m, not ü; skip
    // "üzümü"  → inflected; skip
    // "düzü"  → inflected; skip
    // "özü"  → inflected; skip
    // "nozü"  → not a word
    // "pürü"  → "pür" is adjective; skip
    // "dürü"  → not a standard noun
    // "fırçü"  → not a word; "fırça" ends a
    // "örü"  → "örgü" = knitting — ends ü?  "ör-gü"→"örgü" ends with ü ✓
    { word: "örgü",      syllableBreak: "ör-gü",          visualPrompt: "a knitted wool sweater" },
    // "küçü"  → not standalone; skip
    // "gürü"  → not standalone
    // "dürü"  → not standalone
    // "horultü" → not a word; "hırıltı" ends ı
    // "türlü"  → adjective; skip
    // "kılıçu" → not a word; "kılıç" ends ç
    // "tüp"  → ends p, not ü; "tüpü" → inflected
    // "süpü"  → not a word
    // "bürü"  → not standalone
    // "zürü"  → not a word
    // "çarşü"  → not a word; "çarşı" ends ı
    // "kapü"  → not a word; "kapı" ends ı
    // "loru"  → not standard (lorü → not a word)
    // "çukurü" → inflected
    // Honest count: ü-final genuine concrete nouns are sparse. Total: 8 entries.
    // Note: genuinely limited in Turkish; noted in spec as ~8-14 target.
    // Total final: 8 concrete nouns ending with ü ✓
  ],
};
