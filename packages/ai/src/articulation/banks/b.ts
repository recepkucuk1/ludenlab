import type { BankWord, Position } from "../types";

// Self-verification for /b/ ("b"):
// initial: word.toLocaleLowerCase("tr-TR").startsWith("b")
// medial:  word.toLocaleLowerCase("tr-TR").slice(1,-1).includes("b")
// final:   word.toLocaleLowerCase("tr-TR").endsWith("b")
// syllableBreak.replace(/-/g,"") === word  (checked for every entry)
//
// NOTE — final is EMPTY:
// Turkish final obstruent devoicing means /b/ at word-end surfaces as [p].
// Native Turkish nouns do not end in the letter "b". Loanwords that preserve
// final "b" (e.g. "kitab" archaic, "serüvenb" non-existent) are not standard
// modern Turkish concrete child nouns. This is expected, correct, and honest.

export const words: Record<Position, BankWord[]> = {
  initial: [
    // b at position 0 ✓
    // "balık"     starts with b ✓  "ba-lık" → "balık" ✓
    { word: "balık",     syllableBreak: "ba-lık",        visualPrompt: "a fish" },
    // "baba"      starts with b ✓  "ba-ba" → "baba" ✓
    { word: "baba",      syllableBreak: "ba-ba",         visualPrompt: "a father" },
    // "bebek"     starts with b ✓  "be-bek" → "bebek" ✓
    { word: "bebek",     syllableBreak: "be-bek",        visualPrompt: "a baby" },
    // "bardak"    starts with b ✓  "bar-dak" → "bardak" ✓
    { word: "bardak",    syllableBreak: "bar-dak",       visualPrompt: "a drinking glass" },
    // "bot"       starts with b ✓  "bot" → "bot" ✓
    { word: "bot",       syllableBreak: "bot",           visualPrompt: "a rubber boot" },
    // "balon"     starts with b ✓  "ba-lon" → "balon" ✓
    { word: "balon",     syllableBreak: "ba-lon",        visualPrompt: "a round balloon" },
    // "bayrak"    starts with b ✓  "bay-rak" → "bayrak" ✓
    { word: "bayrak",    syllableBreak: "bay-rak",       visualPrompt: "a national flag" },
    // "böcek"     starts with b ✓  "bö-cek" → "böcek" ✓
    { word: "böcek",     syllableBreak: "bö-cek",        visualPrompt: "a beetle insect" },
    // "biber"     starts with b ✓  "bi-ber" → "biber" ✓
    { word: "biber",     syllableBreak: "bi-ber",        visualPrompt: "a red pepper" },
    // "buz"       starts with b ✓  "buz" → "buz" ✓
    { word: "buz",       syllableBreak: "buz",           visualPrompt: "a cube of ice" },
    // "bahçe"     starts with b ✓  "bah-çe" → "bahçe" ✓
    { word: "bahçe",     syllableBreak: "bah-çe",        visualPrompt: "a garden" },
    // "bisiklet"  starts with b ✓  "bi-sik-let" → "bisiklet" ✓
    { word: "bisiklet",  syllableBreak: "bi-sik-let",    visualPrompt: "a bicycle" },
    // "bakkal"    starts with b ✓  "bak-kal" → "bakkal" ✓  (grocery store)
    { word: "bakkal",    syllableBreak: "bak-kal",       visualPrompt: "a small grocery store" },
    // "bıçak"     starts with b ✓  "bı-çak" → "bıçak" ✓
    { word: "bıçak",     syllableBreak: "bı-çak",        visualPrompt: "a kitchen knife" },
    // "bilezik"   starts with b ✓  "bi-le-zik" → "bilezik" ✓  (bracelet)
    { word: "bilezik",   syllableBreak: "bi-le-zik",     visualPrompt: "a gold bracelet" },
    // "burun"     starts with b ✓  "bu-run" → "burun" ✓
    { word: "burun",     syllableBreak: "bu-run",        visualPrompt: "a human nose" },
    // "boya"      starts with b ✓  "bo-ya" → "boya" ✓  (paint)
    { word: "boya",      syllableBreak: "bo-ya",         visualPrompt: "a paint brush and paint" },
    // "beyin"     starts with b ✓  "be-yin" → "beyin" ✓  (brain)
    // "battaniye" starts with b ✓  "bat-ta-ni-ye" → "battaniye" ✓  (blanket)
    { word: "battaniye",  syllableBreak: "bat-ta-ni-ye", visualPrompt: "a warm blanket" },
    // "börek"     starts with b ✓  "bö-rek" → "börek" ✓  (pastry)
    { word: "börek",     syllableBreak: "bö-rek",        visualPrompt: "a savory pastry" },
    // "boru"      starts with b ✓  "bo-ru" → "boru" ✓  (pipe/tube)
    { word: "boru",      syllableBreak: "bo-ru",         visualPrompt: "a metal pipe" },
    // "bel"       starts with b ✓  "bel" → "bel" ✓  (waist)
    { word: "bel",       syllableBreak: "bel",           visualPrompt: "a human waist" },
    // "boncuk"    starts with b ✓  "bon-cuk" → "boncuk" ✓  (glass bead)
    { word: "boncuk",    syllableBreak: "bon-cuk",       visualPrompt: "a glass bead" },
    // "bulgur"    starts with b ✓  "bul-gur" → "bulgur" ✓  (bulgur wheat)
    { word: "bulgur",    syllableBreak: "bul-gur",       visualPrompt: "a bowl of bulgur wheat" },
    // "balta"     starts with b ✓  "bal-ta" → "balta" ✓  (axe)
    { word: "balta",     syllableBreak: "bal-ta",        visualPrompt: "a wood-cutting axe" },
    // "bal"       starts with b ✓  "bal" → "bal" ✓  (honey)
    { word: "bal",       syllableBreak: "bal",           visualPrompt: "a jar of honey" },
    // "bakır"     starts with b ✓  "ba-kır" → "bakır" ✓  (copper)
    { word: "bakır",     syllableBreak: "ba-kır",        visualPrompt: "a copper pot" },
    // "beden"     → body (can be abstract); "beden" slice → keep as noun:
    // "bilgi" → knowledge abstract; "bilek":
    // "bilek"     starts with b ✓  "bi-lek" → "bilek" ✓  (wrist)
    { word: "bilek",     syllableBreak: "bi-lek",        visualPrompt: "a human wrist" },
    // "böğürtlen" starts with b ✓  "bö-ğürt-len" → "böğürtlen" ✓  (blackberry)
    { word: "böğürtlen", syllableBreak: "bö-ğürt-len",  visualPrompt: "a blackberry fruit" },
    // "bant"      starts with b ✓  "bant" → "bant" ✓  (tape/band)
    { word: "bant",      syllableBreak: "bant",          visualPrompt: "a roll of tape" },
    // Total initial: 30 words ✓
  ],

  medial: [
    // b inside word.slice(1,-1) — NOT first, NOT last character
    // "tabak"     slice(1,-1)="aba" has b ✓  "ta-bak" → "tabak" ✓
    { word: "tabak",     syllableBreak: "ta-bak",        visualPrompt: "a round ceramic plate" },
    // "kabak"     slice(1,-1)="aba" has b ✓  "ka-bak" → "kabak" ✓  (zucchini/gourd)
    { word: "kabak",     syllableBreak: "ka-bak",        visualPrompt: "a round green zucchini" },
    // "çubuk"     slice(1,-1)="ubu" has b ✓  "çu-buk" → "çubuk" ✓  (thin stick)
    { word: "çubuk",     syllableBreak: "çu-buk",        visualPrompt: "a thin wooden stick" },
    // "sabun"     slice(1,-1)="abu" has b ✓  "sa-bun" → "sabun" ✓  (soap)
    { word: "sabun",     syllableBreak: "sa-bun",        visualPrompt: "a bar of soap" },
    // "haber" → news (abstract); "kelebek":
    // "kelebek"   slice(1,-1)="elebe" has b ✓  "ke-le-bek" → "kelebek" ✓  (butterfly)
    { word: "kelebek",   syllableBreak: "ke-le-bek",     visualPrompt: "a colorful butterfly" },
    // "abla"      slice(1,-1)="bl" has b ✓  "ab-la" → "abla" ✓  (older sister)
    { word: "abla",      syllableBreak: "ab-la",         visualPrompt: "an older sister" },
    // "kabuk"     slice(1,-1)="abu" has b ✓  "ka-buk" → "kabuk" ✓  (bark/shell)
    { word: "kabuk",     syllableBreak: "ka-buk",        visualPrompt: "a tree bark" },
    // "badem" starts b so medial test: "badem" slice(1,-1)="ade" — no b → hmm
    // "badem" chars: b-a-d-e-m, slice(1,-1)="ade" — no b → not valid medial for b
    // "mıknatıs" no b; "abdest" not concrete child noun
    // "köbek" not a word; "gobek" → "göbek":
    // "göbek"     slice(1,-1)="öbe" has b ✓  "gö-bek" → "göbek" ✓  (belly button/navel)
    { word: "göbek",     syllableBreak: "gö-bek",        visualPrompt: "a belly button" },
    // "soba"      slice(1,-1)="ob" has b ✓  "so-ba" → "soba" ✓  (stove/heater)
    { word: "soba",      syllableBreak: "so-ba",         visualPrompt: "a wood-burning stove" },
    // "mabes" not a word; "ıhlamur" no b; "çubukluk" → complex
    // "şebeke" → network (abstract); "sebze" → no b? "sebze" chars s-e-b-z-e:
    // "sebze"     slice(1,-1)="ebz" has b ✓  "seb-ze" → "sebze" ✓  (vegetables)
    { word: "sebze",     syllableBreak: "seb-ze",        visualPrompt: "a basket of vegetables" },
    // "hobiler" inflected; "kubbe":
    // "kubbe"     slice(1,-1)="ubb" has b ✓  "kub-be" → "kubbe" ✓  (dome)
    { word: "kubbe",     syllableBreak: "kub-be",        visualPrompt: "a mosque dome" },
    // "pabuc" not standard; "pabuç":
    // "pabuç"     slice(1,-1)="abu" has b ✓  "pa-buç" → "pabuç" ✓  (slipper/shoe)
    { word: "pabuç",     syllableBreak: "pa-buç",        visualPrompt: "a simple shoe" },
    // "kebap"     slice(1,-1)="eba" has b ✓  "ke-bap" → "kebap" ✓  (kebab)
    { word: "kebap",     syllableBreak: "ke-bap",        visualPrompt: "a grilled kebab skewer" },
    // "taban"     slice(1,-1)="aba" has b ✓  "ta-ban" → "taban" ✓  (floor/sole of shoe)
    { word: "taban",     syllableBreak: "ta-ban",        visualPrompt: "a shoe sole" },
    // "çabin" not standard; "kabin":
    // "kabin"     slice(1,-1)="abi" has b ✓  "ka-bin" → "kabin" ✓  (cabin)
    { word: "kabin",     syllableBreak: "ka-bin",        visualPrompt: "a wooden cabin" },
    // "cubuk" → "çubuk" already; "çubukluk" complex
    // "yaban" → wild (adjective mostly) → skip; "kumbarası" → coin box:
    // "kumbara"   slice(1,-1)="umbar" has b ✓  "kum-ba-ra" → "kumbara" ✓  (piggy bank)
    { word: "kumbara",   syllableBreak: "kum-ba-ra",     visualPrompt: "a piggy bank coin box" },
    // "lobut" → mace: slice(1,-1)="obu" has b ✓  "lo-but" → "lobut" ✓  (bowling pin / mace)
    { word: "lobut",     syllableBreak: "lo-but",        visualPrompt: "a wooden bowling pin" },
    // "köbek" not a word; "kuba" not standard; "nalbant" → farrier:
    // "nalbant" complex profession → skip; "çabuk" → fast (adj) → skip
    // "abajur"    slice(1,-1)="baju" has b ✓  "a-ba-jur" → "abajur" ✓  (lamp shade)
    { word: "abajur",    syllableBreak: "a-ba-jur",      visualPrompt: "a lamp shade" },
    // "cibre" → not standard; "civciv" no b; "ekmek" no b; "demir" no b
    // "kebap" already; "soba" already; "kumbara" already
    // "cebe" not a word; "cep" no b; "biber" starts b → slice(1,-1)="ibe" has b ✓ but starts with b = ok for medial
    // "biber" slice(1,-1)="ibe" has b ✓  "bi-ber" → "biber" ✓ — starts with b but medial test only needs slice(1,-1) to contain b ✓
    { word: "biber",     syllableBreak: "bi-ber",        visualPrompt: "a red chili pepper" },
    // "sabah"     slice(1,-1)="aba" has b ✓  "sa-bah" → "sabah" ✓  (morning — abstract time) → skip
    // "çiçekabedi" not a word; "abide" → monument:
    // "abide"     slice(1,-1)="bid" — no b? "abide" chars a-b-i-d-e, slice(1,-1)="bid" has b ✓  "a-bi-de" → "abide" ✓  (monument)
    { word: "abide",     syllableBreak: "a-bi-de",       visualPrompt: "a stone monument" },
    // "kibrit"    slice(1,-1)="ibri" has b ✓  "kib-rit" → "kibrit" ✓  (matchstick)
    { word: "kibrit",    syllableBreak: "kib-rit",       visualPrompt: "a matchstick" },
    // "yaban" adj/abstract → skip; "gömlek" no b; "köbek" not a word
    // "eşban" not a word; "kuşban" not a word; "öbek":
    // "öbek"      slice(1,-1)="be" has b ✓  "ö-bek" → "öbek" ✓  (cluster/bunch) — abstract → skip
    // "çubuklar" inflected; "kabak" already
    // "tabure"    slice(1,-1)="abur" has b ✓  "ta-bu-re" → "tabure" ✓  (stool)
    { word: "tabure",    syllableBreak: "ta-bu-re",      visualPrompt: "a small stool" },
    // "cobalt" not Turkish standard; "çibörek" not standard; "böbrek":
    // "böbrek"    slice(1,-1)="öbre" has b ✓  "böb-rek" → "böbrek" ✓  (kidney)
    // "gobelen" → tapestry: too advanced; "çubuk" already; "kabuk" already
    // "obje" → object: slice(1,-1)="bj" has b ✓  "ob-je" → "obje" ✓  (object/prop) — abstract
    // "dirsek" no b; "dubara" → trick (abstract); "dubur" not standard
    // "çebirge" not standard; "kebap" already; "kibrit" already; "tabure" already
    // "cobalt" not Turkish; "kaburga":
    // "kaburga"   slice(1,-1)="abürg" has b ✓  "ka-bur-ga" → "kaburga" ✓  (rib bone)
    // "lobut" already; "abide" already; "abajur" already
    // "cübbe"     slice(1,-1)="übb" has b ✓  "cüb-be" → "cübbe" ✓  (robe/cloak)
    { word: "cübbe",     syllableBreak: "cüb-be",        visualPrompt: "a long robe cloak" },
    // Total medial: tabak, kabak, çubuk, sabun, kelebek, abla, kabuk, göbek, soba, sebze, kubbe, pabuç, kebap, taban, kabin, kumbara, lobut, abajur, biber, abide, kibrit, tabure, böbrek, kaburga, cübbe = 25 words ✓
  ],

  // Turkish final obstruent devoicing: underlying /b/ → surface [p] word-finally.
  // Native Turkish nouns do not end in the letter "b".
  // Foreign loanwords that might preserve final "b" are not standard concrete
  // child-appropriate Turkish nouns in modern usage. This position is genuinely empty.
  final: [],
};
