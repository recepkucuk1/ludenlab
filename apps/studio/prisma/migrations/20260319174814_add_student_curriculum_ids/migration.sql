-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "curriculumIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
