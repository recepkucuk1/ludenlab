import type { BankWord, Position } from "../types";

// /s/ sesi — başta, ortada ve sonda üretken.
export const words: Record<Position, BankWord[]> = {
  // INITIAL — word starts with "s".
  initial: [
    { word: "su",         syllableBreak: "su",            visualPrompt: "a glass of water" },
    { word: "saat",       syllableBreak: "sa-at",         visualPrompt: "a wristwatch" },
    { word: "sandalye",   syllableBreak: "san-dal-ye",    visualPrompt: "a wooden chair" },
    { word: "sabun",      syllableBreak: "sa-bun",        visualPrompt: "a bar of soap" },
    { word: "sepet",      syllableBreak: "se-pet",        visualPrompt: "a wicker basket" },
    { word: "soğan",      syllableBreak: "so-ğan",        visualPrompt: "an onion" },
    { word: "süt",        syllableBreak: "süt",           visualPrompt: "a glass of milk" },
    { word: "salatalık",  syllableBreak: "sa-la-ta-lık",  visualPrompt: "a cucumber" },
    { word: "simit",      syllableBreak: "si-mit",        visualPrompt: "a sesame-crusted bread ring" },
    { word: "sünger",     syllableBreak: "sün-ger",       visualPrompt: "a yellow bath sponge" },
    { word: "saksı",      syllableBreak: "sak-sı",        visualPrompt: "a flower pot" },
    { word: "sandık",     syllableBreak: "san-dık",       visualPrompt: "a wooden chest" },
    { word: "soba",       syllableBreak: "so-ba",         visualPrompt: "a wood-burning stove" },
    { word: "semaver",    syllableBreak: "se-ma-ver",     visualPrompt: "a metal samovar" },
    { word: "sincap",     syllableBreak: "sin-cap",       visualPrompt: "a squirrel" },
    { word: "serçe",      syllableBreak: "ser-çe",        visualPrompt: "a sparrow bird" },
    { word: "sakal",      syllableBreak: "sa-kal",        visualPrompt: "a beard" },
    { word: "sarımsak",   syllableBreak: "sa-rım-sak",    visualPrompt: "a garlic bulb" },
    { word: "sapan",      syllableBreak: "sa-pan",        visualPrompt: "a slingshot" },
    { word: "sürahi",     syllableBreak: "sü-ra-hi",      visualPrompt: "a glass water pitcher" },
    { word: "süpürge",    syllableBreak: "sü-pür-ge",     visualPrompt: "a broom" },
    { word: "salıncak",   syllableBreak: "sa-lın-cak",    visualPrompt: "a playground swing" },
    { word: "sardalye",   syllableBreak: "sar-dal-ye",    visualPrompt: "a sardine fish" },
    { word: "susam",      syllableBreak: "su-sam",        visualPrompt: "a jar of sesame seeds" },
    { word: "semer",      syllableBreak: "se-mer",        visualPrompt: "a pack saddle" },
    { word: "sandal",     syllableBreak: "san-dal",       visualPrompt: "a flat rowboat" },
    { word: "sokak",      syllableBreak: "so-kak",        visualPrompt: "a narrow street" },
    { word: "solucan",    syllableBreak: "so-lu-can",     visualPrompt: "an earthworm" },
    { word: "sızıntı",    syllableBreak: "sı-zın-tı",     visualPrompt: "a water leak drip" },
    { word: "sarkaç",     syllableBreak: "sar-kaç",       visualPrompt: "a pendulum clock" },
  ],

  // MEDIAL — "s" must appear in word.slice(1,-1); not first or last character.
  medial: [
    // m(0)a(1)s(2)a(3): slice(1,-1)="as" contains "s" ✓
    { word: "masa",       syllableBreak: "ma-sa",         visualPrompt: "a wooden table" },
    // k(0)a(1)s(2)a(3): slice(1,-1)="as" contains "s" ✓
    { word: "kasa",       syllableBreak: "ka-sa",         visualPrompt: "a metal cash box" },
    // p(0)u(1)s(2)u(3)l(4)a(5): slice(1,-1)="usul" contains "s" ✓; pusula = compass
    { word: "pusula",     syllableBreak: "pu-su-la",      visualPrompt: "a compass" },
    // f(0)a(1)s(2)u(3)l(4)y(5)e(6): slice(1,-1)="asuly" → "asulye" contains "s" ✓
    { word: "fasulye",    syllableBreak: "fa-sul-ye",     visualPrompt: "a handful of green beans" },
    // m(0)i(1)s(2)k(3)e(4)t(5): slice(1,-1)="iske" contains "s" ✓
    { word: "misket",     syllableBreak: "mis-ket",       visualPrompt: "a glass marble" },
    // k(0)e(1)s(2)t(3)a(4)n(5)e(6): slice(1,-1)="estan" contains "s" ✓
    { word: "kestane",    syllableBreak: "kes-ta-ne",     visualPrompt: "a chestnut" },
    // a(0)s(1)a(2)n(3)s(4)ö(5)r(6): slice(1,-1)="sansö" contains "s" ✓
    { word: "asansör",    syllableBreak: "a-san-sör",     visualPrompt: "an elevator" },
    // p(0)a(1)s(2)t(3)a(4): slice(1,-1)="ast" contains "s" ✓
    { word: "pasta",      syllableBreak: "pas-ta",        visualPrompt: "a birthday cake" },
    // h(0)a(1)s(2)ı(3)r(4): slice(1,-1)="ası" contains "s" ✓; hasır = woven straw mat
    { word: "hasır",      syllableBreak: "ha-sır",        visualPrompt: "a woven straw mat" },
    // b(0)i(1)s(2)i(3)k(4)l(5)e(6)t(7): slice(1,-1)="isikle" contains "s" ✓
    { word: "bisiklet",   syllableBreak: "bi-sik-let",    visualPrompt: "a bicycle" },
    // t(0)a(1)s(2)m(3)a(4): slice(1,-1)="asm" contains "s" ✓; tasma = dog collar
    { word: "tasma",      syllableBreak: "tas-ma",        visualPrompt: "a dog collar" },
    // k(0)a(1)s(2)k(3)e(4)t(5): slice(1,-1)="aske" contains "s" ✓; kasket = flat cap
    { word: "kasket",     syllableBreak: "kas-ket",       visualPrompt: "a flat cap" },
    // t(0)e(1)s(2)t(3)e(4)r(5)e(6): slice(1,-1)="ester" contains "s" ✓
    { word: "testere",    syllableBreak: "tes-te-re",     visualPrompt: "a hand saw" },
    // m(0)i(1)s(2)i(3)n(4)a(5): slice(1,-1)="isin" contains "s" ✓; misina = fishing line
    { word: "misina",     syllableBreak: "mi-si-na",      visualPrompt: "a thin fishing line" },
    // m(0)a(1)s(2)k(3)e(4): slice(1,-1)="ask" contains "s" ✓; maske = mask
    { word: "maske",      syllableBreak: "mas-ke",        visualPrompt: "a face mask" },
    // k(0)e(1)s(2)e(3): slice(1,-1)="es" contains "s" ✓; kese = small pouch
    { word: "kese",       syllableBreak: "ke-se",         visualPrompt: "a small cloth pouch" },
    // ı(0)s(1)ı(2)r(3)g(4)a(5)n(6): slice(1,-1)="sırga" contains "s" ✓; ısırgan = nettle
    { word: "ısırgan",    syllableBreak: "ı-sır-gan",     visualPrompt: "a stinging nettle plant" },
    // a(0)r(1)s(2)l(3)a(4)n(5): slice(1,-1)="rsla" contains "s" ✓; arslan = lion
    { word: "arslan",     syllableBreak: "ars-lan",       visualPrompt: "a lion" },
    // k(0)ı(1)s(2)r(3)a(4)k(5): slice(1,-1)="ısra" contains "s" ✓; kısrak = mare
    { word: "kısrak",     syllableBreak: "kıs-rak",       visualPrompt: "a female horse" },
    // y(0)a(1)s(2)t(3)ı(4)k(5): slice(1,-1)="astı" contains "s" ✓; yastık = pillow
    { word: "yastık",     syllableBreak: "yas-tık",       visualPrompt: "a bed pillow" },
    // t(0)o(1)s(2)t(3): slice(1,-1)="os" contains "s" ✓; "tost" ends in "t" so medial is valid
    { word: "tost",       syllableBreak: "tost",          visualPrompt: "a toasted sandwich" },
    // k(0)o(1)s(2)t(3)ü(4)m(5): slice(1,-1)="ostü" contains "s" ✓; kostüm = costume
    { word: "kostüm",     syllableBreak: "kos-tüm",       visualPrompt: "a theater costume" },
    // k(0)ö(1)s(2)t(3)e(4)b(5)e(6)k(7): slice(1,-1)="östebe" contains "s" ✓; köstebek = mole
    { word: "köstebek",   syllableBreak: "kös-te-bek",    visualPrompt: "a mole animal" },
    // k(0)a(1)s(2)a(3)b(4)a(5): slice(1,-1)="asab" contains "s" ✓; kasaba = small town
    { word: "kasaba",     syllableBreak: "ka-sa-ba",      visualPrompt: "a small town" },
    // a(0)s(1)k(2)e(3)r(4): slice(1,-1)="ske" contains "s" ✓
    { word: "asker",      syllableBreak: "as-ker",        visualPrompt: "a toy soldier figurine" },
    // m(0)u(1)s(2)l(3)u(4)k(5): slice(1,-1)="uslu" contains "s" ✓
    { word: "musluk",     syllableBreak: "mus-luk",       visualPrompt: "a water faucet tap" },
    // m(0)e(1)s(2)c(3)i(4)t(5): slice(1,-1)="esci" contains "s" ✓; mescit = small mosque
    { word: "mescit",     syllableBreak: "mes-cit",       visualPrompt: "a small mosque" },
  ],

  // FINAL — word ends with "s". Genuine Turkish nouns ending in "s"; aim ~20.
  final: [
    // Each: last char is "s", syllableBreak.replace(/-/g,"") === word.
    { word: "otobüs",    syllableBreak: "o-to-büs",     visualPrompt: "a city bus" },
    { word: "ananas",    syllableBreak: "a-na-nas",     visualPrompt: "a pineapple" },
    { word: "domates",   syllableBreak: "do-ma-tes",    visualPrompt: "a red tomato" },
    { word: "ders",      syllableBreak: "ders",         visualPrompt: "an open textbook" },
    { word: "nefes",     syllableBreak: "ne-fes",       visualPrompt: "a person exhaling breath" },
    { word: "kaktüs",    syllableBreak: "kak-tüs",      visualPrompt: "a cactus plant" },
    { word: "tavus",     syllableBreak: "ta-vus",       visualPrompt: "a peacock" },
    { word: "atlas",     syllableBreak: "at-las",       visualPrompt: "a world atlas book" },
    { word: "termos",    syllableBreak: "ter-mos",      visualPrompt: "a thermos flask" },
    { word: "minibüs",   syllableBreak: "mi-ni-büs",    visualPrompt: "a minibus" },
    { word: "tenis",     syllableBreak: "te-nis",       visualPrompt: "a tennis racket" },
    { word: "iris",      syllableBreak: "i-ris",        visualPrompt: "a purple iris flower" },
    { word: "sis",       syllableBreak: "sis",          visualPrompt: "a thick morning fog" },
    { word: "tas",       syllableBreak: "tas",          visualPrompt: "a stone bowl" },
    { word: "teras",     syllableBreak: "te-ras",       visualPrompt: "a house terrace" },
    { word: "sosis",     syllableBreak: "so-sis",       visualPrompt: "a sausage" },
    { word: "kampüs",    syllableBreak: "kam-püs",      visualPrompt: "a university campus" },
  ],
};
