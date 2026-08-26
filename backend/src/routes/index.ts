
import { Router } from "express";
import ProjectRouter from './projects'
import dashboardRouter from './dashboard'
import aiRouter from './ai'
const router = Router()

router.use((req, res, next) => {
    console.log("INDEX ROUTER HIT:", req.method, req.originalUrl);
    next();
});
router.use('/projects', ProjectRouter)
router.use('/dashboard', dashboardRouter)
router.use('/ai', aiRouter)

export default router