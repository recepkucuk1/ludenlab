export interface BadgeDef {
  id: string;
  emoji: string;
  name: string;
  description: string;
}

export interface BadgeStats {
  totalStudents: number;
  totalCompletedGoals: number;
  totalCards: number;
  currentStreak: number;
  uniqueStudentsWorked: number;
  toolTypeCounts: Record<string, number>;
  uniqueToolTypes: number;
}

export interface EarnedBadge extends BadgeDef {
  earned: boolean;
}

export const ALL_BADGES: BadgeDef[] = [
  { id: "first_step",        emoji: "🌱", name: "İlk Adım",          description: "İlk öğrenci eklendi" },
  { id: "card_master",       emoji: "🚀", name: "Kart Ustası",        description: "Toplam 20 kart üretildi" },
  { id: "hundred_cards",     emoji: "🏅", name: "Yüz Kart",           description: "Toplam 100 materyal üretildi" },
  { id: "goal_hunter",       emoji: "🎯", name: "Hedef Avcısı",       description: "Toplam 10 hedef tamamlandı" },
  { id: "curriculum_master", emoji: "📚", name: "Müfredat Ustası",    description: "50 hedef tamamlandı" },
  { id: "expert_therapist",  emoji: "💎", name: "Uzman Terapist",     description: "100 hedef tamamlandı" },
  { id: "team_captain",      emoji: "👥", name: "Takım Kaptanı",      description: "5 farklı öğrenciyle çalışıldı" },
  { id: "streak_3",          emoji: "🔥", name: "3 Günlük Seri",      description: "3 gün aralıksız aktif" },
  { id: "streak_7",          emoji: "⚡", name: "7 Günlük Seri",      description: "7 gün aralıksız aktif" },
  { id: "streak_30",         emoji: "🏆", name: "30 Günlük Seri",     description: "30 gün aralıksız aktif" },
  { id: "story_teller",      emoji: "📖", name: "Hikaye Anlatıcısı",  description: "İlk sosyal hikaye üretildi" },
  { id: "sound_master",      emoji: "🎤", name: "Ses Ustası",         description: "İlk artikülasyon alıştırması üretildi" },
  { id: "home_coach",        emoji: "🏠", name: "Ev Koçu",            description: "İlk ev ödevi materyali üretildi" },
  { id: "planner",           emoji: "📅", name: "Planlamacı",         description: "İlk haftalık plan oluşturuldu" },
  { id: "reporter",          emoji: "📋", name: "Raporcu",            description: "İlk oturum özeti oluşturuldu" },
  { id: "game_designer",     emoji: "🎮", name: "Oyun Tasarımcısı",  description: "İlk oyun/aktivite üretildi" },
  { id: "explorer",          emoji: "🧭", name: "Araç Kaşifi",       description: "5 farklı araç türü kullanıldı" },
  { id: "super_expert",      emoji: "🌟", name: "Süper Uzman",        description: "Tüm araç türlerinden en az 1 üretim yapıldı" },
];

const ALL_TOOL_TYPES = [
  "LEARNING_CARD",
  "SOCIAL_STORY",
  "ARTICULATION_DRILL",
  "HOMEWORK_MATERIAL",
  "WEEKLY_PLAN",
  "SESSION_SUMMARY",
  "MATCHING_GAME",
  "PHONATION_ACTIVITY",
  "COMMUNICATION_BOARD",
];

function isBadgeEarned(id: string, s: BadgeStats): boolean {
  const t = s.toolTypeCounts;
  switch (id) {
    case "first_step":        return s.totalStudents >= 1;
    case "card_master":       return s.totalCards >= 20;
    case "hundred_cards":     return s.totalCards >= 100;
    case "goal_hunter":       return s.totalCompletedGoals >= 10;
    case "curriculum_master": return s.totalCompletedGoals >= 50;
    case "expert_therapist":  return s.totalCompletedGoals >= 100;
    case "team_captain":      return s.uniqueStudentsWorked >= 5;
    case "streak_3":          return s.currentStreak >= 3;
    case "streak_7":          return s.currentStreak >= 7;
    case "streak_30":         return s.currentStreak >= 30;
    case "story_teller":      return (t["SOCIAL_STORY"] ?? 0) >= 1;
    case "sound_master":      return (t["ARTICULATION_DRILL"] ?? 0) >= 1;
    case "home_coach":        return (t["HOMEWORK_MATERIAL"] ?? 0) >= 1;
    case "planner":           return (t["WEEKLY_PLAN"] ?? 0) >= 1;
    case "reporter":          return (t["SESSION_SUMMARY"] ?? 0) >= 1;
    case "game_designer":     return (
      (t["MATCHING_GAME"] ?? 0) +
      (t["PHONATION_ACTIVITY"] ?? 0) +
      (t["COMMUNICATION_BOARD"] ?? 0)
    ) >= 1;
    case "explorer":          return s.uniqueToolTypes >= 5;
    case "super_expert":      return ALL_TOOL_TYPES.every(tt => (t[tt] ?? 0) >= 1);
    default:                  return false;
  }
}

export function computeBadges(stats: BadgeStats): EarnedBadge[] {
  return ALL_BADGES.map((badge) => ({ ...badge, earned: isBadgeEarned(badge.id, stats) }));
}

export function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function calculateStreak(activeDays: Set<string>): number {
  if (activeDays.size === 0) return 0;
  const now = new Date();
  const todayStr = toDateStr(now);
  const yd = new Date(now);
  yd.setUTCDate(yd.getUTCDate() - 1);
  const yesterdayStr = toDateStr(yd);
  let startStr: string;
  if (activeDays.has(todayStr)) {
    startStr = todayStr;
  } else if (activeDays.has(yesterdayStr)) {
    startStr = yesterdayStr;
  } else {
    return 0;
  }
  let streak = 0;
  const d = new Date(startStr + "T00:00:00Z");
  while (activeDays.has(toDateStr(d))) {
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
}
