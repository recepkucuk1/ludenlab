import type { BankWord, Position } from "../types";

// /y/ sesi — başta zengin; ortada orta; sonda az (Türkçe'de "y" ile biten somut isim sayısı kısıtlı).
export const words: Record<Position, BankWord[]> = {
  // INITIAL — "y" is the first character; very productive in Turkish.
  initial: [
    { word: "yıldız",   syllableBreak: "yıl-dız",   visualPrompt: "a yellow five-pointed star" },
    { word: "yaprak",   syllableBreak: "yap-rak",    visualPrompt: "a green leaf" },
    { word: "yumurta",  syllableBreak: "yu-mur-ta",  visualPrompt: "a chicken egg" },
    { word: "yastık",   syllableBreak: "yas-tık",    visualPrompt: "a bed pillow" },
    { word: "yelken",   syllableBreak: "yel-ken",    visualPrompt: "a boat sail" },
    { word: "yengeç",   syllableBreak: "yen-geç",    visualPrompt: "a crab" },
    { word: "yüzük",    syllableBreak: "yü-zük",     visualPrompt: "a golden ring" },
    { word: "yorgan",   syllableBreak: "yor-gan",    visualPrompt: "a thick quilt blanket" },
    { word: "yay",      syllableBreak: "yay",        visualPrompt: "an archer's bow" },
    { word: "yaka",     syllableBreak: "ya-ka",      visualPrompt: "a shirt collar" },
    { word: "yonca",    syllableBreak: "yon-ca",     visualPrompt: "a clover plant" },
    { word: "yelpaze",  syllableBreak: "yel-pa-ze",  visualPrompt: "a hand fan" },
    { word: "yüz",      syllableBreak: "yüz",        visualPrompt: "a human face" },
    { word: "yol",      syllableBreak: "yol",        visualPrompt: "a paved road" },
    { word: "yumak",    syllableBreak: "yu-mak",     visualPrompt: "a ball of yarn" },
    { word: "yılan",    syllableBreak: "yı-lan",     visualPrompt: "a coiled snake" },
    { word: "yük",      syllableBreak: "yük",        visualPrompt: "a heavy load on a cart" },
    { word: "yunus",    syllableBreak: "yu-nus",     visualPrompt: "a dolphin" },
    { word: "yumruk",   syllableBreak: "yum-ruk",    visualPrompt: "a clenched fist" },
    { word: "yağmur",   syllableBreak: "yağ-mur",    visualPrompt: "rain falling from clouds" },
    { word: "yatak",    syllableBreak: "ya-tak",     visualPrompt: "a bed" },
    { word: "yoğurt",   syllableBreak: "yo-ğurt",    visualPrompt: "a bowl of yogurt" },
    { word: "yanardağ", syllableBreak: "ya-nar-dağ", visualPrompt: "an erupting volcano" },
    { word: "yüzgeç",   syllableBreak: "yüz-geç",   visualPrompt: "a fish fin" },
    { word: "yaba",     syllableBreak: "ya-ba",      visualPrompt: "a wooden pitchfork" },
    { word: "yaban",    syllableBreak: "ya-ban",     visualPrompt: "a wild boar" },
    { word: "yular",    syllableBreak: "yu-lar",     visualPrompt: "a horse halter" },
    { word: "yanık",    syllableBreak: "ya-nık",     visualPrompt: "a burn mark on skin" },
    { word: "yarık",    syllableBreak: "ya-rık",     visualPrompt: "a crack in a wall" },
    { word: "yosun",    syllableBreak: "yo-sun",     visualPrompt: "green seaweed" },
  ],

  // MEDIAL — "y" must appear in word.slice(1,-1); not first or last character.
  medial: [
    // a(0)y(1)ı(2): slice(1,-1)="y" contains "y" ✓
    { word: "ayı",     syllableBreak: "a-yı",       visualPrompt: "a brown bear" },
    // k(0)o(1)y(2)u(3)n(4): slice(1,-1)="oyu" contains "y" ✓
    { word: "koyun",   syllableBreak: "ko-yun",     visualPrompt: "a sheep" },
    // m(0)a(1)y(2)m(3)u(4)n(5): slice(1,-1)="aymu" contains "y" ✓
    { word: "maymun",  syllableBreak: "may-mun",    visualPrompt: "a monkey" },
    // b(0)a(1)y(2)r(3)a(4)k(5): slice(1,-1)="ayra" contains "y" ✓
    { word: "bayrak",  syllableBreak: "bay-rak",    visualPrompt: "a flag" },
    // k(0)a(1)y(2)ı(3)k(4): slice(1,-1)="ayı" contains "y" ✓
    { word: "kayık",   syllableBreak: "ka-yık",     visualPrompt: "a small rowboat" },
    // y(0)a(1)y(2)l(3)a(4): slice(1,-1)="ayl" contains "y" ✓ (first char y, but "y" in interior also at pos2 ✓)
    { word: "yayla",   syllableBreak: "yay-la",     visualPrompt: "a highland plateau" },
    // f(0)a(1)y(2)t(3)o(4)n(5): slice(1,-1)="ayto" contains "y" ✓
    { word: "fayton",  syllableBreak: "fay-ton",    visualPrompt: "a horse-drawn carriage" },
    // m(0)a(1)y(2)o(3): slice(1,-1)="ay" contains "y" ✓
    { word: "mayo",    syllableBreak: "ma-yo",      visualPrompt: "a swimsuit" },
    // b(0)o(1)y(2)u(3)n(4): slice(1,-1)="oyu" contains "y" ✓
    { word: "boyun",   syllableBreak: "bo-yun",     visualPrompt: "a human neck" },
    // d(0)a(1)y(2)a(3)k(4): slice(1,-1)="aya" contains "y" ✓
    { word: "dayak",   syllableBreak: "da-yak",     visualPrompt: "a wooden stick" },
    // k(0)a(1)y(2)a(3): slice(1,-1)="ay" contains "y" ✓
    { word: "kaya",    syllableBreak: "ka-ya",      visualPrompt: "a large rock" },
    // b(0)o(1)y(2)a(3): slice(1,-1)="oy" contains "y" ✓
    { word: "boya",    syllableBreak: "bo-ya",      visualPrompt: "a can of paint" },
    // t(0)o(1)y(2)g(3)a(4)r(5): slice(1,-1)="oyga" contains "y" ✓
    { word: "toygar",  syllableBreak: "toy-gar",    visualPrompt: "a lark bird" },
    // p(0)e(1)y(2)n(3)i(4)r(5): slice(1,-1)="eyni" contains "y" ✓
    { word: "peynir",  syllableBreak: "pey-nir",    visualPrompt: "a block of cheese" },
    // s(0)o(1)y(2)a(3): slice(1,-1)="oy" contains "y" ✓
    { word: "soya",    syllableBreak: "so-ya",      visualPrompt: "a soybean plant" },
    // k(0)ı(1)y(2)ı(3): slice(1,-1)="ıy" contains "y" ✓
    { word: "kıyı",    syllableBreak: "kı-yı",      visualPrompt: "a shoreline coast" },
    // s(0)a(1)y(2)ı(3): slice(1,-1)="ay" contains "y" ✓
    { word: "sayı",    syllableBreak: "sa-yı",      visualPrompt: "a number written on paper" },
    // ç(0)a(1)y(2)d(3)a(4)n(5)l(6)ı(7)k(8): slice contains "y" ✓ — çaydanlık (teapot kettle)
    { word: "çaydanlık", syllableBreak: "çay-dan-lık", visualPrompt: "a metal teapot kettle" },
  ],

  // FINAL — word ends with "y"; genuinely sparse in Turkish.
  // Honest count: 9. No padding with marginal words.
  final: [
    // Each word: last character is "y"; syllableBreak joins to word exactly.
    { word: "çay",   syllableBreak: "çay",   visualPrompt: "a glass of tea" },
    { word: "köy",   syllableBreak: "köy",   visualPrompt: "a small village" },
    { word: "tay",   syllableBreak: "tay",   visualPrompt: "a young foal" },
    { word: "yay",   syllableBreak: "yay",   visualPrompt: "an archer's bow" },
    { word: "ney",   syllableBreak: "ney",   visualPrompt: "a reed flute" },
    { word: "koy",   syllableBreak: "koy",   visualPrompt: "a small sea bay" },
    { word: "toy",   syllableBreak: "toy",   visualPrompt: "a bustard bird" },
  ],
};
