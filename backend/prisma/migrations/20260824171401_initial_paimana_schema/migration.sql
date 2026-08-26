/*
  Warnings:

  - You are about to drop the column `originalCost` on the `Project` table. All the data in the column will be lost.
  - Added the required column `startDate` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "originalCost",
ADD COLUMN     "serialNumber" INTEGER,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ProjectObservation" ADD COLUMN     "originalCost" DECIMAL(18,2);
