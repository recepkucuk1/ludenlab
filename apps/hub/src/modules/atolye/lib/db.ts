// Atölye klinik DB → merkezi atolyeDb köprüsü (RLS, ayrı Supabase).
export { atolyeDb as prisma, withRls } from "@/lib/db/atolye";
