/*
  Warnings:

  - Added the required column `firstName` to the `staff_invitations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `staff_invitations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Add columns with temporary defaults for existing rows
ALTER TABLE "public"."staff_invitations" 
  ADD COLUMN "firstName" TEXT NOT NULL DEFAULT 'Unknown',
  ADD COLUMN "lastName" TEXT NOT NULL DEFAULT 'User';

-- Remove defaults (new rows must provide values)
ALTER TABLE "public"."staff_invitations" 
  ALTER COLUMN "firstName" DROP DEFAULT,
  ALTER COLUMN "lastName" DROP DEFAULT;
