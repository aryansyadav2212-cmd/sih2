
import { Router } from "express";
import ProjectRouter from './projects'
import dashboardRouter from './dashboard'
import aiRouter from './ai'
const router = Router()

router.use('/projects', ProjectRouter)
router.use('/dashboard', dashboardRouter)
router.use('/ai', aiRouter)

export default router