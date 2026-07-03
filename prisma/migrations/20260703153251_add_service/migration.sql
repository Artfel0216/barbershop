-- CreateEnum
CREATE TYPE "Service" AS ENUM ('haircut', 'beard', 'eyebrows');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "service" "Service" NOT NULL DEFAULT 'haircut';
