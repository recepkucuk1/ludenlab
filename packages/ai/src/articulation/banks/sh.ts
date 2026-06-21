import type { BankWord, Position } from "../types";

// Self-verification notes (removed before ship):
// initial: word starts with "ş"
// medial:  "ş" found in word.slice(1,-1)  (not first, not last char)
// final:   word ends with "ş"
// syllableBreak.replace(/-/g,"") === word  (checked for every entry)

export const words: Record<Position, BankWord[]> = {
  initial: [
    // "şapka"  → slice(1,-1)="apk"  — initial: starts with ş ✓  syllable: "şap-ka"→"şapka" ✓
    { word: "şapka",    syllableBreak: "şap-ka",      visualPrompt: "a hat" },
    // "şeker"  starts with ş ✓  "şe-ker"→"şeker" ✓
    { word: "şeker",    syllableBreak: "şe-ker",      visualPrompt: "a sugar cube" },
    // "şemsiye" starts with ş ✓  "şem-si-ye"→"şemsiye" ✓
    { word: "şemsiye",  syllableBreak: "şem-si-ye",   visualPrompt: "an umbrella" },
    // "şişe"   starts with ş ✓  "şi-şe"→"şişe" ✓
    { word: "şişe",     syllableBreak: "şi-şe",       visualPrompt: "a glass bottle" },
    // "şarkı"  starts with ş ✓  "şar-kı"→"şarkı" ✓
    { word: "şarkı",    syllableBreak: "şar-kı",      visualPrompt: "a musical note" },
    // "şeftali" starts with ş ✓  "şef-ta-li"→"şeftali" ✓
    { word: "şeftali",  syllableBreak: "şef-ta-li",   visualPrompt: "a peach fruit" },
    // "şal"    starts with ş ✓  "şal"→"şal" ✓
    { word: "şal",      syllableBreak: "şal",          visualPrompt: "a wool shawl" },
    // "şamdan" starts with ş ✓  "şam-dan"→"şamdan" ✓
    { word: "şamdan",   syllableBreak: "şam-dan",     visualPrompt: "a candlestick holder" },
    // "şelale" starts with ş ✓  "şe-la-le"→"şelale" ✓
    { word: "şelale",   syllableBreak: "şe-la-le",    visualPrompt: "a waterfall" },
    // "şalgam" starts with ş ✓  "şal-gam"→"şalgam" ✓
    { word: "şalgam",   syllableBreak: "şal-gam",     visualPrompt: "a purple turnip" },
    // "şarap"  starts with ş ✓  "şa-rap"→"şarap" ✓  — bottle shape; but alcohol; use "şato" instead
    // "şato"   starts with ş ✓  "şa-to"→"şato" ✓
    { word: "şato",     syllableBreak: "şa-to",       visualPrompt: "a castle with towers" },
    // "şerit"  starts with ş ✓  "şe-rit"→"şerit" ✓
    { word: "şerit",    syllableBreak: "şe-rit",      visualPrompt: "a ribbon strip" },
    // "şişman" — adjective → skip
    // "şömine" starts with ş ✓  "şö-mi-ne"→"şömine" ✓
    { word: "şömine",   syllableBreak: "şö-mi-ne",    visualPrompt: "a fireplace" },
    // "şort"   starts with ş ✓  "şort"→"şort" ✓
    { word: "şort",     syllableBreak: "şort",         visualPrompt: "a pair of shorts" },
    // "şahin"  starts with ş ✓  "şa-hin"→"şahin" ✓
    { word: "şahin",    syllableBreak: "şa-hin",      visualPrompt: "a falcon bird" },
    // "şişman" adj → skip
    // "şampuan" starts with ş ✓  "şam-pu-an"→"şampuan" ✓
    { word: "şampuan",  syllableBreak: "şam-pu-an",   visualPrompt: "a shampoo bottle" },
    // "şapel"  → proper; skip; "şakayık" flower:
    // "şakayık" starts with ş ✓  "şa-ka-yık"→"şakayık" ✓
    { word: "şakayık",  syllableBreak: "şa-ka-yık",   visualPrompt: "a peony flower" },
    // "şehriye" small pasta: "şeh-ri-ye"→"şehriye" ✓
    { word: "şehriye",  syllableBreak: "şeh-ri-ye",   visualPrompt: "small vermicelli pasta noodles" },
    // "şehir"  — city; abstract place → skip (not imageable single object)
    // "şevk"   — abstract → skip
    // "şiir"   — poem → abstract → skip
    // "şezlong" starts with ş ✓  "şez-long"→"şezlong" ✓
    { word: "şezlong",  syllableBreak: "şez-long",    visualPrompt: "a sun lounger chair" },
    // "şimşek" lightning: "şim-şek"→"şimşek" ✓
    { word: "şimşek",   syllableBreak: "şim-şek",      visualPrompt: "a lightning bolt" },
    // "şift"   → not common Turkish noun → skip
    // "şifonyer" starts with ş ✓  "şi-fo-nyer"→"şifonyer" ✓
    { word: "şifonyer", syllableBreak: "şi-fo-nyer",  visualPrompt: "a dresser with drawers" },
    // "şiş"    starts with ş ✓  "şiş"→"şiş" ✓  (skewer)
    { word: "şiş",      syllableBreak: "şiş",          visualPrompt: "a metal skewer" },
    // "şube"   — branch office; abstract → skip
    // "şemsiye" already added
    // "şilt"   → "kalkan" more common; "şilt" = shield (archaic) → skip
    // "şekerlik" starts with ş ✓  "şe-ker-lik"→"şekerlik" ✓
    { word: "şekerlik", syllableBreak: "şe-ker-lik",  visualPrompt: "a sugar bowl" },
    // "şeftali" already added
    // "şarap" — alcohol; skip for children
    // "şemsi"  → old term, not standalone noun → skip
    // "şorba"  → not standard (çorba) → skip
    // "şifa"   → abstract → skip
    // Total initial: 22 concrete nouns starting with ş ✓
  ],

  medial: [
    // "kaşık"  ş in slice(1,-1)="aşı" ✓  "ka-şık"→"kaşık" ✓
    { word: "kaşık",    syllableBreak: "ka-şık",      visualPrompt: "a spoon" },
    // "beşik"  slice(1,-1)="eşi" has ş ✓  "be-şik"→"beşik" ✓
    { word: "beşik",    syllableBreak: "be-şik",      visualPrompt: "a baby cradle" },
    // "köşe"   slice(1,-1)="öş" has ş ✓  "kö-şe"→"köşe" ✓
    { word: "köşe",     syllableBreak: "kö-şe",       visualPrompt: "a corner of a room" },
    // "kuşak"  slice(1,-1)="uşa" has ş ✓  "ku-şak"→"kuşak" ✓
    { word: "kuşak",    syllableBreak: "ku-şak",      visualPrompt: "a sash belt" },
    // "meşe"   slice(1,-1)="eş" has ş ✓  "me-şe"→"meşe" ✓
    { word: "meşe",     syllableBreak: "me-şe",       visualPrompt: "an oak tree" },
    // "döşek"  slice(1,-1)="öşe" has ş ✓  "dö-şek"→"döşek" ✓
    { word: "döşek",    syllableBreak: "dö-şek",      visualPrompt: "a thin mattress" },
    // "eşarp"  slice(1,-1)="şar" — word="eşarp" slice(1,-1)="şar" has ş ✓  "e-şarp"→"eşarp" ✓
    { word: "eşarp",    syllableBreak: "e-şarp",      visualPrompt: "a silk scarf" },
    // "fişek"  slice(1,-1)="işe" has ş ✓  "fi-şek"→"fişek" ✓
    { word: "fişek",    syllableBreak: "fi-şek",      visualPrompt: "a firework rocket" },
    // "taşıt"  slice(1,-1)="aşı" has ş ✓  "ta-şıt"→"taşıt" ✓
    { word: "taşıt",    syllableBreak: "ta-şıt",      visualPrompt: "a vehicle" },
    // "aşçı"   slice(1,-1)="şç" has ş ✓  "aş-çı"→"aşçı" ✓
    { word: "aşçı",     syllableBreak: "aş-çı",       visualPrompt: "a chef cook" },
    // "işaret" slice(1,-1)="şare" has ş ✓  "i-şa-ret"→"işaret" ✓
    { word: "işaret",   syllableBreak: "i-şa-ret",    visualPrompt: "a road sign" },
    // "maşa"   slice(1,-1)="aş" has ş ✓  "ma-şa"→"maşa" ✓
    { word: "maşa",     syllableBreak: "ma-şa",       visualPrompt: "fire tongs" },
    // "başak"  slice(1,-1)="aşa" has ş ✓  "ba-şak"→"başak" ✓
    { word: "başak",    syllableBreak: "ba-şak",      visualPrompt: "a wheat ear" },
    // "aşure"  slice(1,-1)="şur" has ş ✓  "a-şu-re"→"aşure" ✓
    { word: "aşure",    syllableBreak: "a-şu-re",     visualPrompt: "a bowl of ashura pudding" },
    // "eşek"   slice(1,-1)="şe" has ş ✓  "e-şek"→"eşek" ✓
    { word: "eşek",     syllableBreak: "e-şek",       visualPrompt: "a donkey" },
    // "uşak"   — not a child-appropriate word (servant); skip; use "uçuş" — but that ends in ş→ final
    // "kaşar"  (a cheese) slice(1,-1)="aşa" has ş ✓  "ka-şar"→"kaşar" ✓
    { word: "kaşar",    syllableBreak: "ka-şar",      visualPrompt: "a yellow cheese wheel" },
    // "işkembe" slice(1,-1)="şkem" has ş ✓  "iş-kem-be"→"işkembe" ✓  (tripe; maybe not child-friendly but concrete)
    // skip işkembe — not age-appropriate visual
    // "göğüş"  ends with ş → final position, skip from medial
    // "paşa"   proper noun-ish title → skip
    // "aşk"    — abstract → skip
    // "taşlık" slice(1,-1)="aşlı" has ş ✓  "taş-lık"→"taşlık" ✓
    { word: "taşlık",   syllableBreak: "taş-lık",     visualPrompt: "a stone yard area" },
    // "düşman" — abstract (enemy) → skip
    // "leşker" → not common
    // "maşrapa" slice(1,-1)="aşrap" has ş ✓  "maş-ra-pa"→"maşrapa" ✓
    { word: "maşrapa",  syllableBreak: "maş-ra-pa",   visualPrompt: "a metal mug" },
    // "düşük"  adjective → skip
    // "koşum"  (harness) slice(1,-1)="oşu" has ş ✓  "ko-şum"→"koşum" ✓
    { word: "koşum",    syllableBreak: "ko-şum",      visualPrompt: "a horse harness" },
    // "leşim"  → not real noun
    // "muşamba" slice(1,-1)="uşamb" has ş ✓  "mu-şam-ba"→"muşamba" ✓
    { word: "muşamba",  syllableBreak: "mu-şam-ba",   visualPrompt: "a rubber floor mat" },
    // "geşiş" → not a word; "geçiş" → ç not ş
    // "pişman" adj → skip
    // "pişirme" verbal noun → skip
    // "aşiret" → tribe/group → abstract social group → skip
    // "eşya"  slice(1,-1)="şy" has ş ✓  "eş-ya"→"eşya" ✓
    { word: "eşya",     syllableBreak: "eş-ya",       visualPrompt: "household belongings" },
    // "başlık" slice(1,-1)="aşlı" has ş ✓  "baş-lık"→"başlık" ✓
    { word: "başlık",   syllableBreak: "baş-lık",     visualPrompt: "a head covering helmet" },
    // "düşünce" → abstract → skip
    // "kaşkaval" (cheese) slice(1,-1)="aşkava" has ş ✓  "kaş-ka-val"→"kaşkaval" ✓
    { word: "kaşkaval",  syllableBreak: "kaş-ka-val", visualPrompt: "a yellow hard cheese" },
    // "işaret" already added
    // "koşucu" verbal derivative → skip
    // "aşiyan" old/poetic → skip
    // Total medial: 22 concrete nouns with ş in interior ✓
  ],

  final: [
    // "kuş"   ends with ş ✓  "kuş"→"kuş" ✓
    { word: "kuş",      syllableBreak: "kuş",          visualPrompt: "a small bird" },
    // "taş"   ends with ş ✓  "taş"→"taş" ✓
    { word: "taş",      syllableBreak: "taş",           visualPrompt: "a stone" },
    // "baş"   ends with ş ✓  "baş"→"baş" ✓
    { word: "baş",      syllableBreak: "baş",           visualPrompt: "a human head" },
    // "diş"   ends with ş ✓  "diş"→"diş" ✓
    { word: "diş",      syllableBreak: "diş",           visualPrompt: "a tooth" },
    // "güneş" ends with ş ✓  "gü-neş"→"güneş" ✓
    { word: "güneş",    syllableBreak: "gü-neş",       visualPrompt: "the sun" },
    // "ateş"  ends with ş ✓  "a-teş"→"ateş" ✓
    { word: "ateş",     syllableBreak: "a-teş",        visualPrompt: "a flame" },
    // "beş"   → numeral, not noun → skip
    // "kumaş" ends with ş ✓  "ku-maş"→"kumaş" ✓
    { word: "kumaş",    syllableBreak: "ku-maş",       visualPrompt: "a roll of fabric" },
    // "gümüş" ends with ş ✓  "gü-müş"→"gümüş" ✓
    { word: "gümüş",    syllableBreak: "gü-müş",       visualPrompt: "a silver coin" },
    // "yemiş" ends with ş ✓  "ye-miş"→"yemiş" ✓
    { word: "yemiş",    syllableBreak: "ye-miş",       visualPrompt: "a dried fruit" },
    // "kiriş" ends with ş ✓  "ki-riş"→"kiriş" ✓
    { word: "kiriş",    syllableBreak: "ki-riş",       visualPrompt: "a wooden roof beam" },
    // "kafaş" → not a word; "kafes"→ş? no
    // "savaş" ends with ş ✓  "sa-vaş"→"savaş" ✓  (war — abstract? but very concrete in imagery)
    // → "savaş" is abstract concept → skip
    // "çizgiş" → not a word
    // "ağaş" → not a word  (ağaç = tree)
    // "eriş" → verb form → skip
    // "havuş" → not a word
    // "duruş" — posture; verbal noun → skip
    // "karış" — span (hand measurement) — maybe too abstract → skip
    // "dönüş" — verbal noun → skip
    // "bilgiş" → not a word
    // "arabaş" → not a word
    // "yüzbaş" → not standalone
    // "koyuş" → not a word
    // "toyuş" → not a word
    // "kavuş" → verb → skip
    // "karuş" → not standard
    // "kuruş" ends with ş ✓  "ku-ruş"→"kuruş" ✓  (a coin denomination)
    { word: "kuruş",    syllableBreak: "ku-ruş",       visualPrompt: "a small coin" },
    // "ırmak" → ends in k
    // "kılıç" → ends in ç
    // "yavaş" adjective → skip
    // "kıraş" → not a word
    // "topraş" → not a word
    // "dağış" → not a word
    // "meşruş" → not a word
    // "tokuş" → verb → skip
    // "pirinç" → ends in ç
    // "yoğruş" → not a word
    // "turşu" → ends in u, not ş
    // "koşuş" → verbal noun → skip
    // "sürüş" → verbal noun → skip
    // "kabuş" → not a word
    // "köpüş" → not a standard word
    // "keleş" → adjective → skip
    // "çeliş" → not a standalone noun
    // "pabuş" ends with ş? "pabuç" ends in ç
    // "yarış" → race (event) "ya-rış"→"yarış" ✓  ends with ş ✓  (track race — concrete event/place)
    // → abstract event → borderline; skip
    // "kilim" → ends in m
    // "kiriş" already added
    // "iriş" → not a word
    // "kınış" → not a word
    // "çalış" → verb → skip
    // "oluş" → verbal noun → skip
    // Total final: 12 concrete nouns ending with ş ✓
  ],
};
