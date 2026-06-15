-- 1) studentId varsa workArea'dan türet
UPDATE "Card" SET "category" = (
  SELECT "workArea" FROM "Student" WHERE "Student"."id" = "Card"."studentId"
)
WHERE "category" IN ('generator', 'organizer', 'activity')
  AND "studentId" IS NOT NULL;

-- 2) studentId yoksa toolType'a göre sabit eşle
UPDATE "Card" SET "category" = 'speech'
  WHERE "studentId" IS NULL
    AND "toolType" = 'PHONATION_ACTIVITY'
    AND "category" IN ('generator', 'organizer', 'activity');

UPDATE "Card" SET "category" = 'language'
  WHERE "studentId" IS NULL
    AND "toolType" IN ('MATCHING_GAME', 'COMMUNICATION_BOARD')
    AND "category" IN ('generator', 'organizer', 'activity');

-- 3) Geriye kalan ('generator'/'organizer'/'activity' kalmış edge-case)
--    null'a çek ki UI tarafı koşullu render ile gizlesin
UPDATE "Card" SET "category" = NULL
  WHERE "category" IN ('generator', 'organizer', 'activity');

-- 4) Şema değişikliği: nullable + default kaldır
ALTER TABLE "Card" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "Card" ALTER COLUMN "category" DROP NOT NULL;
