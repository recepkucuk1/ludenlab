import type { BankWord, Position } from "../types";

// Phonotactic notes for /g/:
// - initial: rich position in Turkish — ~23 words
// - medial: true interior "g" (not "ğ") is sparse; mostly loanwords — ~12 honest entries
// - final: EMPTY — Turkish final devoicing (g→k) means virtually no native nouns end in "g"

export const words: Record<Position, BankWord[]> = {
  initial: [
    { word: "gemi", syllableBreak: "ge-mi", visualPrompt: "a sailing ship" },
    { word: "göz", syllableBreak: "göz", visualPrompt: "a human eye" },
    { word: "gül", syllableBreak: "gül", visualPrompt: "a red rose" },
    { word: "güneş", syllableBreak: "gü-neş", visualPrompt: "the sun shining in a blue sky" },
    { word: "gitar", syllableBreak: "gi-tar", visualPrompt: "a classical guitar" },
    { word: "gazete", syllableBreak: "ga-ze-te", visualPrompt: "a folded newspaper" },
    { word: "göl", syllableBreak: "göl", visualPrompt: "a calm lake surrounded by trees" },
    { word: "güvercin", syllableBreak: "gü-ver-cin", visualPrompt: "a white pigeon" },
    { word: "geyik", syllableBreak: "ge-yik", visualPrompt: "a deer with antlers" },
    { word: "gömlek", syllableBreak: "göm-lek", visualPrompt: "a button-up shirt" },
    { word: "gözlük", syllableBreak: "göz-lük", visualPrompt: "a pair of eyeglasses" },
    { word: "gümüş", syllableBreak: "gü-müş", visualPrompt: "a silver coin" },
    { word: "gerdanlık", syllableBreak: "ger-dan-lık", visualPrompt: "a necklace" },
    { word: "gaga", syllableBreak: "ga-ga", visualPrompt: "a bird beak" },
    { word: "göğüs", syllableBreak: "gö-ğüs", visualPrompt: "a human chest torso" },
    { word: "gökkuşağı", syllableBreak: "gök-ku-şa-ğı", visualPrompt: "a rainbow arching across the sky" },
    { word: "günlük", syllableBreak: "gün-lük", visualPrompt: "a small personal diary notebook" },
    { word: "gübre", syllableBreak: "güb-re", visualPrompt: "a bag of garden fertilizer" },
    { word: "göbek", syllableBreak: "gö-bek", visualPrompt: "a belly button" },
    { word: "gevrek", syllableBreak: "gev-rek", visualPrompt: "a sesame-coated round bread ring" },
    { word: "gölet", syllableBreak: "gö-let", visualPrompt: "a small pond" },
    { word: "giysi", syllableBreak: "giy-si", visualPrompt: "a piece of clothing on a hanger" },
    { word: "galeta", syllableBreak: "ga-le-ta", visualPrompt: "a plain cracker biscuit" },
  ],
  medial: [
    // True "g" (not "ğ") appears in word.slice(1,-1); mostly international loanwords
    { word: "penguen", syllableBreak: "pen-gu-en", visualPrompt: "a penguin" },
    { word: "kanguru", syllableBreak: "kan-gu-ru", visualPrompt: "a kangaroo" },
    { word: "organ", syllableBreak: "or-gan", visualPrompt: "a pipe organ instrument" },
    { word: "mango", syllableBreak: "man-go", visualPrompt: "a yellow mango fruit" },
    { word: "dergi", syllableBreak: "der-gi", visualPrompt: "a colorful magazine" },
    { word: "sigara", syllableBreak: "si-ga-ra", visualPrompt: "a cigarette" },
    { word: "magazin", syllableBreak: "ma-ga-zin", visualPrompt: "a glossy entertainment magazine" },
    { word: "program", syllableBreak: "prog-ram", visualPrompt: "a printed TV schedule booklet" },
    { word: "egzoz", syllableBreak: "eg-zoz", visualPrompt: "a car exhaust pipe" },
    { word: "logo", syllableBreak: "lo-go", visualPrompt: "a round company logo badge" },
    { word: "guguk", syllableBreak: "gu-guk", visualPrompt: "a cuckoo clock with a small bird" },
  ],
  // Turkish final devoicing (g → k at word boundary) means no native Turkish nouns
  // end in written "g". Loanwords that end in "g" are too uncommon for this clinical context.
  final: [],
};
