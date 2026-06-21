import type { BankWord, Position } from "../types";

// /l/ sesi — Türkçe sözcük başında nadir (ödünç sözcükler); orta ve sonda zengin.
export const words: Record<Position, BankWord[]> = {
  // INITIAL — Native Turkish words almost never start with "l"; only well-known loanwords.
  // ~12 words; honesty over padding.
  initial: [
    { word: "lamba",   syllableBreak: "lam-ba",    visualPrompt: "a table lamp" },
    { word: "limon",   syllableBreak: "li-mon",    visualPrompt: "a yellow lemon" },
    { word: "lale",    syllableBreak: "la-le",     visualPrompt: "a red tulip flower" },
    { word: "lavabo",  syllableBreak: "la-va-bo",  visualPrompt: "a bathroom sink" },
    { word: "lokma",   syllableBreak: "lok-ma",    visualPrompt: "a round fried dough ball" },
    { word: "lahana",  syllableBreak: "la-ha-na",  visualPrompt: "a head of cabbage" },
    { word: "leke",    syllableBreak: "le-ke",     visualPrompt: "a stain on fabric" },
    { word: "liste",   syllableBreak: "lis-te",    visualPrompt: "a written list on paper" },
    { word: "lor",     syllableBreak: "lor",       visualPrompt: "a small bowl of cottage cheese" },
    { word: "lapa",    syllableBreak: "la-pa",     visualPrompt: "a bowl of porridge" },
    { word: "lastik",  syllableBreak: "las-tik",   visualPrompt: "a rubber tire" },
    { word: "leylek",  syllableBreak: "ley-lek",   visualPrompt: "a white stork bird" },
  ],

  // MEDIAL — "l" must appear in word.slice(1,-1) (not first or last character).
  // Self-check: each word verified letter-by-letter below.
  medial: [
    // ka-l-em: k(0)a(1)l(2)e(3)m(4), slice(1,-1)="ale" — "l" ✓ but wait: "alem" contains l ✓
    { word: "kalem",    syllableBreak: "ka-lem",       visualPrompt: "a pencil" },
    // ba-l-ık: b(0)a(1)l(2)ı(3)k(4), slice(1,-1)="alı" contains "l" ✓
    { word: "balık",    syllableBreak: "ba-lık",       visualPrompt: "a fish" },
    // ha-l-ı: h(0)a(1)l(2)ı(3), slice(1,-1)="al" contains "l" ✓
    { word: "halı",     syllableBreak: "ha-lı",        visualPrompt: "a patterned rug" },
    // ba-l-on: b(0)a(1)l(2)o(3)n(4), slice(1,-1)="alo" contains "l" ✓
    { word: "balon",    syllableBreak: "ba-lon",       visualPrompt: "a round balloon" },
    // e-l-ma: e(0)l(1)m(2)a(3), slice(1,-1)="lm" contains "l" ✓
    { word: "elma",     syllableBreak: "el-ma",        visualPrompt: "a red apple" },
    // ke-l-e-b-e-k: k(0)e(1)l(2)e(3)b(4)e(5)k(6), slice(1,-1)="elebek" — wait that's wrong, slice(1,-1) of "kelebek"=e(1)l(2)e(3)b(4)e(5)k... no: "kelebek"[0..6], slice(1,-1)="elebek"[0..4]="elebe" — contains "l" ✓
    { word: "kelebek",  syllableBreak: "ke-le-bek",    visualPrompt: "a butterfly" },
    // do-l-ap: d(0)o(1)l(2)a(3)p(4), slice(1,-1)="ola" contains "l" ✓
    { word: "dolap",    syllableBreak: "do-lap",       visualPrompt: "a wooden wardrobe" },
    // çi-l-ek: ç(0)i(1)l(2)e(3)k(4), slice(1,-1)="ile" contains "l" ✓
    { word: "çilek",    syllableBreak: "çi-lek",       visualPrompt: "a strawberry" },
    // pa-l-to: p(0)a(1)l(2)t(3)o(4), slice(1,-1)="alt" contains "l" ✓
    { word: "palto",    syllableBreak: "pal-to",       visualPrompt: "a winter coat" },
    // sa-l-ça: s(0)a(1)l(2)ç(3)a(4), slice(1,-1)="alç" contains "l" ✓
    { word: "salça",    syllableBreak: "sal-ça",       visualPrompt: "a jar of tomato paste" },
    // yı-l-an: y(0)ı(1)l(2)a(3)n(4), slice(1,-1)="ıla" contains "l" ✓
    { word: "yılan",    syllableBreak: "yı-lan",       visualPrompt: "a coiled snake" },
    // sa-l-on: s(0)a(1)l(2)o(3)n(4), slice(1,-1)="alo" contains "l" ✓
    { word: "salon",    syllableBreak: "sa-lon",       visualPrompt: "a living room sofa" },
    // ka-l-ıp: k(0)a(1)l(2)ı(3)p(4), slice(1,-1)="alı" contains "l" ✓
    { word: "kalıp",    syllableBreak: "ka-lıp",       visualPrompt: "a baking mold" },
    // ti-l-ki: t(0)i(1)l(2)k(3)i(4), slice(1,-1)="ilk" contains "l" ✓
    { word: "tilki",    syllableBreak: "til-ki",       visualPrompt: "a fox" },
    // sa-lı-n-c-ak: s(0)a(1)l(2)ı(3)n(4)c(5)a(6)k(7), slice(1,-1)="alınca" contains "l" ✓
    { word: "salıncak", syllableBreak: "sa-lın-cak",   visualPrompt: "a playground swing" },
    // pe-l-i-k-an: p(0)e(1)l(2)i(3)k(4)a(5)n(6), slice(1,-1)="elik a" → "elika" contains "l" ✓
    { word: "pelikan",  syllableBreak: "pe-li-kan",    visualPrompt: "a pelican bird" },
    // ku-l-ak: k(0)u(1)l(2)a(3)k(4), slice(1,-1)="ula" contains "l" ✓
    { word: "kulak",    syllableBreak: "ku-lak",       visualPrompt: "a human ear" },
    // ki-l-im: k(0)i(1)l(2)i(3)m(4), slice(1,-1)="ili" contains "l" ✓
    { word: "kilim",    syllableBreak: "ki-lim",       visualPrompt: "a flat-woven kilim rug" },
    // bü-l-bü-l: b(0)ü(1)l(2)b(3)ü(4)l(5), slice(1,-1)=ü(1)l(2)b(3)ü(4)="ülbü" contains "l" ✓
    { word: "bülbül",   syllableBreak: "bül-bül",      visualPrompt: "a nightingale bird" },
    // ye-l-pa-ze: y(0)e(1)l(2)p(3)a(4)z(5)e(6), slice(1,-1)="elpaz" contains "l" ✓
    { word: "yelpaze",  syllableBreak: "yel-pa-ze",    visualPrompt: "a hand fan" },
    // bu-l-ut: b(0)u(1)l(2)u(3)t(4), slice(1,-1)="ulu" contains "l" ✓
    { word: "bulut",    syllableBreak: "bu-lut",       visualPrompt: "a white cloud" },
    // kı-l-ıç: k(0)ı(1)l(2)ı(3)ç(4), slice(1,-1)="ılı" contains "l" ✓
    { word: "kılıç",    syllableBreak: "kı-lıç",       visualPrompt: "a sword" },
    // çi-ko-l-a-ta: ç(0)i(1)k(2)o(3)l(4)a(5)t(6)a(7), slice(1,-1)="ikolat" contains "l" ✓
    { word: "çikolata", syllableBreak: "çi-ko-la-ta",  visualPrompt: "a chocolate bar" },
    // bi-l-gi-sa-yar: b(0)i(1)l(2)g(3)i(4)s(5)a(6)y(7)a(8)r(9), slice(1,-1)="ilgisaya" contains "l" ✓
    { word: "bilgisayar", syllableBreak: "bil-gi-sa-yar", visualPrompt: "a laptop computer" },
    // ye-l-ken: y(0)e(1)l(2)k(3)e(4)n(5), slice(1,-1)="elke" contains "l" ✓
    { word: "yelken",   syllableBreak: "yel-ken",      visualPrompt: "a boat sail" },
    // ba-l-kon: b(0)a(1)l(2)k(3)o(4)n(5), slice(1,-1)="alko" contains "l" ✓
    { word: "balkon",   syllableBreak: "bal-kon",      visualPrompt: "a house balcony" },
    // a-l-ev: a(0)l(1)e(2)v(3), slice(1,-1)="le" contains "l" ✓
    { word: "alev",     syllableBreak: "a-lev",        visualPrompt: "a flame" },
    // pa-l-a-mut: p(0)a(1)l(2)a(3)m(4)u(5)t(6), slice(1,-1)="alamut"... "palamut" is an acorn ✓; slice(1,-1)="alamut" → wait "palamut"=p(0)a(1)l(2)a(3)m(4)u(5)t(6), slice(1,-1)=a(1)l(2)a(3)m(4)u(5)="alamu" contains "l" ✓
    { word: "palamut",  syllableBreak: "pa-la-mut",    visualPrompt: "an acorn" },
    // tu-l-um: t(0)u(1)l(2)u(3)m(4), slice(1,-1)="ulu" contains "l" ✓
    { word: "tulum",    syllableBreak: "tu-lum",       visualPrompt: "a leather wineskin" },
    // ça-l-ı: ç(0)a(1)l(2)ı(3), slice(1,-1)="al" contains "l" ✓
    { word: "çalı",     syllableBreak: "ça-lı",        visualPrompt: "a shrub bush" },
  ],

  // FINAL — word ends with "l"; very productive in Turkish.
  final: [
    { word: "dal",     syllableBreak: "dal",       visualPrompt: "a tree branch" },
    { word: "gül",     syllableBreak: "gül",       visualPrompt: "a red rose" },
    { word: "el",      syllableBreak: "el",        visualPrompt: "an open hand" },
    { word: "fil",     syllableBreak: "fil",       visualPrompt: "an elephant" },
    { word: "göl",     syllableBreak: "göl",       visualPrompt: "a calm lake" },
    { word: "yol",     syllableBreak: "yol",       visualPrompt: "a paved road" },
    { word: "bal",     syllableBreak: "bal",       visualPrompt: "a jar of honey" },
    { word: "kol",     syllableBreak: "kol",       visualPrompt: "a human arm" },
    { word: "okul",    syllableBreak: "o-kul",     visualPrompt: "a school building" },
    { word: "masal",   syllableBreak: "ma-sal",    visualPrompt: "an open fairy-tale book" },
    { word: "kartal",  syllableBreak: "kar-tal",   visualPrompt: "an eagle" },
    { word: "şal",     syllableBreak: "şal",       visualPrompt: "a woolen shawl" },
    { word: "nal",     syllableBreak: "nal",       visualPrompt: "a horseshoe" },
    { word: "sel",     syllableBreak: "sel",       visualPrompt: "a flood of water" },
    { word: "tel",     syllableBreak: "tel",       visualPrompt: "a metal wire" },
    { word: "pul",     syllableBreak: "pul",       visualPrompt: "a postage stamp" },
    { word: "tül",     syllableBreak: "tül",       visualPrompt: "a piece of tulle fabric" },
    { word: "dil",     syllableBreak: "dil",       visualPrompt: "a human tongue" },
    { word: "çil",     syllableBreak: "çil",       visualPrompt: "a partridge bird" },
    { word: "hamal",   syllableBreak: "ha-mal",    visualPrompt: "a porter carrying a heavy load" },
    { word: "çakal",   syllableBreak: "ça-kal",    visualPrompt: "a jackal" },
    { word: "sümbül",  syllableBreak: "süm-bül",   visualPrompt: "a hyacinth flower" },
    { word: "çatal",   syllableBreak: "ça-tal",    visualPrompt: "a dinner fork" },
    { word: "sandal",  syllableBreak: "san-dal",   visualPrompt: "a flat rowing boat" },
    { word: "çul",     syllableBreak: "çul",       visualPrompt: "a burlap sack" },
    { word: "tünel",   syllableBreak: "tü-nel",    visualPrompt: "a road tunnel" },
    { word: "portakal", syllableBreak: "por-ta-kal", visualPrompt: "an orange fruit" },
    { word: "mendil",  syllableBreak: "men-dil",   visualPrompt: "a handkerchief" },
    { word: "sakal",   syllableBreak: "sa-kal",    visualPrompt: "a man's beard" },
  ],
};
