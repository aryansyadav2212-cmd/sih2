import { Router } from "express";
const router = Router()
import { prisma } from "../lib/prisma";

router.use((req, res, next) => {
    console.log("PROJECT ROUTER HIT:", req.method, req.originalUrl);
    next();
});




router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const project = await prisma.project.findUnique({
            where: {
                projectCode: id,
            },
            include: {
                ministry: true,
                sector: true,
                agency: true,
                state: true,

                observations: {
                    orderBy: {
                        reportingMonth: "desc",
                    },
                    take: 1,
                },

                riskAssessments: {
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 1,
                },

                earlyWarnings: {
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 1,
                },
            },
        });

        if (!project) {
            return res.status(404).json({
                message: "Project not found",
            });
        }

        return res.json({
            project,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to fetch project",
        });
    }
});



router.get("/", async (req, res) => {
    try {
        // Get query parameters
        let { page, limit } = req.query;

        // Default values
        if (!page) {
            page = "1";
        }

        if (!limit) {
            limit = "20";
        }

        // Convert strings to numbers
        const pageInt = parseInt(page as string, 10);
        const limitInt = parseInt(limit as string, 10);

        // Calculate how many records to skip
        const skip = (pageInt - 1) * limitInt;

        // Fetch projects
        const projects = await prisma.project.findMany({
            take: limitInt,
            skip: skip,
            orderBy: {
                createdAt: "desc",
            },
        });

        // Count total projects
        const totalProjects = await prisma.project.count();

        // Calculate total pages
        const totalPages = Math.ceil(totalProjects / limitInt);

        // Send response
        res.json({
            data: projects,
            pagination: {
                page: pageInt,
                limit: limitInt,
                totalPages: totalPages,
                totalProjects: totalProjects,
            },
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch projects",
        });
    }
});


















export default router
