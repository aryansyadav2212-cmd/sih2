
import { Router } from "express";
import intelligenceRouter from "./intelligence";
import projectsRouter from "./projects";
const router = Router()

router.use((req, res, next) => {
    console.log("INDEX ROUTER HIT:", req.method, req.originalUrl);
    next();
});
router.use("/projects", intelligenceRouter);
router.use("/projects", projectsRouter);

export default router