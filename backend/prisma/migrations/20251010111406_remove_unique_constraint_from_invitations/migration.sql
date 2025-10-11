-- DropIndex
DROP INDEX "public"."staff_invitations_email_organizationId_key";

-- CreateIndex
CREATE INDEX "staff_invitations_email_organizationId_status_idx" ON "public"."staff_invitations"("email", "organizationId", "status");
