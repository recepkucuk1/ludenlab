import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * apps/hub birim testleri — SAF yardımcılar için (DB/Next runtime gerektirmeyen).
 * Denetim kapısı G4: hub'da hiç test yoktu; güvenlik-kritik ayrıştırma fonksiyonları
 * (callbackUrl doğrulama, e-posta kanonikleştirme) kalıcı regresyon testi hak ediyor.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
});
