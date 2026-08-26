import { readFile } from "node:fs/promises";
import { prisma } from "../src/lib/prisma";

async function main() {
    const file = await readFile(
        "data/paimana-april-2026.json",
        "utf-8"
    );

    const projects = JSON.parse(file);

    console.log(`Loaded ${projects.length} projects`);

    const dataImport = await prisma.dataImport.create({
        data: {
            source: "PAIMANA",
            reportName:
                "486th Flash Report on Central Sector Infrastructure Projects",
            reportingMonth: new Date("2026-04-01"),
            recordCount: projects.length,
            status: "PROCESSING",
        },
    });

    console.log(`Created import: ${dataImport.id}`);

    // Test with ONE project
    const firstProject = projects[0];

    // Create the stable project information
    const project = await prisma.project.create({
        data: {
            projectCode: firstProject.projectCode,
            name: firstProject.projectName,

            legacyOcmsCode: firstProject.legacyOcmsCode,
            pmgId: firstProject.pmgId,

            startDate: new Date(firstProject.startDate),

            approvalDate: firstProject.approvalDate
                ? new Date(firstProject.approvalDate)
                : null,

            originalCompletionDate:
                firstProject.originalCompletionDate
                    ? new Date(firstProject.originalCompletionDate)
                    : null,

            serialNumber: firstProject.serialNumber,
        },
    });

    console.log(`Created project: ${project.projectCode}`);

    // Create the April 2026 snapshot
    const observation = await prisma.projectObservation.create({
        data: {
            projectId: project.id,

            reportingMonth: new Date("2026-04-01"),

            originalCost: firstProject.originalCost,
            revisedCost: firstProject.revisedCost,
            cumulativeExpenditure:
                firstProject.cumulativeExpenditure,

            revisedCompletionDate:
                firstProject.revisedCompletionDate
                    ? new Date(firstProject.revisedCompletionDate)
                    : null,

            physicalProgressPercent:
                firstProject.physicalProgressPercent,

            dataImportId: dataImport.id,
        },
    });

    console.log(
        `Created observation for ${project.projectCode}: ${observation.id}`
    );
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

