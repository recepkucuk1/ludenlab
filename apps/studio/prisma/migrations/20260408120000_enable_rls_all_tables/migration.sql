-- Enable Row Level Security on all public tables
-- Prisma connects as a superuser (postgres role) which bypasses RLS,
-- so this has no effect on the application. It blocks any non-privileged
-- connection (e.g. via PostgREST with anon key) from reading these tables.

ALTER TABLE "Therapist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreditTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Card" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CardAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Curriculum" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CurriculumGoal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LessonException" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
