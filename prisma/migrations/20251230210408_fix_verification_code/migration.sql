/*
  Warnings:

  - You are about to drop the column `phone` on the `VerificationCode` table. All the data in the column will be lost.
  - Added the required column `type` to the `VerificationCode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `VerificationCode` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VerificationCode" DROP COLUMN "phone",
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "VerificationCode" ADD CONSTRAINT "VerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
