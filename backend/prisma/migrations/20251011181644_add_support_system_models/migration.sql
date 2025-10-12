-- CreateEnum
CREATE TYPE "public"."TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."TicketCategory" AS ENUM ('BILLING', 'TECHNICAL', 'FEATURE_REQUEST', 'BUG', 'ACCOUNT', 'SETUP', 'INTEGRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."KBCategory" AS ENUM ('GETTING_STARTED', 'SETUP', 'BILLING', 'FEATURES', 'INTEGRATIONS', 'TROUBLESHOOTING', 'BEST_PRACTICES', 'FAQ');

-- CreateEnum
CREATE TYPE "public"."ArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."CommunicationType" AS ENUM ('BROADCAST', 'ANNOUNCEMENT', 'NOTIFICATION', 'ALERT', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."CommunicationChannel" AS ENUM ('EMAIL', 'IN_APP', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "public"."CommunicationStatus" AS ENUM ('PENDING', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."EmailTemplateCategory" AS ENUM ('SUPPORT', 'BILLING', 'ANNOUNCEMENT', 'ONBOARDING', 'MAINTENANCE', 'MARKETING');

-- CreateTable
CREATE TABLE "public"."support_tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "public"."TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "category" "public"."TicketCategory" NOT NULL,
    "assignedTo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "tags" TEXT[],
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ticket_responses" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "attachments" JSONB,
    "statusChange" "public"."TicketStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "responderId" TEXT NOT NULL,

    CONSTRAINT "ticket_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."knowledge_base_articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "category" "public"."KBCategory" NOT NULL,
    "tags" TEXT[],
    "status" "public"."ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "notHelpfulCount" INTEGER NOT NULL DEFAULT 0,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "knowledge_base_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."communication_logs" (
    "id" TEXT NOT NULL,
    "type" "public"."CommunicationType" NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "channel" "public"."CommunicationChannel" NOT NULL,
    "recipientType" TEXT NOT NULL,
    "recipientFilter" JSONB,
    "recipientIds" TEXT[],
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "status" "public"."CommunicationStatus" NOT NULL DEFAULT 'PENDING',
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "openedCount" INTEGER NOT NULL DEFAULT 0,
    "clickedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "templateId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."email_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "public"."EmailTemplateCategory" NOT NULL,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticketNumber_key" ON "public"."support_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "support_tickets_organizationId_status_idx" ON "public"."support_tickets"("organizationId", "status");

-- CreateIndex
CREATE INDEX "support_tickets_status_priority_idx" ON "public"."support_tickets"("status", "priority");

-- CreateIndex
CREATE INDEX "support_tickets_assignedTo_status_idx" ON "public"."support_tickets"("assignedTo", "status");

-- CreateIndex
CREATE INDEX "support_tickets_category_status_idx" ON "public"."support_tickets"("category", "status");

-- CreateIndex
CREATE INDEX "ticket_responses_ticketId_createdAt_idx" ON "public"."ticket_responses"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_base_articles_slug_key" ON "public"."knowledge_base_articles"("slug");

-- CreateIndex
CREATE INDEX "knowledge_base_articles_status_category_idx" ON "public"."knowledge_base_articles"("status", "category");

-- CreateIndex
CREATE INDEX "knowledge_base_articles_publishedAt_idx" ON "public"."knowledge_base_articles"("publishedAt");

-- CreateIndex
CREATE INDEX "communication_logs_type_status_idx" ON "public"."communication_logs"("type", "status");

-- CreateIndex
CREATE INDEX "communication_logs_scheduledFor_status_idx" ON "public"."communication_logs"("scheduledFor", "status");

-- CreateIndex
CREATE INDEX "communication_logs_createdBy_idx" ON "public"."communication_logs"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_name_key" ON "public"."email_templates"("name");

-- CreateIndex
CREATE INDEX "email_templates_category_isActive_idx" ON "public"."email_templates"("category", "isActive");

-- AddForeignKey
ALTER TABLE "public"."support_tickets" ADD CONSTRAINT "support_tickets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_responses" ADD CONSTRAINT "ticket_responses_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
