-- AlterTable
ALTER TABLE "Student" RENAME CONSTRAINT "Patient_pkey" TO "Student_pkey";

-- CreateTable
CREATE TABLE "CardAssignment" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardAssignment_cardId_studentId_key" ON "CardAssignment"("cardId", "studentId");

-- RenameForeignKey
ALTER TABLE "Card" RENAME CONSTRAINT "Card_patientId_fkey" TO "Card_studentId_fkey";

-- RenameForeignKey
ALTER TABLE "Student" RENAME CONSTRAINT "Patient_therapistId_fkey" TO "Student_therapistId_fkey";

-- AddForeignKey
ALTER TABLE "CardAssignment" ADD CONSTRAINT "CardAssignment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardAssignment" ADD CONSTRAINT "CardAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
