export type Position = "initial" | "medial" | "final";

export interface BankWord {
  /** Gerçek Türkçe kelime, ör. "dolap" */
  word: string;
  /** Hece bölünmesi, ör. "do-lap" */
  syllableBreak: string;
  /** İngilizce, tek somut nesne, ör. "a wooden wardrobe cabinet" */
  visualPrompt: string;
}

export interface SelectedWord extends BankWord {
  position: Position;
  /** syllableBreak'ten türetilir (tire sayısı + 1) */
  syllableCount: number;
  /** Bu kelimenin temsil ettiği hedef ses (ör. "/s/"). Çok-sesli seçimde her kelime kendi sesini taşır. */
  targetSound?: string;
}

/** Ses (harf) → pozisyon → kelime listesi */
export type WordBank = Record<string, Record<Position, BankWord[]>>;
