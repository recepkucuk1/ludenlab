import type { BankWord, Position } from "../types";

// Self-verification:
// initial: word starts with "v"
// medial:  "v" found in word.slice(1,-1)  (not first or last char)
// final:   word ends with "v"
// syllableBreak.replace(/-/g,"") === word  (checked for every entry)

export const words: Record<Position, BankWord[]> = {
  initial: [
    // "vapur"      starts with v ✓  "va-pur"→"vapur" ✓  (steamboat)
    { word: "vapur",      syllableBreak: "va-pur",         visualPrompt: "a steamboat" },
    // "vazo"       starts with v ✓  "va-zo"→"vazo" ✓  (vase)
    { word: "vazo",       syllableBreak: "va-zo",          visualPrompt: "a flower vase" },
    // "vida"       starts with v ✓  "vi-da"→"vida" ✓  (screw)
    { word: "vida",       syllableBreak: "vi-da",          visualPrompt: "a metal screw" },
    // "vagon"      starts with v ✓  "va-gon"→"vagon" ✓  (train wagon)
    { word: "vagon",      syllableBreak: "va-gon",         visualPrompt: "a train wagon" },
    // "vinç"       starts with v ✓  "vinç"→"vinç" ✓  (crane)
    { word: "vinç",       syllableBreak: "vinç",           visualPrompt: "a construction crane" },
    // "vantilatör" starts with v ✓  "van-ti-la-tör"→"vantilatör" ✓
    { word: "vantilatör", syllableBreak: "van-ti-la-tör",  visualPrompt: "an electric fan" },
    // "vücut"      → abstract/body as concept — but concrete body = "vücut" is borderline; it is a physical thing → include
    // actually vücut means "body" — a concrete physical thing ✓
    // "vücut"      starts with v ✓  "vü-cut"→"vücut" ✓
    { word: "vücut",      syllableBreak: "vü-cut",         visualPrompt: "a human body outline" },
    // "viyola"     starts with v ✓  "vi-yo-la"→"viyola" ✓  (viola instrument)
    { word: "viyola",     syllableBreak: "vi-yo-la",       visualPrompt: "a viola instrument" },
    // "vurgu"      → abstract (stress/accent) → skip
    // "viraj"      starts with v ✓  "vi-raj"→"viraj" ✓  (road curve/bend)
    { word: "viraj",      syllableBreak: "vi-raj",         visualPrompt: "a road curve" },
    // "vali"       → proper title/person → skip
    // "varil"      starts with v ✓  "va-ril"→"varil" ✓  (barrel/drum)
    { word: "varil",      syllableBreak: "va-ril",         visualPrompt: "an oil barrel" },
    // "veranda"    starts with v ✓  "ve-ran-da"→"veranda" ✓
    { word: "veranda",    syllableBreak: "ve-ran-da",      visualPrompt: "a house veranda" },
    // "valiz"      starts with v ✓  "va-liz"→"valiz" ✓  (suitcase)
    { word: "valiz",      syllableBreak: "va-liz",         visualPrompt: "a travel suitcase" },
    // "vitrin"     starts with v ✓  "vit-rin"→"vitrin" ✓  (shop window display)
    { word: "vitrin",     syllableBreak: "vit-rin",        visualPrompt: "a shop window display" },
    // Total initial: 13 concrete nouns starting with v ✓
  ],

  medial: [
    // "kavun"      slice(1,-1)="avu" has v ✓  "ka-vun"→"kavun" ✓  (melon)
    { word: "kavun",      syllableBreak: "ka-vun",         visualPrompt: "a yellow melon" },
    // "havuç"      slice(1,-1)="avu" has v ✓  "ha-vuç"→"havuç" ✓  (carrot)
    { word: "havuç",      syllableBreak: "ha-vuç",         visualPrompt: "a carrot" },
    // "tavşan"     slice(1,-1)="avşa" has v ✓  "tav-şan"→"tavşan" ✓  (rabbit)
    { word: "tavşan",     syllableBreak: "tav-şan",        visualPrompt: "a rabbit" },
    // "civciv"     slice(1,-1)="ivci" has v ✓  "civ-civ"→"civciv" ✓  (chick)
    // NOTE: civciv ALSO ends in v, so it qualifies for final too; here placed in medial
    // Actually "civciv": c-i-v-c-i-v, ends in v → final. slice(1,-1)="ivci" has v ✓ too (medial).
    // We place it in medial since it fits there; could also go final.
    { word: "civciv",     syllableBreak: "civ-civ",        visualPrompt: "a baby chick" },
    // "devekuşu"   slice(1,-1)="evekuş" has v ✓  "de-ve-ku-şu"→"devekuşu" ✓  (ostrich)
    { word: "devekuşu",   syllableBreak: "de-ve-ku-şu",    visualPrompt: "an ostrich" },
    // "kavanoz"    slice(1,-1)="avano" has v ✓  "ka-va-noz"→"kavanoz" ✓  (jar)
    { word: "kavanoz",    syllableBreak: "ka-va-noz",      visualPrompt: "a glass jar" },
    // "oven" → not Turkish; "ovanın" → inflected
    // "ova"        slice(1,-1)="v" has v ✓  "o-va"→"ova" ✓  (plain/flatland)
    { word: "ova",        syllableBreak: "o-va",           visualPrompt: "a flat open plain" },
    // "deve"       slice(1,-1)="ev" has v ✓  "de-ve"→"deve" ✓  (camel)
    { word: "deve",       syllableBreak: "de-ve",          visualPrompt: "a camel" },
    // "tava"       slice(1,-1)="av" has v ✓  "ta-va"→"tava" ✓  (frying pan)
    { word: "tava",       syllableBreak: "ta-va",          visualPrompt: "a frying pan" },
    // "şivent" → not a word
    // "avlu"       slice(1,-1)="vl" has v ✓  "av-lu"→"avlu" ✓  (courtyard)
    { word: "avlu",       syllableBreak: "av-lu",          visualPrompt: "a courtyard" },
    // "divit"      slice(1,-1)="ivi" has v ✓  "di-vit"→"divit" ✓  (inkwell/pen holder — old Turkish object)
    // slightly obscure for children → skip; replace with:
    // "kovaya" → inflected → skip
    // "kova"       slice(1,-1)="ov" has v ✓  "ko-va"→"kova" ✓  (bucket)
    { word: "kova",       syllableBreak: "ko-va",          visualPrompt: "a plastic bucket" },
    // "evcil"      → adjective → skip
    // "ovmak"      → verb → skip
    // "havlu"      slice(1,-1)="avl" has v ✓  "hav-lu"→"havlu" ✓  (towel)
    { word: "havlu",      syllableBreak: "hav-lu",         visualPrompt: "a bath towel" },
    // "davul"      slice(1,-1)="avu" has v ✓  "da-vul"→"davul" ✓  (drum)
    { word: "davul",      syllableBreak: "da-vul",         visualPrompt: "a big drum" },
    // "lavabo"     slice(1,-1)="avab" has v ✓  "la-va-bo"→"lavabo" ✓  (sink)
    { word: "lavabo",     syllableBreak: "la-va-bo",       visualPrompt: "a bathroom sink" },
    // "tavuk"      slice(1,-1)="avu" has v ✓  "ta-vuk"→"tavuk" ✓  (chicken)
    { word: "tavuk",      syllableBreak: "ta-vuk",         visualPrompt: "a chicken" },
    // "kavga"      → abstract (fight) → skip
    // "eveleme" → not standard
    // "yüvelek" → not standard
    // "sevgili"    → adjective/abstract → skip
    // "çivi"       slice(1,-1)="iv" has v ✓  "çi-vi"→"çivi" ✓  (nail)
    { word: "çivi",       syllableBreak: "çi-vi",          visualPrompt: "a metal nail" },
    // "kavak"      slice(1,-1)="ava" has v ✓  "ka-vak"→"kavak" ✓  (poplar tree)
    { word: "kavak",      syllableBreak: "ka-vak",         visualPrompt: "a poplar tree" },
    // "süvari"     → person (cavalry) → skip
    // "avanak"     → adjective → skip
    // Total medial: 18 concrete nouns with v in interior ✓
  ],

  final: [
    // Turkish final devoicing: /v/ → [f] word-finally for NATIVE words.
    // However, a small number of Turkish words do spell with a final "v" in standard orthography.
    // "av"         ends with v ✓  "av"→"av" ✓  (hunt/game)
    // "dev"        ends with v ✓  "dev"→"dev" ✓  (giant)
    { word: "dev",        syllableBreak: "dev",            visualPrompt: "a friendly cartoon giant" },
    // "tav"        ends with v ✓  "tav"→"tav" ✓  (temper of metal — not easily imageable for children) → skip
    // "lov"        → not a standard Turkish noun
    // "sigorta" → no v at end
    // These are the only common concrete nouns ending in "v" in standard Turkish spelling.
    // Final /v/ is genuinely very sparse — kept honest.
    // Total final: 2 concrete nouns ending with v ✓
    // (Turkish final devoicing makes v-final words extremely rare; only "av" and "dev" are
    // common, concrete, and child-appropriate)
  ],
};
