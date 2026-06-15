-- Patient tablosunu Student olarak yeniden adlandır (tüm veriler korunur)
ALTER TABLE "Patient" RENAME TO "Student";

-- Card tablosundaki patientId sütununu studentId olarak yeniden adlandır (veriler korunur)
ALTER TABLE "Card" RENAME COLUMN "patientId" TO "studentId";
