-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "WarningType" AS ENUM ('COST_OVERRUN', 'SCHEDULE_DELAY', 'PROGRESS_DELAY', 'EXPENDITURE_PROGRESS_GAP', 'LOW_PROGRESS', 'DATA_QUALITY', 'GENERAL');

-- CreateEnum
CREATE TYPE "WarningSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectCode" TEXT NOT NULL,
    "legacyOcmsCode" TEXT,
    "pmgId" TEXT,
    "name" TEXT NOT NULL,
    "ministryId" TEXT,
    "sectorId" TEXT,
    "agencyId" TEXT,
    "stateId" TEXT,
    "approvalDate" TIMESTAMP(3),
    "originalCompletionDate" TIMESTAMP(3),
    "originalCost" DECIMAL(18,2),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ministry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ministry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectObservation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "reportingMonth" TIMESTAMP(3) NOT NULL,
    "revisedCost" DECIMAL(18,2),
    "cumulativeExpenditure" DECIMAL(18,2),
    "revisedCompletionDate" TIMESTAMP(3),
    "physicalProgressPercent" DECIMAL(5,2),
    "dataImportId" TEXT,

    CONSTRAINT "ProjectObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataImport" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "reportName" TEXT,
    "reportingMonth" TIMESTAMP(3) NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordCount" INTEGER,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "dataQualityNotes" TEXT,

    CONSTRAINT "DataImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "overallRiskScore" DECIMAL(5,2),
    "costRiskScore" DECIMAL(5,2),
    "scheduleRiskScore" DECIMAL(5,2),
    "executionRiskScore" DECIMAL(5,2),
    "riskLevel" "RiskLevel",
    "predictionConfidence" DECIMAL(5,4),
    "modelVersion" TEXT,
    "observationId" TEXT,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarlyWarning" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "type" "WarningType" NOT NULL,
    "severity" "WarningSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "triggerValue" DECIMAL(18,4),
    "thresholdValue" DECIMAL(18,4),
    "recommendedAction" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "EarlyWarning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectCode_key" ON "Project"("projectCode");

-- CreateIndex
CREATE INDEX "Project_ministryId_idx" ON "Project"("ministryId");

-- CreateIndex
CREATE INDEX "Project_sectorId_idx" ON "Project"("sectorId");

-- CreateIndex
CREATE INDEX "Project_agencyId_idx" ON "Project"("agencyId");

-- CreateIndex
CREATE INDEX "Project_stateId_idx" ON "Project"("stateId");

-- CreateIndex
CREATE UNIQUE INDEX "Ministry_name_key" ON "Ministry"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_name_key" ON "Sector"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_name_key" ON "Agency"("name");

-- CreateIndex
CREATE UNIQUE INDEX "State_name_key" ON "State"("name");

-- CreateIndex
CREATE INDEX "ProjectObservation_projectId_idx" ON "ProjectObservation"("projectId");

-- CreateIndex
CREATE INDEX "ProjectObservation_reportingMonth_idx" ON "ProjectObservation"("reportingMonth");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectObservation_projectId_reportingMonth_key" ON "ProjectObservation"("projectId", "reportingMonth");

-- CreateIndex
CREATE INDEX "DataImport_reportingMonth_idx" ON "DataImport"("reportingMonth");

-- CreateIndex
CREATE INDEX "RiskAssessment_projectId_idx" ON "RiskAssessment"("projectId");

-- CreateIndex
CREATE INDEX "RiskAssessment_createdAt_idx" ON "RiskAssessment"("createdAt");

-- CreateIndex
CREATE INDEX "EarlyWarning_projectId_idx" ON "EarlyWarning"("projectId");

-- CreateIndex
CREATE INDEX "EarlyWarning_severity_idx" ON "EarlyWarning"("severity");

-- CreateIndex
CREATE INDEX "EarlyWarning_isResolved_idx" ON "EarlyWarning"("isResolved");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectObservation" ADD CONSTRAINT "ProjectObservation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectObservation" ADD CONSTRAINT "ProjectObservation_dataImportId_fkey" FOREIGN KEY ("dataImportId") REFERENCES "DataImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyWarning" ADD CONSTRAINT "EarlyWarning_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
