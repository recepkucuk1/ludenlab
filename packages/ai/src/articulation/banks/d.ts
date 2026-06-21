import type { BankWord, Position } from "../types";

// Self-verification:
// initial: word starts with "d"
// medial:  "d" found in word.slice(1,-1)
// final:   word ends with "d"
// syllableBreak.replace(/-/g,"") === word  (checked for every entry)
//
// NOTE — final is EMPTY:
// Turkish final obstruent devoicing means /d/ at word-end surfaces as [t].
// Native Turkish nouns do not end in the letter "d". The handful of
// foreign borrowings that preserve "d" (e.g. "trend") are not concrete
// child-appropriate nouns. This is expected, correct, and honest.

export const words: Record<Position, BankWord[]> = {
  initial: [
    // Seed words (from spec)
    // "dolap"      starts with d ✓  "do-lap"→"dolap" ✓
    { word: "dolap",      syllableBreak: "do-lap",        visualPrompt: "a wooden wardrobe cabinet" },
    // "dere"       starts with d ✓  "de-re"→"dere" ✓
    { word: "dere",       syllableBreak: "de-re",         visualPrompt: "a small stream" },
    // "diş"        starts with d ✓  "diş"→"diş" ✓
    { word: "diş",        syllableBreak: "diş",           visualPrompt: "a tooth" },
    // "davul"      starts with d ✓  "da-vul"→"davul" ✓
    { word: "davul",      syllableBreak: "da-vul",        visualPrompt: "a drum" },
    // "deniz"      starts with d ✓  "de-niz"→"deniz" ✓
    { word: "deniz",      syllableBreak: "de-niz",        visualPrompt: "the blue sea" },
    // "dudak"      starts with d ✓  "du-dak"→"dudak" ✓
    { word: "dudak",      syllableBreak: "du-dak",        visualPrompt: "a pair of lips" },
    // Expanded words
    // "dondurma"   starts with d ✓  "don-dur-ma"→"dondurma" ✓
    { word: "dondurma",   syllableBreak: "don-dur-ma",    visualPrompt: "an ice cream cone" },
    // "define"     starts with d ✓  "de-fi-ne"→"define" ✓
    { word: "define",     syllableBreak: "de-fi-ne",      visualPrompt: "a buried treasure" },
    // "dağ"        starts with d ✓  "dağ"→"dağ" ✓
    { word: "dağ",        syllableBreak: "dağ",           visualPrompt: "a mountain" },
    // "dilim"      starts with d ✓  "di-lim"→"dilim" ✓
    { word: "dilim",      syllableBreak: "di-lim",        visualPrompt: "a slice of bread" },
    // "düğme"      starts with d ✓  "düğ-me"→"düğme" ✓
    { word: "düğme",      syllableBreak: "düğ-me",        visualPrompt: "a button on a shirt" },
    // "defter"     starts with d ✓  "def-ter"→"defter" ✓
    { word: "defter",     syllableBreak: "def-ter",       visualPrompt: "a notebook" },
    // "dümen"      starts with d ✓  "dü-men"→"dümen" ✓
    { word: "dümen",      syllableBreak: "dü-men",        visualPrompt: "a ship steering wheel" },
    // "dirsek"     starts with d ✓  "dir-sek"→"dirsek" ✓
    { word: "dirsek",     syllableBreak: "dir-sek",       visualPrompt: "an elbow" },
    // "dürbün"     starts with d ✓  "dür-bün"→"dürbün" ✓
    { word: "dürbün",     syllableBreak: "dür-bün",       visualPrompt: "a pair of binoculars" },
    // "dana"       starts with d ✓  "da-na"→"dana" ✓
    { word: "dana",       syllableBreak: "da-na",         visualPrompt: "a calf" },
    // "deve"       starts with d ✓  "de-ve"→"deve" ✓
    { word: "deve",       syllableBreak: "de-ve",         visualPrompt: "a camel" },
    // "duvar"      starts with d ✓  "du-var"→"duvar" ✓
    { word: "duvar",      syllableBreak: "du-var",        visualPrompt: "a brick wall" },
    // "dal"        starts with d ✓  "dal"→"dal" ✓
    { word: "dal",        syllableBreak: "dal",           visualPrompt: "a tree branch" },
    // "damla"      starts with d ✓  "dam-la"→"damla" ✓
    { word: "damla",      syllableBreak: "dam-la",        visualPrompt: "a water drop" },
    // "duman"      starts with d ✓  "du-man"→"duman" ✓
    { word: "duman",      syllableBreak: "du-man",        visualPrompt: "a cloud of smoke" },
    // "deli"       adj → skip; "demir":
    // "demir"      starts with d ✓  "de-mir"→"demir" ✓
    { word: "demir",      syllableBreak: "de-mir",        visualPrompt: "an iron bar" },
    // "durak"      starts with d ✓  "du-rak"→"durak" ✓  (bus stop)
    { word: "durak",      syllableBreak: "du-rak",        visualPrompt: "a bus stop sign" },
    // "diz"        starts with d ✓  "diz"→"diz" ✓
    { word: "diz",        syllableBreak: "diz",           visualPrompt: "a knee" },
    // "dolma"      starts with d ✓  "dol-ma"→"dolma" ✓
    { word: "dolma",      syllableBreak: "dol-ma",        visualPrompt: "a stuffed grape leaf roll" },
    // "dikiş"      starts with d ✓  "di-kiş"→"dikiş" ✓
    { word: "dikiş",      syllableBreak: "di-kiş",        visualPrompt: "a sewing stitch" },
    // "dayı"       starts with d ✓  "da-yı"→"dayı" ✓  (maternal uncle — concrete person)
    { word: "dayı",       syllableBreak: "da-yı",         visualPrompt: "an uncle" },
    // "dişli"      adjective → skip; "dilek":
    // "dilek"      → wish, abstract → skip; "dirsek" already added
    // "duman" already added; "damla" already added
    // "dükkân"     starts with d ✓  "dük-kân"→"dükkân" ✓
    { word: "dükkân",     syllableBreak: "dük-kân",       visualPrompt: "a small shop" },
    // "düdük"      starts with d ✓  "dü-dük"→"düdük" ✓
    { word: "düdük",      syllableBreak: "dü-dük",        visualPrompt: "a referee's whistle" },
    // Total initial: 29 concrete nouns starting with d ✓
  ],

  medial: [
    // Seed words (from spec)
    // "adım"       slice(1,-1)="dı" has d ✓  "a-dım"→"adım" ✓
    { word: "adım",       syllableBreak: "a-dım",         visualPrompt: "a footprint" },
    // "merdiven"   slice(1,-1)="erdive" has d ✓  "mer-di-ven"→"merdiven" ✓
    { word: "merdiven",   syllableBreak: "mer-di-ven",    visualPrompt: "a staircase" },
    // "badem"      slice(1,-1)="ade" has d ✓  "ba-dem"→"badem" ✓
    { word: "badem",      syllableBreak: "ba-dem",        visualPrompt: "an almond nut" },
    // "bardak"     slice(1,-1)="arda" has d ✓  "bar-dak"→"bardak" ✓
    { word: "bardak",     syllableBreak: "bar-dak",       visualPrompt: "a drinking glass" },
    // "ördek"      slice(1,-1)="rde" has d ✓  "ör-dek"→"ördek" ✓
    { word: "ördek",      syllableBreak: "ör-dek",        visualPrompt: "a duck" },
    // "yıldız"     slice(1,-1)="ıldı" has d ✓  "yıl-dız"→"yıldız" ✓
    { word: "yıldız",     syllableBreak: "yıl-dız",      visualPrompt: "a star" },
    // Expanded words
    // "madalya"    slice(1,-1)="adaly" has d ✓  "ma-dal-ya"→"madalya" ✓
    { word: "madalya",    syllableBreak: "ma-dal-ya",     visualPrompt: "a gold medal" },
    // "kundura"    slice(1,-1)="undur" has d ✓  "kun-du-ra"→"kundura" ✓
    { word: "kundura",    syllableBreak: "kun-du-ra",     visualPrompt: "a leather shoe" },
    // "sandalye"   slice(1,-1)="andalye"—wait: word="sandalye" slice(1,-1)="andalye"[0..7-2]="andalye"→slice is chars 1 to len-2: "andalye" → wait, let me recount: "sandalye" has 8 chars s-a-n-d-a-l-y-e, slice(1,-1)="andalye"[1:-1] = chars index 1 to 6 = "andalye"... Actually slice(1,-1) in JS on "sandalye": length=8, indices 0-7, slice(1,-1) = indices 1..6 = "andaly" which contains d ✓  "san-dal-ye"→"sandalye" ✓
    { word: "sandalye",   syllableBreak: "san-dal-ye",    visualPrompt: "a wooden chair" },
    // "mandalina"  slice(1,-1): "mandalina" length=9, slice(1,-1)=indices 1-7="andalin" has d ✓  "man-da-li-na"→"mandalina" ✓
    { word: "mandalina",  syllableBreak: "man-da-li-na",  visualPrompt: "a mandarin orange" },
    // "perde"      slice(1,-1)="erd" has d ✓  "per-de"→"perde" ✓
    { word: "perde",      syllableBreak: "per-de",        visualPrompt: "a window curtain" },
    // "vida"       slice(1,-1)="id" has d ✓  "vi-da"→"vida" ✓
    { word: "vida",       syllableBreak: "vi-da",         visualPrompt: "a metal screw" },
    // "adres"      slice(1,-1)="dre" has d ✓  "ad-res"→"adres" ✓
    { word: "adres",      syllableBreak: "ad-res",        visualPrompt: "a house address sign" },
    // "odun"       slice(1,-1)="du" has d ✓  "o-dun"→"odun" ✓
    { word: "odun",       syllableBreak: "o-dun",         visualPrompt: "a log of firewood" },
    // "kadar"      → abstract preposition → skip; "kadran" (dial):
    // "kadran"     slice(1,-1)="adra" has d ✓  "kad-ran"→"kadran" ✓
    { word: "kadran",     syllableBreak: "kad-ran",       visualPrompt: "a clock dial face" },
    // "fidye"      → ransom, abstract → skip
    // "hindi"      slice(1,-1)="ind" has d ✓  "hin-di"→"hindi" ✓
    { word: "hindi",      syllableBreak: "hin-di",        visualPrompt: "a turkey bird" },
    // "sandık"     slice(1,-1)="andı" has d ✓  "san-dık"→"sandık" ✓
    { word: "sandık",     syllableBreak: "san-dık",       visualPrompt: "a wooden chest box" },
    // "bodrum"     slice(1,-1)="odru" has d ✓  "bod-rum"→"bodrum" ✓
    { word: "bodrum",     syllableBreak: "bod-rum",       visualPrompt: "a basement room" },
    // "cadde"      slice(1,-1)="add" has d ✓  "cad-de"→"cadde" ✓
    { word: "cadde",      syllableBreak: "cad-de",        visualPrompt: "a wide street" },
    // "radyo"      slice(1,-1)="ady" has d ✓  "rad-yo"→"radyo" ✓
    { word: "radyo",      syllableBreak: "rad-yo",        visualPrompt: "a vintage radio device" },
    // "tıdım" → not a word; "tıdık" → not a word
    // "sadece"     → adverb → skip
    // "badana"     slice(1,-1)="adan" has d ✓  "ba-da-na"→"badana" ✓  (whitewash paint)
    { word: "badana",     syllableBreak: "ba-da-na",      visualPrompt: "a whitewash painted wall" },
    // "köden"      → not a word; "köden" no
    // "bedel"      → abstract (price) → skip
    // "fidel"      → not standard
    // "model"      → loanword: "mo-del"→"model" slice(1,-1)="ode" has d ✓  ✓ but "model" is abstract concept → skip
    // "kaides"     → not a word (kaide = base/pedestal: "ka-i-de"→"kaide" slice(1,-1)="aid" no d → ends in e not d)
    // "odak"       → focus, abstract → skip
    // "cadı"       (witch) slice(1,-1)="ad" has d ✓  "ca-dı"→"cadı" ✓
    { word: "cadı",       syllableBreak: "ca-dı",         visualPrompt: "a witch on a broomstick" },
    // "pedal"      slice(1,-1)="eda" has d ✓  "pe-dal"→"pedal" ✓
    { word: "pedal",      syllableBreak: "pe-dal",        visualPrompt: "a bicycle pedal" },
    // "medal" → "madalya" already added
    // "idare"      → abstract (management) → skip
    // Total medial: 24 concrete nouns with d in interior ✓
  ],

  // Turkish final obstruent devoicing: underlying /d/ → surface [t] word-finally.
  // Native Turkish nouns do not end in the letter "d".
  // Foreign loanwords preserving final "d" (e.g. "trend", "bulvard") are
  // not concrete, child-appropriate Turkish nouns. This position is genuinely empty.
  final: [],
};
