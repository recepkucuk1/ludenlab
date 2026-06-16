export type PasswordStrength = "weak" | "medium" | "strong";

export interface PasswordStrengthResult {
  score: number; // 0-4
  label: PasswordStrength;
  feedback: string;
}

/**
 * Hafif şifre gücü değerlendirmesi. zxcvbn olmadan basit heuristic.
 * 0-4 puan: uzunluk + çeşitlilik + yaygın kalıp kontrolü.
 */
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return { score: 0, label: "weak", feedback: "" };
  }

  let score = 0;

  // Uzunluk puanları
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Çeşitlilik puanları
  const hasLower = /[a-zçğıöşü]/.test(password);
  const hasUpper = /[A-ZÇĞİÖŞÜ]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/.test(password);

  const varietyCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  if (varietyCount >= 3) score++;
  if (varietyCount === 4) score++;

  // Yaygın zayıf kalıplar — puan düş
  const lower = password.toLowerCase();
  const commonPatterns = [
    "password", "123456", "qwerty", "abc123", "letmein", "admin",
    "welcome", "12345678", "111111", "123123", "sifre", "parola",
  ];
  if (commonPatterns.some((p) => lower.includes(p))) {
    score = Math.max(0, score - 2);
  }

  // Yalnızca tekrar eden karakterler
  if (/^(.)\1+$/.test(password)) score = 0;

  // Clamp 0-4
  score = Math.max(0, Math.min(4, score));

  let label: PasswordStrength;
  let feedback: string;

  if (score <= 1) {
    label = "weak";
    feedback = "Zayıf — daha uzun ve çeşitli karakterler kullanın";
  } else if (score <= 3) {
    label = "medium";
    feedback = "Orta — büyük harf, rakam veya sembol ekleyin";
  } else {
    label = "strong";
    feedback = "Güçlü şifre";
  }

  return { score, label, feedback };
}
